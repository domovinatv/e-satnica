// Unos u fiktivnu bazu prototipa, uz probnu prijavu u ulogu (src/lib/uloga.ts).
// Svaka radnja prvo provjeri ulogu, podatke i stanje, a tek onda piše. Prijelazi stanja
// slobodnih sati idu samo putem koji dopušta stroj stanja (sati/radnje.ts) i svaki se
// zapisuje s vremenom. Ishod je kod poruke, koji stranica prikaže nakon preusmjeravanja.
import { env } from 'cloudflare:workers';
import { mozeSeMijenjati } from './bodovanje/glasanje.ts';
import { danas, navrseneGodine, pomakni, sadaLokalno, sati as satiTekst } from './datumi.ts';
import { norma, uRadnoVrijeme } from './norme.ts';
import { mjesta, predmeti, redPrijavljenih, redUSustavu, redZaSate, ucitajPrototip, zamjene, type Nastavnik, type Prototip, type Skola, type SlobodniSati } from './prototip.ts';
import { OBVEZNO_KM } from './raspodjela/raspodjela.ts';
import { jeRadnja, RADNJE } from './sati/radnje.ts';
import { probnaPrijavaUkljucena, zapisiUlogu, type Uloga } from './uloga.ts';
import { sveUloge } from './uloge.ts';
import { smijeOdluciti, zauzeto } from './uloge-pravila.ts';

export interface Ishod {
	ok: boolean;
	kod: string;
	/** Kamo nakon unosa; zadano na stranicu uloge. */
	natrag?: string;
	/** Nova uloga, kad unos stvori osobu u koju se odmah ulazi. */
	uloga?: Uloga;
}

export const PORUKE: Record<string, string> = {
	'sati-prijavljeni': 'Sati su prijavljeni. Sada ih provjerava povjerenstvo.',
	'hitno-prijavljeno': 'Hitan slučaj je zabilježen. Možeš zaposliti zamjenu bez natječaja, najdulje 60 dana.',
	prijelaz: 'Promjena je zapisana u životni put sati.',
	'na-natjecaj': 'Zapisano. Nitko u sustavu ne ispunjava uvjete, pa su sati otišli na javni natječaj.',
	prihvaceno: 'Sati su tvoji i upisani su u tvoju satnicu.',
	'odbijena-ponuda': 'Zabilježeno. Sati se nude sljedećoj osobi u redu.',
	'dokaz-predan': 'Dokaz je predan i čeka potvrdu povjerenstva.',
	'dokaz-odlucen': 'Odluka o dokazu je zapisana.',
	'prigovor-podnesen': 'Prigovor je zaprimljen.',
	'prigovor-izvan-roka': 'Prigovor je zapisan, ali je rok od 48 sati istekao, pa se ne razmatra u ovom ciklusu.',
	'prigovor-odlucen': 'Odluka o prigovoru je zapisana.',
	'zamjena-spremljena': 'Zahtjev za zamjenu je spremljen. Sustav ga odmah uzima u obzir.',
	'zamjena-povucena': 'Zahtjev za zamjenu je povučen.',
	'zamjena-potvrdena': 'Potvrdio/la si zamjenu. Vrijedi kad potvrde svi u lancu.',
	'potvrda-opozvana': 'Potvrda zamjene je opozvana.',
	'podaci-spremljeni': 'Podaci su spremljeni i odmah vrijede za red prednosti na natječajima.',
	'podaci-prijavljeni': 'Podaci su prijavljeni. Lista je zaključana, pa vrijede od idućeg ciklusa.',
	'visak-prijavljen': 'Višak je prijavljen za idući ciklus.',
	'visak-uklonjen': 'Prijava viška je uklonjena.',
	uloga: 'Ušao/la si u probnu ulogu.',
	odjava: 'Izašao/la si iz probne uloge.',
	'nema-baze': 'Podaci prototipa nisu upisani.',
	'nema-uloge': 'Za unos prvo odaberi probnu ulogu.',
	'nije-tvoja-uloga': 'Ta radnja ne pripada tvojoj ulozi ili tvojoj školi.',
	neispravno: 'Podaci nisu ispravni. Provjeri obrazac i pokušaj ponovno.',
	'krivo-stanje': 'Sati više nisu u stanju u kojem je ta radnja moguća.',
	'nisi-na-redu': 'Nisi prva osoba u redu prednosti za te sate.',
	'natjecaj-traje': 'Natječaj još traje. Izbor je moguć kad rok istekne.',
	'nema-kandidata': 'Nitko ne ispunjava uvjete za te sate, pa nema koga izabrati.',
	'nema-zamjene': 'Sustav ti trenutno nije našao zamjenu koju bi potvrdio/la.',
	'jedno-mjesto': 'Zamjena je moguća samo kad radiš na jednom radnom mjestu.',
	'mora-prihvatiti': 'Sati do 50 km cestom moraju se prihvatiti.',
	'hitno-poznato': 'Potreba nastala do roka prijave ne ide hitnim putem. Prijavi je redovno.',
	'prijava-natjecaj': 'Prijava na natječaj je zaprimljena.',
	'prijava-povucena': 'Prijava na natječaj je povučena.',
	'natjecaj-zatvoren': 'Natječaj nije otvoren za prijave.',
	'nije-u-dosegu': 'Ti sati nisu u tvom dosegu ili ti ne fale sati tog predmeta.',
	'nema-prijava': 'Među prijavljenima nema nikoga tko ispunjava uvjete.',
	'glas-zapisan': 'Glas je zapisan.',
	'glasanje-zatvoreno': 'Glasanje o tom prijedlogu je završeno.',
	'prijedlog-otvoren': 'Prijedlog je otvoren za glasanje.',
	'uvoz-odlucen': 'Dokument je označen.',
	'uloga-zatrazena': 'Uloga je zatražena. Vrijedi kad je potvrde.',
	'uloga-odlucena': 'Odluka o ulozi je zapisana.',
	'uloga-kandidat': 'Upisan/a si kao kandidat.',
	'uloga-zauzeta': 'Tu ulogu već ima drugi račun.',
	'uloga-postoji': 'Tu si ulogu već zatražio/la.',
};

const greska = (kod: string): Ishod => ({ ok: false, kod });
const uspjeh = (kod: string, natrag?: string): Ishod => ({ ok: true, kod, natrag });

function tekst(f: FormData, ime: string, najvise: number): string {
	return String(f.get(ime) ?? '')
		.replace(/\s+/g, ' ')
		.trim()
		.slice(0, najvise);
}

function broj(f: FormData, ime: string, najmanje: number, najvise: number): number | null {
	const t = String(f.get(ime) ?? '').trim();
	const n = Number(t);
	return t !== '' && Number.isInteger(n) && n >= najmanje && n <= najvise ? n : null;
}

const JE_DATUM = /^\d{4}-\d{2}-\d{2}$/;

export interface Tko {
	uloga: Uloga;
	skola?: Skola;
	osoba?: Nastavnik;
}

/** Povezuje probnu ulogu sa školom ili osobom iz baze; `null` ako takve nema. */
export function tkoJe(p: Prototip, uloga: Uloga | undefined): Tko | null {
	if (!uloga) return null;
	if (uloga.vrsta === 'povjerenstvo') return { uloga };
	if (uloga.vrsta === 'ravnatelj') {
		const skola = p.skole.find((s) => s.sifra === uloga.id);
		return skola ? { uloga, skola } : null;
	}
	const osoba = p.poOznaci.get(uloga.id);
	if (!osoba || (uloga.vrsta === 'kandidat') !== (osoba.vrsta === 'kandidat')) return null;
	return { uloga, osoba };
}

const upit = (sql: string, ...v: (string | number | null)[]) => env.DB.prepare(sql).bind(...v);

function sljedecaOznaka(postojece: string[], slovo: string, znamenki: number): string {
	const najveci = postojece.reduce((max, o) => (o.startsWith(`${slovo}-`) ? Math.max(max, Number(o.slice(2)) || 0) : max), 0);
	return `${slovo}-${String(najveci + 1).padStart(znamenki, '0')}`;
}

function prijelazUpit(s: SlobodniSati, iz: string, u: string, vrijeme: string, tko: 'ravnatelj' | 'povjerenstvo' | 'sustav', napomena: string | null) {
	return [
		upit('UPDATE sati SET stanje = ? WHERE id = ?', u, s.id),
		upit('INSERT INTO sati_prijelazi (sati_id, iz, u, vrijeme, tko, napomena) VALUES (?, ?, ?, ?, ?, ?)', s.id, iz, u, vrijeme, tko, napomena),
	];
}

/** Sati koje nitko u sustavu ne može uzeti idu na natječaj, a natječaj u javni popis. */
function naNatjecaj(s: SlobodniSati, preostalo: number, vrijeme: string, napomena = 'Nitko na listi ne ispunjava uvjete za ove sate.') {
	const radno = uRadnoVrijeme(preostalo, s.predmet);
	const opis = `${s.predmet}, 1 izvršitelj/ica, ${satiTekst(preostalo)} nastave tjedno (${radno} od 40 sati ukupnog radnog vremena), na ${s.ugovor === 'neodredeno' ? 'neodređeno' : 'određeno'} vrijeme. Razlog: ${s.razlog.toLowerCase()}. Testni podatak: škola i natječaj su izmišljeni.`;
	const objavljeno = vrijeme.slice(0, 10);
	return [
		...prijelazUpit(s, 'ponudeni', 'natjecaj', vrijeme, 'sustav', napomena),
		upit(
			`INSERT INTO oglasi (skola_id, predmet, uloga, sati_tjedno, ugovor, trajanje, izvrsitelja, mjesto_rada, izvorni_opis, objavljeno, rok, rok_izracunat, izvor_url, stanje, sati_id)
			 VALUES (?, ?, 'nastava', ?, ?, ?, 1, NULL, ?, ?, ?, 0, ?, 'objavljen', ?)`,
			s.skola.id,
			s.predmet,
			radno,
			s.ugovor,
			s.trajanje,
			opis,
			objavljeno,
			pomakni(objavljeno, 8),
			`/sati/${s.oznaka}`,
			s.id,
		),
	];
}

// --- Ravnatelj ----------------------------------------------------------------

async function prijaviSate(p: Prototip, tko: Tko, f: FormData): Promise<Ishod> {
	if (!tko.skola) return greska('nije-tvoja-uloga');
	const predmet = tekst(f, 'predmet', 80);
	const sati = predmeti(p).includes(predmet) ? broj(f, 'sati', 1, norma(predmet)) : null;
	const ugovor = tekst(f, 'ugovor', 20);
	const trajanje = tekst(f, 'trajanje', 120);
	const razlog = tekst(f, 'razlog', 160);
	const nastalo = tekst(f, 'nastalo', 10);
	const hitno = f.get('put') === 'hitno';
	const sada = sadaLokalno();
	if (sati === null || (ugovor !== 'neodredeno' && ugovor !== 'odredeno') || razlog.length < 3) return greska('neispravno');
	if (!JE_DATUM.test(nastalo) || nastalo > danas() || nastalo < pomakni(danas(), -400)) return greska('neispravno');
	// Što je bilo poznato do roka prijave, moralo je ući u godišnju raspodjelu.
	if (hitno && nastalo <= p.ciklus.rok_prijave) return greska('hitno-poznato');

	const oznaka = sljedecaOznaka(p.sati.map((s) => s.oznaka), 'S', 3);
	const stanje = hitno ? 'hitno' : 'prijavljeni';
	const id = '(SELECT id FROM sati WHERE oznaka = ?)';
	await env.DB.batch([
		upit(
			'INSERT INTO sati (oznaka, skola_id, predmet, sati, ugovor, trajanje, razlog, nastalo, u_ciklusu, stanje) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)',
			oznaka,
			tko.skola.id,
			predmet,
			sati,
			ugovor,
			trajanje || null,
			razlog,
			nastalo,
			stanje,
		),
		upit(`INSERT INTO sati_prijelazi (sati_id, iz, u, vrijeme, tko, napomena) VALUES (${id}, NULL, 'nastali', ?, 'ravnatelj', ?)`, oznaka, nastalo, razlog),
		upit(`INSERT INTO sati_prijelazi (sati_id, iz, u, vrijeme, tko, napomena) VALUES (${id}, 'nastali', ?, ?, 'ravnatelj', NULL)`, oznaka, stanje, sada),
	]);
	return uspjeh(hitno ? 'hitno-prijavljeno' : 'sati-prijavljeni', `/sati/${oznaka}`);
}

async function visak(p: Prototip, tko: Tko, f: FormData): Promise<Ishod> {
	if (!tko.skola) return greska('nije-tvoja-uloga');
	const id = broj(f, 'zaposlenje', 1, Number.MAX_SAFE_INTEGER);
	const mjesto = p.nastavnici.flatMap((n) => n.zaposlenja).find((z) => z.id === id && z.skola === tko.skola);
	if (!mjesto) return greska('nije-tvoja-uloga');
	if (f.get('akcija') === 'ukloni') {
		await upit('DELETE FROM prijave_viska WHERE zaposlenje_id = ?', mjesto.id).run();
		return uspjeh('visak-uklonjen');
	}
	const sati = broj(f, 'sati', 1, mjesto.sati);
	const razlog = tekst(f, 'razlog', 160);
	if (sati === null || razlog.length < 3) return greska('neispravno');
	await upit(
		`INSERT INTO prijave_viska (zaposlenje_id, sati, razlog, prijavljeno) VALUES (?, ?, ?, ?)
		 ON CONFLICT (zaposlenje_id) DO UPDATE SET sati = excluded.sati, razlog = excluded.razlog, prijavljeno = excluded.prijavljeno`,
		mjesto.id,
		sati,
		razlog,
		danas(),
	).run();
	return uspjeh('visak-prijavljen');
}

// --- Životni put slobodnih sati -------------------------------------------------

async function prijelaz(p: Prototip, tko: Tko, f: FormData): Promise<Ishod> {
	const s = p.sati.find((x) => x.oznaka === tekst(f, 'sati', 10));
	const radnja = tekst(f, 'radnja', 20);
	if (!s || !jeRadnja(radnja)) return greska('neispravno');
	const opis = RADNJE[radnja];
	if (!opis.tko.includes(tko.uloga.vrsta)) return greska('nije-tvoja-uloga');
	if (s.stanje !== opis.iz) return greska('krivo-stanje');
	const sada = sadaLokalno();
	const natrag = `/sati/${s.oznaka}`;

	switch (radnja) {
		case 'dana60':
		case 'potraje': {
			if (tko.skola !== s.skola) return greska('nije-tvoja-uloga');
			const napomena = radnja === 'dana60' ? 'Zaposlenje bez natječaja, najdulje 60 dana, da nastava ne stane.' : 'Potreba traje dulje od 60 dana.';
			await env.DB.batch(prijelazUpit(s, opis.iz, opis.u!, sada, 'ravnatelj', napomena));
			return uspjeh('prijelaz', natrag);
		}
		case 'provjereno': {
			const upiti = prijelazUpit(s, 'prijavljeni', 'ponudeni', sada, 'povjerenstvo', 'Provjereno: stvarna potreba.');
			const nitko = redUSustavu(p, s).length === 0;
			if (nitko) upiti.push(...naNatjecaj(s, s.preostalo, sada));
			await env.DB.batch(upiti);
			return uspjeh(nitko ? 'na-natjecaj' : 'prijelaz', natrag);
		}
		case 'odbij': {
			const napomena = tekst(f, 'napomena', 300);
			if (napomena.length < 3) return greska('neispravno');
			await env.DB.batch(prijelazUpit(s, 'prijavljeni', 'odbijeni', sada, 'povjerenstvo', napomena));
			return uspjeh('prijelaz', natrag);
		}
		case 'prihvati':
		case 'ne-zelim': {
			if (!tko.osoba) return greska('nije-tvoja-uloga');
			const red = redUSustavu(p, s);
			const ja = red.findIndex((u) => u.osoba === tko.osoba!.oznaka);
			if (ja < 0 || (radnja === 'prihvati' && ja !== 0)) return greska('nisi-na-redu');
			const ostali = red.length - 1;
			if (radnja === 'ne-zelim') {
				if (red[ja].km <= OBVEZNO_KM) return greska('mora-prihvatiti');
				const upiti = [upit('INSERT OR IGNORE INTO ponude_odbijene (sati_id, nastavnik_id, vrijeme) VALUES (?, ?, ?)', s.id, tko.osoba.id, sada)];
				if (ostali === 0) upiti.push(...naNatjecaj(s, s.preostalo, sada, `${tko.osoba.oznaka} ne želi ove sate (dalje od 50 km), a nitko drugi u sustavu ne ispunjava uvjete.`));
				await env.DB.batch(upiti);
				return uspjeh(ostali === 0 ? 'na-natjecaj' : 'odbijena-ponuda', '/moje');
			}
			const koliko = Math.min(s.preostalo, red[0].nedostaje);
			const upiti = [upit('INSERT INTO dodjele (sati_id, nastavnik_id, sati, korak, km) VALUES (?, ?, ?, ?, ?)', s.id, tko.osoba.id, koliko, red[0].skupina, red[0].km)];
			if (koliko === s.preostalo) {
				upiti.push(...prijelazUpit(s, 'ponudeni', 'dodijeljeni', sada, 'sustav', `Prihvatila prva osoba u redu prednosti: ${tko.osoba.oznaka}, ${satiTekst(koliko)}.`));
			} else if (ostali === 0) {
				// Osoba je uzela koliko joj fali; ostatak nema tko uzeti u sustavu.
				upiti.push(...naNatjecaj(s, s.preostalo - koliko, sada, `${tko.osoba.oznaka} uzima ${satiTekst(koliko)}; preostalih ${satiTekst(s.preostalo - koliko)} nitko drugi u sustavu ne može uzeti.`));
			}
			await env.DB.batch(upiti);
			return uspjeh('prihvaceno', natrag);
		}
		case 'izbor': {
			if (tko.skola !== s.skola) return greska('nije-tvoja-uloga');
			if (!s.oglas || s.oglas.rok >= danas()) return greska('natjecaj-traje');
			const prvi = redPrijavljenih(p, s)[0];
			const osoba = prvi ? p.poOznaci.get(prvi.osoba) : undefined;
			if (!prvi || !osoba) return greska('nema-prijava');
			const koliko = Math.min(s.preostalo, prvi.nedostaje);
			const upiti = [upit('INSERT INTO dodjele (sati_id, nastavnik_id, sati, korak, km) VALUES (?, ?, ?, 4, ?)', s.id, osoba.id, koliko, prvi.km)];
			if (koliko === s.preostalo) {
				upiti.push(...prijelazUpit(s, 'natjecaj', 'dodijeljeni', sada, 'ravnatelj', `Izbor po bodovima među prijavljenima: ${osoba.oznaka}, ${prvi.bodovi} bodova.`));
			}
			await env.DB.batch(upiti);
			return uspjeh('prijelaz', natrag);
		}
	}
}

// --- Nastavnik i kandidat -------------------------------------------------------

async function predajDokaz(p: Prototip, tko: Tko, f: FormData): Promise<Ishod> {
	if (!tko.osoba) return greska('nije-tvoja-uloga');
	const kriterij = tekst(f, 'kriterij', 40);
	const dokument = tekst(f, 'dokument', 160);
	if (!p.tablica.kriteriji.some((k) => k.kljuc === kriterij && !k.bezDokaza) || dokument.length < 3) return greska('neispravno');
	await upit("INSERT INTO dokazi (nastavnik_id, kriterij, dokument, predano, stanje) VALUES (?, ?, ?, ?, 'ceka')", tko.osoba.id, kriterij, dokument, danas()).run();
	return uspjeh('dokaz-predan');
}

async function podnesiPrigovor(p: Prototip, tko: Tko, f: FormData): Promise<Ishod> {
	if (!tko.osoba || tko.uloga.vrsta !== 'nastavnik') return greska('nije-tvoja-uloga');
	const naSto = tekst(f, 'na_sto', 20);
	const sadrzaj = tekst(f, 'tekst', 1000);
	if ((naSto !== 'bodovi' && naSto !== 'raspodjela') || sadrzaj.length < 10) return greska('neispravno');
	const sada = sadaLokalno();
	// Rok je 48 sati od zaključavanja; kasniji prigovor se bilježi, ali ne razmatra.
	const uRoku = sada <= p.ciklus.prigovori_do;
	await upit(
		'INSERT INTO prigovori (nastavnik_id, ciklus_id, na_sto, tekst, podneseno, stanje, odluka, odluceno) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
		tko.osoba.id,
		p.ciklus.id,
		naSto,
		sadrzaj,
		sada,
		uRoku ? 'zaprimljen' : 'izvan_roka',
		uRoku ? null : 'Prigovor je podnesen nakon isteka roka od 48 sati, pa se ne razmatra u ovom ciklusu.',
		uRoku ? null : sada,
	).run();
	return uspjeh(uRoku ? 'prigovor-podnesen' : 'prigovor-izvan-roka');
}

async function zamjena(p: Prototip, tko: Tko, f: FormData): Promise<Ishod> {
	const osoba = tko.osoba;
	if (!osoba || tko.uloga.vrsta !== 'nastavnik') return greska('nije-tvoja-uloga');
	const akcija = tekst(f, 'akcija', 20);
	const mojePotvrde = upit('DELETE FROM zamjene_potvrde WHERE nastavnik_id = ?', osoba.id);

	if (akcija === 'povuci') {
		await env.DB.batch([mojePotvrde, upit('DELETE FROM zamjene_zahtjevi WHERE nastavnik_id = ?', osoba.id)]);
		return uspjeh('zamjena-povucena');
	}
	if (akcija === 'opozovi') {
		await mojePotvrde.run();
		return uspjeh('potvrda-opozvana');
	}
	if (akcija === 'potvrdi') {
		const lanac = zamjene(p).lanci.find((l) => l.clanovi.some((c) => c.nastavnik === osoba));
		if (!lanac) return greska('nema-zamjene');
		await upit('INSERT OR IGNORE INTO zamjene_potvrde (lanac, nastavnik_id, potvrdeno) VALUES (?, ?, ?)', lanac.kljuc, osoba.id, danas()).run();
		return uspjeh('zamjena-potvrdena');
	}

	if (osoba.zaposlenja.length !== 1) return greska('jedno-mjesto');
	const mjesto = osoba.zaposlenja[0];
	const dopustena = mjesta(p).filter((m) => m !== mjesto.skola.mjesto);
	const zeli = [...new Set(f.getAll('zeli').map(String))].filter((m) => dopustena.includes(m)).slice(0, 3);
	if (zeli.length === 0) return greska('neispravno');
	// Promjena želja mijenja i lance, pa stara potvrda više ne vrijedi.
	await env.DB.batch([
		mojePotvrde,
		upit(
			`INSERT INTO zamjene_zahtjevi (nastavnik_id, zaposlenje_id, zeli, podneseno) VALUES (?, ?, ?, ?)
			 ON CONFLICT (nastavnik_id) DO UPDATE SET zaposlenje_id = excluded.zaposlenje_id, zeli = excluded.zeli, podneseno = excluded.podneseno`,
			osoba.id,
			mjesto.id,
			zeli.join('|'),
			danas(),
		),
	]);
	return uspjeh('zamjena-spremljena');
}

async function natjecaj(p: Prototip, tko: Tko, f: FormData): Promise<Ishod> {
	if (!tko.osoba) return greska('nije-tvoja-uloga');
	const s = p.sati.find((x) => x.oznaka === tekst(f, 'sati', 10));
	if (!s) return greska('neispravno');
	const natrag = `/sati/${s.oznaka}`;
	if (f.get('akcija') === 'povuci') {
		await upit('DELETE FROM prijave_na_natjecaj WHERE sati_id = ? AND nastavnik_id = ?', s.id, tko.osoba.id).run();
		return uspjeh('prijava-povucena', natrag);
	}
	if (s.stanje !== 'natjecaj' || !s.oglas || s.oglas.rok < danas()) return greska('natjecaj-zatvoren');
	if (!redZaSate(p, s).some((u) => u.osoba === tko.osoba!.oznaka)) return greska('nije-u-dosegu');
	await upit('INSERT OR IGNORE INTO prijave_na_natjecaj (sati_id, nastavnik_id, vrijeme) VALUES (?, ?, ?)', s.id, tko.osoba.id, sadaLokalno()).run();
	return uspjeh('prijava-natjecaj', natrag);
}

async function glas(p: Prototip, tko: Tko, f: FormData): Promise<Ishod> {
	// Glasaju zaposleni nastavnici; kandidati izvana nisu u sustavu.
	if (!tko.osoba || tko.uloga.vrsta !== 'nastavnik') return greska('nije-tvoja-uloga');
	const prijedlog = p.prijedlozi.find((x) => x.id === broj(f, 'prijedlog', 1, Number.MAX_SAFE_INTEGER));
	const odluka = tekst(f, 'glas', 10);
	if (!prijedlog || (odluka !== 'za' && odluka !== 'protiv')) return greska('neispravno');
	if (prijedlog.zatvara < danas()) return greska('glasanje-zatvoreno');
	await upit(
		`INSERT INTO glasovi (prijedlog_id, nastavnik_id, glas, vrijeme) VALUES (?, ?, ?, ?)
		 ON CONFLICT (prijedlog_id, nastavnik_id) DO UPDATE SET glas = excluded.glas, vrijeme = excluded.vrijeme`,
		prijedlog.id,
		tko.osoba.id,
		odluka,
		sadaLokalno(),
	).run();
	return uspjeh('glas-zapisan', '/kriteriji');
}

interface PodaciZaBodove {
	stazUObrazovanju: number;
	stazIzvanObrazovanja: number;
	uzdrzavaniClanovi: number;
	prethodniViskovi: number;
	samohraniIliSamac: boolean;
	dijeteSTeskocama: boolean;
	invaliditet: boolean;
	napredovanje: 'nema' | 'mentor' | 'savjetnik';
	doKm: number;
}

/** Želje (do tri mjesta, redom) i trenutna satnica po radnom mjestu. */
function citajZeljeISatnicu(p: Prototip, osoba: Nastavnik, f: FormData): { zelje: string[]; satnica: Record<string, number> } | null {
	const dopustena = mjesta(p);
	const zelje = [...new Set([1, 2, 3].map((i) => tekst(f, `zelja${i}`, 60)).filter(Boolean))];
	if (zelje.some((m) => !dopustena.includes(m))) return null;
	const satnica: Record<string, number> = {};
	for (const z of osoba.zaposlenja) {
		const n = broj(f, `sati-${z.id}`, 0, 40);
		if (n === null) return null;
		satnica[z.id] = n;
	}
	return { zelje, satnica };
}

function citajPodatke(f: FormData): PodaciZaBodove | null {
	const staz = broj(f, 'stazUObrazovanju', 0, 50);
	const izvan = broj(f, 'stazIzvanObrazovanja', 0, 50);
	const uzdrzavani = broj(f, 'uzdrzavaniClanovi', 0, 15);
	const viskovi = broj(f, 'prethodniViskovi', 0, 10);
	const doKm = broj(f, 'doKm', 50, 300);
	const napredovanje = tekst(f, 'napredovanje', 20);
	if (staz === null || izvan === null || uzdrzavani === null || viskovi === null || doKm === null) return null;
	if (napredovanje !== 'nema' && napredovanje !== 'mentor' && napredovanje !== 'savjetnik') return null;
	return {
		stazUObrazovanju: staz,
		stazIzvanObrazovanja: izvan,
		uzdrzavaniClanovi: uzdrzavani,
		prethodniViskovi: viskovi,
		samohraniIliSamac: f.get('samohraniIliSamac') === 'da',
		dijeteSTeskocama: f.get('dijeteSTeskocama') === 'da',
		invaliditet: f.get('invaliditet') === 'da',
		napredovanje,
		doKm,
	};
}

async function podaci(p: Prototip, tko: Tko, f: FormData): Promise<Ishod> {
	if (!tko.osoba) return greska('nije-tvoja-uloga');
	const d = citajPodatke(f);
	if (!d) return greska('neispravno');

	// Nastavnik je na zaključanoj listi: prijava se čuva za idući ciklus.
	if (tko.uloga.vrsta === 'nastavnik') {
		const dodatno = citajZeljeISatnicu(p, tko.osoba, f);
		if (!dodatno) return greska('neispravno');
		await upit(
			`INSERT INTO promjene_podataka (nastavnik_id, podaci, prijavljeno) VALUES (?, ?, ?)
			 ON CONFLICT (nastavnik_id) DO UPDATE SET podaci = excluded.podaci, prijavljeno = excluded.prijavljeno`,
			tko.osoba.id,
			JSON.stringify({ ...d, ...dodatno }),
			danas(),
		).run();
		return uspjeh('podaci-prijavljeni');
	}

	// Kandidat nije na zaključanoj listi, pa podaci vrijede odmah.
	const mjesto = tekst(f, 'mjesto', 60);
	if (!mjesta(p).includes(mjesto)) return greska('neispravno');
	await upit(
		`UPDATE nastavnici SET staz_obrazovanje = ?, staz_izvan = ?, uzdrzavani = ?, prethodni_viskovi = ?, samohrani = ?, dijete_teskoce = ?,
		 invaliditet = ?, napredovanje = ?, do_km = ?, mjesto = ?, kvalifikacija = ? WHERE id = ?`,
		d.stazUObrazovanju,
		d.stazIzvanObrazovanja,
		d.uzdrzavaniClanovi,
		d.prethodniViskovi,
		Number(d.samohraniIliSamac),
		Number(d.dijeteSTeskocama),
		Number(d.invaliditet),
		d.napredovanje,
		d.doKm,
		mjesto,
		tekst(f, 'kvalifikacija', 160) || null,
		tko.osoba.id,
	).run();
	return uspjeh('podaci-spremljeni');
}

// --- Povjerenstvo -----------------------------------------------------------------

async function odluciDokaz(p: Prototip, tko: Tko, f: FormData): Promise<Ishod> {
	if (tko.uloga.vrsta !== 'povjerenstvo') return greska('nije-tvoja-uloga');
	const dokaz = p.dokazi.find((d) => d.id === broj(f, 'dokaz', 1, Number.MAX_SAFE_INTEGER));
	const odluka = tekst(f, 'odluka', 20);
	const napomena = tekst(f, 'napomena', 300);
	if (!dokaz || (odluka !== 'potvrdi' && odluka !== 'odbij') || (odluka === 'odbij' && napomena.length < 3)) return greska('neispravno');
	if (dokaz.stanje !== 'ceka') return greska('krivo-stanje');
	await upit("UPDATE dokazi SET stanje = ?, odluceno = ?, napomena = ? WHERE id = ? AND stanje = 'ceka'", odluka === 'potvrdi' ? 'potvrden' : 'odbijen', danas(), napomena || dokaz.napomena, dokaz.id).run();
	return uspjeh('dokaz-odlucen');
}

async function odluciPrigovor(p: Prototip, tko: Tko, f: FormData): Promise<Ishod> {
	if (tko.uloga.vrsta !== 'povjerenstvo') return greska('nije-tvoja-uloga');
	const prigovor = p.prigovori.find((x) => x.id === broj(f, 'prigovor', 1, Number.MAX_SAFE_INTEGER));
	const odluka = tekst(f, 'odluka', 20);
	const obrazlozenje = tekst(f, 'obrazlozenje', 600);
	if (!prigovor || (odluka !== 'usvoji' && odluka !== 'odbij') || obrazlozenje.length < 3) return greska('neispravno');
	if (prigovor.stanje !== 'zaprimljen') return greska('krivo-stanje');
	await upit("UPDATE prigovori SET stanje = ?, odluka = ?, odluceno = ? WHERE id = ? AND stanje = 'zaprimljen'", odluka === 'usvoji' ? 'usvojen' : 'odbijen', obrazlozenje, sadaLokalno(), prigovor.id).run();
	return uspjeh('prigovor-odlucen');
}

async function prijedlog(p: Prototip, tko: Tko, f: FormData): Promise<Ishod> {
	if (tko.uloga.vrsta !== 'povjerenstvo') return greska('nije-tvoja-uloga');
	const kriterij = tekst(f, 'kriterij', 40);
	const bodova = broj(f, 'bodova', 0, 20);
	const obrazlozenje = tekst(f, 'obrazlozenje', 400);
	const zatvara = tekst(f, 'zatvara', 10);
	if (!mozeSeMijenjati(p.tablica, kriterij) || bodova === null || obrazlozenje.length < 3) return greska('neispravno');
	if (!JE_DATUM.test(zatvara) || zatvara <= danas() || zatvara > pomakni(danas(), 60)) return greska('neispravno');
	await upit('INSERT INTO prijedlozi_kriterija (kriterij, bodova, obrazlozenje, otvoreno, zatvara) VALUES (?, ?, ?, ?, ?)', kriterij, bodova, obrazlozenje, danas(), zatvara).run();
	return uspjeh('prijedlog-otvoren', '/kriteriji');
}

async function uvoz(_p: Prototip, tko: Tko, f: FormData): Promise<Ishod> {
	if (tko.uloga.vrsta !== 'povjerenstvo') return greska('nije-tvoja-uloga');
	const id = broj(f, 'dokument', 1, Number.MAX_SAFE_INTEGER);
	const odluka = tekst(f, 'odluka', 20);
	const stanje = odluka === 'obradi' ? 'obraden' : odluka === 'odbaci' ? 'odbacen' : odluka === 'vrati' ? 'novo' : null;
	if (id === null || !stanje) return greska('neispravno');
	await upit('UPDATE uvoz_dokumenti SET stanje = ? WHERE id = ?', stanje, id).run();
	return uspjeh('uvoz-odlucen', '/uvoz');
}

async function odluciUlogu(p: Prototip, tko: Tko, f: FormData): Promise<Ishod> {
	const id = broj(f, 'uloga', 1, Number.MAX_SAFE_INTEGER);
	const odluka = tekst(f, 'odluka', 20);
	const z = (await sveUloge()).find((u) => u.id === id);
	if (!z || (odluka !== 'potvrdi' && odluka !== 'odbij')) return greska('neispravno');
	if (z.stanje !== 'ceka') return greska('krivo-stanje');
	const skoleOsobe = (oznaka: string) => p.poOznaci.get(oznaka)?.zaposlenja.map((x) => x.skola.sifra) ?? [];
	if (!smijeOdluciti(tko.uloga, z, skoleOsobe)) return greska('nije-tvoja-uloga');
	await upit(
		"UPDATE uloge SET stanje = ?, odluceno = ?, odlucio = ? WHERE id = ? AND stanje = 'ceka'",
		odluka === 'potvrdi' ? 'potvrdena' : 'odbijena',
		sadaLokalno(),
		zapisiUlogu(tko.uloga),
		z.id,
	).run();
	return uspjeh('uloga-odlucena');
}

/**
 * Zahtjev prijavljenog računa za ulogu. Ravnatelja potvrđuje povjerenstvo, nastavnika
 * ravnatelj njegove škole; kandidat izvana upisuje sebe i uloga vrijedi odmah.
 */
export async function zatraziUlogu(korisnikId: number, f: FormData): Promise<Ishod> {
	const p = await ucitajPrototip();
	if (!p) return greska('nema-baze');
	const vrsta = tekst(f, 'vrsta', 20);
	const sada = sadaLokalno();
	if (vrsta === 'kandidat') {
		const ishod = await noviKandidat(p, f);
		if (!ishod.ok || !ishod.uloga) return ishod;
		await upit(
			"INSERT INTO uloge (korisnik_id, vrsta, cilj, stanje, zatrazeno, odluceno, odlucio) VALUES (?, 'kandidat', ?, 'potvrdena', ?, ?, 'sam/a')",
			korisnikId,
			ishod.uloga.id,
			sada,
			sada,
		).run();
		return uspjeh('uloga-kandidat');
	}
	if (vrsta !== 'ravnatelj' && vrsta !== 'nastavnik') return greska('neispravno');
	const cilj = tekst(f, 'cilj', 10);
	if (vrsta === 'ravnatelj' && !p.skole.some((x) => x.sifra === cilj)) return greska('neispravno');
	if (vrsta === 'nastavnik' && p.poOznaci.get(cilj)?.vrsta !== 'zaposlen') return greska('neispravno');
	const postojece = await sveUloge();
	if (zauzeto({ vrsta, cilj }, postojece.filter((u) => u.stanje === 'potvrdena'), korisnikId)) return greska('uloga-zauzeta');
	if (postojece.some((u) => u.korisnikId === korisnikId && u.vrsta === vrsta && u.cilj === cilj && u.stanje !== 'odbijena')) return greska('uloga-postoji');
	await upit('INSERT INTO uloge (korisnik_id, vrsta, cilj, zatrazeno) VALUES (?, ?, ?, ?)', korisnikId, vrsta, cilj, sada).run();
	return uspjeh('uloga-zatrazena');
}

// --- Novi kandidat ----------------------------------------------------------------

const JE_IME = /^\p{L}[\p{L} .'-]{1,39}$/u;

/** Upisuje novog kandidata izvana i vraća ulogu u koju se odmah ulazi. */
export async function noviKandidat(p: Prototip, f: FormData): Promise<Ishod> {
	const ime = tekst(f, 'ime', 40);
	const prezime = tekst(f, 'prezime', 40);
	const predmet = tekst(f, 'predmet', 80);
	const mjesto = tekst(f, 'mjesto', 60);
	const rodjen = tekst(f, 'rodjen', 10);
	const staz = broj(f, 'stazUObrazovanju', 0, 50);
	if (!JE_IME.test(ime) || !JE_IME.test(prezime) || !predmeti(p).includes(predmet) || !mjesta(p).includes(mjesto) || staz === null || !JE_DATUM.test(rodjen)) return greska('neispravno');
	if (rodjen > pomakni(danas(), -18 * 365)) return greska('neispravno');
	try {
		if (navrseneGodine(rodjen, p.ciklus.zakljucavanje) > 75) return greska('neispravno');
	} catch {
		return greska('neispravno');
	}
	const oznaka = sljedecaOznaka(p.nastavnici.map((n) => n.oznaka), 'K', 2);
	await upit(
		"INSERT INTO nastavnici (oznaka, ime, prezime, vrsta, predmet, mjesto, staz_obrazovanje, rodjen, kvalifikacija, situacija) VALUES (?, ?, ?, 'kandidat', ?, ?, ?, ?, ?, 'Upisan/a kroz probnu prijavu.')",
		oznaka,
		ime,
		prezime,
		predmet,
		mjesto,
		staz,
		rodjen,
		tekst(f, 'kvalifikacija', 160) || null,
	).run();
	return { ok: true, kod: 'uloga', uloga: { vrsta: 'kandidat', id: oznaka } };
}

const AKCIJE: Record<string, (p: Prototip, tko: Tko, f: FormData) => Promise<Ishod>> = {
	sati: prijaviSate,
	visak,
	prijelaz,
	dokaz: predajDokaz,
	prigovor: podnesiPrigovor,
	zamjena,
	podaci,
	'dokaz-odluka': odluciDokaz,
	'prigovor-odluka': odluciPrigovor,
	natjecaj,
	glas,
	prijedlog,
	uvoz,
	'uloga-odluka': odluciUlogu,
};

export async function unesi(akcija: string, uloga: Uloga | undefined, f: FormData): Promise<Ishod> {
	if (!Object.hasOwn(AKCIJE, akcija)) return greska('neispravno');
	const radnja = AKCIJE[akcija];
	const p = await ucitajPrototip();
	if (!p) return greska('nema-baze');
	const tko = tkoJe(p, uloga);
	if (!tko) return { ...greska('nema-uloge'), natrag: probnaPrijavaUkljucena() ? '/probna-prijava' : '/uloga' };
	return radnja(p, tko, f);
}
