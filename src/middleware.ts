import { defineMiddleware } from 'astro:middleware';
import { KOLACIC, procitajSesiju } from './lib/sesija';
import { KOLACIC_ULOGE, parsirajUlogu, procitajUlogu } from './lib/uloga';
import { potvrdeneUloge } from './lib/uloge';

// Do puštanja u rad sustav je javan: sve se čita bez prijave (specifikacija, sekcija
// „Prijava i podaci"). Prijava i dalje treba za upis i za stranice vlastitog računa.
// Kad sustav krene s pravim podacima, ovo se vraća na „sve iza prijave, osim popisa".

/** Stranice vlastitog računa: bez sesije nemaju što prikazati. */
const SAMO_PRIJAVLJENI = ['/racun', '/kljucevi', '/dopuna', '/uloga'];

/**
 * Upisi koji smiju bez sesije: prijava i odjava, kalkulator (ništa ne sprema) te
 * probna prijava i unos u fiktivnu bazu. Ta dva sama provjeravaju probnu ulogu i ne
 * rade ništa ako PROBNA_PRIJAVA nije uključena (src/lib/uloga.ts).
 */
const UPIS_BEZ_PRIJAVE = ['/odjava', '/kalkulator', '/probna-prijava'];

function trebaPrijavu(metoda: string, pathname: string): boolean {
	if (SAMO_PRIJAVLJENI.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return true;
	if (metoda === 'GET' || metoda === 'HEAD') return false;
	return !(UPIS_BEZ_PRIJAVE.includes(pathname) || pathname.startsWith('/auth/') || pathname.startsWith('/unos/'));
}

export const onRequest = defineMiddleware(async (context, next) => {
	if (context.isPrerendered) return next();
	const { pathname } = context.url;

	const kolacicUloge = context.cookies.get(KOLACIC_ULOGE)?.value;
	const probna = procitajUlogu(kolacicUloge);
	if (probna) {
		context.locals.uloga = probna;
		context.locals.ulogaIzvor = 'probna';
	}

	// Sesija se čita i na javnim stranicama: zaglavlje pokazuje tko je prijavljen, a
	// specifikacija prijavljenima nudi upis.
	const sesija = await procitajSesiju(context.cookies.get(KOLACIC)?.value);
	if (sesija) {
		context.locals.ime = sesija.ime;
		context.locals.korisnikId = sesija.korisnikId;
		context.locals.sesija = sesija;
		// Potvrđena uloga računa; kolačić bira jednu ako ih ima više.
		if (!probna && sesija.korisnikId) {
			const moje = await potvrdeneUloge(sesija.korisnikId);
			const odabrana = parsirajUlogu(kolacicUloge);
			const uloga = moje.find((u) => odabrana && u.vrsta === odabrana.vrsta && u.id === odabrana.id) ?? moje[0];
			if (uloga) {
				context.locals.uloga = uloga;
				context.locals.ulogaIzvor = 'potvrdena';
			}
		}
	} else if (trebaPrijavu(context.request.method, pathname)) {
		return context.redirect(`/prijava?natrag=${encodeURIComponent(pathname)}`);
	}
	return next();
});
