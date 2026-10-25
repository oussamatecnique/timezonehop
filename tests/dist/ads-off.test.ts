import { it, expect } from 'vitest';
import { page } from './helpers';

it('ships no ad markup or scripts while ads are disabled', () => {
  const html = page('/time/tokyo').toString();
  expect(html).not.toContain('adsbygoogle');
  expect(html).not.toContain('google-adsense-account');
});
