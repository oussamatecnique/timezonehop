import { it, expect } from 'vitest';
import { dstTable } from '../../../src/lib/content/dst';

it('lists US 2026 dates and skips Japan', () => {
  const rows = dstTable(Date.UTC(2026, 9, 25, 12));
  const us = rows.find(r => r.country.slug === 'usa' && r.tz === 'America/New_York')!;
  expect(us.thisYear).toEqual({ start: Date.UTC(2026, 2, 8, 7), end: Date.UTC(2026, 10, 1, 6) });
  expect(rows.some(r => r.country.slug === 'japan')).toBe(false);
});
