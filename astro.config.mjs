import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';
import sitemap from '@astrojs/sitemap';
import iife from './build/iife-plugin.mjs';

export default defineConfig({
  site: 'https://timezonehop.com',
  output: 'static',
  trailingSlash: 'never',
  build: { format: 'file', inlineStylesheets: 'always' },
  integrations: [preact(), sitemap({ filter: page => !page.endsWith('/404') })],
  vite: { plugins: [iife()] },
});
