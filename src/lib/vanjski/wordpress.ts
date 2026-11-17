// Čitanje WordPress REST odgovora (/wp-json/wp/v2/media) za skriptu
// scripts/uvoz-natjecaja.ts. Čiste funkcije bez I/O, da se mogu testirati bez mreže.

export interface NadeniDokument {
	url: string;
	naslov: string;
	/** Datum objave, GGGG-MM-DD. */
	objavljeno: string;
}

/** Naslov koji izgleda kao natječaj za radno mjesto, a ne odluka ili obavijest o izboru. */
export function jeNatjecaj(naslov: string): boolean {
	const t = naslov.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
	if (!/natjecaj/.test(t)) return false;
	// Uz natječaj škole objavljuju i pozive na testiranje, upute i odluke o izboru.
	return !/(odluk|obavijest o (izboru|rezultat)|rezultat|izbor kandidata|ponistenj|testiranj|poziv|procjen|sadrzaj i nacin|uput)/.test(t);
}

export function urlMedija(web: string, od: string): string {
	const baza = web.replace(/\/$/, '');
	return `${baza}/wp-json/wp/v2/media?search=natje&per_page=50&orderby=date&order=desc&after=${od}T00:00:00&_fields=date,source_url,title,mime_type`;
}

const DOKUMENTI = /^(application\/pdf|application\/msword|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document)$/;

/** Dokumenti iz odgovora media servisa koji su natječaji. Neispravan odgovor daje prazan popis. */
export function izMedija(odgovor: unknown): NadeniDokument[] {
	if (!Array.isArray(odgovor)) return [];
	const nadeno: NadeniDokument[] = [];
	for (const m of odgovor as { date?: unknown; source_url?: unknown; title?: { rendered?: unknown }; mime_type?: unknown }[]) {
		const url = typeof m.source_url === 'string' ? m.source_url : '';
		const naslov = typeof m.title?.rendered === 'string' ? bezOznaka(m.title.rendered) : '';
		const datum = typeof m.date === 'string' ? m.date.slice(0, 10) : '';
		if (!/^https:\/\//.test(url) || !/^\d{4}-\d{2}-\d{2}$/.test(datum) || !naslov) continue;
		if (typeof m.mime_type === 'string' && !DOKUMENTI.test(m.mime_type)) continue;
		if (jeNatjecaj(naslov)) nadeno.push({ url, naslov: naslov.slice(0, 300), objavljeno: datum });
	}
	return nadeno;
}

/** Naslov iz WordPressa dolazi kao HTML; ostaje samo tekst. */
function bezOznaka(html: string): string {
	return html
		.replace(/<[^>]*>/g, '')
		.replace(/&#8211;|&ndash;/g, '–')
		.replace(/&#8217;|&rsquo;/g, '’')
		.replace(/&amp;/g, '&')
		.replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
		// Naslov je često ime datoteke: + i _ umjesto razmaka, (1) za drugu verziju.
		.replace(/[+_]/g, ' ')
		.replace(/\s*\(\d+\)\s*$/, '')
		.replace(/\s+/g, ' ')
		.trim();
}
