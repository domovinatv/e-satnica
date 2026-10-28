// Pristupni ključevi (passkey). Preneseno iz omm.domovina.ai src/lib/admin/passkey.ts
// (koji je prijenos pay.domovina.ai backend/src/admin/auth/passkey.ts); držati u skladu.
// Razlika: umjesto Cloudflare Accessa korijen identiteta je Certilia. Ključ se dodaje
// samo nakon svježe prijave Certilijom i otvara sesiju istog korisnika.
// rpID i origin izvode se iz zahtjeva: ključ upisan na localhostu ne otvara produkciju.
import { env } from 'cloudflare:workers';
import {
	generateAuthenticationOptions,
	generateRegistrationOptions,
	verifyAuthenticationResponse,
	verifyRegistrationResponse,
	type AuthenticationResponseJSON,
	type AuthenticatorTransport,
	type RegistrationResponseJSON,
} from '@simplewebauthn/server';
import { isoBase64URL } from '@simplewebauthn/server/helpers';
import type { Sesija } from './sesija';

const RP_NAME = 'e-satnica';
const IZAZOV_TTL_MS = 5 * 60 * 1000;
/** Ukradeni kolačić ne smije postati trajni ključ: svježa Certilia prijava i najviše 5 ključeva. */
const SVJEZA_PRIJAVA_MS = 10 * 60 * 1000;
const NAJVISE_KLJUCEVA = 5;
/** Postavlja ga „Ne sada" na ponudi ključa nakon prijave Certilijom. */
export const PRESKOCI_KOLACIC = 'esatnica_bez_kljuca';

type Svrha = 'prijava' | 'upis';

interface KljucRed {
	id: string;
	korisnik_id: number;
	public_key: string;
	counter: number;
	transports: string | null;
}

const ctx = (url: URL) => ({ rpID: url.hostname, origin: url.origin });
const transports = (t: string | null) => (t ? (t.split(',') as AuthenticatorTransport[]) : undefined);

async function spremiIzazov(izazov: string, svrha: Svrha, korisnikId: number | null) {
	const sada = Date.now();
	await env.DB.batch([
		env.DB.prepare('DELETE FROM passkey_izazovi WHERE istjece < ?').bind(sada),
		env.DB.prepare('INSERT INTO passkey_izazovi (izazov, svrha, korisnik_id, istjece) VALUES (?, ?, ?, ?)').bind(
			izazov,
			svrha,
			korisnikId,
			sada + IZAZOV_TTL_MS,
		),
	]);
}

/** Jednokratno: izazov se briše pri prvoj provjeri, bez obzira na ishod. */
async function potrosiIzazov(izazov: string, svrha: Svrha): Promise<{ korisnikId: number | null } | null> {
	const red = await env.DB.prepare('DELETE FROM passkey_izazovi WHERE izazov = ? RETURNING svrha, korisnik_id, istjece')
		.bind(izazov)
		.first<{ svrha: string; korisnik_id: number | null; istjece: number }>();
	if (!red || red.svrha !== svrha || red.istjece < Date.now()) return null;
	return { korisnikId: red.korisnik_id };
}

/** Razlog zašto se ključ ne smije dodati, ili null. */
export async function razlogOdbijanja(s: Sesija | undefined): Promise<string | null> {
	if (!s?.korisnikId) return 'Pristupni ključ se dodaje nakon prijave Certilijom.';
	if (s.nacin !== 'certilia' || !s.od || Date.now() - s.od > SVJEZA_PRIJAVA_MS) {
		return 'Za dodavanje ključa prijava Certilijom mora biti svježa (unutar 10 minuta).';
	}
	const red = await env.DB.prepare('SELECT COUNT(*) AS n FROM passkeyi WHERE korisnik_id = ?').bind(s.korisnikId).first<{ n: number }>();
	if ((red?.n ?? 0) >= NAJVISE_KLJUCEVA) return `Najviše ${NAJVISE_KLJUCEVA} ključeva po osobi; obriši stari pa dodaj novi.`;
	return null;
}

export async function opcijeUpisa(url: URL, korisnikId: number) {
	const korisnik = await env.DB.prepare('SELECT ime, prezime FROM korisnici WHERE id = ?')
		.bind(korisnikId)
		.first<{ ime: string; prezime: string }>();
	const postojeci = await env.DB.prepare('SELECT id, transports FROM passkeyi WHERE korisnik_id = ?')
		.bind(korisnikId)
		.all<{ id: string; transports: string | null }>();
	const ime = korisnik ? `${korisnik.ime} ${korisnik.prezime}` : `korisnik ${korisnikId}`;
	const opcije = await generateRegistrationOptions({
		rpName: RP_NAME,
		rpID: ctx(url).rpID,
		userName: ime,
		userDisplayName: ime,
		// Neproziran i stabilan: ne otkriva OIB ni redni broj korisnika.
		userID: new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${env.SESIJA_KLJUC}:korisnik:${korisnikId}`))),
		attestationType: 'none',
		excludeCredentials: postojeci.results.map((k) => ({ id: k.id, transports: transports(k.transports) })),
		authenticatorSelection: { residentKey: 'required', userVerification: 'required' },
	});
	await spremiIzazov(opcije.challenge, 'upis', korisnikId);
	return opcije;
}

export async function potvrdiUpis(url: URL, korisnikId: number, response: RegistrationResponseJSON, naziv: string): Promise<boolean> {
	const { rpID, origin } = ctx(url);
	const rezultat = await verifyRegistrationResponse({
		response,
		expectedChallenge: async (c) => (await potrosiIzazov(c, 'upis'))?.korisnikId === korisnikId,
		expectedOrigin: origin,
		expectedRPID: rpID,
		requireUserVerification: true,
	}).catch(() => null);
	if (!rezultat?.verified) return false;
	const { credential } = rezultat.registrationInfo;
	await env.DB.prepare('INSERT INTO passkeyi (id, korisnik_id, public_key, counter, transports, naziv) VALUES (?, ?, ?, ?, ?, ?)')
		.bind(
			credential.id,
			korisnikId,
			isoBase64URL.fromBuffer(credential.publicKey),
			credential.counter,
			credential.transports?.join(',') ?? null,
			naziv.slice(0, 80) || 'pristupni ključ',
		)
		.run();
	return true;
}

export async function opcijePrijave(url: URL) {
	const opcije = await generateAuthenticationOptions({
		rpID: ctx(url).rpID,
		userVerification: 'required',
		allowCredentials: [], // discoverable: uređaj sam ponudi ključ za ovu domenu
	});
	await spremiIzazov(opcije.challenge, 'prijava', null);
	return opcije;
}

/** Vraća korisnika kojem ključ pripada ili null. Greške namjerno ne razlikuju razloge. */
export async function potvrdiPrijavu(
	url: URL,
	response: AuthenticationResponseJSON,
): Promise<{ korisnikId: number; ime: string } | null> {
	const kljuc = await env.DB.prepare('SELECT id, korisnik_id, public_key, counter, transports FROM passkeyi WHERE id = ?')
		.bind(response.id)
		.first<KljucRed>();
	if (!kljuc) return null;

	const { rpID, origin } = ctx(url);
	const rezultat = await verifyAuthenticationResponse({
		response,
		expectedChallenge: async (c) => (await potrosiIzazov(c, 'prijava')) !== null,
		expectedOrigin: origin,
		expectedRPID: rpID,
		requireUserVerification: true,
		credential: {
			id: kljuc.id,
			publicKey: isoBase64URL.toBuffer(kljuc.public_key),
			counter: kljuc.counter,
			transports: transports(kljuc.transports),
		},
	}).catch(() => null);
	if (!rezultat?.verified) return null;

	const [, korisnik] = await env.DB.batch<{ ime: string; prezime: string }>([
		env.DB.prepare("UPDATE passkeyi SET counter = ?, zadnje_koristen = datetime('now') WHERE id = ?").bind(
			rezultat.authenticationInfo.newCounter,
			kljuc.id,
		),
		env.DB.prepare("UPDATE korisnici SET zadnja_prijava = datetime('now') WHERE id = ? RETURNING ime, prezime").bind(kljuc.korisnik_id),
	]);
	const red = korisnik.results[0];
	return red ? { korisnikId: kljuc.korisnik_id, ime: `${red.ime} ${red.prezime}` } : null;
}

export async function brojKljuceva(korisnikId: number): Promise<number> {
	const red = await env.DB.prepare('SELECT COUNT(*) AS n FROM passkeyi WHERE korisnik_id = ?').bind(korisnikId).first<{ n: number }>();
	return red?.n ?? 0;
}
