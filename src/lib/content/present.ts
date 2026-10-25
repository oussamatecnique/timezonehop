/** Small presentation helpers shared by page templates (build time). */
import { zonedParts, type ZoneRef } from '../time/zone';
import { formatTime } from '../time/format';
import type { SunTimes } from '../time/sun';

/** Sunrise/sunset as local minutes after midnight, for SkyClockCard. */
export function sunProps(zone: ZoneRef, sun: SunTimes | null): { rise?: number; set?: number; polar?: 'day' | 'night' } {
  if (!sun) return {};
  if (sun.kind === 'polar-day') return { polar: 'day' };
  if (sun.kind === 'polar-night') return { polar: 'night' };
  const minutes = (t: number) => {
    const p = zonedParts(zone, t);
    return p.hour * 60 + p.minute;
  };
  return { rise: minutes(sun.sunrise), set: minutes(sun.sunset) };
}

export function sunText(zone: ZoneRef, sun: SunTimes | null): string | null {
  if (!sun) return null;
  if (sun.kind === 'polar-day') return 'The sun does not set today (midnight sun)';
  if (sun.kind === 'polar-night') return 'The sun does not rise today (polar night)';
  const h = { hour12: true };
  return `Sunrise ${formatTime(zone, sun.sunrise, h)}, sunset ${formatTime(zone, sun.sunset, h)}`;
}

export function coordsText(c: { lat: number; lon: number } | null): string | null {
  if (!c) return null;
  const f = (v: number, pos: string, neg: string) => `${Math.abs(v).toFixed(2)}° ${v >= 0 ? pos : neg}`;
  return `${f(c.lat, 'N', 'S')}, ${f(c.lon, 'E', 'W')}`;
}

export const formatPopulation = (n: number) => n.toLocaleString('en-US');
