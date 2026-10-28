# Login with Certilia

Prijava je OIDC + PKCE izravno u aplikaciji (`src/lib/certilia/oidc.ts`,
`src/pages/auth/certilia/`), bez zasebnog Workera i bez proxyja. Kod je prenesen
iz `~/git/zef/zef-certilia-worker` (rujan 2026.), najzrelijeg od lokalnih izvora:

| Izvor | Vrijeme | Pristup | Zašto (ne) |
|---|---|---|---|
| `domovinatv/domovina-api` | od 05/2026 | Supabase edge funkcija | treba Supabase |
| `zef/zef-new-website` | 06–09/2026 | Supabase + analize (`analiza/11–17`) | analize vrijede, kod treba Supabase |
| **`zef/zef-certilia-worker`** | **09/2026** | **čisti Worker, OIDC + PKCE + D1 revizija** | **isti stack kao e-satnica** |
| `stadion-maksimir/...-natjecaj-2026` | 10/2026 | proxy `certilia.domovina.ai` + Supabase | tuđi client, Supabase |
| `stepanic/flutter_moja_mreza` | 2025–2026 | WebView prijava na HEP preko e-Građana/NIAS | drugi problem: čitanje tuđeg portala u ime korisnika; kasnije možda za e-Maticu u nativnoj aplikaciji |

## Registracija aplikacije (developer.certilia.com)

`Create Service Provider (IDP)`. Test portal je `developer.test.certilia.com`
(IdP `idp.test.certilia.com`); vrijednosti su iste.

| Polje | Vrijednost |
|---|---|
| Service provider name | `e-satnica` (vidi se na Certilijinom ekranu za pristanak) |
| Protocol | `OIDC/OAuth2` |
| Grant Types | `authorization_code` |
| Callback URL | `https://e-satnica.domovina.ai/auth/certilia/callback` — znakovno točno, bez završnog `/` |
| Back channel URL | prazno |
| User data want to receive | Email, First name, Last name, OIB/PIN, Birthdate, Address, Country, Mobile, Gender, Organization (bez Photo i 4 polja dokumenta; [zašto](certilia-podaci.md)) |
| Mandatory user data | `pin`, `firstname`, `lastname` — ništa više, inače prijava pada svakome tko odbije |
| Access token / refresh token / ID token expiration | 3600 / 86400 / 3600 |

Opravdanje za svako polje: [certilia-podaci.md](certilia-podaci.md).

Client Secret se često prikazuje samo jednom. Nakon spremanja:

```sh
npx wrangler secret put CERTILIA_CLIENT_ID
npx wrangler secret put CERTILIA_CLIENT_SECRET
curl -s https://e-satnica.domovina.ai/auth/certilia/status   # clientId/clientSecret: true
```

Gumb „Prijava s Certilijom" pojavi se sam čim su oba secreta postavljena.
Za test okruženje promijeniti `CERTILIA_ISSUER_BASE` u `wrangler.jsonc`.

## Prva prijava

`/auth/certilia/start?debug=1` vrati na `/prijava` samo imena claimova i odakle
je stigao OIB, bez ijedne vrijednosti. Izmjereno u ZEF-u (14. i 21. 9. 2026.):

- `issuer` u tokenu je `https://idp.certilia.com/oauth2/token`, ne baza; zato se čita iz discoveryja.
- OIB (`pin`) stiže samo kroz `claims` parametar, ne kroz scope; e-Osobna ga šalje i kao `sub`.
- Datumi stižu kao ISO datetime (`…T00:00:00Z`), adresa (`formatted`) kao niz redaka.

## Podaci

- `korisnici`: OIB se ne sprema, samo `HMAC-SHA256(oib, SESIJA_KLJUC)`, plus ime i prezime.
- `certilia_tokovi`: stanje toka (ključ `sha256(state)`), briše se pri callbacku, istječe za 10 min.
- `prijave`: revizija svake prijave, s imenima claimova bez vrijednosti.

Kad Certilia proradi za cijeli tim: `npx wrangler secret delete TIM_KOD` gasi prijavu kodom.

## Vezani dokumenti

- [certilia-podaci.md](certilia-podaci.md): koje podatke tražimo, step-up, izmjereni ekran za pristanak
- [passkey.md](passkey.md): pristupni ključ kao brži ulaz nakon prijave Certilijom
