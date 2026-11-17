// Bodovne tablice. Ovo je jedini izvor istine: stranica /specifikacija/03-kriteriji-bodovanja
// tablicu prikazuje iz ovog modula, a izračun u bodovi.ts čita isti objekt.
//
// Tablica se ne mijenja nakon što je zaključana. Nova pravila idu u novu verziju
// (v0-nacrt → v1 …), da se svaki stari izračun može ponoviti istim ulazom.

/** Podaci o osobi koji ulaze u bodovanje. Sve godine su navršene (cijele) godine. */
export interface Osoba {
	/** Navršene godine radnog staža u obrazovanju. */
	stazUObrazovanju: number;
	/** Navršene godine radnog staža izvan obrazovanja. */
	stazIzvanObrazovanja: number;
	/** Navršene godine života na dan zaključavanja liste. */
	dob: number;
	/** Broj uzdržavanih članova obitelji. */
	uzdrzavaniClanovi: number;
	/** Samohrani roditelj (naš prijedlog) ili samac (SDŽ). */
	samohraniIliSamac: boolean;
	dijeteSTeskocama: boolean;
	/** Vlastito zdravstveno stanje ili invaliditet. */
	invaliditet: boolean;
	/** Koliko je puta osoba ranije proglašena viškom. */
	prethodniViskovi: number;
	napredovanje: 'nema' | 'mentor' | 'savjetnik';
}

/** Kako se jedan kriterij pretvara u bodove. */
export type Pravilo =
	| { vrsta: 'po_jedinici'; polje: BrojcanoPolje; bodova: number; jedinica: string }
	| { vrsta: 'da_ne'; polje: DaNePolje; bodova: number }
	| { vrsta: 'napredovanje'; mentor: number; savjetnik: number };

type BrojcanoPolje = { [K in keyof Osoba]: Osoba[K] extends number ? K : never }[keyof Osoba];
type DaNePolje = { [K in keyof Osoba]: Osoba[K] extends boolean ? K : never }[keyof Osoba];

export interface Kriterij {
	kljuc: string;
	naziv: string;
	pravilo: Pravilo;
	/** Odakle kriterij dolazi i je li potvrđen. */
	napomena?: string;
	/**
	 * Kriterij se boduje i bez dokaza koji potvrđuje povjerenstvo (npr. dob, iz datuma
	 * rođenja s prijave). Ostali se boduju tek uz potvrđen dokaz.
	 */
	bezDokaza?: boolean;
}

/** Usporedba kod jednakog broja bodova: veća vrijednost polja ide naprijed. */
export type Prednost = { polje: BrojcanoPolje; naziv: string };

export interface BodovnaTablica {
	verzija: string;
	naziv: string;
	stanje: 'nacrt' | 'zakljucano' | 'usporedba';
	kriteriji: Kriterij[];
	/** Redoslijed usporedbe kod jednakog broja bodova, prvo pravilo ima prednost. */
	kodJednakihBodova: Prednost[];
}

export const V0_NACRT: BodovnaTablica = {
	verzija: 'v0-nacrt',
	naziv: 'Prijedlog e-satnice, nacrt',
	stanje: 'nacrt',
	kriteriji: [
		{ kljuc: 'staz_obrazovanje', naziv: 'Staž u obrazovanju', pravilo: { vrsta: 'po_jedinici', polje: 'stazUObrazovanju', bodova: 2, jedinica: 'godina' } },
		{ kljuc: 'staz_izvan', naziv: 'Staž izvan obrazovanja', pravilo: { vrsta: 'po_jedinici', polje: 'stazIzvanObrazovanja', bodova: 1, jedinica: 'godina' } },
		{ kljuc: 'dob', naziv: 'Dob', pravilo: { vrsta: 'po_jedinici', polje: 'dob', bodova: 1, jedinica: 'navršena godina' }, napomena: 'SDŽ daje 2; otvoreno pitanje za pravnicu', bezDokaza: true },
		{ kljuc: 'uzdrzavani', naziv: 'Uzdržavani član obitelji', pravilo: { vrsta: 'po_jedinici', polje: 'uzdrzavaniClanovi', bodova: 1, jedinica: 'član' } },
		{ kljuc: 'samohrani', naziv: 'Samohrani roditelj / samac', pravilo: { vrsta: 'da_ne', polje: 'samohraniIliSamac', bodova: 2 } },
		{ kljuc: 'dijete_teskoce', naziv: 'Dijete s teškoćama', pravilo: { vrsta: 'da_ne', polje: 'dijeteSTeskocama', bodova: 2 } },
		{ kljuc: 'invaliditet', naziv: 'Vlastito zdravstveno stanje, invaliditet', pravilo: { vrsta: 'da_ne', polje: 'invaliditet', bodova: 2 } },
		{ kljuc: 'prethodni_visak', naziv: 'Svako prethodno proglašenje viškom', pravilo: { vrsta: 'po_jedinici', polje: 'prethodniViskovi', bodova: 1, jedinica: 'put' } },
		{ kljuc: 'napredovanje', naziv: 'Mentor / savjetnik', pravilo: { vrsta: 'napredovanje', mentor: 5, savjetnik: 10 }, napomena: 'prijedlog sa sastanka, nepotvrđeno' },
	],
	kodJednakihBodova: [
		{ polje: 'stazUObrazovanju', naziv: 'dulji staž u obrazovanju' },
		{ polje: 'prethodniViskovi', naziv: 'više prethodnih proglašenja viškom' },
		{ polje: 'uzdrzavaniClanovi', naziv: 'više uzdržavanih članova' },
		{ polje: 'dob', naziv: 'starija osoba' },
	],
};

/** Današnja tablica Splitsko-dalmatinske županije (OŠ lista 2025./26.), samo za usporedbu. */
export const SDZ_2025: BodovnaTablica = {
	verzija: 'sdz-2025',
	naziv: 'Županija SDŽ danas',
	stanje: 'usporedba',
	kriteriji: [
		{ kljuc: 'staz_obrazovanje', naziv: 'Staž u obrazovanju', pravilo: { vrsta: 'po_jedinici', polje: 'stazUObrazovanju', bodova: 2, jedinica: 'godina' } },
		{ kljuc: 'staz_izvan', naziv: 'Staž izvan obrazovanja', pravilo: { vrsta: 'po_jedinici', polje: 'stazIzvanObrazovanja', bodova: 1, jedinica: 'godina' } },
		{ kljuc: 'dob', naziv: 'Dob', pravilo: { vrsta: 'po_jedinici', polje: 'dob', bodova: 2, jedinica: 'navršena godina' } },
		{ kljuc: 'uzdrzavani', naziv: 'Uzdržavani član obitelji', pravilo: { vrsta: 'po_jedinici', polje: 'uzdrzavaniClanovi', bodova: 1, jedinica: 'član' } },
		{ kljuc: 'samohrani', naziv: 'Samohrani roditelj / samac', pravilo: { vrsta: 'da_ne', polje: 'samohraniIliSamac', bodova: 2 } },
	],
	kodJednakihBodova: [],
};

/**
 * Nacrt v0 kad se zaključa postaje v1 i više se ne mijenja; po njemu se računa lista
 * ciklusa. Izmjene (npr. izglasane) idu u novi nacrt za idući ciklus.
 */
export const V1: BodovnaTablica = {
	...V0_NACRT,
	verzija: 'v1',
	naziv: 'Prijedlog e-satnice, zaključano',
	stanje: 'zakljucano',
};

export const TABLICE = [V0_NACRT, V1, SDZ_2025] as const;

/** Tablica po oznaci verzije; nepoznata verzija zaustavlja izračun. */
export function tablicaZa(verzija: string): BodovnaTablica {
	const t = TABLICE.find((x) => x.verzija === verzija);
	if (!t) throw new Error(`nepoznata verzija bodovne tablice: ${verzija}`);
	return t;
}
