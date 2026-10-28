# Certilia: koje podatke tražimo i zašto

Stanje 28. 10. 2026. Ovo nije pravno mišljenje; prije puštanja javnosti treba ga
potvrditi pravnica (vidi „Za pravnicu" na kraju).

## Pravila koja vrijede za svaki podatak

- **Ograničenje svrhe** (GDPR čl. 5(1)(b)): svrha se navodi unaprijed, za svaki podatak.
- **Smanjenje količine podataka** (čl. 5(1)(c)): skuplja se samo ono što je nužno za tu svrhu.
- **Pravna osnova** (čl. 6): za svaku svrhu. Privola mora biti konkretna, a ne „sve odjednom".

ZEF smije tražiti puni KYC jer ima zakonsku obvezu dubinske analize stranke
(Zakon o sprječavanju pranja novca i financiranja terorizma). E-satnica takvu
obvezu nema. Opravdanje „integracija s drugim aplikacijama" samo po sebi nije
svrha; svrha je konkretna funkcija koju korisnik koristi.

Dvije okolnosti čine nas osjetljivijima od prosječne aplikacije:

1. **Most je politička stranka.** Ako je aplikacija vidljivo Mostova, podatak da
   netko nastavnik koristi e-satnicu mogao bi se tumačiti kao podatak o političkom
   mišljenju (čl. 9, posebna kategorija). Što manje podataka, to manji rizik.
2. **Bodovanje i raspodjela radnih mjesta** su automatizirane odluke sa značajnim
   učinkom na zaposlenike javnog sektora (čl. 22), u velikom opsegu. To gotovo
   sigurno traži procjenu učinka (DPIA, čl. 35) prije javnog puštanja.

## Dvije liste u Certilijinoj formi

| Lista | Što znači | Posljedica |
|---|---|---|
| **Want to receive** | najviše što aplikacija smije tražiti; korisnik pristaje po stavci | stavka koju korisnik odbije jednostavno ne stigne |
| **Mandatory** | bez pristanka na ovo prijava **pada** | svaka nepotrebna stavka ovdje zaključava ljude van |

Uz to aplikacija u svakoj prijavi kroz `claims` parametar traži samo podskup
(`src/lib/certilia/oidc.ts`, `CLAIMS_REQUEST`). Koliko Certilijin ekran za
pristanak prati taj podskup, a koliko registraciju, provjeriti na prvoj prijavi.

## Polje po polje

Ocjena: **da** = opravdano odmah · **kasnije** = opravdano tek kad funkcija postoji ·
**slabo** = svrha postoji, ali se postiže i bez toga · **ne** = nema svrhe.

| Polje | Svrha u e-satnici | Pravna osnova (prijedlog) | Ocjena | Mandatory | Traži kod | Spremamo |
|---|---|---|---|---|---|---|
| **OIB/PIN** | jedna osoba = jedan račun; nema lažnih ni dvostrukih unosa u bodovanju i zamjenama | legitimni interes (čl. 6(1)(f)) | da | **da** | da | samo HMAC otisak, nikad OIB |
| **First name** | tko je što napisao, prijavio ili zatražio; prikaz na listi | legitimni interes | da | **da** | da | da |
| **Last name** | isto | legitimni interes | da | **da** | da | da |
| **Birthdate** | dob je kriterij bodovanja (1 ili 2 boda po godini, vidi specifikaciju) | privola ili ugovor (korisnik traži bodovanje) | kasnije | ne | da | ne, dok ne postoji bodovanje |
| **Address** | prebivalište za pravilo 50 km; županijske liste ga već vode | privola ili ugovor | kasnije | ne | ne | ne, dok ne postoji raspodjela |
| **Email** | obavijesti (nova ponuda, potvrda zamjene, istek roka za prigovor) | privola | kasnije | ne | da | ne, dok ne postoje obavijesti |
| **Mobile** | SMS ili WhatsApp obavijest o zamjeni; mnogi nastavnici nisu na mreži preko maila | privola | slabo | ne | ne | ne |
| **Organization** | **ravnatelj**: Certilia s poslovnim certifikatom vraća pravnu osobu koju korisnik zastupa (OIB tvrtke u `vat`). Škola je pravna osoba s OIB-om, pa to dokazuje da je osoba ovlaštena prijaviti slobodne sate i viškove te škole | legitimni interes | kasnije | ne | ne | samo naziv i OIB škole |
| **Country** | svi korisnici su u HR sustavu; nema funkcije koja ovisi o tome | — | ne | ne | ne | ne |
| **Gender** | jedina ideja je gramatički rod u sučelju („prijavljen/prijavljena"); to se rješava neutralnim tekstom | — | ne | ne | ne | ne |
| **Photo** | nema; avatar nije potreban, a fotografija s osobne je osjetljiv podatak | — | ne | ne | ne | ne |
| **Document type** | nema; identitet je već dokazan Certilijom | — | ne | ne | ne | ne |
| **Document number** | nema; isto | — | ne | ne | ne | ne |
| **Document issuing country** | nema | — | ne | ne | ne | ne |
| **Document expiration date** | nema | — | ne | ne | ne | ne |

## Usporedba: sada i kad funkcija postoji

Za svako polje: najjača funkcija koja bi ga mogla opravdati i kada ga uključujemo.
Polje se uključuje tek kad ta funkcija uđe u specifikaciju, ne unaprijed.

| Polje | Treba sada? | Moguća buduća funkcija | Uvjet za uključivanje | Rizik ako ga skupljamo bez funkcije |
|---|---|---|---|---|
| OIB/PIN | da | — | — | — |
| First name, Last name | da | — | — | — |
| Birthdate | ne | bodovanje (dob) | bodovna tablica potvrđena s pravnicom | nizak; datum rođenja je čest podatak |
| Address | ne | pravilo 50 km, izračun udaljenosti do škole | modul raspodjele i zamjena | srednji; adresa + OIB + stranka |
| Email | ne | obavijesti o ponudama, zamjenama i rokovima | obavijesti u specifikaciji | nizak |
| Mobile | ne | SMS/WhatsApp obavijest kad se nađe par za zamjenu | odluka da obavijesti idu i SMS-om | srednji; mobitel je izravan kontakt |
| Organization | ne | uloga ravnatelja: dokaz da zastupa školu (OIB škole) | modul za ravnatelje; provjeriti s poslovnim certifikatom | nizak; registarski podaci su javni |
| Gender | ne | anonimna statistika: pogađaju li viškovi više žene (razredna nastava) | statistika u specifikaciji, samo agregirano | srednji; bez funkcije nema obrane |
| Country | ne | nastavnici sa stranom ispravom ili diplomom | pokaže li se da takvih ima u sustavu | nizak |
| Photo | ne | profilna slika u „društvenoj mreži nastavnika" iz vizije | ta mreža postoji i korisnik sam bira sliku | **visok**; fotografija s osobne, korisnik je može i sam učitati |
| Document type, number, issuing country, expiration date | ne | nema: identitet je dokazan prijavom, a mi nemamo obvezu KYC-a kao ZEF | zakonska obveza identifikacije, koju e-satnica nema | **visok**; to je upravo podatak koji se zloupotrebljava za krađu identiteta |

Zbirno: **3 polja odmah, 6 kasnije uz konkretnu funkciju, 5 nikad** dok se ne
pojavi zakonska obveza. Proširenje forme traje minutu, a opravdanje se ne može
naknadno dopisati podacima koji su već skupljeni.

## Preporuka za formu

- **Mandatory:** `pin`, `firstname`, `lastname`. Ništa drugo: svaka dodatna stavka
  znači da se netko tko je odbije ne može prijaviti.
- **Want to receive:** OIB/PIN, First name, Last name, Birthdate, Address, Email,
  Organization. Mobile tek ako se odlučimo za SMS/WhatsApp obavijesti.
- **Ne označavati:** Country, Gender, Photo i sva četiri polja dokumenta.

Proširenje kasnije je jednostavno: polje se doda u formu i u `CLAIMS_REQUEST`
kad funkcija koja ga treba uđe u specifikaciju, uz obavijest korisnicima zašto.
Suprotan smjer, skupiti sve pa smisliti svrhu, nije dopušten.

## Za pravnicu

1. Je li legitimni interes dovoljan za OIB (otisak) i ime, ili treba privola?
2. Treba li DPIA i u kojem trenutku: za prototip na fiktivnim podacima, ili tek pri javnom puštanju?
3. Čl. 22: je li bodovanje u paralelnom sustavu (bez pravnog učinka) „automatizirana odluka"?
4. Tko je voditelj obrade: Most, udruga, fizička osoba? Treba li odvojiti e-satnicu od stranke?
5. Smije li se `Organization` claim koristiti kao dokaz da je osoba ravnatelj škole?
