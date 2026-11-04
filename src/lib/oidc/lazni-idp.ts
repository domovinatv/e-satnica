// Lažni OIDC IdP za testove: pravi HTTP server na 127.0.0.1 s RS256 JWKS-om,
// PKCE S256 provjerom, jednokratnim kodovima i userinfom. Ponaša se kao
// login.aaiedu.hr koliko je poznato iz njegovog discoveryja; što nije poznato
// (gdje stižu atributi, string ili niz) test bira opcijama.
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import * as jose from 'jose';
import { codeChallengeS256 } from '../certilia/crypto.ts';

export interface LazniIdpOpcije {
	clientId: string;
	clientSecret: string;
	redirectUri: string;
	/** Claimovi korisnika koji se „prijavi”. */
	korisnik: Record<string, unknown>;
	/** Koji claimovi idu u id_token (ostali samo na userinfo). Zadano: svi. */
	uIdTokenu?: string[];
	/** Zadano slučajan; fiksan za ručni test kad Worker mora unaprijed znati issuer. */
	port?: number;
}

interface Kod {
	challenge: string;
	nonce: string;
	redirectUri: string;
	scope: string;
}

export interface LazniIdp {
	issuer: string;
	discoveryUrl: string;
	/** Simulira korisnikovu prijavu na authorize URL-u; vraća code za callback. */
	prijavi(authorizeUrl: string): Promise<{ code: string; state: string }>;
	/** Potpisuje proizvoljan id_token ključem IdP-a (za testove napada). */
	potpisi(claimovi: Record<string, unknown>): Promise<string>;
	zatvori(): Promise<void>;
}

export async function pokreniLazniIdp(o: LazniIdpOpcije): Promise<LazniIdp> {
	const { privateKey, publicKey } = await jose.generateKeyPair('RS256');
	// Novi kid po pokretanju, kao pri rotaciji ključa: klijent tada ponovno dohvati JWKS.
	const kid = crypto.randomUUID();
	const jwk = { ...(await jose.exportJWK(publicKey)), kid, alg: 'RS256', use: 'sig' };
	const kodovi = new Map<string, Kod>();
	const accessTokeni = new Map<string, string>(); // token → scope
	let issuer = '';

	const potpisi = (claimovi: Record<string, unknown>) =>
		new jose.SignJWT(claimovi)
			.setProtectedHeader({ alg: 'RS256', kid })
			.setIssuer(issuer)
			.setAudience((claimovi.aud as string | undefined) ?? o.clientId)
			.setIssuedAt()
			.setExpirationTime('5m')
			.sign(privateKey);

	const server: Server = createServer(async (req, res) => {
		const url = new URL(req.url ?? '/', issuer);
		const json = (status: number, body: unknown) => {
			res.writeHead(status, { 'Content-Type': 'application/json' });
			res.end(JSON.stringify(body));
		};

		if (url.pathname === '/.well-known/openid-configuration') {
			return json(200, {
				issuer,
				authorization_endpoint: `${issuer}/sso/module.php/oidc/authorization`,
				token_endpoint: `${issuer}/sso/module.php/oidc/token`,
				userinfo_endpoint: `${issuer}/sso/module.php/oidc/userinfo`,
				jwks_uri: `${issuer}/sso/module.php/oidc/jwks`,
				id_token_signing_alg_values_supported: ['RS256'],
				code_challenge_methods_supported: ['plain', 'S256'],
			});
		}
		if (url.pathname === '/sso/module.php/oidc/jwks') return json(200, { keys: [jwk] });

		// Preglednički ulaz (za ručni test pravog Workera): odmah „prijavi” i vrati na redirect_uri.
		if (url.pathname === '/sso/module.php/oidc/authorization') {
			try {
				const { code, state } = await idp.prijavi(url.toString());
				const natrag = new URL(o.redirectUri);
				natrag.search = new URLSearchParams({ code, state }).toString();
				res.writeHead(302, { Location: natrag.toString() });
				return res.end();
			} catch (e) {
				return json(400, { error: 'invalid_request', error_description: (e as Error).message });
			}
		}

		if (url.pathname === '/sso/module.php/oidc/token' && req.method === 'POST') {
			let tijelo = '';
			for await (const dio of req) tijelo += dio;
			const f = new URLSearchParams(tijelo);
			if (f.get('client_id') !== o.clientId || f.get('client_secret') !== o.clientSecret) {
				return json(401, { error: 'invalid_client' });
			}
			const kod = kodovi.get(f.get('code') ?? '');
			kodovi.delete(f.get('code') ?? ''); // jednokratno
			if (!kod || f.get('grant_type') !== 'authorization_code' || f.get('redirect_uri') !== kod.redirectUri) {
				return json(400, { error: 'invalid_grant' });
			}
			if ((await codeChallengeS256(f.get('code_verifier') ?? '')) !== kod.challenge) {
				return json(400, { error: 'invalid_grant', error_description: 'PKCE' });
			}
			const uTokenu = o.uIdTokenu ?? Object.keys(o.korisnik);
			const claimovi: Record<string, unknown> = { nonce: kod.nonce };
			for (const k of uTokenu) if (k in o.korisnik) claimovi[k] = o.korisnik[k];
			const access = crypto.randomUUID();
			accessTokeni.set(access, kod.scope);
			return json(200, { token_type: 'Bearer', access_token: access, id_token: await potpisi(claimovi), expires_in: 300 });
		}

		if (url.pathname === '/sso/module.php/oidc/userinfo') {
			const token = (req.headers.authorization ?? '').replace(/^Bearer /, '');
			if (!accessTokeni.has(token)) return json(401, { error: 'invalid_token' });
			return json(200, o.korisnik);
		}

		json(404, { error: 'not_found' });
	});

	await new Promise<void>((r) => server.listen(o.port ?? 0, '127.0.0.1', r));
	issuer = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

	const idp: LazniIdp = {
		issuer,
		discoveryUrl: `${issuer}/.well-known/openid-configuration`,
		async prijavi(authorizeUrl) {
			const u = new URL(authorizeUrl);
			const p = u.searchParams;
			if (u.origin !== issuer || u.pathname !== '/sso/module.php/oidc/authorization') throw new Error('krivi authorize endpoint');
			if (p.get('client_id') !== o.clientId) throw new Error('krivi client_id');
			if (p.get('redirect_uri') !== o.redirectUri) throw new Error('krivi redirect_uri');
			if (p.get('response_type') !== 'code') throw new Error('response_type');
			if (p.get('code_challenge_method') !== 'S256' || !p.get('code_challenge')) throw new Error('nema PKCE S256');
			if (!p.get('scope')?.split(' ').includes('openid')) throw new Error('nema openid scopea');
			const code = crypto.randomUUID();
			kodovi.set(code, {
				challenge: p.get('code_challenge')!,
				nonce: p.get('nonce') ?? '',
				redirectUri: p.get('redirect_uri')!,
				scope: p.get('scope')!,
			});
			return { code, state: p.get('state') ?? '' };
		},
		potpisi,
		zatvori: () => new Promise<void>((r) => server.close(() => r())),
	};
	return idp;
}
