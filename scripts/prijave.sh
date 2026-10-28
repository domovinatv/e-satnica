#!/usr/bin/env bash
# Tko se prijavio i je li prijava negdje zapela (produkcijska D1).
#   scripts/prijave.sh            korisnici, ključevi i neuspjele prijave
#   scripts/prijave.sh zadnje     zadnjih 30 prijava, i uspjelih i neuspjelih
set -euo pipefail
cd "$(dirname "$0")/.."
q() { npx wrangler d1 execute e-satnica --remote --json --command "$1" | python3 -c 'import json,sys
for r in json.load(sys.stdin)[0]["results"]: print(json.dumps(r, ensure_ascii=False))'; }

case "${1:-}" in
  "")
    echo "# Korisnici (Certilia), po zadnjoj prijavi"
    q "SELECT k.id, k.ime || ' ' || k.prezime AS ime, k.created_at AS prvi_put, k.zadnja_prijava,
              (SELECT COUNT(*) FROM passkeyi p WHERE p.korisnik_id = k.id) AS kljucevi,
              (SELECT COUNT(*) FROM stavke s WHERE s.korisnik_id = k.id) AS stavke
       FROM korisnici k ORDER BY k.zadnja_prijava DESC"
    echo "# Neuspjele prijave"
    q "SELECT created_at, ishod, greska, claimovi FROM prijave WHERE ok = 0 ORDER BY created_at DESC LIMIT 20" ;;
  zadnje) q "SELECT created_at, ishod, ok, trajanje_ms, greska FROM prijave ORDER BY created_at DESC LIMIT 30" ;;
  -h|--help) sed -n 2,4p "$0" ;;
  *) echo "Nepoznata naredba: $1" >&2; exit 1 ;;
esac
