import type { APIRoute } from 'astro';
import { KOLACIC } from '../lib/sesija';

export const prerender = false;

export const POST: APIRoute = ({ cookies, redirect }) => {
	cookies.delete(KOLACIC, { path: '/' });
	return redirect('/prijava', 303);
};
