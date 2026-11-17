import { env } from 'cloudflare:workers';
import { danas, datum, oblik } from './datumi.ts';

export { danas, datum, oblik };

export interface Oglas {
	id: number;
	predmet: string;
	uloga: 'nastava' | 'strucni_suradnik';
	sati_tjedno: number;
	ugovor: 'neodredeno' | 'odredeno';
	trajanje: string | null;
	izvrsitelja: number;
	mjesto_rada: string | null;
	izvorni_opis: string;
	objavljeno: string;
	rok: string;
	rok_izracunat: number;
	izvor_url: string;
	skola: string;
	mjesto: string;
	adresa: string;
	razina: 'osnovna' | 'srednja';
	podrucje: 'priobalje' | 'otoci' | 'zagora';
	zupanija: string;
	web: string | null;
	/** 1 = testni podatak: natječaj izmišljene škole iz prototipa, nastao iz sati u e-satnici. */
	fiktivna: number;
	sati_id: number | null;
	/** Broj prijava kroz e-satnicu; samo za natječaje nastale iz sati u sustavu. */
	prijava: number;
}

export const PODRUCJA = { priobalje: 'Priobalje', otoci: 'Otoci', zagora: 'Zagora' };
export const UGOVORI = { neodredeno: 'Neodređeno', odredeno: 'Određeno' };
export const OPSEZI = { puno: 'Puno radno vrijeme', nepuno: 'Nepuno radno vrijeme', do10: 'Do 10 sati tjedno' };
export const RAZINE = { osnovna: 'Osnovna škola', srednja: 'Srednja škola' };
export const POREDCI = { novo: 'Najnoviji', sati: 'Najviše sati' };

const GDJE = { priobalje: 'u priobalju', otoci: 'na otocima', zagora: 'u Zagori' };

export interface Filteri {
	q: string;
	predmet: string;
	podrucje: keyof typeof PODRUCJA | '';
	ugovor: keyof typeof UGOVORI | '';
	opseg: keyof typeof OPSEZI | '';
	razina: keyof typeof RAZINE | '';
	poredak: keyof typeof POREDCI | '';
}

const UPIT = `SELECT o.*, s.naziv AS skola, s.mjesto, s.adresa, s.razina, s.podrucje, s.zupanija, s.web, s.fiktivna,
		(SELECT count(*) FROM prijave_na_natjecaj p WHERE p.sati_id = o.sati_id) AS prijava
	FROM oglasi o JOIN skole s ON s.id = o.skola_id
	WHERE o.stanje = 'objavljen'`;

export async function ucitajOglase(): Promise<Oglas[]> {
	const { results } = await env.DB.prepare(UPIT).all<Oglas>();
	return results;
}

export async function ucitajOglas(id: number): Promise<Oglas | null> {
	return env.DB.prepare(`${UPIT} AND o.id = ?`).bind(id).first<Oglas>();
}

function izPopisa<T extends object>(popis: T, vrijednost: string | null): keyof T | '' {
	return vrijednost && vrijednost in popis ? (vrijednost as keyof T) : '';
}

export function citajFiltere(p: URLSearchParams): Filteri {
	return {
		q: p.get('q')?.trim().slice(0, 80) ?? '',
		predmet: p.get('predmet')?.slice(0, 80) ?? '',
		podrucje: izPopisa(PODRUCJA, p.get('podrucje')),
		ugovor: izPopisa(UGOVORI, p.get('ugovor')),
		opseg: izPopisa(OPSEZI, p.get('opseg')),
		razina: izPopisa(RAZINE, p.get('razina')),
		poredak: izPopisa(POREDCI, p.get('poredak')),
	};
}

export function imaFiltere(f: Filteri): boolean {
	return Boolean(f.q || f.predmet || f.podrucje || f.ugovor || f.opseg || f.razina);
}

// Bez dijakritika, da „kastel" nađe i „Kaštel".
function normaliziraj(tekst: string): string {
	return tekst.toLowerCase().replace(/đ/g, 'd').normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export function filtriraj(oglasi: Oglas[], f: Filteri): Oglas[] {
	const rijeci = normaliziraj(f.q).split(/\s+/).filter(Boolean);
	return oglasi.filter((o) => {
		if (f.predmet && o.predmet !== f.predmet) return false;
		if (f.podrucje && o.podrucje !== f.podrucje) return false;
		if (f.ugovor && o.ugovor !== f.ugovor) return false;
		if (f.razina && o.razina !== f.razina) return false;
		if (f.opseg === 'puno' && o.sati_tjedno < 40) return false;
		if (f.opseg === 'nepuno' && o.sati_tjedno === 40) return false;
		if (f.opseg === 'do10' && o.sati_tjedno > 10) return false;
		const tekst = normaliziraj(`${o.predmet} ${o.skola} ${o.mjesto} ${o.mjesto_rada ?? ''}`);
		return rijeci.every((r) => tekst.includes(r));
	});
}

export function poredaj(oglasi: Oglas[], poredak: Filteri['poredak']): Oglas[] {
	return [...oglasi].sort((a, b) => {
		if (poredak === 'novo') return b.objavljeno.localeCompare(a.objavljeno) || a.rok.localeCompare(b.rok);
		if (poredak === 'sati') return b.sati_tjedno - a.sati_tjedno || a.rok.localeCompare(b.rok);
		return a.rok.localeCompare(b.rok) || a.predmet.localeCompare(b.predmet, 'hr');
	});
}

export function danaDoRoka(rok: string, sada: string): number {
	return Math.round((Date.parse(rok) - Date.parse(sada)) / 86_400_000);
}

export function opisSati(sati: number): string {
	return sati === 40 ? 'Puno radno vrijeme' : `${sati} od 40 sati`;
}

export function naslovPopisa(broj: number, f: Filteri): string {
	const natjecaji = `${broj} ${oblik(broj, 'otvoren natječaj', 'otvorena natječaja', 'otvorenih natječaja')}`;
	const gdje = f.podrucje ? GDJE[f.podrucje] : 'u Splitsko-dalmatinskoj županiji';
	return f.predmet ? `${f.predmet}: ${natjecaji} ${gdje}` : `${natjecaji} ${gdje}`;
}
