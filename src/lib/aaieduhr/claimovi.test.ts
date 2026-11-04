// Pokretanje: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aaiOsoba, prviString } from './claimovi.ts';

test('prviString: string, niz, prazno', () => {
	assert.equal(prviString(' a '), 'a');
	assert.equal(prviString(['', ' ', 'b', 'c']), 'b');
	assert.equal(prviString([]), null);
	assert.equal(prviString(''), null);
	assert.equal(prviString(42), null);
	assert.equal(prviString(null), null);
});

test('id_token ima prednost pred userinfom', () => {
	const o = aaiOsoba({ sub: 's', givenName: 'Iz tokena' }, { sub: 's', givenName: 'Iz userinfa', sn: 'Prezime' });
	assert.equal(o.ime, 'Iz tokena');
	assert.equal(o.prezime, 'Prezime');
});

test('userinfo s drugim sub-om se odbacuje', () => {
	const o = aaiOsoba({ sub: 's' }, { sub: 'netko-drugi', givenName: 'Uljez', hrEduPersonPersistentID: 'x' });
	assert.equal(o.ime, null);
	assert.equal(o.identitet, 's');
	assert.equal(o.identitetIzvor, 'sub');
	assert.match(o.kljucevi, /;ui-odbacen:/);
});

test('bez persistentID-a identitet je sub; bez oba nema identiteta', () => {
	assert.equal(aaiOsoba({ sub: 's' }, null).identitet, 's');
	const prazno = aaiOsoba({}, null);
	assert.equal(prazno.identitet, null);
	assert.equal(prazno.identitetIzvor, 'none');
});

test('OIDC standardni nazivi kao rezerva', () => {
	const o = aaiOsoba({ sub: 's', given_name: 'Ana', family_name: ['Kovač'] }, null);
	assert.equal(o.ime, 'Ana');
	assert.equal(o.prezime, 'Kovač');
});
