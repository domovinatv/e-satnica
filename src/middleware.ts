import { defineMiddleware } from 'astro:middleware';
import { KOLACIC, procitajSesiju } from './lib/sesija';

const JAVNO = ['/prijava', '/favicon.svg', '/favicon.ico'];

export const onRequest = defineMiddleware(async (context, next) => {
	const { pathname } = context.url;
	if (context.isPrerendered || JAVNO.includes(pathname)) return next();

	const ime = await procitajSesiju(context.cookies.get(KOLACIC)?.value);
	if (!ime) {
		return context.redirect(`/prijava?natrag=${encodeURIComponent(pathname)}`);
	}
	context.locals.ime = ime;
	return next();
});
