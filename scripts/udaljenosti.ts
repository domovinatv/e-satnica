// Cestovne udaljenosti među mjestima, iz koordinata škola, preko OSRM-a.
//
//   node scripts/udaljenosti.ts                     napravi .wrangler/udaljenosti.sql
//   npm run db:udaljenosti                          napravi i upiši u lokalnu bazu
//   node scripts/udaljenosti.ts --osrm=http://localhost:5000   vlastiti OSRM poslužitelj
//
// Mjesto je prosjek koordinata njegovih škola. Ruta s trajektom ne broji se kao
// cestovna veza: otok bez mosta nije u dosegu od 50 km, pa takav par ne ulazi u tablicu.
// Javni OSRM poslužitelj dopušta otprilike jedan upit u sekundi, pa skripta čeka.
//
// Fiktivna baza (npm run db:fiktivno) i dalje piše svoje približne udaljenosti; ova
// skripta ih zamjenjuje izračunatima dok se fiktivna baza ponovno ne napravi.

import { mkdirSync, writeFileSync } from 'node:fs';
import { kmIzRute, parovi, urlRute, type Tocka } from '../src/lib/vanjski/osrm.ts';
import { cekaj, KLIJENT, q, upitLokalno } from './d1.ts';

const posluzitelj = process.argv.find((a) => a.startsWith('--osrm='))?.slice('--osrm='.length) ?? 'https://router.project-osrm.org';
const javni = posluzitelj.includes('router.project-osrm.org');

const skole = upitLokalno<{ mjesto: string; lat: number; lon: number }>('SELECT mjesto, avg(lat) AS lat, avg(lon) AS lon FROM skole WHERE lat IS NOT NULL AND lon IS NOT NULL GROUP BY mjesto');
if (skole.length < 2) throw new Error('U bazi nema dovoljno škola s koordinatama (skole.lat, skole.lon).');
const tocke = new Map<string, Tocka>(skole.map((s) => [s.mjesto, { lat: s.lat, lon: s.lon }]));

const sql = ['-- Cestovne udaljenosti iz koordinata škola (scripts/udaljenosti.ts); ne uređuj rukom.', 'DELETE FROM udaljenosti;'];
const bezCeste: string[] = [];
const svi = parovi([...tocke.keys()]);
console.log(`${tocke.size} mjesta, ${svi.length} parova, poslužitelj ${posluzitelj}`);

for (const [a, b] of svi) {
	const odgovor = await fetch(urlRute(posluzitelj, tocke.get(a)!, tocke.get(b)!), { headers: { 'User-Agent': KLIJENT } });
	if (!odgovor.ok && odgovor.status !== 400) throw new Error(`${a} – ${b}: OSRM je vratio ${odgovor.status}`);
	const km = kmIzRute(await odgovor.json());
	if (km === null) bezCeste.push(`${a} – ${b}`);
	else sql.push(`INSERT INTO udaljenosti (mjesto_a, mjesto_b, km) VALUES (${q(a)}, ${q(b)}, ${km});`);
	console.log(`  ${a} – ${b}: ${km === null ? 'nema ceste' : `${km} km`}`);
	if (javni) await cekaj(1100);
}

mkdirSync('.wrangler', { recursive: true });
writeFileSync('.wrangler/udaljenosti.sql', `${sql.join('\n')}\n`);
console.log(`${sql.length - 2} parova cestom, ${bezCeste.length} bez ceste. SQL: .wrangler/udaljenosti.sql`);
