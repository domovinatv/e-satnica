import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const specifikacija = defineCollection({
	loader: glob({ pattern: '*.md', base: './src/content/specifikacija' }),
	schema: z.object({
		naslov: z.string(),
		redoslijed: z.number(),
		sazetak: z.string(),
		// Prikaži bodovnu tablicu iz src/lib/bodovanje ispod teksta sekcije.
		tablicaKriterija: z.boolean().optional(),
	}),
});

export const collections = { specifikacija };
