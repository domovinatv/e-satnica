// Izračun bodova i poretka. Čiste funkcije bez I/O: isti ulaz uvijek daje isti izlaz,
// pa svatko može ponoviti izračun i provjeriti svoje mjesto na listi.

import type { BodovnaTablica, Kriterij, Osoba } from './kriteriji.ts';

export interface Stavka {
	kljuc: string;
	naziv: string;
	bodova: number;
	/** Bodovi koje bi kriterij nosio, ali nema potvrđenog dokaza; zato se ne broje. */
	bezDokaza?: number;
}

/** Ima li osoba potvrđen dokaz za kriterij. Bez ove funkcije svi se kriteriji broje. */
export type Dokazano = (kljuc: string) => boolean;

export interface Rezultat {
	verzija: string;
	ukupno: number;
	stavke: Stavka[];
}

function cijeli(n: number, polje: string): number {
	if (!Number.isFinite(n) || n < 0) throw new RangeError(`${polje}: očekujem broj ≥ 0, dobio ${n}`);
	return Math.floor(n);
}

function bodoviKriterija(k: Kriterij, o: Osoba): number {
	const p = k.pravilo;
	switch (p.vrsta) {
		case 'po_jedinici':
			return cijeli(o[p.polje], p.polje) * p.bodova;
		case 'da_ne':
			return o[p.polje] ? p.bodova : 0;
		case 'napredovanje':
			return o.napredovanje === 'savjetnik' ? p.savjetnik : o.napredovanje === 'mentor' ? p.mentor : 0;
	}
}

export function bodovi(o: Osoba, t: BodovnaTablica, dokazano?: Dokazano): Rezultat {
	const stavke = t.kriteriji.map((k): Stavka => {
		const b = bodoviKriterija(k, o);
		if (b > 0 && dokazano && !k.bezDokaza && !dokazano(k.kljuc)) return { kljuc: k.kljuc, naziv: k.naziv, bodova: 0, bezDokaza: b };
		return { kljuc: k.kljuc, naziv: k.naziv, bodova: b };
	});
	return { verzija: t.verzija, ukupno: stavke.reduce((s, x) => s + x.bodova, 0), stavke };
}

export interface Kandidat {
	/** Stabilna oznaka osobe, npr. interni ID. Služi samo kao zadnja, deterministička razlika. */
	id: string;
	osoba: Osoba;
	/** Potvrđeni dokazi; bez njih se kriteriji koji traže dokaz ne broje. */
	dokazano?: Dokazano;
}

export interface MjestoNaListi extends Kandidat {
	mjesto: number;
	rezultat: Rezultat;
	/** Izjednačen sa susjedom po bodovima i svim pravilima prednosti; poredak odlučio samo `id`. */
	zaRucnuProvjeru: boolean;
}

/**
 * Poredak po bodovima, pa po pravilima `kodJednakihBodova`, pa po `id`.
 * Zadnji korak (id) nije pravilo pravednosti nego jamstvo determinizma; dok pravnica
 * ne odluči (ždrijeb? datum prijave?), takvi slučajevi se označavaju za ručnu provjeru.
 */
export function poredak(kandidati: Kandidat[], t: BodovnaTablica): MjestoNaListi[] {
	type S = Kandidat & { rezultat: Rezultat };
	const prema = (a: S, b: S): number => {
		if (b.rezultat.ukupno !== a.rezultat.ukupno) return b.rezultat.ukupno - a.rezultat.ukupno;
		for (const p of t.kodJednakihBodova) {
			const r = cijeli(b.osoba[p.polje], p.polje) - cijeli(a.osoba[p.polje], p.polje);
			if (r !== 0) return r;
		}
		return 0;
	};
	const s: S[] = kandidati.map((k) => ({ ...k, rezultat: bodovi(k.osoba, t, k.dokazano) }));
	s.sort((a, b) => prema(a, b) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
	return s.map((k, i) => ({
		...k,
		mjesto: i + 1,
		zaRucnuProvjeru: (i > 0 && prema(s[i - 1], k) === 0) || (i < s.length - 1 && prema(k, s[i + 1]) === 0),
	}));
}

/** Tekstualni opis pravila, za prikaz tablice na stranici. */
export function opisPravila(k: Kriterij): string {
	const p = k.pravilo;
	switch (p.vrsta) {
		case 'po_jedinici':
			return `${p.bodova} / ${p.jedinica}`;
		case 'da_ne':
			return String(p.bodova);
		case 'napredovanje':
			return `mentor ${p.mentor}, savjetnik ${p.savjetnik}`;
	}
}
