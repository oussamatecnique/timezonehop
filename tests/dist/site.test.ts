import { it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { page } from './helpers';

it('home, DST and trust pages exist with one H1 each', () => {
  for (const p of ['/', '/daylight-saving-time', '/about', '/privacy', '/terms', '/contact', '/time', '/timezone', '/convert'])
    expect(page(p).querySelectorAll('h1'), p).toHaveLength(1);
  expect(page('/').querySelectorAll('a[href^="/time/"]').length).toBeGreaterThanOrEqual(12);
  // date-agnostic: this suite also runs in the daily CI build
  const dst = page('/daylight-saving-time');
  expect(dst.querySelectorAll('tbody tr').length).toBeGreaterThanOrEqual(40);
  expect(dst.querySelector('a[href="/time/usa"]')).toBeTruthy();
  expect(page('/about').text).toContain('GeoNames');
});

it('404 is noindex; robots and sitemap are complete', () => {
  expect(page('/404').querySelector('meta[name=robots]')?.getAttribute('content')).toContain('noindex');
  expect(readFileSync('dist/robots.txt', 'utf8')).toContain('Sitemap: https://timezonehop.com/sitemap-index.xml');
  const sm = readFileSync('dist/sitemap-0.xml', 'utf8');
  const locs = sm.match(/<loc>/g)!.length;
  expect(locs).toBeGreaterThanOrEqual(5600);
  expect(sm).not.toContain('/404');
  expect(sm).toContain('<loc>https://timezonehop.com/convert/est-to-pst</loc>');
  expect(existsSync('dist/og/place.png')).toBe(true);
});
