import { describe, it, expect } from 'vitest';
import { sunTimes } from '../../../src/lib/time/sun';

const U = Date.UTC;
const MIN = 60_000;
const near = (a: number, b: number) => expect(Math.abs(a - b)).toBeLessThanOrEqual(3 * MIN);

describe('sunTimes', () => {
  it('London solstice', () => {
    const s = sunTimes(51.5074, -0.1278, { year: 2026, month: 6, day: 21 });
    if (s.kind !== 'normal') throw new Error('expected normal');
    near(s.sunrise, U(2026, 5, 21, 3, 43));
    near(s.sunset, U(2026, 5, 21, 20, 21));
  });

  it('Sydney winter solstice (local date)', () => {
    const s = sunTimes(-33.8688, 151.2093, { year: 2026, month: 6, day: 21 });
    if (s.kind !== 'normal') throw new Error('expected normal');
    near(s.sunrise, U(2026, 5, 20, 21, 0));
    near(s.sunset, U(2026, 5, 21, 6, 54));
  });

  it('polar day and night in Tromsø', () => {
    expect(sunTimes(69.6492, 18.9553, { year: 2026, month: 6, day: 21 }).kind).toBe('polar-day');
    expect(sunTimes(69.6492, 18.9553, { year: 2026, month: 12, day: 21 }).kind).toBe('polar-night');
  });
});
