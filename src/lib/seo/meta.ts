/** Titles, descriptions, canonical URLs and breadcrumbs for every page. */
import {
  getCatalog, nameOf, urlOf, zoneOf, type AbbrZone, type OffsetZone, type Pair, type Place,
} from '../../data/catalog';
import { offsetAt } from '../time/zone';
import { formatDifference, formatOffset, zoneAbbreviation } from '../time/format';

export const SITE = 'https://timezonehop.com';
export const BRAND = 'TimezoneHop';

export type StaticPage = 'about' | 'privacy' | 'terms' | 'contact' | '404';
export type PageRef =
  | { type: 'home' }
  | { type: 'hub'; hub: 'time' | 'timezone' | 'convert' }
  | { type: 'dst' }
  | { type: 'static'; page: StaticPage }
  | { type: 'place'; place: Place }
  | { type: 'abbr'; zone: AbbrZone }
  | { type: 'offset'; zone: OffsetZone }
  | { type: 'pair'; pair: Pair };

export interface PageMeta {
  title: string;
  description: string;
  canonical: string;
  ogImage: string;
  noindex: boolean;
}

export interface Crumb {
  name: string;
  url: string;
}

const SUFFIX = ` | ${BRAND}`;
const FILLER = ' Free, fast and always accurate.';

/** First candidate ≤ 60 chars, else first ≤ 70, else the last one. */
function fitTitle(candidates: string[]): string {
  return candidates.find(c => c.length <= 60) ?? candidates.find(c => c.length <= 70) ?? candidates[candidates.length - 1];
}

/** First candidate ≤ 160 chars, padded to ≥ 100 when short. */
function fitDescription(candidates: string[]): string {
  const d = candidates.find(c => c.length <= 160) ?? candidates[candidates.length - 1].slice(0, 157) + '…';
  return d.length >= 100 || d.length + FILLER.length > 160 ? d : d + FILLER;
}

const zoneLabel = (abbr: string, offset: string) => (abbr === offset ? offset : `${abbr}, ${offset}`);
const shortZoneName = (name: string) => name.replace(/ (Standard |Daylight |Summer )?Time$/, '');

export function pathOf(ref: PageRef): string {
  switch (ref.type) {
    case 'home': return '/';
    case 'hub': return `/${ref.hub}`;
    case 'dst': return '/daylight-saving-time';
    case 'static': return `/${ref.page}`;
    case 'place': return urlOf(ref.place);
    case 'abbr': return urlOf(ref.zone);
    case 'offset': return urlOf(ref.zone);
    case 'pair': return urlOf(ref.pair);
  }
}

const STATIC_META: Record<StaticPage, { title: string; description: string }> = {
  about: {
    title: `About ${BRAND}`,
    description: `${BRAND} is a fast, free world clock and time zone converter. Learn where our time data comes from and how we keep every clock accurate.`,
  },
  privacy: {
    title: `Privacy Policy${SUFFIX}`,
    description: `How ${BRAND} handles your data: cookie-less analytics, preferences stored only in your browser, and advertising cookies from Google AdSense.`,
  },
  terms: {
    title: `Terms of Use${SUFFIX}`,
    description: `The terms for using ${BRAND}, the free world clock and time zone converter, including our accuracy disclaimer and acceptable use of the site.`,
  },
  contact: {
    title: `Contact${SUFFIX}`,
    description: `Get in touch with the ${BRAND} team: report a wrong time, suggest a city or time zone we should add, or ask about the world clock and converter.`,
  },
  '404': {
    title: `Page Not Found${SUFFIX}`,
    description: `This page does not exist on ${BRAND}. Search for any city, country or time zone, or browse the world clock and the time zone converter instead.`,
  },
};

export function pageMeta(ref: PageRef, now: number): PageMeta {
  const path = pathOf(ref);
  const canonical = path === '/' ? SITE : SITE + path;
  const og = (name: string) => `${SITE}/og/${name}.png`;
  const year = new Date(now).getUTCFullYear();
  const base = { canonical, noindex: false };

  switch (ref.type) {
    case 'home':
      return {
        ...base,
        title: `${BRAND}: World Clock & Time Zone Converter`,
        description: 'Check the current time in any city or country and convert between time zones instantly. Live clocks, daylight saving dates and a meeting planner.',
        ogImage: og('home'),
      };
    case 'hub': {
      const hubs = {
        time: {
          title: `World Clock: Current Time in Every City & Country${SUFFIX}`,
          description: 'The current local time in over 1,200 cities and countries around the world, with live clocks, time zones, daylight saving dates and sunrise times.',
          image: 'place',
        },
        timezone: {
          title: `Time Zones: Abbreviations & UTC Offsets${SUFFIX}`,
          description: 'Every common time zone abbreviation (EST, PST, GMT, CET, IST, JST and more) and UTC offset, with the current time and where each one is used.',
          image: 'timezone',
        },
        convert: {
          title: `Time Zone Converter: Popular Conversions${SUFFIX}`,
          description: 'Convert time between time zones and cities: EST to PST, UTC to IST, London to New York and thousands more, with 24-hour tables and meeting times.',
          image: 'pair',
        },
      } as const;
      const h = hubs[ref.hub];
      return { ...base, title: h.title, description: h.description, ogImage: og(h.image) };
    }
    case 'dst':
      return {
        ...base,
        title: `Daylight Saving Time ${year}: Start & End Dates${SUFFIX}`,
        description: `When daylight saving time starts and ends in ${year} and ${year + 1} for every country that changes its clocks, with the exact local date and time.`,
        ogImage: og('default'),
      };
    case 'static':
      return { ...base, ...STATIC_META[ref.page], ogImage: og('default'), noindex: ref.page === '404' };
    case 'place': {
      const p = ref.place;
      const zone = zoneOf(p);
      const offset = formatOffset(offsetAt(zone, now));
      const abbr = zoneAbbreviation(zone, now);
      const label = zoneLabel(abbr, offset);
      if (p.kind === 'city') {
        return {
          ...base,
          title: fitTitle([
            `Current Time in ${p.qualifiedName}, ${p.countryName} (${label})${SUFFIX}`,
            `Current Time in ${p.qualifiedName}, ${p.countryName}${SUFFIX}`,
            `Current Time in ${p.qualifiedName}${SUFFIX}`,
            `Current Time in ${p.qualifiedName}`,
            `Time in ${p.qualifiedName}`,
          ]),
          description: fitDescription([
            `What time is it in ${p.qualifiedName}, ${p.countryName}? Live local time (${label}), daylight saving dates, sunrise, sunset and time differences.`,
            `Live local time in ${p.qualifiedName}, ${p.countryName} (${label}), with daylight saving dates and time differences.`,
            `Live local time in ${p.qualifiedName} (${label}).`,
          ]),
          ogImage: og('place'),
        };
      }
      const multi = !p.singleZone;
      return {
        ...base,
        title: fitTitle([
          multi ? `Current Time in ${p.name}: All Time Zones${SUFFIX}` : `Current Time in ${p.name} (${label})${SUFFIX}`,
          `Current Time in ${p.name}${SUFFIX}`,
          `Current Time in ${p.name}`,
          `Time in ${p.name}`,
        ]),
        description: fitDescription([
          multi
            ? `Current local time in ${p.name} across all ${p.zones.length} time zones, with live clocks, daylight saving dates, major cities and time differences.`
            : `Current local time in ${p.name} (${label}) with a live clock, daylight saving dates, major cities and time differences.`,
          `Current local time in ${p.name} with a live clock and time zone details.`,
        ]),
        ogImage: og('place'),
      };
    }
    case 'abbr': {
      const d = ref.zone.data;
      const offset = formatOffset(d.offsetMinutes);
      return {
        ...base,
        title: fitTitle([
          `${d.abbr} Time Now: ${d.name} (${offset})${SUFFIX}`,
          `${d.abbr} Time Now: ${d.name}${SUFFIX}`,
          `${d.abbr} Time Now (${offset})${SUFFIX}`,
        ]),
        description: fitDescription([
          `${d.abbr} (${d.name}) is ${offset}. See the current ${d.abbr} time, where it is used, daylight saving rules and conversions to other time zones.`,
          `${d.abbr} (${d.name}) is ${offset}. See the current ${d.abbr} time and convert it to other time zones.`,
        ]),
        ogImage: og('timezone'),
      };
    }
    case 'offset': {
      const label = ref.zone.label;
      return {
        ...base,
        title: `${label} Time Now: Cities & Time Zones${SUFFIX}`,
        description: fitDescription([
          `Current time in ${label}. See which cities and countries are on ${label} right now, the time zones that use it, and convert ${label} to your local time.`,
        ]),
        ogImage: og('timezone'),
      };
    }
    case 'pair': {
      const p = ref.pair;
      const A = nameOf(p.from);
      const B = nameOf(p.to);
      const diff = offsetAt(zoneOf(p.to), now) - offsetAt(zoneOf(p.from), now);
      const rel = diff > 0 ? `${formatDifference(diff)} ahead of` : diff < 0 ? `${formatDifference(diff)} behind` : 'the same time as';
      const titles =
        p.kind === 'abbr' && p.from.kind === 'abbr' && p.to.kind === 'abbr'
          ? [
              `${A} to ${B} Converter: ${shortZoneName(p.from.data.name)} to ${shortZoneName(p.to.data.name)} Time${SUFFIX}`,
              `${A} to ${B} Converter${SUFFIX}`,
            ]
          : [`${A} to ${B} Time Converter${SUFFIX}`];
      return {
        ...base,
        title: fitTitle(titles),
        description: fitDescription([
          `Convert ${A} to ${B} time. ${B} is ${rel} ${A} right now. Free converter with a 24-hour table, best meeting times and daylight saving changes.`,
          `Convert ${A} to ${B} time. ${B} is ${rel} ${A}. Free converter with a 24-hour table and meeting times.`,
        ]),
        ogImage: og('pair'),
      };
    }
  }
}

export function allPageRefs(): PageRef[] {
  const cat = getCatalog();
  return [
    { type: 'home' },
    { type: 'hub', hub: 'time' },
    { type: 'hub', hub: 'timezone' },
    { type: 'hub', hub: 'convert' },
    { type: 'dst' },
    ...(['about', 'privacy', 'terms', 'contact', '404'] as const).map(page => ({ type: 'static', page }) as PageRef),
    ...[...cat.time.values()].map(place => ({ type: 'place', place }) as PageRef),
    ...cat.abbreviations.map(zone => ({ type: 'abbr', zone }) as PageRef),
    ...cat.offsets.map(zone => ({ type: 'offset', zone }) as PageRef),
    ...cat.pairs.map(pair => ({ type: 'pair', pair }) as PageRef),
  ];
}

const HOME: Crumb = { name: 'Home', url: '/' };
const HUBS = {
  time: { name: 'World Clock', url: '/time' },
  timezone: { name: 'Time Zones', url: '/timezone' },
  convert: { name: 'Converter', url: '/convert' },
} as const;

export function crumbsFor(ref: PageRef): Crumb[] {
  switch (ref.type) {
    case 'home': return [HOME];
    case 'hub': return [HOME, HUBS[ref.hub]];
    case 'dst': return [HOME, { name: 'Daylight Saving Time', url: '/daylight-saving-time' }];
    case 'static': return [HOME, { name: STATIC_META[ref.page].title.replace(SUFFIX, ''), url: `/${ref.page}` }];
    case 'place': {
      const p = ref.place;
      if (p.kind === 'country') return [HOME, HUBS.time, { name: p.name, url: urlOf(p) }];
      return [HOME, HUBS.time, { name: p.countryName, url: `/time/${p.countrySlug}` }, { name: p.name, url: urlOf(p) }];
    }
    case 'abbr': return [HOME, HUBS.timezone, { name: ref.zone.data.abbr, url: urlOf(ref.zone) }];
    case 'offset': return [HOME, HUBS.timezone, { name: ref.zone.label, url: urlOf(ref.zone) }];
    case 'pair':
      return [HOME, HUBS.convert, { name: `${nameOf(ref.pair.from)} to ${nameOf(ref.pair.to)}`, url: urlOf(ref.pair) }];
  }
}
