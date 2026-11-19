# e-satnica

Aplikacija za transparentnu nadopunu satnice, zbrinjavanje viškova i zamjene
radnih mjesta nastavnika. Astro + Cloudflare Workers + D1, na
<https://e-satnica.domovina.ai>. Arhiva sastanaka i istraživanja je u
susjednom, privatnom repou `e-satnica-sastanci`.

Kod je otvoren od prvog dana (MIT, vidi [LICENSE](LICENSE)): kriteriji
bodovanja i raspodjele moraju biti javno provjerljivi, inače je transparentnost
samo privid. Javni su kod, specifikacija i unosi tima uz nju (s imenom autora);
ostali podaci korisnika ostaju u bazi iza prijave.

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

## Javni prototip

Do puštanja u rad bez prijave se čitaju naslovnica (`/`), popis natječaja (`/oglasi`)
i prototip na izmišljenoj bazi jedne županije (lista, raspodjela, zamjene, slobodni
sati, povjerenstvo). Unos se isprobava kroz probnu prijavu u ulogu (`/probna-prijava`),
koja radi samo uz `PROBNA_PRIJAVA=1` i na produkciji je isključena. Što je napravljeno,
što je pojednostavljeno i kako se upisuju podaci: [docs/prototip.md](docs/prototip.md).

## Specifikacija i feedback tima

- Sadržaj specifikacije: `src/content/specifikacija/*.md` (jedna datoteka = jedna sekcija).
- `/specifikacija` je iza prijave, zajedno s unosima tima.
- Tim na `/specifikacija/<sekcija>` upisuje komentare, zahtjeve, pitanja i odgovore u D1 tablicu `stavke`.
- Prihvaćene stavke skupljaju se u `paketi`; jedan paket = jedna iteracija razvoja.
- Čitanje i trijaža: `scripts/stavke.sh` (vidi `--help`).

Prijava: Login with Certilia ([docs/certilia.md](docs/certilia.md)), nakon nje po želji pristupni ključ ([docs/passkey.md](docs/passkey.md)).
Tko se prijavio, s koliko ključeva i koje prijave nisu uspjele: `scripts/prijave.sh`.

## Razvoj

```sh
npm install
printf 'SESIJA_KLJUC=lokalni-kljuc\nAPP_ORIGIN=http://localhost:4321\nPROBNA_PRIJAVA=1\n' > .dev.vars
npx wrangler d1 migrations apply e-satnica --local
npx wrangler d1 execute e-satnica --local --file scripts/oglasi-pocetni.sql
npm run db:fiktivno
npm run dev
```

Bodovanje, raspodjela, zamjene i stroj stanja slobodnih sati (`src/lib/`) su čiste
funkcije bez I/O, s testovima: `npm test` (Node `--test`, bez dodatnih paketa). Bodovna tablica na
`/specifikacija/03-kriteriji-bodovanja` prikazuje se iz istog koda.
Dijagrami u specifikaciji su ```` ```mermaid ```` blokovi; crta ih preglednik.

Deploy: `npm run db:backup`, `npm run db:migrate` (ako ima novih migracija), pa
`npm run deploy`. Cloudflare račun, ID-jevi, secreti i postupak:
[docs/infrastruktura.md](docs/infrastruktura.md).
