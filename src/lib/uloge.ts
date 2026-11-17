// Uloge prijavljenih računa: zahtjevi, potvrde i potvrđene uloge za unos.
// Pravilo tko što potvrđuje je u uloge-pravila.ts.
import { env } from 'cloudflare:workers';
import type { Uloga } from './uloga.ts';
import type { VrstaZahtjeva } from './uloge-pravila.ts';

export interface ZapisUloge {
	id: number;
	korisnikId: number;
	/** Ime i prezime s računa. */
	ime: string;
	vrsta: VrstaZahtjeva;
	cilj: string;
	stanje: 'ceka' | 'potvrdena' | 'odbijena';
	zatrazeno: string;
	odluceno: string | null;
	odlucio: string | null;
}

const UPIT = `SELECT u.id, u.korisnik_id AS korisnikId, k.ime || ' ' || k.prezime AS ime, u.vrsta, u.cilj, u.stanje, u.zatrazeno, u.odluceno, u.odlucio
	FROM uloge u JOIN korisnici k ON k.id = u.korisnik_id`;

/** Članovi povjerenstva su zadani popisom ID-jeva računa (POVJERENSTVO=1,7). */
export function clanPovjerenstva(korisnikId: number): boolean {
	return (env.POVJERENSTVO ?? '')
		.split(',')
		.map((s) => s.trim())
		.includes(String(korisnikId));
}

export async function ulogeKorisnika(korisnikId: number): Promise<ZapisUloge[]> {
	const { results } = await env.DB.prepare(`${UPIT} WHERE u.korisnik_id = ? ORDER BY u.id DESC`).bind(korisnikId).all<ZapisUloge>();
	return results;
}

export async function sveUloge(): Promise<ZapisUloge[]> {
	const { results } = await env.DB.prepare(`${UPIT} ORDER BY u.stanje = 'ceka' DESC, u.id DESC`).all<ZapisUloge>();
	return results;
}

/** Uloge s kojima račun smije unositi: potvrđene, i povjerenstvo ako je član. */
export async function potvrdeneUloge(korisnikId: number): Promise<Uloga[]> {
	const moje = (await ulogeKorisnika(korisnikId)).filter((u) => u.stanje === 'potvrdena').map((u): Uloga => ({ vrsta: u.vrsta, id: u.cilj }));
	return clanPovjerenstva(korisnikId) ? [{ vrsta: 'povjerenstvo', id: '' }, ...moje] : moje;
}
