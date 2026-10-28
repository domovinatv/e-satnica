import type { APIRoute } from 'astro';
import type { AuthenticationResponseJSON } from '@simplewebauthn/server';
import { env, waitUntil } from 'cloudflare:workers';
import { potvrdiPrijavu } from '../../../lib/passkey';
import { KOLACIC, kolacicOpcije, napraviSesiju, sigurnoNatrag } from '../../../lib/sesija';

export const prerender = false;

export const POST: APIRoute = async ({ request, url, cookies }) => {
	const pocetak = Date.now();
	const tijelo = await request.json<{ response?: AuthenticationResponseJSON; natrag?: string }>().catch(() => null);
	if (!tijelo?.response?.id) return Response.json({ error: 'neispravan zahtjev' }, { status: 400 });
	const korisnik = await potvrdiPrijavu(url, tijelo.response);

	// Isti revizijski trag kao Certilia prijava; OIB samo kao otisak iz `korisnici`.
	waitUntil(
		env.DB.prepare(
			`INSERT INTO prijave (ishod, ok, oib_hash, trajanje_ms)
			 VALUES (?, ?, (SELECT oib_hash FROM korisnici WHERE id = ?), ?)`,
		)
			.bind(korisnik ? 'passkey' : 'passkey_odbijen', korisnik ? 1 : 0, korisnik?.korisnikId ?? null, Date.now() - pocetak)
			.run(),
	);
	if (!korisnik) return Response.json({ error: 'ključ nije prepoznat' }, { status: 401 });

	cookies.set(
		KOLACIC,
		await napraviSesiju({ ime: korisnik.ime, korisnikId: korisnik.korisnikId, nacin: 'passkey', od: Date.now() }),
		kolacicOpcije,
	);
	return Response.json({ natrag: sigurnoNatrag(tijelo.natrag) });
};
