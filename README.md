# e-satnica

Aplikacija za transparentnu nadopunu satnice, zbrinjavanje viškova i zamjene
radnih mjesta nastavnika. Astro + Cloudflare Workers + D1, na
<https://e-satnica.domovina.ai>. Arhiva sastanaka i istraživanja je u
susjednom repou `e-satnica-sastanci`.

## Specifikacija i feedback tima

- Sadržaj specifikacije: `src/content/specifikacija/*.md` (jedna datoteka = jedna sekcija).
- Tim na `/specifikacija/<sekcija>` upisuje komentare, zahtjeve, pitanja i odgovore u D1 tablicu `stavke`.
- Prihvaćene stavke skupljaju se u `paketi`; jedan paket = jedna iteracija razvoja.
- Čitanje i trijaža: `scripts/stavke.sh` (vidi `--help`).

Prijava: Login with Certilia ([docs/certilia.md](docs/certilia.md)), nakon nje po želji pristupni ključ ([docs/passkey.md](docs/passkey.md)).

## Razvoj

```sh
npm install
printf 'SESIJA_KLJUC=lokalni-kljuc\nAPP_ORIGIN=http://localhost:4321\n' > .dev.vars
npx wrangler d1 migrations apply e-satnica --local
npm run dev
```

Deploy: `npm run build && npx wrangler deploy`. Migracije na produkciji:
`npx wrangler d1 migrations apply e-satnica --remote`.
