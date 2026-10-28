import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { getOidc, redirectUri } from '../../../lib/certilia/oidc';

export const prerender = false;

/** Stanje konfiguracije, bez tajni. Za provjeru nakon registracije aplikacije. */
export const GET: APIRoute = async () => {
	let issuer: string | null = null;
	try {
		issuer = (await getOidc()).discovery.issuer;
	} catch {
		issuer = null;
	}
	return Response.json({
		issuer,
		redirectUri: redirectUri(),
		configured: {
			clientId: Boolean(env.CERTILIA_CLIENT_ID),
			clientSecret: Boolean(env.CERTILIA_CLIENT_SECRET),
			sesijaKljuc: Boolean(env.SESIJA_KLJUC),
			kodTima: Boolean(env.TIM_KOD),
		},
	});
};
