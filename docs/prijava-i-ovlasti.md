# Prijava i ovlasti: Certilia i @skole.hr

Odluka 4. 11. 2026. (Matija). E-satnica ima dva davatelja identiteta i dva odvojena
pitanja: **tko je korisnik** (autentifikacija) i **što smije** (autorizacija).

## Autentifikacija: dva neovisna, jednako vrijedna davatelja

| | Certilia (NIAS, e-Osobna) | @skole.hr (AAI@EduHr, CARNET) |
|---|---|---|
| Dokazuje | da je osoba građanin RH, s OIB-om | da je osoba djelatnik ili učenik u obrazovnom sustavu |
| Ime i prezime | iz e-Osobne | iz imenika skole.hr (`givenName`, `sn`) |
| Kriptografska težina | veća: mobileID na iOS/Androidu kao drugi faktor | korisničko ime i lozinka |
| Imaju je | ne svi | svi nastavnici, ravnatelji i ostali djelatnici škola |
| Ne zna | status u obrazovnom sustavu | ništa bitno (OIB stiže od 6. 11. 2026.) |

Oba su dovoljna za prijavu i oba otvaraju račun. Nijedan nije „glavni” po vrijednosti.
@skole.hr je samo češći ulaz, jer ga imaju svi u školama. Pristupni ključ (passkey)
nije treći dokaz identiteta: on je brži ulaz za već potvrđen račun, a dodaje se
nakon svježe prijave bilo kojim od dva davatelja.

Jedan korisnik može imati oba davatelja na istom računu (`korisnici.oib_hash` za
Certiliju, `identiteti` za @skole.hr). Spajaju se tako da je korisnik prijavljen
jednim i zatim se prijavi drugim.

## Jedna osoba, jedan račun (spajanje)

Najgori ishod ovakvih sustava su dva računa iste osobe: jedan otvoren Certilijom,
drugi s @skole.hr, svaki sa svojim stavkama. Automatski ih ne možemo prepoznati:
nijedan davatelj nam ne šalje e-mail (ne tražimo ga), a ime nije jedinstveno.
Zato spajanje ide preko dokaza da ista osoba drži oba računa, a to je prijava
obama u istom pregledniku:

1. **Drugi davatelj još nije nigdje spojen**: prijava njime dok je korisnik već
   prijavljen samo ga doda trenutnom računu (bez pitanja, kao i dosad).
2. **Drugi davatelj već ima svoj račun**: sesija ostaje na trenutnom računu, a
   korisnik dolazi na `/racun/spoji` s usporedbom obaju računa (ime, načini
   prijave, broj stavki) i bira „Spoji u jedan račun” ili „Ne spajaj”.
   Prijedlog je u potpisanom kolačiću (15 min) i vrijedi samo za račun kojim je
   korisnik prijavljen.
3. **Oba računa imaju Certiliju s različitim OIB-om**: dvije osobe, spajanje
   nije moguće (npr. zajedničko računalo). Certilia prijava tada samo prebacuje
   sesiju na račun tog OIB-a, kao i dosad.

Ostaje račun s Certilijom (ime iz e-Osobne), inače stariji. Na njega prelaze
stavke, pristupni ključevi, @skole.hr identiteti i podaci iz step-upa (kod
istog podatka ostaje vrijednost cilja), a drugi račun se briše, sve u jednoj D1
transakciji. Kod je u `src/lib/spajanje/`; test nad pravim SQLiteom s
migracijama pada ako nova tablica s `korisnik_id` nije pokrivena spajanjem.

Ulazi za korisnika: stranica **Račun** (`/racun`, poveznica u zaglavlju) pokazuje
koji su davatelji spojeni i nudi „Spoji Certiliju” / „Spoji @skole.hr”; ponuda
pristupnog ključa nakon prve prijave podsjeća na to isto.

**Automatsko spajanje preko OIB-a** (odluka Matija, 5. 11. 2026.: nula dvostrukih
računa važnija je od jednog atributa manje). @skole.hr traži i `hrEduPersonOIB`,
čim je scope s namjenom upisan u Registar resursa (var `AAI_OIB=1`; prije toga bi
nepoznat scope srušio prijavu). OIB se, kao i Certilijin, sprema samo kao HMAC
(`korisnici.oib_hash`) i služi isključivo spajanju:

- @skole.hr prijava čiji OIB već ima račun (Certilia) ide na taj račun; ako je
  @skole.hr već imao svoj račun, oba se spajaju bez pitanja.
- @skole.hr račun bez OIB-a dobiva OIB otisak, pa ga kasnija Certilia prijava
  nađe i ne otvara novi račun. Zato `oib_hash` više ne znači „ima Certiliju”;
  to je zastavica `korisnici.certilia` (migracija 0006), a ime iz e-Osobne ima
  prednost samo kad je ona 1.
- Račun s Certilijom i drugim OIB-om od onog iz @skole.hr: ne spaja se, samo zapis
  `aai_oib_sukob` u logu.
- @skole.hr se nikad ne veže na račun s drugim OIB-om (od 6. 11. 2026.). Ako je
  netko prijavljen Certilijom pa se prijavi tuđim @skole.hr, taj @skole.hr dobiva
  svoj račun (ishod `novi_oib_razlicit`) i spajanje se ne nudi. Veza nastala prije
  OIB-a (npr. 5. 11. roditeljev Certilia račun + djetetov @skole.hr) se na prvoj
  sljedećoj prijavi raskida (`razdvojeno_oib`, log `aai_oib_razdvojeno`).

Ručno spajanje iznad ostaje za slučaj kad OIB nije dostupan.

## Autorizacija: uloga u obrazovnom sustavu postoji samo kod CARNET-a

Certilia ne zna radi li osoba u školi, u kojoj i kao što. To je zapisano samo u
CARNET-ovom imeniku skole.hr. Funkcije koje ovise o ulozi (nastavnik, ravnatelj,
škola) zato traže @skole.hr prijavu, a funkcije koje traže pouzdan identitet
građanina (OIB, podaci iz e-Osobne za bodovanje) traže Certiliju.

**Za potpuno korištenje svih funkcija korisnik u nekom trenutku mora imati oba
davatelja spojena na isti račun.** Tek tada je pristup potpuno otključan. Do tada
radi ono što pokriva davatelj kojim je prijavljen, a e-satnica mu kaže koji
drugi davatelj otključava ostatak i zašto.

Koje funkcije traže što, odredit će se kad vidimo što @skole.hr stvarno isporučuje
(škola, uloga, više škola). Pravila u kodu tada dolaze uz ovaj dokument.

## Usporedba claimova (nakon prvih prijava)

Prva prijava s @skole.hr (Fed-Lab, testni identitet `@aai-test.hr`, povezanost
djelatnik), 5. 11. 2026., `/auth/aaieduhr/start?debug=1`:

| Izvor | Claimovi |
|---|---|
| id_token | `at_hash`, `aud`, `exp`, `iat`, `iss`, `jti`, `nbf`, `nonce`, `sid`, `sub` |
| userinfo | `givenName`, `hrEduPersonPersistentID`, `hrEduPersonPrimaryAffiliation`, `sn`, `sub` |

Identitet se uzima iz `hrEduPersonPersistentID`, ime i prezime stižu, povezanost je
`djelatnik`. Atributi stižu samo u userinfo, id_token nosi samo protokolarne
claimove. Ovo je Fed-Lab; pravi skole.hr (produkcijski resurs) treba potvrditi istim
postupkom.

Kad se prvi korisnici prijave s pravim @skole.hr, ovdje ide usporedba stvarnih odgovora
obaju davatelja, claim po claim, s objašnjenjem što koji znači i za što ga
e-satnica koristi. Izvori:

- Certilia: izmjereni claimovi u [certilia.md](certilia.md) i [certilia-podaci.md](certilia-podaci.md)
- @skole.hr: `prijave.claimovi` (samo imena ključeva po izvoru, `id:…;ui:…`) i prijava s
  `/auth/aaieduhr/start?debug=1`; vrijednosti se ne spremaju (Pravilnik AAI@EduHr, čl. 34)

## Vezani dokumenti

- [aaieduhr.md](aaieduhr.md): AAI@EduHr, postupak, implementacija, namjene atributa
- [certilia.md](certilia.md): Certilia integracija
- [passkey.md](passkey.md): pristupni ključevi
