#!/usr/bin/env bash
# Čitanje i trijaža feedbacka tima iz produkcijske D1 baze.
#   scripts/stavke.sh                     nove stavke
#   scripts/stavke.sh sve                 sve stavke
#   scripts/stavke.sh prihvati 3 5 8      stanje -> prihvaceno
#   scripts/stavke.sh odbij 4             stanje -> odbijeno
#   scripts/stavke.sh paket "Naziv" 3 5   novi paket i u njega navedene stavke
set -euo pipefail
cd "$(dirname "$0")/.."
q() { npx wrangler d1 execute e-satnica --remote --json --command "$1" | python3 -c 'import json,sys
for r in json.load(sys.stdin)[0]["results"]: print(json.dumps(r, ensure_ascii=False))'; }
ids() {
  for i in "$@"; do [[ "$i" =~ ^[0-9]+$ ]] || { echo "ID mora biti broj: $i" >&2; exit 1; }; done
  local IFS=,; echo "$*"
}

case "${1:-nove}" in
  nove) q "SELECT id, sekcija, vrsta, autor, created_at, tekst FROM stavke WHERE stanje = 'novo' ORDER BY created_at" ;;
  sve) q "SELECT id, sekcija, vrsta, stanje, paket_id, autor, created_at, tekst FROM stavke ORDER BY created_at" ;;
  prihvati) shift; q "UPDATE stavke SET stanje = 'prihvaceno' WHERE id IN ($(ids "$@")) RETURNING id, stanje" ;;
  odbij) shift; q "UPDATE stavke SET stanje = 'odbijeno' WHERE id IN ($(ids "$@")) RETURNING id, stanje" ;;
  paket)
    shift; naziv="${1//\'/\'\'}"; shift
    q "INSERT INTO paketi (naziv) VALUES ('$naziv') RETURNING id, naziv"
    q "UPDATE stavke SET paket_id = (SELECT MAX(id) FROM paketi), stanje = 'prihvaceno' WHERE id IN ($(ids "$@")) RETURNING id, paket_id" ;;
  -h|--help) sed -n 2,7p "$0" ;;
  *) echo "Nepoznata naredba: $1" >&2; exit 1 ;;
esac
