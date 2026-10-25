import { ABBREVIATIONS } from './abbreviations';
import type { PlaceRef } from './types';

const p = (name: string, cc: string): PlaceRef => ({ name, cc });

/** The 60 most-searched places. Order drives pair generation and hub listing. */
export const POPULAR_PLACES: PlaceRef[] = [
  p('New York City', 'US'), p('Los Angeles', 'US'), p('Chicago', 'US'), p('Houston', 'US'), p('Denver', 'US'),
  p('Phoenix', 'US'), p('San Francisco', 'US'), p('Seattle', 'US'), p('Miami', 'US'), p('Honolulu', 'US'),
  p('Toronto', 'CA'), p('Vancouver', 'CA'), p('Mexico City', 'MX'), p('Sao Paulo', 'BR'), p('Buenos Aires', 'AR'),
  p('Bogota', 'CO'), p('Lima', 'PE'), p('Santiago', 'CL'),
  p('London', 'GB'), p('Dublin', 'IE'), p('Lisbon', 'PT'), p('Paris', 'FR'), p('Berlin', 'DE'), p('Madrid', 'ES'),
  p('Rome', 'IT'), p('Amsterdam', 'NL'), p('Zurich', 'CH'), p('Stockholm', 'SE'), p('Warsaw', 'PL'), p('Athens', 'GR'),
  p('Istanbul', 'TR'), p('Moscow', 'RU'), p('Kyiv', 'UA'),
  p('Cairo', 'EG'), p('Lagos', 'NG'), p('Nairobi', 'KE'), p('Johannesburg', 'ZA'), p('Casablanca', 'MA'),
  p('Dubai', 'AE'), p('Riyadh', 'SA'), p('Tel Aviv', 'IL'), p('Tehran', 'IR'), p('Karachi', 'PK'), p('Mumbai', 'IN'),
  p('New Delhi', 'IN'), p('Bengaluru', 'IN'), p('Dhaka', 'BD'),
  p('Bangkok', 'TH'), p('Jakarta', 'ID'), p('Singapore', 'SG'), p('Hong Kong', 'HK'), p('Shanghai', 'CN'),
  p('Beijing', 'CN'), p('Manila', 'PH'), p('Seoul', 'KR'), p('Tokyo', 'JP'),
  p('Perth', 'AU'), p('Sydney', 'AU'), p('Melbourne', 'AU'), p('Auckland', 'NZ'),
];

/** The 30 abbreviations used for abbreviation-pair pages. */
export const TOP_ABBREVIATIONS: string[] = [
  'utc', 'gmt', 'est', 'edt', 'cst', 'cdt', 'mst', 'mdt', 'pst', 'pdt', 'akst', 'hst', 'ast', 'bst', 'cet',
  'cest', 'eet', 'eest', 'msk', 'gst', 'pkt', 'ist', 'ict', 'sgt', 'hkt', 'jst', 'kst', 'aest', 'aedt', 'nzst',
];

/** Mini clocks on the home page. */
export const HOME_GRID: PlaceRef[] = [
  p('New York City', 'US'), p('Los Angeles', 'US'), p('Toronto', 'CA'), p('Sao Paulo', 'BR'), p('London', 'GB'),
  p('Paris', 'FR'), p('Dubai', 'AE'), p('Mumbai', 'IN'), p('Singapore', 'SG'), p('Hong Kong', 'HK'), p('Tokyo', 'JP'),
  p('Sydney', 'AU'),
];

/** Reference cities for the "time difference" table on place pages. */
export const REFERENCE_PLACES: PlaceRef[] = [
  p('London', 'GB'), p('New York City', 'US'), p('Los Angeles', 'US'), p('Dubai', 'AE'), p('New Delhi', 'IN'),
  p('Singapore', 'SG'), p('Tokyo', 'JP'), p('Sydney', 'AU'),
];

/** Replaces a reference place on its own page. */
export const FALLBACK_REFERENCE: PlaceRef = p('Paris', 'FR');

/** City-states: the city has no page of its own; it is the country page. */
export const CITY_STATES: string[] = ['SG', 'HK', 'MO', 'MC', 'VA', 'GI'];

/** Countries where colliding city slugs are disambiguated with the state/province. */
export const ADMIN1_SUFFIX_COUNTRIES: string[] = ['US', 'CA', 'AU', 'BR', 'MX', 'IN', 'RU', 'CN', 'DE'];

/** Every place the data pipeline must keep, regardless of population. */
export function mustIncludePlaces(): PlaceRef[] {
  const all = [
    ...POPULAR_PLACES,
    ...HOME_GRID,
    ...REFERENCE_PLACES,
    FALLBACK_REFERENCE,
    ...ABBREVIATIONS.flatMap(a => (a.representative ? [a.representative] : [])),
  ];
  const seen = new Set<string>();
  return all.filter(r => {
    const key = `${r.cc}:${r.name.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
