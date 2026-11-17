// Pokretanje: npm test   (node --test, bez dodatnih paketa)

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { V0_NACRT, type Osoba } from '../bodovanje/kriteriji.ts';
import { napraviUdaljenost } from '../udaljenost.ts';
import { provjeri, raspodijeli, redPrednosti, type Postavke, type Potreba, type Sudionik, type ZahtjevZaMjesto } from './raspodjela.ts';

const nula: Osoba = {
	stazUObrazovanju: 0,
	stazIzvanObrazovanja: 0,
	dob: 30,
	uzdrzavaniClanovi: 0,
	samohraniIliSamac: false,
	dijeteSTeskocama: false,
	invaliditet: false,
	prethodniViskovi: 0,
	napredovanje: 'nema',
};

/** Osoba kojoj je staž jedina razlika: više staža, više bodova. */
const s = (id: string, staz: number, o: Partial<Sudionik> = {}): Sudionik => ({
	id,
	osoba: { ...nula, stazUObrazovanju: staz },
	predmet: 'Povijest',
	norma: 22,
	mjesto: 'Split',
	doKm: 50,
	zadrzanoSati: 0,
	visakSati: 0,
	skole: [],
	...o,
});

const x = (id: string, sati: number, o: Partial<Potreba> = {}): Potreba => ({
	id,
	skola: `skola-${id}`,
	mjesto: 'Split',
	predmet: 'Povijest',
	sati,
	ugovor: 'neodredeno',
	...o,
});

const udaljenost = napraviUdaljenost([
	{ od: 'Split', do: 'Solin', km: 8 },
	{ od: 'Split', do: 'Omiš', km: 26 },
	{ od: 'Split', do: 'Sinj', km: 35 },
	{ od: 'Split', do: 'Imotski', km: 82 },
	{ od: 'Solin', do: 'Sinj', km: 30 },
]);
const p: Postavke = { tablica: V0_NACRT, udaljenost };

const sveProslo = (sudionici: Sudionik[], potrebe: Potreba[], postavke = p) => {
	const r = raspodijeli(sudionici, potrebe, postavke);
	const pale = provjeri(sudionici, potrebe, postavke, r).filter((c) => !c.ok);
	assert.deepEqual(pale, [], 'provjera izlaza mora proći');
	return r;
};

test('višak ide prije nadopune, bez obzira na bodove', () => {
	const sudionici = [s('nepuna', 30, { zadrzanoSati: 10 }), s('visak', 2, { visakSati: 22 })];
	const r = sveProslo(sudionici, [x('P1', 22)]);
	assert.deepEqual(
		r.dodjele.map((d) => [d.osoba, d.sati, d.korak]),
		[['visak', 22, 1]],
	);
	assert.deepEqual(r.bezSati, [{ osoba: 'nepuna', korak: 2, nedostaje: 12, razlog: 'podijeljeno_prije' }]);
});

test('unutar koraka bira osoba s više bodova, a ostatak ide sljedećoj', () => {
	const sudionici = [s('manje', 5, { zadrzanoSati: 12 }), s('vise', 20, { zadrzanoSati: 16 })];
	const r = sveProslo(sudionici, [x('P1', 8)]);
	assert.deepEqual(
		r.dodjele.map((d) => [d.osoba, d.sati]),
		[
			['vise', 6],
			['manje', 2],
		],
	);
	assert.equal(r.satnica.vise.poslije, 22);
	assert.equal(r.satnica.manje.poslije, 14);
	assert.deepEqual(r.ostatak, []);
});

test('što nitko ne može uzeti, ide na natječaj', () => {
	const r = sveProslo([s('a', 10, { zadrzanoSati: 20 })], [x('P1', 6), x('P2', 4, { predmet: 'Fizika' })]);
	assert.deepEqual(r.ostatak, [
		{ potreba: 'P1', sati: 4 },
		{ potreba: 'P2', sati: 4 },
	]);
});

test('preko 50 km cestom osoba ne mora, pa sati ostaju', () => {
	const r = sveProslo([s('a', 10, { visakSati: 22 })], [x('P1', 22, { mjesto: 'Imotski' })]);
	assert.deepEqual(r.dodjele, []);
	assert.deepEqual(r.bezSati, [{ osoba: 'a', korak: 1, nedostaje: 22, razlog: 'predaleko' }]);
});

test('tko želi dalje od 50 km, može; manja želja od 50 km se ne uvažava', () => {
	const daleko = sveProslo([s('a', 10, { visakSati: 22, doKm: 90 })], [x('P1', 22, { mjesto: 'Imotski' })]);
	assert.equal(daleko.dodjele[0].km, 82);
	const blizu = sveProslo([s('a', 10, { visakSati: 22, doKm: 10 })], [x('P1', 22, { mjesto: 'Sinj' })]);
	assert.equal(blizu.dodjele[0].km, 35);
});

test('bez cestovne veze (otok) nema dodjele', () => {
	const r = sveProslo([s('a', 10, { visakSati: 22, mjesto: 'Vis' })], [x('P1', 22)]);
	assert.deepEqual(r.dodjele, []);
	assert.equal(r.bezSati[0].razlog, 'predaleko');
});

test('razlog razlikuje „nema predmeta" od „predaleko"', () => {
	const r = sveProslo([s('a', 10, { visakSati: 22, predmet: 'Latinski jezik' })], [x('P1', 22)]);
	assert.equal(r.bezSati[0].razlog, 'nema_sati_predmeta');
});

test('osoba bira: prvo neodređeno, pa bliže, pa više sati', () => {
	const potrebe = [
		x('daleko', 4, { mjesto: 'Sinj' }),
		x('odredeno', 4, { ugovor: 'odredeno' }),
		x('blizu', 4, { mjesto: 'Solin' }),
		x('isto-mjesto', 4),
	];
	const r = sveProslo([s('a', 10, { zadrzanoSati: 8 })], potrebe);
	assert.deepEqual(
		r.dodjele.map((d) => d.potreba),
		['isto-mjesto', 'blizu', 'daleko', 'odredeno'],
	);
	assert.equal(r.dodjele[3].sati, 2);
});

test('višak dobiva najviše onoliko sati koliko je izgubio', () => {
	const r = sveProslo([s('a', 10, { zadrzanoSati: 6, visakSati: 6 })], [x('P1', 22)]);
	assert.deepEqual(
		r.dodjele.map((d) => [d.korak, d.sati]),
		[
			[1, 6],
			[2, 10],
		],
	);
	assert.equal(r.satnica.a.poslije, 22);
});

test('prednost unutar škole (pitanje 17) mijenja tko dobiva sate', () => {
	const sudionici = [s('iz-skole', 3, { zadrzanoSati: 20, skole: ['skola-P1'] }), s('s-liste', 25, { zadrzanoSati: 20 })];
	const potrebe = [x('P1', 2)];
	assert.equal(sveProslo(sudionici, potrebe).dodjele[0].osoba, 's-liste');
	const uz = sveProslo(sudionici, potrebe, { ...p, prednostUnutarSkole: true });
	assert.equal(uz.dodjele[0].osoba, 'iz-skole');
	assert.equal(uz.dodjele[0].unutarSkole, true);
});

test('isti ulaz daje isti izlaz, i kad su podaci zadani drugim redom', () => {
	const sudionici = [
		s('a', 12, { zadrzanoSati: 10 }),
		s('b', 12, { zadrzanoSati: 10 }),
		s('c', 4, { visakSati: 11, zadrzanoSati: 11, mjesto: 'Solin' }),
		s('d', 30, { zadrzanoSati: 18, mjesto: 'Sinj' }),
	];
	const potrebe = [x('P1', 9), x('P2', 7, { mjesto: 'Solin' }), x('P3', 5, { mjesto: 'Sinj', ugovor: 'odredeno' })];
	const prvi = raspodijeli(sudionici, potrebe, p);
	const drugi = raspodijeli([...sudionici].reverse(), [...potrebe].reverse(), p);
	assert.deepEqual(drugi.dodjele, prvi.dodjele);
	assert.deepEqual(drugi.ostatak, prvi.ostatak);
	assert.deepEqual(drugi.bezSati, prvi.bezSati);
	// a i b su izjednačeni po svemu: poredak odlučuje samo oznaka, pa idu na ručnu provjeru.
	assert.deepEqual(
		prvi.lista.filter((m) => m.zaRucnuProvjeru).map((m) => m.id),
		['a', 'b'],
	);
});

test('neispravan ulaz zaustavlja izračun', () => {
	assert.throws(() => raspodijeli([s('a', 1, { zadrzanoSati: -1 })], [], p), RangeError);
	assert.throws(() => raspodijeli([s('a', 1, { zadrzanoSati: 20, visakSati: 5 })], [], p), /prelaze normu/);
	assert.throws(() => raspodijeli([s('a', 1), s('a', 2)], [], p), /dvaput/);
	assert.throws(() => raspodijeli([], [x('P1', 0)], p), RangeError);
});

test('provjera izlaza hvata podmetnutu dodjelu', () => {
	const sudionici = [s('vise', 20, { zadrzanoSati: 16 }), s('manje', 5, { zadrzanoSati: 16 })];
	const potrebe = [x('P1', 6)];
	const r = raspodijeli(sudionici, potrebe, p);
	const podmetnuto = { ...r, dodjele: [{ potreba: 'P1', osoba: 'manje', sati: 6, korak: 2 as const, km: 0, unutarSkole: false }] };
	const pale = provjeri(sudionici, potrebe, p, podmetnuto).filter((c) => !c.ok);
	assert.equal(pale.length, 1);
	assert.match(pale[0].naziv, /preskočen/);
});

test('provjera izlaza prolazi na nasumičnim ulazima', () => {
	// Mali deterministički generator, da test uvijek provjerava iste slučajeve.
	let stanje = 20261115;
	const slucajno = (n: number): number => {
		stanje = (stanje * 1103515245 + 12345) % 2147483648;
		return stanje % n;
	};
	const mjesta = ['Split', 'Solin', 'Omiš', 'Sinj', 'Imotski', 'Vis'];
	const predmeti = ['Povijest', 'Fizika'];
	for (let krug = 0; krug < 200; krug++) {
		const sudionici = Array.from({ length: 1 + slucajno(8) }, (_, i) => {
			const visak = slucajno(3) === 0 ? 1 + slucajno(22) : 0;
			return s(`o${i}`, slucajno(6), {
				predmet: predmeti[slucajno(2)],
				mjesto: mjesta[slucajno(mjesta.length)],
				doKm: slucajno(2) === 0 ? 50 : 100,
				visakSati: visak,
				zadrzanoSati: slucajno(22 - visak + 1),
				skole: slucajno(2) === 0 ? ['skola-p0'] : [],
				zelje: slucajno(2) === 0 ? [mjesta[slucajno(mjesta.length)], mjesta[slucajno(mjesta.length)]] : undefined,
			});
		});
		const potrebe = Array.from({ length: slucajno(7) }, (_, i) =>
			x(`p${i}`, 1 + slucajno(22), {
				predmet: predmeti[slucajno(2)],
				mjesto: mjesta[slucajno(mjesta.length)],
				ugovor: slucajno(2) === 0 ? 'neodredeno' : 'odredeno',
			}),
		);
		const zamjene: ZahtjevZaMjesto[] = Array.from({ length: slucajno(4) }, (_, i) => ({
			osoba: `z${i}`,
			zaposlenje: `Z${i}`,
			skola: `skola-z${i}`,
			mjesto: mjesta[slucajno(mjesta.length)],
			predmet: predmeti[slucajno(2)],
			sati: 1 + slucajno(22),
			ugovor: 'neodredeno',
			zeli: [mjesta[slucajno(mjesta.length)], mjesta[slucajno(mjesta.length)]],
		}));
		for (const prednostUnutarSkole of [false, true]) sveProslo(sudionici, potrebe, { ...p, prednostUnutarSkole, zamjene });
	}
});

test('red prednosti: nezbrinuti višak, pa nepuna satnica, pa kandidati izvana', () => {
	const kandidati = [
		{ s: s('izvana', 40), sati: 0, neplasiranVisak: 0, izvana: true },
		{ s: s('nepuna', 10, { zadrzanoSati: 12 }), sati: 12, neplasiranVisak: 0, izvana: false },
		{ s: s('visak', 1), sati: 0, neplasiranVisak: 22, izvana: false },
		{ s: s('puna', 30, { zadrzanoSati: 22 }), sati: 22, neplasiranVisak: 0, izvana: false },
		{ s: s('drugi-predmet', 30, { predmet: 'Fizika' }), sati: 0, neplasiranVisak: 0, izvana: true },
		{ s: s('predaleko', 30, { mjesto: 'Imotski' }), sati: 0, neplasiranVisak: 0, izvana: true },
	];
	const red = redPrednosti(x('P1', 6), kandidati, p);
	assert.deepEqual(
		red.map((u) => [u.osoba, u.skupina, u.nedostaje]),
		[
			['visak', 1, 22],
			['nepuna', 2, 10],
			['izvana', 4, 22],
		],
	);
});

test('osoba bira prvo mjesta iz svojih želja, tim redom', () => {
	const r = sveProslo([s('a', 10, { zadrzanoSati: 14, zelje: ['Sinj', 'Omiš'] })], [x('split', 4), x('sinj', 4, { mjesto: 'Sinj' }), x('omis', 4, { mjesto: 'Omiš' })]);
	assert.deepEqual(
		r.dodjele.map((d) => d.potreba),
		['sinj', 'omis'],
	);
	assert.deepEqual(r.ostatak, [{ potreba: 'split', sati: 4 }]);
});

const selidba = (o: Partial<ZahtjevZaMjesto> = {}): ZahtjevZaMjesto => ({
	osoba: 'selidba',
	zaposlenje: 'Z1',
	skola: 'skola-vis',
	mjesto: 'Vis',
	predmet: 'Povijest',
	sati: 8,
	ugovor: 'neodredeno',
	zeli: ['Split'],
	...o,
});

test('korak 3: zamjena na slobodno mjesto, a napušteno mjesto prvo dobiva višak', () => {
	const visak = s('visak', 20, { mjesto: 'Vis', visakSati: 8, zadrzanoSati: 14 });
	const r = sveProslo([visak], [x('P1', 8)], { ...p, zamjene: [selidba()] });
	assert.deepEqual(
		r.dodjele.map((d) => [d.osoba, d.potreba, d.korak]),
		[
			['selidba', 'P1', 3],
			['visak', 'M-Z1', 1],
		],
	);
	assert.deepEqual(r.ostatak, []);
	assert.deepEqual(r.bezSati, []);
});

test('korak 3: bez iste satnice nema zamjene, a osoba ne dobiva natrag svoje mjesto', () => {
	const bez = sveProslo([], [x('P1', 8)], { ...p, zamjene: [selidba({ sati: 10 })] });
	assert.deepEqual(bez.dodjele, []);
	const naListi = s('selidba', 5, { mjesto: 'Vis', zadrzanoSati: 8, skole: ['skola-vis'] });
	const r = sveProslo([naListi], [x('P1', 8)], { ...p, zamjene: [selidba()] });
	assert.deepEqual(
		r.dodjele.map((d) => [d.potreba, d.korak]),
		[['P1', 3]],
	);
	assert.deepEqual(r.ostatak, [{ potreba: 'M-Z1', sati: 8 }]);
	assert.equal(r.satnica.selidba.poslije, 8);
});

test('korak 3: lanac zamjena kroz više slobodnih mjesta', () => {
	// Split je slobodan; Solin bi u Split, a Sinj u Solin. Na kraju je slobodan Sinj.
	const zamjene = [
		selidba({ osoba: 'iz-solina', zaposlenje: 'A', skola: 'skola-solin', mjesto: 'Solin', zeli: ['Split'] }),
		selidba({ osoba: 'iz-sinja', zaposlenje: 'B', skola: 'skola-sinj', mjesto: 'Sinj', zeli: ['Solin'] }),
	];
	const r = sveProslo([], [x('P1', 8)], { ...p, zamjene });
	assert.deepEqual(
		r.dodjele.map((d) => [d.osoba, d.potreba]),
		[
			['iz-solina', 'P1'],
			['iz-sinja', 'M-A'],
		],
	);
	assert.deepEqual(r.ostatak, [{ potreba: 'M-B', sati: 8 }]);
});
