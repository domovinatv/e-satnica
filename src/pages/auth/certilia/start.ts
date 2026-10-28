import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { randomBase64url, sha256Hex } from '../../../lib/certilia/crypto';
import { buildAuthorizeUrl, certiliaJePodesena } from '../../../lib/certilia/oidc';
import { sigurnoNatrag } from '../../../lib/sesija';

export const prerender = false;

export const GET: APIRoute = async ({ url, redirect }) => {
	if (!certiliaJePodesena()) return redirect('/prijava?certilia_greska=nije_podesena');

	const state = randomBase64url(32);
	const nonce = randomBase64url(32);
	const codeVerifier = randomBase64url(64);

	// Stari nedovršeni tokovi (stariji od 10 min) se usput čiste.
	await env.DB.batch([
		env.DB.prepare('DELETE FROM certilia_tokovi WHERE created_at < ?').bind(Date.now() - 10 * 60 * 1000),
		// Ključ je hash, pa procurjela tablica ne daje upotrebljiv state.
		env.DB.prepare(
			'INSERT INTO certilia_tokovi (state_hash, code_verifier, nonce, natrag, debug, created_at) VALUES (?, ?, ?, ?, ?, ?)',
		).bind(
			await sha256Hex(state),
			codeVerifier,
			nonce,
			sigurnoNatrag(url.searchParams.get('natrag')),
			url.searchParams.get('debug') === '1' ? 1 : 0,
			Date.now(),
		),
	]);

	return redirect(await buildAuthorizeUrl({ state, nonce, codeVerifier }));
};
