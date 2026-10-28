// Privremena prijava za tim dok ne proradi Login with Certilia:
// ime + zajednički kod (secret TIM_KOD), sesija u potpisanom kolačiću.
import { env } from 'cloudflare:workers';

export const KOLACIC = 'esatnica_sesija';
const TRAJANJE_S = 60 * 60 * 24 * 90;

async function potpis(tekst: string): Promise<string> {
	const kljuc = await crypto.subtle.importKey(
		'raw',
		new TextEncoder().encode(env.TIM_KOD),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign'],
	);
	const sig = await crypto.subtle.sign('HMAC', kljuc, new TextEncoder().encode(tekst));
	return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/[+/=]/g, '');
}

export async function napraviSesiju(ime: string): Promise<{ vrijednost: string; maxAge: number }> {
	const tijelo = encodeURIComponent(ime);
	return { vrijednost: `${tijelo}.${await potpis(tijelo)}`, maxAge: TRAJANJE_S };
}

export async function procitajSesiju(vrijednost: string | undefined): Promise<string | null> {
	if (!vrijednost || !env.TIM_KOD) return null;
	const tocka = vrijednost.lastIndexOf('.');
	if (tocka < 1) return null;
	const tijelo = vrijednost.slice(0, tocka);
	if ((await potpis(tijelo)) !== vrijednost.slice(tocka + 1)) return null;
	return decodeURIComponent(tijelo);
}

export function kodJeIspravan(kod: string): boolean {
	return Boolean(env.TIM_KOD) && kod.trim() === env.TIM_KOD;
}
