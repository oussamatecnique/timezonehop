import { it, expect } from 'vitest';
import { page } from './helpers';

// Production builds (CI) set PUBLIC_CF_ANALYTICS_TOKEN; local builds must not count visits.
const token = process.env.PUBLIC_CF_ANALYTICS_TOKEN;

it(token ? 'pages load the Cloudflare Web Analytics beacon' : 'local builds ship no analytics beacon', () => {
  for (const path of ['/', '/time/tokyo', '/convert/est-to-pst']) {
    const beacon = page(path).querySelector('script[src="https://static.cloudflareinsights.com/beacon.min.js"]');
    if (token) {
      expect(beacon, path).toBeTruthy();
      expect(JSON.parse(beacon!.getAttribute('data-cf-beacon')!)).toEqual({ token });
    } else {
      expect(beacon, path).toBeNull();
    }
  }
});
