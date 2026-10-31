// Pokretanje: npm test   (node --test, bez dodatnih paketa)

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bodovi, poredak } from './bodovi.ts';
import { SDZ_2025, V0_NACRT, type Osoba } from './kriteriji.ts';

const nula: Osoba = {
	stazUObrazovanju: 0,
	stazIzvanObrazovanja: 0,
	dob: 0,
	uzdrzavaniClanovi: 0,
	samohraniIliSamac: false,
	dijeteSTeskocama: false,
	invaliditet: false,
	prethodniViskovi: 0,
	napredovanje: 'nema',
};
const osoba = (o: Partial<Osoba>): Osoba => ({ ...nula, ...o });

test('SDŽ: osoba od 42 godine dobije 84 boda samo za dob (primjer s OŠ liste, 84 od 109)', () => {
	const r = bodovi(osoba({ dob: 42, stazUObrazovanju: 12, uzdrzavaniClanovi: 1 }), SDZ_2025);
	assert.equal(r.stavke.find((s) => s.kljuc === 'dob')?.bodova, 84);
	assert.equal(r.ukupno, 109);
});

test('v0: ista osoba dobije 42 za dob, dakle 67 ukupno', () => {
	const r = bodovi(osoba({ dob: 42, stazUObrazovanju: 12, uzdrzavaniClanovi: 1 }), V0_NACRT);
	assert.equal(r.ukupno, 42 + 24 + 1);
});

test('v0: svi kriteriji zajedno', () => {
	const r = bodovi(
		osoba({
			stazUObrazovanju: 10,
			stazIzvanObrazovanja: 3,
			dob: 40,
			uzdrzavaniClanovi: 2,
			samohraniIliSamac: true,
			dijeteSTeskocama: true,
			invaliditet: true,
			prethodniViskovi: 2,
			napredovanje: 'savjetnik',
		}),
		V0_NACRT,
	);
	assert.equal(r.ukupno, 20 + 3 + 40 + 2 + 2 + 2 + 2 + 2 + 10);
});

test('nenavršene godine se ne broje', () => {
	assert.equal(bodovi(osoba({ stazUObrazovanju: 9.9 }), V0_NACRT).ukupno, 18);
});

test('negativan ili neispravan unos baca grešku umjesto tihog krivog zbroja', () => {
	assert.throws(() => bodovi(osoba({ dob: -1 }), V0_NACRT), RangeError);
	assert.throws(() => bodovi(osoba({ dob: Number.NaN }), V0_NACRT), RangeError);
});

test('poredak: više bodova ide naprijed', () => {
	const p = poredak(
		[
			{ id: 'a', osoba: osoba({ dob: 30 }) },
			{ id: 'b', osoba: osoba({ dob: 50 }) },
		],
		V0_NACRT,
	);
	assert.deepEqual(p.map((k) => [k.id, k.mjesto]), [['b', 1], ['a', 2]]);
});

test('poredak: kod jednakih bodova prednost ima dulji staž u obrazovanju', () => {
	// a: 10 god. staža (20) + 30 god. = 50; b: 5 god. staža (10) + 40 god. = 50
	const p = poredak(
		[
			{ id: 'b', osoba: osoba({ stazUObrazovanju: 5, dob: 40 }) },
			{ id: 'a', osoba: osoba({ stazUObrazovanju: 10, dob: 30 }) },
		],
		V0_NACRT,
	);
	assert.equal(p[0].rezultat.ukupno, p[1].rezultat.ukupno);
	assert.equal(p[0].id, 'a');
});

test('poredak je determinističan neovisno o redoslijedu ulaza', () => {
	const k = [
		{ id: 'x', osoba: osoba({ dob: 40 }) },
		{ id: 'y', osoba: osoba({ dob: 40 }) },
		{ id: 'z', osoba: osoba({ dob: 41 }) },
	];
	const prvi = poredak(k, V0_NACRT).map((m) => m.id);
	const drugi = poredak([...k].reverse(), V0_NACRT).map((m) => m.id);
	assert.deepEqual(prvi, drugi);
	assert.deepEqual(prvi, ['z', 'x', 'y']);
});

test('potpuno izjednačeni se označavaju za ručnu provjeru, ostali ne', () => {
	const p = poredak(
		[
			{ id: 'x', osoba: osoba({ dob: 40 }) },
			{ id: 'y', osoba: osoba({ dob: 40 }) },
			{ id: 'z', osoba: osoba({ dob: 41 }) },
		],
		V0_NACRT,
	);
	assert.deepEqual(p.map((m) => [m.id, m.zaRucnuProvjeru]), [['z', false], ['x', true], ['y', true]]);
});
