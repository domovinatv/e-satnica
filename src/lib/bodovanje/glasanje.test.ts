// Pokretanje: npm test   (node --test, bez dodatnih paketa)

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bodovi } from './bodovi.ts';
import { mozeSeMijenjati, novaVerzija, prebroji } from './glasanje.ts';
import { tablicaZa, V0_NACRT, V1, type Osoba } from './kriteriji.ts';

const o: Osoba = {
	stazUObrazovanju: 10,
	stazIzvanObrazovanja: 0,
	dob: 40,
	uzdrzavaniClanovi: 2,
	samohraniIliSamac: true,
	dijeteSTeskocama: false,
	invaliditet: false,
	prethodniViskovi: 0,
	napredovanje: 'nema',
};

test('prijedlog prolazi s više glasova za nego protiv; neriješeno ne prolazi', () => {
	const ishodi = prebroji(
		[
			{ id: 1, kriterij: 'dob', bodova: 2, zatvara: '2026-11-30' },
			{ id: 2, kriterij: 'samohrani', bodova: 4, zatvara: '2026-11-10' },
		],
		[
			{ prijedlog: 1, glas: 'za' },
			{ prijedlog: 1, glas: 'protiv' },
			{ prijedlog: 2, glas: 'za' },
			{ prijedlog: 2, glas: 'za' },
			{ prijedlog: 2, glas: 'protiv' },
		],
		'2026-11-17',
	);
	assert.deepEqual(ishodi, [
		{ id: 1, za: 1, protiv: 1, prolazi: false, zatvoreno: false },
		{ id: 2, za: 2, protiv: 1, prolazi: true, zatvoreno: true },
	]);
});

test('nova verzija mijenja samo izglasane kriterije, a zaključana ostaje ista', () => {
	const v2 = novaVerzija(V1, [{ id: 2, kriterij: 'samohrani', bodova: 4, zatvara: '' }], 'v2-nacrt');
	assert.equal(v2.verzija, 'v2-nacrt');
	assert.equal(v2.stanje, 'nacrt');
	assert.equal(bodovi(o, v2).ukupno - bodovi(o, V1).ukupno, 2);
	assert.equal(bodovi(o, V1).ukupno, 20 + 40 + 2 + 2);
});

test('kasniji prijedlog o istom kriteriju vrijedi; napredovanje se ne mijenja glasanjem', () => {
	const v2 = novaVerzija(
		V1,
		[
			{ id: 3, kriterij: 'dob', bodova: 2, zatvara: '' },
			{ id: 1, kriterij: 'dob', bodova: 0, zatvara: '' },
		],
		'v2-nacrt',
	);
	assert.equal(bodovi(o, v2).stavke.find((s) => s.kljuc === 'dob')?.bodova, 80);
	assert.equal(mozeSeMijenjati(V1, 'napredovanje'), false);
	assert.throws(() => novaVerzija(V1, [{ id: 1, kriterij: 'napredovanje', bodova: 3, zatvara: '' }], 'x'));
});

test('zaključana v1 ima ista pravila kao nacrt v0; nepoznata verzija zaustavlja izračun', () => {
	assert.equal(tablicaZa('v1').stanje, 'zakljucano');
	assert.deepEqual(
		tablicaZa('v1').kriteriji.map((k) => k.pravilo),
		V0_NACRT.kriteriji.map((k) => k.pravilo),
	);
	assert.throws(() => tablicaZa('v9'), /nepoznata verzija/);
});

test('kriterij bez potvrđenog dokaza ne nosi bodove, a dob ne traži dokaz', () => {
	const samoStaz = bodovi(o, V1, (k) => k === 'staz_obrazovanje');
	assert.equal(samoStaz.ukupno, 20 + 40);
	assert.equal(samoStaz.stavke.find((s) => s.kljuc === 'uzdrzavani')?.bezDokaza, 2);
	assert.equal(samoStaz.stavke.find((s) => s.kljuc === 'samohrani')?.bezDokaza, 2);
	assert.equal(samoStaz.stavke.find((s) => s.kljuc === 'dob')?.bezDokaza, undefined);
	assert.equal(bodovi(o, V1).ukupno, bodovi(o, V1, () => true).ukupno);
});
