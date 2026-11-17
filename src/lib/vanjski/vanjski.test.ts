import { test } from 'node:test';
import assert from 'node:assert/strict';
import { kmIzRute, parovi, urlRute } from './osrm.ts';
import { izMedija, jeNatjecaj, urlMedija } from './wordpress.ts';

test('ruta cestom daje zaokružene km, a ruta s trajektom nije cestovna veza', () => {
	const cesta = { code: 'Ok', routes: [{ distance: 27_640, legs: [{ steps: [{ mode: 'driving' }, { mode: 'driving' }] }] }] };
	const trajekt = { code: 'Ok', routes: [{ distance: 61_200, legs: [{ steps: [{ mode: 'driving' }, { mode: 'ferry' }, { mode: 'driving' }] }] }] };
	assert.equal(kmIzRute(cesta), 28);
	assert.equal(kmIzRute(trajekt), null);
	assert.equal(kmIzRute({ code: 'NoRoute' }), null);
	assert.equal(kmIzRute('nije json'), null);
	assert.match(urlRute('https://osrm.test/', { lat: 43.5, lon: 16.44 }, { lat: 43.7, lon: 16.64 }), /^https:\/\/osrm\.test\/route\/v1\/driving\/16\.44000,43\.50000;16\.64000,43\.70000\?overview=false&steps=true$/);
});

test('parovi mjesta: svaki par jednom, bez para mjesta sa samim sobom', () => {
	assert.deepEqual(parovi(['Split', 'Sinj', 'Split', 'Omiš']), [
		['Omiš', 'Sinj'],
		['Omiš', 'Split'],
		['Sinj', 'Split'],
	]);
});

test('uvoz: natječaji da, odluke i obavijesti o izboru ne', () => {
	assert.equal(jeNatjecaj('Natječaj za radno mjesto učitelja/ice matematike'), true);
	assert.equal(jeNatjecaj('NATJEČAJ – spremač/ica'), true);
	assert.equal(jeNatjecaj('Obavijest o izboru kandidata po natječaju'), false);
	assert.equal(jeNatjecaj('Odluka o poništenju natječaja'), false);
	assert.equal(jeNatjecaj('Raspored sati'), false);
	assert.equal(jeNatjecaj('Poziv na testiranje za natječaj listopad 2026'), false);
	assert.equal(jeNatjecaj('Sadržaj i način testiranja za kandidate natječaja'), false);
	assert.equal(jeNatjecaj('Poziv kandidatima na usmenu procjenu natječaji 11.26.'), false);
});

test('uvoz: naslov iz imena datoteke postaje čitljiv', () => {
	const odgovor = [{ date: '2026-11-16T08:00:00', source_url: 'https://os.skole.test/a.pdf', title: { rendered: 'NATJEČAJ+učitelj+ica+MATEMATIKE,+ZAMJENA (1)' }, mime_type: 'application/pdf' }];
	assert.equal(izMedija(odgovor)[0].naslov, 'NATJEČAJ učitelj ica MATEMATIKE, ZAMJENA');
});

test('uvoz: iz odgovora media servisa ostaju samo dokumenti natječaja', () => {
	const odgovor = [
		{ date: '2026-11-10T09:12:00', source_url: 'https://os-primjer.skole.test/wp-content/uploads/natjecaj.pdf', title: { rendered: 'Natje&#269;aj &#8211; u&#269;itelj/ica fizike' }, mime_type: 'application/pdf' },
		{ date: '2026-11-09T09:12:00', source_url: 'https://os-primjer.skole.test/wp-content/uploads/odluka.pdf', title: { rendered: 'Odluka o izboru po natječaju' }, mime_type: 'application/pdf' },
		{ date: '2026-11-08T09:12:00', source_url: 'https://os-primjer.skole.test/wp-content/uploads/slika.jpg', title: { rendered: 'Natječaj' }, mime_type: 'image/jpeg' },
		{ date: 'jučer', source_url: 'https://x.test/a.pdf', title: { rendered: 'Natječaj' } },
		{ date: '2026-11-07', source_url: 'http://nesigurno.test/a.pdf', title: { rendered: 'Natječaj' } },
	];
	assert.deepEqual(izMedija(odgovor), [{ url: 'https://os-primjer.skole.test/wp-content/uploads/natjecaj.pdf', naslov: 'Natječaj – učitelj/ica fizike', objavljeno: '2026-11-10' }]);
	assert.deepEqual(izMedija({ code: 'rest_no_route' }), []);
	assert.match(urlMedija('https://os-primjer.skole.test/', '2026-09-18'), /^https:\/\/os-primjer\.skole\.test\/wp-json\/wp\/v2\/media\?search=natje&.*after=2026-09-18T00:00:00/);
});
