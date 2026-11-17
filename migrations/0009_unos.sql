-- Unos u fiktivnu bazu prototipa (src/lib/unos.ts), uz probnu prijavu u ulogu.

-- Podaci za bodove koje je nastavnik prijavio nakon zaključavanja liste. Zaključana
-- lista se ne mijenja, pa vrijede tek od idućeg ciklusa; do tada stoje ovdje.
CREATE TABLE promjene_podataka (
  nastavnik_id INTEGER PRIMARY KEY REFERENCES nastavnici(id),
  -- JSON s poljima iz src/lib/bodovanje/kriteriji.ts (Osoba) i dosegom u km.
  podaci TEXT NOT NULL,
  prijavljeno TEXT NOT NULL
);

-- Višak koji je ravnatelj prijavio za idući ciklus; jedan zapis po radnom mjestu.
CREATE TABLE prijave_viska (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  zaposlenje_id INTEGER NOT NULL UNIQUE REFERENCES zaposlenja(id),
  sati INTEGER NOT NULL CHECK (sati > 0),
  razlog TEXT NOT NULL,
  prijavljeno TEXT NOT NULL
);

-- Tko je odbio ponuđene sate. Odbiti smije samo osoba kojoj su sati dalje od 50 km
-- cestom; do 50 km posao se mora prihvatiti. Tko odbije, više nije u redu za te sate.
CREATE TABLE ponude_odbijene (
  sati_id INTEGER NOT NULL REFERENCES sati(id),
  nastavnik_id INTEGER NOT NULL REFERENCES nastavnici(id),
  vrijeme TEXT NOT NULL,
  PRIMARY KEY (sati_id, nastavnik_id)
);

-- Prijava na natječaj iz e-satnice. Izbor ide po bodovima među prijavljenima.
CREATE TABLE prijave_na_natjecaj (
  sati_id INTEGER NOT NULL REFERENCES sati(id),
  nastavnik_id INTEGER NOT NULL REFERENCES nastavnici(id),
  vrijeme TEXT NOT NULL,
  PRIMARY KEY (sati_id, nastavnik_id)
);

-- Prijedlog izmjene bodovne tablice, o kojem glasaju zaposleni nastavnici. Prihvaćeni
-- prijedlozi daju novu verziju tablice za idući ciklus, a zaključana tablica se ne mijenja.
CREATE TABLE prijedlozi_kriterija (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kriterij TEXT NOT NULL,
  bodova INTEGER NOT NULL CHECK (bodova BETWEEN 0 AND 20),
  obrazlozenje TEXT NOT NULL,
  otvoreno TEXT NOT NULL,
  zatvara TEXT NOT NULL
);
CREATE TABLE glasovi (
  prijedlog_id INTEGER NOT NULL REFERENCES prijedlozi_kriterija(id),
  nastavnik_id INTEGER NOT NULL REFERENCES nastavnici(id),
  glas TEXT NOT NULL CHECK (glas IN ('za', 'protiv')),
  vrijeme TEXT NOT NULL,
  PRIMARY KEY (prijedlog_id, nastavnik_id)
);

-- Uloga korisničkog računa (Certilia, @skole.hr), dok škola i uloga ne stižu uz prijavu:
-- korisnik je zatraži, ravnatelju je potvrđuje povjerenstvo, a nastavniku ravnatelj
-- njegove škole. Potvrđena uloga vrijedi za unos kao i probna, ali uz pravu prijavu.
CREATE TABLE uloge (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  korisnik_id INTEGER NOT NULL REFERENCES korisnici(id),
  vrsta TEXT NOT NULL CHECK (vrsta IN ('ravnatelj', 'nastavnik', 'kandidat')),
  cilj TEXT NOT NULL,
  stanje TEXT NOT NULL DEFAULT 'ceka' CHECK (stanje IN ('ceka', 'potvrdena', 'odbijena')),
  zatrazeno TEXT NOT NULL,
  odluceno TEXT,
  odlucio TEXT
);
CREATE INDEX uloge_korisnik ON uloge (korisnik_id, stanje);
