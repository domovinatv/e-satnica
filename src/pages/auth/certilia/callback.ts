import type { APIRoute } from 'astro';
import { env, waitUntil } from 'cloudflare:workers';
import { sha256Hex } from '../../../lib/certilia/crypto';
import { exchangeCode, oibIzTokena, parsirajTrazi, stepUpVrijednosti, str, verifyIdToken } from '../../../lib/certilia/oidc';
import { KOLACIC, kolacicOpcije, napraviSesiju, oibHash } from '../../../lib/sesija';

export const prerender = false;

const TOK_TTL_MS = 10 * 60 * 1000;

interface Tok {
	code_verifier: string;
	nonce: string;
	natrag: string;
	debug: number;
	trazi: string;
	created_at: number;
}

export const GET: APIRoute = async ({ url, cookies, redirect }) => {
	const pocetak = Date.now();
	const p = url.searchParams;

	// Svaki izlaz ostavlja trag u `prijave`; upis ide nakon odgovora.
	const zapisi = (ishod: string, ok: boolean, extra: { oibHash?: string; claimovi?: string; greska?: string } = {}) =>
		waitUntil(
			env.DB.prepare('INSERT INTO prijave (ishod, ok, oib_hash, claimovi, trajanje_ms, greska) VALUES (?, ?, ?, ?, ?, ?)')
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

	// Jednokratno: tok se briše prije ikakvog rada, pa ponovljeni callback ne nalazi ništa.
	const tok = await env.DB.prepare('DELETE FROM certilia_tokovi WHERE state_hash = ? RETURNING *')
		.bind(await sha256Hex(state))
		.first<Tok>();
	if (!tok || Date.now() - tok.created_at > TOK_TTL_MS) return neuspjeh('neispravan_state');

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

	const korisnik = await env.DB.prepare(
		`INSERT INTO korisnici (oib_hash, ime, prezime) VALUES (?, ?, ?)
		 ON CONFLICT (oib_hash) DO UPDATE SET ime = excluded.ime, prezime = excluded.prezime, zadnja_prijava = datetime('now')
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

	zapisi(tok.trazi ? `sesija+${tok.trazi}` : 'sesija', true, { oibHash: hash, claimovi });
	cookies.set(KOLACIC, await napraviSesiju({ ime: `${ime} ${prezime}`, korisnikId: korisnik?.id ?? null }), kolacicOpcije);
	return redirect(tok.natrag);
};
