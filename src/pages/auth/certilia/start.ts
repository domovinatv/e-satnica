import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { randomBase64url, sha256Hex } from '../../../lib/certilia/crypto';
import { buildAuthorizeUrl, certiliaJePodesena, parsirajTrazi } from '../../../lib/certilia/oidc';
import { pokusajOpcije, POKUSAJ_KOLACIC, sigurnoNatrag } from '../../../lib/sesija';

export const prerender = false;

export const GET: APIRoute = async ({ url, cookies, redirect }) => {
	if (!certiliaJePodesena()) return redirect('/prijava?certilia_greska=nije_podesena');

	const state = randomBase64url(32);
	const nonce = randomBase64url(32);
	const codeVerifier = randomBase64url(64);
	const trazi = parsirajTrazi(url.searchParams.get('trazi'));

	// Stari nedovršeni tokovi (stariji od 10 min) se usput čiste. Prije brisanja
	// ostave trag u `prijave`: netko je kliknuo, a s Certilije se nije vratio.
	const istekli = Date.now() - 10 * 60 * 1000;
	await env.DB.batch([
		env.DB.prepare(
			`INSERT INTO prijave (created_at, ishod, ok)
			 SELECT datetime(created_at / 1000, 'unixepoch'), 'napusten' || iif(trazi = '', '', '+' || trazi), 0
			 FROM certilia_tokovi WHERE created_at < ? AND debug = 0`,
		).bind(istekli),
		env.DB.prepare('DELETE FROM certilia_tokovi WHERE created_at < ?').bind(istekli),
		// Ključ je hash, pa procurjela tablica ne daje upotrebljiv state.
		env.DB.prepare(
			'INSERT INTO certilia_tokovi (state_hash, code_verifier, nonce, natrag, debug, trazi, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
		).bind(
			await sha256Hex(state),
			codeVerifier,
			nonce,
			sigurnoNatrag(url.searchParams.get('natrag')),
			url.searchParams.get('debug') === '1' ? 1 : 0,
			trazi.join(','),
			Date.now(),
		),
	]);

	cookies.set(POKUSAJ_KOLACIC, '1', pokusajOpcije);
	return redirect(await buildAuthorizeUrl({ state, nonce, codeVerifier, trazi }));
};
