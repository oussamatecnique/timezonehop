import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';

export default defineConfig({
  site: 'https://timezonehop.com',
  output: 'static',
  trailingSlash: 'never',
  build: { format: 'file', inlineStylesheets: 'auto' },
  integrations: [preact()],
});
