// Čitanje odgovora OSRM-a (route servis) za skriptu scripts/udaljenosti.ts.
// Čiste funkcije bez I/O, da se mogu testirati bez mreže.

export interface Tocka {
	lat: number;
	lon: number;
}

/** URL rute između dvije točke; koraci trebaju da se vidi trajekt. */
export function urlRute(posluzitelj: string, a: Tocka, b: Tocka): string {
	const koord = (t: Tocka) => `${t.lon.toFixed(5)},${t.lat.toFixed(5)}`;
	return `${posluzitelj.replace(/\/$/, '')}/route/v1/driving/${koord(a)};${koord(b)}?overview=false&steps=true`;
}

interface OdgovorRute {
	code?: string;
	routes?: { distance?: number; legs?: { steps?: { mode?: string }[] }[] }[];
}

/**
 * Kilometri cestom, zaokruženi; `null` ako ceste nema. Ruta s trajektom nije cestovna
 * veza: na otok se ne putuje svaki dan u 50 km.
 */
export function kmIzRute(odgovor: unknown): number | null {
	const o = odgovor as OdgovorRute;
	if (o?.code !== 'Ok' || !o.routes?.length) return null;
	const ruta = o.routes[0];
	if (typeof ruta.distance !== 'number' || !Number.isFinite(ruta.distance)) return null;
	const trajekt = (ruta.legs ?? []).some((l) => (l.steps ?? []).some((s) => s.mode === 'ferry'));
	return trajekt ? null : Math.round(ruta.distance / 1000);
}

/** Svi parovi mjesta, svaki jednom, abecedno unutar para (kao tablica udaljenosti). */
export function parovi(mjesta: string[]): [string, string][] {
	const svi = [...new Set(mjesta)].sort((a, b) => a.localeCompare(b, 'hr'));
	return svi.flatMap((a, i) => svi.slice(i + 1).map((b): [string, string] => (a < b ? [a, b] : [b, a])));
}
