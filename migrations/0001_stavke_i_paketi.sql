-- Paket = stabilna skupina prihvaćenih stavki koja ide u jednu iteraciju razvoja.
CREATE TABLE paketi (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  naziv TEXT NOT NULL,
  opis TEXT,
  stanje TEXT NOT NULL DEFAULT 'otvoren' CHECK (stanje IN ('otvoren', 'zakljucan', 'isporucen')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Stavka = jedan unos člana tima uz sekciju specifikacije.
CREATE TABLE stavke (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sekcija TEXT NOT NULL,
  vrsta TEXT NOT NULL CHECK (vrsta IN ('komentar', 'zahtjev', 'pitanje', 'odgovor')),
  tekst TEXT NOT NULL,
  autor TEXT NOT NULL,
  stanje TEXT NOT NULL DEFAULT 'novo' CHECK (stanje IN ('novo', 'prihvaceno', 'odbijeno', 'gotovo')),
  paket_id INTEGER REFERENCES paketi(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX stavke_sekcija ON stavke (sekcija, created_at);
CREATE INDEX stavke_stanje ON stavke (stanje);
