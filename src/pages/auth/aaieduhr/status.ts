import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { AAI_SCOPEOVI } from '../../../lib/aaieduhr/claimovi';
import { aaiOtkrivanje, aaiRedirectUri } from '../../../lib/aaieduhr/oidc';

export const prerender = false;

/** Stanje konfiguracije, bez tajni. Za provjeru nakon registracije resursa u Registru. */
export const GET: APIRoute = async () => {
	let issuer: string | null = null;
	try {
		issuer = (await aaiOtkrivanje()).discovery.issuer;
	} catch {
		issuer = null;
	}
	return Response.json({
		issuer,
		redirectUri: aaiRedirectUri(),
		scope: AAI_SCOPEOVI.join(' '),
		configured: {
			clientId: Boolean(env.AAI_CLIENT_ID),
			clientSecret: Boolean(env.AAI_CLIENT_SECRET),
			sesijaKljuc: Boolean(env.SESIJA_KLJUC),
		},
	});
};
