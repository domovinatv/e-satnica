// @ts-check
import { defineConfig } from 'astro/config';

import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  adapter: cloudflare(),
  markdown: {
    // ```mermaid blokove ne bojamo, nego ih preglednik crta (Osnova.astro).
    syntaxHighlight: { type: 'shiki', excludeLangs: ['mermaid'] },
  },
});