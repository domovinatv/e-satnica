// Životni put slobodnih sati kao stroj stanja, prema dijagramu u sekciji
// „Proces i rokovi". Jedini izvor istine o tome koji je prijelaz dopušten.
// Čiste funkcije bez I/O.

export const STANJA = {
	nastali: 'Nastali',
	prijavljeni: 'Prijavljeni',
	odbijeni: 'Odbijeni',
	ponudeni: 'Ponuđeni unutar sustava',
	natjecaj: 'Javni natječaj',
	dodijeljeni: 'Dodijeljeni',
	hitno: 'Hitno',
	dana60: 'Zaposlenje na 60 dana',
} as const;

export type Stanje = keyof typeof STANJA;

/** Dopušteni prijelazi: iz stanja → u stanje, s razlogom iz dijagrama. */
export const PRIJELAZI: Record<Stanje, Partial<Record<Stanje, string>>> = {
	nastali: {
		prijavljeni: 'ravnatelj unese u sustav',
		hitno: 'bolest, operacija ili neočekivan odlazak',
	},
	prijavljeni: {
		odbijeni: 'nije stvarna potreba',
		ponudeni: 'provjereno',
	},
	ponudeni: {
		dodijeljeni: 'netko s nepunom satnicom ili višak prihvati',
		natjecaj: 'nitko na listi ne ispunjava uvjete',
	},
	natjecaj: { dodijeljeni: 'izbor po bodovima' },
	hitno: { dana60: 'zaposlenje bez natječaja' },
	dana60: { prijavljeni: 'potreba potraje' },
	dodijeljeni: {},
	odbijeni: {},
};

export function jeStanje(s: string): s is Stanje {
	return s in STANJA;
}

export function smije(iz: Stanje, u: Stanje): boolean {
	return u in PRIJELAZI[iz];
}

export function jeZavrsno(s: Stanje): boolean {
	return Object.keys(PRIJELAZI[s]).length === 0;
}

export interface Prijelaz {
	/** `null` samo za prvi zapis, kad sati nastanu. */
	iz: Stanje | null;
	u: Stanje;
	/** ISO datum ili datum i vrijeme; uspoređuje se kao tekst. */
	vrijeme: string;
}

/**
 * Provjerava cijeli put jednih sati: počinje nastankom, svaki se korak nastavlja na
 * prethodni i dopušten je, a vrijeme ne ide unatrag. Vraća popis grešaka; prazan
 * popis znači da je put ispravan.
 */
export function provjeriPut(put: Prijelaz[]): string[] {
	const greske: string[] = [];
	if (put.length === 0) return ['put je prazan'];
	if (put[0].iz !== null || put[0].u !== 'nastali') greske.push('put mora početi nastankom sati');
	for (let i = 1; i < put.length; i++) {
		const prije = put[i - 1];
		const sada = put[i];
		if (sada.iz !== prije.u) greske.push(`korak ${i + 1}: kreće iz „${sada.iz}", a prethodno stanje je „${prije.u}"`);
		else if (!smije(prije.u, sada.u)) greske.push(`korak ${i + 1}: prijelaz „${prije.u}" → „${sada.u}" nije dopušten`);
		if (sada.vrijeme < prije.vrijeme) greske.push(`korak ${i + 1}: vrijeme ide unatrag`);
	}
	return greske;
}

/**
 * Kasna prijava: potreba je bila poznata do roka, a prijavljena je nakon njega.
 * Potreba koja je nastala nakon roka (npr. bolest u listopadu) nije kasna prijava.
 */
export function kasnaPrijava(nastalo: string, prijavljeno: string | null, rok: string): boolean {
	return prijavljeno !== null && nastalo.slice(0, 10) <= rok && prijavljeno.slice(0, 10) > rok;
}
