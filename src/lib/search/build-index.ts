/** Builds /search-index.json from the catalogue (build time only). */
import { getCatalog, urlOf, zoneOf } from '../../data/catalog';
import { ALIASES } from '../../data/aliases';
import { ADMIN1_SUFFIX_COUNTRIES } from '../../data/popular';
import { zoneKey } from '../time/zone';
import { formatOffset } from '../time/format';
import type { SearchEntry } from './match';

const ZONE_WEIGHT = 1e9;

export function buildSearchIndex(): SearchEntry[] {
  const cat = getCatalog();
  const withAliases = (u: string, extra: string[] = []) => {
    const a = [...extra, ...(ALIASES[u] ?? [])];
    return a.length ? { a } : {};
  };

  const cities: SearchEntry[] = cat.cities.map(c => {
    const u = urlOf(c);
    const detail = ADMIN1_SUFFIX_COUNTRIES.includes(c.cc) && c.admin1 ? `${c.admin1}, ${c.countryName}` : c.countryName;
    return { n: c.name, ...withAliases(u), u, k: 'c', d: detail, z: c.tz, p: c.population };
  });

  const countries: SearchEntry[] = cat.countries.map(k => {
    const u = urlOf(k);
    const detail = k.singleZone ? 'Country' : `Country · ${k.zones.length} time zones`;
    return { n: k.name, ...withAliases(u), u, k: 'n', d: detail, z: zoneKey(zoneOf(k)), p: k.population };
  });

  const abbreviations: SearchEntry[] = cat.abbreviations.map(a => {
    const u = urlOf(a);
    const offset = formatOffset(a.data.offsetMinutes);
    return {
      n: a.data.abbr, ...withAliases(u, [a.data.name]), u, k: 'z',
      d: `${a.data.name} · ${offset}`, z: `fixed:${a.data.offsetMinutes}`, p: ZONE_WEIGHT,
    };
  });

  const offsets: SearchEntry[] = cat.offsets.map(o => {
    const u = urlOf(o);
    return {
      n: o.label, ...withAliases(u, [o.label.replace('UTC', 'GMT')]), u, k: 'z',
      d: 'UTC offset', z: `fixed:${o.offsetMinutes}`, p: ZONE_WEIGHT,
    };
  });

  return [...abbreviations, ...offsets, ...countries, ...cities];
}
