// Cijeli OIDC tok (authorize → token → id_token → userinfo) protiv lažnog IdP-a.
// Pokretanje: npm test
import { after, before, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import * as jose from 'jose';
import { authorizeUrl, dohvatiUserinfo, provjeriIdToken, zaboraviOtkrivanje, zamijeniKod, type OidcPostavke } from './klijent.ts';
import { pokreniLazniIdp, type LazniIdp } from './lazni-idp.ts';
import { aaiOsoba, AAI_SCOPEOVI } from '../aaieduhr/claimovi.ts';
import { randomBase64url } from '../certilia/crypto.ts';

const CLIENT = { clientId: 'e-satnica-test', clientSecret: 'tajna', redirectUri: 'https://e-satnica.test/auth/aaieduhr/callback' };

// Oblik kakav očekujemo od skole.hr: LDAP atributi kao nizovi, persistentID kao string.
const UCITELJICA = {
	sub: 'abc123@skole.hr',
	hrEduPersonPersistentID: 'f00ba4@skole.hr',
	hrEduPersonPrimaryAffiliation: ['djelatnik'],
	givenName: ['Ana'],
	sn: ['Horvat'],
};

/** Prođe tok kao što ga prolaze /auth/aaieduhr/start i /callback. */
async function prijava(idp: LazniIdp, p: OidcPostavke, izmjena: { verifier?: string; nonce?: string } = {}) {
	const state = randomBase64url(32);
	const nonce = randomBase64url(32);
	const codeVerifier = randomBase64url(64);
	const url = await authorizeUrl(p, { state, nonce, codeVerifier, scope: AAI_SCOPEOVI.join(' ') });
	const povratak = await idp.prijavi(url);
	assert.equal(povratak.state, state);
	const tokeni = await zamijeniKod(p, { code: povratak.code, codeVerifier: izmjena.verifier ?? codeVerifier });
	assert.ok(tokeni.id_token);
	const payload = await provjeriIdToken(p, tokeni.id_token, izmjena.nonce ?? nonce);
	const userinfo = await dohvatiUserinfo(p, tokeni.access_token);
	return { url, payload, userinfo, code: povratak.code, codeVerifier };
}

describe('OIDC tok protiv lažnog IdP-a', () => {
	let idp: LazniIdp;
	let p: OidcPostavke;

	before(async () => {
		idp = await pokreniLazniIdp({ ...CLIENT, korisnik: UCITELJICA, uIdTokenu: ['sub'] });
		p = { ...CLIENT, discoveryUrl: idp.discoveryUrl, algoritmi: ['RS256'] };
	});
	after(() => idp.zatvori());
	beforeEach(() => zaboraviOtkrivanje());

	test('authorize URL nosi PKCE S256, state, nonce i samo tražene scopeove', async () => {
		const { url } = await prijava(idp, p);
		const q = new URL(url).searchParams;
		assert.equal(q.get('code_challenge_method'), 'S256');
		assert.equal(q.get('scope'), 'openid hrEduPersonPersistentID hrEduPersonPrimaryAffiliation givenName sn');
		assert.equal(q.get('redirect_uri'), CLIENT.redirectUri);
		assert.ok(!q.get('scope')!.includes('OIB'), 'OIB se ne traži');
	});

	test('atributi samo na userinfo: osoba se sastavi iz oba izvora', async () => {
		const { payload, userinfo } = await prijava(idp, p);
		assert.equal(payload.givenName, undefined, 'id_token nema atribute u ovom scenariju');
		const o = aaiOsoba(payload, userinfo);
		assert.equal(o.identitet, 'f00ba4@skole.hr');
		assert.equal(o.identitetIzvor, 'hrEduPersonPersistentID');
		assert.equal(o.ime, 'Ana');
		assert.equal(o.prezime, 'Horvat');
		assert.equal(o.povezanost, 'djelatnik');
		assert.match(o.kljucevi, /^id:.*sub.*;ui:.*givenName/);
		assert.ok(!o.kljucevi.includes('Horvat'), 'ključevi bez vrijednosti');
	});

	test('krivi code_verifier: IdP odbije zamjenu koda', async () => {
		await assert.rejects(prijava(idp, p, { verifier: randomBase64url(64) }), /token_exchange_failed/);
	});

	test('kod je jednokratan', async () => {
		const { code, codeVerifier } = await prijava(idp, p);
		await assert.rejects(zamijeniKod(p, { code, codeVerifier }), /token_exchange_failed/);
	});

	test('krivi nonce: token se odbije', async () => {
		await assert.rejects(prijava(idp, p, { nonce: 'nije-taj' }), /nonce_mismatch/);
	});

	test('krivi client secret: zamjena ne prolazi', async () => {
		await assert.rejects(prijava(idp, { ...p, clientSecret: 'kriva' }), /token_exchange_failed/);
	});

	test('token potpisan tuđim ključem se odbije', async () => {
		const { privateKey } = await jose.generateKeyPair('RS256');
		const lazan = await new jose.SignJWT({ nonce: 'n' })
			.setProtectedHeader({ alg: 'RS256', kid: 'k1' })
			.setIssuer(idp.issuer)
			.setAudience(CLIENT.clientId)
			.setExpirationTime('5m')
			.sign(privateKey);
		// Isti kid kao pravi ključ (pa potpis ne prolazi) ili nepoznat kid (pa ključa nema): oboje se odbija.
		await assert.rejects(provjeriIdToken(p, lazan, 'n'), (e: Error) => /^JWKSNoMatchingKey|^JWSSignatureVerificationFailed/.test(e.name));
	});

	test('token za drugu aplikaciju (aud) se odbije', async () => {
		const token = await idp.potpisi({ nonce: 'n', aud: 'druga-aplikacija' });
		await assert.rejects(provjeriIdToken(p, token, 'n'), (e: Error) => e.name === 'JWTClaimValidationFailed');
	});

	test('userinfo s neispravnim tokenom vraća null, prijava ne puca', async () => {
		assert.equal(await dohvatiUserinfo(p, 'nepostojeci'), null);
		assert.equal(await dohvatiUserinfo(p, undefined), null);
	});
});

describe('atributi u id_tokenu kao stringovi', () => {
	test('isti rezultat kad sve stiže u id_tokenu', async () => {
		const idp = await pokreniLazniIdp({
			...CLIENT,
			korisnik: { sub: 's1', hrEduPersonPersistentID: 'p1', givenName: 'Ivo', sn: 'Ivić', hrEduPersonPrimaryAffiliation: 'djelatnik' },
		});
		zaboraviOtkrivanje();
		try {
			const p = { ...CLIENT, discoveryUrl: idp.discoveryUrl };
			const { payload, userinfo } = await prijava(idp, p);
			const o = aaiOsoba(payload, userinfo);
			assert.deepEqual([o.identitet, o.ime, o.prezime, o.povezanost], ['p1', 'Ivo', 'Ivić', 'djelatnik']);
		} finally {
			await idp.zatvori();
		}
	});
});
