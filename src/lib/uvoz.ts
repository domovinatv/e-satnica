// Dokumenti koje je scripts/uvoz-natjecaja.ts našao na stranicama škola. Čovjek ih
// pregleda: natječaj prepiše u oglase, a ostalo odbaci.
import { env } from 'cloudflare:workers';

export interface UvezeniDokument {
	id: number;
	url: string;
	naslov: string;
	objavljeno: string;
	pronadeno: string;
	stanje: 'novo' | 'obraden' | 'odbacen';
	skola: { sifra: string; naziv: string; mjesto: string; fiktivna: boolean };
}

export async function uvezeniDokumenti(): Promise<UvezeniDokument[]> {
	const { results } = await env.DB.prepare(
		`SELECT u.id, u.url, u.naslov, u.objavljeno, u.pronadeno, u.stanje, s.sifra, s.naziv, s.mjesto, s.fiktivna
		 FROM uvoz_dokumenti u JOIN skole s ON s.id = u.skola_id
		 ORDER BY u.stanje = 'novo' DESC, u.objavljeno DESC, u.id DESC`,
	).all<Omit<UvezeniDokument, 'skola'> & { sifra: string; naziv: string; mjesto: string; fiktivna: number }>();
	return results.map(({ sifra, naziv, mjesto, fiktivna, ...d }) => ({ ...d, skola: { sifra, naziv, mjesto, fiktivna: fiktivna === 1 } }));
}
