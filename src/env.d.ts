declare namespace App {
	interface Locals {
		ime?: string;
		korisnikId?: number | null;
		sesija?: import('./lib/sesija').Sesija;
		/** Uloga za unos: potvrđena uloga prijavljenog računa, ili probna uz PROBNA_PRIJAVA=1. */
		uloga?: import('./lib/uloga').Uloga;
		/** Odakle je uloga: potvrđena uz pravu prijavu ili probna. */
		ulogaIzvor?: 'potvrdena' | 'probna';
	}
}

declare namespace Cloudflare {
	interface Env {
		SESIJA_KLJUC: string;
		CERTILIA_CLIENT_ID: string;
		CERTILIA_CLIENT_SECRET: string;
		AAI_CLIENT_ID: string;
		AAI_CLIENT_SECRET: string;
		/** '1' = gumb @skole.hr vidljiv svima; inače samo na /prijava?skole=1. */
		AAI_JAVNO?: string;
		AAI_OIB?: string;
		/** '/auth/aaieduhr/test/callback' za testni resurs; zadano '/auth/aaieduhr/callback'. */
		AAI_REDIRECT_PATH?: string;
		/** '1' = probna prijava u ulogu iz prototipa i unos u fiktivnu bazu. Na produkciji nije postavljeno. */
		PROBNA_PRIJAVA?: string;
		/** '1' = javne stranice umjesto imena prikazuju samo oznake osoba (N-001, K-02). Zadano isključeno. */
		ANONIMNO?: string;
		/** ID-jevi računa članova povjerenstva, odvojeni zarezom (npr. '1,7'). */
		POVJERENSTVO?: string;
	}
}
