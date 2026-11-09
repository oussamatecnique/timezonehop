import { describe, it, expect } from 'vitest';
import { getCatalog } from '../../../src/data/catalog';
import {
  INDEX_HUB_PLACES, INDEX_TOP_PLACES, INDEX_HUB_ABBREVIATIONS, INDEX_TOP_ABBREVIATIONS, isIndexedPair,
} from '../../../src/data/indexing';

const NOW = Date.UTC(2026, 10, 9, 12);
const cat = getCatalog();
const indexed = (slug: string) => {
  const pair = cat.convert.get(slug);
  if (!pair) throw new Error(`no pair ${slug}`);
  return isIndexedPair(pair, NOW);
};

describe('pair indexing', () => {
  it('names only real places and abbreviations', () => {
    const places = new Set(cat.popular.map(p => p.slug));
    for (const s of [...INDEX_HUB_PLACES, ...INDEX_TOP_PLACES]) expect(places.has(s), s).toBe(true);
    const abbrs = new Set(cat.abbreviations.map(a => a.slug));
    for (const s of [...INDEX_HUB_ABBREVIATIONS, ...INDEX_TOP_ABBREVIATIONS]) expect(abbrs.has(s), s).toBe(true);
  });

  it('keeps high-demand conversions', () => {
    for (const s of [
      'est-to-ist', 'ist-to-est', 'pst-to-est', 'est-to-pst', 'utc-to-est', 'pst-to-ist', 'cet-to-ist', 'edt-to-ist',
      'london-to-new-york', 'new-york-to-london', 'new-york-to-mumbai', 'manila-to-new-york', 'tokyo-to-sydney',
      'lagos-to-london', 'dubai-to-karachi', 'los-angeles-to-seoul',
    ]) expect(indexed(s), s).toBe(true);
  });

  it('drops low-demand conversions', () => {
    for (const s of ['kyiv-to-denver', 'amsterdam-to-phoenix', 'stockholm-to-karachi', 'cet-to-akst', 'nzst-to-msk'])
      expect(indexed(s), s).toBe(false);
  });

  it('drops pairs that share the same clock all year', () => {
    for (const s of ['new-york-to-toronto', 'los-angeles-to-san-francisco', 'mumbai-to-new-delhi', 'london-to-dublin', 'utc-to-gmt'])
      expect(indexed(s), s).toBe(false);
  });

  it('keeps roughly 500 to 800 pairs', () => {
    const n = cat.pairs.filter(p => isIndexedPair(p, NOW)).length;
    expect(n).toBeGreaterThanOrEqual(500);
    expect(n).toBeLessThanOrEqual(800);
  });
});
