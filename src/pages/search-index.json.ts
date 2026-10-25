import type { APIRoute } from 'astro';
import { buildSearchIndex } from '../lib/search/build-index';

export const GET: APIRoute = () =>
  new Response(JSON.stringify(buildSearchIndex()), { headers: { 'Content-Type': 'application/json' } });
