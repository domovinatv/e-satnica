// Login with Certilia (OIDC + PKCE). Preneseno iz zef-certilia-worker (rujan 2026.),
// gdje je tok izmjeren na stvarnim prijavama e-Osobnom. Zamke su opisane u
// zef-new-website/analiza/12-certilia-registracija-i-worker.md i 17-certilia-claimovi-izmjereni.
import { env } from 'cloudflare:workers';
import { authorizeUrl, otkrij, provjeriIdToken, zamijeniKod, type OidcPostavke, type Tokeni } from '../oidc/klijent';

/**
 * `issuer` za provjeru dolazi iz discoveryja, nikad iz CERTILIA_ISSUER_BASE: baza je
 * https://idp.certilia.com, a `iss` u tokenu je https://idp.certilia.com/oauth2/token.
 * Ručno upisana baza ruši svaku provjeru.
 */
function postavke(): OidcPostavke {
	return {
		discoveryUrl: `${env.CERTILIA_ISSUER_BASE}/oauth2/oidcdiscovery/.well-known/openid-configuration`,
		clientId: env.CERTILIA_CLIENT_ID,
		clientSecret: env.CERTILIA_CLIENT_SECRET,
		redirectUri: redirectUri(),
	};
}

export function certiliaJePodesena(): boolean {
	return Boolean(env.CERTILIA_CLIENT_ID && env.CERTILIA_CLIENT_SECRET);
}

export function redirectUri(): string {
	return `${env.APP_ORIGIN}/auth/certilia/callback`;
}

export function getOidc() {
	return otkrij(postavke().discoveryUrl);
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
	// essential ne predoznačava polje na Certilijinom ekranu (izmjereno 28. 10.); to radi /dopuna.
	for (const p of trazi) for (const c of STEP_UP[p]) idToken[c] = null;
	return { id_token: idToken };
}

export function buildAuthorizeUrl(args: {
	state: string;
	nonce: string;
	codeVerifier: string;
	trazi: StepUpPodatak[];
}): Promise<string> {
	return authorizeUrl(postavke(), {
		state: args.state,
		nonce: args.nonce,
		codeVerifier: args.codeVerifier,
		scope: 'openid profile',
		dodatno: {
			// Certilia pamti pristanak na podatke iz prve prijave (izmjereno 28. 10. 2026.):
			// druga prijava pita samo za scope. Step-up zato traži ponovni ekran za pristanak.
			prompt: args.trazi.length ? 'login consent' : 'login',
			claims: JSON.stringify(claimsZahtjev(args.trazi)),
		},
	});
}

export function exchangeCode(args: { code: string; codeVerifier: string }): Promise<Tokeni> {
	return zamijeniKod(postavke(), args);
}

export function verifyIdToken(idToken: string, expectedNonce: string) {
	return provjeriIdToken(postavke(), idToken, expectedNonce);
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
