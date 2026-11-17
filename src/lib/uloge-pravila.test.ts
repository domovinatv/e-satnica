import { test } from 'node:test';
import assert from 'node:assert/strict';
import { smijeOdluciti, zauzeto } from './uloge-pravila.ts';

const skole = (oznaka: string) => (oznaka === 'N-001' ? ['FIK-01'] : oznaka === 'N-007' ? ['FIK-01', 'FIK-03'] : []);

test('ravnatelja potvrđuje povjerenstvo, a ne drugi ravnatelj', () => {
	assert.equal(smijeOdluciti({ vrsta: 'povjerenstvo', id: '' }, { vrsta: 'ravnatelj', cilj: 'FIK-02' }, skole), true);
	assert.equal(smijeOdluciti({ vrsta: 'ravnatelj', id: 'FIK-01' }, { vrsta: 'ravnatelj', cilj: 'FIK-02' }, skole), false);
});

test('nastavnika potvrđuje ravnatelj škole u kojoj radi', () => {
	assert.equal(smijeOdluciti({ vrsta: 'ravnatelj', id: 'FIK-01' }, { vrsta: 'nastavnik', cilj: 'N-001' }, skole), true);
	assert.equal(smijeOdluciti({ vrsta: 'ravnatelj', id: 'FIK-03' }, { vrsta: 'nastavnik', cilj: 'N-007' }, skole), true);
	assert.equal(smijeOdluciti({ vrsta: 'ravnatelj', id: 'FIK-02' }, { vrsta: 'nastavnik', cilj: 'N-001' }, skole), false);
	assert.equal(smijeOdluciti({ vrsta: 'povjerenstvo', id: '' }, { vrsta: 'nastavnik', cilj: 'N-001' }, skole), false);
});

test('kandidatovu ulogu nitko ne potvrđuje; zauzeta uloga ne može na drugi račun', () => {
	assert.equal(smijeOdluciti({ vrsta: 'povjerenstvo', id: '' }, { vrsta: 'kandidat', cilj: 'K-12' }, skole), false);
	const potvrdeni = [{ vrsta: 'ravnatelj' as const, cilj: 'FIK-01', korisnikId: 1 }];
	assert.equal(zauzeto({ vrsta: 'ravnatelj', cilj: 'FIK-01' }, potvrdeni, 2), true);
	assert.equal(zauzeto({ vrsta: 'ravnatelj', cilj: 'FIK-01' }, potvrdeni, 1), false);
	assert.equal(zauzeto({ vrsta: 'ravnatelj', cilj: 'FIK-02' }, potvrdeni, 2), false);
});
