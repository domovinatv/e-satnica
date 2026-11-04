// OIDC authorization code + PKCE, zajedničko za sve davatelje identiteta (Certilia,
// AAI@EduHr). Čiste funkcije nad postavkama, bez `cloudflare:workers`, pa ih testovi
// pokreću u Nodeu protiv lažnog IdP-a (klijent.test.ts).
import * as jose from 'jose';
import { codeChallengeS256 } from '../certilia/crypto.ts';

export interface Discovery {
	issuer: string;
	authorization_endpoint: string;
	token_endpoint: string;
	jwks_uri: string;
	userinfo_endpoint?: string;
}

export interface OidcPostavke {
	discoveryUrl: string;
	clientId: string;
	clientSecret: string;
	redirectUri: string;
	/** Dopušteni algoritmi potpisa id_tokena; bez toga jose prihvaća sve asimetrične. */
	algoritmi?: string[];
}

export interface Tokeni {
	id_token?: string;
	access_token?: string;
}

/**
 * Discovery se kešira po izolatu i po URL-u. `issuer` za provjeru tokena uvijek dolazi
 * odavde, nikad iz ručno upisane baze (kod Certilije se razlikuju, vidi certilia/oidc.ts).
 */
const kes = new Map<string, { at: number; discovery: Discovery; jwks: ReturnType<typeof jose.createRemoteJWKSet> }>();
const DISCOVERY_TTL_MS = 10 * 60 * 1000;

export async function otkrij(discoveryUrl: string) {
	const k = kes.get(discoveryUrl);
	if (k && Date.now() - k.at < DISCOVERY_TTL_MS) return k;

	const res = await fetch(discoveryUrl);
	if (!res.ok) throw new Error('discovery_failed');
	const discovery = (await res.json()) as Discovery;
	if (!discovery.issuer || !discovery.jwks_uri || !discovery.token_endpoint || !discovery.authorization_endpoint) {
		throw new Error('discovery_incomplete');
	}
	const novi = { at: Date.now(), discovery, jwks: jose.createRemoteJWKSet(new URL(discovery.jwks_uri)) };
	kes.set(discoveryUrl, novi);
	return novi;
}

/** Za testove: svaki test diže svoj IdP s novim ključem. */
export function zaboraviOtkrivanje(): void {
	kes.clear();
}

export async function authorizeUrl(
	p: OidcPostavke,
	a: { state: string; nonce: string; codeVerifier: string; scope: string; dodatno?: Record<string, string> },
): Promise<string> {
	const { discovery } = await otkrij(p.discoveryUrl);
	const params = new URLSearchParams({
		client_id: p.clientId,
		redirect_uri: p.redirectUri,
		response_type: 'code',
		scope: a.scope,
		state: a.state,
		nonce: a.nonce,
		code_challenge: await codeChallengeS256(a.codeVerifier),
		code_challenge_method: 'S256',
		...a.dodatno,
	});
	return `${discovery.authorization_endpoint}?${params.toString()}`;
}

export async function zamijeniKod(p: OidcPostavke, a: { code: string; codeVerifier: string }): Promise<Tokeni> {
	const { discovery } = await otkrij(p.discoveryUrl);
	const res = await fetch(discovery.token_endpoint, {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			grant_type: 'authorization_code',
			client_id: p.clientId,
			client_secret: p.clientSecret,
			code: a.code,
			redirect_uri: p.redirectUri,
			code_verifier: a.codeVerifier,
		}).toString(),
	});
	if (!res.ok) {
		// Tijelo odgovora može ponoviti parametre zahtjeva, pa se logira samo status.
		console.error('token_exchange_failed', { status: res.status });
		throw new Error('token_exchange_failed');
	}
	return (await res.json()) as Tokeni;
}

export async function provjeriIdToken(p: OidcPostavke, idToken: string, ocekivaniNonce: string) {
	const { discovery, jwks } = await otkrij(p.discoveryUrl);
	const { payload } = await jose.jwtVerify(idToken, jwks, {
		issuer: discovery.issuer,
		audience: p.clientId,
		algorithms: p.algoritmi,
	});
	if (payload.nonce !== ocekivaniNonce) throw new Error('nonce_mismatch');
	return payload as Record<string, unknown>;
}

/**
 * Userinfo je dopuna id_tokenu: neki IdP-ovi (SimpleSAMLphp OIDC, na kojem je
 * login.aaiedu.hr) atribute iz scopeova šalju samo ovdje. Greška nije kobna, jer
 * prijava može proći i samo s id_tokenom, pa se vraća null.
 */
export async function dohvatiUserinfo(p: OidcPostavke, accessToken: string | undefined): Promise<Record<string, unknown> | null> {
	if (!accessToken) return null;
	const { discovery } = await otkrij(p.discoveryUrl);
	if (!discovery.userinfo_endpoint) return null;
	try {
		const res = await fetch(discovery.userinfo_endpoint, { headers: { Authorization: `Bearer ${accessToken}` } });
		if (!res.ok) {
			console.warn('userinfo_failed', { status: res.status });
			return null;
		}
		const json = await res.json();
		return json && typeof json === 'object' && !Array.isArray(json) ? (json as Record<string, unknown>) : null;
	} catch {
		console.warn('userinfo_failed', { status: 'network' });
		return null;
	}
}
