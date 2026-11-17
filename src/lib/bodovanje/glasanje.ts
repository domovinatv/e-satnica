// Glasanje o izmjenama bodovne tablice (specifikacija, „Kriteriji bodovanja", pitanje 22).
// Čiste funkcije bez I/O.
//
// Glasaju zaposleni nastavnici, jedan glas po prijedlogu, i mogu ga promijeniti dok
// je glasanje otvoreno. Prijedlog prolazi ako ima više glasova za nego protiv. Prihvaćeni
// prijedlozi ne mijenjaju zaključanu tablicu, nego daju nacrt za idući ciklus.

import type { BodovnaTablica } from './kriteriji.ts';

export interface Prijedlog {
	id: number;
	kriterij: string;
	/** Novi broj bodova (po jedinici ili za da/ne kriterij). */
	bodova: number;
	zatvara: string;
}

export interface Glas {
	prijedlog: number;
	glas: 'za' | 'protiv';
}

export interface IshodGlasanja {
	id: number;
	za: number;
	protiv: number;
	/** Više glasova za nego protiv. Dok je glasanje otvoreno, to je trenutno stanje. */
	prolazi: boolean;
	zatvoreno: boolean;
}

export function prebroji(prijedlozi: Prijedlog[], glasovi: Glas[], danas: string): IshodGlasanja[] {
	return prijedlozi.map((p) => {
		const za = glasovi.filter((g) => g.prijedlog === p.id && g.glas === 'za').length;
		const protiv = glasovi.filter((g) => g.prijedlog === p.id && g.glas === 'protiv').length;
		return { id: p.id, za, protiv, prolazi: za > protiv, zatvoreno: p.zatvara < danas };
	});
}

/** Može li se o kriteriju glasati: mijenja se broj bodova, pa mora imati jedan broj. */
export function mozeSeMijenjati(t: BodovnaTablica, kljuc: string): boolean {
	const k = t.kriteriji.find((x) => x.kljuc === kljuc);
	return k !== undefined && (k.pravilo.vrsta === 'po_jedinici' || k.pravilo.vrsta === 'da_ne');
}

/**
 * Nova verzija tablice s prihvaćenim izmjenama. Kad je o istom kriteriju prihvaćeno
 * više prijedloga, vrijedi zadnji po redu.
 */
export function novaVerzija(t: BodovnaTablica, prihvaceni: Prijedlog[], verzija: string): BodovnaTablica {
	const izmjene = new Map<string, number>();
	for (const p of [...prihvaceni].sort((a, b) => a.id - b.id)) {
		if (!mozeSeMijenjati(t, p.kriterij)) throw new Error(`o kriteriju ${p.kriterij} se ne može glasati`);
		if (!Number.isInteger(p.bodova) || p.bodova < 0) throw new RangeError(`${p.kriterij}: bodovi moraju biti cijeli broj ≥ 0`);
		izmjene.set(p.kriterij, p.bodova);
	}
	return {
		...t,
		verzija,
		naziv: 'Nacrt za idući ciklus, s izglasanim izmjenama',
		stanje: 'nacrt',
		kriteriji: t.kriteriji.map((k) => {
			const bodova = izmjene.get(k.kljuc);
			if (bodova === undefined || k.pravilo.vrsta === 'napredovanje') return k;
			return { ...k, pravilo: { ...k.pravilo, bodova } };
		}),
	};
}
