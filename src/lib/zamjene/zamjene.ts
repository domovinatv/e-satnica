// Zamjene radnih mjesta: parovi (A ↔ B) i lanci (A → B → C → A), prema sekciji
// „Zamjene radnih mjesta". Čiste funkcije bez I/O.
//
// Algoritam je Top Trading Cycles (Shapley i Scarf), isti koji se koristi za
// razmjenu bubrega: svatko pokazuje na mjesto koje mu je najdraže od preostalih,
// krugovi koji tako nastanu se izvrše, i postupak se ponavlja. Ishod ne ovisi o
// redoslijedu ulaza i nitko ne prolazi lošije nego da ostane gdje je.

export interface Zahtjev {
	/** Stabilna oznaka osobe; jedna osoba, jedan zahtjev. */
	id: string;
	predmet: string;
	/** Sati nastave mjesta koje osoba nudi. */
	sati: number;
	/** Škola u kojoj sada radi. */
	skola: string;
	/** Mjesto te škole. */
	mjesto: string;
	/** Mjesta u koja bi osoba išla, od najdražeg. */
	zeli: string[];
}

export interface Lanac {
	/** Član na mjestu i ide na radno mjesto člana na mjestu i + 1; zadnji ide na mjesto prvog. */
	clanovi: string[];
}

export interface Zamjene {
	/** Parovi i lanci; lanac od dva člana je par. */
	lanci: Lanac[];
	/** Zahtjevi za koje nema zamjene. */
	bezZamjene: string[];
}

const poOznaci = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/** Uvjet zamjene: isti predmet i ista satnica, a osoba želi u mjesto druge škole. */
export function mozeNaMjesto(tko: Zahtjev, cije: Zahtjev): boolean {
	return (
		tko.id !== cije.id &&
		tko.predmet === cije.predmet &&
		tko.sati === cije.sati &&
		tko.skola !== cije.skola &&
		tko.zeli.includes(cije.mjesto)
	);
}

/** Oznaka lanca neovisna o tome od kojeg se člana krene; njome se vežu potvrde. */
export function kljucLanca(clanovi: string[]): string {
	const prvi = clanovi.reduce((min, c, i) => (poOznaci(c, clanovi[min]) < 0 ? i : min), 0);
	return [...clanovi.slice(prvi), ...clanovi.slice(0, prvi)].join('>');
}

export function nadiZamjene(zahtjevi: Zahtjev[]): Zamjene {
	const videni = new Set<string>();
	for (const z of zahtjevi) {
		if (videni.has(z.id)) throw new Error(`osoba ${z.id} ima više od jednog zahtjeva`);
		videni.add(z.id);
		if (!Number.isInteger(z.sati) || z.sati <= 0) throw new RangeError(`${z.id}: sati moraju biti cijeli broj veći od 0`);
	}

	let aktivni = [...zahtjevi].sort((a, b) => poOznaci(a.id, b.id));
	const lanci: Lanac[] = [];
	const bezZamjene: string[] = [];

	while (aktivni.length > 0) {
		// Svatko pokazuje na najdraže preostalo mjesto, ili na sebe ako takvog nema.
		const cilj = new Map<string, string>();
		for (const a of aktivni) {
			let najbolji = a;
			let najboljiRed = Infinity;
			for (const b of aktivni) {
				if (!mozeNaMjesto(a, b)) continue;
				const red = a.zeli.indexOf(b.mjesto);
				if (red < najboljiRed) {
					najbolji = b;
					najboljiRed = red;
				}
			}
			cilj.set(a.id, najbolji.id);
		}

		// U grafu gdje svatko pokazuje na točno jednog uvijek postoji barem jedan krug.
		const uKrugu = new Set<string>();
		for (const a of aktivni) {
			if (uKrugu.has(a.id)) continue;
			const put: string[] = [];
			let sada = a.id;
			while (!put.includes(sada) && !uKrugu.has(sada)) {
				put.push(sada);
				sada = cilj.get(sada)!;
			}
			if (uKrugu.has(sada)) continue;
			const krug = put.slice(put.indexOf(sada));
			for (const c of krug) uKrugu.add(c);
			if (krug.length === 1) bezZamjene.push(krug[0]);
			else lanci.push({ clanovi: kljucLanca(krug).split('>') });
		}
		aktivni = aktivni.filter((a) => !uKrugu.has(a.id));
	}

	return {
		lanci: lanci.sort((a, b) => poOznaci(a.clanovi[0], b.clanovi[0])),
		bezZamjene: bezZamjene.sort(poOznaci),
	};
}
