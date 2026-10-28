-- Login with Certilia. OIB se nikad ne sprema, samo HMAC-SHA256(oib, SESIJA_KLJUC):
-- dovoljno da se ista osoba prepozna pri idućoj prijavi, a iz zapisa se OIB ne može
-- rekonstruirati. Ostali podaci iz e-Osobne (adresa, isprava, fotografija) se ne traže.
CREATE TABLE korisnici (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  oib_hash TEXT NOT NULL UNIQUE,
  ime TEXT NOT NULL,
  prezime TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  zadnja_prijava TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Kratkotrajno stanje OIDC toka, ključ je sha256(state). Briše se pri prvom callbacku.
CREATE TABLE certilia_tokovi (
  state_hash TEXT PRIMARY KEY,
  code_verifier TEXT NOT NULL,
  nonce TEXT NOT NULL,
  natrag TEXT NOT NULL,
  debug INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

-- Revizijski trag svake prijave, i uspjele i neuspjele. Bez osobnih podataka:
-- imena claimova bez vrijednosti, OIB samo kao HMAC.
CREATE TABLE prijave (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  ishod TEXT NOT NULL,
  ok INTEGER NOT NULL,
  oib_hash TEXT,
  claimovi TEXT,
  trajanje_ms INTEGER,
  greska TEXT
);
CREATE INDEX prijave_created ON prijave (created_at DESC);

ALTER TABLE stavke ADD COLUMN korisnik_id INTEGER REFERENCES korisnici(id);
