import { describe, it, expect } from 'vitest';
import { getCatalog } from '../../../src/data/catalog';
import { abbrView, offsetView } from '../../../src/lib/content/timezone';

const NOW = Date.UTC(2026, 9, 25, 12);
const cat = getCatalog();

describe('abbrView', () => {
  it('EST explains that New York is on EDT now', () => {
    const v = abbrView(cat.timezone.get('est') as any, NOW);
    expect(v.h1).toBe('EST — Eastern Standard Time (UTC−5)');
    expect(v.inEffectNote).toContain('EDT');
    expect(v.inEffectNote).toContain('Nov 1, 2026');
    expect(v.pairs).toHaveLength(29);
  });

  it('JST has no DST note and IST carries its ambiguity note', () => {
    expect(abbrView(cat.timezone.get('jst') as any, NOW).inEffectNote).toBe('Tokyo currently uses JST.');
    expect(abbrView(cat.timezone.get('ist') as any, NOW).note).toContain('Israel');
  });
});

describe('offsetView', () => {
  it('lists cities at UTC+5:30 now', () => {
    const v = offsetView(cat.timezone.get('utc-plus-5-30') as any, NOW);
    expect(v.citiesNow.some(c => c.slug === 'mumbai')).toBe(true);
    expect(v.abbreviations.map(a => a.slug)).toContain('ist');
  });
});
