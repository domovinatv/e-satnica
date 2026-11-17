-- Automatsko prikupljanje natječaja: scripts/uvoz-natjecaja.ts traži nove dokumente
-- na stranicama škola (WordPress /wp-json/wp/v2/media) i upisuje ih ovdje. Čovjek ih
-- pregleda i iz natječaja upiše oglase; ništa se ne objavljuje samo od sebe.
CREATE TABLE uvoz_dokumenti (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  skola_id INTEGER NOT NULL REFERENCES skole(id),
  url TEXT NOT NULL UNIQUE,
  naslov TEXT NOT NULL,
  objavljeno TEXT NOT NULL,
  pronadeno TEXT NOT NULL,
  stanje TEXT NOT NULL DEFAULT 'novo' CHECK (stanje IN ('novo', 'obraden', 'odbacen'))
);
CREATE INDEX uvoz_dokumenti_stanje ON uvoz_dokumenti (stanje, objavljeno DESC);
