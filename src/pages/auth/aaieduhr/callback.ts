import type { APIRoute } from 'astro';
import { env, waitUntil } from 'cloudflare:workers';
import { aaiOsoba } from '../../../lib/aaieduhr/claimovi';
import { aaiPostavke } from '../../../lib/aaieduhr/oidc';
import { dohvatiUserinfo, provjeriIdToken, zamijeniKod } from '../../../lib/oidc/klijent';
import { uzmiTok } from '../../../lib/oidc/tok';
import { brojKljuceva, PRESKOCI_KOLACIC } from '../../../lib/passkey';
import { identitetHash, KOLACIC, kolacicOpcije, napraviSesiju, oibHash, procitajSesiju } from '../../../lib/sesija';
import { predloziSpajanje, spojiRacune } from '../../../lib/spajanje';

export const prerender = false;

const DAVATELJ = 'aaieduhr';

/**
 * Prijava s @skole.hr. Glavni ulaz za djelatnike škola: prvi dolazak otvara račun,
 * a ako je korisnik već prijavljen (npr. Certilijom), @skole.hr se spaja s tim računom.
 * Vrijednosti atributa se ne spremaju (Pravilnik AAI@EduHr, čl. 34) osim imena i
 * prezimena, koji se prikazuju uz stavke kao autor; identifikator samo kao HMAC.
 */
export const GET: APIRoute = async ({ url, cookies, redirect }) => {
	const pocetak = Date.now();
	const p = url.searchParams;

	const zapisi = (ishod: string, ok: boolean, extra: { claimovi?: string; greska?: string } = {}) =>
		waitUntil(
			env.DB.prepare('INSERT INTO prijave (ishod, ok, claimovi, trajanje_ms, greska, davatelj) VALUES (?, ?, ?, ?, ?, ?)')
				.bind(ishod, ok ? 1 : 0, extra.claimovi ?? null, Date.now() - pocetak, extra.greska ?? null, DAVATELJ)
				.run(),
		);
	const neuspjeh = (kod: string, extra: { claimovi?: string; greska?: string } = {}) => {
		zapisi(kod, false, extra);
		return redirect(`/prijava?aai_greska=${encodeURIComponent(kod)}`);
	};

	if (p.get('error')) return neuspjeh(p.get('error') === 'access_denied' ? 'odustao' : 'idp_greska', { greska: p.get('error') ?? undefined });

	const code = p.get('code');
	const state = p.get('state');
	if (!code || !state) return neuspjeh('nema_koda');

	const tok = await uzmiTok(DAVATELJ, state);
	if (!tok) return neuspjeh('neispravan_state');

	const postavke = aaiPostavke();
	let idToken: Record<string, unknown>;
	let userinfo: Record<string, unknown> | null;
	try {
		const tokens = await zamijeniKod(postavke, { code, codeVerifier: tok.code_verifier });
		if (!tokens.id_token) return neuspjeh('nema_id_tokena');
		idToken = await provjeriIdToken(postavke, tokens.id_token, tok.nonce);
		userinfo = await dohvatiUserinfo(postavke, tokens.access_token);
	} catch (e) {
		const razlog = e instanceof Error ? e.message : 'unknown';
		console.error('aai_verify_failed', { razlog });
		return neuspjeh(razlog === 'nonce_mismatch' ? 'nonce_mismatch' : 'neispravan_token', { greska: razlog });
	}

	const osoba = aaiOsoba(idToken, userinfo);
	// Samo IMENA ključeva: prva prava prijava pokaže gdje i u kojem obliku stižu atributi.
	console.log('aai_claimovi', { kljucevi: osoba.kljucevi, identitet: osoba.identitetIzvor });

	if (tok.debug) {
		zapisi('debug', true, { claimovi: osoba.kljucevi });
		const d = new URLSearchParams({
			aai_claimovi: osoba.kljucevi,
			aai_identitet: osoba.identitetIzvor,
			aai_ime: String(Boolean(osoba.ime && osoba.prezime)),
			aai_povezanost: osoba.povezanost ?? '',
		});
		return redirect(`/prijava?${d.toString()}`);
	}

	if (!osoba.identitet) return neuspjeh('nema_identiteta', { claimovi: osoba.kljucevi });
	const idHash = await identitetHash(DAVATELJ, osoba.identitet);

	const vec = await procitajSesiju(cookies.get(KOLACIC)?.value);
	// OIB iz @skole.hr (scope hrEduPersonOIB, kad je uključen): isti OIB kao na
	// Certilia računu je ista osoba, pa se računi spajaju bez pitanja.
	const oibH = osoba.oib ? await oibHash(osoba.oib) : null;
	const poOibu = oibH
		? (await env.DB.prepare('SELECT id FROM korisnici WHERE oib_hash = ?').bind(oibH).first<{ id: number }>())?.id
		: undefined;

	let korisnikId = (
		await env.DB.prepare('SELECT korisnik_id FROM identiteti WHERE davatelj = ? AND id_hash = ?').bind(DAVATELJ, idHash).first<{ korisnik_id: number }>()
	)?.korisnik_id;
	let ishod = 'sesija';

	if (!korisnikId) {
		if (poOibu) {
			korisnikId = poOibu;
			ishod = 'spojeno_oib';
		} else if (vec?.korisnikId) {
			korisnikId = vec.korisnikId;
			ishod = 'spojeno';
		} else {
			if (!osoba.ime || !osoba.prezime) return neuspjeh('nema_imena', { claimovi: osoba.kljucevi });
			const novi = await env.DB.prepare('INSERT INTO korisnici (ime, prezime) VALUES (?, ?) RETURNING id')
				.bind(osoba.ime, osoba.prezime)
				.first<{ id: number }>();
			if (!novi) return neuspjeh('baza');
			korisnikId = novi.id;
			ishod = 'novi';
		}
		// Dvije istodobne prve prijave: pobjeđuje prva, druga se prijavi na njen račun.
		const veza = await env.DB.prepare(
			`INSERT INTO identiteti (davatelj, id_hash, korisnik_id) VALUES (?, ?, ?)
			 ON CONFLICT (davatelj, id_hash) DO UPDATE SET zadnja_prijava = datetime('now')
			 RETURNING korisnik_id`,
		)
			.bind(DAVATELJ, idHash, korisnikId)
			.first<{ korisnik_id: number }>();
		if (veza) korisnikId = veza.korisnik_id;
	} else {
		await env.DB.prepare("UPDATE identiteti SET zadnja_prijava = datetime('now') WHERE davatelj = ? AND id_hash = ?").bind(DAVATELJ, idHash).run();
	}

	if (oibH) {
		if (poOibu && poOibu !== korisnikId) {
			// Ovaj @skole.hr već ima račun, a OIB drugi (Certilia): spajanje. Različiti
			// OIB-ovi (račun ima Certiliju s drugim OIB-om) se ne spajaju.
			const r = await spojiRacune(korisnikId, poOibu);
			if (r.ok) {
				korisnikId = r.cilj.id;
				ishod = 'spojeno_oib';
			} else console.warn('aai_oib_sukob', { razlog: r.razlog });
		} else if (!poOibu) {
			// Prvi OIB na računu: kasnija Certilia prijava nađe ovaj račun i ne otvara novi.
			await env.DB.prepare('UPDATE korisnici SET oib_hash = ? WHERE id = ? AND oib_hash IS NULL').bind(oibH, korisnikId).run();
		}
	}

	// Prijavljen drugim računom, a ovaj @skole.hr pripada drugom: ista osoba ima dva
	// računa. Sesija ostaje na trenutnom, korisnik potvrđuje spajanje.
	if (vec?.korisnikId && vec.korisnikId !== korisnikId) {
		zapisi('predlozeno_spajanje', true, { claimovi: osoba.kljucevi });
		await predloziSpajanje(cookies, { a: vec.korisnikId, b: korisnikId, davatelj: DAVATELJ, natrag: tok.natrag });
		return redirect('/racun/spoji');
	}

	// Ime iz @skole.hr osvježava se samo na računu bez Certilije; Certilijino ime je iz e-Osobne.
	const korisnik = await env.DB.prepare(
		`UPDATE korisnici SET zadnja_prijava = datetime('now'),
		   ime = iif(certilia = 0 AND ?1 IS NOT NULL AND ?2 IS NOT NULL, ?1, ime),
		   prezime = iif(certilia = 0 AND ?1 IS NOT NULL AND ?2 IS NOT NULL, ?2, prezime)
		 WHERE id = ?3 RETURNING ime, prezime`,
	)
		.bind(osoba.ime, osoba.prezime, korisnikId)
		.first<{ ime: string; prezime: string }>();
	if (!korisnik) return neuspjeh('nema_korisnika', { claimovi: osoba.kljucevi });

	zapisi(ishod, true, { claimovi: osoba.kljucevi });
	cookies.set(
		KOLACIC,
		await napraviSesiju({
			ime: `${korisnik.ime} ${korisnik.prezime}`,
			korisnikId,
			nacin: 'aaieduhr',
			od: Date.now(),
			povezanost: osoba.povezanost,
		}),
		kolacicOpcije,
	);
	if (!cookies.has(PRESKOCI_KOLACIC) && (await brojKljuceva(korisnikId)) === 0) {
		return redirect(`/kljucevi?ponuda=1&natrag=${encodeURIComponent(tok.natrag)}`);
	}
	return redirect(tok.natrag);
};
