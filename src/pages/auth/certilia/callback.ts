import type { APIRoute } from 'astro';
import { env, waitUntil } from 'cloudflare:workers';
import { exchangeCode, oibIzTokena, parsirajTrazi, stepUpVrijednosti, str, verifyIdToken } from '../../../lib/certilia/oidc';
import { uzmiTok } from '../../../lib/oidc/tok';
import { brojKljuceva, PRESKOCI_KOLACIC } from '../../../lib/passkey';
import { KOLACIC, kolacicOpcije, napraviSesiju, oibHash, POKUSAJ_KOLACIC, procitajSesiju } from '../../../lib/sesija';
import { predloziSpajanje } from '../../../lib/spajanje';

export const prerender = false;

export const GET: APIRoute = async ({ url, cookies, redirect }) => {
	const pocetak = Date.now();
	const p = url.searchParams;

	// Svaki izlaz ostavlja trag u `prijave`; upis ide nakon odgovora.
	const zapisi = (ishod: string, ok: boolean, extra: { oibHash?: string; claimovi?: string; greska?: string } = {}) =>
		waitUntil(
			env.DB.prepare('INSERT INTO prijave (ishod, ok, oib_hash, claimovi, trajanje_ms, greska, davatelj) VALUES (?, ?, ?, ?, ?, ?, \'certilia\')')
				.bind(ishod, ok ? 1 : 0, extra.oibHash ?? null, extra.claimovi ?? null, Date.now() - pocetak, extra.greska ?? null)
				.run(),
		);
	const neuspjeh = (kod: string, extra: { oibHash?: string; claimovi?: string; greska?: string } = {}) => {
		zapisi(kod, false, extra);
		return redirect(`/prijava?certilia_greska=${encodeURIComponent(kod)}`);
	};

	if (p.get('error')) return neuspjeh(p.get('error') === 'access_denied' ? 'odustao' : 'idp_greska');

	const code = p.get('code');
	const state = p.get('state');
	if (!code || !state) return neuspjeh('nema_koda');

	const tok = await uzmiTok('certilia', state);
	if (!tok) return neuspjeh('neispravan_state');

	let payload: Record<string, unknown>;
	try {
		const tokens = await exchangeCode({ code, codeVerifier: tok.code_verifier });
		if (!tokens.id_token) return neuspjeh('nema_id_tokena');
		payload = await verifyIdToken(tokens.id_token, tok.nonce);
	} catch (e) {
		const razlog = e instanceof Error ? e.message : 'unknown';
		console.error('certilia_verify_failed', { razlog });
		return neuspjeh(razlog === 'nonce_mismatch' ? 'nonce_mismatch' : 'neispravan_token', { greska: razlog });
	}

	// Samo IMENA claimova, nikad vrijednosti: govore što pojedini certifikat nosi.
	const claimovi = Object.keys(payload).sort().join(',');
	const { oib, izvor } = oibIzTokena(payload);

	if (tok.debug) {
		const d = new URLSearchParams({
			certilia_claimovi: claimovi,
			oib_izvor: izvor,
			oib_11_znamenki: String(/^\d{11}$/.test(oib ?? '')),
		});
		zapisi('debug', true, { claimovi });
		return redirect(`/prijava?${d.toString()}`);
	}

	if (!oib) return neuspjeh('nema_oiba', { claimovi });
	const ime = str(payload.given_name) ?? str(payload.firstname);
	const prezime = str(payload.family_name) ?? str(payload.lastname);
	const hash = await oibHash(oib);
	if (!ime || !prezime) return neuspjeh('nema_imena', { oibHash: hash, claimovi });

	// Prijavljen s @skole.hr računom koji još nema OIB: Certilia ga potvrđuje i spaja.
	// Ako taj OIB već ima drugi račun, ne dira se ništa i prijava ide na taj račun.
	const vec = await procitajSesiju(cookies.get(KOLACIC)?.value);
	if (vec?.korisnikId) {
		await env.DB.prepare(
			'UPDATE korisnici SET oib_hash = ?1, certilia = 1 WHERE id = ?2 AND oib_hash IS NULL AND NOT EXISTS (SELECT 1 FROM korisnici WHERE oib_hash = ?1)',
		)
			.bind(hash, vec.korisnikId)
			.run();
	}

	const korisnik = await env.DB.prepare(
		`INSERT INTO korisnici (oib_hash, ime, prezime, certilia) VALUES (?, ?, ?, 1)
		 ON CONFLICT (oib_hash) DO UPDATE SET ime = excluded.ime, prezime = excluded.prezime, certilia = 1, zadnja_prijava = datetime('now')
		 RETURNING id`,
	)
		.bind(hash, ime, prezime)
		.first<{ id: number }>();

	// Spremaju se samo podaci koje je funkcija izričito tražila ovim step-upom.
	const podaci = stepUpVrijednosti(payload, parsirajTrazi(tok.trazi));
	if (korisnik && podaci.size) {
		await env.DB.batch(
			[...podaci].map(([podatak, v]) =>
				env.DB.prepare(
					`INSERT INTO korisnik_podaci (korisnik_id, podatak, vrijednost) VALUES (?, ?, ?)
					 ON CONFLICT (korisnik_id, podatak) DO UPDATE SET vrijednost = excluded.vrijednost, dohvaceno_at = datetime('now')`,
				).bind(korisnik.id, podatak, v),
			),
		);
	}

	// Prijavljen računom bez OIB-a (npr. @skole.hr), a ovaj OIB već ima svoj račun:
	// ista osoba ima dva računa. Sesija ostaje na trenutnom, korisnik potvrđuje spajanje.
	// Račun s drugim OIB-om je druga osoba; tada se prijava samo prebacuje.
	if (korisnik && vec?.korisnikId && vec.korisnikId !== korisnik.id && !tok.trazi) {
		const trenutni = await env.DB.prepare('SELECT oib_hash FROM korisnici WHERE id = ?').bind(vec.korisnikId).first<{ oib_hash: string | null }>();
		if (trenutni && !trenutni.oib_hash) {
			zapisi('predlozeno_spajanje', true, { oibHash: hash, claimovi });
			cookies.delete(POKUSAJ_KOLACIC, { path: '/' });
			await predloziSpajanje(cookies, { a: vec.korisnikId, b: korisnik.id, davatelj: 'certilia', natrag: tok.natrag });
			return redirect('/racun/spoji');
		}
	}

	zapisi(tok.trazi ? `sesija+${tok.trazi}` : 'sesija', true, { oibHash: hash, claimovi });
	cookies.set(
		KOLACIC,
		await napraviSesiju({ ime: `${ime} ${prezime}`, korisnikId: korisnik?.id ?? null, nacin: 'certilia', od: Date.now() }),
		kolacicOpcije,
	);
	cookies.delete(POKUSAJ_KOLACIC, { path: '/' });
	// Tko još nema pristupni ključ, dobije ponudu odmah, dok je prijava svježa.
	if (korisnik && !tok.trazi && !cookies.has(PRESKOCI_KOLACIC) && (await brojKljuceva(korisnik.id)) === 0) {
		return redirect(`/kljucevi?ponuda=1&natrag=${encodeURIComponent(tok.natrag)}`);
	}
	return redirect(tok.natrag);
};
