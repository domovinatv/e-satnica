// Čitanje atributa AAI@EduHr iz id_tokena i userinfa. Oblik nije objavljen
// (discovery nema claims_supported), pa je parser namjerno tolerantan: vrijednost
// može biti string ili niz (LDAP atributi su višestruki), a isti atribut može doći
// u id_tokenu, na userinfo ili na oba mjesta. Prva prava prijava zapisuje samo
// IMENA ključeva (Pravilnik AAI@EduHr, čl. 34), da se vidi stvarni oblik.

/**
 * Scopeovi koje tražimo. Svaki mora imati javnu namjenu u Registru resursa
 * (docs/aaieduhr.md, „Namjene atributa”). Škola i uloga čekaju CARNET-ov odgovor.
 */
export const AAI_SCOPEOVI = ['openid', 'hrEduPersonPersistentID', 'hrEduPersonPrimaryAffiliation', 'givenName', 'sn'] as const;

export interface AaiOsoba {
	/** Trajni identifikator za povezivanje računa; sprema se samo kao HMAC. */
	identitet: string | null;
	identitetIzvor: 'hrEduPersonPersistentID' | 'sub' | 'none';
	ime: string | null;
	prezime: string | null;
	/** npr. „djelatnik”, „učenik”; čita se pri prijavi, ne sprema se. */
	povezanost: string | null;
	/** Imena ključeva po izvoru, bez vrijednosti: `id:a,b;ui:c,d`. */
	kljucevi: string;
}

/** Prvi neprazni string iz stringa ili niza stringova. */
export function prviString(v: unknown): string | null {
	if (typeof v === 'string') return v.trim() || null;
	if (Array.isArray(v)) {
		for (const x of v) {
			const s = prviString(x);
			if (s) return s;
		}
	}
	return null;
}

/**
 * Id_token ima prednost (potpisan je), userinfo popunjava ono što fali. Userinfo
 * čiji se `sub` ne slaže s id_tokenom odbacuje se cijeli (OIDC Core 5.3.2).
 */
export function aaiOsoba(idToken: Record<string, unknown>, userinfo: Record<string, unknown> | null): AaiOsoba {
	const ui = userinfo && (userinfo.sub === undefined || userinfo.sub === idToken.sub) ? userinfo : null;
	const uzmi = (...imena: string[]) => {
		for (const izvor of [idToken, ui]) {
			if (!izvor) continue;
			for (const ime of imena) {
				const v = prviString(izvor[ime]);
				if (v) return v;
			}
		}
		return null;
	};

	const persistent = uzmi('hrEduPersonPersistentID');
	const sub = prviString(idToken.sub);
	const kljucevi = [`id:${Object.keys(idToken).sort().join(',')}`];
	if (userinfo) kljucevi.push(`${ui ? 'ui' : 'ui-odbacen'}:${Object.keys(userinfo).sort().join(',')}`);

	return {
		identitet: persistent ?? sub,
		identitetIzvor: persistent ? 'hrEduPersonPersistentID' : sub ? 'sub' : 'none',
		ime: uzmi('givenName', 'given_name'),
		prezime: uzmi('sn', 'family_name'),
		povezanost: uzmi('hrEduPersonPrimaryAffiliation'),
		kljucevi: kljucevi.join(';'),
	};
}
