/** Timeline math: the selectable day, snapping, and position <-> instant. */
import { dayShift, zonedParts, zonedToInstant, type ZoneRef } from '../../lib/time/zone';

export { dayShift };

export interface Range {
  start: number;
  end: number;
}

const MINUTE = 60_000;

/** Local midnight -> next local midnight in zone z (23 h or 25 h on DST days). */
export function dayRange(z: ZoneRef, instant: number): Range {
  const p = zonedParts(z, instant);
  const start = zonedToInstant(z, { year: p.year, month: p.month, day: p.day, hour: 0, minute: 0 });
  const next = new Date(Date.UTC(p.year, p.month - 1, p.day + 1));
  const end = zonedToInstant(z, {
    year: next.getUTCFullYear(), month: next.getUTCMonth() + 1, day: next.getUTCDate(), hour: 0, minute: 0,
  });
  return { start, end };
}

/** Same local time on the neighbouring day (±1), DST-safe. */
export function shiftDay(z: ZoneRef, instant: number, days: -1 | 1): number {
  const p = zonedParts(z, instant);
  const d = new Date(Date.UTC(p.year, p.month - 1, p.day + days));
  return zonedToInstant(z, {
    year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(), hour: p.hour, minute: p.minute,
  });
}

/** Drop seconds, then round to the nearest `stepMinutes`. */
export function snap(instant: number, stepMinutes = 15): number {
  const minutes = Math.floor(instant / MINUTE);
  return Math.round(minutes / stepMinutes) * stepMinutes * MINUTE;
}

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

export function fractionToInstant(f: number, r: Range): number {
  const t = r.start + clamp(f, 0, 1) * (r.end - r.start);
  return clamp(snap(t), r.start, r.end);
}

export function instantToFraction(t: number, r: Range): number {
  return clamp((t - r.start) / (r.end - r.start), 0, 1);
}
