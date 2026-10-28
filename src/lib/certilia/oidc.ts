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
 * Tražimo samo ono što e-satnici treba; sve osim `pin` je dobrovoljno (null), pa
 * nedostajući claim degradira, a ne ruši prijavu.
 */
const CLAIMS_REQUEST = {
	id_token: {
		pin: { essential: true },
		given_name: null,
		family_name: null,
		birthdate: null,
		email: null,
	},
};

export async function buildAuthorizeUrl(args: { state: string; nonce: string; codeVerifier: string }): Promise<string> {
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
		prompt: 'login',
		claims: JSON.stringify(CLAIMS_REQUEST),
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
