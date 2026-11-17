// Kalendarski datumi kao tekst GGGG-MM-DD. Čiste funkcije bez I/O, osim `danas()`.
// Rokovi su kalendarski dani u Hrvatskoj, a Worker radi u UTC-u.

export function danas(): string {
	return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Zagreb' }).format(new Date());
}

/** Sadašnji trenutak u Hrvatskoj kao GGGG-MM-DDTHH:MM, kako se zapisuju prijelazi stanja. */
export function sadaLokalno(): string {
	return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Zagreb', dateStyle: 'short', timeStyle: 'short' }).format(new Date()).replace(' ', 'T');
}

/** Datum pomaknut za zadani broj dana (može i unatrag). */
export function pomakni(datum: string, dana: number): string {
	const d = new Date(`${datum.slice(0, 10)}T00:00:00Z`);
	d.setUTCDate(d.getUTCDate() + dana);
	return d.toISOString().slice(0, 10);
}

/** Broj dana od `od` do `do`; negativan ako je `do` ranije. */
export function danaIzmedju(od: string, do_: string): number {
	return Math.round((Date.parse(do_.slice(0, 10)) - Date.parse(od.slice(0, 10))) / 86_400_000);
}

/** Navršene godine života na zadani dan. Bodovanje ih broji na dan zaključavanja liste. */
export function navrseneGodine(rodjen: string, naDan: string): number {
	const [g1, m1, d1] = rodjen.slice(0, 10).split('-').map(Number);
	const [g2, m2, d2] = naDan.slice(0, 10).split('-').map(Number);
	const godina = g2 - g1 - (m2 < m1 || (m2 === m1 && d2 < d1) ? 1 : 0);
	if (!Number.isInteger(godina) || godina < 0) throw new RangeError(`datum rođenja ${rodjen} nije prije ${naDan}`);
	return godina;
}

/** „15. 8." ili, s godinom, „15. 8. 2026." */
export function datum(iso: string, godina = false): string {
	const [g, m, d] = iso.slice(0, 10).split('-').map(Number);
	return godina ? `${d}. ${m}. ${g}.` : `${d}. ${m}.`;
}

/** Datum s vremenom ako ga zapis ima: „15. 8. 2026. u 12:00". */
export function datumIVrijeme(iso: string): string {
	const vrijeme = iso.length > 10 ? iso.slice(11, 16) : '';
	return vrijeme ? `${datum(iso, true)} u ${vrijeme}` : datum(iso, true);
}

/** Hrvatski oblik imenice uz broj: 1 dan, 2 dana, 5 dana. */
export function oblik(n: number, jedan: string, dva: string, pet: string): string {
	const d = Math.abs(n) % 10;
	const s = Math.abs(n) % 100;
	if (d === 1 && s !== 11) return jedan;
	if (d >= 2 && d <= 4 && (s < 12 || s > 14)) return dva;
	return pet;
}

export function sati(n: number): string {
	return `${n} ${oblik(n, 'sat', 'sata', 'sati')}`;
}
