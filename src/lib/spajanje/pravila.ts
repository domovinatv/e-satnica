// Spajanje dvaju računa iste osobe (npr. jedan otvoren Certilijom, drugi s @skole.hr).
// Čisti dio bez Cloudflare importa, da se može testirati u Nodeu nad pravim SQLiteom.

export interface RacunZaSpajanje {
	id: number;
	oib_hash: string | null;
	ime: string;
	prezime: string;
}

export type Odluka =
	| { ok: true; cilj: RacunZaSpajanje; izvor: RacunZaSpajanje }
	| { ok: false; razlog: 'isti_racun' | 'razliciti_oib' };

/**
 * Koji račun ostaje. Dva različita OIB-a su dvije osobe i nikad se ne spajaju.
 * Ostaje račun s Certilijom (ime iz e-Osobne), inače stariji račun.
 */
export function odluciSpajanje(a: RacunZaSpajanje, b: RacunZaSpajanje): Odluka {
	if (a.id === b.id) return { ok: false, razlog: 'isti_racun' };
	if (a.oib_hash && b.oib_hash && a.oib_hash !== b.oib_hash) return { ok: false, razlog: 'razliciti_oib' };
	if (a.oib_hash && !b.oib_hash) return { ok: true, cilj: a, izvor: b };
	if (b.oib_hash && !a.oib_hash) return { ok: true, cilj: b, izvor: a };
	return a.id < b.id ? { ok: true, cilj: a, izvor: b } : { ok: true, cilj: b, izvor: a };
}

export interface Naredba {
	sql: string;
	params: (string | number | null)[];
}

/**
 * Naredbe koje sve iz `izvor` prebacuju na `cilj` i brišu `izvor`. Izvršavaju se
 * u jednoj transakciji (D1 batch). Svaka tablica s korisnik_id mora biti ovdje;
 * test u pravila.test.ts pada ako migracija doda novu, a ova lista je ne pokrije.
 */
export function naredbeSpajanja(cilj: RacunZaSpajanje, izvor: RacunZaSpajanje): Naredba[] {
	const c = cilj.id;
	const i = izvor.id;
	// Ime ide s računa koji ima Certiliju; ako ga nema nijedan, ostaje ime cilja.
	const uzmiImeIzvora = !cilj.oib_hash && Boolean(izvor.oib_hash);
	return [
		{ sql: 'UPDATE stavke SET korisnik_id = ? WHERE korisnik_id = ?', params: [c, i] },
		{ sql: 'UPDATE passkeyi SET korisnik_id = ? WHERE korisnik_id = ?', params: [c, i] },
		{ sql: 'UPDATE passkey_izazovi SET korisnik_id = ? WHERE korisnik_id = ?', params: [c, i] },
		{ sql: 'UPDATE identiteti SET korisnik_id = ? WHERE korisnik_id = ?', params: [c, i] },
		// Podatak koji imaju oba računa ostaje onaj s cilja.
		{
			sql: `INSERT OR IGNORE INTO korisnik_podaci (korisnik_id, podatak, vrijednost, dohvaceno_at)
			      SELECT ?, podatak, vrijednost, dohvaceno_at FROM korisnik_podaci WHERE korisnik_id = ?`,
			params: [c, i],
		},
		{ sql: 'DELETE FROM korisnik_podaci WHERE korisnik_id = ?', params: [i] },
		// Izvor se briše prije nego cilj preuzme njegov OIB (oib_hash je UNIQUE).
		{ sql: 'DELETE FROM korisnici WHERE id = ?', params: [i] },
		{
			sql: `UPDATE korisnici SET
			        oib_hash = coalesce(oib_hash, ?),
			        ime = iif(?, ?, ime),
			        prezime = iif(?, ?, prezime)
			      WHERE id = ?`,
			params: [izvor.oib_hash, uzmiImeIzvora ? 1 : 0, izvor.ime, uzmiImeIzvora ? 1 : 0, izvor.prezime, c],
		},
	];
}
