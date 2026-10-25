import { describe, it, expect } from 'vitest';
import { getCatalog } from '../../../src/data/catalog';
import { cityView, countryView } from '../../../src/lib/content/place';

const NOW = Date.UTC(2026, 9, 25, 12);
const cat = getCatalog();
const place = (s: string) => cat.time.get(s) as any;

describe('cityView', () => {
  it('Tokyo has no DST', () => {
    const v = cityView(place('tokyo'), NOW);
    expect(v.h1).toBe('Current time in Tokyo, Japan');
    expect(v).toMatchObject({ offsetMinutes: 540, offsetLabel: 'UTC+9', abbreviation: 'JST', tzId: 'Asia/Tokyo' });
    expect(v.dst.observes).toBe(false);
    expect(v.dst.next).toBeNull();
    expect(v.differences).toHaveLength(8);
    expect(v.differences.some(d => d.place.slug === 'tokyo')).toBe(false);
    expect(v.faq.length).toBeGreaterThanOrEqual(3);
  });

  it('New York knows its next change', () => {
    const v = cityView(place('new-york'), NOW);
    expect(v.dst).toMatchObject({ observes: true, inDstNow: true });
    expect(v.dst.next).toMatchObject({
      instant: Date.UTC(2026, 10, 1, 6), deltaMinutes: -60, localDate: 'Sun, Nov 1, 2026', localTime: '2:00 AM',
    });
    expect(v.sun?.kind).toBe('normal');
  });
});

describe('countryView', () => {
  it('USA is multi-zone, Japan is not', () => {
    expect(countryView(place('usa'), NOW).multiZone).toBe(true);
    expect(countryView(place('usa'), NOW).zones.length).toBeGreaterThanOrEqual(4);
    expect(countryView(place('japan'), NOW).multiZone).toBe(false);
  });
});
