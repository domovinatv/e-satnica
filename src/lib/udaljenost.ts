// Cestovna udaljenost između mjesta. Specifikacija traži udaljenost cestom, a ne
// zračnom linijom, pa se ne računa iz koordinata nego čita iz tablice dionica.
// Čiste funkcije bez I/O.

export interface Dionica {
	od: string;
	do: string;
	km: number;
}

/** Kilometri cestom između dva mjesta; `null` kad cestovne veze nema u tablici (npr. otok i kopno). */
export type Udaljenost = (a: string, b: string) => number | null;

const kljuc = (a: string, b: string): string => (a < b ? `${a}|${b}` : `${b}|${a}`);

export function napraviUdaljenost(dionice: Dionica[]): Udaljenost {
	const mapa = new Map<string, number>();
	for (const d of dionice) {
		if (!Number.isFinite(d.km) || d.km < 0) throw new RangeError(`${d.od} – ${d.do}: očekujem km ≥ 0, dobio ${d.km}`);
		mapa.set(kljuc(d.od, d.do), d.km);
	}
	return (a, b) => (a === b ? 0 : (mapa.get(kljuc(a, b)) ?? null));
}
