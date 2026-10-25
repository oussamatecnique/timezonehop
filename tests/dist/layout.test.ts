import { it, expect } from 'vitest';
import { page } from './helpers';

it('home page has the layout contract', () => {
  const doc = page('/');
  expect(doc.querySelectorAll('h1')).toHaveLength(1);
  expect(doc.querySelector('link[rel=canonical]')?.getAttribute('href')).toBe('https://timezonehop.com');
  expect(doc.querySelector('title')?.text).toBe('TimezoneHop: World Clock & Time Zone Converter');
  expect(doc.querySelector('link[rel=preload][as=font]')).toBeTruthy();
  expect(doc.querySelectorAll('script[type="application/ld+json"]').length).toBeGreaterThanOrEqual(1);
  expect(doc.querySelector('[data-clock]')).toBeTruthy();
  expect(doc.querySelector('html')?.getAttribute('lang')).toBe('en');
  expect(doc.querySelector('link[hreflang=x-default]')).toBeTruthy();
});
