import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';
import sitemap from '@astrojs/sitemap';
import iife from './build/iife-plugin.mjs';
import { noindexPairPaths } from './src/data/indexing.ts';
import { BUILD_NOW } from './src/lib/build-time.ts';

// noindex pages stay live but are left out of the sitemap
const hidden = noindexPairPaths(BUILD_NOW);
const inSitemap = page => {
  const path = new URL(page).pathname;
  return path !== '/404' && !hidden.has(path);
};

export default defineConfig({
  site: 'https://timezonehop.com',
  output: 'static',
  trailingSlash: 'never',
  build: { format: 'file', inlineStylesheets: 'always' },
  integrations: [preact(), sitemap({ filter: inSitemap })],
  vite: { plugins: [iife()] },
});
