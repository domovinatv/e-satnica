// Sesija u potpisanom kolačiću (HMAC ključem SESIJA_KLJUC). Nastaje prijavom preko
// Certilije ili pristupnim ključem.
import { env } from 'cloudflare:workers';
import { base64url, hmacSha256Hex } from './certilia/crypto';

export const KOLACIC = 'esatnica_sesija';
const TRAJANJE_S = 60 * 60 * 24 * 30;

export interface Sesija {
	ime: string;
	korisnikId: number | null;
	// Stari kolačići nemaju ova polja; tada se tretiraju kao prijava koja nije svježa.
	nacin?: 'certilia' | 'passkey';
	od?: number; // epoch ms prijave
}

export const kolacicOpcije = {
	path: '/',
	httpOnly: true,
	secure: true,
	sameSite: 'lax' as const,
	maxAge: TRAJANJE_S,
};

export async function napraviSesiju(sesija: Sesija): Promise<string> {
	const tijelo = base64url(new TextEncoder().encode(JSON.stringify(sesija)));
	return `${tijelo}.${await hmacSha256Hex(env.SESIJA_KLJUC, tijelo)}`;
}

export async function procitajSesiju(vrijednost: string | undefined): Promise<Sesija | null> {
	if (!vrijednost || !env.SESIJA_KLJUC) return null;
	const tocka = vrijednost.lastIndexOf('.');
	if (tocka < 1) return null;
	const tijelo = vrijednost.slice(0, tocka);
	if ((await hmacSha256Hex(env.SESIJA_KLJUC, tijelo)) !== vrijednost.slice(tocka + 1)) return null;
	try {
		const json = atob(tijelo.replace(/-/g, '+').replace(/_/g, '/'));
		const bytes = Uint8Array.from(json, (c) => c.charCodeAt(0));
		const sesija = JSON.parse(new TextDecoder().decode(bytes)) as Sesija;
		// Sesije bez korisnika otvorene su ukinutim kodom tima.
		return sesija.korisnikId ? sesija : null;
	} catch {
		return null;
	}
}

/** OIB se nikad ne sprema, samo ovaj otisak. */
export function oibHash(oib: string): Promise<string> {
	return hmacSha256Hex(env.SESIJA_KLJUC, `oib:${oib}`);
}

/** Samo putanje na istom originu smiju biti odredište nakon prijave. */
export function sigurnoNatrag(raw: string | null | undefined): string {
	return raw && raw.startsWith('/') && !raw.startsWith('//') ? raw : '/specifikacija';
}
