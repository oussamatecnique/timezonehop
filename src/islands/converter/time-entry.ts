/** Typed times: forgiving parsing ("9", "9:30pm", "21h30", "noon"), with a reason when it fails. */
import { zonedParts, zonedToInstant, type ZoneRef } from '../../lib/time/zone';

export type ParsedTime = { ok: true; hour: number; minute: number } | { ok: false; error: string };

const EXAMPLE = 'Try a time like 9:30 AM, 9pm or 21:30.';
const fail = (error: string): ParsedTime => ({ ok: false, error });

export function parseTime(input: string): ParsedTime {
  let s = input.trim().toLowerCase().replace(/\s+/g, ' ');
  if (!s) return fail('Type a time, like 9:30 AM or 21:30.');
  if (s === 'noon' || s === 'midday') return { ok: true, hour: 12, minute: 0 };
  if (s === 'midnight') return { ok: true, hour: 0, minute: 0 };

  // "am", "pm", "a", "p", "a.m.", with or without a space before it.
  let meridiem: 'am' | 'pm' | null = null;
  const suffix = /\s*([ap])\.?(?:m\.?)?$/.exec(s);
  if (suffix) {
    meridiem = suffix[1] === 'a' ? 'am' : 'pm';
    s = s.slice(0, suffix.index).trim();
  }

  let hour: number;
  let minute = 0;
  // "9", "09", "9:30", "9.30", "9h30", "9h", "9 30", "9:30:15" (seconds are dropped).
  const separated = /^(\d{1,2})(?:(?: ?[:.h] ?| )(?:(\d{2})(?: ?: ?(\d{2}))?)?)?$/.exec(s);
  // "930", "0930", "2130"
  const compact = /^(\d{1,2})(\d{2})$/.exec(s);
  if (separated) {
    hour = Number(separated[1]);
    minute = Number(separated[2] ?? 0);
    if (Number(separated[3] ?? 0) > 59) return fail(EXAMPLE);
  } else if (compact) {
    hour = Number(compact[1]);
    minute = Number(compact[2]);
  } else {
    return fail(EXAMPLE);
  }

  if (minute > 59) return fail('Minutes go from 00 to 59.');
  if (meridiem) {
    if (hour < 1 || hour > 12) return fail('With AM or PM, the hour goes from 1 to 12.');
    hour = (hour % 12) + (meridiem === 'pm' ? 12 : 0);
  } else if (hour > 23) {
    return fail('Hours go from 0 to 23, or use AM/PM.');
  }
  return { ok: true, hour, minute };
}

/**
 * The instant `zone` reads hour:minute on the calendar day it shows at `instant`.
 * A time skipped by a DST jump lands just after it (2:30 AM becomes 3:30 AM).
 */
export function atWallTime(zone: ZoneRef, instant: number, hour: number, minute: number): number {
  const p = zonedParts(zone, instant);
  return zonedToInstant(zone, { year: p.year, month: p.month, day: p.day, hour, minute });
}
