import { it, expect } from 'vitest';
import { atWallTime } from '../../../src/islands/converter/time-entry';
import { iana, zonedParts } from '../../../src/lib/time/zone';

it('sets the time on the day the zone shows, moving past DST gaps', () => {
  const ny = iana('America/New_York');
  const tokyo = iana('Asia/Tokyo');
  // 8 PM in New York on Oct 25 is already Oct 26 in Tokyo.
  const instant = Date.UTC(2026, 9, 26, 0);
  const t = atWallTime(tokyo, instant, 15, 0);
  expect(zonedParts(tokyo, t)).toMatchObject({ month: 10, day: 26, hour: 15, minute: 0 });
  // 2:30 AM doesn't exist in New York on Mar 8, 2026: it lands on 3:30 AM.
  const gap = atWallTime(ny, Date.UTC(2026, 2, 8, 15), 2, 30);
  expect(zonedParts(ny, gap)).toMatchObject({ day: 8, hour: 3, minute: 30 });
});
