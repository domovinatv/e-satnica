// Izračun raspodjele slobodnih sati, prema sekciji „Proces i rokovi".
// Čiste funkcije bez I/O: isti ulaz uvijek daje isti izlaz, bez obzira na redoslijed
// kojim su podaci zadani, pa svatko može ponoviti izračun i provjeriti svaku odluku.
//
// Redoslijed: korak 1 zbrinjava tehnološki višak, korak 2 nadopunjuje nepunu
// satnicu, korak 3 su zamjene radnih mjesta, a što ostane ide na javni natječaj
// (korak 4). Na svakom koraku ide se po bodovima: osoba s više bodova bira prva i
// uzima koliko joj sati fali, iz potreba za svoj predmet do kojih može doći cestom,
// redom svojih želja. Zato nitko s manje bodova ne može dobiti sate koje je netko
// ispred njega mogao i htio uzeti. Kad sve škole ljude rangiraju po istim bodovima,
// to je stabilno sparivanje: nijedna osoba i škola ne bi radije bile zajedno.
//
// Korak 3: sati koji su ostali nakon koraka 2 su slobodno radno mjesto. Tko traži
// zamjenu i želi u to mjesto, s istim predmetom i istom satnicom, prelazi na njega, a
// njegovo dosadašnje mjesto postaje novi slobodni sati. Takvo mjesto prvo se nudi
// koracima 1 i 2 (ljudima već u sustavu), pa tek onda ide na natječaj. Zamjene u
// krugu, bez slobodnog mjesta, ne troše slobodne sate i računaju se u src/lib/zamjene.

import { poredak, type Dokazano, type MjestoNaListi } from '../bodovanje/bodovi.ts';
import type { BodovnaTablica, Osoba } from '../bodovanje/kriteriji.ts';
import type { Udaljenost } from '../udaljenost.ts';

/** Do ove udaljenosti cestom nastavnik mora prihvatiti posao; iznad toga ne mora. */
export const OBVEZNO_KM = 50;

export interface Sudionik {
	/** Stabilna oznaka osobe. */
	id: string;
	/** Podaci za bodove. */
	osoba: Osoba;
	/** Potvrđeni dokazi za kriterije; bez njih se svi kriteriji broje. */
	dokazano?: Dokazano;
	predmet: string;
	/** Puna tjedna norma nastave za taj predmet. */
	norma: number;
	/** Mjesto stanovanja; od njega se računa udaljenost do škole. */
	mjesto: string;
	/** Koliko je daleko osoba spremna ići. Manje od OBVEZNO_KM se ne uvažava. */
	doKm: number;
	/** Mjesta u kojima bi osoba radila, po redu želje. Ostala u dosegu dolaze nakon njih. */
	zelje?: string[];
	/** Sati nastave koje osoba zadržava. */
	zadrzanoSati: number;
	/** Sati nastave koje je izgubila kao tehnološki višak. */
	visakSati: number;
	/** Škole u kojima već radi. */
	skole: string[];
}

export interface Potreba {
	id: string;
	skola: string;
	/** Mjesto škole. */
	mjesto: string;
	predmet: string;
	/** Slobodni sati nastave tjedno. */
	sati: number;
	ugovor: 'neodredeno' | 'odredeno';
}

/** Zahtjev za zamjenu: osoba nudi svoje radno mjesto i navodi kamo bi išla. */
export interface ZahtjevZaMjesto {
	osoba: string;
	/** Oznaka radnog mjesta koje osoba napušta. */
	zaposlenje: string;
	skola: string;
	mjesto: string;
	predmet: string;
	sati: number;
	ugovor: 'neodredeno' | 'odredeno';
	/** Mjesta po redu želje. */
	zeli: string[];
}

export interface Postavke {
	tablica: BodovnaTablica;
	udaljenost: Udaljenost;
	/**
	 * Otvoreno pitanje 17: ako je uključeno, sate u koraku 2 prvo dobivaju ljudi koji
	 * već rade u toj školi, a tek onda županijska lista. Zadano je isključeno.
	 */
	prednostUnutarSkole?: boolean;
	/** Zahtjevi za zamjenu, za korak 3. */
	zamjene?: ZahtjevZaMjesto[];
}

export interface Dodjela {
	potreba: string;
	osoba: string;
	sati: number;
	korak: 1 | 2 | 3;
	/** Kilometri cestom od mjesta stanovanja do škole; kod zamjene 0, jer se osoba seli. */
	km: number;
	/** Dodijeljeno po prednosti unutar škole (samo uz `prednostUnutarSkole`). */
	unutarSkole: boolean;
	/** Kod zamjene (korak 3): radno mjesto koje osoba napušta. */
	napusta?: string;
}

export type Razlog =
	/** U županiji nema slobodnih sati tog predmeta. */
	| 'nema_sati_predmeta'
	/** Sati predmeta ima, ali nijedni nisu u dosegu cestom. */
	| 'predaleko'
	/** Sati u dosegu je bilo, ali su ih dobili ljudi s više bodova ili iz ranijeg koraka. */
	| 'podijeljeno_prije';

export interface BezSati {
	osoba: string;
	korak: 1 | 2;
	/** Koliko sati još fali: neplasirani višak (korak 1) ili do pune norme (korak 2). */
	nedostaje: number;
	razlog: Razlog;
}

export interface Rezultat {
	verzija: string;
	prednostUnutarSkole: boolean;
	lista: MjestoNaListi[];
	dodjele: Dodjela[];
	/** Radna mjesta koja su zamjenom (korak 3) postala slobodna. */
	novaMjesta: Potreba[];
	/** Sati koje nitko s liste nije mogao uzeti; idu na javni natječaj. */
	ostatak: { potreba: string; sati: number }[];
	bezSati: BezSati[];
	/** Satnica svake osobe s liste prije i poslije raspodjele. */
	satnica: Record<string, { prije: number; poslije: number; norma: number }>;
}

function cijeli(n: number, sto: string): number {
	if (!Number.isInteger(n) || n < 0) throw new RangeError(`${sto}: očekujem cijeli broj ≥ 0, dobio ${n}`);
	return n;
}

/** Neispravan podatak zaustavlja izračun umjesto da tiho da krivu raspodjelu. */
function provjeriUlaz(sudionici: Sudionik[], potrebe: Potreba[], zamjene: ZahtjevZaMjesto[]): void {
	const videni = new Set<string>();
	for (const s of sudionici) {
		if (videni.has(s.id)) throw new Error(`osoba ${s.id} je navedena dvaput`);
		videni.add(s.id);
		cijeli(s.zadrzanoSati, `${s.id}: zadržani sati`);
		cijeli(s.visakSati, `${s.id}: sati viška`);
		if (cijeli(s.norma, `${s.id}: norma`) === 0) throw new RangeError(`${s.id}: norma mora biti veća od 0`);
		if (!Number.isFinite(s.doKm) || s.doKm < 0) throw new RangeError(`${s.id}: udaljenost mora biti broj ≥ 0`);
		if (s.zadrzanoSati + s.visakSati > s.norma) throw new RangeError(`${s.id}: zadržani sati i višak zajedno prelaze normu`);
	}
	const videne = new Set<string>();
	for (const x of potrebe) {
		if (videne.has(x.id)) throw new Error(`potreba ${x.id} je navedena dvaput`);
		videne.add(x.id);
		if (cijeli(x.sati, `${x.id}: sati`) === 0) throw new RangeError(`${x.id}: potreba mora imati barem 1 sat`);
	}
	const traze = new Set<string>();
	for (const z of zamjene) {
		if (traze.has(z.osoba)) throw new Error(`osoba ${z.osoba} ima više od jednog zahtjeva za zamjenu`);
		traze.add(z.osoba);
		if (cijeli(z.sati, `${z.osoba}: sati radnog mjesta`) === 0) throw new RangeError(`${z.osoba}: radno mjesto mora imati barem 1 sat`);
	}
}

export function doseg(s: Pick<Sudionik, 'doKm'>): number {
	return Math.max(OBVEZNO_KM, s.doKm);
}

const poOznaci = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/** Oznaka slobodnog mjesta koje nastaje kad osoba zamjenom napusti svoje radno mjesto. */
export const oznakaNovogMjesta = (zaposlenje: string): string => `M-${zaposlenje}`;

interface UDosegu {
	potreba: Potreba;
	km: number;
}

/**
 * Potrebe za predmet osobe do kojih može doći cestom, redom kojim ih bira: prvo mjesta
 * iz njezinih želja tim redom, zatim na neodređeno, bliže i s više sati.
 */
export function potrebeUDosegu(s: Sudionik, potrebe: Potreba[], udaljenost: Udaljenost): UDosegu[] {
	const zelja = (mjesto: string): number => {
		const i = s.zelje?.indexOf(mjesto) ?? -1;
		return i < 0 ? Number.MAX_SAFE_INTEGER : i;
	};
	const u: UDosegu[] = [];
	for (const potreba of potrebe) {
		if (potreba.predmet !== s.predmet) continue;
		const km = udaljenost(s.mjesto, potreba.mjesto);
		if (km !== null && km <= doseg(s)) u.push({ potreba, km });
	}
	return u.sort(
		(a, b) =>
			zelja(a.potreba.mjesto) - zelja(b.potreba.mjesto) ||
			Number(a.potreba.ugovor === 'odredeno') - Number(b.potreba.ugovor === 'odredeno') ||
			a.km - b.km ||
			b.potreba.sati - a.potreba.sati ||
			poOznaci(a.potreba.id, b.potreba.id),
	);
}

export function raspodijeli(sudionici: Sudionik[], potrebe: Potreba[], p: Postavke): Rezultat {
	const zamjene = p.zamjene ?? [];
	provjeriUlaz(sudionici, potrebe, zamjene);
	const unutarSkole = p.prednostUnutarSkole === true;
	const lista = poredak(
		sudionici.map((s) => ({ id: s.id, osoba: s.osoba, dokazano: s.dokazano })),
		p.tablica,
	);
	const poId = new Map(sudionici.map((s) => [s.id, s]));
	const poRedu = lista.map((m) => poId.get(m.id)!);
	const mjestoNaListi = new Map(lista.map((m) => [m.id, m.mjesto]));

	const preostalo = new Map(potrebe.map((x) => [x.id, x.sati]));
	const satnica = new Map(sudionici.map((s) => [s.id, s.zadrzanoSati]));
	const dodjele: Dodjela[] = [];
	const novaMjesta: Potreba[] = [];
	// Svoje napušteno mjesto osoba ne može ponovno dobiti.
	const napustio = new Map(zamjene.map((z) => [z.osoba, oznakaNovogMjesta(z.zaposlenje)]));

	// Osoba uzima iz potreba u svom dosegu, redom kojim ih bira, dok ne skupi `treba` sati.
	const uzmi = (dosezi: Map<string, UDosegu[]>, s: Sudionik, treba: number, korak: 1 | 2, samoSvojaSkola: boolean): number => {
		for (const { potreba, km } of dosezi.get(s.id)!) {
			if (treba === 0) break;
			if (samoSvojaSkola && !s.skole.includes(potreba.skola)) continue;
			if (napustio.get(s.id) === potreba.id) continue;
			const ima = preostalo.get(potreba.id)!;
			if (ima === 0) continue;
			const sati = Math.min(treba, ima);
			preostalo.set(potreba.id, ima - sati);
			satnica.set(s.id, satnica.get(s.id)! + sati);
			dodjele.push({ potreba: potreba.id, osoba: s.id, sati, korak, km, unutarSkole: samoSvojaSkola });
			treba -= sati;
		}
		return treba;
	};

	const neplasirano = new Map<string, number>();
	const koraci1i2 = (dosezi: Map<string, UDosegu[]>, prviPut: boolean) => {
		// Korak 1: tehnološki višak mora negdje otići.
		for (const s of poRedu) {
			const treba = prviPut ? s.visakSati : (neplasirano.get(s.id) ?? 0);
			if (treba === 0) continue;
			const ostalo = uzmi(dosezi, s, treba, 1, false);
			if (ostalo > 0) neplasirano.set(s.id, ostalo);
			else neplasirano.delete(s.id);
		}
		// Korak 2: nadopuna nepune satnice ljudi koji već rade u sustavu.
		if (unutarSkole) {
			for (const s of poRedu) uzmi(dosezi, s, s.norma - satnica.get(s.id)!, 2, true);
		}
		for (const s of poRedu) uzmi(dosezi, s, s.norma - satnica.get(s.id)!, 2, false);
	};
	koraci1i2(new Map(sudionici.map((s) => [s.id, potrebeUDosegu(s, potrebe, p.udaljenost)])), true);

	// Korak 3: zamjene na mjesta koja su ostala slobodna, po bodovima pa po oznaci.
	const redZahtjeva = [...zamjene].sort(
		(a, b) => (mjestoNaListi.get(a.osoba) ?? Infinity) - (mjestoNaListi.get(b.osoba) ?? Infinity) || poOznaci(a.osoba, b.osoba),
	);
	const presli = new Set<string>();
	for (let promjena = true; promjena; ) {
		promjena = false;
		for (const z of redZahtjeva) {
			if (presli.has(z.osoba)) continue;
			const slobodna = [...potrebe, ...novaMjesta].sort((a, b) => poOznaci(a.id, b.id));
			let cilj: Potreba | undefined;
			for (const mjesto of z.zeli) {
				cilj = slobodna.find(
					(x) => x.mjesto === mjesto && x.mjesto !== z.mjesto && x.skola !== z.skola && x.predmet === z.predmet && preostalo.get(x.id) === z.sati,
				);
				if (cilj) break;
			}
			if (!cilj) continue;
			preostalo.set(cilj.id, 0);
			dodjele.push({ potreba: cilj.id, osoba: z.osoba, sati: z.sati, korak: 3, km: 0, unutarSkole: false, napusta: z.zaposlenje });
			const novo: Potreba = { id: oznakaNovogMjesta(z.zaposlenje), skola: z.skola, mjesto: z.mjesto, predmet: z.predmet, sati: z.sati, ugovor: z.ugovor };
			novaMjesta.push(novo);
			preostalo.set(novo.id, novo.sati);
			presli.add(z.osoba);
			promjena = true;
		}
	}
	// Napuštena mjesta prvo dobivaju ljudi već u sustavu, kao u koracima 1 i 2.
	if (novaMjesta.length > 0) {
		koraci1i2(new Map(sudionici.map((s) => [s.id, potrebeUDosegu(s, novaMjesta, p.udaljenost)])), false);
	}

	const sve = [...potrebe, ...novaMjesta];
	const imaPredmeta = new Set(sve.map((x) => x.predmet));
	const uDosegu = (s: Sudionik) => potrebeUDosegu(s, sve, p.udaljenost).some((u) => napustio.get(s.id) !== u.potreba.id);
	const razlog = (s: Sudionik): Razlog => (!imaPredmeta.has(s.predmet) ? 'nema_sati_predmeta' : !uDosegu(s) ? 'predaleko' : 'podijeljeno_prije');

	const bezSati: BezSati[] = [];
	for (const s of poRedu) {
		const visak = neplasirano.get(s.id);
		if (visak !== undefined) bezSati.push({ osoba: s.id, korak: 1, nedostaje: visak, razlog: razlog(s) });
	}
	for (const s of poRedu) {
		const fali = s.norma - satnica.get(s.id)!;
		if (fali > 0 && !neplasirano.has(s.id)) bezSati.push({ osoba: s.id, korak: 2, nedostaje: fali, razlog: razlog(s) });
	}

	return {
		verzija: p.tablica.verzija,
		prednostUnutarSkole: unutarSkole,
		lista,
		dodjele,
		novaMjesta,
		ostatak: sve
			.filter((x) => preostalo.get(x.id)! > 0)
			.map((x) => ({ potreba: x.id, sati: preostalo.get(x.id)! }))
			.sort((a, b) => poOznaci(a.potreba, b.potreba)),
		bezSati,
		satnica: Object.fromEntries(
			sudionici.map((s) => [s.id, { prije: s.zadrzanoSati, poslije: satnica.get(s.id)!, norma: s.norma }]),
		),
	};
}

export interface Provjera {
	naziv: string;
	ok: boolean;
	/** Što točno ne valja; prazno kad je provjera prošla. */
	detalj: string[];
}

/**
 * Provjera izlaza prije objave. Ne vjeruje izračunu, nego iz ulaza i rezultata
 * ponovno provjerava svako pravilo. Portugal je 2025. nastavnike smjestio u škole
 * za koje se nisu prijavili; ovakva provjera to hvata prije objave.
 */
export function provjeri(sudionici: Sudionik[], potrebe: Potreba[], p: Postavke, r: Rezultat): Provjera[] {
	const osobe = new Map(sudionici.map((s) => [s.id, s]));
	const zahtjevi = new Map((p.zamjene ?? []).map((z) => [z.osoba, z]));
	const sve = [...potrebe, ...r.novaMjesta];
	const poPotrebi = new Map(sve.map((x) => [x.id, x]));
	const mjesto = new Map(r.lista.map((m) => [m.id, m.mjesto]));
	const ostatak = new Map(r.ostatak.map((o) => [o.potreba, o.sati]));
	const napustio = new Map((p.zamjene ?? []).map((z) => [z.osoba, oznakaNovogMjesta(z.zaposlenje)]));

	const zbroj = new Map<string, number>();
	const dobiveno = new Map<string, number>();
	const dobivenoKorak1 = new Map<string, number>();
	const nepoznato: string[] = [];
	const valjane: Dodjela[] = [];
	for (const d of r.dodjele) {
		const poznata = d.korak === 3 ? zahtjevi.has(d.osoba) : osobe.has(d.osoba);
		if (!poznata || !poPotrebi.has(d.potreba)) {
			nepoznato.push(`${d.osoba} → ${d.potreba}: osoba ili potreba ne postoji u ulazu`);
			continue;
		}
		valjane.push(d);
		zbroj.set(d.potreba, (zbroj.get(d.potreba) ?? 0) + d.sati);
		// Zamjena ne mijenja satnicu: osoba napušta onoliko sati koliko dobiva.
		if (d.korak !== 3) dobiveno.set(d.osoba, (dobiveno.get(d.osoba) ?? 0) + d.sati);
		if (d.korak === 1) dobivenoKorak1.set(d.osoba, (dobivenoKorak1.get(d.osoba) ?? 0) + d.sati);
	}

	const sati: string[] = [...nepoznato];
	for (const x of sve) {
		const podijeljeno = zbroj.get(x.id) ?? 0;
		const ostalo = ostatak.get(x.id) ?? 0;
		if (podijeljeno + ostalo !== x.sati) sati.push(`${x.id}: podijeljeno ${podijeljeno} i ostalo ${ostalo}, a slobodno je ${x.sati}`);
	}

	const norma: string[] = [];
	for (const s of sudionici) {
		const ukupno = s.zadrzanoSati + (dobiveno.get(s.id) ?? 0);
		if (ukupno > s.norma) norma.push(`${s.id}: ${ukupno} sati, a norma je ${s.norma}`);
		if ((dobivenoKorak1.get(s.id) ?? 0) > s.visakSati) norma.push(`${s.id}: u koraku 1 dobiva više sati nego što je izgubila`);
	}

	const predmet: string[] = [];
	const udaljenost: string[] = [];
	const zamjena: string[] = [];
	for (const d of valjane) {
		const x = poPotrebi.get(d.potreba)!;
		if (d.korak === 3) {
			const z = zahtjevi.get(d.osoba)!;
			if (z.predmet !== x.predmet) predmet.push(`${z.osoba} (${z.predmet}) zamjenom dobiva mjesto za ${x.predmet}`);
			if (!z.zeli.includes(x.mjesto)) zamjena.push(`${z.osoba} prelazi u ${x.mjesto}, a to mjesto nije među željama`);
			if (z.sati !== d.sati || x.sati !== z.sati) zamjena.push(`${z.osoba}: zamjena nije za istu satnicu`);
			if (d.napusta !== z.zaposlenje || !poPotrebi.has(oznakaNovogMjesta(z.zaposlenje))) zamjena.push(`${z.osoba}: napušteno mjesto nije postalo slobodno`);
			continue;
		}
		const s = osobe.get(d.osoba)!;
		if (s.predmet !== x.predmet) predmet.push(`${s.id} (${s.predmet}) dobiva sate predmeta ${x.predmet}`);
		const km = p.udaljenost(s.mjesto, x.mjesto);
		if (km === null) udaljenost.push(`${s.id} → ${x.id}: nema cestovne veze ${s.mjesto} – ${x.mjesto}`);
		else if (km > doseg(s)) udaljenost.push(`${s.id} → ${x.id}: ${km} km, a doseg je ${doseg(s)} km`);
		if (napustio.get(s.id) === x.id) zamjena.push(`${s.id} je ponovno dobio mjesto koje je napustio`);
	}

	// Poredak: nitko tko je mogao uzeti sate nije ostao bez njih dok su ostali slobodni
	// ili otišli nekome iza njega.
	const preskoceni: string[] = [];
	for (const s of sudionici) {
		const neplasiranVisak = s.visakSati - (dobivenoKorak1.get(s.id) ?? 0);
		const fali = s.norma - s.zadrzanoSati - (dobiveno.get(s.id) ?? 0);
		if (fali <= 0) continue;
		for (const { potreba: x } of potrebeUDosegu(s, sve, p.udaljenost)) {
			if (napustio.get(s.id) === x.id) continue;
			if ((ostatak.get(x.id) ?? 0) > 0) preskoceni.push(`${s.id} fali ${fali} sati, a u ${x.id} je ostalo slobodnih`);
			for (const d of valjane) {
				if (d.potreba !== x.id || d.osoba === s.id) continue;
				const ispred = (mjesto.get(d.osoba) ?? Infinity) < (mjesto.get(s.id) ?? Infinity);
				const uRedu =
					d.korak === 3
						? false
						: d.korak === 1
							? neplasiranVisak <= 0 || ispred
							: neplasiranVisak <= 0 && (ispred || (d.unutarSkole && !s.skole.includes(x.skola)));
				if (!uRedu) preskoceni.push(`${d.osoba} je dobila sate iz ${x.id} ispred ${s.id}`);
			}
		}
	}

	const provjera = (naziv: string, detalj: string[]): Provjera => ({ naziv, ok: detalj.length === 0, detalj });
	return [
		provjera('Svaki slobodni sat je ili dodijeljen ili ide na natječaj, nijedan dvaput', sati),
		provjera('Nitko nema više od pune norme', norma),
		provjera('Svatko je dobio sate samo za svoj predmet', predmet),
		provjera(`Sve dodjele su u dosegu cestom (do ${OBVEZNO_KM} km, ili dalje ako osoba to želi)`, udaljenost),
		provjera('Zamjene su za istu satnicu, u željeno mjesto, a napušteno mjesto je postalo slobodno', zamjena),
		provjera('Nitko nije preskočen: sate nije dobio nitko s manje bodova ili iz kasnijeg koraka', preskoceni),
	];
}

export interface KandidatZaSate {
	s: Sudionik;
	/** Tekuća satnica osobe. */
	sati: number;
	/** Sati viška koji još nisu zbrinuti. */
	neplasiranVisak: number;
	/** Kandidat izvana, još nije zaposlen u sustavu. */
	izvana: boolean;
}

export interface URedu {
	osoba: string;
	/** Korak raspodjele kojem osoba pripada: 1 višak, 2 nepuna satnica, 4 kandidat izvana. */
	skupina: 1 | 2 | 4;
	bodovi: number;
	km: number;
	nedostaje: number;
}

/**
 * Tko ima prednost za jedne slobodne sate: prvo nezbrinuti višak, zatim nepuna
 * satnica, zatim kandidati izvana; unutar skupine po bodovima. To je lista
 * kandidata koju ravnatelj dobiva za sate koje je prijavio.
 */
export function redPrednosti(potreba: Potreba, kandidati: KandidatZaSate[], p: Postavke): URedu[] {
	const lista = poredak(
		kandidati.map((k) => ({ id: k.s.id, osoba: k.s.osoba, dokazano: k.s.dokazano })),
		p.tablica,
	);
	const poId = new Map(kandidati.map((k) => [k.s.id, k]));
	const red: (URedu & { mjesto: number })[] = [];
	for (const m of lista) {
		const k = poId.get(m.id)!;
		if (k.s.predmet !== potreba.predmet) continue;
		const nedostaje = k.s.norma - k.sati;
		if (nedostaje <= 0) continue;
		const km = p.udaljenost(k.s.mjesto, potreba.mjesto);
		if (km === null || km > doseg(k.s)) continue;
		const skupina = k.izvana ? 4 : k.neplasiranVisak > 0 ? 1 : 2;
		red.push({ osoba: m.id, skupina, bodovi: m.rezultat.ukupno, km, nedostaje, mjesto: m.mjesto });
	}
	return red.sort((a, b) => a.skupina - b.skupina || a.mjesto - b.mjesto).map(({ mjesto: _mjesto, ...u }) => u);
}
