/**
 * Which /convert pairs are offered to search engines.
 *
 * Every pair page stays live for visitors, but only the pairs people actually search for are
 * indexable and listed in the sitemap; the rest are `noindex, follow`. Most of the 4,410 pairs
 * repeat one another (60 cities share only 29 distinct clock rules), so this focuses a young
 * site's limited crawl budget on its strongest pages.
 */
import { getCatalog, urlOf, zoneOf, type Pair } from './catalog';
import { offsetAt, type ZoneRef } from '../lib/time/zone';
import { transitions } from '../lib/time/transitions';

/** Paired with every popular place, in both directions. */
export const INDEX_HUB_PLACES: string[] = ['new-york', 'london', 'los-angeles'];

/** Paired with each other. */
export const INDEX_TOP_PLACES: string[] = [
  'new-york', 'chicago', 'los-angeles', 'toronto', 'london', 'paris', 'berlin', 'lagos', 'dubai', 'karachi',
  'mumbai', 'new-delhi', 'singapore', 'hong-kong', 'manila', 'tokyo', 'sydney', 'melbourne',
];

/** Paired with every top abbreviation, in both directions. */
export const INDEX_HUB_ABBREVIATIONS: string[] = ['est', 'pst', 'ist', 'utc'];

/** Paired with each other. */
export const INDEX_TOP_ABBREVIATIONS: string[] = ['utc', 'gmt', 'est', 'cst', 'mst', 'pst', 'ist', 'cet', 'aest', 'jst'];

/** True when the two zones show the same local time throughout the year containing `now`. */
function sameClockAllYear(a: ZoneRef, b: ZoneRef, now: number): boolean {
  const year = new Date(now).getUTCFullYear();
  const instants = [Date.UTC(year, 0, 1), ...transitions(a, year), ...transitions(b, year)].map(t =>
    typeof t === 'number' ? t : t.instant,
  );
  return instants.every(t => offsetAt(a, t) === offsetAt(b, t));
}

function inLists(from: string, to: string, hubs: string[], top: string[]): boolean {
  return hubs.includes(from) || hubs.includes(to) || (top.includes(from) && top.includes(to));
}

/** Paths of the pair pages that are noindex, so the sitemap can leave them out. */
export function noindexPairPaths(now: number): Set<string> {
  return new Set(getCatalog().pairs.filter(p => !isIndexedPair(p, now)).map(urlOf));
}

export function isIndexedPair(pair: Pair, now: number): boolean {
  const [hubs, top] =
    pair.kind === 'abbr' ? [INDEX_HUB_ABBREVIATIONS, INDEX_TOP_ABBREVIATIONS] : [INDEX_HUB_PLACES, INDEX_TOP_PLACES];
  if (!inLists(pair.from.slug, pair.to.slug, hubs, top)) return false;
  return !sameClockAllYear(zoneOf(pair.from), zoneOf(pair.to), now);
}
