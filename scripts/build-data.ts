/**
 * Builds src/data/generated/{cities,countries}.json from GeoNames (CC BY 4.0).
 * Run manually: `npm run data` (add --refresh to re-download). Output is committed,
 * so normal builds never touch the network.
 */
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { unzipSync, strFromU8 } from 'fflate';
import { mustIncludePlaces } from '../src/data/popular';
import type { RawCity, RawCountry } from '../src/data/types';

const BASE = 'https://download.geonames.org/export/dump/';
const CACHE = '.cache/geonames';
const OUT = 'src/data/generated';
const TARGET = 1000;
/** Sections of cities, historical, abandoned or destroyed places. */
const EXCLUDED_CODES = new Set(['PPLX', 'PPLH', 'PPLQ', 'PPLW', 'PPLCH']);

async function download(file: string): Promise<Buffer> {
  const path = join(CACHE, file);
  if (existsSync(path) && !process.argv.includes('--refresh')) return readFileSync(path);
  console.log(`downloading ${file}…`);
  const res = await fetch(BASE + file);
  if (!res.ok) throw new Error(`${file}: HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  mkdirSync(CACHE, { recursive: true });
  writeFileSync(path, buf);
  return buf;
}

const lines = (text: string) => text.split('\n').filter(l => l && !l.startsWith('#'));

/** Accent-stripped name ("Zürich" -> "Zurich"); GeoNames' transliteration ("Zuerich") only if that fails. */
function asciiName(name: string, geonamesAscii: string): string {
  const stripped = name.normalize('NFD').replace(/\p{M}/gu, '');
  return /^[\x20-\x7e]+$/.test(stripped) ? stripped : geonamesAscii || stripped;
}

interface Row extends RawCity {
  code: string;
}

async function main() {
  const zip = unzipSync(new Uint8Array(await download('cities15000.zip')));
  const citiesText = strFromU8(zip['cities15000.txt']);
  const countryText = (await download('countryInfo.txt')).toString('utf8');
  const admin1Text = (await download('admin1CodesASCII.txt')).toString('utf8');

  const admin1 = new Map<string, string>();
  for (const l of lines(admin1Text)) {
    const [code, name] = l.split('\t');
    admin1.set(code, name);
  }

  const rows: Row[] = [];
  for (const l of lines(citiesText)) {
    const f = l.split('\t');
    const code = f[7];
    if (EXCLUDED_CODES.has(code) || !f[17]) continue;
    rows.push({
      id: Number(f[0]),
      name: f[1],
      ascii: asciiName(f[1], f[2]),
      cc: f[8],
      admin1: admin1.get(`${f[8]}.${f[10]}`) ?? '',
      lat: Math.round(Number(f[4]) * 1e4) / 1e4,
      lon: Math.round(Number(f[5]) * 1e4) / 1e4,
      pop: Number(f[14]) || 0,
      tz: f[17],
      capital: code === 'PPLC',
      code,
    });
  }
  rows.sort((a, b) => b.pop - a.pop);

  const selected = new Map<number, Row>();
  const add = (r: Row) => selected.set(r.id, r);

  for (const r of rows) if (r.capital) add(r);

  const missing: string[] = [];
  for (const ref of mustIncludePlaces()) {
    const want = ref.name.toLowerCase();
    const match = rows.find(r => r.cc === ref.cc && (r.ascii.toLowerCase() === want || r.name.toLowerCase() === want));
    if (match) add(match);
    else missing.push(`${ref.name}/${ref.cc}`);
  }
  if (missing.length) {
    console.error(`Missing must-include places:\n  ${missing.join('\n  ')}`);
    process.exit(1);
  }

  const withCapital = new Set([...selected.values()].filter(r => r.capital).map(r => r.cc));
  const largestByCountry = new Map<string, Row>();
  for (const r of rows) if (!largestByCountry.has(r.cc)) largestByCountry.set(r.cc, r);
  for (const [cc, r] of largestByCountry) if (!withCapital.has(cc)) add(r);

  for (const r of rows) {
    if (selected.size >= TARGET) break;
    add(r);
  }

  const cities: RawCity[] = [...selected.values()]
    .sort((a, b) => b.pop - a.pop)
    .map(({ code: _code, ...c }) => c);

  // Country zones aggregate ALL cities15000 rows, not just the selected ones.
  const zoneAgg = new Map<string, Map<string, { pop: number; cities: string[] }>>();
  for (const r of rows) {
    const byTz = zoneAgg.get(r.cc) ?? new Map();
    zoneAgg.set(r.cc, byTz);
    const z = byTz.get(r.tz) ?? { pop: 0, cities: [] };
    byTz.set(r.tz, z);
    z.pop += r.pop;
    if (z.cities.length < 3) z.cities.push(r.name);
  }

  const selectedCcs = new Set(cities.map(c => c.cc));
  const countries: RawCountry[] = [];
  for (const l of lines(countryText)) {
    const f = l.split('\t');
    const cc = f[0];
    if (!selectedCcs.has(cc)) continue;
    const capital = cities.find(c => c.cc === cc && c.capital) ?? null;
    const zones = [...(zoneAgg.get(cc) ?? new Map()).entries()]
      .map(([tz, z]) => ({ tz, pop: z.pop, cities: z.cities }))
      .sort((a, b) => b.pop - a.pop);
    countries.push({ cc, name: f[4], continent: f[8], pop: Number(f[7]) || 0, capitalId: capital?.id ?? null, zones });
  }
  countries.sort((a, b) => a.name.localeCompare(b.name));

  const toJson = (items: unknown[]) => `[\n${items.map(i => JSON.stringify(i)).join(',\n')}\n]\n`;
  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, 'cities.json'), toJson(cities));
  writeFileSync(join(OUT, 'countries.json'), toJson(countries));
  console.log(`wrote ${cities.length} cities, ${countries.length} countries`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
