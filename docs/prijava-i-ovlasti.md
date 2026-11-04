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
| Ne zna | status u obrazovnom sustavu | OIB (ne tražimo ga) |

Oba su dovoljna za prijavu i oba otvaraju račun. Nijedan nije „glavni” po vrijednosti.
@skole.hr je samo češći ulaz, jer ga imaju svi u školama. Pristupni ključ (passkey)
nije treći dokaz identiteta: on je brži ulaz za već potvrđen račun, a dodaje se
nakon svježe prijave bilo kojim od dva davatelja.

Jedan korisnik može imati oba davatelja na istom računu (`korisnici.oib_hash` za
Certiliju, `identiteti` za @skole.hr). Spajaju se tako da je korisnik prijavljen
jednim i zatim se prijavi drugim.

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

Kad se prvi korisnici prijave s @skole.hr, ovdje ide usporedba stvarnih odgovora
obaju davatelja, claim po claim, s objašnjenjem što koji znači i za što ga
e-satnica koristi. Izvori:

- Certilia: izmjereni claimovi u [certilia.md](certilia.md) i [certilia-podaci.md](certilia-podaci.md)
- @skole.hr: `prijave.claimovi` (samo imena ključeva po izvoru, `id:…;ui:…`) i prijava s
  `/auth/aaieduhr/start?debug=1`; vrijednosti se ne spremaju (Pravilnik AAI@EduHr, čl. 34)

## Vezani dokumenti

- [aaieduhr.md](aaieduhr.md): AAI@EduHr, postupak, implementacija, namjene atributa
- [certilia.md](certilia.md): Certilia integracija
- [passkey.md](passkey.md): pristupni ključevi
