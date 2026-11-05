-- OIB otisak više ne dolazi samo iz Certilije: AAI@EduHr šalje hrEduPersonOIB, pa
-- oib_hash ne znači „ima Certiliju”. Zastavica to bilježi zasebno; ime iz e-Osobne
-- ima prednost pred imenom iz @skole.hr samo kad je certilia = 1.
ALTER TABLE korisnici ADD COLUMN certilia INTEGER NOT NULL DEFAULT 0;
UPDATE korisnici SET certilia = 1 WHERE oib_hash IS NOT NULL;
