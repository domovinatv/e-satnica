// Pokretanje: npm test   (node --test, bez dodatnih paketa)

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { norma, uRadnoVrijeme } from '../norme.ts';
import { napraviUdaljenost } from '../udaljenost.ts';
import { jeZavrsno, kasnaPrijava, provjeriPut, smije, STANJA, type Prijelaz, type Stanje } from './stanja.ts';

const put = (...koraci: [Stanje, string][]): Prijelaz[] =>
	koraci.map(([u, vrijeme], i) => ({ iz: i === 0 ? null : koraci[i - 1][0], u, vrijeme }));

test('redoviti put: nastali, prijavljeni, ponuđeni, dodijeljeni', () => {
	assert.deepEqual(
		provjeriPut(put(['nastali', '2026-06-01'], ['prijavljeni', '2026-06-20'], ['ponudeni', '2026-07-20'], ['dodijeljeni', '2026-08-15'])),
		[],
	);
});

test('hitni put vodi preko 60 dana natrag u prijavu', () => {
	assert.deepEqual(
		provjeriPut(
			put(
				['nastali', '2026-09-28'],
				['hitno', '2026-09-28'],
				['dana60', '2026-09-30'],
				['prijavljeni', '2026-11-05'],
				['ponudeni', '2026-11-08'],
				['natjecaj', '2026-11-10'],
			),
		),
		[],
	);
});

test('nedopušten prijelaz, prekinut put i vrijeme unatrag su greške', () => {
	assert.match(provjeriPut(put(['nastali', '2026-06-01'], ['dodijeljeni', '2026-06-02']))[0], /nije dopušten/);
	assert.match(provjeriPut([{ iz: null, u: 'prijavljeni', vrijeme: '2026-06-01' }])[0], /početi nastankom/);
	assert.match(provjeriPut(put(['nastali', '2026-06-10'], ['prijavljeni', '2026-06-01']))[0], /unatrag/);
	const prekinut: Prijelaz[] = [
		{ iz: null, u: 'nastali', vrijeme: '2026-06-01' },
		{ iz: 'ponudeni', u: 'dodijeljeni', vrijeme: '2026-06-02' },
	];
	assert.match(provjeriPut(prekinut)[0], /prethodno stanje/);
	assert.deepEqual(provjeriPut([]), ['put je prazan']);
});

test('iz završnih stanja nema dalje, a odbijeni sati ne mogu na natječaj', () => {
	assert.equal(jeZavrsno('dodijeljeni'), true);
	assert.equal(jeZavrsno('odbijeni'), true);
	assert.equal(jeZavrsno('natjecaj'), false);
	assert.equal(smije('odbijeni', 'natjecaj'), false);
	assert.equal(smije('prijavljeni', 'natjecaj'), false);
	for (const stanje of Object.keys(STANJA) as Stanje[]) assert.equal(smije(stanje, 'nastali'), false);
});

test('kasna prijava: poznato do roka, prijavljeno nakon njega', () => {
	const rok = '2026-07-15';
	assert.equal(kasnaPrijava('2026-06-10', '2026-09-03T09:12', rok), true);
	assert.equal(kasnaPrijava('2026-06-10', '2026-07-15T23:00', rok), false);
	assert.equal(kasnaPrijava('2026-10-02', '2026-10-05', rok), false, 'nastalo nakon roka nije kasna prijava');
	assert.equal(kasnaPrijava('2026-06-10', null, rok), false);
});

test('norma i preračun u radno vrijeme od 40 sati', () => {
	assert.equal(norma('Hrvatski jezik'), 20);
	assert.equal(norma('Povijest'), 22);
	assert.equal(uRadnoVrijeme(22, 'Povijest'), 40);
	assert.equal(uRadnoVrijeme(11, 'Povijest'), 20);
	assert.equal(uRadnoVrijeme(5, 'Hrvatski jezik'), 10);
	assert.throws(() => uRadnoVrijeme(-1, 'Povijest'), RangeError);
});

test('udaljenost je simetrična, isto mjesto je 0 km, a bez dionice nema veze', () => {
	const u = napraviUdaljenost([{ od: 'Split', do: 'Sinj', km: 35 }]);
	assert.equal(u('Split', 'Sinj'), 35);
	assert.equal(u('Sinj', 'Split'), 35);
	assert.equal(u('Split', 'Split'), 0);
	assert.equal(u('Split', 'Vis'), null);
	assert.throws(() => napraviUdaljenost([{ od: 'a', do: 'b', km: -1 }]), RangeError);
});
