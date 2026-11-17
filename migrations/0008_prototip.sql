-- Fiktivna baza županije za prototip (specifikacija, sekcija „Prijava i podaci"):
-- nastavnici i njihova satnica, slobodni sati i njihov životni put, raspodjela,
-- zamjene, dokazi i prigovori. Tablice puni scripts/fiktivna-baza.ts izmišljenim
-- podacima; stvarnih osoba u njima nema.

-- Izmišljene škole stoje u istoj tablici kao stvarne iz natječaja, ali su označene.
ALTER TABLE skole ADD COLUMN fiktivna INTEGER NOT NULL DEFAULT 0;

-- Koordinate škole (WGS84), iz adrese. Iz njih scripts/udaljenosti.ts računa cestovne
-- udaljenosti u tablici udaljenosti.
ALTER TABLE skole ADD COLUMN lat REAL;
ALTER TABLE skole ADD COLUMN lon REAL;

-- Cestovna udaljenost između mjesta. Par se upisuje jednom; bez retka nema cestovne veze.
CREATE TABLE udaljenosti (
  mjesto_a TEXT NOT NULL,
  mjesto_b TEXT NOT NULL,
  km INTEGER NOT NULL CHECK (km >= 0),
  PRIMARY KEY (mjesto_a, mjesto_b)
);

-- Godišnji ciklus raspodjele i njegovi rokovi.
CREATE TABLE ciklusi (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  skolska_godina TEXT NOT NULL UNIQUE,
  rok_prijave TEXT NOT NULL,
  privremena_lista TEXT NOT NULL,
  zakljucavanje TEXT NOT NULL,
  prigovori_do TEXT NOT NULL,
  konacna_lista TEXT NOT NULL,
  -- Bodovna tablica po kojoj je lista izračunata (src/lib/bodovanje/kriteriji.ts).
  verzija_tablice TEXT NOT NULL
);

-- Nastavnik zaposlen u sustavu ili kandidat izvana. Podaci za bodove su navršene
-- godine na dan zaključavanja liste; dob se računa iz datuma rođenja.
CREATE TABLE nastavnici (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  oznaka TEXT NOT NULL UNIQUE,
  ime TEXT NOT NULL,
  prezime TEXT NOT NULL,
  vrsta TEXT NOT NULL CHECK (vrsta IN ('zaposlen', 'kandidat')),
  predmet TEXT NOT NULL,
  mjesto TEXT NOT NULL,
  do_km INTEGER NOT NULL DEFAULT 50 CHECK (do_km >= 0),
  staz_obrazovanje INTEGER NOT NULL DEFAULT 0 CHECK (staz_obrazovanje >= 0),
  staz_izvan INTEGER NOT NULL DEFAULT 0 CHECK (staz_izvan >= 0),
  rodjen TEXT NOT NULL,
  uzdrzavani INTEGER NOT NULL DEFAULT 0 CHECK (uzdrzavani >= 0),
  samohrani INTEGER NOT NULL DEFAULT 0,
  dijete_teskoce INTEGER NOT NULL DEFAULT 0,
  invaliditet INTEGER NOT NULL DEFAULT 0,
  prethodni_viskovi INTEGER NOT NULL DEFAULT 0 CHECK (prethodni_viskovi >= 0),
  napredovanje TEXT NOT NULL DEFAULT 'nema' CHECK (napredovanje IN ('nema', 'mentor', 'savjetnik')),
  kvalifikacija TEXT,
  situacija TEXT,
  -- Mjesta u kojima bi osoba radila, po redu želje, odvojena znakom |. Raspodjela ih
  -- nudi tim redom; ostala mjesta do 50 km cestom dolaze nakon njih.
  zelje TEXT
);

-- Satnica nastavnika u jednoj školi prije raspodjele; jedna osoba može raditi u više škola.
CREATE TABLE zaposlenja (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nastavnik_id INTEGER NOT NULL REFERENCES nastavnici(id),
  skola_id INTEGER NOT NULL REFERENCES skole(id),
  sati INTEGER NOT NULL CHECK (sati > 0),
  -- Koliko je od tih sati proglašeno tehnološkim viškom.
  visak INTEGER NOT NULL DEFAULT 0 CHECK (visak BETWEEN 0 AND sati),
  razlog_viska TEXT,
  ugovor TEXT NOT NULL CHECK (ugovor IN ('neodredeno', 'odredeno'))
);
CREATE INDEX zaposlenja_nastavnik ON zaposlenja (nastavnik_id);
CREATE INDEX zaposlenja_skola ON zaposlenja (skola_id);

-- Slobodni sati nastave koje je škola prijavila. Stanja i dopušteni prijelazi su u
-- src/lib/sati/stanja.ts.
CREATE TABLE sati (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  oznaka TEXT NOT NULL UNIQUE,
  skola_id INTEGER NOT NULL REFERENCES skole(id),
  predmet TEXT NOT NULL,
  sati INTEGER NOT NULL CHECK (sati BETWEEN 1 AND 40),
  ugovor TEXT NOT NULL CHECK (ugovor IN ('neodredeno', 'odredeno')),
  trajanje TEXT,
  razlog TEXT NOT NULL,
  -- Kad je potreba nastala; uz vrijeme prijave pokazuje je li prijavljena na vrijeme.
  nastalo TEXT NOT NULL,
  -- 1 = provjereni do zaključavanja, pa su ušli u godišnju raspodjelu.
  u_ciklusu INTEGER NOT NULL DEFAULT 0,
  stanje TEXT NOT NULL CHECK (stanje IN ('nastali', 'prijavljeni', 'odbijeni', 'ponudeni', 'natjecaj', 'dodijeljeni', 'hitno', 'dana60')),
  -- Radno mjesto koje je oslobodila zamjena u koraku 3; takve sati stvara raspodjela.
  iz_zaposlenja INTEGER REFERENCES zaposlenja(id)
);
CREATE INDEX sati_skola ON sati (skola_id);

-- Svaki prijelaz stanja je javan i zapisuje se s vremenom.
CREATE TABLE sati_prijelazi (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sati_id INTEGER NOT NULL REFERENCES sati(id),
  iz TEXT,
  u TEXT NOT NULL,
  vrijeme TEXT NOT NULL,
  tko TEXT NOT NULL CHECK (tko IN ('ravnatelj', 'povjerenstvo', 'sustav')),
  napomena TEXT
);
CREATE INDEX sati_prijelazi_sati ON sati_prijelazi (sati_id, id);

-- Objavljeni ishod: tko je dobio koliko sati i u kojem koraku raspodjele
-- (1 višak, 2 nadopuna, 3 zamjena na slobodno mjesto, 4 natječaj). Kod zamjene osoba
-- napušta svoje radno mjesto (napusta_zaposlenje), koje postaje novi slobodni sati.
CREATE TABLE dodjele (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sati_id INTEGER NOT NULL REFERENCES sati(id),
  nastavnik_id INTEGER NOT NULL REFERENCES nastavnici(id),
  sati INTEGER NOT NULL CHECK (sati > 0),
  korak INTEGER NOT NULL CHECK (korak IN (1, 2, 3, 4)),
  km INTEGER NOT NULL,
  napusta_zaposlenje INTEGER REFERENCES zaposlenja(id)
);
CREATE INDEX dodjele_sati ON dodjele (sati_id);
CREATE INDEX dodjele_nastavnik ON dodjele (nastavnik_id);

-- Privremena lista kako je objavljena, prije prigovora. Konačna lista računa se iz
-- trenutnih podataka, pa se ne sprema.
CREATE TABLE lista_snimke (
  ciklus_id INTEGER NOT NULL REFERENCES ciklusi(id),
  nastavnik_id INTEGER NOT NULL REFERENCES nastavnici(id),
  mjesto INTEGER NOT NULL,
  bodovi INTEGER NOT NULL,
  PRIMARY KEY (ciklus_id, nastavnik_id)
);

-- Natječaj koji je nastao iz sati prijavljenih u e-satnici, a ne sa stranice škole.
ALTER TABLE oglasi ADD COLUMN sati_id INTEGER REFERENCES sati(id);

-- Želja za zamjenom radnog mjesta: osoba nudi svoje mjesto i navodi kamo bi išla.
CREATE TABLE zamjene_zahtjevi (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nastavnik_id INTEGER NOT NULL UNIQUE REFERENCES nastavnici(id),
  zaposlenje_id INTEGER NOT NULL REFERENCES zaposlenja(id),
  -- Mjesta po redu želje, odvojena znakom |.
  zeli TEXT NOT NULL,
  podneseno TEXT NOT NULL,
  -- 1 = ostvaren u godišnjoj raspodjeli (korak 3), pa više ne traži par.
  ostvaren INTEGER NOT NULL DEFAULT 0
);

-- Zamjena vrijedi tek kad svi u lancu potvrde. Lanac je oznaka iz kljucLanca().
CREATE TABLE zamjene_potvrde (
  lanac TEXT NOT NULL,
  nastavnik_id INTEGER NOT NULL REFERENCES nastavnici(id),
  potvrdeno TEXT NOT NULL,
  PRIMARY KEY (lanac, nastavnik_id)
);

-- Dokaz za kriterij bodovanja; potvrđuje ga županijsko povjerenstvo.
CREATE TABLE dokazi (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nastavnik_id INTEGER NOT NULL REFERENCES nastavnici(id),
  kriterij TEXT NOT NULL,
  dokument TEXT NOT NULL,
  predano TEXT NOT NULL,
  stanje TEXT NOT NULL DEFAULT 'ceka' CHECK (stanje IN ('ceka', 'potvrden', 'odbijen')),
  odluceno TEXT,
  napomena TEXT
);
CREATE INDEX dokazi_nastavnik ON dokazi (nastavnik_id);

-- Prigovor na listu ili raspodjelu; rok je 48 sati od zaključavanja.
CREATE TABLE prigovori (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nastavnik_id INTEGER NOT NULL REFERENCES nastavnici(id),
  ciklus_id INTEGER NOT NULL REFERENCES ciklusi(id),
  na_sto TEXT NOT NULL CHECK (na_sto IN ('bodovi', 'raspodjela')),
  tekst TEXT NOT NULL,
  podneseno TEXT NOT NULL,
  stanje TEXT NOT NULL DEFAULT 'zaprimljen' CHECK (stanje IN ('zaprimljen', 'usvojen', 'odbijen', 'izvan_roka')),
  odluka TEXT,
  odluceno TEXT
);
