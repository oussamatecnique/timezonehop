import { describe, it, expect } from 'vitest';
import { iana, fixed, offsetAt, zonedParts, zonedToInstant, zoneKey, zoneFromKey, isValidIana } from '../../../src/lib/time/zone';

const U = Date.UTC;

describe('offsetAt', () => {
  it('handles whole, half and quarter hour zones and DST', () => {
    expect(offsetAt(iana('Asia/Tokyo'), U(2026, 0, 15))).toBe(540);
    expect(offsetAt(iana('America/New_York'), U(2026, 0, 15))).toBe(-300);
    expect(offsetAt(iana('America/New_York'), U(2026, 6, 1))).toBe(-240);
    expect(offsetAt(iana('Asia/Kolkata'), U(2026, 6, 1))).toBe(330);
    expect(offsetAt(iana('Asia/Kathmandu'), U(2026, 6, 1))).toBe(345);
    expect(offsetAt(iana('Pacific/Chatham'), U(2026, 0, 15))).toBe(825);
    expect(offsetAt(iana('Pacific/Chatham'), U(2026, 6, 15))).toBe(765);
    expect(offsetAt(fixed(-300, 'EST'), U(2026, 6, 1))).toBe(-300);
  });

  it('flips exactly at the EU transition (2026-10-25 01:00Z)', () => {
    expect(offsetAt(iana('Europe/London'), U(2026, 9, 25, 0, 59))).toBe(60);
    expect(offsetAt(iana('Europe/London'), U(2026, 9, 25, 1, 0))).toBe(0);
  });
});

describe('zonedParts', () => {
  it('returns local wall clock parts', () => {
    expect(zonedParts(iana('Asia/Tokyo'), U(2026, 9, 25, 15, 30, 5)))
      .toEqual({ year: 2026, month: 10, day: 26, hour: 0, minute: 30, second: 5, weekday: 1 });
    expect(zonedParts(fixed(330, 'IST'), U(2026, 9, 25, 20, 0))).toMatchObject({ day: 26, hour: 1, minute: 30 });
  });
});

describe('zonedToInstant', () => {
  it('converts normal wall times', () => {
    expect(zonedToInstant(iana('Asia/Tokyo'), { year: 2026, month: 10, day: 25, hour: 9, minute: 0 })).toBe(U(2026, 9, 25, 0, 0));
    expect(zonedToInstant(fixed(-300, 'EST'), { year: 2026, month: 7, day: 1, hour: 12, minute: 0 })).toBe(U(2026, 6, 1, 17, 0));
  });

  it('moves nonexistent (gap) times forward', () => {
    // 2:30 AM on 2026-03-08 does not exist in New York -> 3:30 AM EDT
    expect(zonedToInstant(iana('America/New_York'), { year: 2026, month: 3, day: 8, hour: 2, minute: 30 })).toBe(U(2026, 2, 8, 7, 30));
  });

  it('picks the earlier instant for ambiguous (overlap) times', () => {
    // 1:30 AM on 2026-11-01 happens twice in New York -> first one (EDT)
    expect(zonedToInstant(iana('America/New_York'), { year: 2026, month: 11, day: 1, hour: 1, minute: 30 })).toBe(U(2026, 10, 1, 5, 30));
  });
});

describe('keys and validation', () => {
  it('round-trips keys and validates ids', () => {
    expect(zoneKey(iana('Asia/Tokyo'))).toBe('Asia/Tokyo');
    expect(zoneKey(fixed(-300, 'EST'))).toBe('fixed:-300');
    expect(zoneFromKey('fixed:-300', 'EST')).toEqual(fixed(-300, 'EST'));
    expect(zoneFromKey('Not/AZone')).toBeNull();
    expect(isValidIana('Asia/Calcutta')).toBe(true);
    expect(isValidIana('Mars/Olympus')).toBe(false);
    expect(isValidIana('')).toBe(false);
  });
});
