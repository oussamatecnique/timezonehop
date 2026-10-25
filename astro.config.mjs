import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';
import iife from './build/iife-plugin.mjs';

export default defineConfig({
  site: 'https://timezonehop.com',
  output: 'static',
  trailingSlash: 'never',
  build: { format: 'file', inlineStylesheets: 'always' },
  integrations: [preact()],
  vite: { plugins: [iife()] },
});
