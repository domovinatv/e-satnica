// Probna prijava: ulazak u ulogu iz prototipa (ravnatelj škole, nastavnik, kandidat,
// povjerenstvo) bez Certilije i @skole.hr. Postoji zato što škola i uloga još ne
// stižu uz pravu prijavu (otvoreno pitanje 26), a unos treba moći isprobati.
//
// Probna uloga nije korisnički račun: ne daje sesiju, ne otvara stranice računa i ne
// dopušta upis uz specifikaciju. Vrijedi samo za unos u fiktivnu bazu, i samo kad je
// PROBNA_PRIJAVA=1. Na produkciji nije postavljena, jer bi svatko mogao upisivati
// tekst na javnu stranicu.
import { env } from 'cloudflare:workers';
import type { VrstaUloge } from './sati/radnje.ts';

export const KOLACIC_ULOGE = 'esatnica_uloga';

export const kolacicUlogeOpcije = {
	path: '/',
	httpOnly: true,
	secure: true,
	sameSite: 'lax' as const,
	maxAge: 60 * 60 * 24,
};

export interface Uloga {
	vrsta: VrstaUloge;
	/** Šifra škole za ravnatelja, oznaka osobe za nastavnika i kandidata, prazno za povjerenstvo. */
	id: string;
}

export const VRSTE_ULOGA: Record<VrstaUloge, string> = {
	povjerenstvo: 'Povjerenstvo',
	ravnatelj: 'Ravnatelj',
	nastavnik: 'Nastavnik',
	kandidat: 'Kandidat',
};

export function probnaPrijavaUkljucena(): boolean {
	return env.PROBNA_PRIJAVA === '1';
}

const OBLIK = /^(povjerenstvo|ravnatelj|nastavnik|kandidat):([A-Z]{1,3}-\d{1,4})?$/;

/** Čita probnu ulogu iz kolačića. Postoji li ta škola ili osoba, provjerava se pri unosu. */
export function procitajUlogu(vrijednost: string | undefined): Uloga | undefined {
	return probnaPrijavaUkljucena() ? parsirajUlogu(vrijednost) : undefined;
}

/**
 * Samo oblik zapisa. Uz pravu prijavu kolačić bira jednu od potvrđenih uloga računa
 * i ništa ne vrijedi ako ta uloga nije potvrđena (middleware.ts).
 */
export function parsirajUlogu(vrijednost: string | undefined): Uloga | undefined {
	if (!vrijednost) return undefined;
	const m = OBLIK.exec(vrijednost);
	if (!m) return undefined;
	const vrsta = m[1] as VrstaUloge;
	const id = m[2] ?? '';
	if ((vrsta === 'povjerenstvo') !== (id === '')) return undefined;
	return { vrsta, id };
}

export function zapisiUlogu(u: Uloga): string {
	return `${u.vrsta}:${u.id}`;
}
