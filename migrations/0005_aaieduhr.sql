-- Prijava s @skole.hr (AAI@EduHr). Glavni ulaz za djelatnike škola; Certilia
-- postaje neobavezna, pa korisnik može postojati bez OIB-a.

-- korisnici: oib_hash više nije obavezan. SQLite ne mijenja NOT NULL na mjestu, pa
-- se tablica prepisuje. Redoslijed je bitan: DROP radi implicitni DELETE, pa reference
-- iz stavke, korisnik_podaci i passkeyi postaju odgođeni prekršaji; tek INSERT u tablicu
-- koja se ZOVE korisnici ih poništava. Upis u korisnici_novi pa RENAME to ne bi učinio
-- i COMMIT bi pao (provjereno u sqlite3 s foreign_keys=ON, 4. 11. 2026.).
PRAGMA defer_foreign_keys = true;

CREATE TABLE korisnici_kopija AS SELECT * FROM korisnici;
DROP TABLE korisnici;
CREATE TABLE korisnici (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  oib_hash TEXT UNIQUE,              -- samo uz Certilia prijavu
  ime TEXT NOT NULL,
  prezime TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  zadnja_prijava TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO korisnici (id, oib_hash, ime, prezime, created_at, zadnja_prijava)
  SELECT id, oib_hash, ime, prezime, created_at, zadnja_prijava FROM korisnici_kopija;
DROP TABLE korisnici_kopija;

-- Vanjski identiteti spojeni s korisnikom. Identifikator se ne sprema, samo
-- HMAC(SESIJA_KLJUC, 'davatelj:identifikator'), kao i OIB.
CREATE TABLE identiteti (
  davatelj TEXT NOT NULL,            -- 'aaieduhr'
  id_hash TEXT NOT NULL,
  korisnik_id INTEGER NOT NULL REFERENCES korisnici(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  zadnja_prijava TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (davatelj, id_hash)
);
CREATE INDEX identiteti_korisnik ON identiteti (korisnik_id);

-- Stanje OIDC toka postaje zajedničko svim davateljima.
ALTER TABLE certilia_tokovi RENAME TO oidc_tokovi;
ALTER TABLE oidc_tokovi ADD COLUMN davatelj TEXT NOT NULL DEFAULT 'certilia';

ALTER TABLE prijave ADD COLUMN davatelj TEXT;
