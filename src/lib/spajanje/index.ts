// Prijedlog spajanja: korisnik je prijavljen računom A, a upravo se prijavio
// davateljem čiji je identitet već na računu B. Obje prijave su u ovom pregledniku,
// dakle ista osoba drži oba računa; spaja se tek kad to potvrdi na /racun/spoji.
import { env } from 'cloudflare:workers';
import type { AstroCookies } from 'astro';
import { base64url, hmacSha256Hex } from '../certilia/crypto';
import { naredbeSpajanja, odluciSpajanje, type RacunZaSpajanje } from './pravila';

export const SPAJANJE_KOLACIC = 'esatnica_spajanje';
const TRAJANJE_MS = 15 * 60 * 1000;

export interface Prijedlog {
	/** račun kojim je korisnik prijavljen */
	a: number;
	/** račun na koji upućuje upravo potvrđeni identitet */
	b: number;
	davatelj: 'certilia' | 'aaieduhr';
	istjece: number;
	natrag: string;
}

export async function predloziSpajanje(cookies: AstroCookies, p: Omit<Prijedlog, 'istjece'>): Promise<void> {
	const tijelo = base64url(new TextEncoder().encode(JSON.stringify({ ...p, istjece: Date.now() + TRAJANJE_MS })));
	const potpis = await hmacSha256Hex(env.SESIJA_KLJUC, `spajanje:${tijelo}`);
	cookies.set(SPAJANJE_KOLACIC, `${tijelo}.${potpis}`, { path: '/', httpOnly: true, secure: true, sameSite: 'lax', maxAge: TRAJANJE_MS / 1000 });
}

/** Prijedlog vrijedi samo za račun kojim je korisnik i sada prijavljen. */
export async function procitajPrijedlog(cookies: AstroCookies, korisnikId: number | null | undefined): Promise<Prijedlog | null> {
	const v = cookies.get(SPAJANJE_KOLACIC)?.value;
	if (!v || !korisnikId) return null;
	const tocka = v.lastIndexOf('.');
	const tijelo = v.slice(0, tocka);
	if (tocka < 1 || (await hmacSha256Hex(env.SESIJA_KLJUC, `spajanje:${tijelo}`)) !== v.slice(tocka + 1)) return null;
	try {
		const p = JSON.parse(atob(tijelo.replace(/-/g, '+').replace(/_/g, '/'))) as Prijedlog;
		return p.a === korisnikId && p.istjece > Date.now() ? p : null;
	} catch {
		return null;
	}
}

export function zaboraviPrijedlog(cookies: AstroCookies): void {
	cookies.delete(SPAJANJE_KOLACIC, { path: '/' });
}

export interface PregledRacuna extends RacunZaSpajanje {
	created_at: string;
	certilia: boolean;
	skole: number;
	kljucevi: number;
	stavke: number;
}

export async function pregledRacuna(id: number): Promise<PregledRacuna | null> {
	return env.DB.prepare(
		`SELECT k.id, k.oib_hash, k.ime, k.prezime, k.created_at,
		   k.oib_hash IS NOT NULL AS certilia,
		   (SELECT count(*) FROM identiteti WHERE korisnik_id = k.id AND davatelj = 'aaieduhr') AS skole,
		   (SELECT count(*) FROM passkeyi WHERE korisnik_id = k.id) AS kljucevi,
		   (SELECT count(*) FROM stavke WHERE korisnik_id = k.id) AS stavke
		 FROM korisnici k WHERE k.id = ?`,
	)
		.bind(id)
		.first<PregledRacuna>();
}

/** Spaja i vraća račun koji ostaje, ili razlog zašto ne može. */
export async function spojiRacune(a: number, b: number): Promise<{ ok: true; cilj: RacunZaSpajanje } | { ok: false; razlog: string }> {
	const [ra, rb] = await Promise.all([pregledRacuna(a), pregledRacuna(b)]);
	if (!ra || !rb) return { ok: false, razlog: 'nema_racuna' };
	const o = odluciSpajanje(ra, rb);
	if (!o.ok) return o;
	await env.DB.batch(naredbeSpajanja(o.cilj, o.izvor).map((n) => env.DB.prepare(n.sql).bind(...n.params)));
	const cilj = await pregledRacuna(o.cilj.id);
	return cilj ? { ok: true, cilj } : { ok: false, razlog: 'nema_racuna' };
}
