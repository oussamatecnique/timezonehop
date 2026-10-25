import type { APIRoute } from 'astro';

/** Authorizes Google as the site's ad seller. Empty until the AdSense account is set. */
export const GET: APIRoute = () => {
  const client = import.meta.env.PUBLIC_ADSENSE_CLIENT ?? '';
  const publisher = client.replace(/^ca-/, '');
  const body = publisher ? `google.com, ${publisher}, DIRECT, f08c47fec0942fa0\n` : '';
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
