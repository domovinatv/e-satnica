---
naslov: Kriteriji bodovanja
redoslijed: 3
sazetak: Nacrt v0 bodovne tablice, izravno iz koda koji računa, uz usporedbu sa županijom SDŽ. Čeka pravnicu.
tablicaKriterija: true
---

> **Nacrt v0.** Napravljen iz 1. sastanka, županijskih lista SDŽ i rasprave u grupi. Nije pravno provjeren; pravila za izmjene zakona, pravilnika i kolektivnih ugovora priprema pravnica. Komentiraj ispod.

Bodovna tablica mora biti javna i zaključana **prije** izračuna. Sudovi u Italiji i Indiji rušili su raspodjele kad nije bila. Zato je tablica verzionirana: nacrt je `v0-nacrt`, a kad se zaključa postaje `v1` i više se ne mijenja. Svaka promjena je nova verzija, pa se svaki stari izračun može ponoviti.

## Kako se računa

Bodovi su zbroj kriterija iz tablice ispod. To je obična funkcija, ne stroj stanja: isti podaci uvijek daju iste bodove, pa svatko može sam provjeriti svoje mjesto.

```mermaid
flowchart LR
  P[Podaci o osobi<br/>staž, dob, obitelj, viškovi] --> B[Bodovi po kriteriju]
  T[(Bodovna tablica<br/>zaključana verzija)] --> B
  B --> Z[Zbroj]
  Z --> R{Isti broj bodova?}
  R -- ne --> L[Mjesto na listi]
  R -- da --> J[Pravila prednosti<br/>redom] --> L
  J -. i dalje isto .-> RU[Ručna provjera]
```

- Broje se **navršene** godine. Godine se računaju na dan zaključavanja liste.
- Neispravan podatak (negativan broj, prazno polje) zaustavlja izračun umjesto da tiho da krivi zbroj.
- Uz zbroj se uvijek prikazuje i **raspis po kriterijima**, da osoba vidi odakle joj bodovi.

## Zašto ne županijsko bodovanje

U županijskoj tablici dob nosi većinu bodova: osoba od 42 godine dobije 84 od ukupno 109. Na OŠ listi SDŽ ručni zbroj je pogrešan u 6 od 120 redaka, što je argument za automatski izračun. Kriteriji za invaliditet, dijete s teškoćama i prethodne viškove postoje u pravilniku, ali ne i u objavljenoj tablici.

Kolektivni ugovori za osnovne i srednje škole su različiti. Nacrt predlaže **iste kriterije za oba**, jer se isti predmeti predaju u oba. Kristina i pravnica su 31. 10. zaključile da prijedlog treba biti jedan sustav za osnovne i srednje škole, s istim kriterijima; tekst pišu njih dvije. Bodovanje se danas razlikuje i od županije do županije.

## Što sustav još mora znati

- **Normu po predmetu**, npr. hrvatski 20, povijest 22 sata nastave. Županijske liste računaju u tjednim radnim satima od 40, pa sustav mora preračunavati.
- **Trajanje** ponude: određeno ili neodređeno, i koliko dugo.
- **Kako se dokazuje** svaki kriterij i gdje se dokaz predaje.
- Rad u **više škola** istovremeno; na županijskoj listi neki rade u četiri.

## Tko mijenja kriterije (prijedlog iz rasprave, 31. 10.)

Prijedlog: o izmjenama kriterija glasaju svi nastavnici prijavljeni u aplikaciju, a tablica se usklađuje s izglasanim, primjerice jednom mjesečno.

To treba pomiriti s pravilom s vrha stranice, po kojem se tablica zaključava prije izračuna. Glasanje zato može dati samo **novu verziju za idući ciklus**, a ne mijenjati tablicu po kojoj je lista već izračunata.

**Otvoreno:** tko ima pravo glasa, tko izglasano pravno provjerava prije zaključavanja i ima li smisla mjesečni ritam uz godišnji ciklus raspodjele (otvoreno pitanje 22).
