import type { APIRoute } from 'astro';
import { buildAuthorizeUrl, certiliaJePodesena, parsirajTrazi } from '../../../lib/certilia/oidc';
import { otvoriTok } from '../../../lib/oidc/tok';
import { pokusajOpcije, POKUSAJ_KOLACIC, sigurnoNatrag } from '../../../lib/sesija';

export const prerender = false;

export const GET: APIRoute = async ({ url, cookies, redirect }) => {
	if (!certiliaJePodesena()) return redirect('/prijava?certilia_greska=nije_podesena');

	const trazi = parsirajTrazi(url.searchParams.get('trazi'));
	const { state, nonce, codeVerifier } = await otvoriTok('certilia', {
		natrag: sigurnoNatrag(url.searchParams.get('natrag')),
		debug: url.searchParams.get('debug') === '1',
		trazi: trazi.join(','),
	});

	cookies.set(POKUSAJ_KOLACIC, '1', pokusajOpcije);
	return redirect(await buildAuthorizeUrl({ state, nonce, codeVerifier, trazi }));
};
