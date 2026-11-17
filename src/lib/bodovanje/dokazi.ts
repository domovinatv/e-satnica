// Koji kriteriji imaju potvrđen dokaz na zadani dan. Isto pravilo koristi aplikacija
// i generator fiktivne baze, da lista u bazi i ponovljeni izračun budu isti.
import type { Dokazano } from './bodovi.ts';

export interface ZapisDokaza {
	kriterij: string;
	stanje: 'ceka' | 'potvrden' | 'odbijen';
	/** Datum ili datum i vrijeme odluke; `null` dok dokaz čeka. */
	odluceno: string | null;
}

/** Kriterij je dokazan ako je bar jedan njegov dokaz potvrđen najkasnije tog dana. */
export function dokazanoDo(dokazi: ZapisDokaza[], dan: string): Dokazano {
	const dokazani = new Set(dokazi.filter((d) => d.stanje === 'potvrden' && d.odluceno !== null && d.odluceno.slice(0, 10) <= dan.slice(0, 10)).map((d) => d.kriterij));
	return (kljuc) => dokazani.has(kljuc);
}
