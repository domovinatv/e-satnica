// Tjedna norma neposredne nastave po predmetu i preračun u radno vrijeme od 40 sati.
// Čiste funkcije bez I/O.
//
// Brojevi su primjer za prototip, prema specifikaciji („npr. hrvatski 20, povijest 22
// sata nastave"). Pravi popis normi za sve predmete je otvoreno pitanje 10.

export const NORME: Record<string, number> = {
	'Hrvatski jezik': 20,
	Matematika: 20,
	'Engleski jezik': 20,
	'Njemački jezik': 20,
	'Talijanski jezik': 20,
};

export const ZADANA_NORMA = 22;
export const RADNI_TJEDAN = 40;

export function norma(predmet: string): number {
	return NORME[predmet] ?? ZADANA_NORMA;
}

/** Sati nastave preračunati u tjedno radno vrijeme od 40 sati, kako ih vode županijske liste. */
export function uRadnoVrijeme(satiNastave: number, predmet: string): number {
	if (!Number.isFinite(satiNastave) || satiNastave < 0) throw new RangeError(`sati nastave: očekujem broj ≥ 0, dobio ${satiNastave}`);
	return Math.min(RADNI_TJEDAN, Math.round((satiNastave / norma(predmet)) * RADNI_TJEDAN));
}
