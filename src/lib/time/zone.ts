/**
 * Timezone core. Pure and isomorphic: used at build time (Node) and in the browser.
 * Instants are epoch milliseconds; offsets are minutes east of UTC.
 */

export type ZoneRef =
  | { kind: 'iana'; id: string }
  | { kind: 'fixed'; offsetMinutes: number; label: string };

export interface WallTime {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  second?: number;
}

export interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  weekday: number; // 0 = Sunday
}

const MINUTE = 60_000;
const DAY = 86_400_000;
const WEEKDAYS: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(id: string): Intl.DateTimeFormat {
  let f = formatters.get(id);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: id,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      weekday: 'short',
    });
    formatters.set(id, f);
  }
  return f;
}

export function iana(id: string): ZoneRef {
  return { kind: 'iana', id };
}

export function fixed(offsetMinutes: number, label: string): ZoneRef {
  return { kind: 'fixed', offsetMinutes, label };
}

/** 'UTC', 'UTC+9', 'UTC+5:30', 'UTC−5' (U+2212 minus). */
export function formatOffset(minutes: number): string {
  if (minutes === 0) return 'UTC';
  const sign = minutes > 0 ? '+' : '−';
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `UTC${sign}${h}${m ? `:${String(m).padStart(2, '0')}` : ''}`;
}

export function zoneKey(z: ZoneRef): string {
  return z.kind === 'iana' ? z.id : `fixed:${z.offsetMinutes}`;
}

export function isValidIana(id: string): boolean {
  if (!id || typeof id !== 'string') return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: id });
    return true;
  } catch {
    return false;
  }
}

export function zoneFromKey(key: string, label?: string): ZoneRef | null {
  if (key.startsWith('fixed:')) {
    const minutes = Number(key.slice(6));
    if (!Number.isInteger(minutes) || Math.abs(minutes) > 18 * 60) return null;
    return fixed(minutes, label ?? formatOffset(minutes));
  }
  return isValidIana(key) ? iana(key) : null;
}

export function zonedParts(z: ZoneRef, instant: number): ZonedParts {
  if (z.kind === 'fixed') {
    const d = new Date(instant + z.offsetMinutes * MINUTE);
    return {
      year: d.getUTCFullYear(),
      month: d.getUTCMonth() + 1,
      day: d.getUTCDate(),
      hour: d.getUTCHours(),
      minute: d.getUTCMinutes(),
      second: d.getUTCSeconds(),
      weekday: d.getUTCDay(),
    };
  }
  const out: ZonedParts = { year: 0, month: 0, day: 0, hour: 0, minute: 0, second: 0, weekday: 0 };
  for (const p of formatterFor(z.id).formatToParts(instant)) {
    switch (p.type) {
      case 'year': out.year = Number(p.value); break;
      case 'month': out.month = Number(p.value); break;
      case 'day': out.day = Number(p.value); break;
      case 'hour': out.hour = Number(p.value) % 24; break;
      case 'minute': out.minute = Number(p.value); break;
      case 'second': out.second = Number(p.value); break;
      case 'weekday': out.weekday = WEEKDAYS[p.value] ?? 0; break;
    }
  }
  return out;
}

export function offsetAt(z: ZoneRef, instant: number): number {
  if (z.kind === 'fixed') return z.offsetMinutes;
  const p = zonedParts(z, instant);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  const floored = Math.floor(instant / 1000) * 1000;
  return Math.round((asUtc - floored) / MINUTE);
}

function matchesWall(z: ZoneRef, t: number, w: WallTime): boolean {
  const p = zonedParts(z, t);
  return p.year === w.year && p.month === w.month && p.day === w.day && p.hour === w.hour && p.minute === w.minute;
}

/**
 * Local wall time -> instant. Gap (spring forward): moves forward by the gap length.
 * Overlap (fall back): the earlier instant (pre-transition offset).
 */
export function zonedToInstant(z: ZoneRef, wall: WallTime): number {
  const guess = Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute, wall.second ?? 0);
  if (z.kind === 'fixed') return guess - z.offsetMinutes * MINUTE;
  const oBefore = offsetAt(z, guess - DAY);
  const oAfter = offsetAt(z, guess + DAY);
  const t1 = guess - oBefore * MINUTE;
  const t2 = guess - oAfter * MINUTE;
  const v1 = matchesWall(z, t1, wall);
  const v2 = matchesWall(z, t2, wall);
  if (v1 && v2) return Math.min(t1, t2);
  if (v1) return t1;
  if (v2) return t2;
  return t1;
}
