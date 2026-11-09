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
  expect(locs).toBeGreaterThanOrEqual(1800);
  expect(sm).not.toContain('/404');
  expect(sm).toContain('<loc>https://timezonehop.com/convert/est-to-pst</loc>');
  expect(existsSync('dist/og/place.png')).toBe(true);
});

it('low-demand converter pairs stay live but are noindex and left out of the sitemap', () => {
  const sm = readFileSync('dist/sitemap-0.xml', 'utf8');
  const robots = (p: string) => page(p).querySelector('meta[name=robots]')?.getAttribute('content') ?? '';
  expect(robots('/convert/kyiv-to-denver')).toBe('noindex, follow');
  expect(sm).not.toContain('/convert/kyiv-to-denver<');
  expect(robots('/convert/london-to-new-york')).toBe('');
  expect(sm).toContain('<loc>https://timezonehop.com/convert/london-to-new-york</loc>');
  // nothing in the sitemap may be noindex
  const listed = [...sm.matchAll(/<loc>https:\/\/timezonehop\.com(\/convert\/[a-z0-9-]+)<\/loc>/g)].map(m => m[1]);
  expect(listed.length).toBeGreaterThanOrEqual(500);
  for (const p of listed) expect(robots(p), p).toBe('');
  // the converter hub only promotes indexable pairs
  const hubLinks = page('/convert').querySelectorAll('a[href^="/convert/"]').map(a => a.getAttribute('href')!);
  expect(hubLinks.length).toBeGreaterThanOrEqual(100);
  for (const p of hubLinks) expect(robots(p), p).toBe('');
});
