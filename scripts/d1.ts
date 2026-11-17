// Čitanje lokalne D1 baze iz skripti, preko wranglera (bez ljuske, radi i na Windowsu).
import { execFileSync } from 'node:child_process';

export function upitLokalno<T>(sql: string): T[] {
	const izlaz = execFileSync(process.execPath, ['node_modules/wrangler/bin/wrangler.js', 'd1', 'execute', 'e-satnica', '--local', '--json', '--command', sql], {
		encoding: 'utf8',
		stdio: ['ignore', 'pipe', 'pipe'],
	});
	const odgovor = JSON.parse(izlaz) as { results: T[] }[];
	return odgovor[0]?.results ?? [];
}

export const q = (v: string | number | null | undefined): string => {
	if (v === null || v === undefined) return 'NULL';
	if (typeof v === 'number') return String(v);
	return `'${v.replace(/'/g, "''")}'`;
};

/** Generičko ime klijenta za vanjske servise: bez podataka o osobi ili projektu korisnika. */
export const KLIJENT = 'e-satnica-skripta/1.0';

export const cekaj = (ms: number) => new Promise((r) => setTimeout(r, ms));
