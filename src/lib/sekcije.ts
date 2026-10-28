import { getCollection } from 'astro:content';
import { env } from 'cloudflare:workers';

export interface SekcijaUPopisu {
	id: string;
	naslov: string;
	sazetak: string;
	ukupno: number;
	novih: number;
}

export async function ucitajSekcije(): Promise<SekcijaUPopisu[]> {
	const sekcije = (await getCollection('specifikacija')).sort((a, b) => a.data.redoslijed - b.data.redoslijed);
	const { results } = await env.DB.prepare(
		"SELECT sekcija, COUNT(*) AS ukupno, SUM(stanje = 'novo') AS novih FROM stavke GROUP BY sekcija",
	).all<{ sekcija: string; ukupno: number; novih: number }>();
	const brojevi = new Map(results.map((r) => [r.sekcija, r]));
	return sekcije.map((s) => ({
		id: s.id,
		naslov: s.data.naslov,
		sazetak: s.data.sazetak,
		ukupno: brojevi.get(s.id)?.ukupno ?? 0,
		novih: brojevi.get(s.id)?.novih ?? 0,
	}));
}
