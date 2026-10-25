import { it, expect } from 'vitest';
import { readdirSync } from 'node:fs';
import { page } from './helpers';

const count = (dir: string) => readdirSync(dir).filter(f => f.endsWith('.html')).length;

it('builds every timezone and pair page', () => {
  expect(count('dist/convert')).toBe(4410);
  expect(count('dist/timezone')).toBeGreaterThanOrEqual(80);
});

it('pair page content', () => {
  const d = page('/convert/new-york-to-london');
  expect(d.querySelectorAll('h1')).toHaveLength(1);
  expect(d.querySelectorAll('[data-conversion-row]')).toHaveLength(24);
  expect(d.querySelector('a[href="/convert/london-to-new-york"]')).toBeTruthy();
  const e = page('/convert/est-to-ist');
  expect(e.querySelector('a[href="/convert/new-york-to-new-delhi"]')).toBeTruthy();
  // Zones without DST must still link their city equivalent (independent of the build date).
  expect(page('/convert/gst-to-jst').querySelector('a[href="/convert/dubai-to-tokyo"]')).toBeTruthy();
});

it('timezone pages and hubs', () => {
  const est = page('/timezone/est');
  expect(est.querySelector('h1')?.text).toBe('EST — Eastern Standard Time (UTC−5)');
  expect(est.querySelector('a[href="/convert/est-to-pst"]')).toBeTruthy();
  expect(page('/timezone/utc-plus-5-30').querySelector('a[href="/time/mumbai"]')).toBeTruthy();
  expect(new Set(page('/convert').querySelectorAll('a[href^="/time/"]').map(a => a.getAttribute('href'))).size)
    .toBeGreaterThanOrEqual(60);
});
