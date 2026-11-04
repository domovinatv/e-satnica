# AAI@EduHr kao drugi način prijave

Istraženo 30. 10. 2026. Upit Srcu poslan 30. 10., odgovor 3. 11. (vidi „Odgovor Srca”). Zahtjev za status partnera podnesen 3. 11., **prihvaćen 4. 11.** (vidi „Stanje”).

Certilia dokazuje da je korisnik stvarni građanin. AAI@EduHr (račun
`ime.prezime@skole.hr`, kojim se učitelji prijavljuju u e-Maticu i e-Dnevnik)
mogao bi dokazati i **da je djelatnik škole i koje**. Za e-satnicu je to bitno:
bodovanje i raspodjela sati odnose se na nastavnike i škole.

## Tko je tko

- **Srce** (Sveučilišni računski centar, sastavnica Sveučilišta u Zagrebu)
  vodi AAI@EduHr kao Koordinator: `login.aaiedu.hr`, Registar resursa,
  odluke o partnerima. Kontakt `aai@srce.hr`.
- **CARNET** (javna ustanova Vlade RH) je matična ustanova za sve
  `@skole.hr` identitete. Osnovne i srednje škole nisu pojedinačne članice
  AAI@EduHr, nego ulaze zajedno kroz CARNET-ov središnji sustav
  (Pravilnik, čl. 23). CARNET radi i e-Maticu.
- Obje su na Josipa Marohnića 5, Zagreb.

## Kako to radi e-Matica

`https://matica.mzom.hr/login` nudi dvije prijave: **NIAS** (e-Građani, u kojem
je Certilia jedan od načina) i **AAI@EduHr** (preusmjerava na
`login.aaiedu.hr`, korisničko ime i lozinka). Provjereno 30. 10. 2026.

U javnom popisu usluga (`aaiedu.hr/usluge/3775`, „e-Matica MZOM") davatelj je
CARNET, protokol SAML, a atributi samo `displayName`, `givenName`, `sn`,
`hrEduPersonOIB` („povezivanje s lokalnim računom") i
`hrEduPersonPersistentID`. Škola i uloga dakle ne dolaze iz AAI-ja nego iz
vlastite baze e-Matice, spojene preko OIB-a.

Starija usluga „e-Matice" (`aaiedu.hr/usluge/147`, CARNET) primala je i
`hrEduPersonRole`, `hrEduPersonStaffCategory`, `hrEduPersonTitle`, `o`,
`hrEduOrgUniqueNumber`. CARNET-ov imenik `@skole.hr` te podatke dakle ima;
pitanje je hoće li ih AAI@EduHr isporučiti nama i koliko su ažurni.

## Tehnika (OIDC)

Iz `https://login.aaiedu.hr/.well-known/openid-configuration`:

- issuer `https://login.aaiedu.hr`, authorization code, PKCE `S256`,
  `claims` parametar, refresh token, backchannel logout
- autentifikacija klijenta `client_secret_basic`, `client_secret_post`, `private_key_jwt`
- ID token RS256

Tok je isti kao za Certiliju (`src/pages/auth/certilia/`), pa se može
proširiti na više davatelja identiteta.

Atributi zanimljivi e-satnici (scope = ime atributa):

| Atribut | Što daje |
|---|---|
| `hrEduPersonPrimaryAffiliation`, `hrEduPersonAffiliation` | djelatnik ili učenik |
| `hrEduPersonStaffCategory`, `hrEduPersonRole` | nastavno ili nenastavno osoblje, uloga (ravnatelj?) |
| `o`, `hrEduPersonHomeOrg`, `hrEduOrgUniqueNumber`, `hrEduOrgType` | škola |
| `hrEduPersonProfessionalStatus`, `hrEduPersonTitle` | zvanje |
| `hrEduPersonOIB`, `givenName`, `sn` | identitet; tražiti samo ako stvarno treba |

## Implementacija (4. 11. 2026., prije odobrenja u Registru)

Svi nastavnici, ravnatelji i ostali djelatnici imaju `ime.prezime@skole.hr`, a
Certiliju nemaju svi. Oba davatelja su neovisna i jednako vrijedna za prijavu. Uloga
u obrazovnom sustavu postoji samo kod CARNET-a, a za sve funkcije trebat će oba
(vidi [prijava-i-ovlasti.md](prijava-i-ovlasti.md)).

- Rute `/auth/aaieduhr/start`, `/callback`, `/status` (stanje konfiguracije bez tajni).
  Redirect URI za Registar: `https://e-satnica.domovina.ai/auth/aaieduhr/callback`.
- Zajednički OIDC klijent `src/lib/oidc/klijent.ts` (i Certilia ga koristi), stanje
  toka u `oidc_tokovi`, parser atributa `src/lib/aaieduhr/claimovi.ts`.
- Gumb „Prijava s @skole.hr” vidi se tek kad postoje secreti `AAI_CLIENT_ID` i
  `AAI_CLIENT_SECRET` (`wrangler secret put`). Issuer je var `AAI_ISSUER`.
- **Računi**: prvi dolazak s @skole.hr otvara račun (ime i prezime iz `givenName`/`sn`,
  bez OIB-a). Ako je korisnik već prijavljen, novi identitet se spaja s tim računom.
  Certilia prijava uz @skole.hr sesiju upisuje OIB otisak na isti račun. Identifikator
  (`hrEduPersonPersistentID`, rezerva `sub`) sprema se samo kao HMAC u `identiteti`.
- **Oblik atributa nije poznat** (discovery nema `claims_supported`): parser prima
  string ili niz i čita id_token pa userinfo. Svaka prijava u `prijave.claimovi`
  zapisuje samo imena ključeva po izvoru (`id:…;ui:…`). Prva prava prijava s
  `/auth/aaieduhr/start?debug=1` pokaže oblik bez otvaranja računa.
- Testovi: `npm test` diže lažni IdP (`src/lib/oidc/lazni-idp.ts`: RS256 JWKS, PKCE
  S256, jednokratni kodovi, userinfo) i prolazi cijeli tok te napade (krivi verifier,
  nonce, ključ, `aud`, secret). Ručno je provjeren i pravi Worker (`astro dev` +
  lažni IdP na fiksnom portu): novi račun, odbijen ponovljeni callback, spajanje.
- Zamka pri ručnom testu: jose (`createRemoteJWKSet`) ponovno dohvaća JWKS za nepoznat `kid`
  najviše jednom u 30 s. Ponovno pokrenut lažni IdP s novim ključem zato pola minute daje
  `no applicable key found`. Na pravoj rotaciji ključa (novi `kid`) to je u redu.

### Namjene atributa (tekst za Registar resursa)

Za sada se traže samo ovi scopeovi. Škola i uloga čekaju CARNET-ov odgovor.

| Atribut | Javna namjena |
|---|---|
| `openid` | Prijava korisnika u e-satnicu (OpenID Connect). |
| `hrEduPersonPersistentID` | Prepoznavanje istog korisnika pri idućoj prijavi. Sprema se samo nepovratni otisak (HMAC), ne sama vrijednost. |
| `givenName`, `sn` | Prikaz imena i prezimena autora uz prijedloge i komentare u e-satnici, kako bi rad tima bio javan i provjerljiv. |
| `hrEduPersonPrimaryAffiliation` | Provjera je li korisnik djelatnik obrazovne ustanove. Čita se pri prijavi i ne sprema se. |

## Tko smije biti davatelj usluge

[Pravilnik o ustroju AAI@EduHr](https://wiki.srce.hr/download/attachments/65405172/AAI@EduHr-pravilnik-ver1.3.1.pdf), v1.3.1 (aktualan, potvrdilo Srce 3. 11. 2026.; lokalna kopija [aaieduhr/AAI-EduHr-pravilnik-ver1.3.1.pdf](aaieduhr/AAI-EduHr-pravilnik-ver1.3.1.pdf), tekst u `.txt`):

- čl. 31: „Davateljem usluge može postati svaka pravna osoba" koja pisano
  potvrdi da će se pridržavati Pravilnika. Tko nije matična ustanova, dobiva
  status **partnera**.
- čl. 26: zahtjev za partnera ide Koordinatoru (Srce) kroz
  `administracija.aaiedu.hr`, odluka u 8 dana, žalba Savjetu AAI@EduHr.
- čl. 33–34: obrazložiti svaki traženi atribut; koristiti AAI samo u prijavljenu
  svrhu; atribute ne davati trećima; ne pohranjivati vrijednosti atributa osim
  u logovima s navedenom svrhom i rokom.
- Certifikacija (godišnja): politika privatnosti (GDPR), opis svrhe svakog
  atributa, AAI@EduHr logo, HTTPS. Tko ne prođe, vraća se u Fed-Lab.

Presedani: od 1085 javno popisanih usluga (`aaiedu.hr/usluge`) barem 35 imaju
privatne davatelje (Microsoft Hrvatska, Profil Klett, Školska knjiga, STEMI,
Udžbenik.hr, nekoliko j.d.o.o.).

Pravna osoba: **ITalk d.o.o.** (odluka 30. 10. 2026.), ista koja je
registrirala e-satnicu kod Certilije. Zahtjev političke stranke Srce (javna
ustanova) moglo bi odbiti kao stranačku svrhu; Pravilnik to izričito ne
uređuje. Fork `most-hrvatska/e-satnica` može za svoju instancu zasebno tražiti
status partnera.

## Postupak

1. Neslužbeni upit na `aai@srce.hr` (prijedlog u chatu 30. 10. 2026.).
2. Zahtjev za status partnera u `administracija.aaiedu.hr`.
3. Račun u Registru resursa (`registar.aaiedu.hr`), koji odobri administrator
   AAI@EduHr; registracija OIDC resursa (redirect URI, scopeovi s
   obrazloženjem). Client ID dodjeljuje AAI@EduHr.
4. Razvoj i test u AAI@EduHr Fed-Lab, pa zahtjev za produkcijski status.

## Stanje (3. 11. 2026.)

- Zahtjev za dodjelom statusa ustanove partnera podnesen u `administracija.aaiedu.hr`
  (prijava Google računom). Iz sustava se nakon podnošenja preuzme PDF obrasca; polje
  „Titula, ime i prezime, funkcija ovlaštene osobe” je prazno i treba ga popuniti prije
  potpisa. Potpisan kvalificiranim e-potpisom (Certilia, AKD ePotpis) i poslan mailom na
  `aai@srce.hr` u tiketu #797385, uz pitanje prihvaćaju li e-potpis umjesto pošte
  (obrazac navodi poštu: Srce, Josipa Marohnića 5, Zagreb).
- Upit CARNET-u (`helpdesk@carnet.hr`) o atributima `skole.hr` poslan 3. 11.
- 3. 11. 13:05 Srce: „Dokumenti ovjereni e-potpisom mogu biti dostavljeni e-mailom. Uzet ćemo u proceduru dostavljeni zahtjev.” Poštanska dostava ne treba.
- 3. 11. 17:34 CARNET Helpdesk (zahtjev 1158089): upit proslijeđen nadležnoj službi, odgovor još nije stigao.
- **4. 11. 2026. 06:57 zahtjev prihvaćen**: ITalk d.o.o. je ustanova partner AAI@EduHr (status u
  `administracija.aaiedu.hr`, potvrdila Srce). Mailom obavijest nije stigla; vidi se samo u administraciji.
- 4. 11. 08:32 korisnički račun u Registru resursa (`registar.aaiedu.hr/registracija`, prijava istim
  Google računom) izrađen; obrazac traži „Svrhu registracije” (zašto i u ime koje ustanove). Srce mailom:
  „Vaš korisnički račun čeka odobrenje administratora.”
- 4. 11. prijava s @skole.hr implementirana i testirana uz lažni IdP (vidi „Implementacija”).
- 4. 11. 09:19 deployano: backup produkcijskog D1 (izvan repoa), migracija 0005 prvo
  probana na kopiji backupa, pa puštena na produkciju (FK provjera čista), zatim deploy.
  Gumb je skriven dok nema secreta.
- 4. 11. 09:32 E2E na produkciji (Brave, Matija): prijava Certilijom kroz novi kod prošla
  (`sesija`, 379 ms, isti postojeći račun). Postupak deploya: [infrastruktura.md](infrastruktura.md).
- 4. 11. 09:56 račun u Registru resursa aktiviran (mail Srca). Javna stranica `/privatnost` napisana i deployana
  (Registar traži URL pravila privatnosti, certifikacija ga traži za produkciju).
- 4. 11. resurs **#3988 „e-satnica (test)”** (vrsta Test, partner ITalk) zatražen; OIDC modul: Confidential,
  redirect `https://e-satnica.domovina.ai/auth/aaieduhr/callback`, scopeovi i namjene iz tablice gore, bez
  back-channel logouta. Client ID i secret generira Registar; spremljeni izvan repoa u `../.tajne/` (chmod 600).
  Paralelno zatražen i produkcijski resurs „e-satnica” s istim podacima. Oboje čeka administratora AAI@EduHr.
- 4. 11. test client ID i secret (#3988) upisani kao Worker secreti. Gumb se svima prikazuje tek uz var
  `AAI_JAVNO=1`; do tada samo na `/prijava?skole=1`. Dok administrator ne odobri modul, `login.aaiedu.hr`
  vraća 400 „Client authentication failed” (provjereno curlom). Produkcijski resurs je #3989.
- Registar ne dopušta isti redirect URI na dva resursa („već zauzeta”). Zato test #3988 ima
  `https://e-satnica.domovina.ai/auth/aaieduhr/test/callback` (ruta `src/pages/auth/aaieduhr/test/callback.ts`),
  a produkcija #3989 kanonski `/auth/aaieduhr/callback`. Koji se koristi, bira var `AAI_REDIRECT_PATH` u
  `wrangler.jsonc` (sada test). Prelazak na produkciju: maknuti var, upisati secrete iz `../.tajne/aai-prod-3989.env`.
- 4. 11. 12:33 oba OIDC modula zatražena, client ID i secret obaju u `../.tajne/` (produkcijski secret upisan
  iz clipboarda bez ispisa). Test #3988 čeka administratora AAI@EduHr; produkcija #3989 prvo čeka
  **potvrdu odgovorne osobe ustanove-partnera** (ITalk), pa tek onda administratora.
- **Ništa dalje do odobrenja**: čeka se Srce (račun u Registru resursa) i CARNET (atributi skole.hr).
- Sljedeće: nakon odobrenja registrirati OIDC resurs (redirect URI i namjene iz tablice gore),
  upisati secrete, prijaviti se s `?debug=1` i pogledati oblik atributa.

## Odgovor Srca (3. 11. 2026., tiket AAI #797385)

1. Status partnera mogu tražiti samo pravne osobe, pa ITalk d.o.o. ispunjava uvjet.
2. Atribute (OIDC scopeove) biramo sami u Registru resursa, uz javno objavljenu
   namjenu za svaki. Upute: wiki „Registar resursa”, odjeljak „Namjene atributa”.
3. Imenik `skole.hr` drukčiji je od ostatka sustava: za školu, ulogu i nastavnike
   u više škola treba pitati **CARNET** (draft upita na `helpdesk@carnet.hr`, 3. 11.).
4. **Nema Fed-Laba ni testa bez partnerstva**: svaka usluga, i testna, mora biti
   vezana uz matičnu ustanovu ili partnera.
5. Pravilnik v1.3.1 je aktualan.

## Što iz Pravilnika utječe na dizajn

- čl. 34: vrijednosti atributa **ne smijemo pohranjivati** osim u logovima s
  navedenom svrhom i rokom. Školu i ulogu dakle čitamo pri svakoj prijavi, ne
  spremamo ih kao trajni podatak iz AAI-ja. Ovo treba pitati Srce prije
  implementacije: smijemo li spremiti vezu korisnik–škola.
  Implementacija sprema samo **ime i prezime** (prikaz autora; za račun bez
  Certilije nema drugog izvora) i HMAC identifikatora. I to treba potvrditi sa Srcem.
- čl. 32: imenovati odgovornu osobu ITalka za AAI@EduHr (obrazac Koordinatora).
- čl. 41: partner sam snosi svoje troškove; naknada za partnerstvo se ne spominje.

## Otvoreno

- Račun u Registru resursa izrađen 4. 11., čeka odobrenje administratora.

- Što CARNET isporučuje iz `skole.hr` (škola, uloga, više škola).
- Smijemo li trajno vezati korisnika uz školu (čl. 34).
- Smijemo li za račune bez Certilije spremiti ime i prezime iz `givenName`/`sn` (čl. 34).
- Dupli računi: tko se prvo prijavi Certilijom, a zatim (bez otvorene sesije)
  s @skole.hr, dobije dva računa. Spajanje dva postojeća računa nije napravljeno.

## Izvori

- https://www.aaiedu.hr/za-davatelje-usluga
- https://wiki.srce.hr/spaces/AAIUPUTE/pages/69501864/Kako+postati+partner+AAI+EduHr+federacije
- https://wiki.srce.hr/spaces/AAIUPUTE/pages/197729297/Certificiranje+usluga+u+sustavu+AAI+EduHr
- https://wiki.srce.hr/download/attachments/69502559/openid-connect-oidc-aaieduhr-marko-ivancic.pdf (OIDC u AAI@EduHr, 2021.)
- https://www.gov.hr/hr/e-matica/1984

## Vezani dokumenti

- [prijava-i-ovlasti.md](prijava-i-ovlasti.md): dva davatelja, autentifikacija i autorizacija
- [certilia.md](certilia.md): postojeća OIDC integracija
