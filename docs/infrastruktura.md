# Infrastruktura (Cloudflare)

Stanje provjereno 4. 11. 2026. preko `wrangler` i Cloudflare API-ja. Ovo su
identifikatori, ne tajne: bez prijave u Cloudflare račun s njima se ne može ništa.
Tajne (vrijednosti secreta) nikad ne idu ovamo.

## Identifikatori

| Što | Vrijednost |
|---|---|
| Cloudflare račun | **D.O.M.**, account ID `7dc7167b7e2e00923bfa7cd697df14e4` |
| Worker (servis) | `e-satnica`, okruženje `production` |
| Domena | `e-satnica.domovina.ai` (Workers custom domain, ID `d2ab73cff89e21fc316621fdd90dd1164ad87075`) |
| Zona | `domovina.ai`, zone ID `2eaa51e7e6896da6e92bde2ddd879cd8` (isti račun D.O.M.) |
| D1 baza | `e-satnica`, ID `5b1f16d2-876f-46dc-9733-a7622aabde78`, regija EEUR, napravljena 28. 10. 2026. |
| D1 binding | `DB`, migracije u `migrations/` |
| Assets binding | `ASSETS` (`./dist`) |

## Poveznice na dashboard

- Worker: https://dash.cloudflare.com/7dc7167b7e2e00923bfa7cd697df14e4/workers/services/view/e-satnica/production
- D1: https://dash.cloudflare.com/7dc7167b7e2e00923bfa7cd697df14e4/workers/d1/databases/5b1f16d2-876f-46dc-9733-a7622aabde78
- Zona domovina.ai: https://dash.cloudflare.com/7dc7167b7e2e00923bfa7cd697df14e4/domovina.ai

## Varijable i secreti

Varijable su u `wrangler.jsonc` (`APP_ORIGIN`, `CERTILIA_ISSUER_BASE`, `AAI_ISSUER`, `AAI_JAVNO`; `AAI_REDIRECT_PATH` i `AAI_OIB` po potrebi).
Secreti se postavljaju s `npx wrangler secret put IME`. Ovdje su samo imena:

| Secret | Stanje 4. 11. 2026. | Odakle |
|---|---|---|
| `SESIJA_KLJUC` | postavljen | slučajan ključ; potpisuje kolačić sesije i HMAC OIB-a i identiteta. Promjena odjavljuje sve i lomi prepoznavanje postojećih korisnika. |
| `CERTILIA_CLIENT_ID`, `CERTILIA_CLIENT_SECRET` | postavljeni | registracija aplikacije kod Certilije ([certilia.md](certilia.md)) |
| `AAI_CLIENT_ID`, `AAI_CLIENT_SECRET` | postavljeni 5. 11. (produkcijski #3989) | Registar resursa AAI@EduHr, lokalno `../.tajne/aai-prod-3989.env`; upis `wrangler secret bulk` ([aaieduhr.md](aaieduhr.md)) |

## Wrangler ne odabire račun sam

Prijavljeni Cloudflare korisnik ima više računa. Neke naredbe (`d1 migrations list`,
`d1 migrations apply`, `d1 export`) tada ne čitaju `account_id` iz `wrangler.jsonc`
i u neinteraktivnom načinu padnu s „More than one account available” (provjereno
4. 11. 2026., wrangler 4.154.0). Zato npm skripte ispod postavljaju
`CLOUDFLARE_ACCOUNT_ID` same. Za ručne naredbe:

```sh
export CLOUDFLARE_ACCOUNT_ID=7dc7167b7e2e00923bfa7cd697df14e4
```

## Postupak: migracija i deploy

```sh
npm run db:backup     # izvoz produkcijskog D1 u ../backups/ (izvan repoa: ima osobne podatke)
npm run db:status     # koje migracije još nisu primijenjene na produkciji
npm run db:migrate    # primijeni ih
npm run deploy        # build + wrangler deploy
```

Migracija i deploy idu jedno za drugim, bez razmaka: između njih stari kod radi nad
novom shemom (4. 11. to je bilo oko pola minute bez Certilia prijave, jer je tablica
`certilia_tokovi` preimenovana). Migraciju koja prepisuje tablicu prvo probaj na
kopiji backupa u `sqlite3` s `PRAGMA foreign_keys=ON` (primjer u `0005_aaieduhr.sql`).

Backupi su u `/Users/ms/git/most/e-satnica/backups/` na Matijinom računalu, ne u gitu.
Prvi: `d1-e-satnica-20261104-0919-prije-0005.sql`.
