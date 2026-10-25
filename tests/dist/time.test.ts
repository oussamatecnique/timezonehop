import { it, expect } from 'vitest';
import { readdirSync } from 'node:fs';
import { page } from './helpers';

it('builds every city and country page', () => {
  const n = readdirSync('dist/time').filter(f => f.endsWith('.html')).length;
  expect(n).toBeGreaterThanOrEqual(1150);
  expect(n).toBeLessThanOrEqual(1350);
});

it('Tokyo page has the content contract', () => {
  const d = page('/time/tokyo');
  expect(d.querySelector('h1')?.text).toBe('Current time in Tokyo, Japan');
  expect(d.querySelector('link[rel=canonical]')?.getAttribute('href')).toBe('https://timezonehop.com/time/tokyo');
  expect(d.querySelector('[data-zone="Asia/Tokyo"] [data-clock]')).toBeTruthy();
  expect(d.querySelector('[data-diff-you]')).toBeTruthy();
  expect(d.text).toContain('does not observe daylight saving time');
  expect(new Set(d.querySelectorAll('a[href^="/convert/tokyo-to-"]').map(a => a.getAttribute('href'))).size).toBe(59);
  expect(d.querySelector('script[type="application/ld+json"]')?.text + '').toBeTruthy();
  expect(d.querySelectorAll('script[type="application/ld+json"]').map(s => s.text).join('')).toContain('BreadcrumbList');
});

it('USA lists its zones; hub links everything', () => {
  expect(page('/time/usa').querySelectorAll('[data-sky]').length).toBeGreaterThanOrEqual(4);
  expect(page('/time').querySelectorAll('a[href^="/time/"]').length).toBeGreaterThanOrEqual(1150);
});
