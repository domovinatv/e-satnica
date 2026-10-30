-- Škola iz otvorenih popisa e-Matice (data.gov.hr). Šifra povezuje školu s budućim uvozima.
CREATE TABLE skole (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sifra TEXT NOT NULL UNIQUE,
  naziv TEXT NOT NULL,
  mjesto TEXT NOT NULL,
  adresa TEXT NOT NULL,
  razina TEXT NOT NULL CHECK (razina IN ('osnovna', 'srednja')),
  zupanija TEXT NOT NULL,
  podrucje TEXT NOT NULL CHECK (podrucje IN ('priobalje', 'otoci', 'zagora')),
  web TEXT
);

-- Oglas = jedno radno mjesto iz javno objavljenog natječaja. Mjerodavan je izvorni dokument (izvor_url).
-- Javno se prikazuju samo oglasi u stanju 'objavljen'; uvoz ih upisuje kao 'provjera'.
CREATE TABLE oglasi (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  skola_id INTEGER NOT NULL REFERENCES skole(id),
  predmet TEXT NOT NULL,
  uloga TEXT NOT NULL CHECK (uloga IN ('nastava', 'strucni_suradnik')),
  sati_tjedno INTEGER NOT NULL CHECK (sati_tjedno BETWEEN 1 AND 40),
  ugovor TEXT NOT NULL CHECK (ugovor IN ('neodredeno', 'odredeno')),
  trajanje TEXT,
  izvrsitelja INTEGER NOT NULL DEFAULT 1,
  mjesto_rada TEXT,
  izvorni_opis TEXT NOT NULL,
  objavljeno TEXT NOT NULL,
  rok TEXT NOT NULL,
  rok_izracunat INTEGER NOT NULL DEFAULT 0,
  izvor_url TEXT NOT NULL UNIQUE,
  stanje TEXT NOT NULL DEFAULT 'provjera' CHECK (stanje IN ('provjera', 'objavljen', 'povucen')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX oglasi_stanje_rok ON oglasi (stanje, rok);
