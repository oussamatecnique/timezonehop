import { offsetAt, zoneKey, type ZoneRef } from './zone';

export interface Transition {
  instant: number;
  offsetBefore: number;
  offsetAfter: number;
}

const MINUTE = 60_000;
const DAY = 86_400_000;
const memo = new Map<string, Transition[]>();

/** All offset changes in [from, to). Samples daily, then bisects to the minute. */
export function transitionsBetween(z: ZoneRef, from: number, to: number): Transition[] {
  if (z.kind === 'fixed') return [];
  const start = Math.floor(from / MINUTE) * MINUTE;
  const end = Math.ceil(to / MINUTE) * MINUTE;
  const out: Transition[] = [];
  let prevT = start;
  let prevO = offsetAt(z, start);
  while (prevT < end) {
    const cur = Math.min(prevT + DAY, end);
    const o = offsetAt(z, cur);
    if (o !== prevO) {
      let lo = prevT;
      let hi = cur;
      while (hi - lo > MINUTE) {
        const mid = lo + Math.floor((hi - lo) / (2 * MINUTE)) * MINUTE;
        if (offsetAt(z, mid) === prevO) lo = mid;
        else hi = mid;
      }
      if (hi < end) out.push({ instant: hi, offsetBefore: prevO, offsetAfter: o });
    }
    prevT = cur;
    prevO = o;
  }
  return out;
}

/** Transitions in the UTC calendar year [Jan 1 00:00Z, next Jan 1 00:00Z). */
export function transitions(z: ZoneRef, year: number): Transition[] {
  const key = `${zoneKey(z)}|${year}`;
  let t = memo.get(key);
  if (!t) {
    t = transitionsBetween(z, Date.UTC(year, 0, 1), Date.UTC(year + 1, 0, 1));
    memo.set(key, t);
  }
  return t;
}

export function nextTransition(z: ZoneRef, from: number): Transition | null {
  return transitionsBetween(z, from, from + 400 * DAY)[0] ?? null;
}

export function observesDst(z: ZoneRef, year: number): boolean {
  return transitions(z, year).length >= 2;
}

/** The smallest offset the zone uses during the year (its standard time). */
export function standardOffset(z: ZoneRef, year: number): number {
  const start = offsetAt(z, Date.UTC(year, 0, 1));
  return transitions(z, year).reduce((min, t) => Math.min(min, t.offsetAfter), start);
}
