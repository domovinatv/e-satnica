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
	}
}
