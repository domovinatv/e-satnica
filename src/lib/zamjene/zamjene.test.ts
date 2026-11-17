// Pokretanje: npm test   (node --test, bez dodatnih paketa)

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { kljucLanca, mozeNaMjesto, nadiZamjene, type Zahtjev } from './zamjene.ts';

const z = (id: string, mjesto: string, zeli: string[], o: Partial<Zahtjev> = {}): Zahtjev => ({
	id,
	predmet: 'Matematika',
	sati: 20,
	skola: `skola-${id}`,
	mjesto,
	zeli,
	...o,
});

test('par: A želi mjesto B-a, B mjesto A-a', () => {
	const r = nadiZamjene([z('a', 'Imotski', ['Split']), z('b', 'Split', ['Imotski'])]);
	assert.deepEqual(r.lanci, [{ clanovi: ['a', 'b'] }]);
	assert.deepEqual(r.bezZamjene, []);
});

test('lanac od troje rješava ono što parovi ne mogu', () => {
	const r = nadiZamjene([z('a', 'Sinj', ['Split']), z('b', 'Split', ['Omiš']), z('c', 'Omiš', ['Sinj'])]);
	assert.deepEqual(r.lanci, [{ clanovi: ['a', 'b', 'c'] }]);
});

test('svi žele u Split, a iz Splita nitko: nema zamjene', () => {
	const r = nadiZamjene([z('a', 'Imotski', ['Split']), z('b', 'Sinj', ['Split']), z('c', 'Vis', ['Split', 'Solin'])]);
	assert.deepEqual(r.lanci, []);
	assert.deepEqual(r.bezZamjene, ['a', 'b', 'c']);
});

test('uvjet je isti predmet i ista satnica', () => {
	const a = z('a', 'Imotski', ['Split']);
	assert.equal(mozeNaMjesto(a, z('b', 'Split', ['Imotski'])), true);
	assert.equal(mozeNaMjesto(a, z('b', 'Split', ['Imotski'], { predmet: 'Fizika' })), false);
	assert.equal(mozeNaMjesto(a, z('b', 'Split', ['Imotski'], { sati: 10 })), false);
	assert.equal(mozeNaMjesto(a, z('b', 'Sinj', ['Imotski'])), false);
	assert.deepEqual(nadiZamjene([a, z('b', 'Split', ['Imotski'], { sati: 10 })]).lanci, []);
});

test('nema zamjene unutar iste škole', () => {
	const r = nadiZamjene([z('a', 'Split', ['Split'], { skola: 'ista' }), z('b', 'Split', ['Split'], { skola: 'ista' })]);
	assert.deepEqual(r.lanci, []);
});

test('svatko dobiva najdraže mjesto koje je moguće', () => {
	// a najviše želi Split, pa Solin. b (Split) i c (Solin) oboje žele u Imotski.
	const r = nadiZamjene([z('a', 'Imotski', ['Split', 'Solin']), z('b', 'Split', ['Imotski']), z('c', 'Solin', ['Imotski'])]);
	assert.deepEqual(r.lanci, [{ clanovi: ['a', 'b'] }]);
	assert.deepEqual(r.bezZamjene, ['c']);
});

test('kad najdraže mjesto ode u drugi lanac, osoba pokazuje na sljedeće', () => {
	const r = nadiZamjene([
		z('a', 'Imotski', ['Split']),
		z('b', 'Split', ['Imotski']),
		z('c', 'Sinj', ['Split', 'Omiš']),
		z('d', 'Omiš', ['Sinj']),
	]);
	assert.deepEqual(r.lanci, [{ clanovi: ['a', 'b'] }, { clanovi: ['c', 'd'] }]);
});

test('ishod ne ovisi o redoslijedu ulaza', () => {
	const zahtjevi = [
		z('a', 'Sinj', ['Split']),
		z('b', 'Split', ['Omiš', 'Sinj']),
		z('c', 'Omiš', ['Sinj']),
		z('d', 'Imotski', ['Split']),
		z('e', 'Split', ['Imotski'], { predmet: 'Fizika' }),
	];
	assert.deepEqual(nadiZamjene([...zahtjevi].reverse()), nadiZamjene(zahtjevi));
});

test('oznaka lanca ne ovisi o tome od koga se krene', () => {
	assert.equal(kljucLanca(['c', 'a', 'b']), 'a>b>c');
	assert.equal(kljucLanca(['b', 'c', 'a']), 'a>b>c');
	assert.notEqual(kljucLanca(['a', 'c', 'b']), 'a>b>c');
});

test('dva zahtjeva iste osobe zaustavljaju izračun', () => {
	assert.throws(() => nadiZamjene([z('a', 'Sinj', ['Split']), z('a', 'Split', ['Sinj'])]), /više od jednog/);
});
