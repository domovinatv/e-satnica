// Tko potvrđuje čiju ulogu, dok škola i uloga ne stižu uz prijavu (otvoreno pitanje 26).
// Čisto pravilo bez I/O, da se može testirati.
import type { Uloga } from './uloga.ts';

export type VrstaZahtjeva = 'ravnatelj' | 'nastavnik' | 'kandidat';

export interface ZahtjevZaUlogu {
	vrsta: VrstaZahtjeva;
	/** Šifra škole za ravnatelja, oznaka osobe za nastavnika i kandidata. */
	cilj: string;
}

/**
 * Ravnatelja potvrđuje povjerenstvo, a nastavnika ravnatelj škole u kojoj nastavnik
 * radi. Kandidat izvana upisuje sam sebe, pa njegovu ulogu nitko ne potvrđuje.
 */
export function smijeOdluciti(tko: Uloga, z: ZahtjevZaUlogu, skoleOsobe: (oznaka: string) => string[]): boolean {
	if (z.vrsta === 'ravnatelj') return tko.vrsta === 'povjerenstvo';
	if (z.vrsta === 'nastavnik') return tko.vrsta === 'ravnatelj' && skoleOsobe(z.cilj).includes(tko.id);
	return false;
}

/** Ista škola ili osoba ne može pripadati dvama računima. */
export function zauzeto(z: ZahtjevZaUlogu, potvrdeni: (ZahtjevZaUlogu & { korisnikId: number })[], korisnikId: number): boolean {
	return potvrdeni.some((p) => p.vrsta === z.vrsta && p.cilj === z.cilj && p.korisnikId !== korisnikId);
}
