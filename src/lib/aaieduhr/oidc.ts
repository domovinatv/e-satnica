// Prijava s @skole.hr preko AAI@EduHr (OIDC + PKCE). Endpointi iz
// https://login.aaiedu.hr/.well-known/openid-configuration (provjereno 4. 11. 2026.):
// issuer https://login.aaiedu.hr, RS256, PKCE S256, scope = ime atributa.
// Postupak i Pravilnik: docs/aaieduhr.md.
import { env } from 'cloudflare:workers';
import { authorizeUrl, otkrij, type OidcPostavke } from '../oidc/klijent';
import { aaiScopeovi } from './claimovi';

export function aaiJePodesena(): boolean {
	return Boolean(env.AAI_CLIENT_ID && env.AAI_CLIENT_SECRET);
}

// Registar resursa ne dopušta isti redirect URI na dva resursa: produkcijski (#3989) ima
// /auth/aaieduhr/callback, testni (#3988) /auth/aaieduhr/test/callback. Var AAI_REDIRECT_PATH
// bira koji, uz secrete istog resursa.
export function aaiRedirectUri(): string {
	return `${env.APP_ORIGIN}${env.AAI_REDIRECT_PATH || '/auth/aaieduhr/callback'}`;
}

export function aaiPostavke(): OidcPostavke {
	return {
		discoveryUrl: `${env.AAI_ISSUER}/.well-known/openid-configuration`,
		clientId: env.AAI_CLIENT_ID,
		clientSecret: env.AAI_CLIENT_SECRET,
		redirectUri: aaiRedirectUri(),
		algoritmi: ['RS256'],
	};
}

export function aaiOtkrivanje() {
	return otkrij(aaiPostavke().discoveryUrl);
}

export function aaiAuthorizeUrl(a: { state: string; nonce: string; codeVerifier: string }): Promise<string> {
	return authorizeUrl(aaiPostavke(), { ...a, scope: aaiScopeovi(env.AAI_OIB === '1') });
}
