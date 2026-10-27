import { it, expect } from 'vitest';
import { atWallTime, parseTime } from '../../../src/islands/converter/time-entry';
import { iana, zonedParts } from '../../../src/lib/time/zone';

const ok = (hour: number, minute: number) => ({ ok: true, hour, minute });

it('reads 12- and 24-hour times in many spellings', () => {
  expect(parseTime('9')).toEqual(ok(9, 0));
  expect(parseTime(' 09:30 ')).toEqual(ok(9, 30));
  expect(parseTime('21:30')).toEqual(ok(21, 30));
  expect(parseTime('0:05')).toEqual(ok(0, 5));
  expect(parseTime('9.30')).toEqual(ok(9, 30));
  expect(parseTime('21h30')).toEqual(ok(21, 30));
  expect(parseTime('21 h 30')).toEqual(ok(21, 30));
  expect(parseTime('9h')).toEqual(ok(9, 0));
  expect(parseTime('9 30')).toEqual(ok(9, 30));
  expect(parseTime('930')).toEqual(ok(9, 30));
  expect(parseTime('2130')).toEqual(ok(21, 30));
  expect(parseTime('9:30:59')).toEqual(ok(9, 30));
  expect(parseTime('9pm')).toEqual(ok(21, 0));
  expect(parseTime('9 PM')).toEqual(ok(21, 0));
  expect(parseTime('9:30 p.m.')).toEqual(ok(21, 30));
  expect(parseTime('9:30a')).toEqual(ok(9, 30));
  expect(parseTime('12am')).toEqual(ok(0, 0));
  expect(parseTime('12:15 PM')).toEqual(ok(12, 15));
  expect(parseTime('Noon')).toEqual(ok(12, 0));
  expect(parseTime('midnight')).toEqual(ok(0, 0));
});

it('rejects impossible or unreadable times with a reason', () => {
  for (const bad of ['', '   ', 'abc', '9:5', '9:300', '12345', '9:30 xm', '9::30', '-1', '9:30:75', '1.5']) {
    expect(parseTime(bad).ok, bad).toBe(false);
  }
  expect(parseTime('')).toEqual({ ok: false, error: 'Type a time, like 9:30 AM or 21:30.' });
  expect(parseTime('24:00')).toEqual({ ok: false, error: 'Hours go from 0 to 23, or use AM/PM.' });
  expect(parseTime('9:60')).toEqual({ ok: false, error: 'Minutes go from 00 to 59.' });
  expect(parseTime('13pm')).toEqual({ ok: false, error: 'With AM or PM, the hour goes from 1 to 12.' });
  expect(parseTime('0am')).toEqual({ ok: false, error: 'With AM or PM, the hour goes from 1 to 12.' });
});

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
