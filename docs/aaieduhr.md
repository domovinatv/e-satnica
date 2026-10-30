# AAI@EduHr kao drugi način prijave

Istraženo 30. 10. 2026. Ništa još nije registrirano ni zatraženo.

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

## Tko smije biti davatelj usluge

[Pravilnik o ustroju AAI@EduHr](https://wiki.srce.hr/download/attachments/65405172/AAI@EduHr-pravilnik-ver1.3.1.pdf), v1.3.1:

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

Rizik: pravna osoba. Zahtjev političke stranke Srce (javna ustanova) može
odbiti kao stranačku svrhu; Pravilnik to izričito ne uređuje. Neutralna pravna
osoba (tvrtka ili udruga) uz javan kod i javne kriterije je jači zahtjev.

## Postupak

1. Neslužbeni upit na `aai@srce.hr` (prijedlog u chatu 30. 10. 2026.).
2. Zahtjev za status partnera u `administracija.aaiedu.hr`.
3. Račun u Registru resursa (`registar.aaiedu.hr`), koji odobri administrator
   AAI@EduHr; registracija OIDC resursa (redirect URI, scopeovi s
   obrazloženjem). Client ID dodjeljuje AAI@EduHr.
4. Razvoj i test u AAI@EduHr Fed-Lab, pa zahtjev za produkcijski status.

## Otvoreno

- Ima li učitelj koji radi u dvije škole jedan ili dva `@skole.hr` identiteta,
  i šalje li AAI sve njegove škole?
- Može li se koristiti Fed-Lab prije statusa partnera?
- Je li v1.3.1 aktualni Pravilnik (još spominje MZOŠ)?
- Koja pravna osoba podnosi zahtjev.

## Izvori

- https://www.aaiedu.hr/za-davatelje-usluga
- https://wiki.srce.hr/spaces/AAIUPUTE/pages/69501864/Kako+postati+partner+AAI+EduHr+federacije
- https://wiki.srce.hr/spaces/AAIUPUTE/pages/197729297/Certificiranje+usluga+u+sustavu+AAI+EduHr
- https://wiki.srce.hr/download/attachments/69502559/openid-connect-oidc-aaieduhr-marko-ivancic.pdf (OIDC u AAI@EduHr, 2021.)
- https://www.gov.hr/hr/e-matica/1984

## Vezani dokumenti

- [certilia.md](certilia.md): postojeća OIDC integracija
