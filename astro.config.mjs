// @ts-check
import { defineConfig } from 'astro/config';

import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  adapter: cloudflare(),
  // Astro 7 po zadanom briše razmak oko elemenata na prijelomu retka (JSX pravila), pa
  // „piši na <a>…" postane „piši na<a>…". Ovako se razmaci sažimaju bez gubitka.
  compressHTML: true,
  markdown: {
    // ```mermaid blokove ne bojamo, nego ih preglednik crta (Osnova.astro).
    syntaxHighlight: { type: 'shiki', excludeLangs: ['mermaid'] },
  },
});