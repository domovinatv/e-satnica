// Automatsko prikupljanje natječaja sa stranica škola.
//
//   node scripts/uvoz-natjecaja.ts            napravi .wrangler/uvoz.sql (zadnjih 60 dana)
//   node scripts/uvoz-natjecaja.ts --dana=14  kraće razdoblje
//   npm run db:uvoz                           napravi i upiši u lokalnu bazu
//
// Školske stranice na skole.hr većinom su WordPress, pa skripta pita njihov REST servis
// za priložene dokumente (/wp-json/wp/v2/media) i uzima one čiji naslov kaže natječaj.
// Dokumente ne preuzima: upisuje samo poveznicu, naslov i datum u uvoz_dokumenti, a
// povjerenstvo ih pregleda na /uvoz i natječaje prepiše u oglase. Isti dokument se ne
// upisuje dvaput (url je jedinstven).

import { mkdirSync, writeFileSync } from 'node:fs';
import { danas, pomakni } from '../src/lib/datumi.ts';
import { izMedija, urlMedija } from '../src/lib/vanjski/wordpress.ts';
import { cekaj, KLIJENT, q, upitLokalno } from './d1.ts';

const dana = Number(process.argv.find((a) => a.startsWith('--dana='))?.slice('--dana='.length) ?? 60);
if (!Number.isInteger(dana) || dana < 1 || dana > 365) throw new Error('--dana mora biti cijeli broj od 1 do 365');
const od = pomakni(danas(), -dana);

const skole = upitLokalno<{ sifra: string; naziv: string; web: string }>("SELECT sifra, naziv, web FROM skole WHERE fiktivna = 0 AND web LIKE 'https://%' ORDER BY sifra");
console.log(`${skole.length} škola sa stranicom, dokumenti od ${od}`);

const sql = ['-- Dokumenti nađeni na stranicama škola (scripts/uvoz-natjecaja.ts); ne uređuj rukom.'];
const neuspjeli: string[] = [];
let nadeno = 0;
for (const s of skole) {
	try {
		const odgovor = await fetch(urlMedija(s.web, od), { headers: { 'User-Agent': KLIJENT, Accept: 'application/json' }, signal: AbortSignal.timeout(15_000) });
		if (!odgovor.ok) throw new Error(`HTTP ${odgovor.status}`);
		const dokumenti = izMedija(await odgovor.json());
		for (const d of dokumenti) {
			sql.push(
				`INSERT OR IGNORE INTO uvoz_dokumenti (skola_id, url, naslov, objavljeno, pronadeno) VALUES ((SELECT id FROM skole WHERE sifra = ${q(s.sifra)}), ${q(d.url)}, ${q(d.naslov)}, ${q(d.objavljeno)}, ${q(danas())});`,
			);
		}
		nadeno += dokumenti.length;
		console.log(`  ${s.naziv}: ${dokumenti.length}`);
	} catch (e) {
		neuspjeli.push(`${s.naziv} (${e instanceof Error ? e.message : String(e)})`);
	}
	await cekaj(500);
}

mkdirSync('.wrangler', { recursive: true });
writeFileSync('.wrangler/uvoz.sql', `${sql.join('\n')}\n`);
console.log(`${nadeno} dokumenata. SQL: .wrangler/uvoz.sql`);
if (neuspjeli.length > 0) console.log(`Bez odgovora (${neuspjeli.length}): ${neuspjeli.join('; ')}`);
