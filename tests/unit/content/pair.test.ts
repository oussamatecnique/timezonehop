import { describe, it, expect } from 'vitest';
import { getCatalog } from '../../../src/data/catalog';
import { pairView } from '../../../src/lib/content/pair';

const NOW = Date.UTC(2026, 9, 25, 12);
const cat = getCatalog();
const pair = (s: string) => cat.convert.get(s)!;

describe('pairView', () => {
  it('New York to London during the one-week EU/US gap', () => {
    const v = pairView(pair('new-york-to-london'), NOW);
    expect(v.h1).toBe('New York to London Time Converter');
    expect(v.diffMinutes).toBe(240);
    expect(v.summary).toBe('London is 4 hours ahead of New York. When it is 9:00 AM in New York, it is 1:00 PM in London.');
    expect(v.rows).toHaveLength(24);
    expect(v.rows[9]).toEqual({ hour: 9, fromLabel: '9:00 AM', toLabel: '1:00 PM', dayShift: 0 });
    expect(v.rows[22].dayShift).toBe(1);
    expect(v.dstChanges.map(c => [c.instant, c.newDiffMinutes])).toEqual([
      [Date.UTC(2026, 10, 1, 6), 300], [Date.UTC(2027, 2, 14, 7), 240], [Date.UTC(2027, 2, 28, 1), 300],
    ]);
    expect(v.reverse.slug).toBe('london-to-new-york');
  });

  it('says when the other place is already on the next day', () => {
    expect(pairView(pair('los-angeles-to-sydney'), NOW).summary).toBe(
      'Sydney is 18 hours ahead of Los Angeles. When it is 9:00 AM in Los Angeles, it is 3:00 AM the next day in Sydney.',
    );
    expect(pairView(pair('sydney-to-los-angeles'), NOW).summary).toContain('3:00 PM the previous day in Los Angeles');
  });

  it('EST to IST is fixed and points to the city equivalent', () => {
    const v = pairView(pair('est-to-ist'), NOW);
    expect(v.diffMinutes).toBe(630);
    expect(v.dstChanges).toEqual([]);
    expect(v.cityEquivalent?.slug).toBe('new-york-to-new-delhi');
    expect(v.inEffectNote).toContain('EDT');
  });
});
