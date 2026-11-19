# Javni prototip na fiktivnoj bazi

Stanje 17. 11. 2026. Prototip pokazuje kako bi sustav iz specifikacije radio, na
izmišljenoj bazi jedne županije. Prototip se čita bez prijave (sekcija „Prijava i podaci":
do puštanja u rad razvijamo javnu verziju); specifikacija s unosima tima ostaje iza prijave. Stranice imaju `noindex`.

Stvarni su samo natječaji prepisani sa stranica škola ([oglasi.md](oglasi.md)), dokumenti
koje nađe uvoz natječaja i specifikacija s unosima tima. Nastavnici, škole, bodovi,
raspodjela, zamjene, dokazi, prigovori i glasovi su izmišljeni; stvarna su samo imena
mjesta, približne koordinate i približne cestovne udaljenosti. Svaka takva stranica to
piše na vrhu, a testni natječaji imaju oznaku „testni podatak".

## Stranice

| Adresa | Što pokazuje | Uloga iz specifikacije |
|---|---|---|
| `/` | hero s ulazima za nastavnike i ravnatelje, kako radi, natječaji kojima rok najprije istječe, zadnje promjene sati, zamjene | svi |
| `/oglasi`, `/oglasi/[id]` | javni popis natječaja s brojem prijava kroz sustav; stranicu ima samo stvarni natječaj, testni vodi na životni put svojih sati | posjetitelj |
| `/sati`, `/sati/[oznaka]` | slobodni sati (i po školi), životni put s vremenom svakog koraka, kasna prijava, red prednosti, prijave na natječaj | ravnatelj |
| `/lista`, `/lista/[oznaka]` | konačna lista s raspodjelom (mjesto, bodovi, što je tko dobio u kojem koraku, ishod), privremena lista uz konačnu, kandidati izvana, provjera izlaza, usporedba dvaju pravila za pitanje 17. Za osobu raspis bodova sa stanjem dokaza, želje, satnica, zamjena, prigovori | nastavnik, kandidat izvana, povjerenstvo, sindikat |
| `/kalkulator` | bodovi po zaključanoj tablici v1 i po županijskoj tablici; ništa se ne sprema | nastavnik |
| `/zamjene` | zamjene ostvarene u raspodjeli, parovi i lanci, potvrde, zahtjevi bez zamjene | nastavnik |
| `/povjerenstvo` | dokazi (koji čekaju i odbijeni; potvrđeni sklopljeni) i prigovori | povjerenstvo, sindikat |
| `/kriteriji` | tablica ciklusa, prijedlozi izmjena s glasovima, nacrt za idući ciklus i kako bi s njim izgledala lista | nastavnik, povjerenstvo |
| `/uvoz` | dokumenti koje je uvoz našao na stranicama škola | povjerenstvo |
| `/probna-prijava`, `/uloga`, `/moje` | probna uloga, zahtjev za ulogu uz pravu prijavu, obrasci za unos te uloge | ravnatelj, nastavnik, povjerenstvo, kandidat |

Lista, povjerenstvo, kriteriji, uvoz i specifikacija su stranice povjerenstva i tima:
nisu u glavnom izborniku ni na naslovnici, nego u izborniku „Admin” u zaglavlju. Javne su
kao i sve ostalo.

Svaka stranica ima isti plavi vrh s valovima (`components/Vrh.astro`) i ukrasnu
ilustraciju za svoj sadržaj (`components/VrhSlika.astro`); naslovnica ima veći.

Svaki podatak ima jedno mjesto. Zato nema zasebnih stranica za raspodjelu, kandidate,
škole i ciklus: raspodjela i kandidati su dio liste, sati jedne škole su filter na
slobodnim satima, a rokovi ciklusa pišu uz listu i u specifikaciji.

## Gdje je što u kodu

Sav izračun je u čistim funkcijama bez I/O, s testovima (`npm test`):

- `src/lib/bodovanje/`: bodovi i poredak; tablice `v0-nacrt`, zaključana `v1` i
  županijska (`kriteriji.ts`, `tablicaZa()`); kriterij bez potvrđenog dokaza ne nosi bodove
  (`bodovi()`, `dokazi.ts`); glasanje i nacrt nove verzije (`glasanje.ts`).
- `src/lib/raspodjela/raspodjela.ts`: `raspodijeli()` dijeli sate po koracima,
  `provjeri()` neovisno provjerava izlaz, `redPrednosti()` daje listu kandidata za
  jedne sate.
- `src/lib/zamjene/zamjene.ts`: parovi i lanci (Top Trading Cycles).
- `src/lib/sati/stanja.ts`: stroj stanja slobodnih sati i pravilo kasne prijave.
- `src/lib/uloge-pravila.ts`: tko potvrđuje čiju ulogu.
- `src/lib/vanjski/`: čitanje odgovora OSRM-a i WordPressa za skripte.
- `src/lib/norme.ts`, `src/lib/udaljenost.ts`, `src/lib/datumi.ts`: norme po predmetu,
  cestovna udaljenost iz tablice, datumi.

`src/lib/prototip.ts` čita bazu (`migrations/0008_prototip.sql`, `0009_unos.sql`,
`0010_uvoz.sql`) i povezuje je s tim funkcijama. Stranice ne računaju ništa same.

## Raspodjela

Koraci, svaki po bodovima na konačnoj listi:

1. **Višak** dobiva sate u dosegu.
2. **Nadopuna** nepune satnice.
3. **Zamjena na slobodno mjesto.** Tko je do zaključavanja zatražio zamjenu, prelazi na
   sate koji su nakon prva dva koraka ostali slobodni, ako su istog predmeta i iste
   satnice kao njegovo mjesto, u mjestu koje želi. Mjesto koje napusti postaje novi
   slobodni sati i nudi se istim redom, prvo višku i nadopuni, pa sljedećoj zamjeni, pa
   natječaju. Tako zamjene troše ostatak i mogu se nizati u lanac. Osoba ne dobiva natrag
   svoje mjesto.
4. **Natječaj** za ostatak; bira se po bodovima među onima koji su se prijavili.

Pravila koja raspodjela poštuje:

- **Želje.** Osoba bira prvo mjesta koja je navela, tim redom; zatim neodređeno prije
  određenog, bliže prije daljeg, veću satnicu prije manje.
- **Zamjena traži isti predmet i istu satnicu.** „Ista norma" iz specifikacije čitamo kao
  isti udio norme: isti predmet ima istu normu, pa je to ista satnica.
- **Tko na kojem mjestu pripada kojem lancu** vidi se na `/sati` (polje „Oslobodio/la") i
  na `/zamjene` („U raspodjeli").

Mehanizam je biranje redom po bodovima (serijska diktatura). U jednoj županiji, gdje sve
škole rangiraju po istim bodovima, to je isto što i stabilno sparivanje u dvije faze iz
specifikacije: nema para osoba–sati koji bi oboje radije bili zajedno.

## Podaci

```bash
npx wrangler d1 migrations apply e-satnica --local
npx wrangler d1 execute e-satnica --local --file scripts/oglasi-pocetni.sql
npm run db:fiktivno
```

`npm run db:fiktivno` pokreće `scripts/fiktivna-baza.ts`, koji iz
`scripts/fiktivni-podaci.ts` napravi `.wrangler/fiktivna-baza.sql` i upiše ga u lokalnu
bazu. Skripta prvo obriše stare fiktivne podatke, pa se može pokretati ponovno. Uloge
računa i dokumente uvoza sa stvarnih škola ne dira.

- U podacima piše samo ulaz: tko gdje radi, što je višak, koje je sate škola prijavila,
  tko traži zamjenu. Ishod (tko je što dobio, koje je mjesto oslobodila zamjena, što ide
  na natječaj, koji lanci postoje) skripta izračuna istim kodom kojim računa aplikacija i
  stane ako provjera izlaza ne prođe ili ako put nekih sati nije dopušten strojem stanja.
- Za svaki kriterij koji nosi bodove skripta doda potvrđen dokaz, osim gdje podaci navode
  drugačije (odbijen dokaz, dokaz potvrđen nakon privremene liste, dokaz uz prigovor).
- Privremenu listu skripta spremi kakva je objavljena (`lista_snimke`): s podacima prije
  prigovora i dokazima potvrđenima do tada.
- `/lista` zatim iz baze ponovi izračun i usporedi ga s upisanom raspodjelom.
- Rokovi ciklusa vezani su uz godinu, a događaji tijekom godine uz dan pokretanja, da
  otvoreni natječaji ne isteknu čim se podaci upišu. Drugi dan se zadaje s
  `node scripts/fiktivna-baza.ts --danas=2026-11-15`. Tko podatke upisuje tjednima
  nakon toga, treba pokrenuti skriptu ponovno.
- Za produkciju treba prvo `npm run db:migrate`, a zatim isti SQL s `--remote`. To nije
  napravljeno.

Situacije koje podaci pokrivaju: iskusna nastavnica na nepunoj satnici, rad u četiri
škole, višak zbog reforme strukovnog obrazovanja, višak na otoku kojem sate oslobađa
kolega koji se zamjenom seli na kopno, želje za mjestom, izjednačeni po bodovima, kriterij
bez dokaza, dokaz potvrđen nakon privremene liste, prigovor koji mijenja bodove, sati
odbijeni kao fakultativna nastava, kasna prijava, zaposlenje na 60 dana koje prelazi u
natječaj, prijave na natječaj, par i lanac zamjene, zamjena koja nudi mjesto na određeno,
kandidati izvana, prijedlozi izmjene kriterija s glasovima.

### Udaljenosti i uvoz natječaja

Obje skripte čitaju lokalnu bazu i pišu SQL u `.wrangler/`, a `npm run` ga i upiše:

- `npm run db:udaljenosti` (`scripts/udaljenosti.ts`): cestovne udaljenosti među mjestima
  iz koordinata škola (`skole.lat`, `skole.lon`), preko OSRM-a. Ruta s trajektom ne broji
  se kao cesta. Javni poslužitelj dopušta oko jedan upit u sekundi, pa 45 parova traje
  minutu; `--osrm=` zadaje vlastiti. Fiktivna baza i dalje upisuje svoje približne
  udaljenosti, pa ih `db:fiktivno` vraća.
- `npm run db:uvoz` (`scripts/uvoz-natjecaja.ts`): pita WordPress na stranici svake stvarne
  škole za dokumente iz zadnjih 60 dana (`--dana=`) i upiše one čiji naslov kaže natječaj,
  bez poziva na testiranje i odluka o izboru. Dokumente ne preuzima. Povjerenstvo ih na
  `/uvoz` označi obrađenima kad natječaj prepiše u oglase, ili ih odbaci.

Obje šalju samo generičko ime klijenta. Prvi probni uvoz (17. 11. 2026., 30 dana) našao
je 63 dokumenta na stranicama škola iz početnog popisa; jedna je stranica vratila grešku.

## Unos

Unos ide kroz jednu od dvije vrste uloge:

- **Probna uloga** (`/probna-prijava`): odabere se uloga iz prototipa ili upiše novi
  kandidat. Nije korisnički račun: kolačić `esatnica_uloga` ne daje sesiju, ne otvara
  stranice računa i ne dopušta upis uz specifikaciju. Radi samo uz `PROBNA_PRIJAVA=1`
  (lokalno u `.dev.vars`); u `wrangler.jsonc` nije postavljena, pa je na produkciji
  isključena.
- **Potvrđena uloga uz pravu prijavu** (`/uloga`): škola i uloga ne stižu uz prijavu
  (otvoreno pitanje 26), pa ih prijavljeni korisnik zatraži. Ravnatelja potvrđuje
  povjerenstvo, nastavnika ravnatelj škole u kojoj radi; kandidat izvana upisuje sebe i
  uloga vrijedi odmah. Članovi povjerenstva su popis ID-jeva računa u `POVJERENSTVO`.
  Ista škola ili osoba ne može pripadati dvama računima. Tko ima više uloga, bira jednu.

Unos je zatim na `/moje`. Sva pravila su u `src/lib/unos.ts`; `/unos/[akcija]` samo prima
obrazac. Tko smije koju radnju u kojem stanju sati, piše u `src/lib/sati/radnje.ts`.

| Uloga | Što unosi |
|---|---|
| Ravnatelj | slobodne sate (redovito ili kao hitan slučaj), zaposlenje na 60 dana i nastavak ako potreba potraje, izbor među prijavljenima kad natječaju istekne rok, višak za idući ciklus, potvrdu nastavnika svoje škole |
| Povjerenstvo | provjeru prijavljenih sati, odluke o dokazima i prigovorima, prijedloge izmjene kriterija, pregled uvezenih dokumenata, potvrdu ravnatelja |
| Nastavnik | podatke za bodove, doseg, trenutnu satnicu i želje za mjesto rada, dokaze, prihvat ponuđenih sati (odbijanje samo dalje od 50 km), prijavu na natječaj, glas o prijedlozima kriterija, zahtjev za zamjenu i potvrdu zamjene, prigovor |
| Kandidat izvana | podatke i kvalifikacije, dokaze, prijavu na natječaj |

Pravila koja unos provodi:

- **Zaključana lista se ne mijenja.** Podaci, satnica i želje koje nastavnik prijavi, te
  višak koji prijavi ravnatelj, čuvaju se za idući ciklus (`promjene_podataka`,
  `prijave_viska`); stranica osobe pokazuje koliko bi bodova imala s novim podacima.
  Kandidat nije na zaključanoj listi, pa njegovi podaci vrijede odmah.
- **Bodovi traže potvrđen dokaz.** Lista ciklusa broji dokaze potvrđene do konačne liste;
  dob ne traži dokaz. Kriterij bez dokaza pokazuje se s bodovima koje bi nosio.
- **Hitan put samo za ono što nije bilo poznato.** Potreba nastala do roka prijave
  (15. 7.) ne može ići hitnim putem ni na 60 dana; prijavljuje se redovno.
- **Sati idu redom prednosti.** Potvrđeni sati nude se ljudima u sustavu; prihvatiti može
  samo prva osoba u redu, i dobiva koliko joj fali. Sate do 50 km cestom mora prihvatiti;
  odbiti smije samo dalje, i tada ispada iz reda za te sate (`ponude_odbijene`). Kad u
  sustavu više nema nikoga, sustav sam šalje ostatak na javni natječaj s rokom od osam dana.
- **Natječaj vodi prijave.** Prijaviti se može tko ispunjava uvjete i ima sate u dosegu;
  izbor je po redu prednosti među prijavljenima, tek kad rok istekne.
- **Glasanje o kriterijima.** Povjerenstvo otvara prijedlog (kriterij s brojem bodova,
  rok do 60 dana); glasaju zaposleni nastavnici i mogu promijeniti glas dok je glasanje
  otvoreno. Prijedlog s više glasova za nego protiv ulazi u nacrt tablice za idući ciklus;
  zaključana tablica se ne mijenja.
- **Prigovor nakon 48 sati** se bilježi kao podnesen izvan roka i ne razmatra se.
- **Promjena želja za zamjenu** briše vlastitu potvrdu, jer mijenja lance.

## Anonimnost

Uz `ANONIMNO=1` javne stranice umjesto imena prikazuju samo oznake osoba (N-001, K-02).
Zadano je isključeno, jer su imena izmišljena. Napomene na putu sati i obrazloženja
odluka pišu samo oznake, pa ni one ne otkrivaju ime.

## Što je pojednostavljeno

- **Udaljenost** se čita iz tablice među mjestima (`udaljenosti`). Fiktivna baza upisuje
  približne kilometre; pravi se računaju skriptom iz koordinata škola, ne od adrese osobe.
- **Norme** su primjer iz specifikacije: jezici i matematika 20, ostalo 22 sata
  (pitanje 10).
- **Sati se dijele na razini jednog sata**, ne po razrednim odjelima.
- **Nadopuna unutar škole** (pitanje 17): objavljena raspodjela ide po bodovima, a
  `/lista?pravilo=skola` pokazuje što bi drugo pravilo promijenilo.
- **Izjednačeni** (pitanje 14): poredak određuje oznaka osobe, a slučaj se označava za
  ručnu provjeru.
- **Kasna prijava** je potreba poznata do roka, a prijavljena nakon njega. Potreba koja
  nastane nakon roka nije kasna.
- **Uloge uz pravu prijavu** vežu se samo na fiktivne škole i osobe prototipa.

## Javno čitanje

`src/middleware.ts` pušta čitanje bez prijave. Prijavu traže specifikacija
(`/specifikacija`, s unosima tima), stranice vlastitog računa (`/racun`, `/kljucevi`,
`/dopuna`, `/uloga`) i svaki upis, osim prijave, odjave,
kalkulatora te probne prijave i unosa u fiktivnu bazu, koji sami provjeravaju ulogu.
Kad sustav krene s pravim podacima, to se mora okrenuti: sve iza prijave, osim javnog
popisa.

`astro.config.mjs` ima `compressHTML: true`. Astro 7 po zadanom briše razmak oko
elemenata na prijelomu retka, pa je na stranicama pisalo „piši na" spojeno s
poveznicom iza.
