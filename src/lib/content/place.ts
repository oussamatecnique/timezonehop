/** Build-time content for city and country pages. */
import { t } from '../../i18n';
import { getCatalog, nameOf, zoneOf, type City, type Country, type Place } from '../../data/catalog';
import { fixed, iana, offsetAt, zonedParts, type ZoneRef } from '../time/zone';
import { nextTransition, observesDst, standardOffset } from '../time/transitions';
import { formatDate, formatDifference, formatOffset, formatTime, zoneAbbreviation, zoneLongName } from '../time/format';
import { sunTimes, type SunTimes } from '../time/sun';

export interface DstInfo {
  observes: boolean;
  inDstNow: boolean;
  next: { instant: number; deltaMinutes: number; localDate: string; localTime: string } | null;
  text: string;
}

export interface Difference {
  place: Place;
  diffMinutes: number;
  text: string;
}

export interface Faq {
  q: string;
  a: string;
}

export interface PlaceView {
  h1: string;
  zone: ZoneRef;
  tzId: string;
  abbreviation: string;
  longName: string;
  offsetMinutes: number;
  offsetLabel: string;
  dst: DstInfo;
  sun: SunTimes | null;
  sunDate: string | null;
  coords: { lat: number; lon: number } | null;
  population: number;
  differences: Difference[];
  faq: Faq[];
}

export interface CountryView extends PlaceView {
  zones: { tz: string; abbreviation: string; offsetLabel: string; cities: { name: string; slug?: string }[] }[];
  multiZone: boolean;
}

const yearOf = (instant: number) => new Date(instant).getUTCFullYear();

export function dstInfo(z: ZoneRef, name: string, now: number): DstInfo {
  const observes = observesDst(z, yearOf(now));
  const inDstNow = observes && offsetAt(z, now) > standardOffset(z, yearOf(now));
  const nt = observes ? nextTransition(z, now) : null;
  if (!nt) return { observes, inDstNow, next: null, text: t('place.dst.none', { name }) };
  // The wall clock just before the change, as clock changes are announced ("2:00 AM").
  const before = fixed(nt.offsetBefore, '');
  const deltaMinutes = nt.offsetAfter - nt.offsetBefore;
  const next = {
    instant: nt.instant,
    deltaMinutes,
    localDate: formatDate(before, nt.instant, 'medium'),
    localTime: formatTime(before, nt.instant, { hour12: true }),
  };
  const text = t('place.dst.next', {
    name,
    season: t(inDstNow ? 'place.dst.season.daylight' : 'place.dst.season.standard'),
    direction: t(deltaMinutes > 0 ? 'place.dst.forward' : 'place.dst.back'),
    delta: formatDifference(deltaMinutes),
    date: next.localDate,
    time: next.localTime,
  });
  return { observes, inDstNow, next, text };
}

function differences(self: Place, offset: number, now: number): Difference[] {
  const cat = getCatalog();
  return cat.references
    .map(r => (r === self ? cat.fallbackReference : r))
    .map(place => {
      const diffMinutes = offsetAt(zoneOf(place), now) - offset;
      const vars = { other: nameOf(place), diff: formatDifference(diffMinutes) };
      const key = diffMinutes > 0 ? 'place.diff.ahead' : diffMinutes < 0 ? 'place.diff.behind' : 'place.diff.same';
      return { place, diffMinutes, text: t(key, vars) };
    });
}

function faq(name: string, v: Omit<PlaceView, 'faq' | 'h1'>, now: number, self: Place): Faq[] {
  const cat = getCatalog();
  const newYork = cat.references.find(r => r.slug === 'new-york')!;
  const london = cat.references.find(r => r.slug === 'london')!;
  const other = offsetAt(zoneOf(newYork), now) === v.offsetMinutes || self === newYork ? london : newYork;
  const diff = v.offsetMinutes - offsetAt(zoneOf(other), now);
  const diffKey = diff > 0 ? 'place.faq.diff.ahead' : diff < 0 ? 'place.faq.diff.behind' : 'place.faq.diff.same';
  const dstAnswer = v.dst.next
    ? t('place.faq.dst.yes', {
        name,
        season: t(v.dst.inDstNow ? 'place.dst.season.daylight' : 'place.dst.season.standard'),
        date: v.dst.next.localDate,
        time: v.dst.next.localTime,
        direction: t(v.dst.next.deltaMinutes > 0 ? 'place.dst.forward' : 'place.dst.back'),
        delta: formatDifference(v.dst.next.deltaMinutes),
      })
    : t('place.faq.dst.no', { name, offset: v.offsetLabel });
  return [
    {
      q: t('place.faq.zone.q', { name }),
      a: t('place.faq.zone.a', { name, longName: v.longName, abbr: v.abbreviation, offset: v.offsetLabel, tzId: v.tzId }),
    },
    { q: t('place.faq.dst.q', { name }), a: dstAnswer },
    {
      q: t('place.faq.diff.q', { name, other: nameOf(other) }),
      a: t(diffKey, { name, other: nameOf(other), diff: formatDifference(diff) }),
    },
  ];
}

function baseView(self: Place, name: string, h1: string, coords: { lat: number; lon: number } | null, population: number, now: number): PlaceView {
  const zone = zoneOf(self);
  const tzId = zone.kind === 'iana' ? zone.id : '';
  const offsetMinutes = offsetAt(zone, now);
  const local = zonedParts(zone, now);
  const sun = coords ? sunTimes(coords.lat, coords.lon, local) : null;
  const partial = {
    zone,
    tzId,
    abbreviation: zoneAbbreviation(zone, now),
    longName: zoneLongName(zone, now),
    offsetMinutes,
    offsetLabel: formatOffset(offsetMinutes),
    dst: dstInfo(zone, name, now),
    sun,
    sunDate: sun ? formatDate(zone, now, 'medium') : null,
    coords,
    population,
    differences: differences(self, offsetMinutes, now),
  };
  return { h1, ...partial, faq: faq(name, partial, now, self) };
}

export function cityView(c: City, now: number): PlaceView {
  return baseView(c, c.name, t('place.h1', { name: `${c.qualifiedName}, ${c.countryName}` }), { lat: c.lat, lon: c.lon }, c.population, now);
}

export function countryView(c: Country, now: number): CountryView {
  const coords = c.lat !== null && c.lon !== null ? { lat: c.lat, lon: c.lon } : null;
  const view = baseView(c, c.name, t('place.h1', { name: c.name }), coords, c.population, now);
  const zones = c.zones.map(z => {
    const ref = iana(z.tz);
    return { tz: z.tz, abbreviation: zoneAbbreviation(ref, now), offsetLabel: formatOffset(offsetAt(ref, now)), cities: z.cities };
  });
  return { ...view, zones, multiZone: !c.singleZone };
}
