// Pokretanje: npm test   (node --test, bez dodatnih paketa)

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RADNJE, radnjeZa, type Radnja } from './radnje.ts';
import { PRIJELAZI, smije, STANJA, type Stanje } from './stanja.ts';

test('svaka radnja vodi prijelazom koji stroj stanja dopušta', () => {
	for (const [radnja, opis] of Object.entries(RADNJE)) {
		if (opis.u !== null) assert.equal(smije(opis.iz, opis.u), true, `${radnja}: ${opis.iz} → ${opis.u}`);
	}
});

test('svaki prijelaz iz dijagrama netko može pokrenuti', () => {
	// Prva prijava i hitan slučaj nastaju unosom novih sati, a na natječaj sate šalje
	// sustav kad nitko s liste ne ispunjava uvjete; za ostalo postoji radnja.
	const bezRadnje = new Set(['nastali>prijavljeni', 'nastali>hitno', 'ponudeni>natjecaj']);
	const pokriveno = new Set(Object.values(RADNJE).map((o) => `${o.iz}>${o.u}`));
	for (const iz of Object.keys(STANJA) as Stanje[]) {
		for (const u of Object.keys(PRIJELAZI[iz])) {
			const kljuc = `${iz}>${u}`;
			assert.equal(pokriveno.has(kljuc) || bezRadnje.has(kljuc), true, kljuc);
		}
	}
});

test('uloga vidi samo svoje radnje u zadanom stanju', () => {
	const radnje = (stanje: Stanje, uloga: Parameters<typeof radnjeZa>[1]): Radnja[] => radnjeZa(stanje, uloga);
	assert.deepEqual(radnje('prijavljeni', 'povjerenstvo'), ['provjereno', 'odbij']);
	assert.deepEqual(radnje('prijavljeni', 'ravnatelj'), []);
	assert.deepEqual(radnje('hitno', 'ravnatelj'), ['dana60']);
	assert.deepEqual(radnje('dana60', 'ravnatelj'), ['potraje']);
	assert.deepEqual(radnje('ponudeni', 'nastavnik'), ['prihvati', 'ne-zelim']);
	assert.deepEqual(radnje('natjecaj', 'ravnatelj'), ['izbor']);
	assert.deepEqual(radnje('natjecaj', 'povjerenstvo'), []);
	assert.deepEqual(radnje('dodijeljeni', 'ravnatelj'), []);
	assert.deepEqual(radnje('odbijeni', 'povjerenstvo'), []);
});
