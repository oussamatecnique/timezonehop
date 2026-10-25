import { describe, it, expect } from 'vitest';
import { getCatalog, slugify, urlOf, cityEquivalent, pairsFrom, placeByRef, zoneOf } from '../../../src/data/catalog';
import { zoneKey } from '../../../src/lib/time/zone';

const cat = getCatalog();

describe('catalog', () => {
  it('slugifies', () => {
    expect(slugify("St. John's")).toBe('st-johns');
    expect(slugify('São Paulo')).toBe('sao-paulo');
    expect(slugify('  Zürich ')).toBe('zurich');
  });

  it('applies slug rules', () => {
    expect(cat.time.get('tokyo')?.kind).toBe('city');
    expect(cat.time.get('japan')?.kind).toBe('country');
    expect(cat.time.get('usa')?.kind).toBe('country');
    expect(cat.time.get('new-york')?.kind).toBe('city');
    expect(cat.time.get('singapore')?.kind).toBe('country');
    expect(cat.time.get('luxembourg-city')?.kind).toBe('city');
    const hyd = cat.time.get('hyderabad');
    expect(hyd?.kind === 'city' && hyd.cc).toBe('IN');
    const hydPk = cat.time.get('hyderabad-pakistan');
    expect(hydPk?.kind === 'city' && hydPk.qualifiedName).toBe('Hyderabad, Pakistan');
    expect(placeByRef({ name: 'Singapore', cc: 'SG' }).kind).toBe('country');
  });

  it('has unique slugs and the agreed pair counts', () => {
    const timeSlugs = [...cat.cities.map(c => c.slug), ...cat.countries.map(c => c.slug)];
    expect(new Set(timeSlugs).size).toBe(timeSlugs.length);
    expect(cat.pairs.filter(p => p.kind === 'abbr')).toHaveLength(870);
    expect(cat.pairs.filter(p => p.kind === 'place')).toHaveLength(3540);
    expect(new Set(cat.pairs.map(p => p.slug)).size).toBe(4410);
    for (const s of ['est-to-pst', 'pst-to-est', 'new-york-to-london', 'london-to-new-york', 'singapore-to-tokyo'])
      expect(cat.convert.has(s), s).toBe(true);
    expect(cat.convert.has('tokyo-to-tokyo')).toBe(false);
  });

  it('builds offsets without zero', () => {
    const slugs = cat.offsets.map(o => o.slug);
    expect(slugs).toContain('utc-plus-5-30');
    expect(slugs).toContain('utc-plus-5-45');
    expect(slugs).toContain('utc-minus-3-30');
    expect(slugs).toContain('utc-plus-14');
    expect(cat.offsets.some(o => o.offsetMinutes === 0)).toBe(false);
    expect(cat.timezone.get('utc')?.kind).toBe('abbr');
  });

  it('links pairs, urls and zones', () => {
    const est = cat.timezone.get('est')!;
    expect(urlOf(est)).toBe('/timezone/est');
    expect(cityEquivalent(cat.convert.get('est-to-ist')!)?.slug).toBe('new-york-to-new-delhi');
    expect(pairsFrom(cat.time.get('tokyo')! as any)).toHaveLength(59);
    expect(zoneKey(zoneOf(cat.time.get('usa')!))).toBe('America/New_York');
    expect(cat.popular).toHaveLength(60);
    expect(cat.homeGrid).toHaveLength(12);
  });
});
