/** Shapes of the generated GeoNames data (src/data/generated/*.json). */

export interface RawCity {
  id: number;
  name: string;
  ascii: string;
  cc: string;
  admin1: string;
  lat: number;
  lon: number;
  pop: number;
  tz: string;
  capital: boolean;
}

export interface RawCountry {
  cc: string;
  name: string;
  continent: string;
  pop: number;
  capitalId: number | null;
  /** Sorted by population, descending. `cities` = names of the 3 largest cities in that zone. */
  zones: { tz: string; pop: number; cities: string[] }[];
}

/** A place identified by its GeoNames ASCII name + ISO country code. */
export type PlaceRef = { name: string; cc: string };
