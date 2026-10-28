import { defineMiddleware } from 'astro:middleware';
import { KOLACIC, procitajSesiju } from './lib/sesija';

const JAVNO = ['/prijava', '/odjava', '/upute', '/favicon.svg', '/favicon.ico'];

export const onRequest = defineMiddleware(async (context, next) => {
	const { pathname } = context.url;
	if (context.isPrerendered || JAVNO.includes(pathname) || pathname.startsWith('/auth/') || pathname.startsWith('/upute/')) return next();

	const sesija = await procitajSesiju(context.cookies.get(KOLACIC)?.value);
	if (!sesija) {
		return context.redirect(`/prijava?natrag=${encodeURIComponent(pathname)}`);
	}
	context.locals.ime = sesija.ime;
	context.locals.korisnikId = sesija.korisnikId;
	return next();
});
