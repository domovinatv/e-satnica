// Login with Certilia (OIDC + PKCE). Preneseno iz zef-certilia-worker (rujan 2026.),
// gdje je tok izmjeren na stvarnim prijavama e-Osobnom. Zamke su opisane u
// zef-new-website/analiza/12-certilia-registracija-i-worker.md i 17-certilia-claimovi-izmjereni.
import { env } from 'cloudflare:workers';
import * as jose from 'jose';
import { codeChallengeS256 } from './crypto';

interface Discovery {
	issuer: string;
	authorization_endpoint: string;
	token_endpoint: string;
	jwks_uri: string;
}

/**
 * Discovery se kešira po izolatu. `issuer` za provjeru MORA doći odavde, nikad iz
 * CERTILIA_ISSUER_BASE: baza je https://idp.certilia.com, a `iss` u tokenu je
 * https://idp.certilia.com/oauth2/token. Ručno upisana baza ruši svaku provjeru.
 */
let cached: { at: number; discovery: Discovery; jwks: ReturnType<typeof jose.createRemoteJWKSet> } | null = null;
const DISCOVERY_TTL_MS = 10 * 60 * 1000;

export function certiliaJePodesena(): boolean {
	return Boolean(env.CERTILIA_CLIENT_ID && env.CERTILIA_CLIENT_SECRET);
}

export function redirectUri(): string {
	return `${env.APP_ORIGIN}/auth/certilia/callback`;
}

export async function getOidc() {
	if (cached && Date.now() - cached.at < DISCOVERY_TTL_MS) return cached;

	const res = await fetch(`${env.CERTILIA_ISSUER_BASE}/oauth2/oidcdiscovery/.well-known/openid-configuration`);
	if (!res.ok) throw new Error('discovery_failed');
	const discovery = (await res.json()) as Discovery;
	if (!discovery.issuer || !discovery.jwks_uri || !discovery.token_endpoint) {
		throw new Error('discovery_incomplete');
	}
	cached = { at: Date.now(), discovery, jwks: jose.createRemoteJWKSet(new URL(discovery.jwks_uri)) };
	return cached;
}

/**
 * OIB (`pin`) NE stiže kroz scope: discovery ne oglašava `eid`. Jedini pouzdan put je
 * `claims` parametar (claims_parameter_supported=true, `pin` je u claims_supported).
 *
 * Osnovna prijava traži samo identitet. Sve ostalo je step-up: funkcija koja treba
 * podatak pošalje korisnika na /auth/certilia/start?trazi=birthdate i tek se tada
 * traži (docs/certilia-podaci.md). Dodatni claimovi su dobrovoljni (null), pa
 * odbijen pristanak degradira, a ne ruši prijavu.
 */
const OSNOVNI_CLAIMOVI = ['pin', 'given_name', 'family_name'];

/** Podatak koji funkcija smije tražiti step-upom → claimovi koji ga nose. */
export const STEP_UP = {
	birthdate: ['birthdate'],
	address: ['formatted', 'address'],
	email: ['email'],
	mobile: ['mobile'],
	organization: ['organization', 'org_name', 'org_vat'],
	gender: ['gender'],
	country: ['country'],
} as const;
export type StepUpPodatak = keyof typeof STEP_UP;

/** Naziv kakav korisnik vidi na Certilijinom ekranu za pristanak. */
export const NAZIV_NA_CERTILIJI: Record<StepUpPodatak, string> = {
	birthdate: 'Datum rođenja',
	address: 'Adresa',
	email: 'Email',
	mobile: 'Mobitel',
	organization: 'Organizacije',
	gender: 'Spol',
	country: 'Država',
};

export function parsirajTrazi(raw: string | null | undefined): StepUpPodatak[] {
	return [...new Set((raw ?? '').split(','))].filter((p): p is StepUpPodatak => p in STEP_UP);
}

function claimsZahtjev(trazi: StepUpPodatak[]) {
	const idToken: Record<string, { essential: true } | null> = { pin: { essential: true } };
	for (const c of OSNOVNI_CLAIMOVI.slice(1)) idToken[c] = null;
	// Eksperiment 28. 10.: traženi podatak kao essential, da ga Certilia predoznači na ekranu.
	for (const p of trazi) for (const c of STEP_UP[p]) idToken[c] = { essential: true };
	return { id_token: idToken };
}

export async function buildAuthorizeUrl(args: {
	state: string;
	nonce: string;
	codeVerifier: string;
	trazi: StepUpPodatak[];
}): Promise<string> {
	const { discovery } = await getOidc();
	const params = new URLSearchParams({
		client_id: env.CERTILIA_CLIENT_ID,
		redirect_uri: redirectUri(),
		response_type: 'code',
		scope: 'openid profile',
		state: args.state,
		nonce: args.nonce,
		code_challenge: await codeChallengeS256(args.codeVerifier),
		code_challenge_method: 'S256',
		// Certilia pamti pristanak na podatke iz prve prijave (izmjereno 28. 10. 2026.):
		// druga prijava pita samo za scope. Step-up zato traži ponovni ekran za pristanak.
		prompt: args.trazi.length ? 'login consent' : 'login',
		claims: JSON.stringify(claimsZahtjev(args.trazi)),
	});
	return `${discovery.authorization_endpoint}?${params.toString()}`;
}

export async function exchangeCode(args: { code: string; codeVerifier: string }): Promise<{ id_token?: string }> {
	const { discovery } = await getOidc();
	const res = await fetch(discovery.token_endpoint, {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			grant_type: 'authorization_code',
			client_id: env.CERTILIA_CLIENT_ID,
			client_secret: env.CERTILIA_CLIENT_SECRET,
			code: args.code,
			redirect_uri: redirectUri(),
			code_verifier: args.codeVerifier,
		}).toString(),
	});
	if (!res.ok) {
		// Tijelo odgovora može ponoviti parametre zahtjeva, pa se logira samo status.
		console.error('token_exchange_failed', { status: res.status });
		throw new Error('token_exchange_failed');
	}
	return (await res.json()) as { id_token?: string };
}

export async function verifyIdToken(idToken: string, expectedNonce: string) {
	const { discovery, jwks } = await getOidc();
	const { payload } = await jose.jwtVerify(idToken, jwks, {
		issuer: discovery.issuer,
		audience: env.CERTILIA_CLIENT_ID,
	});
	if (payload.nonce !== expectedNonce) throw new Error('nonce_mismatch');
	return payload as Record<string, unknown>;
}

export function str(value: unknown): string | null {
	return typeof value === 'string' && value.trim() ? value.trim() : null;
}

/** Hrvatska e-Osobna OIB šalje kao `sub`; `pin` stiže samo kad se poštuje claims zahtjev. */
export function oibIzTokena(payload: Record<string, unknown>): { oib: string | null; izvor: string } {
	for (const izvor of ['pin', 'oib', 'sub']) {
		const v = str(payload[izvor]);
		if (v) return { oib: v, izvor };
	}
	return { oib: null, izvor: 'none' };
}

/**
 * Vrijednosti step-up podataka u obliku koji spremamo. Oblici su izmjereni u ZEF-u
 * 21. 9. 2026.: datumi stižu kao ISO datetime (`…T00:00:00Z`), adresa (`formatted`)
 * kao niz redaka, `organization` kao base64 JSON niz.
 */
export function stepUpVrijednosti(payload: Record<string, unknown>, trazi: StepUpPodatak[]): Map<StepUpPodatak, string> {
	const out = new Map<StepUpPodatak, string>();
	for (const p of trazi) {
		const v = vrijednost(p, payload);
		if (v) out.set(p, v);
	}
	return out;
}

function vrijednost(p: StepUpPodatak, payload: Record<string, unknown>): string | null {
	switch (p) {
		case 'birthdate': {
			const m = /^(\d{4}-\d{2}-\d{2})/.exec(str(payload.birthdate) ?? '');
			return m ? m[1] : null;
		}
		case 'address': {
			const a = payload.address as Record<string, unknown> | undefined;
			return joinLines(payload.formatted) ?? joinLines(a?.formatted) ?? str(a?.street_address);
		}
		case 'organization': {
			const org = parseOrganizations(payload.organization);
			if (org.length) return JSON.stringify(org);
			const name = str(payload.org_name);
			const vat = str(payload.org_vat);
			return name || vat ? JSON.stringify([{ name, vat }]) : null;
		}
		default:
			return str(payload[p]);
	}
}

function joinLines(value: unknown): string | null {
	if (Array.isArray(value)) {
		const parts = value.map(str).filter((v): v is string => v !== null);
		return parts.length ? parts.join(', ') : null;
	}
	return str(value);
}

/** Jedna osoba može zastupati više pravnih osoba; `vat` je OIB škole ili tvrtke. */
function parseOrganizations(raw: unknown): { name: string | null; vat: string | null }[] {
	const s = str(raw);
	if (!s) return [];
	try {
		// TextDecoder, ne goli atob(), da dijakritici u nazivu ostanu ispravni.
		const bytes = Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
		const parsed = JSON.parse(new TextDecoder().decode(bytes));
		return Array.isArray(parsed)
			? parsed.map((o: Record<string, unknown>) => ({ name: str(o.name), vat: str(o.vat) }))
			: [];
	} catch {
		console.warn('organization claim nije base64 JSON niz');
		return [];
	}
}

/**
 * Poveznica kojom funkcija traži podatak koji još nemamo. Vodi na našu međustranicu
 * (/dopuna), koja kaže zašto i što označiti, jer Certilijin ekran to ne kaže:
 * `stepUpUrl(['birthdate'], '/bodovi', 'Dob je kriterij bodovanja.')`
 */
export function stepUpUrl(trazi: StepUpPodatak[], natrag: string, svrha: string): string {
	return `/dopuna?${new URLSearchParams({ trazi: trazi.join(','), natrag, svrha }).toString()}`;
}

export function certiliaStepUpUrl(trazi: StepUpPodatak[], natrag: string): string {
	return `/auth/certilia/start?${new URLSearchParams({ trazi: trazi.join(','), natrag }).toString()}`;
}
