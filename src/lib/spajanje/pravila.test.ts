// Spajanje računa nad pravim SQLiteom s migracijama iz migrations/.
// Pokretanje: npm test
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { naredbeSpajanja, odluciSpajanje, type RacunZaSpajanje } from './pravila.ts';

const MIGRACIJE = join(import.meta.dirname, '../../../migrations');

function baza() {
	const db = new DatabaseSync(':memory:');
	db.exec('PRAGMA foreign_keys = ON');
	for (const f of readdirSync(MIGRACIJE).filter((f) => f.endsWith('.sql')).sort()) {
		db.exec(readFileSync(join(MIGRACIJE, f), 'utf8'));
	}
	return db;
}

function racun(db: DatabaseSync, id: number): RacunZaSpajanje {
	return { ...db.prepare('SELECT id, oib_hash, certilia, ime, prezime FROM korisnici WHERE id = ?').get(id) } as unknown as RacunZaSpajanje;
}

function spoji(db: DatabaseSync, a: number, b: number) {
	const o = odluciSpajanje(racun(db, a), racun(db, b));
	assert.ok(o.ok);
	db.exec('BEGIN');
	for (const n of naredbeSpajanja(o.cilj, o.izvor)) db.prepare(n.sql).run(...n.params);
	db.exec('COMMIT');
	return o.cilj.id;
}

describe('odluciSpajanje', () => {
	const r = (id: number, oib: string | null): RacunZaSpajanje => ({ id, oib_hash: oib, certilia: oib ? 1 : 0, ime: 'I', prezime: 'P' });
	test('dva različita OIB-a se ne spajaju', () => assert.deepEqual(odluciSpajanje(r(1, 'a'), r(2, 'b')), { ok: false, razlog: 'razliciti_oib' }));
	test('isti račun', () => assert.deepEqual(odluciSpajanje(r(1, null), r(1, null)), { ok: false, razlog: 'isti_racun' }));
	test('ostaje račun s Certilijom, i kad je noviji', () => {
		const o = odluciSpajanje(r(1, null), r(2, 'a'));
		assert.ok(o.ok && o.cilj.id === 2);
	});
	test('bez Certilije ostaje stariji', () => {
		const o = odluciSpajanje(r(5, null), r(3, null));
		assert.ok(o.ok && o.cilj.id === 3);
	});
});

describe('naredbeSpajanja', () => {
	test('prebacuje sve na račun s Certilijom i briše drugi', () => {
		const db = baza();
		db.exec(`
			INSERT INTO korisnici (id, oib_hash, ime, prezime) VALUES (1, NULL, 'Ana', 'Skole'), (2, 'oib-ana', 'Ana', 'Horvat');
			UPDATE korisnici SET certilia = 1 WHERE id = 2;
			INSERT INTO identiteti (davatelj, id_hash, korisnik_id) VALUES ('aaieduhr', 'h1', 1);
			INSERT INTO passkeyi (id, korisnik_id, public_key, naziv) VALUES ('k1', 1, 'pk', 'mobitel'), ('k2', 2, 'pk', 'laptop');
			INSERT INTO korisnik_podaci (korisnik_id, podatak, vrijednost) VALUES (1, 'x', 'od1'), (1, 'y', 'od1'), (2, 'x', 'od2');
			INSERT INTO stavke (sekcija, vrsta, tekst, autor, korisnik_id) VALUES ('a', 'komentar', 't', 'A', 1), ('a', 'komentar', 't', 'A', 2);
		`);
		const cilj = spoji(db, 1, 2);
		assert.equal(cilj, 2);
		assert.deepEqual(racun(db, 2), { id: 2, oib_hash: 'oib-ana', certilia: 1, ime: 'Ana', prezime: 'Horvat' });
		assert.equal(db.prepare('SELECT count(*) n FROM korisnici').get()!.n, 1);
		assert.equal(db.prepare("SELECT korisnik_id k FROM identiteti WHERE id_hash = 'h1'").get()!.k, 2);
		assert.equal(db.prepare('SELECT count(*) n FROM passkeyi WHERE korisnik_id = 2').get()!.n, 2);
		assert.equal(db.prepare('SELECT count(*) n FROM stavke WHERE korisnik_id = 2').get()!.n, 2);
		const podaci = db.prepare('SELECT podatak, vrijednost FROM korisnik_podaci WHERE korisnik_id = 2 ORDER BY podatak').all();
		assert.deepEqual(podaci.map((p) => `${p.podatak}=${p.vrijednost}`), ['x=od2', 'y=od1']);
		assert.equal(db.prepare('PRAGMA foreign_key_check').all().length, 0);
	});

	test('cilj bez Certilije preuzima OIB i ime izvora', () => {
		const db = baza();
		db.exec(`INSERT INTO korisnici (id, oib_hash, ime, prezime) VALUES (1, NULL, 'Ana', 'Skole'), (2, NULL, 'Ana', 'Druga')`);
		// Ručno: cilj 1 (stariji, bez OIB-a), izvor s OIB-om. odluciSpajanje to ne bi izabrao,
		// ali naredbe moraju i tada ostaviti ispravno stanje.
		db.prepare("UPDATE korisnici SET oib_hash = 'oib', certilia = 1 WHERE id = 2").run();
		db.exec('BEGIN');
		for (const n of naredbeSpajanja(racun(db, 1), racun(db, 2))) db.prepare(n.sql).run(...n.params);
		db.exec('COMMIT');
		assert.deepEqual(racun(db, 1), { id: 1, oib_hash: 'oib', certilia: 1, ime: 'Ana', prezime: 'Druga' });
	});

	test('OIB s @skole.hr: ime ostaje s računa koji ima Certiliju', () => {
		const db = baza();
		// 1: @skole.hr račun s OIB-om iz AAI (bez Certilije), 2: račun bez OIB-a.
		db.exec(`INSERT INTO korisnici (id, oib_hash, certilia, ime, prezime) VALUES (1, 'oib', 0, 'Ana', 'Skole'), (2, NULL, 0, 'Ana', 'Druga')`);
		const cilj = spoji(db, 2, 1);
		assert.equal(cilj, 1);
		assert.deepEqual(racun(db, 1), { id: 1, oib_hash: 'oib', certilia: 0, ime: 'Ana', prezime: 'Skole' });
	});

	test('pokriva svaku tablicu koja upućuje na korisnici', () => {
		const db = baza();
		const tablice = (db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as { name: string }[]).map((t) => t.name);
		const sKorisnikom = tablice.filter((t) =>
			(db.prepare(`PRAGMA table_info(${t})`).all() as { name: string }[]).some((c) => c.name === 'korisnik_id'),
		);
		const sql = naredbeSpajanja({ id: 1, oib_hash: null, certilia: 0, ime: '', prezime: '' }, { id: 2, oib_hash: null, certilia: 0, ime: '', prezime: '' })
			.map((n) => n.sql)
			.join('\n');
		for (const t of sKorisnikom) assert.match(sql, new RegExp(`\\b${t}\\b`), `tablica ${t} nije pokrivena spajanjem`);
	});
});
