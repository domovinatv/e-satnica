import type { APIRoute } from 'astro';
import { aaiAuthorizeUrl, aaiJePodesena } from '../../../lib/aaieduhr/oidc';
import { otvoriTok } from '../../../lib/oidc/tok';
import { sigurnoNatrag } from '../../../lib/sesija';

export const prerender = false;

export const GET: APIRoute = async ({ url, redirect }) => {
	if (!aaiJePodesena()) return redirect('/prijava?aai_greska=nije_podesena');

	const tok = await otvoriTok('aaieduhr', {
		natrag: sigurnoNatrag(url.searchParams.get('natrag')),
		debug: url.searchParams.get('debug') === '1',
	});
	return redirect(await aaiAuthorizeUrl(tok));
};
