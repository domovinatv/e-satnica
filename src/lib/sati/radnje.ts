// Tko smije što učiniti sa slobodnim satima u kojem stanju. Svaka radnja vodi
// prijelazom koji stroj stanja dopušta (stanja.ts). Čiste funkcije bez I/O.

import type { Stanje } from './stanja.ts';

export type VrstaUloge = 'ravnatelj' | 'povjerenstvo' | 'nastavnik' | 'kandidat';

export type Radnja = 'dana60' | 'potraje' | 'provjereno' | 'odbij' | 'prihvati' | 'ne-zelim' | 'izbor';

export interface OpisRadnje {
	/** Stanje u kojem je radnja moguća. */
	iz: Stanje;
	/** Stanje u koje sati prelaze; `null` kad radnja ne mijenja stanje. */
	u: Stanje | null;
	tko: VrstaUloge[];
	naziv: string;
}

export const RADNJE: Record<Radnja, OpisRadnje> = {
	dana60: { iz: 'hitno', u: 'dana60', tko: ['ravnatelj'], naziv: 'Zaposli na 60 dana' },
	potraje: { iz: 'dana60', u: 'prijavljeni', tko: ['ravnatelj'], naziv: 'Prijavi sate' },
	provjereno: { iz: 'prijavljeni', u: 'ponudeni', tko: ['povjerenstvo'], naziv: 'Potvrdi' },
	odbij: { iz: 'prijavljeni', u: 'odbijeni', tko: ['povjerenstvo'], naziv: 'Odbij' },
	// Prihvatiti smije samo prva osoba u redu prednosti; tko je to, zna red, ne ova tablica.
	prihvati: { iz: 'ponudeni', u: 'dodijeljeni', tko: ['nastavnik', 'kandidat'], naziv: 'Prihvati' },
	'ne-zelim': { iz: 'ponudeni', u: null, tko: ['nastavnik', 'kandidat'], naziv: 'Ne želim' },
	izbor: { iz: 'natjecaj', u: 'dodijeljeni', tko: ['ravnatelj'], naziv: 'Zaključi natječaj' },
};

export function jeRadnja(r: string): r is Radnja {
	return r in RADNJE;
}

/** Radnje koje uloga ima na satima u zadanom stanju. */
export function radnjeZa(stanje: Stanje, uloga: VrstaUloge): Radnja[] {
	return (Object.keys(RADNJE) as Radnja[]).filter((r) => RADNJE[r].iz === stanje && RADNJE[r].tko.includes(uloga));
}
