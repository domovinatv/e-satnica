import type { APIRoute } from 'astro';
import { opcijeUpisa, razlogOdbijanja } from '../../lib/passkey';

export const prerender = false;

export const POST: APIRoute = async ({ url, locals }) => {
	const odbijeno = await razlogOdbijanja(locals.sesija);
	if (odbijeno) return Response.json({ error: odbijeno }, { status: 403 });
	return Response.json(await opcijeUpisa(url, locals.sesija!.korisnikId!));
};
