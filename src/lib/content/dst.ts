/** Daylight saving start/end dates for every catalogued country that observes DST. */
import { getCatalog, type Country } from '../../data/catalog';
import { iana } from '../time/zone';
import { transitions } from '../time/transitions';

export interface DstPeriod {
  start: number;
  end: number;
}

export interface DstRow {
  country: Country;
  tz: string;
  thisYear: DstPeriod | null;
  nextYear: DstPeriod | null;
}

function period(tz: string, year: number): DstPeriod | null {
  const list = transitions(iana(tz), year);
  const start = list.find(t => t.offsetAfter > t.offsetBefore);
  const end = list.find(t => t.offsetAfter < t.offsetBefore);
  return start && end ? { start: start.instant, end: end.instant } : null;
}

/** One row per (country, zone with distinct rules). Country zones are already grouped by offsets. */
export function dstTable(now: number): DstRow[] {
  const year = new Date(now).getUTCFullYear();
  const rows: DstRow[] = [];
  for (const country of getCatalog().countries) {
    const seen = new Set<string>();
    for (const z of country.zones) {
      const thisYear = period(z.tz, year);
      const nextYear = period(z.tz, year + 1);
      if (!thisYear && !nextYear) continue;
      const key = JSON.stringify([thisYear, nextYear]);
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push({ country, tz: z.tz, thisYear, nextYear });
    }
  }
  return rows.sort((a, b) => a.country.name.localeCompare(b.country.name));
}
