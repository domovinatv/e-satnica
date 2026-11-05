declare namespace App {
	interface Locals {
		ime?: string;
		korisnikId?: number | null;
		sesija?: import('./lib/sesija').Sesija;
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
	}
}
