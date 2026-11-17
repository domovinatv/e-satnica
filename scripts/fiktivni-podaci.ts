// Izmišljeni podaci jedne županije za prototip: škole, nastavnici, slobodni sati,
// zamjene, dokazi i prigovori. Nijedna osoba ni škola ovdje nije stvarna; stvarna su
// samo imena mjesta i približne cestovne udaljenosti među njima.
//
// Podaci su složeni tako da pokažu tipične situacije iz specifikacije. Tko što dobiva
// ne piše ovdje: to izračuna scripts/fiktivna-baza.ts istim kodom kojim računa aplikacija.

import type { Stanje } from '../src/lib/sati/stanja.ts';

export interface Skola {
	sifra: string;
	naziv: string;
	mjesto: string;
	razina: 'osnovna' | 'srednja';
	podrucje: 'priobalje' | 'otoci' | 'zagora';
	/** Približne koordinate (izmišljena škola u stvarnom mjestu), za skriptu udaljenosti. */
	lat: number;
	lon: number;
}

export const SKOLE: Skola[] = [
	{ sifra: 'FIK-01', naziv: 'OŠ Maslina', mjesto: 'Split', razina: 'osnovna', podrucje: 'priobalje', lat: 43.5081, lon: 16.4402 },
	{ sifra: 'FIK-02', naziv: 'OŠ Lavanda', mjesto: 'Split', razina: 'osnovna', podrucje: 'priobalje', lat: 43.512, lon: 16.468 },
	{ sifra: 'FIK-03', naziv: 'OŠ Galeb', mjesto: 'Solin', razina: 'osnovna', podrucje: 'priobalje', lat: 43.539, lon: 16.494 },
	{ sifra: 'FIK-04', naziv: 'OŠ Ružmarin', mjesto: 'Kaštela', razina: 'osnovna', podrucje: 'priobalje', lat: 43.553, lon: 16.35 },
	{ sifra: 'FIK-05', naziv: 'OŠ Smokva', mjesto: 'Trogir', razina: 'osnovna', podrucje: 'priobalje', lat: 43.516, lon: 16.251 },
	{ sifra: 'FIK-06', naziv: 'OŠ Bura', mjesto: 'Omiš', razina: 'osnovna', podrucje: 'priobalje', lat: 43.444, lon: 16.689 },
	{ sifra: 'FIK-07', naziv: 'OŠ Kadulja', mjesto: 'Sinj', razina: 'osnovna', podrucje: 'zagora', lat: 43.703, lon: 16.639 },
	{ sifra: 'FIK-08', naziv: 'OŠ Drača', mjesto: 'Imotski', razina: 'osnovna', podrucje: 'zagora', lat: 43.447, lon: 17.216 },
	{ sifra: 'FIK-09', naziv: 'OŠ Lanterna', mjesto: 'Makarska', razina: 'osnovna', podrucje: 'priobalje', lat: 43.297, lon: 17.017 },
	{ sifra: 'FIK-10', naziv: 'OŠ Sidro', mjesto: 'Supetar', razina: 'osnovna', podrucje: 'otoci', lat: 43.384, lon: 16.553 },
	{ sifra: 'FIK-11', naziv: 'OŠ Val', mjesto: 'Vis', razina: 'osnovna', podrucje: 'otoci', lat: 43.061, lon: 16.183 },
	{ sifra: 'FIK-12', naziv: 'Gimnazija Maestral', mjesto: 'Split', razina: 'srednja', podrucje: 'priobalje', lat: 43.506, lon: 16.432 },
	{ sifra: 'FIK-13', naziv: 'Strukovna škola Tramontana', mjesto: 'Split', razina: 'srednja', podrucje: 'priobalje', lat: 43.515, lon: 16.452 },
	{ sifra: 'FIK-14', naziv: 'Srednja škola Levanat', mjesto: 'Sinj', razina: 'srednja', podrucje: 'zagora', lat: 43.7, lon: 16.645 },
	{ sifra: 'FIK-15', naziv: 'Srednja škola Jugo', mjesto: 'Omiš', razina: 'srednja', podrucje: 'priobalje', lat: 43.446, lon: 16.695 },
];

// Približni kilometri cestom, zaokruženi. Otoci nemaju cestovnu vezu s kopnom, pa
// ih u tablici nema: do njih se ne može u 50 km.
export const DIONICE: [string, string, number][] = [
	['Split', 'Solin', 8],
	['Split', 'Kaštela', 14],
	['Split', 'Trogir', 28],
	['Split', 'Omiš', 25],
	['Split', 'Sinj', 34],
	['Split', 'Imotski', 84],
	['Split', 'Makarska', 62],
	['Solin', 'Kaštela', 8],
	['Solin', 'Trogir', 24],
	['Solin', 'Omiš', 30],
	['Solin', 'Sinj', 29],
	['Solin', 'Imotski', 80],
	['Solin', 'Makarska', 66],
	['Kaštela', 'Trogir', 14],
	['Kaštela', 'Omiš', 38],
	['Kaštela', 'Sinj', 36],
	['Kaštela', 'Imotski', 88],
	['Kaštela', 'Makarska', 74],
	['Trogir', 'Omiš', 52],
	['Trogir', 'Sinj', 53],
	['Trogir', 'Imotski', 104],
	['Trogir', 'Makarska', 90],
	['Omiš', 'Sinj', 50],
	['Omiš', 'Imotski', 62],
	['Omiš', 'Makarska', 37],
	['Sinj', 'Imotski', 62],
	['Sinj', 'Makarska', 85],
	['Imotski', 'Makarska', 40],
];

export interface Zaposlenje {
	skola: string;
	sati: number;
	visak?: number;
	razlogViska?: string;
	ugovor?: 'neodredeno' | 'odredeno';
}

export interface Nastavnik {
	oznaka: string;
	ime: string;
	prezime: string;
	predmet: string;
	mjesto: string;
	rodjen: string;
	staz: number;
	stazIzvan?: number;
	uzdrzavani?: number;
	samohrani?: boolean;
	dijeteSTeskocama?: boolean;
	invaliditet?: boolean;
	prethodniViskovi?: number;
	napredovanje?: 'mentor' | 'savjetnik';
	doKm?: number;
	/** Prazno za kandidata izvana. */
	zaposlenja: Zaposlenje[];
	kvalifikacija?: string;
	situacija: string;
	/** Mjesta po redu želje; raspodjela ih nudi prvima. */
	zelje?: string[];
	/** Staž kako je bio na privremenoj listi, prije usvojenog prigovora. */
	stazPrijeIspravka?: number;
}

const REFORMA = 'Reforma strukovnog obrazovanja smanjila je satnicu predmeta';
const ODJELI = 'Manje razrednih odjela';

export const ZAPOSLENI: Nastavnik[] = [
	{
		oznaka: 'N-001', ime: 'Katarina', prezime: 'Bašić', predmet: 'Povijest', mjesto: 'Split', rodjen: '1974-03-02',
		staz: 24, uzdrzavani: 2, zaposlenja: [{ skola: 'FIK-01', sati: 14 }],
		situacija: 'Iskusna nastavnica koja godinama radi na nepunoj satnici.',
		zelje: ['Split', 'Solin'],
	},
	{
		oznaka: 'N-002', ime: 'Ivan', prezime: 'Kovačević', predmet: 'Povijest', mjesto: 'Solin', rodjen: '1993-05-20',
		staz: 6, uzdrzavani: 2, zaposlenja: [{ skola: 'FIK-03', sati: 11 }],
		situacija: 'Mlađi nastavnik na pola norme. Uzdržavane članove nije dokazao, pa mu se ne boduju.',
	},
	{
		oznaka: 'N-003', ime: 'Marija', prezime: 'Jurić', predmet: 'Povijest', mjesto: 'Sinj', rodjen: '1982-01-11',
		staz: 15, stazPrijeIspravka: 14, uzdrzavani: 1, zaposlenja: [{ skola: 'FIK-07', sati: 16 }],
		situacija: 'Prigovorom je ispravila staž upisan s godinom manje.',
	},
	{
		oznaka: 'N-004', ime: 'Petra', prezime: 'Vuković', predmet: 'Matematika', mjesto: 'Kaštela', rodjen: '1985-04-07',
		staz: 14, uzdrzavani: 1, samohrani: true, dijeteSTeskocama: true, zaposlenja: [{ skola: 'FIK-04', sati: 12 }],
		situacija: 'Samohrana majka djeteta s teškoćama, s potvrđenim dokazima za socijalne kriterije.',
	},
	{
		oznaka: 'N-005', ime: 'Josip', prezime: 'Matić', predmet: 'Matematika', mjesto: 'Split', rodjen: '1997-02-14',
		staz: 3, zaposlenja: [{ skola: 'FIK-02', sati: 2 }],
		situacija: 'Zaposlen na 2 sata fakultativne nastave. Po današnjoj praksi satnica bi mu rasla unutar škole, mimo liste.',
	},
	{
		oznaka: 'N-006', ime: 'Luka', prezime: 'Babić', predmet: 'Matematika', mjesto: 'Omiš', rodjen: '1990-06-30',
		staz: 9, uzdrzavani: 2, zaposlenja: [{ skola: 'FIK-06', sati: 10 }],
		situacija: 'Na pola norme; nadopunu skuplja u dvije škole.',
		zelje: ['Omiš', 'Split'],
	},
	{
		oznaka: 'N-007', ime: 'Ana', prezime: 'Tomić', predmet: 'Engleski jezik', mjesto: 'Solin', rodjen: '1987-07-19',
		staz: 12, uzdrzavani: 1,
		zaposlenja: [{ skola: 'FIK-01', sati: 5 }, { skola: 'FIK-03', sati: 4 }, { skola: 'FIK-04', sati: 4 }, { skola: 'FIK-05', sati: 3 }],
		situacija: 'Radi u četiri škole i još joj fale sati do pune norme.',
		zelje: ['Solin', 'Split', 'Trogir'],
	},
	{
		oznaka: 'N-008', ime: 'Marko', prezime: 'Novak', predmet: 'Engleski jezik', mjesto: 'Trogir', rodjen: '1979-03-25',
		staz: 20, uzdrzavani: 2, napredovanje: 'mentor', zaposlenja: [{ skola: 'FIK-05', sati: 15 }],
		situacija: 'Mentor s nepunom satnicom; nadopunu dobiva u vlastitoj školi jer je prvi po bodovima.',
	},
	{
		oznaka: 'N-009', ime: 'Tonči', prezime: 'Marinković', predmet: 'Fizika', mjesto: 'Vis', rodjen: '1978-05-05',
		staz: 18, uzdrzavani: 2, zaposlenja: [{ skola: 'FIK-11', sati: 22, visak: 8, razlogViska: ODJELI }],
		situacija: 'Višak na otoku. Sati na kopnu nisu mu u dosegu, ali kolega koji se seli oslobodio je sate u njegovoj školi.',
	},
	{
		oznaka: 'N-010', ime: 'Stipe', prezime: 'Radić', predmet: 'Strojarska skupina predmeta', mjesto: 'Split', rodjen: '1971-02-01',
		staz: 28, stazIzvan: 4, uzdrzavani: 1, zaposlenja: [{ skola: 'FIK-13', sati: 22, visak: 14, razlogViska: REFORMA }],
		situacija: 'Reforma mu je uzela 14 od 22 sata. Zbrinut je u dvije druge škole.',
	},
	{
		oznaka: 'N-011', ime: 'Mate', prezime: 'Barić', predmet: 'Strojarska skupina predmeta', mjesto: 'Solin', rodjen: '1981-05-12',
		staz: 17, uzdrzavani: 3, prethodniViskovi: 1, zaposlenja: [{ skola: 'FIK-13', sati: 22, visak: 22, razlogViska: REFORMA }],
		situacija: 'Potpuni višak. U dosegu nije bilo dovoljno sati, pa je zbrinut samo djelomično.',
		zelje: ['Omiš', 'Sinj'],
	},
	{
		oznaka: 'N-012', ime: 'Nikolina', prezime: 'Šimić', predmet: 'Informatika', mjesto: 'Imotski', rodjen: '1988-03-03',
		staz: 11, uzdrzavani: 2, zaposlenja: [{ skola: 'FIK-08', sati: 22, visak: 6, razlogViska: ODJELI }],
		situacija: 'Djelomični višak iz Zagore, zbrinut u Makarskoj, 40 km cestom.',
	},
	{
		oznaka: 'N-013', ime: 'Dario', prezime: 'Pavlović', predmet: 'Informatika', mjesto: 'Makarska', rodjen: '1984-01-20',
		staz: 7, stazIzvan: 6, zaposlenja: [{ skola: 'FIK-09', sati: 18 }],
		situacija: 'Došao iz gospodarstva. Staž izvan obrazovanja boduje mu se od potvrde dokaza, pa ga privremena lista nema.',
	},
	{
		oznaka: 'N-014', ime: 'Ivana', prezime: 'Grgić', predmet: 'Tjelesna i zdravstvena kultura', mjesto: 'Split', rodjen: '1991-04-09',
		staz: 10, zaposlenja: [{ skola: 'FIK-01', sati: 12 }],
		situacija: 'Izjednačena s kolegom po bodovima i svim pravilima prednosti.',
	},
	{
		oznaka: 'N-015', ime: 'Filip', prezime: 'Knežević', predmet: 'Tjelesna i zdravstvena kultura', mjesto: 'Split', rodjen: '1991-06-01',
		staz: 10, zaposlenja: [{ skola: 'FIK-02', sati: 12 }],
		situacija: 'Izjednačen s kolegicom; ostao bez sati jer pravilo za takav slučaj još nije odlučeno.',
	},
	{
		oznaka: 'N-016', ime: 'Vesna', prezime: 'Lončar', predmet: 'Glazbena kultura', mjesto: 'Trogir', rodjen: '1976-02-17',
		staz: 22, uzdrzavani: 1, zaposlenja: [{ skola: 'FIK-05', sati: 16 }],
		situacija: 'Fale joj sati, a jedini prijavljeni sati predmeta odbijeni su kao fakultativna nastava.',
	},
	{
		oznaka: 'N-017', ime: 'Goran', prezime: 'Vidović', predmet: 'Geografija', mjesto: 'Split', rodjen: '1983-06-06',
		staz: 16, uzdrzavani: 2, zaposlenja: [{ skola: 'FIK-01', sati: 14 }],
		situacija: 'U raspodjeli nije bilo sati geografije. Dobio ih je tek u rujnu, kad je škola kasno prijavila potrebu.',
	},
	{
		oznaka: 'N-018', ime: 'Lucija', prezime: 'Barišić', predmet: 'Hrvatski jezik', mjesto: 'Sinj', rodjen: '1995-01-15',
		staz: 5, zaposlenja: [{ skola: 'FIK-07', sati: 10 }],
		situacija: 'Mlada nastavnica iz Zagore koja nadopunu nalazi u Splitu.',
		zelje: ['Split', 'Sinj'],
	},
	{
		oznaka: 'N-019', ime: 'Branka', prezime: 'Klarić', predmet: 'Hrvatski jezik', mjesto: 'Split', rodjen: '1966-04-21',
		staz: 35, prethodniViskovi: 2, napredovanje: 'savjetnik', zaposlenja: [{ skola: 'FIK-01', sati: 20, visak: 5, razlogViska: ODJELI }],
		situacija: 'Savjetnica pred mirovinom, treći put višak. Prva je na listi.',
	},
	// Traže zamjenu radnog mjesta.
	{
		oznaka: 'N-020', ime: 'Jelena', prezime: 'Ćosić', predmet: 'Matematika', mjesto: 'Imotski', rodjen: '1989-02-08',
		staz: 8, uzdrzavani: 1, zaposlenja: [{ skola: 'FIK-08', sati: 20 }],
		situacija: 'Iz Zagore bi u Split; našla je par.',
	},
	{
		oznaka: 'N-021', ime: 'Tomislav', prezime: 'Rajić', predmet: 'Matematika', mjesto: 'Split', rodjen: '1984-05-16',
		staz: 13, uzdrzavani: 2, zaposlenja: [{ skola: 'FIK-01', sati: 20 }],
		situacija: 'Vraća se u Imotski; rijedak slučaj da netko želi iz Splita.',
	},
	{
		oznaka: 'N-022', ime: 'Sanja', prezime: 'Delić', predmet: 'Hrvatski jezik', mjesto: 'Sinj', rodjen: '1986-03-27',
		staz: 12, zaposlenja: [{ skola: 'FIK-07', sati: 20 }],
		situacija: 'Dio lanca od troje: bez treće osobe zamjene ne bi bilo.',
	},
	{
		oznaka: 'N-023', ime: 'Nenad', prezime: 'Bilić', predmet: 'Hrvatski jezik', mjesto: 'Split', rodjen: '1980-01-09',
		staz: 19, uzdrzavani: 2, zaposlenja: [{ skola: 'FIK-02', sati: 20 }],
		situacija: 'Dio lanca od troje.',
	},
	{
		oznaka: 'N-024', ime: 'Mirjana', prezime: 'Jukić', predmet: 'Hrvatski jezik', mjesto: 'Omiš', rodjen: '1977-06-14',
		staz: 21, uzdrzavani: 1, zaposlenja: [{ skola: 'FIK-06', sati: 20 }],
		situacija: 'Dio lanca od troje; još nije potvrdila.',
	},
	{
		oznaka: 'N-025', ime: 'Davor', prezime: 'Sušac', predmet: 'Engleski jezik', mjesto: 'Vis', rodjen: '1990-02-22',
		staz: 7, zaposlenja: [{ skola: 'FIK-11', sati: 20 }],
		situacija: 'S otoka bi na kopno, kao i gotovo svi; nema tko doći na njegovo mjesto.',
	},
	{
		oznaka: 'N-026', ime: 'Iva', prezime: 'Mandić', predmet: 'Engleski jezik', mjesto: 'Supetar', rodjen: '1992-04-03',
		staz: 6, zaposlenja: [{ skola: 'FIK-10', sati: 20 }],
		situacija: 'S otoka bi u Split; bez zamjene.',
	},
	{
		oznaka: 'N-027', ime: 'Zoran', prezime: 'Pezo', predmet: 'Engleski jezik', mjesto: 'Makarska', rodjen: '1983-07-28',
		staz: 15, uzdrzavani: 3, zaposlenja: [{ skola: 'FIK-09', sati: 20 }],
		situacija: 'Želi u Split ili Omiš; bez zamjene.',
	},
	{
		oznaka: 'N-028', ime: 'Martina', prezime: 'Čulić', predmet: 'Povijest', mjesto: 'Imotski', rodjen: '1988-01-19',
		staz: 10, uzdrzavani: 1, zaposlenja: [{ skola: 'FIK-08', sati: 22 }],
		situacija: 'Našla je par, ali druga strana nudi mjesto na određeno.',
	},
	{
		oznaka: 'N-029', ime: 'Robert', prezime: 'Zelić', predmet: 'Povijest', mjesto: 'Split', rodjen: '1991-03-11',
		staz: 4, zaposlenja: [{ skola: 'FIK-12', sati: 22, ugovor: 'odredeno' }],
		situacija: 'Nudi u zamjenu mjesto na određeno, koje iduće godine nestaje.',
	},
	{
		oznaka: 'N-030', ime: 'Karla', prezime: 'Brkić', predmet: 'Geografija', mjesto: 'Trogir', rodjen: '1996-05-02',
		staz: 4, zaposlenja: [{ skola: 'FIK-05', sati: 11 }],
		situacija: 'Na pola norme; traži i zamjenu i nadopunu.',
	},
	{
		oznaka: 'N-031', ime: 'Hrvoje', prezime: 'Lozić', predmet: 'Geografija', mjesto: 'Kaštela', rodjen: '1990-02-25',
		staz: 9, zaposlenja: [{ skola: 'FIK-04', sati: 11 }],
		situacija: 'Na pola norme; zamjena s kolegicom iz Trogira još nije potvrđena.',
	},
	{
		oznaka: 'N-032', ime: 'Dragan', prezime: 'Mišić', predmet: 'Glazbena kultura', mjesto: 'Sinj', rodjen: '1975-04-30',
		staz: 23, uzdrzavani: 1, zaposlenja: [{ skola: 'FIK-07', sati: 22 }],
		situacija: 'Želi u Split, ali jedina osoba koja bi u Sinj nudi upola manju satnicu.',
	},
	{
		oznaka: 'N-033', ime: 'Renata', prezime: 'Pavić', predmet: 'Glazbena kultura', mjesto: 'Split', rodjen: '1989-06-18',
		staz: 8, zaposlenja: [{ skola: 'FIK-02', sati: 11 }],
		situacija: 'Išla bi u Sinj, ali zamjena traži istu satnicu.',
	},
	{
		oznaka: 'N-034', ime: 'Ante', prezime: 'Šarić', predmet: 'Fizika', mjesto: 'Vis', rodjen: '1987-09-14',
		staz: 11, uzdrzavani: 2, zaposlenja: [{ skola: 'FIK-11', sati: 8 }],
		situacija: 'Seli se u Trogir. U raspodjeli je zamjenom dobio jednako velike sate ondje; njegove sate na Visu preuzeo je kolega višak.',
	},
];

export const KANDIDATI: Nastavnik[] = [
	{
		oznaka: 'K-01', ime: 'Mia', prezime: 'Raguž', predmet: 'Povijest', mjesto: 'Imotski', rodjen: '1999-02-10',
		staz: 1, zaposlenja: [], kvalifikacija: 'mag. educ. povijesti, 2023.',
		situacija: 'Tek završila studij; za sate u svom mjestu ima manje bodova od kandidata iz Makarske.',
	},
	{
		oznaka: 'K-02', ime: 'Leon', prezime: 'Katić', predmet: 'Fizika', mjesto: 'Trogir', rodjen: '2000-05-05',
		staz: 0, zaposlenja: [], kvalifikacija: 'mag. educ. fizike, 2025.',
		situacija: 'Mladi fizičar. Sate u Trogiru dobio je zamjenom nastavnik iz sustava, koji ima prednost pred natječajem.',
	},
	{
		oznaka: 'K-03', ime: 'Darko', prezime: 'Bandić', predmet: 'Povijest', mjesto: 'Makarska', rodjen: '1992-03-18',
		staz: 3, stazIzvan: 5, zaposlenja: [], kvalifikacija: 'mag. educ. povijesti i geografije, 2017.',
		situacija: 'Godinama na zamjenama; staž mu nosi prednost na natječaju.',
	},
	{
		oznaka: 'K-04', ime: 'Ema', prezime: 'Perković', predmet: 'Engleski jezik', mjesto: 'Split', rodjen: '1996-07-07',
		staz: 2, zaposlenja: [], kvalifikacija: 'mag. educ. engleskog jezika, 2021.',
		situacija: 'Dobila je 2 sata koja su ostala nakon nadopune.',
	},
	{
		oznaka: 'K-05', ime: 'Nika', prezime: 'Topić', predmet: 'Matematika', mjesto: 'Imotski', rodjen: '2001-01-30',
		staz: 0, zaposlenja: [], kvalifikacija: 'mag. educ. matematike, 2025.',
		situacija: 'Prva po bodovima za otvoreni natječaj u svom mjestu.',
	},
	{
		oznaka: 'K-06', ime: 'Roko', prezime: 'Bulić', predmet: 'Biologija', mjesto: 'Omiš', rodjen: '1997-06-12',
		staz: 1, zaposlenja: [], kvalifikacija: 'mag. educ. biologije i kemije, 2022.',
		situacija: 'Čeka ishod natječaja za zamjenu.',
	},
	{
		oznaka: 'K-07', ime: 'Slaven', prezime: 'Erceg', predmet: 'Fizika', mjesto: 'Sinj', rodjen: '1985-02-02',
		staz: 0, stazIzvan: 12, zaposlenja: [], kvalifikacija: 'mag. ing. elektrotehnike, 2009.; pedagoške kompetencije 2024.',
		situacija: 'Inženjer koji prelazi u nastavu; boduje mu se staž izvan obrazovanja.',
	},
	{
		oznaka: 'K-08', ime: 'Tea', prezime: 'Vrdoljak', predmet: 'Informatika', mjesto: 'Split', rodjen: '2002-03-03',
		staz: 0, zaposlenja: [], kvalifikacija: 'mag. educ. informatike, 2026.',
		situacija: 'Najmlađa na listi kandidata.',
	},
	{
		oznaka: 'K-09', ime: 'Paula', prezime: 'Ivić', predmet: 'Engleski jezik', mjesto: 'Supetar', rodjen: '1993-08-01',
		staz: 4, zaposlenja: [], kvalifikacija: 'mag. educ. engleskog i talijanskog jezika, 2018.',
		situacija: 'Živi na otoku, pa su joj u dosegu samo otočni sati.',
	},
	{
		oznaka: 'K-10', ime: 'Vedran', prezime: 'Mamić', predmet: 'Hrvatski jezik', mjesto: 'Split', rodjen: '1995-05-25',
		staz: 2, zaposlenja: [], kvalifikacija: 'mag. educ. hrvatskog jezika i književnosti, 2020.',
		situacija: 'Na listi kandidata; dolazi na red tek kad nitko iz sustava ne može uzeti sate.',
	},
	{
		oznaka: 'K-11', ime: 'Antonia', prezime: 'Skoko', predmet: 'Tjelesna i zdravstvena kultura', mjesto: 'Makarska', rodjen: '1998-04-04',
		staz: 1, zaposlenja: [], kvalifikacija: 'mag. kineziologije, 2022.',
		situacija: 'Kandidatkinja za zamjenu u svom mjestu.',
	},
];

export type Tko = 'ravnatelj' | 'povjerenstvo' | 'sustav';

export interface Korak {
	u: Stanje;
	vrijeme: string;
	tko: Tko;
	napomena?: string;
}

export interface Sati {
	oznaka: string;
	skola: string;
	predmet: string;
	sati: number;
	ugovor: 'neodredeno' | 'odredeno';
	trajanje?: string;
	razlog: string;
	nastalo: string;
	/** Put nakon nastanka. Za sate iz ciklusa generator sam dodaje ishod raspodjele. */
	put: Korak[];
	/** Sati koji su provjereni do zaključavanja i ulaze u godišnju raspodjelu. */
	uCiklusu?: boolean;
	/** Otvoreni natječaj: koliko dana od danas traje rok. */
	rokZaDana?: number;
	/** Sati izvan ciklusa koje dobiva prva osoba u redu prednosti. */
	dodijeliPrvom?: { vrijeme: string };
}

/**
 * Slobodni sati. `g` je godina u kojoj je ciklus zaključan, a `prije(n)` datum n dana
 * prije dana za koji se baza gradi, da otvoreni natječaji ne isteknu čim se podaci upišu.
 */
export function slobodniSati(g: number, prije: (n: number) => string): Sati[] {
	const redovito = (prijavljeno: string, provjereno: string): Korak[] => [
		{ u: 'prijavljeni', vrijeme: prijavljeno, tko: 'ravnatelj' },
		{ u: 'ponudeni', vrijeme: provjereno, tko: 'povjerenstvo', napomena: 'Provjereno: stvarna potreba.' },
	];
	const MIROVINA = 'Odlazak u mirovinu';
	const OBVEZA = 'Smanjenje tjedne obveze nakon 30 godina staža';
	const ODJEL = 'Novi razredni odjel';
	return [
		// Godišnji ciklus: prijavljeno do 15. 7., provjereno prije privremene liste.
		{ oznaka: 'S-001', skola: 'FIK-02', predmet: 'Povijest', sati: 6, ugovor: 'neodredeno', razlog: MIROVINA, nastalo: `${g}-05-18`, uCiklusu: true, put: redovito(`${g}-06-02T10:15`, `${g}-07-16T09:00`) },
		{ oznaka: 'S-002', skola: 'FIK-12', predmet: 'Povijest', sati: 2, ugovor: 'neodredeno', razlog: OBVEZA, nastalo: `${g}-06-10`, uCiklusu: true, put: redovito(`${g}-06-15T08:40`, `${g}-07-16T09:10`) },
		{ oznaka: 'S-003', skola: 'FIK-14', predmet: 'Povijest', sati: 4, ugovor: 'neodredeno', razlog: ODJEL, nastalo: `${g}-06-20`, uCiklusu: true, put: redovito(`${g}-06-24T12:05`, `${g}-07-16T09:20`) },
		{ oznaka: 'S-004', skola: 'FIK-08', predmet: 'Povijest', sati: 10, ugovor: 'neodredeno', razlog: MIROVINA, nastalo: `${g}-04-30`, uCiklusu: true, put: redovito(`${g}-05-12T09:30`, `${g}-07-16T09:30`) },
		{ oznaka: 'S-005', skola: 'FIK-02', predmet: 'Matematika', sati: 2, ugovor: 'neodredeno', razlog: OBVEZA, nastalo: `${g}-06-08`, uCiklusu: true, put: redovito(`${g}-06-12T11:00`, `${g}-07-16T10:00`) },
		{ oznaka: 'S-006', skola: 'FIK-02', predmet: 'Matematika', sati: 8, ugovor: 'neodredeno', razlog: MIROVINA, nastalo: `${g}-05-25`, uCiklusu: true, put: redovito(`${g}-06-12T11:05`, `${g}-07-16T10:05`) },
		{ oznaka: 'S-007', skola: 'FIK-06', predmet: 'Matematika', sati: 4, ugovor: 'odredeno', trajanje: `Zamjena za rodiljni dopust, do 30. 6. ${g + 1}.`, razlog: 'Rodiljni dopust', nastalo: `${g}-06-28`, uCiklusu: true, put: redovito(`${g}-07-03T13:20`, `${g}-07-16T10:10`) },
		{ oznaka: 'S-008', skola: 'FIK-05', predmet: 'Engleski jezik', sati: 5, ugovor: 'neodredeno', razlog: ODJEL, nastalo: `${g}-06-16`, uCiklusu: true, put: redovito(`${g}-06-18T09:45`, `${g}-07-16T10:30`) },
		{ oznaka: 'S-009', skola: 'FIK-03', predmet: 'Engleski jezik', sati: 6, ugovor: 'neodredeno', razlog: 'Odlazak nastavnice u drugu županiju', nastalo: `${g}-07-01`, uCiklusu: true, put: redovito(`${g}-07-06T08:15`, `${g}-07-16T10:35`) },
		{ oznaka: 'S-010', skola: 'FIK-05', predmet: 'Fizika', sati: 8, ugovor: 'neodredeno', razlog: MIROVINA, nastalo: `${g}-05-05`, uCiklusu: true, put: redovito(`${g}-05-20T14:00`, `${g}-07-16T11:00`) },
		{ oznaka: 'S-011', skola: 'FIK-14', predmet: 'Strojarska skupina predmeta', sati: 12, ugovor: 'neodredeno', razlog: 'Novi program povećao je satnicu predmeta', nastalo: `${g}-06-01`, uCiklusu: true, put: redovito(`${g}-06-09T10:00`, `${g}-07-16T11:20`) },
		{ oznaka: 'S-012', skola: 'FIK-15', predmet: 'Strojarska skupina predmeta', sati: 10, ugovor: 'neodredeno', razlog: 'Novi program povećao je satnicu predmeta', nastalo: `${g}-06-01`, uCiklusu: true, put: redovito(`${g}-06-11T09:10`, `${g}-07-16T11:25`) },
		{ oznaka: 'S-013', skola: 'FIK-09', predmet: 'Informatika', sati: 8, ugovor: 'neodredeno', razlog: 'Informatika postaje obvezna u još dva razreda', nastalo: `${g}-06-05`, uCiklusu: true, put: redovito(`${g}-06-17T12:30`, `${g}-07-16T11:40`) },
		{ oznaka: 'S-014', skola: 'FIK-03', predmet: 'Tjelesna i zdravstvena kultura', sati: 10, ugovor: 'neodredeno', razlog: MIROVINA, nastalo: `${g}-05-28`, uCiklusu: true, put: redovito(`${g}-06-04T10:50`, `${g}-07-16T12:00`) },
		{ oznaka: 'S-015', skola: 'FIK-02', predmet: 'Hrvatski jezik', sati: 9, ugovor: 'neodredeno', razlog: MIROVINA, nastalo: `${g}-05-11`, uCiklusu: true, put: redovito(`${g}-05-29T09:00`, `${g}-07-16T12:10`) },
		// Prijavljeno na vrijeme, ali odbijeno pri provjeri.
		{
			oznaka: 'S-016', skola: 'FIK-05', predmet: 'Glazbena kultura', sati: 2, ugovor: 'neodredeno', razlog: 'Fakultativna nastava (školski zbor)', nastalo: `${g}-06-01`,
			put: [
				{ u: 'prijavljeni', vrijeme: `${g}-06-25T11:30`, tko: 'ravnatelj' },
				{ u: 'odbijeni', vrijeme: `${g}-07-17T10:00`, tko: 'povjerenstvo', napomena: 'Nije stvarna potreba: fakultativna nastava ne otvara radno mjesto. Sate može održati nastavnica koja u školi već radi na nepunoj satnici.' },
			],
		},
		// Kasna prijava: potreba poznata u lipnju, prijavljena tek u jesen.
		{
			oznaka: 'S-017', skola: 'FIK-04', predmet: 'Geografija', sati: 8, ugovor: 'neodredeno', razlog: MIROVINA, nastalo: `${g}-06-12`,
			put: [
				{ u: 'prijavljeni', vrijeme: `${prije(73)}T09:12`, tko: 'ravnatelj', napomena: 'Prijavljeno nakon roka; nastavnik je otišao u mirovinu 31. 8.' },
				{ u: 'ponudeni', vrijeme: `${prije(68)}T10:00`, tko: 'povjerenstvo', napomena: 'Provjereno: stvarna potreba.' },
			],
			dodijeliPrvom: { vrijeme: `${prije(64)}T12:00` },
		},
		// Tijekom godine.
		{
			oznaka: 'S-018', skola: 'FIK-03', predmet: 'Hrvatski jezik', sati: 6, ugovor: 'odredeno', trajanje: 'Zamjena za bolovanje, najdulje do kraja nastavne godine', razlog: 'Dugotrajno bolovanje', nastalo: prije(3),
			put: [{ u: 'prijavljeni', vrijeme: `${prije(1)}T08:20`, tko: 'ravnatelj' }],
		},
		{
			oznaka: 'S-019', skola: 'FIK-12', predmet: 'Hrvatski jezik', sati: 4, ugovor: 'neodredeno', razlog: 'Dodatni razredni odjel od drugog polugodišta', nastalo: prije(9),
			put: [
				{ u: 'prijavljeni', vrijeme: `${prije(7)}T13:00`, tko: 'ravnatelj' },
				{ u: 'ponudeni', vrijeme: `${prije(4)}T09:30`, tko: 'povjerenstvo', napomena: 'Provjereno: stvarna potreba. Ponuđeno prvima u redu prednosti.' },
			],
		},
		{
			oznaka: 'S-020', skola: 'FIK-07', predmet: 'Fizika', sati: 22, ugovor: 'odredeno', trajanje: 'Zamjena za bolovanje', razlog: 'Operacija i dugotrajno bolovanje', nastalo: prije(48), rokZaDana: 5,
			put: [
				{ u: 'hitno', vrijeme: `${prije(48)}T07:30`, tko: 'ravnatelj', napomena: 'Nastavnik je hitno operiran.' },
				{ u: 'dana60', vrijeme: `${prije(46)}T08:00`, tko: 'ravnatelj', napomena: 'Zaposlenje bez natječaja, najdulje 60 dana, da nastava ne stane.' },
				{ u: 'prijavljeni', vrijeme: `${prije(10)}T10:40`, tko: 'ravnatelj', napomena: 'Bolovanje je produljeno; potreba traje dulje od 60 dana.' },
				{ u: 'ponudeni', vrijeme: `${prije(7)}T09:00`, tko: 'povjerenstvo', napomena: 'Provjereno: stvarna potreba.' },
				{ u: 'natjecaj', vrijeme: `${prije(5)}T09:00`, tko: 'sustav', napomena: 'Nastavnicima fizike s liste Sinj nije u dosegu.' },
			],
		},
		{
			oznaka: 'S-021', skola: 'FIK-06', predmet: 'Biologija', sati: 22, ugovor: 'odredeno', trajanje: 'Zamjena za rodiljni dopust', razlog: 'Rodiljni dopust', nastalo: prije(12), rokZaDana: 6,
			put: [
				{ u: 'prijavljeni', vrijeme: `${prije(11)}T09:05`, tko: 'ravnatelj' },
				{ u: 'ponudeni', vrijeme: `${prije(9)}T11:00`, tko: 'povjerenstvo', napomena: 'Provjereno: stvarna potreba.' },
				{ u: 'natjecaj', vrijeme: `${prije(4)}T09:00`, tko: 'sustav', napomena: 'Na listi nema nastavnika biologije kojem fale sati.' },
			],
		},
		{
			oznaka: 'S-022', skola: 'FIK-10', predmet: 'Engleski jezik', sati: 20, ugovor: 'neodredeno', razlog: 'Odlazak nastavnika iz škole', nastalo: prije(20), rokZaDana: 8,
			put: [
				{ u: 'prijavljeni', vrijeme: `${prije(18)}T12:10`, tko: 'ravnatelj' },
				{ u: 'ponudeni', vrijeme: `${prije(15)}T09:40`, tko: 'povjerenstvo', napomena: 'Provjereno: stvarna potreba.' },
				{ u: 'natjecaj', vrijeme: `${prije(2)}T09:00`, tko: 'sustav', napomena: 'Nitko s liste ne može do otoka u 50 km cestom.' },
			],
		},
		{
			oznaka: 'S-023', skola: 'FIK-08', predmet: 'Matematika', sati: 10, ugovor: 'neodredeno', razlog: 'Odlazak nastavnice iz škole', nastalo: prije(15), rokZaDana: 0,
			put: [
				{ u: 'prijavljeni', vrijeme: `${prije(14)}T08:50`, tko: 'ravnatelj' },
				{ u: 'ponudeni', vrijeme: `${prije(12)}T10:15`, tko: 'povjerenstvo', napomena: 'Provjereno: stvarna potreba.' },
				{ u: 'natjecaj', vrijeme: `${prije(8)}T09:00`, tko: 'sustav', napomena: 'Matematičarima kojima fale sati Imotski je dalje od 50 km cestom.' },
			],
		},
		{
			oznaka: 'S-024', skola: 'FIK-14', predmet: 'Informatika', sati: 4, ugovor: 'neodredeno', razlog: 'Novi izborni predmet', nastalo: prije(16), rokZaDana: 1,
			put: [
				{ u: 'prijavljeni', vrijeme: `${prije(14)}T10:00`, tko: 'ravnatelj' },
				{ u: 'ponudeni', vrijeme: `${prije(11)}T09:20`, tko: 'povjerenstvo', napomena: 'Provjereno: stvarna potreba.' },
				{ u: 'natjecaj', vrijeme: `${prije(7)}T09:00`, tko: 'sustav', napomena: 'Informatičaru kojem fale sati Sinj je dalje od 50 km cestom.' },
			],
		},
		{
			oznaka: 'S-025', skola: 'FIK-09', predmet: 'Tjelesna i zdravstvena kultura', sati: 11, ugovor: 'odredeno', trajanje: 'Zamjena za roditeljski dopust', razlog: 'Roditeljski dopust', nastalo: prije(4), rokZaDana: 9,
			put: [
				{ u: 'prijavljeni', vrijeme: `${prije(3)}T09:00`, tko: 'ravnatelj' },
				{ u: 'ponudeni', vrijeme: `${prije(2)}T10:00`, tko: 'povjerenstvo', napomena: 'Provjereno: stvarna potreba.' },
				{ u: 'natjecaj', vrijeme: `${prije(0)}T09:00`, tko: 'sustav', napomena: 'Nastavniku kojem fale sati Makarska je dalje od 50 km cestom.' },
			],
		},
		{
			oznaka: 'S-026', skola: 'FIK-14', predmet: 'Kemija', sati: 22, ugovor: 'odredeno', trajanje: 'Najdulje 60 dana', razlog: 'Neočekivan odlazak nastavnice', nastalo: prije(20),
			put: [
				{ u: 'hitno', vrijeme: `${prije(20)}T08:00`, tko: 'ravnatelj', napomena: 'Nastavnica je dala otkaz bez najave.' },
				{ u: 'dana60', vrijeme: `${prije(18)}T08:00`, tko: 'ravnatelj', napomena: 'Zaposlenje bez natječaja, najdulje 60 dana.' },
			],
		},
		{
			oznaka: 'S-027', skola: 'FIK-11', predmet: 'Matematika', sati: 20, ugovor: 'odredeno', trajanje: 'Dok traje bolovanje', razlog: 'Iznenadno bolovanje', nastalo: prije(1),
			put: [{ u: 'hitno', vrijeme: `${prije(1)}T07:45`, tko: 'ravnatelj', napomena: 'Nastavnik je na bolovanju od jučer; škola traži zamjenu.' }],
		},
	];
}

export interface ZahtjevZamjene {
	nastavnik: string;
	zeli: string[];
	/** Prije koliko dana je zahtjev podnesen, ili datum za zahtjeve iz ciklusa. */
	podnesenoPrije: number | string;
}

/**
 * Zahtjevi podneseni do zaključavanja ulaze u godišnju raspodjelu (korak 3, zamjena
 * na slobodno mjesto). Ostali čekaju par među drugim zahtjevima.
 */
export const zamjeneZahtjevi = (g: number): ZahtjevZamjene[] => [
	{ nastavnik: 'N-034', zeli: ['Trogir', 'Kaštela'], podnesenoPrije: `${g}-07-08` },
	...ZAMJENE,
];

const ZAMJENE: ZahtjevZamjene[] = [
	{ nastavnik: 'N-020', zeli: ['Split', 'Solin'], podnesenoPrije: 40 },
	{ nastavnik: 'N-021', zeli: ['Imotski'], podnesenoPrije: 33 },
	{ nastavnik: 'N-022', zeli: ['Split'], podnesenoPrije: 45 },
	{ nastavnik: 'N-023', zeli: ['Omiš'], podnesenoPrije: 30 },
	{ nastavnik: 'N-024', zeli: ['Sinj'], podnesenoPrije: 21 },
	{ nastavnik: 'N-025', zeli: ['Split', 'Solin', 'Kaštela'], podnesenoPrije: 50 },
	{ nastavnik: 'N-026', zeli: ['Split'], podnesenoPrije: 48 },
	{ nastavnik: 'N-027', zeli: ['Split', 'Omiš'], podnesenoPrije: 27 },
	{ nastavnik: 'N-028', zeli: ['Split'], podnesenoPrije: 36 },
	{ nastavnik: 'N-029', zeli: ['Imotski'], podnesenoPrije: 12 },
	{ nastavnik: 'N-030', zeli: ['Kaštela'], podnesenoPrije: 9 },
	{ nastavnik: 'N-031', zeli: ['Trogir'], podnesenoPrije: 6 },
	{ nastavnik: 'N-032', zeli: ['Split'], podnesenoPrije: 25 },
	{ nastavnik: 'N-033', zeli: ['Sinj'], podnesenoPrije: 18 },
];

/** Tko je potvrdio zamjenu koju mu je sustav našao, i prije koliko dana. */
export const POTVRDE: { nastavnik: string; prije: number }[] = [
	{ nastavnik: 'N-020', prije: 20 },
	{ nastavnik: 'N-021', prije: 17 },
	{ nastavnik: 'N-022', prije: 14 },
	{ nastavnik: 'N-023', prije: 11 },
];

export interface Dokaz {
	nastavnik: string;
	kriterij: string;
	dokument: string;
	predano: string;
	stanje: 'ceka' | 'potvrden' | 'odbijen';
	odluceno?: string;
	napomena?: string;
}

export function dokazi(g: number, prije: (n: number) => string): Dokaz[] {
	return [
		{ nastavnik: 'N-004', kriterij: 'samohrani', dokument: 'Rješenje o roditeljskoj skrbi', predano: `${g}-06-20`, stanje: 'potvrden', odluceno: `${g}-07-02` },
		{ nastavnik: 'N-004', kriterij: 'dijete_teskoce', dokument: 'Nalaz i mišljenje tijela vještačenja', predano: `${g}-06-20`, stanje: 'potvrden', odluceno: `${g}-07-02` },
		{ nastavnik: 'N-019', kriterij: 'prethodni_visak', dokument: 'Dva rješenja o proglašenju viškom', predano: `${g}-06-10`, stanje: 'potvrden', odluceno: `${g}-06-28` },
		{ nastavnik: 'N-019', kriterij: 'napredovanje', dokument: 'Odluka o napredovanju u zvanje savjetnika', predano: `${g}-06-10`, stanje: 'potvrden', odluceno: `${g}-06-28` },
		{ nastavnik: 'N-008', kriterij: 'napredovanje', dokument: 'Odluka o napredovanju u zvanje mentora', predano: `${g}-06-22`, stanje: 'potvrden', odluceno: `${g}-07-03` },
		{ nastavnik: 'N-011', kriterij: 'prethodni_visak', dokument: 'Rješenje o proglašenju viškom', predano: `${g}-06-30`, stanje: 'potvrden', odluceno: `${g}-07-08` },
		{ nastavnik: 'N-013', kriterij: 'staz_izvan', dokument: 'Elektronički zapis o radnom stažu', predano: `${g}-07-14`, stanje: 'potvrden', odluceno: `${g}-07-28` },
		{ nastavnik: 'K-07', kriterij: 'staz_izvan', dokument: 'Elektronički zapis o radnom stažu', predano: `${g}-07-09`, stanje: 'potvrden', odluceno: `${g}-07-14` },
		{
			nastavnik: 'N-002', kriterij: 'uzdrzavani', dokument: 'Izjava o dvoje uzdržavanih članova, bez potvrde', predano: `${g}-07-10`, stanje: 'odbijen', odluceno: `${g}-07-18`,
			napomena: 'Izjava bez potvrde nije dovoljna. Kriterij se ne boduje dok se ne dostavi potpun dokaz.',
		},
		{
			nastavnik: 'N-003', kriterij: 'staz_obrazovanje', dokument: 'Potvrda škole o radnom stažu', predano: `${g}-08-16`, stanje: 'potvrden', odluceno: `${g}-08-18`,
			napomena: 'Predano uz prigovor; staž ispravljen s 14 na 15 navršenih godina.',
		},
		{
			nastavnik: 'N-015', kriterij: 'samohrani', dokument: 'Rješenje o roditeljskoj skrbi', predano: prije(6), stanje: 'ceka',
			napomena: 'Predano nakon zaključavanja; vrijedit će za idući ciklus.',
		},
		{ nastavnik: 'N-012', kriterij: 'uzdrzavani', dokument: 'Potvrda o trećem uzdržavanom članu obitelji', predano: prije(2), stanje: 'ceka' },
	];
}

/**
 * Dokument koji se traži uz svaki kriterij. Za kriterij koji osoba ima, a za koji gore
 * nema dokaza predanog do zaključavanja, generator dodaje potvrđen dokaz iz ovog popisa.
 */
export const DOKUMENTI: Record<string, string> = {
	staz_obrazovanje: 'Elektronički zapis o radnom stažu',
	staz_izvan: 'Elektronički zapis o radnom stažu',
	uzdrzavani: 'Potvrda o uzdržavanim članovima obitelji',
	samohrani: 'Rješenje o roditeljskoj skrbi',
	dijete_teskoce: 'Nalaz i mišljenje tijela vještačenja',
	invaliditet: 'Rješenje o invaliditetu',
	prethodni_visak: 'Rješenje o proglašenju viškom',
	napredovanje: 'Odluka o napredovanju',
};

/** Podaci za idući ciklus, prijavljeni nakon zaključavanja (uz dokaz koji još čeka). */
export const PROMJENE: { nastavnik: string; promjena: { uzdrzavaniClanovi?: number; samohraniIliSamac?: boolean }; prije: number }[] = [
	{ nastavnik: 'N-012', promjena: { uzdrzavaniClanovi: 3 }, prije: 2 },
	{ nastavnik: 'N-015', promjena: { samohraniIliSamac: true }, prije: 6 },
];

export interface PrijedlogKriterija {
	kriterij: string;
	bodova: number;
	obrazlozenje: string;
	otvoreno: number;
	/** Dana od danas: negativno je u prošlosti. */
	zatvara: number;
	za: number;
	protiv: number;
}

/** Prijedlozi izmjene bodovne tablice i glasovi zaposlenih. */
export const PRIJEDLOZI: PrijedlogKriterija[] = [
	{ kriterij: 'samohrani', bodova: 4, obrazlozenje: 'Samohrani roditelj sam nosi brigu o djeci; 2 boda su premalo.', otvoreno: 30, zatvara: -2, za: 15, protiv: 8 },
	{ kriterij: 'dob', bodova: 2, obrazlozenje: 'Kao u pravilniku SDŽ: 2 boda po navršenoj godini.', otvoreno: 28, zatvara: -3, za: 9, protiv: 14 },
	{ kriterij: 'prethodni_visak', bodova: 3, obrazlozenje: 'Tko je više puta bio višak, teže nalazi stalno mjesto.', otvoreno: 4, zatvara: 10, za: 6, protiv: 2 },
];

export interface Prigovor {
	nastavnik: string;
	naSto: 'bodovi' | 'raspodjela';
	tekst: string;
	podneseno: string;
	stanje: 'zaprimljen' | 'usvojen' | 'odbijen' | 'izvan_roka';
	odluka?: string;
	odluceno?: string;
}

export function prigovori(g: number): Prigovor[] {
	return [
		{
			nastavnik: 'N-003', naSto: 'bodovi', podneseno: `${g}-08-16T09:40`, stanje: 'usvojen', odluceno: `${g}-08-18T11:00`,
			tekst: 'Staž u obrazovanju upisan mi je kao 14 godina, a na dan zaključavanja imam 15 navršenih. Prilažem potvrdu škole.',
			odluka: 'Potvrda škole pokazuje 15 navršenih godina. Bodovi su ispravljeni sa 73 na 75; mjesto na listi i raspodjela ostaju isti.',
		},
		{
			nastavnik: 'N-011', naSto: 'raspodjela', podneseno: `${g}-08-16T14:05`, stanje: 'odbijen', odluceno: `${g}-08-19T10:30`,
			tekst: 'Proglašen sam viškom s punom satnicom, a zbrinuto mi je samo 8 sati. Tražim da mi se osigura puna satnica.',
			odluka: 'Raspodjela je provedena po pravilima: u 50 km cestom nije bilo više slobodnih sati predmeta, a sate u Omišu dobio je kolega s više bodova. Slučaj ostaje otvoren kao nezbrinuti višak.',
		},
		{
			nastavnik: 'N-005', naSto: 'raspodjela', podneseno: `${g}-08-17T08:20`, stanje: 'odbijen', odluceno: `${g}-08-19T10:45`,
			tekst: 'Radim u OŠ Lavanda i smatram da sati matematike koji su se oslobodili u mojoj školi pripadaju meni.',
			odluka: 'Sati se dodjeljuju po bodovima na županijskoj listi. Prednost nadopune unutar škole nije dio pravila; to je otvoreno pitanje 17.',
		},
		{
			nastavnik: 'N-015', naSto: 'raspodjela', podneseno: `${g}-08-16T18:30`, stanje: 'zaprimljen',
			tekst: 'Imam isti broj bodova i isti staž kao kolegica koja je dobila svih 10 sati. Tražim da se sati podijele ili da se odluči ždrijebom.',
			odluka: 'Čeka pravilo za izjednačene po bodovima i svim pravilima prednosti (otvoreno pitanje 14). Dotad poredak određuje samo oznaka, a slučaj je označen za ručnu provjeru.',
		},
		{
			nastavnik: 'N-016', naSto: 'raspodjela', podneseno: `${g}-08-19T16:10`, stanje: 'izvan_roka', odluceno: `${g}-08-20T09:00`,
			tekst: 'Sati glazbene kulture u mojoj školi odbijeni su kao fakultativna nastava, a meni do norme fali 6 sati.',
			odluka: 'Prigovor je podnesen nakon isteka roka od 48 sati, pa se ne razmatra u ovom ciklusu.',
		},
	];
}
