import type { APIRoute } from 'astro';
import { PRESKOCI_KOLACIC } from '../../lib/passkey';
import { sigurnoNatrag } from '../../lib/sesija';

export const prerender = false;

/** „Ne sada" na ponudi ključa: ne nudi ponovno 30 dana na ovom uređaju. */
export const GET: APIRoute = ({ url, cookies, redirect }) => {
	cookies.set(PRESKOCI_KOLACIC, '1', { path: '/', httpOnly: true, secure: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 30 });
	return redirect(sigurnoNatrag(url.searchParams.get('natrag')));
};
