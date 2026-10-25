/**
 * The single source of truth for every page: entities, slugs and pairs.
 * Pages, the sitemap, the search index and related links all read from here.
 */
import citiesJson from './generated/cities.json';
import countriesJson from './generated/countries.json';
import { ABBREVIATIONS, type Abbreviation } from './abbreviations';
import {
  POPULAR_PLACES, TOP_ABBREVIATIONS, HOME_GRID, REFERENCE_PLACES, FALLBACK_REFERENCE, CITY_STATES, ADMIN1_SUFFIX_COUNTRIES,
} from './popular';
import { CITY_OVERRIDES, COUNTRY_SLUG_OVERRIDES } from './overrides';
import type { PlaceRef, RawCity, RawCountry } from './types';
import { fixed, iana, isValidIana, offsetAt, formatOffset, type ZoneRef } from '../lib/time/zone';
import { transitions } from '../lib/time/transitions';
import { BUILD_NOW } from '../lib/build-time';

export type { PlaceRef };

export interface City {
  kind: 'city';
  id: number;
  slug: string;
  name: string;
  qualifiedName: string;
  cc: string;
  countrySlug: string;
  countryName: string;
  admin1: string;
  lat: number;
  lon: number;
  population: number;
  tz: string;
  capital: boolean;
}

export interface CountryZone {
  tz: string;
  cities: { name: string; slug?: string }[];
}

export interface Country {
  kind: 'country';
  cc: string;
  slug: string;
  name: string;
  continent: string;
  population: number;
  capital: City | null;
  zones: CountryZone[];
  singleZone: boolean;
  lat: number | null;
  lon: number | null;
}

export interface AbbrZone {
  kind: 'abbr';
  slug: string;
  data: Abbreviation;
}

export interface OffsetZone {
  kind: 'offset';
  slug: string;
  offsetMinutes: number;
  label: string;
}

export type Place = City | Country;
export type PairEnd = City | Country | AbbrZone;
export type Entity = Place | AbbrZone | OffsetZone;

export interface Pair {
  slug: string;
  from: PairEnd;
  to: PairEnd;
  kind: 'abbr' | 'place';
}

export interface Catalog {
  cities: City[];
  countries: Country[];
  abbreviations: AbbrZone[];
  offsets: OffsetZone[];
  pairs: Pair[];
  time: Map<string, Place>;
  timezone: Map<string, AbbrZone | OffsetZone>;
  convert: Map<string, Pair>;
  popular: Place[];
  homeGrid: Place[];
  references: Place[];
  fallbackReference: Place;
}

export function slugify(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/['’]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function offsetSlug(minutes: number): string {
  if (minutes === 0) return 'utc';
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `utc-${minutes > 0 ? 'plus' : 'minus'}-${h}${m ? `-${String(m).padStart(2, '0')}` : ''}`;
}

const refKey = (cc: string, name: string) => `${cc}:${name.toLowerCase()}`;

let cached: Catalog | null = null;
const byRef = new Map<string, Place>();
const pairsByFrom = new Map<PairEnd, Pair[]>();

function build(): Catalog {
  const rawCities = citiesJson as RawCity[];
  const rawCountries = countriesJson as RawCountry[];
  const year = new Date(BUILD_NOW).getUTCFullYear();
  const samples = [Date.UTC(year, 0, 15), Date.UTC(year, 6, 15)];
  const signature = (tz: string) => samples.map(t => offsetAt(iana(tz), t)).join(',');

  // Countries first: their slugs win over city slugs.
  const countrySlugByCc = new Map<string, string>();
  const countryNameByCc = new Map<string, string>();
  const taken = new Set<string>();
  for (const k of rawCountries) {
    const slug = COUNTRY_SLUG_OVERRIDES[k.cc] ?? slugify(k.name);
    if (taken.has(slug)) throw new Error(`duplicate country slug: ${slug}`);
    taken.add(slug);
    countrySlugByCc.set(k.cc, slug);
    countryNameByCc.set(k.cc, k.name);
  }

  // Cities: overrides, then city-state merging, then collision suffixes.
  const merged = new Map<string, RawCity>(); // cc -> city that *is* the city-state
  const pending: { raw: RawCity; name: string; base: string }[] = [];
  for (const raw of rawCities) {
    if (!isValidIana(raw.tz)) throw new Error(`invalid IANA zone ${raw.tz} for ${raw.name}`);
    const countrySlug = countrySlugByCc.get(raw.cc);
    if (!countrySlug) throw new Error(`city ${raw.name} has unknown country ${raw.cc}`);
    const override = CITY_OVERRIDES[`${raw.cc}:${raw.ascii}`];
    const name = override?.name ?? raw.name;
    let base = override?.slug ?? slugify(raw.ascii);
    if (CITY_STATES.includes(raw.cc) && (raw.capital || base === countrySlug)) {
      if (!merged.has(raw.cc)) merged.set(raw.cc, raw);
      continue;
    }
    if (taken.has(base) && [...countrySlugByCc.values()].includes(base)) base = `${base}-city`;
    pending.push({ raw, name, base });
  }

  const cities: City[] = [];
  // GeoNames' raw name -> our city (zone city lists use raw names; most populous wins).
  const cityByRawName = new Map<string, City>();
  const baseCounts = new Map<string, number>();
  for (const p of pending) baseCounts.set(p.base, (baseCounts.get(p.base) ?? 0) + 1);
  // pending is in population order, so the most populous city claims the bare slug.
  for (const { raw, name, base } of pending) {
    const countrySlug = countrySlugByCc.get(raw.cc)!;
    const countryName = countryNameByCc.get(raw.cc)!;
    let slug = base;
    let qualifiedName = name;
    if (taken.has(slug)) {
      const useAdmin = ADMIN1_SUFFIX_COUNTRIES.includes(raw.cc) && raw.admin1;
      const candidates: [string, string][] = [
        useAdmin ? [`${base}-${slugify(raw.admin1)}`, `${name}, ${raw.admin1}`] : [`${base}-${countrySlug}`, `${name}, ${countryName}`],
        [`${base}-${countrySlug}`, `${name}, ${countryName}`],
        [`${base}-${raw.id}`, `${name}, ${raw.admin1 || countryName}`],
      ];
      const found = candidates.find(([s]) => !taken.has(s))!;
      [slug, qualifiedName] = found;
    }
    taken.add(slug);
    cities.push({
      kind: 'city', id: raw.id, slug, name, qualifiedName, cc: raw.cc, countrySlug, countryName, admin1: raw.admin1,
      lat: raw.lat, lon: raw.lon, population: raw.pop, tz: raw.tz, capital: raw.capital,
    });
    const city = cities[cities.length - 1];
    byRef.set(refKey(raw.cc, raw.ascii), city);
    if (!cityByRawName.has(refKey(raw.cc, raw.name))) cityByRawName.set(refKey(raw.cc, raw.name), city);
  }

  const cityById = new Map(cities.map(c => [c.id, c]));

  const countries: Country[] = rawCountries.map(k => {
    const capital = k.capitalId !== null ? cityById.get(k.capitalId) ?? null : null;
    const mergedCity = merged.get(k.cc);
    const largest = cities.find(c => c.cc === k.cc);
    const anchor = capital ?? mergedCity ?? largest ?? null;

    // Group zones that always keep the same time (e.g. Indiana zones inside "Eastern").
    const groups = new Map<string, CountryZone>();
    for (const z of k.zones) {
      if (!isValidIana(z.tz)) continue;
      const sig = signature(z.tz);
      const group = groups.get(sig) ?? { tz: z.tz, cities: [] };
      groups.set(sig, group);
      for (const n of z.cities) {
        const city = cityByRawName.get(refKey(k.cc, n));
        if (group.cities.length < 3) group.cities.push({ name: city?.name ?? n, slug: city?.slug });
      }
    }
    const zones = [...groups.values()];
    return {
      kind: 'country', cc: k.cc, slug: countrySlugByCc.get(k.cc)!, name: k.name, continent: k.continent,
      population: k.pop, capital, zones, singleZone: zones.length <= 1,
      lat: anchor?.lat ?? null, lon: anchor?.lon ?? null,
    } satisfies Country;
  });
  for (const k of countries) {
    const m = merged.get(k.cc);
    if (m) byRef.set(refKey(k.cc, m.ascii), k);
    byRef.set(refKey(k.cc, k.name), k);
  }

  const time = new Map<string, Place>();
  for (const e of [...countries, ...cities]) {
    if (time.has(e.slug)) throw new Error(`duplicate /time slug: ${e.slug}`);
    time.set(e.slug, e);
  }

  const abbreviations: AbbrZone[] = ABBREVIATIONS.map(data => ({ kind: 'abbr', slug: data.slug, data }));

  const offsetSet = new Set<number>();
  for (let h = -12; h <= 14; h++) offsetSet.add(h * 60);
  for (const tz of new Set(cities.map(c => c.tz))) {
    const z = iana(tz);
    offsetSet.add(offsetAt(z, Date.UTC(year, 0, 1)));
    for (const t of transitions(z, year)) offsetSet.add(t.offsetAfter);
  }
  offsetSet.delete(0);
  const offsets: OffsetZone[] = [...offsetSet]
    .sort((a, b) => a - b)
    .map(m => ({ kind: 'offset', slug: offsetSlug(m), offsetMinutes: m, label: formatOffset(m) }));

  const timezone = new Map<string, AbbrZone | OffsetZone>();
  for (const e of [...abbreviations, ...offsets]) {
    if (timezone.has(e.slug)) throw new Error(`duplicate /timezone slug: ${e.slug}`);
    timezone.set(e.slug, e);
  }

  const resolve = (ref: PlaceRef): Place => {
    const p = byRef.get(refKey(ref.cc, ref.name));
    if (!p) throw new Error(`unresolved place ${ref.name}/${ref.cc}`);
    return p;
  };

  const popular = POPULAR_PLACES.map(resolve);
  const topAbbr = TOP_ABBREVIATIONS.map(s => {
    const a = abbreviations.find(x => x.slug === s);
    if (!a) throw new Error(`unknown abbreviation ${s}`);
    return a;
  });

  const pairs: Pair[] = [];
  const addPairs = (ends: PairEnd[], kind: Pair['kind']) => {
    for (const from of ends) {
      for (const to of ends) {
        if (from === to) continue;
        const pair: Pair = { slug: `${from.slug}-to-${to.slug}`, from, to, kind };
        pairs.push(pair);
        const list = pairsByFrom.get(from) ?? [];
        list.push(pair);
        pairsByFrom.set(from, list);
      }
    }
  };
  addPairs(topAbbr, 'abbr');
  addPairs(popular, 'place');

  const convert = new Map<string, Pair>();
  for (const p of pairs) {
    if (convert.has(p.slug)) throw new Error(`duplicate /convert slug: ${p.slug}`);
    convert.set(p.slug, p);
  }

  return {
    cities, countries, abbreviations, offsets, pairs, time, timezone, convert, popular,
    homeGrid: HOME_GRID.map(resolve),
    references: REFERENCE_PLACES.map(resolve),
    fallbackReference: resolve(FALLBACK_REFERENCE),
  };
}

export function getCatalog(): Catalog {
  if (!cached) cached = build();
  return cached;
}

export function placeByRef(ref: PlaceRef): Place {
  getCatalog();
  const p = byRef.get(refKey(ref.cc, ref.name));
  if (!p) throw new Error(`unresolved place ${ref.name}/${ref.cc}`);
  return p;
}

export function zoneOf(e: Entity): ZoneRef {
  switch (e.kind) {
    case 'city': return iana(e.tz);
    case 'country': return iana(e.capital?.tz ?? e.zones[0]?.tz ?? 'UTC');
    case 'abbr': return fixed(e.data.offsetMinutes, e.data.abbr);
    case 'offset': return fixed(e.offsetMinutes, e.label);
  }
}

export function nameOf(e: Entity): string {
  switch (e.kind) {
    case 'city': return e.name;
    case 'country': return e.name;
    case 'abbr': return e.data.abbr;
    case 'offset': return e.label;
  }
}

export function urlOf(e: Entity | Pair): string {
  if ('from' in e) return `/convert/${e.slug}`;
  return e.kind === 'city' || e.kind === 'country' ? `/time/${e.slug}` : `/timezone/${e.slug}`;
}

export function sameZoneCities(c: City, limit: number): City[] {
  return getCatalog().cities.filter(x => x.tz === c.tz && x !== c).slice(0, limit);
}

export function citiesInCountry(cc: string, limit?: number): City[] {
  const list = getCatalog().cities.filter(c => c.cc === cc);
  return limit === undefined ? list : list.slice(0, limit);
}

export function pairsFrom(e: PairEnd): Pair[] {
  getCatalog();
  return pairsByFrom.get(e) ?? [];
}

export function pairFor(a: PairEnd, b: PairEnd): Pair | undefined {
  return getCatalog().convert.get(`${a.slug}-to-${b.slug}`);
}

/** For an abbreviation pair, the pair between the two representatives' places (if it exists). */
export function cityEquivalent(p: Pair): Pair | undefined {
  if (p.kind !== 'abbr' || p.from.kind !== 'abbr' || p.to.kind !== 'abbr') return undefined;
  const a = p.from.data.representative;
  const b = p.to.data.representative;
  if (!a || !b) return undefined;
  const pa = placeByRef(a);
  const pb = placeByRef(b);
  return pa === pb ? undefined : pairFor(pa, pb);
}
