-- Pristupni ključevi (passkey), po uzoru na omm.domovina.ai 0005_admin.sql.
-- Ključ se smije dodati samo nakon svježe prijave Certilijom; Certilia ostaje
-- jedini dokaz identiteta, ključ je samo brži ulaz za istog korisnika.
CREATE TABLE passkeyi (
  id TEXT PRIMARY KEY,                -- credential ID, base64url
  korisnik_id INTEGER NOT NULL REFERENCES korisnici(id),
  public_key TEXT NOT NULL,           -- COSE, base64url; privatni ključ nikad ne napušta uređaj
  counter INTEGER NOT NULL DEFAULT 0,
  transports TEXT,
  naziv TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  zadnje_koristen TEXT
);
CREATE INDEX passkeyi_korisnik ON passkeyi (korisnik_id);

-- WebAuthn izazovi: jednokratni, 5 min.
CREATE TABLE passkey_izazovi (
  izazov TEXT PRIMARY KEY,
  svrha TEXT NOT NULL,                -- 'prijava' | 'upis'
  korisnik_id INTEGER,                -- kod upisa: čiji se ključ upisuje
  istjece INTEGER NOT NULL            -- epoch ms
);
