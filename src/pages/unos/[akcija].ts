// Prima obrasce za unos u fiktivnu bazu (src/lib/unos.ts) i vraća na stranicu s porukom.
// Radi uz probnu prijavu ili uz potvrđenu ulogu prijavljenog računa; zahtjev za ulogu
// traži samo prijavu. Inače odgovara kao da stranice nema.
import type { APIRoute } from 'astro';
import { unesi, zatraziUlogu } from '../../lib/unos';
import { probnaPrijavaUkljucena } from '../../lib/uloga';

export const prerender = false;

export const POST: APIRoute = async ({ params, request, locals, redirect }) => {
	const akcija = params.akcija ?? '';
	const forma = await request.formData();
	if (akcija === 'zatrazi-ulogu' && locals.korisnikId) {
		const ishod = await zatraziUlogu(locals.korisnikId, forma);
		return redirect(`/uloga?${ishod.ok ? 'ok' : 'greska'}=${ishod.kod}`, 303);
	}
	if (!probnaPrijavaUkljucena() && locals.ulogaIzvor !== 'potvrdena') return new Response('Nema te stranice', { status: 404 });
	const ishod = await unesi(akcija, locals.uloga, forma);
	const natrag = ishod.natrag ?? '/moje';
	return redirect(`${natrag}?${ishod.ok ? 'ok' : 'greska'}=${ishod.kod}`, 303);
};
