import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const specifikacija = defineCollection({
	loader: glob({ pattern: '*.md', base: './src/content/specifikacija' }),
	schema: z.object({
		naslov: z.string(),
		redoslijed: z.number(),
		sazetak: z.string(),
	}),
});

export const collections = { specifikacija };
