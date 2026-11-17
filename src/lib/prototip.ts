// Fiktivna baza prototipa: učitavanje iz D1 i podaci izvedeni iz nje (bodovi,
// satnica, lista, red prednosti, zamjene). Sav izračun je u čistim modulima
// (bodovanje, raspodjela, zamjene); ovdje se samo povezuje s bazom.
import { env } from 'cloudflare:workers';
import { bodovi, type Dokazano, type MjestoNaListi, type Rezultat as Bodovi } from './bodovanje/bodovi.ts';
import { dokazanoDo } from './bodovanje/dokazi.ts';
import { novaVerzija, prebroji, type IshodGlasanja } from './bodovanje/glasanje.ts';
import { tablicaZa, type BodovnaTablica, type Osoba } from './bodovanje/kriteriji.ts';
import { danas, navrseneGodine } from './datumi.ts';
import { NORME, norma } from './norme.ts';
import {
	oznakaNovogMjesta,
	provjeri,
	raspodijeli,
	redPrednosti,
	type Postavke,
	type Potreba,
	type Provjera,
	type Rezultat,
	type Sudionik,
	type URedu,
	type ZahtjevZaMjesto,
} from './raspodjela/raspodjela.ts';
import { jeStanje, kasnaPrijava, type Stanje } from './sati/stanja.ts';
import { napraviUdaljenost, type Udaljenost } from './udaljenost.ts';
import { mozeNaMjesto, nadiZamjene, type Zahtjev } from './zamjene/zamjene.ts';

export interface Ciklus {
	id: number;
	skolska_godina: string;
	rok_prijave: string;
	privremena_lista: string;
	zakljucavanje: string;
	prigovori_do: string;
	konacna_lista: string;
	verzija_tablice: string;
}

export interface Skola {
	id: number;
	sifra: string;
	naziv: string;
	mjesto: string;
	razina: 'osnovna' | 'srednja';
	podrucje: 'priobalje' | 'otoci' | 'zagora';
}

export type Ugovor = 'neodredeno' | 'odredeno';

export interface Zaposlenje {
	id: number;
	skola: Skola;
	sati: number;
	visak: number;
	razlogViska: string | null;
	ugovor: Ugovor;
	/** Višak koji je ravnatelj prijavio za idući ciklus. */
	prijavljenVisak: { sati: number; razlog: string; prijavljeno: string } | null;
	/** Osoba je ovo mjesto napustila zamjenom u raspodjeli (korak 3). */
	napusteno: boolean;
}

/** Podaci koje je nastavnik prijavio nakon zaključavanja; vrijede od idućeg ciklusa. */
export interface PrijavljeniPodaci {
	osoba: Osoba;
	doKm: number;
	/** Mjesta po redu želje. */
	zelje: string[];
	/** Trenutna satnica po radnom mjestu (id zaposlenja → sati), ako ju je upisao/la. */
	satnica: Record<string, number>;
	bodovi: Bodovi;
	prijavljeno: string;
}

export type Korak = 1 | 2 | 3 | 4;

export interface Dodjela {
	sati: SlobodniSati;
	nastavnik: Nastavnik;
	koliko: number;
	/** 1 višak, 2 nadopuna, 3 zamjena na slobodno mjesto, 4 natječaj. */
	korak: Korak;
	km: number;
	/** Radno mjesto koje osoba zamjenom napušta. */
	napusta: Zaposlenje | null;
}

export interface Nastavnik {
	id: number;
	oznaka: string;
	/** Ime i prezime; u anonimnom načinu samo oznaka. */
	punoIme: string;
	vrsta: 'zaposlen' | 'kandidat';
	predmet: string;
	mjesto: string;
	doKm: number;
	/** Mjesta po redu želje, s kojima je ušao/la u raspodjelu. */
	zelje: string[];
	rodjen: string;
	kvalifikacija: string | null;
	situacija: string | null;
	/** Podaci za bodove, na dan zaključavanja liste. */
	osoba: Osoba;
	/** Kriteriji s dokazom potvrđenim do konačne liste. */
	dokazano: Dokazano;
	/** Bodovi na konačnoj listi: kriterij bez potvrđenog dokaza ne nosi bodove. */
	bodovi: Bodovi;
	/** Mjesto i bodovi na privremenoj listi, kako je objavljena. */
	privremeno: { mjesto: number; bodovi: number } | null;
	norma: number;
	zaposlenja: Zaposlenje[];
	dodjele: Dodjela[];
	/** Sati koje je osoba zadržala ulaskom u raspodjelu. */
	zadrzano: number;
	/** Sati proglašeni viškom. */
	visak: number;
	/** Tekuća satnica: zadržano, bez napuštenog mjesta, i sve što je dobila. */
	satnica: number;
	neplasiranVisak: number;
	/** Zaposlena osoba kojoj sati fale (višak ili nepuna satnica), pa je na listi. */
	naListi: boolean;
	prijavljeniPodaci: PrijavljeniPodaci | null;
}

export interface Prijelaz {
	iz: Stanje | null;
	u: Stanje;
	vrijeme: string;
	tko: 'ravnatelj' | 'povjerenstvo' | 'sustav';
	napomena: string | null;
}

export interface SlobodniSati {
	id: number;
	oznaka: string;
	skola: Skola;
	predmet: string;
	sati: number;
	ugovor: Ugovor;
	trajanje: string | null;
	razlog: string;
	nastalo: string;
	uCiklusu: boolean;
	stanje: Stanje;
	prijelazi: Prijelaz[];
	dodjele: Dodjela[];
	/** Kad je ravnatelj unio sate u sustav; `null` dok nisu prijavljeni. */
	prijavljeno: string | null;
	/** Potreba poznata do roka, a prijavljena nakon njega. */
	kasna: boolean;
	oglas: { id: number; objavljeno: string; rok: string } | null;
	/** Sati koji još nisu nikome dodijeljeni. */
	preostalo: number;
	/** Oznake osoba koje su odbile ponudu ovih sati. */
	odbili: Set<string>;
	/** Oznake osoba prijavljenih na natječaj za ove sate. */
	prijavljeni: Set<string>;
	/** Radno mjesto koje je oslobodila zamjena u raspodjeli; takve sati stvara raspodjela. */
	izZaposlenja: Zaposlenje | null;
}

export interface ZahtjevZamjene {
	nastavnik: Nastavnik;
	zaposlenje: Zaposlenje;
	zeli: string[];
	podneseno: string;
	/** Ostvaren u godišnjoj raspodjeli (korak 3). */
	ostvaren: boolean;
}

export interface Dokaz {
	id: number;
	nastavnik: Nastavnik;
	kriterij: string;
	dokument: string;
	predano: string;
	stanje: 'ceka' | 'potvrden' | 'odbijen';
	odluceno: string | null;
	napomena: string | null;
}

export interface Prigovor {
	id: number;
	nastavnik: Nastavnik;
	naSto: 'bodovi' | 'raspodjela';
	tekst: string;
	podneseno: string;
	stanje: 'zaprimljen' | 'usvojen' | 'odbijen' | 'izvan_roka';
	odluka: string | null;
	odluceno: string | null;
}

export interface PrijedlogKriterija {
	id: number;
	kriterij: string;
	bodova: number;
	obrazlozenje: string;
	otvoreno: string;
	zatvara: string;
	ishod: IshodGlasanja;
	/** Kako je glasala svaka osoba (oznaka → glas). */
	glasovi: Map<string, 'za' | 'protiv'>;
}

export interface Prototip {
	ciklus: Ciklus;
	/** Zaključana tablica ciklusa. */
	tablica: BodovnaTablica;
	skole: Skola[];
	nastavnici: Nastavnik[];
	sati: SlobodniSati[];
	zahtjevi: ZahtjevZamjene[];
	potvrde: { lanac: string; oznaka: string; potvrdeno: string }[];
	dokazi: Dokaz[];
	prigovori: Prigovor[];
	prijedlozi: PrijedlogKriterija[];
	poOznaci: Map<string, Nastavnik>;
	postavke: Postavke;
	udaljenost: Udaljenost;
	anonimno: boolean;
}

interface NastavnikRed {
	id: number;
	oznaka: string;
	ime: string;
	prezime: string;
	vrsta: 'zaposlen' | 'kandidat';
	predmet: string;
	mjesto: string;
	do_km: number;
	staz_obrazovanje: number;
	staz_izvan: number;
	rodjen: string;
	uzdrzavani: number;
	samohrani: number;
	dijete_teskoce: number;
	invaliditet: number;
	prethodni_viskovi: number;
	napredovanje: Osoba['napredovanje'];
	kvalifikacija: string | null;
	situacija: string | null;
	zelje: string | null;
}

/** Javne stranice prikazuju samo oznake osoba (ANONIMNO=1). */
export function anonimno(): boolean {
	return env.ANONIMNO === '1';
}

const popis = (t: string | null | undefined): string[] => (t ? t.split('|').filter(Boolean) : []);

/** Učitava cijelu fiktivnu bazu; `null` ako još nije upisana (npm run db:fiktivno). */
export async function ucitajPrototip(): Promise<Prototip | null> {
	const upit = (sql: string) => env.DB.prepare(sql);
	const [rCiklus, rSkole, rNastavnici, rZaposlenja, rSati, rPrijelazi, rDodjele, rUdaljenosti, rOglasi, rZahtjevi, rPotvrde, rDokazi, rPrigovori, rPromjene, rViskovi, rOdbijene, rPrijave, rSnimke, rPrijedlozi, rGlasovi] =
		await env.DB.batch<Record<string, unknown>>([
			upit('SELECT * FROM ciklusi ORDER BY id DESC LIMIT 1'),
			upit('SELECT id, sifra, naziv, mjesto, razina, podrucje FROM skole WHERE fiktivna = 1 ORDER BY sifra'),
			upit('SELECT * FROM nastavnici ORDER BY oznaka'),
			upit('SELECT * FROM zaposlenja ORDER BY id'),
			upit('SELECT * FROM sati ORDER BY oznaka'),
			upit('SELECT * FROM sati_prijelazi ORDER BY sati_id, id'),
			upit('SELECT * FROM dodjele ORDER BY id'),
			upit('SELECT * FROM udaljenosti'),
			upit('SELECT id, sati_id, objavljeno, rok FROM oglasi WHERE sati_id IS NOT NULL ORDER BY id'),
			upit('SELECT * FROM zamjene_zahtjevi ORDER BY id'),
			upit('SELECT z.lanac, n.oznaka, z.potvrdeno FROM zamjene_potvrde z JOIN nastavnici n ON n.id = z.nastavnik_id'),
			upit('SELECT * FROM dokazi ORDER BY predano DESC, id DESC'),
			upit('SELECT * FROM prigovori ORDER BY podneseno, id'),
			upit('SELECT * FROM promjene_podataka'),
			upit('SELECT * FROM prijave_viska'),
			upit('SELECT o.sati_id, n.oznaka FROM ponude_odbijene o JOIN nastavnici n ON n.id = o.nastavnik_id'),
			upit('SELECT p.sati_id, n.oznaka FROM prijave_na_natjecaj p JOIN nastavnici n ON n.id = p.nastavnik_id'),
			upit('SELECT s.nastavnik_id, s.mjesto, s.bodovi FROM lista_snimke s WHERE s.ciklus_id = (SELECT max(id) FROM ciklusi)'),
			upit('SELECT * FROM prijedlozi_kriterija ORDER BY otvoreno DESC, id DESC'),
			upit('SELECT g.prijedlog_id, n.oznaka, g.glas FROM glasovi g JOIN nastavnici n ON n.id = g.nastavnik_id'),
		]);

	const ciklus = rCiklus.results[0] as unknown as Ciklus | undefined;
	if (!ciklus) return null;
	const tablica = tablicaZa(ciklus.verzija_tablice);
	const anon = anonimno();

	const skole = rSkole.results as unknown as Skola[];
	const skolaPoId = new Map(skole.map((s) => [s.id, s]));

	// Dokazi po osobi; lista ciklusa broji one potvrđene do konačne liste.
	const dokaziPoOsobi = new Map<number, { kriterij: string; stanje: Dokaz['stanje']; odluceno: string | null }[]>();
	for (const r of rDokazi.results as unknown as { nastavnik_id: number; kriterij: string; stanje: Dokaz['stanje']; odluceno: string | null }[]) {
		dokaziPoOsobi.set(r.nastavnik_id, [...(dokaziPoOsobi.get(r.nastavnik_id) ?? []), r]);
	}
	const snimka = new Map((rSnimke.results as unknown as { nastavnik_id: number; mjesto: number; bodovi: number }[]).map((r) => [r.nastavnik_id, { mjesto: r.mjesto, bodovi: r.bodovi }]));

	const nastavnici: Nastavnik[] = (rNastavnici.results as unknown as NastavnikRed[]).map((r) => {
		const osoba: Osoba = {
			stazUObrazovanju: r.staz_obrazovanje,
			stazIzvanObrazovanja: r.staz_izvan,
			dob: navrseneGodine(r.rodjen, ciklus.zakljucavanje),
			uzdrzavaniClanovi: r.uzdrzavani,
			samohraniIliSamac: r.samohrani === 1,
			dijeteSTeskocama: r.dijete_teskoce === 1,
			invaliditet: r.invaliditet === 1,
			prethodniViskovi: r.prethodni_viskovi,
			napredovanje: r.napredovanje,
		};
		const dokazano = dokazanoDo(dokaziPoOsobi.get(r.id) ?? [], ciklus.konacna_lista);
		return {
			id: r.id,
			oznaka: r.oznaka,
			punoIme: anon ? r.oznaka : `${r.ime} ${r.prezime}`,
			vrsta: r.vrsta,
			predmet: r.predmet,
			mjesto: r.mjesto,
			doKm: r.do_km,
			zelje: popis(r.zelje),
			rodjen: r.rodjen,
			kvalifikacija: r.kvalifikacija,
			situacija: r.situacija,
			osoba,
			dokazano,
			bodovi: bodovi(osoba, tablica, dokazano),
			privremeno: snimka.get(r.id) ?? null,
			norma: norma(r.predmet),
			zaposlenja: [],
			dodjele: [],
			zadrzano: 0,
			visak: 0,
			satnica: 0,
			neplasiranVisak: 0,
			naListi: false,
			prijavljeniPodaci: null,
		};
	});
	const nastavnikPoId = new Map(nastavnici.map((n) => [n.id, n]));

	const zaposlenjePoId = new Map<number, Zaposlenje>();
	for (const r of rZaposlenja.results as unknown as { id: number; nastavnik_id: number; skola_id: number; sati: number; visak: number; razlog_viska: string | null; ugovor: Ugovor }[]) {
		const n = nastavnikPoId.get(r.nastavnik_id);
		const skola = skolaPoId.get(r.skola_id);
		if (!n || !skola) continue;
		const z: Zaposlenje = { id: r.id, skola, sati: r.sati, visak: r.visak, razlogViska: r.razlog_viska, ugovor: r.ugovor, prijavljenVisak: null, napusteno: false };
		n.zaposlenja.push(z);
		zaposlenjePoId.set(r.id, z);
	}

	const oglasPoSatima = new Map(
		(rOglasi.results as unknown as { id: number; sati_id: number; objavljeno: string; rok: string }[]).map((o) => [o.sati_id, { id: o.id, objavljeno: o.objavljeno, rok: o.rok }]),
	);
	const sati: SlobodniSati[] = [];
	const satiPoId = new Map<number, SlobodniSati>();
	for (const r of rSati.results as unknown as {
		id: number;
		oznaka: string;
		skola_id: number;
		predmet: string;
		sati: number;
		ugovor: Ugovor;
		trajanje: string | null;
		razlog: string;
		nastalo: string;
		u_ciklusu: number;
		stanje: string;
		iz_zaposlenja: number | null;
	}[]) {
		const skola = skolaPoId.get(r.skola_id);
		if (!skola || !jeStanje(r.stanje)) continue;
		const s: SlobodniSati = {
			id: r.id,
			oznaka: r.oznaka,
			skola,
			predmet: r.predmet,
			sati: r.sati,
			ugovor: r.ugovor,
			trajanje: r.trajanje,
			razlog: r.razlog,
			nastalo: r.nastalo,
			uCiklusu: r.u_ciklusu === 1,
			stanje: r.stanje,
			prijelazi: [],
			dodjele: [],
			prijavljeno: null,
			kasna: false,
			oglas: oglasPoSatima.get(r.id) ?? null,
			preostalo: r.sati,
			odbili: new Set(),
			prijavljeni: new Set(),
			izZaposlenja: r.iz_zaposlenja === null ? null : (zaposlenjePoId.get(r.iz_zaposlenja) ?? null),
		};
		sati.push(s);
		satiPoId.set(r.id, s);
	}
	for (const r of rPrijelazi.results as unknown as { sati_id: number; iz: string | null; u: string; vrijeme: string; tko: Prijelaz['tko']; napomena: string | null }[]) {
		const s = satiPoId.get(r.sati_id);
		if (!s || !jeStanje(r.u) || (r.iz !== null && !jeStanje(r.iz))) continue;
		s.prijelazi.push({ iz: r.iz, u: r.u, vrijeme: r.vrijeme, tko: r.tko, napomena: r.napomena });
	}
	for (const s of sati) {
		// Prva prijava je ona koja se uspoređuje s rokom, i kad sati prođu hitni put.
		s.prijavljeno = s.prijelazi.find((x) => x.u === 'prijavljeni')?.vrijeme ?? null;
		s.kasna = kasnaPrijava(s.nastalo, s.prijavljeno, ciklus.rok_prijave);
	}

	for (const r of rDodjele.results as unknown as { sati_id: number; nastavnik_id: number; sati: number; korak: Korak; km: number; napusta_zaposlenje: number | null }[]) {
		const s = satiPoId.get(r.sati_id);
		const n = nastavnikPoId.get(r.nastavnik_id);
		if (!s || !n) continue;
		const napusta = r.napusta_zaposlenje === null ? null : (zaposlenjePoId.get(r.napusta_zaposlenje) ?? null);
		if (napusta) napusta.napusteno = true;
		const d: Dodjela = { sati: s, nastavnik: n, koliko: r.sati, korak: r.korak, km: r.km, napusta };
		s.dodjele.push(d);
		n.dodjele.push(d);
		s.preostalo -= r.sati;
	}
	for (const r of rOdbijene.results as unknown as { sati_id: number; oznaka: string }[]) satiPoId.get(r.sati_id)?.odbili.add(r.oznaka);
	for (const r of rPrijave.results as unknown as { sati_id: number; oznaka: string }[]) satiPoId.get(r.sati_id)?.prijavljeni.add(r.oznaka);
	for (const r of rViskovi.results as unknown as { zaposlenje_id: number; sati: number; razlog: string; prijavljeno: string }[]) {
		const z = zaposlenjePoId.get(r.zaposlenje_id);
		if (z) z.prijavljenVisak = { sati: r.sati, razlog: r.razlog, prijavljeno: r.prijavljeno };
	}

	const dokazi: Dokaz[] = [];
	for (const r of rDokazi.results as unknown as (Omit<Dokaz, 'nastavnik'> & { nastavnik_id: number })[]) {
		const nastavnik = nastavnikPoId.get(r.nastavnik_id);
		if (nastavnik) dokazi.push({ id: r.id, nastavnik, kriterij: r.kriterij, dokument: r.dokument, predano: r.predano, stanje: r.stanje, odluceno: r.odluceno, napomena: r.napomena });
	}

	for (const r of rPromjene.results as unknown as { nastavnik_id: number; podaci: string; prijavljeno: string }[]) {
		const n = nastavnikPoId.get(r.nastavnik_id);
		if (!n) continue;
		try {
			const { doKm, zelje, satnica, ...osoba } = JSON.parse(r.podaci) as Osoba & { doKm: number; zelje?: string[]; satnica?: Record<string, number> };
			// Dob se ne prijavljuje: računa se iz datuma rođenja na dan zaključavanja.
			const nova = { ...osoba, dob: n.osoba.dob };
			// Idući ciklus broji dokaze potvrđene do danas; oni koji čekaju ne nose bodove.
			const dokazano = dokazanoDo(dokaziPoOsobi.get(n.id) ?? [], danas());
			n.prijavljeniPodaci = {
				osoba: nova,
				doKm,
				zelje: Array.isArray(zelje) ? zelje.map(String) : n.zelje,
				satnica: satnica && typeof satnica === 'object' ? satnica : {},
				bodovi: bodovi(nova, tablica, dokazano),
				prijavljeno: r.prijavljeno,
			};
		} catch {
			// Neispravan zapis se preskače; osoba i dalje ima zaključane podatke.
		}
	}

	for (const n of nastavnici) {
		n.zadrzano = n.zaposlenja.reduce((z, x) => z + x.sati - x.visak, 0);
		n.visak = n.zaposlenja.reduce((z, x) => z + x.visak, 0);
		const napusteno = n.zaposlenja.filter((x) => x.napusteno).reduce((z, x) => z + x.sati - x.visak, 0);
		n.satnica = n.zadrzano - napusteno + n.dodjele.reduce((z, d) => z + d.koliko, 0);
		n.neplasiranVisak = Math.max(0, n.visak - n.dodjele.filter((d) => d.korak === 1).reduce((z, d) => z + d.koliko, 0));
		n.naListi = n.vrsta === 'zaposlen' && (n.visak > 0 || n.zadrzano < n.norma);
	}

	const zahtjevi: ZahtjevZamjene[] = [];
	for (const r of rZahtjevi.results as unknown as { nastavnik_id: number; zaposlenje_id: number; zeli: string; podneseno: string; ostvaren: number }[]) {
		const nastavnik = nastavnikPoId.get(r.nastavnik_id);
		const zaposlenje = zaposlenjePoId.get(r.zaposlenje_id);
		if (nastavnik && zaposlenje) zahtjevi.push({ nastavnik, zaposlenje, zeli: popis(r.zeli), podneseno: r.podneseno, ostvaren: r.ostvaren === 1 });
	}

	const prigovori: Prigovor[] = [];
	for (const r of rPrigovori.results as unknown as (Omit<Prigovor, 'nastavnik' | 'naSto'> & { nastavnik_id: number; na_sto: Prigovor['naSto'] })[]) {
		const nastavnik = nastavnikPoId.get(r.nastavnik_id);
		if (nastavnik) prigovori.push({ id: r.id, nastavnik, naSto: r.na_sto, tekst: r.tekst, podneseno: r.podneseno, stanje: r.stanje, odluka: r.odluka, odluceno: r.odluceno });
	}

	const sviGlasovi = rGlasovi.results as unknown as { prijedlog_id: number; oznaka: string; glas: 'za' | 'protiv' }[];
	const redoviPrijedloga = rPrijedlozi.results as unknown as Omit<PrijedlogKriterija, 'ishod' | 'glasovi'>[];
	const ishodi = prebroji(
		redoviPrijedloga.map((r) => ({ id: r.id, kriterij: r.kriterij, bodova: r.bodova, zatvara: r.zatvara })),
		sviGlasovi.map((g) => ({ prijedlog: g.prijedlog_id, glas: g.glas })),
		danas(),
	);
	const prijedlozi: PrijedlogKriterija[] = redoviPrijedloga.map((r, i) => ({
		...r,
		ishod: ishodi[i],
		glasovi: new Map(sviGlasovi.filter((g) => g.prijedlog_id === r.id).map((g) => [g.oznaka, g.glas])),
	}));

	const udaljenost = napraviUdaljenost(
		(rUdaljenosti.results as unknown as { mjesto_a: string; mjesto_b: string; km: number }[]).map((r) => ({ od: r.mjesto_a, do: r.mjesto_b, km: r.km })),
	);

	return {
		ciklus,
		tablica,
		skole,
		nastavnici,
		sati,
		zahtjevi,
		potvrde: rPotvrde.results as unknown as Prototip['potvrde'],
		dokazi,
		prigovori,
		prijedlozi,
		poOznaci: new Map(nastavnici.map((n) => [n.oznaka, n])),
		postavke: { tablica, udaljenost },
		udaljenost,
		anonimno: anon,
	};
}

/** Osoba kako ulazi u raspodjelu: sa satnicom prije nje. */
export function sudionik(n: Nastavnik): Sudionik {
	return {
		id: n.oznaka,
		osoba: n.osoba,
		dokazano: n.dokazano,
		predmet: n.predmet,
		norma: n.norma,
		mjesto: n.mjesto,
		doKm: n.doKm,
		zelje: n.zelje,
		zadrzanoSati: n.zadrzano,
		visakSati: n.visak,
		skole: n.zaposlenja.map((z) => z.skola.sifra),
	};
}

function potreba(s: SlobodniSati): Potreba {
	return { id: s.oznaka, skola: s.skola.sifra, mjesto: s.skola.mjesto, predmet: s.predmet, sati: s.sati, ugovor: s.ugovor };
}

/** Zahtjevi za zamjenu podneseni do zaključavanja: ulaze u godišnju raspodjelu (korak 3). */
export function zahtjeviUCiklusu(p: Prototip): ZahtjevZamjene[] {
	return p.zahtjevi.filter((z) => z.podneseno <= p.ciklus.zakljucavanje);
}

export interface Izracun {
	sudionici: Sudionik[];
	potrebe: Potreba[];
	rezultat: Rezultat;
	provjere: Provjera[];
	mjesto: Map<string, MjestoNaListi>;
	/** Oznaka sati za svaku potrebu iz izračuna; mjesta oslobođena zamjenom imaju svoje sati u bazi. */
	satiZa: (potreba: string) => string;
}

/** Ponavlja godišnju raspodjelu iz ulaza u bazi i provjerava izlaz. */
export function izracunaj(p: Prototip, prednostUnutarSkole = false): Izracun {
	const sudionici = p.nastavnici.filter((n) => n.naListi).map(sudionik);
	// Mjesta koja oslobodi zamjena stvara sama raspodjela, pa nisu ulaz.
	const potrebe = p.sati.filter((s) => s.uCiklusu && !s.izZaposlenja).map(potreba);
	const zamjene: ZahtjevZaMjesto[] = zahtjeviUCiklusu(p).map((z) => ({
		osoba: z.nastavnik.oznaka,
		zaposlenje: String(z.zaposlenje.id),
		skola: z.zaposlenje.skola.sifra,
		mjesto: z.zaposlenje.skola.mjesto,
		predmet: z.nastavnik.predmet,
		sati: z.zaposlenje.sati,
		ugovor: z.zaposlenje.ugovor,
		zeli: z.zeli,
	}));
	const postavke = { ...p.postavke, prednostUnutarSkole, zamjene };
	const rezultat = raspodijeli(sudionici, potrebe, postavke);
	const novaMjesta = new Map(p.sati.filter((s) => s.izZaposlenja).map((s) => [oznakaNovogMjesta(String(s.izZaposlenja!.id)), s.oznaka]));
	return {
		sudionici,
		potrebe,
		rezultat,
		provjere: provjeri(sudionici, potrebe, postavke, rezultat),
		mjesto: new Map(rezultat.lista.map((m) => [m.id, m])),
		satiZa: (x) => novaMjesta.get(x) ?? x,
	};
}

/** Je li objavljena raspodjela (tablica `dodjele`) ista kao ponovljeni izračun. */
export function objavljenoJeIsto(p: Prototip, iz: Izracun): boolean {
	const kljuc = (sati: string, osoba: string, koliko: number, korak: number) => `${sati}|${osoba}|${koliko}|${korak}`;
	const objavljeno = p.sati
		.filter((s) => s.uCiklusu)
		.flatMap((s) => s.dodjele.filter((d) => d.korak !== 4).map((d) => kljuc(s.oznaka, d.nastavnik.oznaka, d.koliko, d.korak)))
		.sort();
	const izracunato = iz.rezultat.dodjele.map((d) => kljuc(iz.satiZa(d.potreba), d.osoba, d.sati, d.korak)).sort();
	return objavljeno.length === izracunato.length && objavljeno.every((x, i) => x === izracunato[i]);
}

/**
 * Tko danas ima prednost za ove sate, s tekućom satnicom svake osobe. Tko je ponudu
 * odbio, više nije u redu; kad su svi sati dodijeljeni, reda nema.
 */
export function redZaSate(p: Prototip, s: SlobodniSati): URedu[] {
	if (s.preostalo <= 0) return [];
	return redPrednosti(
		potreba(s),
		p.nastavnici
			.filter((n) => !s.odbili.has(n.oznaka))
			.map((n) => ({
				s: { ...sudionik(n), skole: n.zaposlenja.filter((z) => !z.napusteno).map((z) => z.skola.sifra) },
				sati: n.satnica,
				neplasiranVisak: n.neplasiranVisak,
				izvana: n.vrsta === 'kandidat' && n.satnica === 0,
			})),
		p.postavke,
	);
}

/** Dio reda koji čine ljudi već u sustavu; njima se sati nude prije natječaja. */
export function redUSustavu(p: Prototip, s: SlobodniSati): URedu[] {
	return redZaSate(p, s).filter((u) => u.skupina !== 4);
}

/** Red za natječaj: samo prijavljeni, po bodovima. */
export function redPrijavljenih(p: Prototip, s: SlobodniSati): URedu[] {
	return redZaSate(p, s).filter((u) => s.prijavljeni.has(u.osoba));
}

/** Predmeti koji se pojavljuju u prototipu, za izbornike u obrascima. */
export function predmeti(p: Prototip): string[] {
	return [...new Set([...Object.keys(NORME), ...p.nastavnici.map((n) => n.predmet), ...p.sati.map((s) => s.predmet)])].sort((a, b) => a.localeCompare(b, 'hr'));
}

/** Mjesta u kojima prototip ima škole. */
export function mjesta(p: Prototip): string[] {
	return [...new Set(p.skole.map((s) => s.mjesto))].sort((a, b) => a.localeCompare(b, 'hr'));
}

export const SKUPINE: Record<URedu['skupina'], string> = {
	1: 'Nezbrinuti višak',
	2: 'Nepuna satnica',
	4: 'Kandidat izvana',
};

export const KORACI: Record<Korak, string> = {
	1: 'Višak',
	2: 'Nadopuna',
	3: 'Zamjena',
	4: 'Natječaj',
};

export interface NadeniLanac {
	kljuc: string;
	clanovi: ZahtjevZamjene[];
	/** Oznake osoba koje su potvrdile. */
	potvrdili: Set<string>;
	/** Zamjena vrijedi tek kad svi u lancu potvrde. */
	vrijedi: boolean;
	upozorenja: string[];
}

export interface PregledZamjena {
	lanci: NadeniLanac[];
	bez: { zahtjev: ZahtjevZamjene; razlog: string }[];
	/** Zahtjevi ostvareni u godišnjoj raspodjeli, prelaskom na slobodno mjesto. */
	ostvareni: ZahtjevZamjene[];
}

export function zamjene(p: Prototip): PregledZamjena {
	const otvoreni = p.zahtjevi.filter((z) => !z.ostvaren);
	const ulaz: Zahtjev[] = otvoreni.map((z) => ({
		id: z.nastavnik.oznaka,
		predmet: z.nastavnik.predmet,
		sati: z.zaposlenje.sati,
		skola: z.zaposlenje.skola.sifra,
		mjesto: z.zaposlenje.skola.mjesto,
		zeli: z.zeli,
	}));
	const poOznaci = new Map(otvoreni.map((z) => [z.nastavnik.oznaka, z]));
	const ulazPoOznaci = new Map(ulaz.map((z) => [z.id, z]));
	const nadeno = nadiZamjene(ulaz);

	const lanci = nadeno.lanci.map((l): NadeniLanac => {
		const kljuc = l.clanovi.join('>');
		const clanovi = l.clanovi.map((c) => poOznaci.get(c)!);
		const potvrdili = new Set(p.potvrde.filter((x) => x.lanac === kljuc).map((x) => x.oznaka));
		const upozorenja: string[] = [];
		for (const c of clanovi) {
			// Otvoreno pitanje iz sekcije „Zamjene": kako prepoznati satnicu koja nestaje.
			if (c.zaposlenje.ugovor === 'odredeno') upozorenja.push(`${c.nastavnik.punoIme} nudi mjesto na određeno vrijeme: tko dođe na njega, ostaje bez posla kad ugovor istekne.`);
			if (c.zaposlenje.visak > 0) upozorenja.push(`${c.nastavnik.punoIme} nudi mjesto čiji su sati proglašeni viškom.`);
		}
		return { kljuc, clanovi, potvrdili, vrijedi: clanovi.every((c) => potvrdili.has(c.nastavnik.oznaka)), upozorenja };
	});

	const bez = nadeno.bezZamjene.map((oznaka) => {
		const zahtjev = poOznaci.get(oznaka)!;
		const moj = ulazPoOznaci.get(oznaka)!;
		const mogu = ulaz.filter((drugi) => mozeNaMjesto(moj, drugi));
		const istiPredmet = ulaz.filter((drugi) => drugi.id !== moj.id && drugi.predmet === moj.predmet && moj.zeli.includes(drugi.mjesto));
		const razlog =
			mogu.length > 0
				? `Mjesto u željenom mjestu postoji, ali osoba koja ga nudi ne želi u ${moj.mjesto}.`
				: istiPredmet.length > 0
					? 'U željenom mjestu isti predmet nudi samo osoba s drugačijom satnicom.'
					: 'Nitko u željenim mjestima ne nudi mjesto za isti predmet.';
		return { zahtjev, razlog };
	});

	return { lanci, bez, ostvareni: p.zahtjevi.filter((z) => z.ostvaren) };
}

/**
 * Dokaz uz kriterij za ovaj ciklus: najnoviji predan do isteka roka za prigovore.
 * Kasniji dokazi vrijede za idući ciklus.
 */
export function dokazZa(p: Prototip, n: Nastavnik, kriterij: string): Dokaz | undefined {
	return p.dokazi.find((d) => d.nastavnik === n && d.kriterij === kriterij && d.predano <= p.ciklus.prigovori_do);
}

/** Dokazi koje je osoba predala nakon ciklusa; vrijede za idući. */
export function dokaziZaIduci(p: Prototip, n: Nastavnik): Dokaz[] {
	return p.dokazi.filter((d) => d.nastavnik === n && d.predano > p.ciklus.prigovori_do);
}

/** Tablica za idući ciklus: zaključana, s izmjenama koje su izglasane. */
export function iducaTablica(p: Prototip): BodovnaTablica {
	const prihvaceni = p.prijedlozi.filter((x) => x.ishod.zatvoreno && x.ishod.prolazi).sort((a, b) => a.id - b.id);
	const broj = Number(p.tablica.verzija.replace(/\D/g, '')) || 0;
	return novaVerzija(p.tablica, prihvaceni, `v${broj + 1}-nacrt`);
}

export const RAZLOZI: Record<string, string> = {
	nema_sati_predmeta: 'U raspodjeli nije bilo slobodnih sati tog predmeta.',
	predaleko: 'Slobodnih sati predmeta ima, ali nijedni nisu u dosegu cestom.',
	podijeljeno_prije: 'Sate u dosegu dobili su ljudi s više bodova ili iz ranijeg koraka.',
};
