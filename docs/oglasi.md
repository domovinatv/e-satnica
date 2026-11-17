# Javni popis slobodnih sati

Stanje 30. 10. 2026. Prvi javni dio e-satnice: `/oglasi` (popis, bez prijave) i
`/oglasi/[id]` (jedan natječaj). Podaci su u tablicama `skole` i `oglasi`
(`migrations/0007_oglasi.sql`). Javno se vide samo oglasi u stanju `objavljen`.

Stranice imaju `noindex` dok pravnica ne potvrdi javno puštanje.

## Odakle su podaci

Čl. 107. Zakona o odgoju i obrazovanju u osnovnoj i srednjoj školi traži da se
natječaj objavi na stranicama HZZ-a i škole, s rokom od najmanje osam dana.
Početni podaci su iz stranica škola:

1. Popis škola: otvoreni skupovi `osnovne-skole` i `srednje-skole` na data.gov.hr.
   U Splitsko-dalmatinskoj županiji ih je 152.
2. Stranice na `skole.hr` su WordPress, pa `/wp-json/wp/v2/media?after=…` vraća
   nedavno objavljene datoteke. Tako se javilo 118 od 152 škole. Za ostalih 34 nema
   podataka (26 se nije moglo dohvatiti ili im je adresa zastarjela).
3. Iz datoteka s riječju natječaj izbačeni su pozivi na testiranje, rezultati,
   obustave i nenastavna radna mjesta.
4. Svako radno mjesto ručno je prepisano iz teksta natječaja.

Rezultat je `scripts/oglasi-pocetni.sql`: 18 škola, 49 oglasa, od toga 25 otvorenih
na dan 30. 10. 2026. Izvršava se ručno, nije migracija:

```bash
npx wrangler d1 migrations apply e-satnica --local
npx wrangler d1 execute e-satnica --local --file scripts/oglasi-pocetni.sql
```

## Testni natječaji

Uz stvarne natječaje popis pokazuje i izmišljene, iz prototipa
([prototip.md](prototip.md)): sate koje je izmišljena škola prijavila u e-satnici, a
nitko s liste ih nije mogao uzeti. Imaju `oglasi.sati_id`, njihova škola ima
`skole.fiktivna = 1`, na popisu nose oznaku „testni podatak", a umjesto na dokument
škole vode na životni put tih sati (`/sati/[oznaka]`).

## Što nedostaje

- **Skenirani natječaji:** 23 od 84 dokumenta su slike bez teksta i nisu u popisu, od
  toga šest iz razdoblja otvorenih natječaja. Trebaju OCR.
- **Stari `.doc`:** tekst se vadi grubo; provjereno ručno za OŠ kraljice Jelene.
- **Rok:** kad natječaj ne navodi datum, računamo osam dana od ranijeg datuma
  (datum objave, dokumenta ili datoteke), da nikoga ne zavaramo kasnijim rokom. Takvi
  oglasi imaju `rok_izracunat = 1` i na stranici pišu da treba provjeriti.
- **Sati:** `sati_tjedno` je ukupno tjedno radno vrijeme kako piše u natječaju. Neke
  škole navode sate nastave (u srednjoj školi Ivana Lucića 6 sati nastave je 11 sati
  rada). Izvorni tekst čuva `izvorni_opis`.
- **Uvoz:** nema automatskog osvježavanja. Početni oglasi isteknu za desetak dana, pa
  će se tada vidjeti samo kao nedavno istekli. Uvoz treba upisivati oglase kao
  `provjera`, a netko ih mora pregledati prije objave.

## Što popis ne pokazuje

Natječaj se raspisuje tek kad županija potvrdi da nema odgovarajuće osobe među
viškovima, a čl. 107. st. 11. dopušta zapošljavanje bez natječaja (npr. do 60 dana ili
proširenje nepunog na puno radno vrijeme u istoj školi). Popis zato pokazuje ono što je
ostalo, a ne sve slobodne sate. Filter „Do 10 sati tjedno" pokazuje male satnice, ali
sam po sebi ne govori ništa loše o školi.
