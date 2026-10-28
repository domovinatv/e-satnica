declare namespace App {
	interface Locals {
		ime?: string;
		korisnikId?: number | null;
	}
}

declare namespace Cloudflare {
	interface Env {
		SESIJA_KLJUC: string;
		TIM_KOD?: string;
		CERTILIA_CLIENT_ID: string;
		CERTILIA_CLIENT_SECRET: string;
	}
}
