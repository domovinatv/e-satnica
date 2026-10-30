# e-satnica

Aplikacija za transparentnu nadopunu satnice, zbrinjavanje viškova i zamjene
radnih mjesta nastavnika. Astro + Cloudflare Workers + D1, na
<https://e-satnica.domovina.ai>. Arhiva sastanaka i istraživanja je u
susjednom, privatnom repou `e-satnica-sastanci`.

Kod je otvoren od prvog dana (MIT, vidi [LICENSE](LICENSE)): kriteriji
bodovanja i raspodjele moraju biti javno provjerljivi, inače je transparentnost
samo privid. Javni su kod i specifikacija; podaci korisnika i komentari tima
ostaju u bazi iza prijave Certilijom.

## Tko vodi

Isti kod živi u dva neovisna repoa na GitHubu, koji ne znaju jedan za drugi:

- [`domovinatv/e-satnica`](https://github.com/domovinatv/e-satnica): pravna
  osoba koja vodi uslugu i integracije (Certilia, AAI@EduHr) je
  **ITalk d.o.o. za informacijske tehnologije**, OIB 54872935051,
  IX. Južna obala 20, 10000 Zagreb (MBS 081042440, Trgovački sud u Zagrebu).
- [`most-hrvatska/e-satnica`](https://github.com/most-hrvatska/e-satnica): za
  MOST Hrvatska, koji za svoju instancu može zasebno tražiti Certiliju i
  AAI@EduHr.

Lokalno `origin` ima oba push URL-a, pa jedan `git push` ide u oba:

```sh
git remote set-url --add --push origin git@github.com:domovinatv/e-satnica.git
git remote set-url --add --push origin git@github.com:most-hrvatska/e-satnica.git
```

## Specifikacija i feedback tima

- Sadržaj specifikacije: `src/content/specifikacija/*.md` (jedna datoteka = jedna sekcija).
- Tim na `/specifikacija/<sekcija>` upisuje komentare, zahtjeve, pitanja i odgovore u D1 tablicu `stavke`.
- Prihvaćene stavke skupljaju se u `paketi`; jedan paket = jedna iteracija razvoja.
- Čitanje i trijaža: `scripts/stavke.sh` (vidi `--help`).

Prijava: Login with Certilia ([docs/certilia.md](docs/certilia.md)), nakon nje po želji pristupni ključ ([docs/passkey.md](docs/passkey.md)).
Tko se prijavio, s koliko ključeva i koje prijave nisu uspjele: `scripts/prijave.sh`.

## Razvoj

```sh
npm install
printf 'SESIJA_KLJUC=lokalni-kljuc\nAPP_ORIGIN=http://localhost:4321\n' > .dev.vars
npx wrangler d1 migrations apply e-satnica --local
npm run dev
```

Deploy: `npm run build && npx wrangler deploy`. Migracije na produkciji:
`npx wrangler d1 migrations apply e-satnica --remote`.
