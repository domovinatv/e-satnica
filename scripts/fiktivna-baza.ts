// Gradi fiktivnu bazu za prototip i zapisuje je kao SQL u .wrangler/fiktivna-baza.sql.
//
//   npm run db:fiktivno                              upiše je u lokalnu bazu
//   node scripts/fiktivna-baza.ts --danas=2026-11-15  samo napravi SQL za zadani dan
//
// Ishodi (tko je dobio koje sate, što ide na natječaj, koji lanci zamjena postoje)
// ne pišu se rukom, nego ih računa isti kod koji računa aplikacija: src/lib/raspodjela
// i src/lib/zamjene. Skripta stane ako provjera izlaza ne prođe ili ako put nekih sati
// nije dopušten strojem stanja.
//
// Datumi ciklusa su vezani uz godinu, a događaji tijekom godine uz današnji dan, da
// otvoreni natječaji ne isteknu čim se podaci upišu. Stare fiktivne podatke skripta
// prvo briše; stvarne natječaje i podatke o prijavama ne dira.
//
// U napomenama na putu sati stoje samo oznake osoba, ne imena, da ih anonimni način
// prikaza (ANONIMNO=1) ne otkrije.

import { mkdirSync, writeFileSync } from 'node:fs';
import { bodovi, poredak, type Dokazano } from '../src/lib/bodovanje/bodovi.ts';
import { dokazanoDo } from '../src/lib/bodovanje/dokazi.ts';
import { V1, type Osoba } from '../src/lib/bodovanje/kriteriji.ts';
import { danas, datum, navrseneGodine, pomakni } from '../src/lib/datumi.ts';
import { norma, uRadnoVrijeme } from '../src/lib/norme.ts';
import {
	oznakaNovogMjesta,
	provjeri,
	raspodijeli,
	redPrednosti,
	type KandidatZaSate,
	type Postavke,
	type Potreba,
	type Sudionik,
	type ZahtjevZaMjesto,
} from '../src/lib/raspodjela/raspodjela.ts';
import { provjeriPut, type Prijelaz, type Stanje } from '../src/lib/sati/stanja.ts';
import { napraviUdaljenost } from '../src/lib/udaljenost.ts';
import { nadiZamjene } from '../src/lib/zamjene/zamjene.ts';
import {
	DIONICE,
	DOKUMENTI,
	dokazi,
	KANDIDATI,
	POTVRDE,
	PRIJEDLOZI,
	prigovori,
	PROMJENE,
	SKOLE,
	slobodniSati,
	ZAPOSLENI,
	zamjeneZahtjevi,
	type Dokaz,
	type Korak,
	type Nastavnik,
	type Sati,
} from './fiktivni-podaci.ts';

const zadano = process.argv.find((a) => a.startsWith('--danas='))?.slice('--danas='.length);
if (zadano !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(zadano)) throw new Error('--danas mora biti GGGG-MM-DD');
const DANAS = zadano ?? danas();

// Ciklus se zaključava u kolovozu; do rujna je konačna lista za tu školsku godinu gotova.
const [godina, mjesec] = DANAS.split('-').map(Number);
const G = mjesec >= 9 ? godina : godina - 1;
const CIKLUS = {
	skolskaGodina: `${G}/${String(G + 1).slice(2)}`,
	rokPrijave: `${G}-07-15`,
	privremenaLista: `${G}-07-20`,
	zakljucavanje: `${G}-08-15T12:00`,
	prigovoriDo: `${G}-08-17T12:00`,
	konacnaLista: `${G}-08-24`,
};
const prije = (n: number): string => pomakni(DANAS, -n);
// Ciklus se računa po zaključanoj tablici.
const TABLICA = V1;

const skole = new Map(SKOLE.map((s) => [s.sifra, s]));
const udaljenost = napraviUdaljenost(DIONICE.map(([od, do_, km]) => ({ od, do: do_, km })));
const SVI = [...ZAPOSLENI, ...KANDIDATI];
const osobaPoOznaci = new Map(SVI.map((n) => [n.oznaka, n]));

const mjestoSkole = (sifra: string): string => {
	const skola = skole.get(sifra);
	if (!skola) throw new Error(`nepoznata škola ${sifra}`);
	return skola.mjesto;
};

function osobaIz(n: Nastavnik, staz = n.staz): Osoba {
	return {
		stazUObrazovanju: staz,
		stazIzvanObrazovanja: n.stazIzvan ?? 0,
		dob: navrseneGodine(n.rodjen, CIKLUS.zakljucavanje),
		uzdrzavaniClanovi: n.uzdrzavani ?? 0,
		samohraniIliSamac: n.samohrani ?? false,
		dijeteSTeskocama: n.dijeteSTeskocama ?? false,
		invaliditet: n.invaliditet ?? false,
		prethodniViskovi: n.prethodniViskovi ?? 0,
		napredovanje: n.napredovanje ?? 'nema',
	};
}

// --- Dokazi -------------------------------------------------------------------
// Za svaki kriterij koji nosi bodove treba potvrđen dokaz. Gdje ga popis u
// fiktivni-podaci.ts ne navodi, osoba ga je predala u lipnju i potvrđen je do 14. 7.

const sviDokazi: Dokaz[] = [...dokazi(G, prije)];
{
	let i = 0;
	for (const n of SVI) {
		for (const st of bodovi(osobaIz(n), TABLICA).stavke) {
			const k = TABLICA.kriteriji.find((x) => x.kljuc === st.kljuc)!;
			if (st.bodova <= 0 || k.bezDokaza) continue;
			const imaDokaz = sviDokazi.some((d) => d.nastavnik === n.oznaka && d.kriterij === st.kljuc && d.predano <= CIKLUS.zakljucavanje);
			if (imaDokaz) continue;
			const dokument = DOKUMENTI[st.kljuc];
			if (!dokument) throw new Error(`nema dokumenta za kriterij ${st.kljuc}`);
			sviDokazi.push({
				nastavnik: n.oznaka,
				kriterij: st.kljuc,
				dokument,
				predano: `${G}-06-${String(1 + (i % 28)).padStart(2, '0')}`,
				stanje: 'potvrden',
				odluceno: `${G}-07-${String(1 + (i % 14)).padStart(2, '0')}`,
			});
			i++;
		}
	}
}
const dokaziOsobe = (oznaka: string) => sviDokazi.filter((d) => d.nastavnik === oznaka).map((d) => ({ ...d, odluceno: d.odluceno ?? null }));
const dokazanoNaDan = (oznaka: string, dan: string): Dokazano => dokazanoDo(dokaziOsobe(oznaka), dan);

function sudionik(n: Nastavnik): Sudionik {
	return {
		id: n.oznaka,
		osoba: osobaIz(n),
		// Konačna lista broji dokaze potvrđene do dana objave, uključujući one uz prigovor.
		dokazano: dokazanoNaDan(n.oznaka, CIKLUS.konacnaLista),
		predmet: n.predmet,
		norma: norma(n.predmet),
		mjesto: n.mjesto,
		doKm: n.doKm ?? 50,
		zelje: n.zelje,
		zadrzanoSati: n.zaposlenja.reduce((z, x) => z + x.sati - (x.visak ?? 0), 0),
		visakSati: n.zaposlenja.reduce((z, x) => z + (x.visak ?? 0), 0),
		skole: n.zaposlenja.map((x) => x.skola),
	};
}

const potreba = (s: Sati, sati = s.sati): Potreba => ({
	id: s.oznaka,
	skola: s.skola,
	mjesto: mjestoSkole(s.skola),
	predmet: s.predmet,
	sati,
	ugovor: s.ugovor,
});

// --- Zahtjevi za zamjenu --------------------------------------------------------

const ZAHTJEVI = zamjeneZahtjevi(G).map((z) => {
	const n = ZAPOSLENI.find((x) => x.oznaka === z.nastavnik);
	if (!n || n.zaposlenja.length !== 1) throw new Error(`${z.nastavnik}: zahtjev za zamjenu traži točno jedno radno mjesto`);
	const podneseno = typeof z.podnesenoPrije === 'string' ? z.podnesenoPrije : prije(z.podnesenoPrije);
	return { ...z, n, mjesto: n.zaposlenja[0], podneseno };
});
const kljucZaposlenja = (oznaka: string, skola: string): string => `${oznaka}@${skola}`;
// U godišnju raspodjelu ulaze zahtjevi podneseni do zaključavanja.
const uRaspodjeli: ZahtjevZaMjesto[] = ZAHTJEVI.filter((z) => z.podneseno <= CIKLUS.zakljucavanje).map((z) => ({
	osoba: z.n.oznaka,
	zaposlenje: kljucZaposlenja(z.n.oznaka, z.mjesto.skola),
	skola: z.mjesto.skola,
	mjesto: mjestoSkole(z.mjesto.skola),
	predmet: z.n.predmet,
	sati: z.mjesto.sati,
	ugovor: z.mjesto.ugovor ?? 'neodredeno',
	zeli: z.zeli,
}));

const postavke: Postavke = { tablica: TABLICA, udaljenost, zamjene: uRaspodjeli };

// --- Godišnja raspodjela -----------------------------------------------------

const sviSati = slobodniSati(G, prije);
const zaposleni = ZAPOSLENI.map(sudionik);
// Na listi su oni kojima sati fale: višak ili nepuna satnica.
const naListi = zaposleni.filter((s) => s.visakSati > 0 || s.zadrzanoSati < s.norma);
const potrebe = sviSati.filter((s) => s.uCiklusu).map((s) => potreba(s));

const rezultat = raspodijeli(naListi, potrebe, postavke);
const pale = provjeri(naListi, potrebe, postavke, rezultat).filter((c) => !c.ok);
if (pale.length > 0) throw new Error(`provjera izlaza nije prošla:\n${pale.map((c) => `${c.naziv}: ${c.detalj.join('; ')}`).join('\n')}`);

// Radna mjesta koja je zamjena oslobodila postaju novi slobodni sati u ciklusu.
const satiPotrebe = new Map(potrebe.map((x) => [x.id, x.id]));
const izZaposlenja = new Map<string, { nastavnik: string; skola: string }>();
let sljedeci = Math.max(...sviSati.map((s) => Number(s.oznaka.slice(2))));
for (const m of rezultat.novaMjesta) {
	const z = uRaspodjeli.find((x) => oznakaNovogMjesta(x.zaposlenje) === m.id);
	if (!z) throw new Error(`${m.id}: nema zahtjeva koji je oslobodio to mjesto`);
	const kamo = rezultat.dodjele.find((d) => d.korak === 3 && d.napusta === z.zaposlenje)!;
	const oznaka = `S-${String(++sljedeci).padStart(3, '0')}`;
	satiPotrebe.set(m.id, oznaka);
	izZaposlenja.set(oznaka, { nastavnik: z.osoba, skola: z.skola });
	sviSati.push({
		oznaka,
		skola: m.skola,
		predmet: m.predmet,
		sati: m.sati,
		ugovor: m.ugovor,
		razlog: `Zamjena radnog mjesta: ${z.osoba} prelazi na sate ${kamo.potreba}`,
		nastalo: CIKLUS.konacnaLista,
		uCiklusu: true,
		put: [
			{ u: 'prijavljeni', vrijeme: `${CIKLUS.konacnaLista}T12:00`, tko: 'sustav', napomena: 'Mjesto je oslobodila zamjena u koraku 3.' },
			{ u: 'ponudeni', vrijeme: `${CIKLUS.konacnaLista}T12:00`, tko: 'sustav' },
		],
	});
}
const satiOd = (idPotrebe: string): string => satiPotrebe.get(idPotrebe) ?? idPotrebe;
const uCiklusu = sviSati.filter((s) => s.uCiklusu);

interface Dodjela {
	sati: string;
	nastavnik: string;
	koliko: number;
	korak: 1 | 2 | 3 | 4;
	km: number;
	/** Radno mjesto koje osoba napušta zamjenom (korak 3). */
	napusta?: { nastavnik: string; skola: string };
}
const dodjele: Dodjela[] = rezultat.dodjele.map((d) => {
	const z = d.napusta ? uRaspodjeli.find((x) => x.zaposlenje === d.napusta) : undefined;
	return { sati: satiOd(d.potreba), nastavnik: d.osoba, koliko: d.sati, korak: d.korak, km: d.km, napusta: z && { nastavnik: z.osoba, skola: z.skola } };
});
const ostvareni = new Set(rezultat.dodjele.filter((d) => d.korak === 3).map((d) => d.osoba));

// Tekuća satnica svake osobe, za red prednosti nakon ciklusa.
const satnica = new Map<string, number>();
for (const s of zaposleni) satnica.set(s.id, rezultat.satnica[s.id]?.poslije ?? s.zadrzanoSati);
const neplasirano = new Map(rezultat.bezSati.filter((b) => b.korak === 1).map((b) => [b.osoba, b.nedostaje]));
const kandidati = KANDIDATI.map(sudionik);
for (const k of kandidati) satnica.set(k.id, 0);
const izvana = new Set(kandidati.map((k) => k.id));

const uRedu = (): KandidatZaSate[] =>
	[...zaposleni, ...kandidati].map((s) => {
		const sati = satnica.get(s.id)!;
		return { s, sati, neplasiranVisak: neplasirano.get(s.id) ?? 0, izvana: izvana.has(s.id) && sati === 0 };
	});

const dodijeli = (x: Potreba, prvi: { osoba: string; skupina: 1 | 2 | 4; km: number; nedostaje: number }): Dodjela => {
	const koliko = Math.min(x.sati, prvi.nedostaje);
	satnica.set(prvi.osoba, satnica.get(prvi.osoba)! + koliko);
	const d: Dodjela = { sati: x.id, nastavnik: prvi.osoba, koliko, korak: prvi.skupina, km: prvi.km };
	dodjele.push(d);
	return d;
};

interface Oglas {
	sati: Sati;
	koliko: number;
	objavljeno: string;
	rok: string;
}
const oglasi: Oglas[] = [];
const prijave: { sati: string; nastavnik: string; vrijeme: string }[] = [];
const putevi = new Map<string, Korak[]>();
const satiTekst = (n: number): string => `${n} ${n % 10 === 1 && n % 100 !== 11 ? 'sat' : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? 'sata' : 'sati'}`;
const KORACI: Record<number, string> = { 1: 'višak', 2: 'nadopuna', 3: 'zamjena' };

/** Kandidati izvana koji su se prijavili; `bezZadnjeg` ostavlja jednog u dosegu bez prijave. */
function prijaviSe(s: Sati, x: Potreba, objavljeno: string, bezZadnjeg: boolean): string[] {
	const uDosegu = redPrednosti(x, uRedu(), postavke).filter((u) => u.skupina === 4);
	const prijavljeni = bezZadnjeg && uDosegu.length > 1 ? uDosegu.slice(0, -1) : uDosegu;
	prijavljeni.forEach((u, i) => {
		const dan = pomakni(objavljeno, i + 1);
		prijave.push({ sati: s.oznaka, nastavnik: u.osoba, vrijeme: `${dan > DANAS ? DANAS : dan}T1${i % 10}:15` });
	});
	return prijavljeni.map((u) => u.osoba);
}

for (const s of uCiklusu) {
	const put = [...s.put];
	const moje = rezultat.dodjele.filter((d) => satiOd(d.potreba) === s.oznaka);
	const ostalo = rezultat.ostatak.find((o) => satiOd(o.potreba) === s.oznaka)?.sati ?? 0;
	const tko = moje.map((d) => `${d.osoba} ${satiTekst(d.sati)} (${KORACI[d.korak]})`).join(', ');
	if (ostalo === 0) {
		put.push({ u: 'dodijeljeni', vrijeme: `${CIKLUS.konacnaLista}T12:00`, tko: 'sustav', napomena: `Konačna lista: ${tko}.` });
	} else {
		const razlog = moje.length > 0 ? `${tko}; ${satiTekst(ostalo)} nitko s liste nije mogao uzeti.` : 'Nitko na listi ne ispunjava uvjete za ove sate.';
		put.push({ u: 'natjecaj', vrijeme: `${CIKLUS.konacnaLista}T12:00`, tko: 'sustav', napomena: `Konačna lista: ${razlog}` });
		const objavljeno = pomakni(CIKLUS.konacnaLista, 1);
		oglasi.push({ sati: s, koliko: ostalo, objavljeno, rok: pomakni(objavljeno, 9) });
		// Natječaj: izbor po bodovima među prijavljenima u dosegu.
		const x = potreba(s, ostalo);
		const red = redPrednosti(x, uRedu(), postavke);
		if (red.length > 0 && red[0].skupina !== 4) throw new Error(`${s.oznaka}: ${red[0].osoba} je s liste i u dosegu, a sati su ostali`);
		const prijavljeni = prijaviSe(s, x, objavljeno, false);
		if (prijavljeni.length === 0) throw new Error(`${s.oznaka}: za ostatak nema ni kandidata izvana; dodaj kandidata ili promijeni podatke`);
		const prvi = red.find((u) => prijavljeni.includes(u.osoba))!;
		const d = dodijeli(x, prvi);
		if (d.koliko !== ostalo) throw new Error(`${s.oznaka}: kandidat ne može uzeti sav ostatak`);
		put.push({
			u: 'dodijeljeni',
			vrijeme: `${pomakni(objavljeno, 14)}T10:00`,
			tko: 'ravnatelj',
			napomena: `Izbor po bodovima među prijavljenima: ${d.nastavnik}, ${prvi.bodovi} bodova${prijavljeni.length > 1 ? `, ispred još ${prijavljeni.length - 1}` : ''}.`,
		});
	}
	putevi.set(s.oznaka, put);
}

// --- Sati izvan ciklusa -------------------------------------------------------

for (const s of sviSati.filter((x) => !x.uCiklusu)) {
	const put = [...s.put];
	if (s.dodijeliPrvom) {
		const x = potreba(s);
		const red = redPrednosti(x, uRedu(), postavke);
		if (red.length === 0) throw new Error(`${s.oznaka}: nema nikoga u redu prednosti`);
		const d = dodijeli(x, red[0]);
		if (d.koliko !== s.sati) throw new Error(`${s.oznaka}: prva osoba u redu ne može uzeti sve sate`);
		put.push({ u: 'dodijeljeni', vrijeme: s.dodijeliPrvom.vrijeme, tko: 'sustav', napomena: `Prihvatila prva osoba u redu prednosti: ${d.nastavnik}, ${satiTekst(d.koliko)}.` });
	}
	const zadnje = put.at(-1)!;
	if (zadnje.u === 'natjecaj') {
		if (s.rokZaDana === undefined) throw new Error(`${s.oznaka}: natječaju fali rok`);
		// Natječaj smije izaći samo ako nitko iz sustava ne može uzeti te sate.
		const red = redPrednosti(potreba(s), uRedu(), postavke).filter((u) => u.skupina !== 4);
		if (red.length > 0) throw new Error(`${s.oznaka}: ide na natječaj, a ${red[0].osoba} je u redu prednosti`);
		const objavljeno = zadnje.vrijeme.slice(0, 10);
		oglasi.push({ sati: s, koliko: s.sati, objavljeno, rok: pomakni(DANAS, s.rokZaDana) });
		prijaviSe(s, potreba(s), objavljeno, true);
	}
	putevi.set(s.oznaka, put);
}

// Svaki put mora biti dopušten strojem stanja.
const stanje = new Map<string, Stanje>();
for (const s of sviSati) {
	const koraci = putevi.get(s.oznaka)!;
	const put: Prijelaz[] = [{ iz: null, u: 'nastali', vrijeme: s.nastalo }];
	for (const k of koraci) put.push({ iz: put.at(-1)!.u, u: k.u, vrijeme: k.vrijeme });
	const greske = provjeriPut(put);
	if (greske.length > 0) throw new Error(`${s.oznaka}: ${greske.join('; ')}. Ako je baza građena za dan blizu početka školske godine, zadaj kasniji --danas.`);
	stanje.set(s.oznaka, put.at(-1)!.u);
}

// --- Privremena lista -----------------------------------------------------------
// Kako je objavljena 20. 7.: s podacima prije prigovora i dokazima potvrđenim do tada.

const privremeno = (popis: Nastavnik[]) =>
	poredak(
		popis.map((n) => ({ id: n.oznaka, osoba: osobaIz(n, n.stazPrijeIspravka ?? n.staz), dokazano: dokazanoNaDan(n.oznaka, CIKLUS.privremenaLista) })),
		TABLICA,
	);
const naListiOznake = new Set(naListi.map((s) => s.id));
const snimka = [...privremeno(ZAPOSLENI.filter((n) => naListiOznake.has(n.oznaka))), ...privremeno(KANDIDATI)];

// --- Zamjene ------------------------------------------------------------------
// Ostvareni zahtjevi više ne traže par.

const zamjene = nadiZamjene(
	ZAHTJEVI.filter((z) => !ostvareni.has(z.n.oznaka)).map((z) => ({
		id: z.n.oznaka,
		predmet: z.n.predmet,
		sati: z.mjesto.sati,
		skola: z.mjesto.skola,
		mjesto: mjestoSkole(z.mjesto.skola),
		zeli: z.zeli,
	})),
);
const lanacOsobe = new Map<string, string>();
for (const l of zamjene.lanci) for (const c of l.clanovi) lanacOsobe.set(c, l.clanovi.join('>'));
for (const p of POTVRDE) if (!lanacOsobe.has(p.nastavnik)) throw new Error(`${p.nastavnik} potvrđuje zamjenu, a nije ni u jednom lancu`);

// --- SQL ----------------------------------------------------------------------

const q = (v: string | number | boolean | null | undefined): string => {
	if (v === null || v === undefined) return 'NULL';
	if (typeof v === 'number') return String(v);
	if (typeof v === 'boolean') return v ? '1' : '0';
	return `'${v.replace(/'/g, "''")}'`;
};
const skolaId = (sifra: string): string => `(SELECT id FROM skole WHERE sifra = ${q(sifra)})`;
const nastavnikId = (oznaka: string): string => `(SELECT id FROM nastavnici WHERE oznaka = ${q(oznaka)})`;
const satiId = (oznaka: string): string => `(SELECT id FROM sati WHERE oznaka = ${q(oznaka)})`;
const zaposlenjeId = (z: { nastavnik: string; skola: string } | undefined): string =>
	z ? `(SELECT id FROM zaposlenja WHERE nastavnik_id = ${nastavnikId(z.nastavnik)} AND skola_id = ${skolaId(z.skola)})` : 'NULL';
const ciklusId = `(SELECT id FROM ciklusi WHERE skolska_godina = ${q(CIKLUS.skolskaGodina)})`;

const sql: string[] = [
	`-- Fiktivna baza za prototip, građena za ${datum(DANAS, true)} (ciklus ${CIKLUS.skolskaGodina}, tablica ${TABLICA.verzija}).`,
	'-- Napravila ju je skripta scripts/fiktivna-baza.ts; ne uređuj rukom.',
	'DELETE FROM glasovi;',
	'DELETE FROM prijedlozi_kriterija;',
	'DELETE FROM prijave_na_natjecaj;',
	'DELETE FROM lista_snimke;',
	'DELETE FROM uvoz_dokumenti WHERE skola_id IN (SELECT id FROM skole WHERE fiktivna = 1);',
	'DELETE FROM ponude_odbijene;',
	'DELETE FROM prijave_viska;',
	'DELETE FROM promjene_podataka;',
	'DELETE FROM zamjene_potvrde;',
	'DELETE FROM zamjene_zahtjevi;',
	'DELETE FROM prigovori;',
	'DELETE FROM dokazi;',
	'DELETE FROM dodjele;',
	'DELETE FROM oglasi WHERE sati_id IS NOT NULL;',
	'DELETE FROM sati_prijelazi;',
	'DELETE FROM sati;',
	'DELETE FROM zaposlenja;',
	'DELETE FROM nastavnici;',
	'DELETE FROM ciklusi;',
	'DELETE FROM udaljenosti;',
	'DELETE FROM skole WHERE fiktivna = 1;',
];

for (const s of SKOLE) {
	sql.push(
		`INSERT INTO skole (sifra, naziv, mjesto, adresa, razina, zupanija, podrucje, web, fiktivna, lat, lon) VALUES (${q(s.sifra)}, ${q(s.naziv)}, ${q(s.mjesto)}, 'izmišljena škola', ${q(s.razina)}, 'Splitsko-dalmatinska', ${q(s.podrucje)}, NULL, 1, ${s.lat}, ${s.lon});`,
	);
}
for (const [a, b, km] of DIONICE) {
	const [prvo, drugo] = a < b ? [a, b] : [b, a];
	sql.push(`INSERT INTO udaljenosti (mjesto_a, mjesto_b, km) VALUES (${q(prvo)}, ${q(drugo)}, ${km});`);
}
sql.push(
	`INSERT INTO ciklusi (skolska_godina, rok_prijave, privremena_lista, zakljucavanje, prigovori_do, konacna_lista, verzija_tablice) VALUES (${q(CIKLUS.skolskaGodina)}, ${q(CIKLUS.rokPrijave)}, ${q(CIKLUS.privremenaLista)}, ${q(CIKLUS.zakljucavanje)}, ${q(CIKLUS.prigovoriDo)}, ${q(CIKLUS.konacnaLista)}, ${q(TABLICA.verzija)});`,
);

for (const [vrsta, popis] of [
	['zaposlen', ZAPOSLENI],
	['kandidat', KANDIDATI],
] as const) {
	for (const n of popis) {
		sql.push(
			`INSERT INTO nastavnici (oznaka, ime, prezime, vrsta, predmet, mjesto, do_km, staz_obrazovanje, staz_izvan, rodjen, uzdrzavani, samohrani, dijete_teskoce, invaliditet, prethodni_viskovi, napredovanje, kvalifikacija, situacija, zelje) VALUES (${[
				n.oznaka,
				n.ime,
				n.prezime,
				vrsta,
				n.predmet,
				n.mjesto,
				n.doKm ?? 50,
				n.staz,
				n.stazIzvan ?? 0,
				n.rodjen,
				n.uzdrzavani ?? 0,
				n.samohrani ?? false,
				n.dijeteSTeskocama ?? false,
				n.invaliditet ?? false,
				n.prethodniViskovi ?? 0,
				n.napredovanje ?? 'nema',
				n.kvalifikacija,
				n.situacija,
				n.zelje?.join('|'),
			]
				.map(q)
				.join(', ')});`,
		);
		for (const z of n.zaposlenja) {
			sql.push(
				`INSERT INTO zaposlenja (nastavnik_id, skola_id, sati, visak, razlog_viska, ugovor) VALUES (${nastavnikId(n.oznaka)}, ${skolaId(z.skola)}, ${z.sati}, ${z.visak ?? 0}, ${q(z.razlogViska)}, ${q(z.ugovor ?? 'neodredeno')});`,
			);
		}
	}
}

for (const s of sviSati) {
	sql.push(
		`INSERT INTO sati (oznaka, skola_id, predmet, sati, ugovor, trajanje, razlog, nastalo, u_ciklusu, stanje, iz_zaposlenja) VALUES (${q(s.oznaka)}, ${skolaId(s.skola)}, ${q(s.predmet)}, ${s.sati}, ${q(s.ugovor)}, ${q(s.trajanje)}, ${q(s.razlog)}, ${q(s.nastalo)}, ${q(s.uCiklusu ?? false)}, ${q(stanje.get(s.oznaka))}, ${zaposlenjeId(izZaposlenja.get(s.oznaka))});`,
	);
	let iz: Stanje | null = null;
	const koraci: Korak[] = [{ u: 'nastali', vrijeme: s.nastalo, tko: izZaposlenja.has(s.oznaka) ? 'sustav' : 'ravnatelj', napomena: s.razlog }, ...putevi.get(s.oznaka)!];
	for (const k of koraci) {
		sql.push(
			`INSERT INTO sati_prijelazi (sati_id, iz, u, vrijeme, tko, napomena) VALUES (${satiId(s.oznaka)}, ${q(iz)}, ${q(k.u)}, ${q(k.vrijeme)}, ${q(k.tko)}, ${q(k.napomena)});`,
		);
		iz = k.u;
	}
}

for (const d of dodjele) {
	sql.push(
		`INSERT INTO dodjele (sati_id, nastavnik_id, sati, korak, km, napusta_zaposlenje) VALUES (${satiId(d.sati)}, ${nastavnikId(d.nastavnik)}, ${d.koliko}, ${d.korak}, ${d.km}, ${zaposlenjeId(d.napusta)});`,
	);
}

for (const o of oglasi) {
	const s = o.sati;
	const radno = uRadnoVrijeme(o.koliko, s.predmet);
	const opis = `${s.predmet}, 1 izvršitelj/ica, ${satiTekst(o.koliko)} nastave tjedno (${radno} od 40 sati ukupnog radnog vremena), na ${s.ugovor === 'neodredeno' ? 'neodređeno' : 'određeno'} vrijeme. Razlog: ${s.razlog.toLowerCase()}. Testni podatak: škola i natječaj su izmišljeni.`;
	sql.push(
		`INSERT INTO oglasi (skola_id, predmet, uloga, sati_tjedno, ugovor, trajanje, izvrsitelja, mjesto_rada, izvorni_opis, objavljeno, rok, rok_izracunat, izvor_url, stanje, sati_id) VALUES (${skolaId(s.skola)}, ${q(s.predmet)}, 'nastava', ${radno}, ${q(s.ugovor)}, ${q(s.trajanje)}, 1, NULL, ${q(opis)}, ${q(o.objavljeno)}, ${q(o.rok)}, 0, ${q(`/sati/${s.oznaka}`)}, 'objavljen', ${satiId(s.oznaka)});`,
	);
}
for (const p of prijave) {
	sql.push(`INSERT INTO prijave_na_natjecaj (sati_id, nastavnik_id, vrijeme) VALUES (${satiId(p.sati)}, ${nastavnikId(p.nastavnik)}, ${q(p.vrijeme)});`);
}

for (const m of snimka) {
	sql.push(`INSERT INTO lista_snimke (ciklus_id, nastavnik_id, mjesto, bodovi) VALUES (${ciklusId}, ${nastavnikId(m.id)}, ${m.mjesto}, ${m.rezultat.ukupno});`);
}

for (const z of ZAHTJEVI) {
	sql.push(
		`INSERT INTO zamjene_zahtjevi (nastavnik_id, zaposlenje_id, zeli, podneseno, ostvaren) VALUES (${nastavnikId(z.n.oznaka)}, ${zaposlenjeId({ nastavnik: z.n.oznaka, skola: z.mjesto.skola })}, ${q(z.zeli.join('|'))}, ${q(z.podneseno)}, ${q(ostvareni.has(z.n.oznaka))});`,
	);
}
for (const p of POTVRDE) {
	sql.push(`INSERT INTO zamjene_potvrde (lanac, nastavnik_id, potvrdeno) VALUES (${q(lanacOsobe.get(p.nastavnik))}, ${nastavnikId(p.nastavnik)}, ${q(prije(p.prije))});`);
}
for (const d of sviDokazi) {
	sql.push(
		`INSERT INTO dokazi (nastavnik_id, kriterij, dokument, predano, stanje, odluceno, napomena) VALUES (${nastavnikId(d.nastavnik)}, ${q(d.kriterij)}, ${q(d.dokument)}, ${q(d.predano)}, ${q(d.stanje)}, ${q(d.odluceno)}, ${q(d.napomena)});`,
	);
}
for (const p of prigovori(G)) {
	sql.push(
		`INSERT INTO prigovori (nastavnik_id, ciklus_id, na_sto, tekst, podneseno, stanje, odluka, odluceno) VALUES (${nastavnikId(p.nastavnik)}, ${ciklusId}, ${q(p.naSto)}, ${q(p.tekst)}, ${q(p.podneseno)}, ${q(p.stanje)}, ${q(p.odluka)}, ${q(p.odluceno)});`,
	);
}
for (const p of PROMJENE) {
	const n = osobaPoOznaci.get(p.nastavnik)!;
	const { dob: _dob, ...o } = osobaIz(n);
	sql.push(`INSERT INTO promjene_podataka (nastavnik_id, podaci, prijavljeno) VALUES (${nastavnikId(n.oznaka)}, ${q(JSON.stringify({ ...o, ...p.promjena, doKm: n.doKm ?? 50 }))}, ${q(prije(p.prije))});`);
}

// Prijedlozi izmjene tablice: glasaju zaposleni, svaki prijedlog drugim redom.
PRIJEDLOZI.forEach((p, i) => {
	const otvoreno = prije(p.otvoreno);
	const zatvara = pomakni(DANAS, p.zatvara);
	const prijedlogId = `(SELECT id FROM prijedlozi_kriterija WHERE kriterij = ${q(p.kriterij)} AND otvoreno = ${q(otvoreno)})`;
	sql.push(`INSERT INTO prijedlozi_kriterija (kriterij, bodova, obrazlozenje, otvoreno, zatvara) VALUES (${q(p.kriterij)}, ${p.bodova}, ${q(p.obrazlozenje)}, ${q(otvoreno)}, ${q(zatvara)});`);
	const glasaci = [...ZAPOSLENI.slice((i * 7) % ZAPOSLENI.length), ...ZAPOSLENI.slice(0, (i * 7) % ZAPOSLENI.length)];
	if (p.za + p.protiv > glasaci.length) throw new Error(`prijedlog ${p.kriterij}: više glasova nego zaposlenih`);
	const zadnji = zatvara < DANAS ? zatvara : DANAS;
	glasaci.slice(0, p.za + p.protiv).forEach((n, j) => {
		const dan = pomakni(otvoreno, j % Math.max(1, p.otvoreno - Math.max(0, -p.zatvara)));
		sql.push(
			`INSERT INTO glasovi (prijedlog_id, nastavnik_id, glas, vrijeme) VALUES (${prijedlogId}, ${nastavnikId(n.oznaka)}, ${q(j < p.za ? 'za' : 'protiv')}, ${q(`${dan > zadnji ? zadnji : dan}T0${8 + (j % 2)}:${String((j * 7) % 60).padStart(2, '0')}`)});`,
		);
	});
});

// Dokumenti koje je uvoz našao na stranicama (izmišljenih) škola, za pregled.
for (const [sifra, put, naslov, prijeDana, st] of [
	['FIK-12', 'natjecaj-kemija', 'Natječaj za radno mjesto nastavnika/ce kemije', 1, 'novo'],
	['FIK-04', 'odluka-o-izboru', 'Obavijest o izboru kandidata po natječaju', 3, 'odbacen'],
	['FIK-06', 'natjecaj-biologija', 'Natječaj za radno mjesto učitelja/ice biologije', 5, 'obraden'],
] as const) {
	sql.push(
		`INSERT INTO uvoz_dokumenti (skola_id, url, naslov, objavljeno, pronadeno, stanje) VALUES (${skolaId(sifra)}, ${q(`https://${sifra.toLowerCase()}.skole.test/wp-content/uploads/${put}.pdf`)}, ${q(naslov)}, ${q(prije(prijeDana))}, ${q(prije(Math.max(0, prijeDana - 1)))}, ${q(st)});`,
	);
}

mkdirSync('.wrangler', { recursive: true });
writeFileSync('.wrangler/fiktivna-baza.sql', `${sql.join('\n')}\n`);

const brojStanja = [...stanje.values()].reduce<Record<string, number>>((z, s) => ({ ...z, [s]: (z[s] ?? 0) + 1 }), {});
console.log(`Fiktivna baza za ${datum(DANAS, true)}, ciklus ${CIKLUS.skolskaGodina}, tablica ${TABLICA.verzija}:`);
console.log(`  ${SKOLE.length} škola, ${ZAPOSLENI.length} zaposlenih (${naListi.length} na listi), ${KANDIDATI.length} kandidata izvana, ${sviDokazi.length} dokaza`);
console.log(`  ${sviSati.length} slobodnih sati: ${Object.entries(brojStanja).map(([s, n]) => `${s} ${n}`).join(', ')}`);
console.log(`  raspodjela: ${rezultat.dodjele.length} dodjela, ${rezultat.novaMjesta.length} mjesta oslobođeno zamjenom, ${rezultat.ostatak.length} na natječaj, ${rezultat.bezSati.length} osoba bez dovoljno sati`);
for (const d of dodjele) console.log(`    ${d.sati} → ${d.nastavnik} ${d.koliko} h, korak ${d.korak}${d.napusta ? `, napušta ${d.napusta.skola}` : ''}`);
console.log(`  ${oglasi.length} natječaja (${oglasi.filter((o) => o.rok >= DANAS).length} otvorenih), ${prijave.length} prijava`);
console.log(`  zamjene: ${zamjene.lanci.map((l) => l.clanovi.join(' → ')).join('; ')}; bez zamjene ${zamjene.bezZamjene.join(', ')}; ostvareno u raspodjeli ${[...ostvareni].join(', ') || 'nitko'}`);
console.log('SQL: .wrangler/fiktivna-baza.sql');
