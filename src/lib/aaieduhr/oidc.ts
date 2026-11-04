// Prijava s @skole.hr preko AAI@EduHr (OIDC + PKCE). Endpointi iz
// https://login.aaiedu.hr/.well-known/openid-configuration (provjereno 4. 11. 2026.):
// issuer https://login.aaiedu.hr, RS256, PKCE S256, scope = ime atributa.
// Postupak i Pravilnik: docs/aaieduhr.md.
import { env } from 'cloudflare:workers';
import { authorizeUrl, otkrij, type OidcPostavke } from '../oidc/klijent';
import { AAI_SCOPEOVI } from './claimovi';

export function aaiJePodesena(): boolean {
	return Boolean(env.AAI_CLIENT_ID && env.AAI_CLIENT_SECRET);
}

export function aaiRedirectUri(): string {
	return `${env.APP_ORIGIN}/auth/aaieduhr/callback`;
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
	return authorizeUrl(aaiPostavke(), { ...a, scope: AAI_SCOPEOVI.join(' ') });
}
