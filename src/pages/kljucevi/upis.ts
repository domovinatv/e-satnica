import type { APIRoute } from 'astro';
import type { RegistrationResponseJSON } from '@simplewebauthn/server';
import { potvrdiUpis, razlogOdbijanja } from '../../lib/passkey';

export const prerender = false;

export const POST: APIRoute = async ({ request, url, locals }) => {
	const odbijeno = await razlogOdbijanja(locals.sesija);
	if (odbijeno) return Response.json({ error: odbijeno }, { status: 403 });
	const tijelo = await request.json<{ response?: RegistrationResponseJSON; naziv?: string }>().catch(() => null);
	if (!tijelo?.response?.id) return Response.json({ error: 'neispravan zahtjev' }, { status: 400 });
	const ok = await potvrdiUpis(url, locals.sesija!.korisnikId!, tijelo.response, (tijelo.naziv ?? '').trim());
	return ok ? Response.json({ ok: true }) : Response.json({ error: 'upis nije uspio' }, { status: 400 });
};
