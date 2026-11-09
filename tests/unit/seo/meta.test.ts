import { describe, it, expect } from 'vitest';
import { allPageRefs, pageMeta, crumbsFor } from '../../../src/lib/seo/meta';
import { getCatalog } from '../../../src/data/catalog';

const NOW = Date.UTC(2026, 9, 25, 12);
const metas = allPageRefs().map(r => pageMeta(r, NOW));

describe('meta', () => {
  it('covers every page', () => {
    expect(metas.length).toBeGreaterThanOrEqual(5600);
    expect(metas.length).toBeLessThanOrEqual(6000);
  });

  it('titles and descriptions are unique and sized', () => {
    const idx = metas.filter(m => !m.noindex);
    expect(new Set(idx.map(m => m.title)).size).toBe(idx.length);
    expect(new Set(idx.map(m => m.description)).size).toBe(idx.length);
    for (const m of idx) {
      expect(m.title.length, m.title).toBeLessThanOrEqual(70);
      expect(m.description.length, m.description).toBeGreaterThanOrEqual(100);
      expect(m.description.length, m.description).toBeLessThanOrEqual(160);
      expect(m.canonical).toMatch(/^https:\/\/timezonehop\.com(\/[a-z0-9-]+)*$/);
    }
  });

  it('formats key titles', () => {
    const cat = getCatalog();
    expect(pageMeta({ type: 'place', place: cat.time.get('tokyo')! }, NOW).title)
      .toBe('Current Time in Tokyo, Japan (JST, UTC+9) | TimezoneHop');
    expect(pageMeta({ type: 'pair', pair: cat.convert.get('new-york-to-london')! }, NOW).title)
      .toBe('New York to London Time Converter | TimezoneHop');
    expect(crumbsFor({ type: 'place', place: cat.time.get('tokyo')! }).map(c => c.url))
      .toEqual(['/', '/time', '/time/japan', '/time/tokyo']);
  });
});
