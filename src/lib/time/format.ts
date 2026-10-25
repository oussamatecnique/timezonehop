/**
 * Deterministic formatting. Strings are built from zonedParts + i18n names rather than
 * Intl output, so Node (build) and browsers (hydration) always produce identical text.
 */
import { en, t } from '../../i18n';
import { ZONE_LABELS } from '../../data/zone-labels';
import { formatOffset, offsetAt, zonedParts, type ZoneRef } from './zone';
import { standardOffset } from './transitions';

export { formatOffset };

const pad = (n: number) => String(n).padStart(2, '0');

export function formatTime(z: ZoneRef, instant: number, o: { hour12: boolean; seconds?: boolean }): string {
  const p = zonedParts(z, instant);
  const sec = o.seconds ? `:${pad(p.second)}` : '';
  if (!o.hour12) return `${pad(p.hour)}:${pad(p.minute)}${sec}`;
  const h = p.hour % 12 || 12;
  return `${h}:${pad(p.minute)}${sec} ${t(p.hour < 12 ? 'time.am' : 'time.pm')}`;
}

/** long: "Sunday, October 25, 2026" · medium: "Sun, Oct 25, 2026" · short: "Sun, Oct 25" */
export function formatDate(z: ZoneRef, instant: number, style: 'long' | 'medium' | 'short'): string {
  const p = zonedParts(z, instant);
  if (style === 'long') return `${en.days[p.weekday]}, ${en.months[p.month - 1]} ${p.day}, ${p.year}`;
  const base = `${en.daysShort[p.weekday]}, ${en.monthsShort[p.month - 1]} ${p.day}`;
  return style === 'medium' ? `${base}, ${p.year}` : base;
}

/** Absolute difference: "5 hours", "1 hour", "30 minutes", "5 hours 30 minutes", "0 hours". */
export function formatDifference(minutes: number): string {
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  const hours = t(h === 1 ? 'diff.hour' : 'diff.hours', { n: h });
  const mins = t(m === 1 ? 'diff.minute' : 'diff.minutes', { n: m });
  if (h && m) return `${hours} ${mins}`;
  if (m) return mins;
  return hours;
}

export function zoneAbbreviation(z: ZoneRef, instant: number): string {
  if (z.kind === 'fixed') return z.label;
  const off = offsetAt(z, instant);
  const label = ZONE_LABELS[z.id];
  if (!label) return formatOffset(off);
  const inDst = off > standardOffset(z, new Date(instant).getUTCFullYear());
  if (!inDst) return label.std;
  return label.dst ?? formatOffset(off);
}

const longFormatters = new Map<string, Intl.DateTimeFormat>();

export function zoneLongName(z: ZoneRef, instant: number): string {
  if (z.kind === 'fixed') return formatOffset(z.offsetMinutes);
  let f = longFormatters.get(z.id);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', { timeZone: z.id, timeZoneName: 'long' });
    longFormatters.set(z.id, f);
  }
  const name = f.formatToParts(instant).find(p => p.type === 'timeZoneName')?.value ?? '';
  return !name || name.startsWith('GMT') ? formatOffset(offsetAt(z, instant)) : name;
}

/** 'America/Argentina/Buenos_Aires' -> 'Buenos Aires' */
export function labelFromIana(id: string): string {
  const last = id.split('/').pop() ?? id;
  return last.replace(/_/g, ' ');
}

/** Whether the visitor's locale prefers a 12-hour clock. */
export function defaultHour12(): boolean {
  try {
    const hc = new Intl.DateTimeFormat(undefined, { hour: 'numeric' }).resolvedOptions().hourCycle;
    return hc === 'h11' || hc === 'h12';
  } catch {
    return true;
  }
}
