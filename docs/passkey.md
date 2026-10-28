# Pristupni ključevi (passkey)

Certilia je obavezna i jedini dokaz identiteta. Pristupni ključ je samo brži ulaz
za osobu koja se već prijavila Certilijom.

## Odakle je preneseno

Iz `~/git/domovinatv/omm.domovina.ai` (`src/lib/admin/passkey.ts`, `klijent.ts`),
koji je Astro prijenos `pay.domovina.ai/backend/src/admin/auth/`. Pay je izvorna i
najzrelija implementacija (testovi `test/adminAuth.test.ts`, popravci iz audita
AD-02 do AD-04). Ondje je korijen identiteta Cloudflare Access (OTP na e-mail), a
ovdje je to Certilia. Promjene u sigurnosnoj logici držati u skladu s njima.

## Pravila

| Pravilo | Gdje |
|---|---|
| Ključ se dodaje samo u sesiji otvorenoj **Certilijom unutar zadnjih 10 min** | `razlogOdbijanja` u `src/lib/passkey.ts` |
| Sesija otvorena ključem ne može dodati novi ključ (ukradeni kolačić ne postaje trajni pristup) | isto |
| Najviše 5 ključeva po osobi | isto |
| `userVerification: required`, discoverable ključ (`residentKey: required`) | `opcijeUpisa`, `opcijePrijave` |
| Izazov je jednokratan, vrijedi 5 min (`passkey_izazovi`) | `potrosiIzazov` |
| rpID = host zahtjeva; ključ s localhosta ne otvara produkciju | `ctx` |
| Svaka prijava ključem (i odbijena) upisuje se u `prijave` (`passkey`, `passkey_odbijen`) | `src/pages/auth/passkey/prijava.ts` |
| `userID` je hash tajne i ID-a korisnika, ne otkriva OIB ni redni broj | `opcijeUpisa` |

Step-up podaci (datum rođenja, adresa…) i dalje idu samo preko Certilije.

## Tijek

1. Prijava Certilijom → ako osoba nema nijedan ključ i nije kliknula „Ne sada"
   (kolačić `esatnica_bez_kljuca`, 30 dana), callback vodi na `/kljucevi?ponuda=1`.
2. „Dodaj pristupni ključ" → `/kljucevi/opcije` → `navigator.credentials.create` → `/kljucevi/upis`.
3. Sljedeći put na `/prijava`: „Prijava pristupnim ključem" → `/auth/passkey/opcije` →
   `navigator.credentials.get` → `/auth/passkey/prijava` → sesija `nacin: 'passkey'`.
4. `/kljucevi` (link „Ključevi" u zaglavlju): popis, brisanje, dodavanje.

Sesija ima `nacin` (`certilia` | `passkey`) i `od` (epoch ms). Stari kolačići
bez tih polja vrijede kao prijava koja nije svježa; kolačić bez `korisnikId` (ukinuta
prijava kodom tima) ne vrijedi uopće.

## Provjereno (28. 10. 2026., lokalno, Chrome s virtualnim autentifikatorom preko CDP-a)

Stara Certilia sesija i sesija ključem → odbijeno; svježa Certilia → upis; odjava →
prijava ključem; `/kljucevi/opcije` u sesiji ključem → 403; obrisan ključ → „ključ nije
prepoznat". Na produkciji s pravim uređajem još nije isprobano.
