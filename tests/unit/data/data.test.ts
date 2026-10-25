import { describe, it, expect } from 'vitest';
import cities from '../../../src/data/generated/cities.json';
import countries from '../../../src/data/generated/countries.json';
import { ABBREVIATIONS } from '../../../src/data/abbreviations';
import { POPULAR_PLACES, TOP_ABBREVIATIONS, HOME_GRID, REFERENCE_PLACES } from '../../../src/data/popular';
import { ZONE_LABELS } from '../../../src/data/zone-labels';
import { isValidIana } from '../../../src/lib/time/zone';

describe('generated data', () => {
  it('has ~1000 cities with valid zones and every country a city', () => {
    expect(cities.length).toBeGreaterThanOrEqual(1000);
    expect(cities.length).toBeLessThanOrEqual(1100);
    for (const c of cities) expect(isValidIana(c.tz), c.tz).toBe(true);
    const ccs = new Set(cities.map(c => c.cc));
    for (const k of countries) expect(ccs.has(k.cc), k.cc).toBe(true);
    expect(countries.length).toBeGreaterThanOrEqual(200);
  });

  it('contains every must-include place', () => {
    const has = (p: { name: string; cc: string }) =>
      cities.some(c => c.ascii.toLowerCase() === p.name.toLowerCase() && c.cc === p.cc);
    for (const p of [...POPULAR_PLACES, ...HOME_GRID, ...REFERENCE_PLACES]) expect(has(p), p.name).toBe(true);
    for (const a of ABBREVIATIONS) if (a.representative) expect(has(a.representative), a.slug).toBe(true);
  });
});

describe('curated data', () => {
  it('has the agreed sizes and valid references', () => {
    expect(POPULAR_PLACES).toHaveLength(60);
    expect(TOP_ABBREVIATIONS).toHaveLength(30);
    expect(ABBREVIATIONS).toHaveLength(48);
    const slugs = new Set(ABBREVIATIONS.map(a => a.slug));
    expect(slugs.size).toBe(48);
    for (const s of TOP_ABBREVIATIONS) expect(slugs.has(s), s).toBe(true);
    for (const a of ABBREVIATIONS) {
      if (a.sibling) expect(slugs.has(a.sibling), a.slug).toBe(true);
      if (a.representativeTz) {
        expect(isValidIana(a.representativeTz)).toBe(true);
        expect(ZONE_LABELS[a.representativeTz], a.representativeTz).toBeDefined();
      }
    }
  });
});
