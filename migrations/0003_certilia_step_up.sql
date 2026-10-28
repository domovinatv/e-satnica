-- Step-up: dodatni podaci iz e-Osobne traže se tek kad ih funkcija treba.
ALTER TABLE certilia_tokovi ADD COLUMN trazi TEXT NOT NULL DEFAULT '';

-- Samo podaci koje je neka funkcija izričito zatražila step-upom, s vremenom
-- dohvata (adresa mora biti svježa pri zaključavanju raspodjele).
CREATE TABLE korisnik_podaci (
  korisnik_id INTEGER NOT NULL REFERENCES korisnici(id),
  podatak TEXT NOT NULL,
  vrijednost TEXT NOT NULL,
  dohvaceno_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (korisnik_id, podatak)
);
