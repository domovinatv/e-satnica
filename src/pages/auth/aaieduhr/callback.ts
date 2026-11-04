import type { APIRoute } from 'astro';
import { env, waitUntil } from 'cloudflare:workers';
import { aaiOsoba } from '../../../lib/aaieduhr/claimovi';
import { aaiPostavke } from '../../../lib/aaieduhr/oidc';
import { dohvatiUserinfo, provjeriIdToken, zamijeniKod } from '../../../lib/oidc/klijent';
import { uzmiTok } from '../../../lib/oidc/tok';
import { brojKljuceva, PRESKOCI_KOLACIC } from '../../../lib/passkey';
import { identitetHash, KOLACIC, kolacicOpcije, napraviSesiju, procitajSesiju } from '../../../lib/sesija';

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

	let korisnikId = (
		await env.DB.prepare('SELECT korisnik_id FROM identiteti WHERE davatelj = ? AND id_hash = ?').bind(DAVATELJ, idHash).first<{ korisnik_id: number }>()
	)?.korisnik_id;
	let ishod = 'sesija';

	if (!korisnikId) {
		const vec = await procitajSesiju(cookies.get(KOLACIC)?.value);
		if (vec?.korisnikId) {
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

	// Ime iz @skole.hr osvježava se samo na računu bez Certilije; Certilijino ime je iz e-Osobne.
	const korisnik = await env.DB.prepare(
		`UPDATE korisnici SET zadnja_prijava = datetime('now'),
		   ime = iif(oib_hash IS NULL AND ?1 IS NOT NULL AND ?2 IS NOT NULL, ?1, ime),
		   prezime = iif(oib_hash IS NULL AND ?1 IS NOT NULL AND ?2 IS NOT NULL, ?2, prezime)
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
