---
naslov: Proces i rokovi
redoslijed: 4
sazetak: Nacrt v0 - godišnji ciklus, životni put slobodnih sati i redoslijed raspodjele, kao dijagrami stanja.
---

> **Nacrt v0.** Pravila ispod su prijedlog iz rasprave tima, ne važeći propis. Neka traže izmjenu zakona ili pravilnika; to priprema pravnica.

## Godišnji ciklus

```mermaid
flowchart LR
  A["do 15. 7.<br/>ravnatelji unose potrebe,<br/>nastavnici manjak sati"] --> B[privremena lista<br/>bodovi i poredak]
  B --> C[izračun raspodjele]
  C --> D["oko 15. 8.<br/>zaključavanje"]
  D --> E[48 sati<br/>prigovori]
  E --> F["konačna lista<br/>prije 1. 9."]
```

1. **Prijava do 15. srpnja:** ravnatelji unose sve slobodne sate i viškove za iduću školsku godinu, nastavnici svoje podatke, satnicu i koliko im sati fali do pune norme. Što treba 1. rujna, zna se sredinom srpnja.
2. **Privremena lista:** sustav izračuna bodove i objavi poredak.
3. **Izračun raspodjele:** redoslijed je ispod.
4. **Zaključavanje oko 15. kolovoza.**
5. **48 sati za prigovore.** Rješava neovisna komisija (županija i sindikat).
6. **Konačna lista** i objava.

## Životni put slobodnih sati

Svaki slobodni sat ima stanje. Prijelaz između stanja je javan i zapisuje se s vremenom, pa se vidi kad je škola znala za potrebu i kad ju je prijavila.

```mermaid
stateDiagram-v2
  state "Ponuđeni unutar sustava" as Ponudeni
  state "Javni natječaj" as Natjecaj
  state "Zaposlenje na 60 dana" as Dana60
  [*] --> Nastali: mirovina, smanjenje obveze,<br/>novi razred, odlazak
  Nastali --> Prijavljeni: ravnatelj unese u sustav
  Prijavljeni --> Odbijeni: nije stvarna potreba<br/>(npr. fakultativna nastava<br/>otvorena radi zapošljavanja)
  Prijavljeni --> Ponudeni: provjereno
  Ponudeni --> Dodijeljeni: netko s nepunom satnicom<br/>ili višak prihvati
  Ponudeni --> Natjecaj: nitko na listi<br/>ne ispunjava uvjete
  Natjecaj --> Dodijeljeni: izbor po bodovima
  Dodijeljeni --> [*]
  Odbijeni --> [*]

  Nastali --> Hitno: bolest, operacija,<br/>neočekivan odlazak
  Hitno --> Dana60: zaposlenje bez natječaja
  Dana60 --> Prijavljeni: ako potreba potraje
```

Pravila:

- **Svi slobodni sati se prijavljuju**, i oni koji nastanu kad netko nakon 30 godina staža dobije 2 sata manje tjedne obveze. Ti sati idu onome tko je prvi na listi, a ne novom zaposleniku na malu satnicu.
- **Fakultativna nastava nije potreba za zapošljavanjem.** Danas se otvori 2 sata fakultativne nastave, na njih se zaposli nova osoba, a kad stariji kolega ode u mirovinu, toj se osobi nadopuni satnica. Ljudi koji godinama rade na nepunoj satnici ili na zamjenama tada ostaju bez tih sati.
- **Zaposlenje na 60 dana bez natječaja samo za hitne slučajeve**, ne za potrebe koje su bile poznate u srpnju. Natječaj koji izađe nakon tih 60 dana danas je pro forma: mjesto je već popunjeno.
- Prijava kasnije od roka je vidljiva kao **kasna prijava**, s datumom kad je potreba nastala.

## Redoslijed raspodjele

Prvo se zbrinjavaju oni koji su već u sustavu, tek onda novi. Na svakom koraku ide se po bodovima, unutar 50 km, za isti predmet i normu; što ostane, ide na idući korak.

```mermaid
flowchart TD
  S[Slobodni sati, provjereni] --> A["Korak 1: Tehnološki višak<br/>mora negdje otići"]
  A -- ostatak --> B["Korak 2: Nadopuna nepune satnice<br/>ljudi koji već rade u sustavu"]
  B -- ostatak --> C["Korak 3: Zamjene radnih mjesta<br/>parovi i lanci"]
  C -- ostatak --> D["Korak 4: Javni natječaj<br/>lista kandidata izvana"]
```

## Pravila

- Nastavnik mora prihvatiti posao do **50 km** udaljenosti; iznad toga ne mora. Udaljenost se računa cestom, ne zračnom linijom.
- Rezultat izračuna je determinističan: isti ulaz uvijek daje isti izlaz, pa se svaka odluka može provjeriti.
- Izlaz se provjerava prije objave. Portugal je 2025. nastavnike smjestio u škole za koje se nisu prijavili.

## Mehanizam (prijedlog)

Bodovi određuju prioritet, a raspodjela ide stabilnim sparivanjem u dvije faze, prvo županija pa škola, po uzoru na Francusku.
