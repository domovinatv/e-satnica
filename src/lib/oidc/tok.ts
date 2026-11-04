// Kratkotrajno stanje OIDC toka u D1 (oidc_tokovi), zajedničko svim davateljima.
import { env } from 'cloudflare:workers';
import { randomBase64url, sha256Hex } from '../certilia/crypto';

export type Davatelj = 'certilia' | 'aaieduhr';

export const TOK_TTL_MS = 10 * 60 * 1000;

export interface Tok {
	code_verifier: string;
	nonce: string;
	natrag: string;
	debug: number;
	trazi: string;
	created_at: number;
}

/**
 * Otvori tok i vrati vrijednosti za authorize URL. Stari nedovršeni tokovi se usput
 * čiste, a prije brisanja ostave trag u `prijave`: netko je kliknuo i nije se vratio.
 */
export async function otvoriTok(davatelj: Davatelj, a: { natrag: string; debug: boolean; trazi?: string }) {
	const state = randomBase64url(32);
	const nonce = randomBase64url(32);
	const codeVerifier = randomBase64url(64);
	const istekli = Date.now() - TOK_TTL_MS;
	await env.DB.batch([
		env.DB.prepare(
			`INSERT INTO prijave (created_at, ishod, ok, davatelj)
			 SELECT datetime(created_at / 1000, 'unixepoch'), 'napusten' || iif(trazi = '', '', '+' || trazi), 0, davatelj
			 FROM oidc_tokovi WHERE created_at < ? AND debug = 0`,
		).bind(istekli),
		env.DB.prepare('DELETE FROM oidc_tokovi WHERE created_at < ?').bind(istekli),
		// Ključ je hash, pa procurjela tablica ne daje upotrebljiv state.
		env.DB.prepare(
			'INSERT INTO oidc_tokovi (state_hash, code_verifier, nonce, natrag, debug, trazi, davatelj, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
		).bind(await sha256Hex(state), codeVerifier, nonce, a.natrag, a.debug ? 1 : 0, a.trazi ?? '', davatelj, Date.now()),
	]);
	return { state, nonce, codeVerifier };
}

/** Jednokratno: tok se briše prije ikakvog rada, pa ponovljeni callback ne nalazi ništa. */
export async function uzmiTok(davatelj: Davatelj, state: string): Promise<Tok | null> {
	const tok = await env.DB.prepare('DELETE FROM oidc_tokovi WHERE state_hash = ? AND davatelj = ? RETURNING *')
		.bind(await sha256Hex(state), davatelj)
		.first<Tok>();
	return tok && Date.now() - tok.created_at <= TOK_TTL_MS ? tok : null;
}
