import { it, expect } from 'vitest';
import { dayRange, snap, fractionToInstant, dayShift } from '../../../src/islands/converter/timeline';
import { iana } from '../../../src/lib/time/zone';

const ny = iana('America/New_York');
const H = 3_600_000;

it('handles 23h/25h days, snapping and day shifts', () => {
  const fall = dayRange(ny, Date.UTC(2026, 10, 1, 15));
  expect(fall.end - fall.start).toBe(25 * H);
  const spring = dayRange(ny, Date.UTC(2026, 2, 8, 15));
  expect(spring.end - spring.start).toBe(23 * H);
  expect(snap(Date.UTC(2026, 0, 1, 10, 7, 31))).toBe(Date.UTC(2026, 0, 1, 10, 0));
  expect(snap(Date.UTC(2026, 0, 1, 10, 8))).toBe(Date.UTC(2026, 0, 1, 10, 15));
  expect(fractionToInstant(1.4, fall)).toBe(fall.end);
  expect(dayShift(iana('Asia/Tokyo'), ny, Date.UTC(2026, 9, 25, 20))).toBe(1);
  expect(dayShift(ny, iana('Asia/Tokyo'), Date.UTC(2026, 9, 25, 20))).toBe(-1);
});
