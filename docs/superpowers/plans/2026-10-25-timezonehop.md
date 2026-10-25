# TimezoneHop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and deploy timezonehop.com: a static, SEO-first world clock and time zone converter with ~5,700 pre-rendered pages and AdSense-ready ad slots.

**Architecture:**
- Astro builds every page to static HTML from one data catalogue (GeoNames cities + curated timezone abbreviations).
- All time math lives in a pure, isomorphic `src/lib/time` module on top of the built-in `Intl` API. The build uses it for page content; the browser uses it for live clocks and the converter.
- Interactivity is limited to a tiny inlined clock runtime and two Preact islands (converter, search).
- The site is deployed as static assets on Cloudflare, rebuilt daily by GitHub Actions.

**Tech Stack:** Astro 7.4, Preact 11 + @preact/signals 2.11, @astrojs/sitemap 3.7, TypeScript (strict), Vitest 5, Playwright 1.64, esbuild (inline script bundling), Wrangler 4 (Cloudflare Workers static assets), GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-10-25-timezonehop-design.md`

## Global Constraints

**Platform and dependencies**
- Node ≥ 22.23.4 (Astro 7 engine floor); CI uses Node 24.
- `astro.config.mjs`: `site: 'https://timezonehop.com'`, `output: 'static'`, `trailingSlash: 'never'`, `build: { format: 'file', inlineStylesheets: 'auto' }`.
- No runtime date libraries (no moment, luxon, date-fns, dayjs). Only the `Intl` API.
- Interactive code lives only in `src/islands/*` (Preact) and `src/scripts/*`. Pages and components are `.astro`.

**Time conventions**
- Instants are epoch-millisecond `number`s everywhere in `src/lib`. Wall times use months 1–12.
- Offsets are minutes east of UTC (Tokyo = 540, New York in summer = −240).
- Offsets are displayed with the Unicode minus sign `−` (U+2212): `UTC−5`, `UTC+5:30`, `UTC` for zero.
- Build "now" comes only from `src/lib/build-time.ts` (`BUILD_NOW`, overridable via the env var `BUILD_NOW` in epoch ms). Content code never calls `Date.now()` itself.

**Copy and branding**
- All user-facing copy (UI labels, sentence templates, month and day names) lives in `src/i18n/en.ts`, accessed via `t()` from `src/i18n/index.ts`.
- English with US spelling. Brand name is written `TimezoneHop`.

**Product rules**
- Converter: 2–6 zones; timeline snaps to 15 minutes; working hours are 09:00–17:00 local.
- localStorage key `tzh:prefs`. Every storage access is wrapped in try/catch.
- Ads render only when `import.meta.env.PUBLIC_ADS_ENABLED === 'true'`. The AdSense account meta tag and ads.txt are emitted only when `PUBLIC_ADSENSE_CLIENT` is set.

**Budgets (per page, ads off)**
- JS ≤ 35 KB gzip, CSS ≤ 15 KB gzip, font ≤ 30 KB.
- Lighthouse mobile: Performance ≥ 95, SEO = 100, Accessibility ≥ 95, Best Practices ≥ 95. CLS < 0.02.

**Refinements to the spec, decided here** (each one is simpler or more robust; the spec intent is unchanged):
1. **Font loading:** use `font-display: optional` with a preloaded Latin woff2, instead of `swap` + `size-adjust`. This gives zero layout shift with no metric tuning.
2. **Sunrise/sunset** come from the daily build, labelled with their date, and are not recomputed in the browser. The sky phase uses them as minutes-of-day.
3. **IANA validation** constructs `Intl.DateTimeFormat` (accepts aliases like `Asia/Calcutta`) instead of checking `Intl.supportedValuesOf`.
4. **UTC** is an abbreviation entity at `/timezone/utc`. Offset pages exclude zero.
5. **Timeline** gets ‹ prev day / next day › buttons so meetings on other days can be planned.

## Review Focus

These are inputs the spec implies but doesn't spell out. Each one has a pinned test in its owning task.
1. **Visitor's own zone isn't in our catalogue** (e.g. `America/Indiana/Knox`, or an alias like `Asia/Calcutta`). "Hours ahead of you" and the converter must still work, labelled from the IANA id. An invalid or empty zone falls back to UTC. → Task 11 (`initialZones`), Task 10 (`clock-runtime`).
2. **Day boundaries and DST days.** Converter rows across midnight need "+1 day"/"−1 day" labels. The timeline day is 23 h or 25 h on transition days, and wall times that don't exist or happen twice resolve deterministically. → Task 1 (`zonedToInstant`), Task 11 (`dayRange`).
3. **Messy search input:** diacritics, capitals, extra whitespace, punctuation (`"  São Paulo "`, `"st. john's"`, `"UTC +5:30"`, `"gmt-3"`). → Task 9.
4. **Hand-edited or stale share URLs:** unknown slugs, duplicates, more than 6 zones, unparsable `t`, a `t` years away. → Task 11 (`parseShare`).
5. **Long-open tabs:** after sleep or a hidden tab, clocks must resync rather than drift. A DST transition while the page is open must change the offset, since offsets are recomputed on every tick and never cached. → Task 10 (`clock-runtime`).

---

## File map

```
astro.config.mjs  package.json  tsconfig.json  vitest.config.ts  playwright.config.ts  wrangler.jsonc  .gitignore
build/iife-plugin.mjs                 # Vite plugin: `?iife` import → minified IIFE string (esbuild)
scripts/build-data.ts                 # GeoNames → src/data/generated/*.json (manual: npm run data)
scripts/make-images.ts                # og/*.png, apple-touch-icon.png from SVG (sharp)
public/  favicon.svg  apple-touch-icon.png  og/*.png  _headers
src/
  i18n/en.ts, i18n/index.ts
  lib/build-time.ts
  lib/time/zone.ts, transitions.ts, format.ts, sun.ts, sky.ts
  data/generated/cities.json, countries.json
  data/abbreviations.ts, zone-labels.ts, popular.ts, aliases.ts, overrides.ts, catalog.ts
  lib/content/place.ts, timezone.ts, pair.ts, dst.ts, meeting.ts
  lib/seo/meta.ts, jsonld.ts
  lib/search/normalize.ts, match.ts, build-index.ts
  lib/prefs.ts
  scripts/clock-runtime.ts, theme-init.ts, ads.ts
  islands/converter/state.ts, timeline.ts, Converter.tsx, ZoneRow.tsx, Timeline.tsx
  islands/SearchBox.tsx
  components/Layout.astro, Header.astro, Footer.astro, Breadcrumbs.astro, SkyClockCard.astro,
             FactsList.astro, ConversionTable.astro, DifferenceTable.astro, Faq.astro,
             RelatedLinks.astro, AdSlot.astro, LinkGrid.astro
  styles/tokens.css, global.css
  pages/index.astro, time.astro, time/[slug].astro, timezone.astro, timezone/[slug].astro,
        convert.astro, convert/[pair].astro, daylight-saving-time.astro, about.astro,
        privacy.astro, terms.astro, contact.astro, 404.astro,
        search-index.json.ts, robots.txt.ts, ads.txt.ts
tests/unit/**   tests/dist/**   tests/e2e/**
.github/workflows/deploy.yml
```

---

### Task 1: Project scaffold + zone core

**Files:**
- Create: `package.json`, `astro.config.mjs`, `tsconfig.json`, `vitest.config.ts`, `.gitignore`, `src/pages/index.astro` (placeholder), `src/lib/build-time.ts`, `src/lib/time/zone.ts`
- Test: `tests/unit/time/zone.test.ts`

**Interfaces:**
- Produces:
  ```ts
  // src/lib/time/zone.ts
  export type ZoneRef = { kind: 'iana'; id: string } | { kind: 'fixed'; offsetMinutes: number; label: string };
  export interface WallTime { year: number; month: number; day: number; hour: number; minute: number; second?: number }
  export interface ZonedParts { year: number; month: number; day: number; hour: number; minute: number; second: number; weekday: number } // weekday 0=Sun
  export function iana(id: string): ZoneRef;
  export function fixed(offsetMinutes: number, label: string): ZoneRef;
  export function zoneKey(z: ZoneRef): string;            // 'Asia/Tokyo' | 'fixed:-300'
  export function zoneFromKey(key: string, label?: string): ZoneRef | null; // inverse; null if invalid
  export function isValidIana(id: string): boolean;
  export function offsetAt(z: ZoneRef, instant: number): number;
  export function zonedParts(z: ZoneRef, instant: number): ZonedParts;
  export function zonedToInstant(z: ZoneRef, wall: WallTime): number;
  // src/lib/build-time.ts
  export const BUILD_NOW: number;
  ```

- [ ] **Step 1: Scaffold the project.**
  - Run `npm init -y`, set `"type": "module"`, then install:
    - runtime: `npm i astro@^7.4.2 @astrojs/preact@^6.1.1 preact@^11.0.2 @preact/signals@^2.11.3 @astrojs/sitemap@^3.7.4`
    - dev: `npm i -D vitest@^5.0.5 typescript esbuild happy-dom node-html-parser fflate`
  - Scripts:
    - `dev: astro dev`, `build: astro build`, `preview: astro preview`
    - `test: vitest run tests/unit`, `test:dist: vitest run tests/dist`, `test:e2e: playwright test`
    - `data: node scripts/build-data.ts`
  - Config files:
    - `astro.config.mjs` per Global Constraints, with `integrations: [preact()]` (sitemap is added in Task 15).
    - `tsconfig.json` extends `astro/tsconfigs/strict`, with `jsxImportSource: "preact"`.
    - `.gitignore`: `node_modules`, `dist`, `.astro`, `test-results`, `playwright-report`, `.wrangler`, `.cache`.
  - Placeholder `src/pages/index.astro` renders `<h1>TimezoneHop</h1>`.
  - `BUILD_NOW = Number(process.env.BUILD_NOW) || Date.now()`.

- [ ] **Step 2: Write the failing test** — `tests/unit/time/zone.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { iana, fixed, offsetAt, zonedParts, zonedToInstant, zoneKey, zoneFromKey, isValidIana } from '../../../src/lib/time/zone';

const U = Date.UTC;
describe('offsetAt', () => {
  it('handles whole, half and quarter hour zones and DST', () => {
    expect(offsetAt(iana('Asia/Tokyo'), U(2026, 0, 15))).toBe(540);
    expect(offsetAt(iana('America/New_York'), U(2026, 0, 15))).toBe(-300);
    expect(offsetAt(iana('America/New_York'), U(2026, 6, 1))).toBe(-240);
    expect(offsetAt(iana('Asia/Kolkata'), U(2026, 6, 1))).toBe(330);
    expect(offsetAt(iana('Asia/Kathmandu'), U(2026, 6, 1))).toBe(345);
    expect(offsetAt(iana('Pacific/Chatham'), U(2026, 0, 15))).toBe(825);
    expect(offsetAt(iana('Pacific/Chatham'), U(2026, 6, 15))).toBe(765);
    expect(offsetAt(fixed(-300, 'EST'), U(2026, 6, 1))).toBe(-300);
  });
  it('flips exactly at the EU transition (2026-10-25 01:00Z)', () => {
    expect(offsetAt(iana('Europe/London'), U(2026, 9, 25, 0, 59))).toBe(60);
    expect(offsetAt(iana('Europe/London'), U(2026, 9, 25, 1, 0))).toBe(0);
  });
});
describe('zonedParts', () => {
  it('returns local wall clock parts', () => {
    expect(zonedParts(iana('Asia/Tokyo'), U(2026, 9, 25, 15, 30, 5)))
      .toEqual({ year: 2026, month: 10, day: 26, hour: 0, minute: 30, second: 5, weekday: 1 });
    expect(zonedParts(fixed(330, 'IST'), U(2026, 9, 25, 20, 0))).toMatchObject({ day: 26, hour: 1, minute: 30 });
  });
});
describe('zonedToInstant', () => {
  it('converts normal wall times', () => {
    expect(zonedToInstant(iana('Asia/Tokyo'), { year: 2026, month: 10, day: 25, hour: 9, minute: 0 })).toBe(U(2026, 9, 25, 0, 0));
    expect(zonedToInstant(fixed(-300, 'EST'), { year: 2026, month: 7, day: 1, hour: 12, minute: 0 })).toBe(U(2026, 6, 1, 17, 0));
  });
  it('moves nonexistent (gap) times forward', () => {
    // 2:30 AM on 2026-03-08 does not exist in New York -> 3:30 AM EDT
    expect(zonedToInstant(iana('America/New_York'), { year: 2026, month: 3, day: 8, hour: 2, minute: 30 })).toBe(U(2026, 2, 8, 7, 30));
  });
  it('picks the earlier instant for ambiguous (overlap) times', () => {
    // 1:30 AM on 2026-11-01 happens twice in New York -> first one (EDT)
    expect(zonedToInstant(iana('America/New_York'), { year: 2026, month: 11, day: 1, hour: 1, minute: 30 })).toBe(U(2026, 10, 1, 5, 30));
  });
});
describe('keys and validation', () => {
  it('round-trips keys and validates ids', () => {
    expect(zoneKey(iana('Asia/Tokyo'))).toBe('Asia/Tokyo');
    expect(zoneKey(fixed(-300, 'EST'))).toBe('fixed:-300');
    expect(zoneFromKey('fixed:-300', 'EST')).toEqual(fixed(-300, 'EST'));
    expect(zoneFromKey('Not/AZone')).toBeNull();
    expect(isValidIana('Asia/Calcutta')).toBe(true);
    expect(isValidIana('Mars/Olympus')).toBe(false);
    expect(isValidIana('')).toBe(false);
  });
});
```

- [ ] **Step 3: Run the test to verify it fails.** Run `npx vitest run tests/unit/time/zone.test.ts`. Expected: FAIL (module not found).

- [ ] **Step 4: Implement `src/lib/time/zone.ts`.**
  - Use one cached `Intl.DateTimeFormat('en-US', { timeZone: id, hourCycle: 'h23', year, month, day, hour, minute, second: 'numeric', weekday: 'short' })` per id, and read it via `formatToParts`.
  - `offsetAt` = (`Date.UTC(parts)` − instant floored to the second) / 60000.
  - Fixed zones shift the instant by the offset and read UTC fields.
  - `zonedToInstant` algorithm (the tests pin its behavior):

```text
guess = Date.UTC(wall)                       // as if the zone were UTC
oBefore = offsetAt(z, guess - 86_400_000); oAfter = offsetAt(z, guess + 86_400_000)
t1 = guess - oBefore*60000; t2 = guess - oAfter*60000
valid(t) = zonedParts(z, t) matches wall (y, m, d, h, min)
both valid  -> min(t1, t2)         // overlap: earlier instant
one valid   -> that one
none valid  -> t1                  // gap: interpret with pre-transition offset = moves forward
```

- [ ] **Step 5: Run the tests to verify they pass.** Run `npx vitest run tests/unit/time/zone.test.ts`. Expected: PASS. Also run `npm run build`; expected: builds `dist/index.html`.

- [ ] **Step 6: Commit.** `git add -A && git commit -m "feat: scaffold Astro project and timezone core"`

---

### Task 2: Transitions, zone labels, formatting

**Files:**
- Create: `src/lib/time/transitions.ts`, `src/lib/time/format.ts`, `src/data/zone-labels.ts`, `src/i18n/en.ts`, `src/i18n/index.ts`
- Test: `tests/unit/time/transitions.test.ts`, `tests/unit/time/format.test.ts`

**Interfaces:**
- Consumes: Task 1 `zone.ts`.
- Produces:
  ```ts
  // transitions.ts
  export interface Transition { instant: number; offsetBefore: number; offsetAfter: number }
  export function transitions(z: ZoneRef, year: number): Transition[];             // [Jan 1 00:00Z, next Jan 1 00:00Z)
  export function transitionsBetween(z: ZoneRef, from: number, to: number): Transition[];
  export function nextTransition(z: ZoneRef, from: number): Transition | null;     // searches 400 days
  export function observesDst(z: ZoneRef, year: number): boolean;                  // ≥ 2 transitions in year
  export function standardOffset(z: ZoneRef, year: number): number;                // min offset over the year
  // zone-labels.ts
  export const ZONE_LABELS: Record<string, { std: string; dst?: string }>;
  // format.ts
  export function formatTime(z: ZoneRef, instant: number, o: { hour12: boolean; seconds?: boolean }): string;
  export function formatDate(z: ZoneRef, instant: number, style: 'long' | 'short'): string;
  export function formatOffset(minutes: number): string;
  export function formatDifference(minutes: number): string;   // absolute value, e.g. '5 hours 30 minutes'
  export function zoneAbbreviation(z: ZoneRef, instant: number): string;
  export function zoneLongName(z: ZoneRef, instant: number): string;
  export function labelFromIana(id: string): string;           // 'America/Sao_Paulo' -> 'Sao Paulo'
  export function defaultHour12(): boolean;                    // from Intl resolvedOptions().hourCycle (h11/h12 -> true)
  // i18n
  export const en: { months: string[]; monthsShort: string[]; days: string[]; daysShort: string[]; [k: string]: unknown };
  export function t(key: string, vars?: Record<string, string | number>): string; // '{name}' placeholders
  ```

- [ ] **Step 1: Write the failing tests.**

```ts
// tests/unit/time/transitions.test.ts
import { describe, it, expect } from 'vitest';
import { iana, fixed } from '../../../src/lib/time/zone';
import { transitions, nextTransition, observesDst, standardOffset } from '../../../src/lib/time/transitions';
const U = Date.UTC;
describe('transitions', () => {
  it('finds 2026 DST changes to the minute', () => {
    expect(transitions(iana('America/New_York'), 2026)).toEqual([
      { instant: U(2026, 2, 8, 7), offsetBefore: -300, offsetAfter: -240 },
      { instant: U(2026, 10, 1, 6), offsetBefore: -240, offsetAfter: -300 },
    ]);
    expect(transitions(iana('Europe/London'), 2026).map(t => t.instant)).toEqual([U(2026, 2, 29, 1), U(2026, 9, 25, 1)]);
    expect(transitions(iana('Australia/Sydney'), 2026).map(t => t.instant)).toEqual([U(2026, 3, 4, 16), U(2026, 9, 3, 16)]);
    expect(transitions(iana('Asia/Tokyo'), 2026)).toEqual([]);
    expect(transitions(fixed(-300, 'EST'), 2026)).toEqual([]);
  });
  it('finds the next transition and DST facts', () => {
    expect(nextTransition(iana('America/New_York'), U(2026, 9, 25, 12))?.instant).toBe(U(2026, 10, 1, 6));
    expect(nextTransition(iana('Asia/Tokyo'), U(2026, 9, 25))).toBeNull();
    expect(observesDst(iana('Europe/Paris'), 2026)).toBe(true);
    expect(observesDst(iana('America/Phoenix'), 2026)).toBe(false);
    expect(standardOffset(iana('Europe/Paris'), 2026)).toBe(60);
  });
});
```

```ts
// tests/unit/time/format.test.ts
import { describe, it, expect } from 'vitest';
import { iana, fixed } from '../../../src/lib/time/zone';
import { formatTime, formatDate, formatOffset, formatDifference, zoneAbbreviation, zoneLongName, labelFromIana } from '../../../src/lib/time/format';
const U = Date.UTC; const tokyo = iana('Asia/Tokyo');
const at = U(2026, 9, 25, 14, 42, 7); // 23:42:07 in Tokyo, Sunday
describe('format', () => {
  it('formats time deterministically', () => {
    expect(formatTime(tokyo, at, { hour12: true, seconds: true })).toBe('11:42:07 PM');
    expect(formatTime(tokyo, at, { hour12: false, seconds: true })).toBe('23:42:07');
    expect(formatTime(tokyo, at, { hour12: true })).toBe('11:42 PM');
    expect(formatTime(tokyo, U(2026, 9, 24, 15), { hour12: true })).toBe('12:00 AM');
    expect(formatTime(tokyo, U(2026, 9, 25, 3), { hour12: true })).toBe('12:00 PM');
    expect(formatTime(tokyo, U(2026, 9, 25, 3), { hour12: false })).toBe('12:00');
  });
  it('formats dates', () => {
    expect(formatDate(tokyo, at, 'long')).toBe('Sunday, October 25, 2026');
    expect(formatDate(tokyo, at, 'short')).toBe('Sun, Oct 25');
  });
  it('formats offsets and differences', () => {
    expect(formatOffset(540)).toBe('UTC+9');
    expect(formatOffset(-300)).toBe('UTC\u22125');
    expect(formatOffset(330)).toBe('UTC+5:30');
    expect(formatOffset(-570)).toBe('UTC\u22129:30');
    expect(formatOffset(0)).toBe('UTC');
    expect(formatDifference(300)).toBe('5 hours');
    expect(formatDifference(-60)).toBe('1 hour');
    expect(formatDifference(30)).toBe('30 minutes');
    expect(formatDifference(330)).toBe('5 hours 30 minutes');
    expect(formatDifference(0)).toBe('0 hours');
  });
  it('labels zones', () => {
    expect(zoneAbbreviation(iana('America/New_York'), U(2026, 6, 1))).toBe('EDT');
    expect(zoneAbbreviation(iana('America/New_York'), U(2026, 0, 1))).toBe('EST');
    expect(zoneAbbreviation(iana('Europe/London'), U(2026, 6, 1))).toBe('BST');
    expect(zoneAbbreviation(iana('Europe/London'), U(2026, 0, 1))).toBe('GMT');
    expect(zoneAbbreviation(iana('Europe/Paris'), U(2026, 6, 1))).toBe('CEST');
    expect(zoneAbbreviation(tokyo, at)).toBe('JST');
    expect(zoneAbbreviation(iana('Asia/Kolkata'), at)).toBe('IST');
    expect(zoneAbbreviation(iana('Australia/Sydney'), U(2026, 0, 1))).toBe('AEDT');
    expect(zoneAbbreviation(iana('Asia/Tashkent'), at)).toBe('UTC+5');   // no label -> offset
    expect(zoneAbbreviation(fixed(-300, 'EST'), at)).toBe('EST');
    expect(zoneLongName(tokyo, at)).toBe('Japan Standard Time');
    expect(zoneLongName(iana('America/New_York'), U(2026, 6, 1))).toBe('Eastern Daylight Time');
    expect(labelFromIana('America/Sao_Paulo')).toBe('Sao Paulo');
    expect(labelFromIana('America/Argentina/Buenos_Aires')).toBe('Buenos Aires');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail.** Run `npx vitest run tests/unit/time`. Expected: FAIL (modules missing).

- [ ] **Step 3: Implement.**
  - **transitions:**
    - Sample `offsetAt` every 24 h across the range. Where two samples differ, bisect to minute precision; the transition instant is the first minute with the new offset.
    - Memoize per `zoneKey|year`.
  - **format:**
    - Build strings by hand from `zonedParts` plus the month/day names in `en.ts`. Never use Intl's formatted output: ICU inserts U+202F before AM/PM, which makes output differ between Node and browsers.
    - `zoneAbbreviation`: use the `ZONE_LABELS` entry (DST label when `offsetAt > standardOffset` for that year), else `formatOffset`.
    - `zoneLongName`: `Intl` `timeZoneName: 'long'` in `en-US`. If the result starts with `GMT`, return `formatOffset` instead. Fixed zones return their `formatOffset`.
  - **zone-labels:** must cover the `representativeTz` of every abbreviation (Task 4 table; Task 4's test enforces this) plus the zones of all popular places. Zones without a label fall back to `UTC+X`.

- [ ] **Step 4: Run the tests to verify they pass.** Run `npx vitest run tests/unit/time`. Expected: PASS.

- [ ] **Step 5: Commit.** `git commit -am "feat: DST transitions, formatting, zone labels"` (after `git add` of the new files).

---

### Task 3: Sun times + sky phases

**Files:**
- Create: `src/lib/time/sun.ts`, `src/lib/time/sky.ts`
- Test: `tests/unit/time/sun.test.ts`, `tests/unit/time/sky.test.ts`

**Interfaces:**
- Produces:
  ```ts
  // sun.ts — NOAA solar algorithm, zenith 90.833°
  export type SunTimes = { kind: 'normal'; sunrise: number; sunset: number } | { kind: 'polar-day' } | { kind: 'polar-night' };
  export function sunTimes(lat: number, lon: number, date: { year: number; month: number; day: number }): SunTimes; // date = local calendar date
  // sky.ts
  export type SkyPhase = 'night' | 'dawn' | 'day' | 'dusk' | 'evening';
  export type SunMinutes = { rise: number; set: number } | 'polar-day' | 'polar-night'; // local minutes-of-day
  export function skyPhase(localMinutes: number, sun?: SunMinutes): SkyPhase; // default sun = { rise: 360, set: 1080 }
  export const SKY: Record<SkyPhase, { from: string; to: string; ink: 'light' | 'dark' }>; // hex colors
  export const INK = { light: '#ffffff', dark: '#0b1220' } as const;
  export function skyStrip(phases: SkyPhase[]): string; // CSS linear-gradient(90deg, …) with one stop per phase
  ```
- Phase windows relative to the sun: dawn `[rise−60, rise+60)`, day `[rise+60, set−60)`, dusk `[set−60, set+60)`, evening `[set+60, set+180)`, otherwise night. All windows wrap modulo 1440.

- [ ] **Step 1: Write the failing tests.**

```ts
// tests/unit/time/sun.test.ts
import { describe, it, expect } from 'vitest';
import { sunTimes } from '../../../src/lib/time/sun';
const U = Date.UTC; const MIN = 60_000;
const near = (a: number, b: number) => expect(Math.abs(a - b)).toBeLessThanOrEqual(3 * MIN);
describe('sunTimes', () => {
  it('London solstice', () => {
    const s = sunTimes(51.5074, -0.1278, { year: 2026, month: 6, day: 21 });
    if (s.kind !== 'normal') throw new Error('expected normal');
    near(s.sunrise, U(2026, 5, 21, 3, 43)); near(s.sunset, U(2026, 5, 21, 20, 21));
  });
  it('Sydney winter solstice (local date)', () => {
    const s = sunTimes(-33.8688, 151.2093, { year: 2026, month: 6, day: 21 });
    if (s.kind !== 'normal') throw new Error('expected normal');
    near(s.sunrise, U(2026, 5, 20, 21, 0)); near(s.sunset, U(2026, 5, 21, 6, 54));
  });
  it('polar day and night in Tromsø', () => {
    expect(sunTimes(69.6492, 18.9553, { year: 2026, month: 6, day: 21 }).kind).toBe('polar-day');
    expect(sunTimes(69.6492, 18.9553, { year: 2026, month: 12, day: 21 }).kind).toBe('polar-night');
  });
});
```

```ts
// tests/unit/time/sky.test.ts
import { describe, it, expect } from 'vitest';
import { skyPhase, SKY, INK } from '../../../src/lib/time/sky';
function lum(hex: string) { const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; }
const contrast = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
describe('skyPhase', () => {
  it('default hour-based phases', () => {
    expect([0, 300, 360, 420, 1019, 1020, 1140, 1260].map(m => skyPhase(m)))
      .toEqual(['night', 'dawn', 'dawn', 'day', 'day', 'dusk', 'evening', 'night']);
  });
  it('sun-based phases wrap past midnight', () => {
    const sun = { rise: 240, set: 1320 };
    expect(skyPhase(210, sun)).toBe('dawn');
    expect(skyPhase(30, sun)).toBe('evening');
    expect(skyPhase(90, sun)).toBe('night');
    expect(skyPhase(30, 'polar-day')).toBe('day');
    expect(skyPhase(720, 'polar-night')).toBe('night');
  });
  it('every sky has AA contrast for its ink', () => {
    for (const s of Object.values(SKY)) {
      expect(contrast(INK[s.ink], s.from)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(INK[s.ink], s.to)).toBeGreaterThanOrEqual(4.5);
    }
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail.** Run `npx vitest run tests/unit/time/sun.test.ts tests/unit/time/sky.test.ts`. Expected: FAIL.

- [ ] **Step 3: Implement `sun.ts` (standard NOAA sunrise equation, ≈80 lines) and `sky.ts`.**
  - Sky colors: night `#0f1a3d → #23306b` (light ink), dawn `#f6b8a8 → #fde3c4` (dark), day `#5fb4ee → #a9dcff` (dark), dusk `#f59e5b → #b4639e` (dark), evening `#3a3f8f → #6a4c93` (light).
  - Adjust a hex if the contrast test fails.

- [ ] **Step 4: Run the tests to verify they pass.** Expected: PASS.

- [ ] **Step 5: Commit.** `git add -A && git commit -m "feat: sunrise/sunset and sky phases"`

---

### Task 4: Data pipeline + curated data

**Files:**
- Create: `scripts/build-data.ts`, `src/data/generated/cities.json`, `src/data/generated/countries.json`, `src/data/abbreviations.ts`, `src/data/popular.ts`, `src/data/overrides.ts`, `src/data/aliases.ts`
- Test: `tests/unit/data/data.test.ts`

**Interfaces:**
- Produces:
  ```ts
  // generated JSON shapes (types exported from src/data/types.ts)
  export interface RawCity { id: number; name: string; ascii: string; cc: string; admin1: string; lat: number; lon: number; pop: number; tz: string; capital: boolean }
  export interface RawCountry { cc: string; name: string; continent: string; pop: number; capitalId: number | null;
                                zones: { tz: string; pop: number; cities: string[] }[] }   // zones sorted by pop desc; cities = top 3 names
  // abbreviations.ts
  export interface Abbreviation { slug: string; abbr: string; name: string; offsetMinutes: number; isDaylight: boolean;
                                  sibling?: string; representative?: { name: string; cc: string }; representativeTz?: string; note?: string; usedIn: string[] }
  export const ABBREVIATIONS: Abbreviation[];
  // popular.ts — places identified by GeoNames ASCII name + ISO country code
  export type PlaceRef = { name: string; cc: string };
  export const POPULAR_PLACES: PlaceRef[];        // exactly 60, in this order (pairs + hub order)
  export const TOP_ABBREVIATIONS: string[];       // exactly 30 slugs
  export const HOME_GRID: PlaceRef[];             // 12
  export const REFERENCE_PLACES: PlaceRef[];      // 8, + FALLBACK_REFERENCE (Paris)
  export const FALLBACK_REFERENCE: PlaceRef;
  export const CITY_STATES: string[];             // ['SG','HK','MO','MC','VA','GI']
  export const ADMIN1_SUFFIX_COUNTRIES: string[]; // ['US','CA','AU','BR','MX','IN','RU','CN','DE']
  // overrides.ts
  export const CITY_OVERRIDES: Record<string, { name: string; slug: string }>; // key `${cc}:${ascii}`
  export const COUNTRY_SLUG_OVERRIDES: Record<string, string>;                // { US: 'usa', GB: 'uk', AE: 'uae' }
  // aliases.ts
  export const ALIASES: Record<string, string[]>; // url path -> extra search terms
  export function mustIncludePlaces(): PlaceRef[]; // POPULAR ∪ HOME_GRID ∪ REFERENCE ∪ FALLBACK ∪ abbreviation representatives (in popular.ts)
  ```

**Curated values:**
- `POPULAR_PLACES` (GeoNames ASCII names):
  - New York City/US, Los Angeles/US, Chicago/US, Houston/US, Denver/US, Phoenix/US, San Francisco/US, Seattle/US, Miami/US, Honolulu/US
  - Toronto/CA, Vancouver/CA, Mexico City/MX, Sao Paulo/BR, Buenos Aires/AR, Bogota/CO, Lima/PE, Santiago/CL
  - London/GB, Dublin/IE, Lisbon/PT, Paris/FR, Berlin/DE, Madrid/ES, Rome/IT, Amsterdam/NL, Zurich/CH, Stockholm/SE, Warsaw/PL, Athens/GR, Istanbul/TR, Moscow/RU, Kyiv/UA
  - Cairo/EG, Lagos/NG, Nairobi/KE, Johannesburg/ZA, Casablanca/MA
  - Dubai/AE, Riyadh/SA, Tel Aviv/IL, Tehran/IR, Karachi/PK, Mumbai/IN, New Delhi/IN, Bengaluru/IN, Dhaka/BD
  - Bangkok/TH, Jakarta/ID, Singapore/SG, Hong Kong/HK, Shanghai/CN, Beijing/CN, Manila/PH, Seoul/KR, Tokyo/JP
  - Perth/AU, Sydney/AU, Melbourne/AU, Auckland/NZ
- `TOP_ABBREVIATIONS`: utc, gmt, est, edt, cst, cdt, mst, mdt, pst, pdt, akst, hst, ast, bst, cet, cest, eet, eest, msk, gst, pkt, ist, ict, sgt, hkt, jst, kst, aest, aedt, nzst.
- `HOME_GRID`: New York City, Los Angeles, Toronto, Sao Paulo, London, Paris, Dubai, Mumbai, Singapore, Hong Kong, Tokyo, Sydney.
- `REFERENCE_PLACES`: London, New York City, Los Angeles, Dubai, New Delhi, Singapore, Tokyo, Sydney. `FALLBACK_REFERENCE`: Paris/FR.
- `CITY_OVERRIDES`: `US:New York City → { name: 'New York', slug: 'new-york' }`, `US:Washington → { name: 'Washington, D.C.', slug: 'washington-dc' }`.
- `ABBREVIATIONS` (48 rows; columns: slug | name | offset | daylight | sibling | representative | representativeTz | note):

| slug | name | off | dst | sib | rep | tz | note |
|---|---|---|---|---|---|---|---|
| utc | Coordinated Universal Time | 0 | n | – | – | – | |
| gmt | Greenwich Mean Time | 0 | n | bst | London/GB | Europe/London | |
| bst | British Summer Time | 60 | y | gmt | London/GB | Europe/London | Bangladesh Standard Time (UTC+6) also uses BST |
| wet / west | Western European (Summer) Time | 0 / 60 | n / y | each other | Lisbon/PT | Europe/Lisbon | |
| cet / cest | Central European (Summer) Time | 60 / 120 | n / y | each other | Paris/FR | Europe/Paris | |
| eet / eest | Eastern European (Summer) Time | 120 / 180 | n / y | each other | Athens/GR | Europe/Athens | |
| msk | Moscow Standard Time | 180 | n | – | Moscow/RU | Europe/Moscow | |
| est / edt | Eastern Standard/Daylight Time | −300 / −240 | n / y | each other | New York City/US | America/New_York | |
| cst / cdt | Central Standard/Daylight Time | −360 / −300 | n / y | each other | Chicago/US | America/Chicago | cst: China Standard Time (UTC+8) and Cuba Standard Time also use CST |
| mst / mdt | Mountain Standard/Daylight Time | −420 / −360 | n / y | each other | Denver/US | America/Denver | mst: Arizona uses MST all year |
| pst / pdt | Pacific Standard/Daylight Time | −480 / −420 | n / y | each other | Los Angeles/US | America/Los_Angeles | pst: Philippine Standard Time (UTC+8) is also written PST |
| akst / akdt | Alaska Standard/Daylight Time | −540 / −480 | n / y | each other | Anchorage/US | America/Anchorage | |
| hst | Hawaii-Aleutian Standard Time | −600 | n | – | Honolulu/US | Pacific/Honolulu | |
| ast / adt | Atlantic Standard/Daylight Time | −240 / −180 | n / y | each other | Halifax/CA | America/Halifax | ast: Arabia Standard Time (UTC+3) also uses AST |
| nst | Newfoundland Standard Time | −210 | n | – | St. John's/CA | America/St_Johns | |
| brt | Brasília Time | −180 | n | – | Sao Paulo/BR | America/Sao_Paulo | |
| art | Argentina Time | −180 | n | – | Buenos Aires/AR | America/Argentina/Buenos_Aires | |
| wat | West Africa Time | 60 | n | – | Lagos/NG | Africa/Lagos | |
| cat | Central Africa Time | 120 | n | – | Harare/ZW | Africa/Harare | |
| sast | South Africa Standard Time | 120 | n | – | Johannesburg/ZA | Africa/Johannesburg | |
| eat | East Africa Time | 180 | n | – | Nairobi/KE | Africa/Nairobi | |
| gst | Gulf Standard Time | 240 | n | – | Dubai/AE | Asia/Dubai | |
| pkt | Pakistan Standard Time | 300 | n | – | Karachi/PK | Asia/Karachi | |
| ist | India Standard Time | 330 | n | – | New Delhi/IN | Asia/Kolkata | Israel Standard Time (UTC+2) and Irish Standard Time (UTC+1) also use IST |
| npt | Nepal Time | 345 | n | – | Kathmandu/NP | Asia/Kathmandu | |
| ict | Indochina Time | 420 | n | – | Bangkok/TH | Asia/Bangkok | |
| wib | Western Indonesia Time | 420 | n | – | Jakarta/ID | Asia/Jakarta | |
| sgt | Singapore Time | 480 | n | – | Singapore/SG | Asia/Singapore | |
| hkt | Hong Kong Time | 480 | n | – | Hong Kong/HK | Asia/Hong_Kong | |
| pht | Philippine Time | 480 | n | – | Manila/PH | Asia/Manila | |
| awst | Australian Western Standard Time | 480 | n | – | Perth/AU | Australia/Perth | |
| jst | Japan Standard Time | 540 | n | – | Tokyo/JP | Asia/Tokyo | |
| kst | Korea Standard Time | 540 | n | – | Seoul/KR | Asia/Seoul | |
| acst / acdt | Australian Central Standard/Daylight Time | 570 / 630 | n / y | each other | Adelaide/AU | Australia/Adelaide | |
| aest / aedt | Australian Eastern Standard/Daylight Time | 600 / 660 | n / y | each other | Sydney/AU | Australia/Sydney | |
| nzst / nzdt | New Zealand Standard/Daylight Time | 720 / 780 | n / y | each other | Auckland/NZ | Pacific/Auckland | |

- **`build-data.ts` selection rules:**
  - Download `https://download.geonames.org/export/dump/{cities15000.zip,countryInfo.txt,admin1CodesASCII.txt}`; unzip with `fflate`.
  - Select every `PPLC` city, plus every `mustIncludePlaces()` entry (matched case-insensitively on ASCII name + cc; the most populous match wins), plus the largest city of any country that has no `PPLC`, plus the most populous remaining cities until the total reaches 1,000.
  - Countries are kept only if at least one city of theirs is selected. `zones` aggregate **all** cities15000 rows of that country.
  - Exit non-zero, printing the list, if any must-include place isn't found.

- [ ] **Step 1: Write the failing test.**

```ts
// tests/unit/data/data.test.ts
import { describe, it, expect } from 'vitest';
import cities from '../../../src/data/generated/cities.json';
import countries from '../../../src/data/generated/countries.json';
import { ABBREVIATIONS } from '../../../src/data/abbreviations';
import { POPULAR_PLACES, TOP_ABBREVIATIONS, HOME_GRID, REFERENCE_PLACES } from '../../../src/data/popular';
import { ZONE_LABELS } from '../../../src/data/zone-labels';
import { isValidIana } from '../../../src/lib/time/zone';
describe('generated data', () => {
  it('has ~1000 cities with valid zones and every country a city', () => {
    expect(cities.length).toBeGreaterThanOrEqual(1000); expect(cities.length).toBeLessThanOrEqual(1100);
    for (const c of cities) expect(isValidIana(c.tz), c.tz).toBe(true);
    const ccs = new Set(cities.map(c => c.cc));
    for (const k of countries) expect(ccs.has(k.cc), k.cc).toBe(true);
    expect(countries.length).toBeGreaterThanOrEqual(200);
  });
  it('contains every must-include place', () => {
    const has = (p: { name: string; cc: string }) => cities.some(c => c.ascii.toLowerCase() === p.name.toLowerCase() && c.cc === p.cc);
    for (const p of [...POPULAR_PLACES, ...HOME_GRID, ...REFERENCE_PLACES]) expect(has(p), p.name).toBe(true);
    for (const a of ABBREVIATIONS) if (a.representative) expect(has(a.representative), a.slug).toBe(true);
  });
});
describe('curated data', () => {
  it('has the agreed sizes and valid references', () => {
    expect(POPULAR_PLACES).toHaveLength(60);
    expect(TOP_ABBREVIATIONS).toHaveLength(30);
    expect(ABBREVIATIONS).toHaveLength(48);
    const slugs = new Set(ABBREVIATIONS.map(a => a.slug));
    expect(slugs.size).toBe(48);
    for (const s of TOP_ABBREVIATIONS) expect(slugs.has(s), s).toBe(true);
    for (const a of ABBREVIATIONS) {
      if (a.sibling) expect(slugs.has(a.sibling), a.slug).toBe(true);
      if (a.representativeTz) { expect(isValidIana(a.representativeTz)).toBe(true); expect(ZONE_LABELS[a.representativeTz], a.representativeTz).toBeDefined(); }
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails.** Run `npx vitest run tests/unit/data`. Expected: FAIL (missing modules/JSON).

- [ ] **Step 3: Write the curated files and `scripts/build-data.ts`, then run `npm run data`.** Expected: prints counts and writes both JSON files.

- [ ] **Step 4: Run the test to verify it passes.** Run `npx vitest run tests/unit/data`. Expected: PASS. Add missing `ZONE_LABELS` entries if the label assertions fail.

- [ ] **Step 5: Commit.** `git add -A && git commit -m "feat: GeoNames data pipeline and curated timezone data"`

---

### Task 5: Catalogue (entities, slugs, pairs)

**Files:**
- Create: `src/data/catalog.ts`
- Test: `tests/unit/data/catalog.test.ts`

**Interfaces:**
- Consumes: Task 4 data, Task 1 `ZoneRef`/`iana`/`fixed`, Task 2 `transitions`.
- Produces:
  ```ts
  export interface City { kind: 'city'; id: number; slug: string; name: string; qualifiedName: string; // 'Hyderabad, Pakistan'
    cc: string; countrySlug: string; countryName: string; admin1: string; lat: number; lon: number; population: number; tz: string; capital: boolean }
  export interface Country { kind: 'country'; cc: string; slug: string; name: string; continent: string; population: number;
    capital: City | null; zones: { tz: string; cities: { name: string; slug?: string }[] }[]; singleZone: boolean;
    lat: number | null; lon: number | null }   // capital's (or merged city-state's) coordinates
  export interface AbbrZone { kind: 'abbr'; slug: string; data: Abbreviation }
  export interface OffsetZone { kind: 'offset'; slug: string; offsetMinutes: number; label: string }
  export type Place = City | Country;
  export type PairEnd = City | Country | AbbrZone;
  export interface Pair { slug: string; from: PairEnd; to: PairEnd; kind: 'abbr' | 'place' }
  export interface Catalog { cities: City[]; countries: Country[]; abbreviations: AbbrZone[]; offsets: OffsetZone[]; pairs: Pair[];
    time: Map<string, Place>; timezone: Map<string, AbbrZone | OffsetZone>; convert: Map<string, Pair>;
    popular: Place[]; homeGrid: Place[]; references: Place[]; fallbackReference: Place }
  export function getCatalog(): Catalog;                    // memoized
  export function slugify(s: string): string;               // strip diacritics + apostrophes, lowercase, non-alnum runs -> '-'
  export function zoneOf(e: Place | AbbrZone | OffsetZone): ZoneRef; // country -> capital tz, else zones[0].tz
  export function nameOf(e: Place | AbbrZone | OffsetZone): string;  // 'Tokyo' | 'Japan' | 'EST' | 'UTC+5:30'
  export function urlOf(e: Place | AbbrZone | OffsetZone | Pair): string; // '/time/tokyo', '/timezone/est', '/convert/est-to-pst'
  export function placeByRef(ref: PlaceRef): Place;         // throws if unresolved; city-states resolve to the country
  export function sameZoneCities(c: City, limit: number): City[];       // same tz, pop desc, excluding c
  export function citiesInCountry(cc: string, limit?: number): City[];  // pop desc
  export function pairsFrom(e: PairEnd): Pair[];            // all outgoing pairs, in POPULAR / TOP order
  export function pairFor(a: PairEnd, b: PairEnd): Pair | undefined;
  export function cityEquivalent(p: Pair): Pair | undefined; // abbr pair -> pair of the two representatives' places
  ```
- **Slug rules** (from the spec):
  - Country slugs win. A colliding city gets `-city` (`luxembourg-city`).
  - A `CITY_STATES` city becomes part of its country and has no city page.
  - In city-vs-city collisions the most populous city keeps the bare slug. Others get `-{slugify(admin1)}` if the country is in `ADMIN1_SUFFIX_COUNTRIES`, else `-{countrySlug}`, and their `qualifiedName` includes that qualifier.
  - `CITY_OVERRIDES` apply first.
- **Offsets:** every distinct non-zero offset that any catalogued city's zone has during the build year (both standard and DST), together with every whole hour from −12 to +14 except 0. Slugs: `utc-plus-5-30`, `utc-minus-3-30`, `utc-plus-14`.
- **Pairs:** ordered pairs within `TOP_ABBREVIATIONS` (870), then ordered pairs within `popular` (3,540). Slug `${from.slug}-to-${to.slug}`.

- [ ] **Step 1: Write the failing test.**

```ts
// tests/unit/data/catalog.test.ts
import { describe, it, expect } from 'vitest';
import { getCatalog, slugify, urlOf, cityEquivalent, pairsFrom, placeByRef, zoneOf } from '../../../src/data/catalog';
import { zoneKey } from '../../../src/lib/time/zone';
const cat = getCatalog();
describe('catalog', () => {
  it('slugifies', () => {
    expect(slugify("St. John's")).toBe('st-johns');
    expect(slugify('São Paulo')).toBe('sao-paulo');
    expect(slugify('  Zürich ')).toBe('zurich');
  });
  it('applies slug rules', () => {
    expect(cat.time.get('tokyo')?.kind).toBe('city');
    expect(cat.time.get('japan')?.kind).toBe('country');
    expect(cat.time.get('usa')?.kind).toBe('country');
    expect(cat.time.get('new-york')?.kind).toBe('city');
    expect(cat.time.get('singapore')?.kind).toBe('country');
    expect(cat.time.get('luxembourg-city')?.kind).toBe('city');
    const hyd = cat.time.get('hyderabad'); expect(hyd?.kind === 'city' && hyd.cc).toBe('IN');
    const hydPk = cat.time.get('hyderabad-pakistan'); expect(hydPk?.kind === 'city' && hydPk.qualifiedName).toBe('Hyderabad, Pakistan');
    expect(placeByRef({ name: 'Singapore', cc: 'SG' }).kind).toBe('country');
  });
  it('has unique slugs and the agreed pair counts', () => {
    const timeSlugs = [...cat.cities.map(c => c.slug), ...cat.countries.map(c => c.slug)];
    expect(new Set(timeSlugs).size).toBe(timeSlugs.length);
    expect(cat.pairs.filter(p => p.kind === 'abbr')).toHaveLength(870);
    expect(cat.pairs.filter(p => p.kind === 'place')).toHaveLength(3540);
    expect(new Set(cat.pairs.map(p => p.slug)).size).toBe(4410);
    for (const s of ['est-to-pst', 'pst-to-est', 'new-york-to-london', 'london-to-new-york', 'singapore-to-tokyo'])
      expect(cat.convert.has(s), s).toBe(true);
    expect(cat.convert.has('tokyo-to-tokyo')).toBe(false);
  });
  it('builds offsets without zero', () => {
    const slugs = cat.offsets.map(o => o.slug);
    expect(slugs).toContain('utc-plus-5-30'); expect(slugs).toContain('utc-plus-5-45');
    expect(slugs).toContain('utc-minus-3-30'); expect(slugs).toContain('utc-plus-14');
    expect(cat.offsets.some(o => o.offsetMinutes === 0)).toBe(false);
    expect(cat.timezone.get('utc')?.kind).toBe('abbr');
  });
  it('links pairs, urls and zones', () => {
    const est = cat.timezone.get('est')!; expect(urlOf(est)).toBe('/timezone/est');
    expect(cityEquivalent(cat.convert.get('est-to-ist')!)?.slug).toBe('new-york-to-new-delhi');
    expect(pairsFrom(cat.time.get('tokyo')! as any)).toHaveLength(59);
    expect(zoneKey(zoneOf(cat.time.get('usa')!))).toBe('America/New_York');
    expect(cat.popular).toHaveLength(60); expect(cat.homeGrid).toHaveLength(12);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails.** Run `npx vitest run tests/unit/data/catalog.test.ts`. Expected: FAIL.

- [ ] **Step 3: Implement `src/data/catalog.ts` per the rules above.**
  - The USA's capital is Washington, D.C., which is why `zoneOf(usa)` is New York's zone.
  - `getCatalog()` throws a descriptive error on duplicate slugs, an invalid IANA id, or an unresolvable `PlaceRef`. This is the "build fails on bad data" rule from spec §5.

- [ ] **Step 4: Run the test to verify it passes.** Expected: PASS.

- [ ] **Step 5: Commit.** `git add -A && git commit -m "feat: page catalogue with slugs, offsets and pairs"`

---

### Task 6: Content — place and timezone pages

**Files:**
- Create: `src/lib/content/place.ts`, `src/lib/content/timezone.ts`
- Test: `tests/unit/content/place.test.ts`, `tests/unit/content/timezone.test.ts`

**Interfaces:**
- Consumes: catalogue (Task 5), time lib (Tasks 1–3).
- Produces:
  ```ts
  export interface DstInfo { observes: boolean; inDstNow: boolean;
    next: { instant: number; deltaMinutes: number; localDate: string; localTime: string } | null } // localDate 'Sun, Nov 1, 2026'
  export interface Difference { place: Place; diffMinutes: number; text: string } // 'London is 9 hours behind'
  export interface Faq { q: string; a: string }
  export interface PlaceView { h1: string; zone: ZoneRef; tzId: string; abbreviation: string; longName: string;
    offsetMinutes: number; offsetLabel: string; dst: DstInfo; sun: SunTimes | null; sunDate: string | null;
    coords: { lat: number; lon: number } | null; population: number; differences: Difference[]; faq: Faq[] }
  export function cityView(c: City, now: number): PlaceView;
  export interface CountryView extends PlaceView { zones: { tz: string; abbreviation: string; offsetLabel: string; cities: { name: string; slug?: string }[] }[]; multiZone: boolean }
  export function countryView(c: Country, now: number): CountryView;
  export interface AbbrView { h1: string; zone: ZoneRef; offsetLabel: string; definition: string; usedIn: string[];
    sibling?: AbbrZone; inEffectNote: string | null; note: string | null; pairs: Pair[] }
  export function abbrView(a: AbbrZone, now: number): AbbrView;
  export interface OffsetView { h1: string; zone: ZoneRef; offsetLabel: string; citiesNow: City[]; abbreviations: AbbrZone[] }
  export function offsetView(o: OffsetZone, now: number): OffsetView;
  ```
- **Copy** (templates in `en.ts`):
  - `DstInfo.next.localDate`/`localTime` are the wall clock **just before** the change, computed with `offsetBefore`. This gives "2:00 AM" for both US changes, matching how clock changes are announced.
  - Non-DST facts line: `{name} does not observe daylight saving time.`
  - City h1: `Current time in {qualifiedName}, {countryName}`. Country h1: `Current time in {name}`.
  - Differences use `REFERENCE_PLACES`, with `FALLBACK_REFERENCE` replacing the page's own place.
  - `inEffectNote` cases:
    - Representative's current offset equals the abbreviation's: `{rep} currently uses {ABBR}.`
    - Representative is on the sibling: `Most places that use {ABBR} are currently on {SIB} ({sibOffset}) until {date}. {rep} is currently {offset}.`
    - No representative: `null`.

- [ ] **Step 1: Write the failing tests** (`NOW = Date.UTC(2026, 9, 25, 12)`).

```ts
// tests/unit/content/place.test.ts
import { describe, it, expect } from 'vitest';
import { getCatalog } from '../../../src/data/catalog';
import { cityView, countryView } from '../../../src/lib/content/place';
const NOW = Date.UTC(2026, 9, 25, 12); const cat = getCatalog();
const city = (s: string) => cat.time.get(s) as any;
describe('cityView', () => {
  it('Tokyo has no DST', () => {
    const v = cityView(city('tokyo'), NOW);
    expect(v.h1).toBe('Current time in Tokyo, Japan');
    expect(v).toMatchObject({ offsetMinutes: 540, offsetLabel: 'UTC+9', abbreviation: 'JST', tzId: 'Asia/Tokyo' });
    expect(v.dst.observes).toBe(false); expect(v.dst.next).toBeNull();
    expect(v.differences).toHaveLength(8);
    expect(v.differences.some(d => d.place.slug === 'tokyo')).toBe(false);
    expect(v.faq.length).toBeGreaterThanOrEqual(3);
  });
  it('New York knows its next change', () => {
    const v = cityView(city('new-york'), NOW);
    expect(v.dst).toMatchObject({ observes: true, inDstNow: true });
    expect(v.dst.next).toMatchObject({ instant: Date.UTC(2026, 10, 1, 6), deltaMinutes: -60, localDate: 'Sun, Nov 1, 2026', localTime: '2:00 AM' });
    expect(v.sun?.kind).toBe('normal');
  });
});
describe('countryView', () => {
  it('USA is multi-zone, Japan is not', () => {
    expect(countryView(city('usa'), NOW).multiZone).toBe(true);
    expect(countryView(city('usa'), NOW).zones.length).toBeGreaterThanOrEqual(4);
    expect(countryView(city('japan'), NOW).multiZone).toBe(false);
  });
});
```

```ts
// tests/unit/content/timezone.test.ts
import { describe, it, expect } from 'vitest';
import { getCatalog } from '../../../src/data/catalog';
import { abbrView, offsetView } from '../../../src/lib/content/timezone';
const NOW = Date.UTC(2026, 9, 25, 12); const cat = getCatalog();
describe('abbrView', () => {
  it('EST explains that New York is on EDT now', () => {
    const v = abbrView(cat.timezone.get('est') as any, NOW);
    expect(v.h1).toBe('EST \u2014 Eastern Standard Time (UTC\u22125)');
    expect(v.inEffectNote).toContain('EDT');
    expect(v.inEffectNote).toContain('Nov 1, 2026');
    expect(v.pairs).toHaveLength(29);
  });
  it('JST has no DST note and IST carries its ambiguity note', () => {
    expect(abbrView(cat.timezone.get('jst') as any, NOW).inEffectNote).toBe('Tokyo currently uses JST.');
    expect(abbrView(cat.timezone.get('ist') as any, NOW).note).toContain('Israel');
  });
});
describe('offsetView', () => {
  it('lists cities at UTC+5:30 now', () => {
    const v = offsetView(cat.timezone.get('utc-plus-5-30') as any, NOW);
    expect(v.citiesNow.some(c => c.slug === 'mumbai')).toBe(true);
    expect(v.abbreviations.map(a => a.slug)).toContain('ist');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail.** Run `npx vitest run tests/unit/content`. Expected: FAIL.

- [ ] **Step 3: Implement both modules.**
  - Sun uses the city's local date at `now` (country: capital coordinates; null when there are none).
  - FAQ: the 3 questions from the spec, with answers computed from the view.

- [ ] **Step 4: Run the tests to verify they pass.** Expected: PASS.

- [ ] **Step 5: Commit.** `git add -A && git commit -m "feat: place and timezone page content"`

---

### Task 7: Content — pairs, meeting window, DST table

**Files:**
- Create: `src/lib/content/meeting.ts`, `src/lib/content/pair.ts`, `src/lib/content/dst.ts`
- Test: `tests/unit/content/meeting.test.ts`, `tests/unit/content/pair.test.ts`, `tests/unit/content/dst.test.ts`

**Interfaces:**
- Produces:
  ```ts
  // meeting.ts — d = offset(to) - offset(from), in minutes
  export type MeetingWindow =
    | { kind: 'overlap'; fromStart: number; fromEnd: number; toStart: number; toEnd: number }   // minutes since each local midnight
    | { kind: 'compromise'; fromHour: number; toMinutes: number };
  export function meetingWindow(d: number): MeetingWindow;
  // pair.ts
  export interface PairRow { hour: number; fromLabel: string; toLabel: string; dayShift: -1 | 0 | 1 }
  export interface DstChange { instant: number; who: string; newDiffMinutes: number; text: string }
  export interface PairView { h1: string; summary: string; diffMinutes: number; fromZone: ZoneRef; toZone: ZoneRef;
    rows: PairRow[]; meeting: MeetingWindow; meetingText: string; dstChanges: DstChange[];
    inEffectNote: string | null; cityEquivalent?: Pair; reverse: Pair; fromOthers: Pair[]; toOthers: Pair[] }
  export function pairView(p: Pair, now: number): PairView;
  // dst.ts
  export interface DstRow { country: Country; tz: string; thisYear: { start: number; end: number } | null; nextYear: { start: number; end: number } | null }
  export function dstTable(now: number): DstRow[];  // one row per (country, distinct DST rule zone), sorted by country name
  ```
- **Meeting algorithm:**
  - Overlap: intersect `[540, 1020)` with `[540 − d, 1020 − d]`, also trying shifts of ±1440. A positive-length intersection → `overlap`.
  - Otherwise, for `h` in 0..23 score `out(h) + out(((h·60 + d) mod 1440)/60)`, where `out(x) = x < 9 ? 9 − x : x > 16 ? x − 16 : 0`. Choose the minimum sum, then the minimum max, then the earliest `h`.
- **Pair copy:**
  - h1: abbreviation pair `{A} to {B} Converter`; place pair `{A} to {B} Time Converter`.
  - Summary: `{B} is {diff} ahead of {A}. When it is 9:00 AM in {A}, it is {t} in {B}.` Use `behind` or `the same time as` when they apply.
  - Rows: the 24 hours of `from`'s local date at `now`.
  - DST changes: every transition of either zone in `[now, now + 365 days]`, chronological, each with the difference that results.
  - `inEffectNote` for abbreviation pairs: join the notes (from `abbrView`) of whichever ends have a representative currently on the sibling abbreviation; `null` if neither does. Place pairs: `null`.
  - Related: `fromOthers` = pairs from `from` (≤ 12), `toOthers` = pairs to `to` (≤ 12).

- [ ] **Step 1: Write the failing tests.**

```ts
// tests/unit/content/meeting.test.ts
import { it, expect } from 'vitest';
import { meetingWindow } from '../../../src/lib/content/meeting';
it('overlaps and compromises', () => {
  expect(meetingWindow(300)).toEqual({ kind: 'overlap', fromStart: 540, fromEnd: 720, toStart: 840, toEnd: 1020 });
  expect(meetingWindow(-300)).toEqual({ kind: 'overlap', fromStart: 840, fromEnd: 1020, toStart: 540, toEnd: 720 });
  expect(meetingWindow(330)).toEqual({ kind: 'overlap', fromStart: 540, fromEnd: 690, toStart: 870, toEnd: 1020 });
  expect(meetingWindow(0)).toEqual({ kind: 'overlap', fromStart: 540, fromEnd: 1020, toStart: 540, toEnd: 1020 });
  expect(meetingWindow(780)).toEqual({ kind: 'compromise', fromHour: 18, toMinutes: 420 });
});
```

```ts
// tests/unit/content/pair.test.ts
import { describe, it, expect } from 'vitest';
import { getCatalog } from '../../../src/data/catalog';
import { pairView } from '../../../src/lib/content/pair';
const NOW = Date.UTC(2026, 9, 25, 12); const cat = getCatalog(); const pair = (s: string) => cat.convert.get(s)!;
describe('pairView', () => {
  it('New York to London during the one-week EU/US gap', () => {
    const v = pairView(pair('new-york-to-london'), NOW);
    expect(v.h1).toBe('New York to London Time Converter');
    expect(v.diffMinutes).toBe(240);
    expect(v.summary).toBe('London is 4 hours ahead of New York. When it is 9:00 AM in New York, it is 1:00 PM in London.');
    expect(v.rows).toHaveLength(24);
    expect(v.rows[9]).toEqual({ hour: 9, fromLabel: '9:00 AM', toLabel: '1:00 PM', dayShift: 0 });
    expect(v.rows[22].dayShift).toBe(1);
    expect(v.dstChanges.map(c => [c.instant, c.newDiffMinutes])).toEqual([
      [Date.UTC(2026, 10, 1, 6), 300], [Date.UTC(2027, 2, 14, 7), 240], [Date.UTC(2027, 2, 28, 1), 300],
    ]);
    expect(v.reverse.slug).toBe('london-to-new-york');
  });
  it('EST to IST is fixed and points to the city equivalent', () => {
    const v = pairView(pair('est-to-ist'), NOW);
    expect(v.diffMinutes).toBe(630); expect(v.dstChanges).toEqual([]);
    expect(v.cityEquivalent?.slug).toBe('new-york-to-new-delhi');
    expect(v.inEffectNote).toContain('EDT');
  });
});
```

```ts
// tests/unit/content/dst.test.ts
import { it, expect } from 'vitest';
import { dstTable } from '../../../src/lib/content/dst';
it('lists US 2026 dates and skips Japan', () => {
  const rows = dstTable(Date.UTC(2026, 9, 25, 12));
  const us = rows.find(r => r.country.slug === 'usa' && r.tz === 'America/New_York')!;
  expect(us.thisYear).toEqual({ start: Date.UTC(2026, 2, 8, 7), end: Date.UTC(2026, 10, 1, 6) });
  expect(rows.some(r => r.country.slug === 'japan')).toBe(false);
});
```

- [ ] **Step 2: Run the tests to verify they fail.** Run `npx vitest run tests/unit/content`. Expected: the new tests FAIL.

- [ ] **Step 3: Implement the three modules.**
  - `dstTable` deduplicates a country's zones that share identical transitions; the `tz` kept is that group's most populous zone.
  - Southern hemisphere: `start` is the transition into DST (offset increases), `end` the transition out.

- [ ] **Step 4: Run the tests to verify they pass.** Expected: PASS.

- [ ] **Step 5: Commit.** `git add -A && git commit -m "feat: pair converter content, meeting windows, DST table"`

---

### Task 8: SEO metadata + JSON-LD

**Files:**
- Create: `src/lib/seo/meta.ts`, `src/lib/seo/jsonld.ts`
- Test: `tests/unit/seo/meta.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type PageRef =
    | { type: 'home' } | { type: 'hub'; hub: 'time' | 'timezone' | 'convert' } | { type: 'dst' }
    | { type: 'static'; page: 'about' | 'privacy' | 'terms' | 'contact' | '404' }
    | { type: 'place'; place: Place } | { type: 'abbr'; zone: AbbrZone } | { type: 'offset'; zone: OffsetZone } | { type: 'pair'; pair: Pair };
  export interface PageMeta { title: string; description: string; canonical: string; ogImage: string; noindex: boolean }
  export function pageMeta(ref: PageRef, now: number): PageMeta;
  export function allPageRefs(): PageRef[];    // every page the site builds (used by tests and verify)
  export interface Crumb { name: string; url: string }
  export function crumbsFor(ref: PageRef): Crumb[];
  // jsonld.ts
  export function websiteLd(): object; export function organizationLd(): object;
  export function breadcrumbLd(c: Crumb[]): object; export function webAppLd(name: string, url: string): object;
  ```
- **Title templates** (shorten progressively: drop the parenthetical, then the country):
  - City: `Current Time in {qualifiedName}, {country} ({ABBR}, {offset}) | TimezoneHop`
  - Country: `Current Time in {country} ({ABBR}, {offset}) | TimezoneHop`; multi-zone: `Current Time in {country}: All Time Zones | TimezoneHop`
  - Abbreviation: `{ABBR} Time Now: {name} ({offset}) | TimezoneHop`
  - Offset: `{offset} Time Now: Cities & Time Zones | TimezoneHop`
  - Pair (abbreviation): `{A} to {B} Converter: {nameA} to {nameB} | TimezoneHop`
  - Pair (place): `{A} to {B} Time Converter | TimezoneHop`
  - Home: `TimezoneHop: World Clock & Time Zone Converter`
- **Descriptions** each embed one computed fact (offset or difference). OG image: `/og/{home|place|timezone|pair|default}.png`.

- [ ] **Step 1: Write the failing test.**

```ts
// tests/unit/seo/meta.test.ts
import { describe, it, expect } from 'vitest';
import { allPageRefs, pageMeta, crumbsFor } from '../../../src/lib/seo/meta';
import { getCatalog } from '../../../src/data/catalog';
const NOW = Date.UTC(2026, 9, 25, 12);
const metas = allPageRefs().map(r => pageMeta(r, NOW));
describe('meta', () => {
  it('covers every page', () => { expect(metas.length).toBeGreaterThanOrEqual(5600); expect(metas.length).toBeLessThanOrEqual(6000); });
  it('titles and descriptions are unique and sized', () => {
    const idx = metas.filter(m => !m.noindex);
    expect(new Set(idx.map(m => m.title)).size).toBe(idx.length);
    expect(new Set(idx.map(m => m.description)).size).toBe(idx.length);
    for (const m of idx) {
      expect(m.title.length, m.title).toBeLessThanOrEqual(70);
      expect(m.description.length, m.description).toBeGreaterThanOrEqual(100);
      expect(m.description.length, m.description).toBeLessThanOrEqual(160);
      expect(m.canonical).toMatch(/^https:\/\/timezonehop\.com(\/[a-z0-9-]+)*$/);
    }
  });
  it('formats key titles', () => {
    const cat = getCatalog();
    expect(pageMeta({ type: 'place', place: cat.time.get('tokyo')! }, NOW).title).toBe('Current Time in Tokyo, Japan (JST, UTC+9) | TimezoneHop');
    expect(pageMeta({ type: 'pair', pair: cat.convert.get('new-york-to-london')! }, NOW).title).toBe('New York to London Time Converter | TimezoneHop');
    expect(crumbsFor({ type: 'place', place: cat.time.get('tokyo')! }).map(c => c.url)).toEqual(['/', '/time', '/time/japan', '/time/tokyo']);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails.** Run `npx vitest run tests/unit/seo`. Expected: FAIL.
- [ ] **Step 3: Implement both modules.** `canonical` = `https://timezonehop.com` + `urlOf(...)` (home: no path). Only the 404 page has `noindex: true`.
- [ ] **Step 4: Run the test to verify it passes.** Expected: PASS. Fix template collisions by extending the qualifier until titles are unique.
- [ ] **Step 5: Commit.** `git add -A && git commit -m "feat: SEO titles, descriptions, breadcrumbs, JSON-LD"`

---

### Task 9: Search library + index

**Files:**
- Create: `src/lib/search/normalize.ts`, `src/lib/search/match.ts`, `src/lib/search/build-index.ts`, `src/pages/search-index.json.ts`
- Test: `tests/unit/search/search.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface SearchEntry { n: string; a?: string[]; u: string; k: 'c' | 'n' | 'z'; d: string; z: string; p: number }
  // n name, a aliases, u url path, k kind (city/country/zone), d detail ('Japan' | 'UTC+9'), z zone key, p rank weight
  export function normalize(s: string): string;               // NFD, strip marks, lowercase, apostrophes removed, other non-alnum -> ' ', collapse, trim
  export function parseOffsetQuery(q: string): number | null; // 'utc+5:30' 'UTC +5:30' 'gmt-3' '+0530' 'utc' -> minutes
  export function search(index: SearchEntry[], query: string, limit?: number): SearchEntry[]; // default 8
  export function buildSearchIndex(): SearchEntry[];          // cities, countries, abbreviations, offsets; aliases merged
  ```
- **Ranking tiers:** exact name/alias → name/alias prefix → any word prefix → substring → typo (Damerau–Levenshtein ≤ 1 against the same-length prefix, queries ≥ 4 chars). Within a tier, sort by `p` descending: city/country population; abbreviations and offsets get `p = 1e9`, so `"est"` ranks EST first. An offset query puts that offset's entry (or UTC) first.

- [ ] **Step 1: Write the failing test** (Review Focus #3).

```ts
// tests/unit/search/search.test.ts
import { describe, it, expect } from 'vitest';
import { normalize, parseOffsetQuery, search } from '../../../src/lib/search/match';
import { buildSearchIndex } from '../../../src/lib/search/build-index';
const idx = buildSearchIndex(); const top = (q: string) => search(idx, q)[0]?.u;
describe('search', () => {
  it('normalizes messy input', () => {
    expect(normalize('  São Paulo ')).toBe('sao paulo');
    expect(normalize("St. John's")).toBe('st johns');
  });
  it('parses offsets', () => {
    expect(parseOffsetQuery('UTC +5:30')).toBe(330); expect(parseOffsetQuery('gmt-3')).toBe(-180);
    expect(parseOffsetQuery('+0545')).toBe(345); expect(parseOffsetQuery('utc')).toBe(0); expect(parseOffsetQuery('tokyo')).toBeNull();
  });
  it('ranks sensibly', () => {
    expect(top('tokyo')).toBe('/time/tokyo'); expect(top('TOKIO')).toBe('/time/tokyo');
    expect(top('  sao paulo')).toBe('/time/sao-paulo'); expect(top('nyc')).toBe('/time/new-york');
    expect(top('bombay')).toBe('/time/mumbai'); expect(top('est')).toBe('/timezone/est');
    expect(top('utc+5:30')).toBe('/timezone/utc-plus-5-30'); expect(top('gmt-3')).toBe('/timezone/utc-minus-3');
    expect(top("st. john's")).toBe('/time/st-johns'); expect(top('japan')).toBe('/time/japan');
    expect(search(idx, '')).toEqual([]); expect(search(idx, '   ')).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails.** Run `npx vitest run tests/unit/search`. Expected: FAIL.
- [ ] **Step 3: Implement.**
  - `match.ts` re-exports `normalize` from `normalize.ts`.
  - `search-index.json.ts` is a static `GET` returning `JSON.stringify(buildSearchIndex())`.
  - `ALIASES` (Task 4) must include: nyc, new york city → `/time/new-york`; la → `/time/los-angeles`; sf → `/time/san-francisco`; bombay → `/time/mumbai`; calcutta → `/time/kolkata`; madras → `/time/chennai`; bangalore → `/time/bengaluru`; peking → `/time/beijing`; saigon → `/time/ho-chi-minh-city`; kiev → `/time/kyiv`; united states, us, america → `/time/usa`; united kingdom, britain, great britain, england → `/time/uk`; united arab emirates, emirates → `/time/uae`; zulu → `/timezone/utc`.
- [ ] **Step 4: Run the test to verify it passes.** Expected: PASS.
- [ ] **Step 5: Commit.** `git add -A && git commit -m "feat: search normalization, ranking and index"`

---

### Task 10: Design system, layout, clock runtime, preferences

**Files:**
- Create: `build/iife-plugin.mjs`, `src/styles/tokens.css`, `src/styles/global.css`, `src/components/{Layout,Header,Footer,Breadcrumbs,SkyClockCard,FactsList,Faq,RelatedLinks,LinkGrid,AdSlot}.astro`, `src/scripts/clock-runtime.ts`, `src/scripts/theme-init.ts`, `src/lib/prefs.ts`
- Modify: `astro.config.mjs` (add `vite.plugins: [iife()]`), `src/pages/index.astro` (temporary demo using `Layout` + `SkyClockCard`)
- Test: `tests/unit/prefs.test.ts`, `tests/unit/clock-runtime.test.ts`, `tests/dist/layout.test.ts`, `tests/dist/helpers.ts`

**Interfaces:**
- Consumes: time lib, `pageMeta`/`crumbsFor`/JSON-LD (Task 8).
- Produces:
  ```ts
  // prefs.ts
  export interface Prefs { hour12: boolean | null; theme: 'light' | 'dark' | null; savedZones: string[] } // zone keys
  export function loadPrefs(): Prefs; export function savePrefs(patch: Partial<Prefs>): void;
  export function effectiveHour12(): boolean; // prefs.hour12 ?? defaultHour12()
  // clock-runtime.ts (bundled as IIFE, inlined at end of <body>)
  export function renderClocks(root: ParentNode, now: number, hour12: boolean, visitorTz: string): void;
  export function startClocks(): void; // align to next second, setTimeout loop, pause on hidden, resync on visible
  ```
  - **DOM contract** (used by every component and island):
    - `[data-clock]` with `data-zone="<zone key>"`, `data-label="<fixed label>"`, and `data-format="time|time-seconds|date-long|date-short|abbr|offset"`.
    - `data-zone="visitor"` means the visitor's own zone (used by the home hero).
    - Every zoned element also carries `data-offset="<build-time offset minutes>"`. If `Intl` throws for that zone (old browser), the runtime falls back to `fixed(data-offset)` and adds `data-stale` (spec §5 error handling).
    - Layout renders `<noscript>Live clocks need JavaScript. Times shown were correct at {build time}.</noscript>`.
    - `[data-sky]` with `data-zone`, plus optional `data-rise` / `data-set` (minutes-of-day) or `data-polar="day|night"`. The runtime sets `class="sky-<phase>"`.
    - `[data-diff-you]` with `data-zone`. Text: `14 hours ahead of you` / `3 hours 30 minutes behind you` / `Same time as you`.
  - `Layout.astro` props: `{ meta: PageMeta; crumbs?: Crumb[]; jsonLd?: object[] }`. Slots: default, `sidebar`.
  - `SkyClockCard.astro` props: `{ zone: ZoneRef; title: string; rise?: number; set?: number; polar?: 'day' | 'night'; size?: 'hero' | 'mini'; href?: string }`. Server-renders the build-time snapshot.
  - `AdSlot.astro` props: `{ slot: 'below-tool' | 'in-content' | 'sidebar' }`. Renders nothing unless ads are enabled.
- **`build/iife-plugin.mjs`:** for imports ending `?iife`, run esbuild `build({ entryPoints: [path], bundle: true, format: 'iife', minify: true, write: false, target: 'es2020' })` and return `export default <JSON string>`. Layout inlines `theme-init` in `<head>` and `clock-runtime` at the end of `<body>` with `<script is:inline set:html={code}>`.
- **Visual:**
  - Manrope Variable Latin woff2 from `@fontsource-variable/manrope` (install it). Declare `@font-face` yourself with `font-display: optional` and `<link rel=preload as=font crossorigin>`.
  - Tokens: 4 px spacing scale, radii 12/20 px, a light and a dark palette. Dark applies via `@media (prefers-color-scheme: dark)` on `:root:not([data-theme=light])` and via `[data-theme=dark]`.
  - Clock digits use `font-variant-numeric: tabular-nums`. Register `@property --sky-from/--sky-to` (`<color>`) so phase changes animate over 250 ms. Disable animation under `prefers-reduced-motion`.
  - Header: logo (inline SVG), a search slot (Task 12), theme toggle. Footer: hub links, trust pages, `Data: GeoNames (CC BY 4.0)`.

- [ ] **Step 1: Write the failing tests.**

```ts
// tests/unit/prefs.test.ts
// @vitest-environment happy-dom
import { it, expect, vi } from 'vitest';
import { loadPrefs, savePrefs } from '../../src/lib/prefs';
it('round-trips and survives broken storage', () => {
  savePrefs({ hour12: false, savedZones: ['Asia/Tokyo'] });
  expect(loadPrefs()).toMatchObject({ hour12: false, savedZones: ['Asia/Tokyo'] });
  localStorage.setItem('tzh:prefs', '{not json');
  expect(loadPrefs()).toEqual({ hour12: null, theme: null, savedZones: [] });
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
  expect(loadPrefs()).toEqual({ hour12: null, theme: null, savedZones: [] });
  expect(() => savePrefs({ theme: 'dark' })).not.toThrow();
});
```

```ts
// tests/unit/clock-runtime.test.ts  (Review Focus #1 and #5)
// @vitest-environment happy-dom
import { it, expect, vi } from 'vitest';
import { renderClocks, startClocks } from '../../src/scripts/clock-runtime';
const html = `<span data-clock data-zone="America/New_York" data-format="time"></span>
<span data-clock data-zone="America/New_York" data-format="abbr"></span>
<span data-clock data-zone="Fake/Zone" data-offset="540" data-format="time"></span>
<span data-diff-you data-zone="Asia/Tokyo"></span><span data-diff-you data-zone="Asia/Kolkata"></span>
<div data-sky data-zone="Asia/Tokyo"></div>`;
it('renders, recomputes offsets every call, and handles unknown visitor zones', () => {
  document.body.innerHTML = html;
  renderClocks(document, Date.UTC(2026, 10, 1, 5, 59), true, 'America/Indiana/Knox');
  const [t, abbr, stale] = document.querySelectorAll('[data-clock]');
  expect(t.textContent).toBe('1:59 AM'); expect(abbr.textContent).toBe('EDT');
  renderClocks(document, Date.UTC(2026, 10, 1, 6, 0), true, 'America/Indiana/Knox');   // DST ends while open
  expect(t.textContent).toBe('1:00 AM'); expect(abbr.textContent).toBe('EST');
  expect(stale.textContent).toBe('3:00 PM'); expect(stale.hasAttribute('data-stale')).toBe(true);
  const [d1, d2] = document.querySelectorAll('[data-diff-you]');
  expect(d1.textContent).toBe('14 hours ahead of you');      // Knox is still CDT (UTC−5) until 07:00Z
  renderClocks(document, Date.UTC(2026, 10, 1, 6, 0), true, 'Not/AZone');               // invalid -> UTC
  expect(d1.textContent).toBe('9 hours ahead of you'); expect(d2.textContent).toBe('5 hours 30 minutes ahead of you');
  expect(document.querySelector('[data-sky]')!.className).toMatch(/^sky-/);
});
it('resyncs immediately when a sleeping tab becomes visible', () => {
  vi.useFakeTimers(); vi.setSystemTime(Date.UTC(2026, 9, 25, 12, 0, 0));
  localStorage.setItem('tzh:prefs', JSON.stringify({ hour12: true }));
  document.body.innerHTML = '<span data-clock data-zone="UTC" data-format="time-seconds"></span>';
  startClocks();
  const el = document.querySelector('[data-clock]')!;
  expect(el.textContent).toBe('12:00:00 PM');
  vi.setSystemTime(Date.UTC(2026, 9, 25, 15, 30, 5));        // laptop slept; no timers fired
  document.dispatchEvent(new Event('visibilitychange'));
  expect(el.textContent).toBe('3:30:05 PM');
  vi.useRealTimers();
});
```

```ts
// tests/dist/helpers.ts
import { readFileSync, existsSync } from 'node:fs';
import { parse } from 'node-html-parser';
export function page(path: string) {               // '/' | '/time/tokyo'
  const file = path === '/' ? 'dist/index.html' : `dist${path}.html`;
  if (!existsSync(file)) throw new Error(`missing ${file}`);
  return parse(readFileSync(file, 'utf8'));
}
```

```ts
// tests/dist/layout.test.ts
import { it, expect } from 'vitest';
import { page } from './helpers';
it('home page has the layout contract', () => {
  const doc = page('/');
  expect(doc.querySelectorAll('h1')).toHaveLength(1);
  expect(doc.querySelector('link[rel=canonical]')?.getAttribute('href')).toBe('https://timezonehop.com');
  expect(doc.querySelector('title')?.text).toBe('TimezoneHop: World Clock & Time Zone Converter');
  expect(doc.querySelector('link[rel=preload][as=font]')).toBeTruthy();
  expect(doc.querySelectorAll('script[type="application/ld+json"]').length).toBeGreaterThanOrEqual(1);
  expect(doc.querySelector('[data-clock]')).toBeTruthy();
  expect(doc.querySelector('html')?.getAttribute('lang')).toBe('en');
  expect(doc.querySelector('link[hreflang=x-default]')).toBeTruthy();
});
```

- [ ] **Step 2: Run the tests to verify they fail.** Run `npx vitest run tests/unit/prefs.test.ts tests/unit/clock-runtime.test.ts`, then `npm run build && npm run test:dist`. Expected: FAIL.
- [ ] **Step 3: Implement the files listed above.** The temporary `index.astro` uses `Layout` with `pageMeta({ type: 'home' })` and one hero `SkyClockCard` for UTC.
- [ ] **Step 4: Run the tests to verify they pass.** Run the unit tests above, then `npm run build && npm run test:dist`. Expected: PASS. Run `npm run dev`, open `/`, and confirm the clock ticks and dark mode toggles.
- [ ] **Step 5: Commit.** `git add -A && git commit -m "feat: design tokens, layout, clock runtime, preferences"`

---

### Task 11: Converter island

**Files:**
- Create: `src/islands/converter/state.ts`, `src/islands/converter/timeline.ts`, `src/islands/Converter.tsx`, `src/islands/ZoneRow.tsx`, `src/islands/Timeline.tsx`, `playwright.config.ts`
- Modify: `src/pages/index.astro` (mount `<Converter client:idle …/>`)
- Test: `tests/unit/converter/state.test.ts`, `tests/unit/converter/timeline.test.ts`, `tests/e2e/converter.spec.ts`

**Interfaces:**
- Consumes: time lib, `SearchEntry` (Task 9), prefs (Task 10), the DOM/sky contract (Task 10).
- Produces:
  ```ts
  // state.ts
  export interface ConverterZone { key: string; label: string; token?: string } // token = last URL segment, used in share links
  export interface ConverterState { zones: ConverterZone[]; anchor: 'now' | number; hour12: boolean }
  export const MIN_ZONES = 2, MAX_ZONES = 6;
  export function addZone(s: ConverterState, z: ConverterZone): ConverterState;     // no-op if full or duplicate key
  export function removeZone(s: ConverterState, i: number): ConverterState;         // no-op below MIN
  export function moveZone(s: ConverterState, i: number, dir: -1 | 1): ConverterState;
  export function swapFirstTwo(s: ConverterState): ConverterState;
  export function serializeShare(s: ConverterState, now: number): string;           // '?t=2026-10-25T14:00Z&z=new-york,london'
  export function parseShare(search: string, resolve: (token: string) => ConverterZone | null): { zones?: ConverterZone[]; anchor?: number };
  export function initialZones(o: { pageZones: ConverterZone[]; visitorTz: string; saved: string[]; isHome: boolean }): ConverterZone[];
  // timeline.ts
  export function dayRange(z: ZoneRef, instant: number): { start: number; end: number }; // local midnight -> next local midnight
  export function snap(instant: number, stepMinutes?: number): number;                   // default 15
  export function fractionToInstant(f: number, r: { start: number; end: number }): number; // clamps 0..1, then snaps
  export function instantToFraction(t: number, r: { start: number; end: number }): number;
  export function dayShift(zone: ZoneRef, ref: ZoneRef, instant: number): -1 | 0 | 1;  // zone's local date vs ref's
  ```
- **`Converter.tsx` props:** `{ pageZones: ConverterZone[]; isHome: boolean }`.
  - Signals hold the state. Rows render label, time, `dayShift` badge, abbreviation/offset, and a 24-segment `skyStrip` covering the timeline range in that row's local hours, with 9–17 outlined.
  - Buttons: + Add city (opens the `SearchBox` in "pick" mode, Task 12), ⇅ Swap, Now, Copy link, ‹ › day, 12h/24h toggle.
  - Timeline: `role="slider"`, `aria-valuetext`. Arrow keys ±15 min, Shift+arrow ±60 min, Home/End to the range ends. Pointer drag uses `transform` only.
  - On the home page, zone changes are saved to prefs. A polite `aria-live` region announces the time in row 1 on drag end only.
- **`initialZones` rules:**
  - Home: saved zones (≥ 2 valid keys); else `[visitor, UTC]`. If the visitor zone is UTC, use `[UTC, London]`.
  - Other pages: `[pageZones[0], visitor]`; if the visitor is in pageZones[0]'s zone, use `[pageZones[0], UTC]`. Pair pages use both pageZones.
  - The visitor label comes from `labelFromIana`, with the suffix ` (you)`. An invalid visitor tz → UTC.

- [ ] **Step 1: Write the failing tests** (Review Focus #1, #2, #4).

```ts
// tests/unit/converter/state.test.ts
import { describe, it, expect } from 'vitest';
import { addZone, removeZone, swapFirstTwo, serializeShare, parseShare, initialZones, MAX_ZONES } from '../../../src/islands/converter/state';
const z = (key: string, token?: string) => ({ key, label: key, token });
const base = { zones: [z('America/New_York', 'new-york'), z('Europe/London', 'london')], anchor: 'now' as const, hour12: true };
describe('state', () => {
  it('enforces limits and uniqueness', () => {
    let s = base; for (let i = 0; i < 10; i++) s = addZone(s, z(`fixed:${i * 60}`));
    expect(s.zones).toHaveLength(MAX_ZONES);
    expect(addZone(base, z('Europe/London')).zones).toHaveLength(2);
    expect(removeZone(base, 0).zones).toHaveLength(2);
    expect(swapFirstTwo(base).zones.map(x => x.key)).toEqual(['Europe/London', 'America/New_York']);
  });
  it('serializes and parses share links defensively', () => {
    const q = serializeShare({ ...base, anchor: Date.UTC(2026, 9, 25, 14, 7) }, 0);
    expect(q).toBe('?t=2026-10-25T14:07Z&z=new-york,london');
    const resolve = (t: string) => (['new-york', 'london', 'tokyo'].includes(t) ? z(t, t) : null);
    expect(parseShare(q, resolve)).toEqual({ anchor: Date.UTC(2026, 9, 25, 14, 7), zones: [z('new-york', 'new-york'), z('london', 'london')] });
    const messy = parseShare('?t=garbage&z=tokyo,tokyo,nowhere,london,new-york,tokyo,london,london', resolve);
    expect(messy.anchor).toBeUndefined();
    expect(messy.zones!.map(x => x.key)).toEqual(['tokyo', 'london', 'new-york']);
    expect(parseShare('?z=nowhere', resolve)).toEqual({});           // < 2 valid zones -> ignored
    expect(parseShare('?t=2031-01-01T00:00Z', resolve).anchor).toBe(Date.UTC(2031, 0, 1)); // far future is allowed
  });
  it('picks initial zones', () => {
    const page = [z('Asia/Tokyo', 'tokyo')];
    expect(initialZones({ pageZones: page, visitorTz: 'America/Indiana/Knox', saved: [], isHome: false }).map(x => [x.key, x.label]))
      .toEqual([['Asia/Tokyo', 'Asia/Tokyo'], ['America/Indiana/Knox', 'Knox (you)']]);
    expect(initialZones({ pageZones: page, visitorTz: 'Asia/Tokyo', saved: [], isHome: false })[1].key).toBe('UTC');
    expect(initialZones({ pageZones: [], visitorTz: 'garbage', saved: [], isHome: true }).map(x => x.key)).toEqual(['UTC', 'Europe/London']);
    expect(initialZones({ pageZones: [], visitorTz: 'Asia/Tokyo', saved: ['Asia/Dubai', 'Europe/Paris'], isHome: true }).map(x => x.key))
      .toEqual(['Asia/Dubai', 'Europe/Paris']);
  });
});
```

```ts
// tests/unit/converter/timeline.test.ts
import { it, expect } from 'vitest';
import { dayRange, snap, fractionToInstant, dayShift } from '../../../src/islands/converter/timeline';
import { iana } from '../../../src/lib/time/zone';
const ny = iana('America/New_York'); const H = 3_600_000;
it('handles 23h/25h days, snapping and day shifts', () => {
  const fall = dayRange(ny, Date.UTC(2026, 10, 1, 15)); expect(fall.end - fall.start).toBe(25 * H);
  const spring = dayRange(ny, Date.UTC(2026, 2, 8, 15)); expect(spring.end - spring.start).toBe(23 * H);
  expect(snap(Date.UTC(2026, 0, 1, 10, 7, 31))).toBe(Date.UTC(2026, 0, 1, 10, 0));
  expect(snap(Date.UTC(2026, 0, 1, 10, 8))).toBe(Date.UTC(2026, 0, 1, 10, 15));
  expect(fractionToInstant(1.4, fall)).toBe(fall.end);
  expect(dayShift(iana('Asia/Tokyo'), ny, Date.UTC(2026, 9, 25, 20))).toBe(1);
  expect(dayShift(ny, iana('Asia/Tokyo'), Date.UTC(2026, 9, 25, 20))).toBe(-1);
});
```

```ts
// tests/e2e/converter.spec.ts
import { test, expect } from '@playwright/test';
test.use({ timezoneId: 'America/New_York', locale: 'en-US' });
test('converter: keyboard, swap, add/remove, copy link', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
  const rows = page.locator('[data-zone-row]');
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0)).toContainText('New York (you)');
  const slider = page.getByRole('slider');
  await slider.focus(); await page.keyboard.press('Home');
  await expect(rows.nth(0)).toContainText('12:00 AM');
  await page.keyboard.press('ArrowRight');
  await expect(rows.nth(0)).toContainText('12:15 AM');
  await page.getByRole('button', { name: /swap/i }).click();
  await expect(rows.nth(1)).toContainText('New York');
  await page.getByRole('button', { name: /copy link/i }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(/\?t=\d{4}-\d\d-\d\dT\d\d:\d\dZ&z=/);
});
```

- [ ] **Step 2: Run the tests to verify they fail.** Run `npx vitest run tests/unit/converter`. Expected: FAIL.
- [ ] **Step 3: Implement the converter.**
  - Install `@playwright/test@^1.64.1` and run `npx playwright install chromium`.
  - `playwright.config.ts`: `webServer: { command: 'npm run build && npm run preview -- --port 4321', port: 4321, reuseExistingServer: true }`, `use.baseURL: 'http://localhost:4321'`, project `chromium` only.
  - Implement `state.ts`, `timeline.ts`, the components, and mount the converter on the home page with `pageZones: []`, `isHome: true`.
  - Until Task 12, "+ Add city" may append a zone picked from a small fallback list; it is replaced in Task 12.
- [ ] **Step 4: Run the tests to verify they pass.** Run `npx vitest run tests/unit/converter`, then `npm run test:e2e`. Expected: PASS. Check the bundle: the largest `dist/_astro/*.js` for the converter is ≤ 25 KB gzip (`gzip -c file | wc -c`).
- [ ] **Step 5: Commit.** `git add -A && git commit -m "feat: converter island with timeline, share links, saved zones"`

---

### Task 12: Search island

**Files:**
- Create: `src/islands/SearchBox.tsx`
- Modify: `src/components/Header.astro` (mount `client:idle`), `src/islands/Converter.tsx` (Add city uses `SearchBox mode="pick"`)
- Test: `tests/e2e/search.spec.ts`

**Interfaces:**
- Consumes: `search`, `SearchEntry` (Task 9), `ConverterZone` (Task 11).
- Produces: `SearchBox` props `{ mode: 'navigate' | 'pick'; onPick?: (z: ConverterZone) => void; autoFocus?: boolean }`.
  - Fetches `/search-index.json` on first focus (one module-level promise shared by all instances).
  - Combobox ARIA pattern (`role=combobox`, `aria-expanded`, `aria-activedescendant`, `role=listbox`/`option`). ↑/↓/Enter/Esc.
  - The `/` key focuses the header box unless focus is already in an input.
  - In `navigate` mode, Enter goes to `entry.u`. In `pick` mode, Enter calls `onPick({ key: entry.z, label: entry.n, token: last segment of entry.u })`.
  - If the fetch fails, show `Search unavailable — browse all cities` linking to `/time`.
  - Converter share-link restore (`parseShare`) uses the same index to resolve tokens.

- [ ] **Step 1: Write the failing e2e test.**

```ts
// tests/e2e/search.spec.ts
import { test, expect } from '@playwright/test';
test('header search navigates and converter add-city picks', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('/');
  await page.keyboard.type('tokio');
  await expect(page.getByRole('option').first()).toContainText('Tokyo');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/time\/tokyo$/);
  await page.goto('/');
  await page.getByRole('button', { name: /add city/i }).click();
  await page.keyboard.type('dubai'); await page.keyboard.press('Enter');
  await expect(page.locator('[data-zone-row]')).toHaveCount(3);
});
test('share link restores state', async ({ page }) => {
  await page.goto('/?t=2026-10-25T14:00Z&z=tokyo,london');
  await expect(page.locator('[data-zone-row]').nth(0)).toContainText('11:00 PM');
  await expect(page.locator('[data-zone-row]').nth(1)).toContainText('2:00 PM');
});
test('search failure degrades gracefully', async ({ page }) => {
  await page.route('**/search-index.json', r => r.abort());
  await page.goto('/'); await page.keyboard.press('/'); await page.keyboard.type('par');
  await expect(page.getByRole('link', { name: /browse all cities/i })).toBeVisible();
});
```

- [ ] **Step 2: Run the test to verify it fails.** Run `npm run test:e2e -- search`. Expected: FAIL.
- [ ] **Step 3: Implement `SearchBox.tsx` and wire it into the Header and the Converter.** The `/time/tokyo` page may still 404 at this point; the test asserts the URL only.
- [ ] **Step 4: Run the test to verify it passes.** Run `npm run test:e2e`. Expected: PASS.
- [ ] **Step 5: Commit.** `git add -A && git commit -m "feat: search box with lazy index and converter picking"`

---

### Task 13: City and country pages + /time hub

**Files:**
- Create: `src/pages/time/[slug].astro`, `src/pages/time.astro`, `src/components/DifferenceTable.astro`
- Test: `tests/dist/time.test.ts`

**Interfaces:**
- Consumes: `cityView`/`countryView` (Task 6), `pageMeta`/`crumbsFor`/JSON-LD (Task 8), components (Task 10), `Converter` (Task 11).
- **Page structure:**
  - `getStaticPaths` maps `getCatalog().time`.
  - Order: H1 → hero `SkyClockCard` (sunrise/sunset as `rise`/`set` minutes) → `[data-diff-you]` → `Converter` (`pageZones = [this place]`) → `AdSlot below-tool` → `FactsList` → `DifferenceTable` → `AdSlot in-content` → `Faq` → `RelatedLinks` (same-zone cities, cities in country, `pairsFrom` for popular places).
  - Multi-zone countries show a mini `SkyClockCard` per zone, with that zone's cities.
  - Sidebar slot: `AdSlot sidebar`.
  - JSON-LD: website, organization, breadcrumb.
  - Hub `/time`: countries grouped by continent, then cities A–Z grouped by first letter (`LinkGrid`).

- [ ] **Step 1: Write the failing test.**

```ts
// tests/dist/time.test.ts
import { it, expect } from 'vitest';
import { readdirSync } from 'node:fs';
import { page } from './helpers';
it('builds every city and country page', () => {
  const n = readdirSync('dist/time').filter(f => f.endsWith('.html')).length;
  expect(n).toBeGreaterThanOrEqual(1150); expect(n).toBeLessThanOrEqual(1350);
});
it('Tokyo page has the content contract', () => {
  const d = page('/time/tokyo');
  expect(d.querySelector('h1')?.text).toBe('Current time in Tokyo, Japan');
  expect(d.querySelector('link[rel=canonical]')?.getAttribute('href')).toBe('https://timezonehop.com/time/tokyo');
  expect(d.querySelector('[data-clock][data-zone="Asia/Tokyo"]')).toBeTruthy();
  expect(d.querySelector('[data-diff-you]')).toBeTruthy();
  expect(d.text).toContain('does not observe daylight saving time');
  expect(new Set(d.querySelectorAll('a[href^="/convert/tokyo-to-"]').map(a => a.getAttribute('href'))).size).toBe(59);
  expect(d.querySelector('script[type="application/ld+json"]')?.text).toContain('BreadcrumbList');
});
it('USA lists its zones; hub links everything', () => {
  expect(page('/time/usa').querySelectorAll('[data-sky]').length).toBeGreaterThanOrEqual(4);
  expect(page('/time').querySelectorAll('a[href^="/time/"]').length).toBeGreaterThanOrEqual(1150);
});
```

- [ ] **Step 2: Run the test to verify it fails.** Run `npm run build && npm run test:dist`. Expected: FAIL (missing files).
- [ ] **Step 3: Implement the pages.**
- [ ] **Step 4: Run the test to verify it passes.** Run `npm run build && npm run test:dist`. Expected: PASS. Note the build time; it must be under 5 minutes.
- [ ] **Step 5: Commit.** `git add -A && git commit -m "feat: city and country time pages with hub"`

---

### Task 14: Timezone and converter pages + hubs

**Files:**
- Create: `src/pages/timezone/[slug].astro`, `src/pages/timezone.astro`, `src/pages/convert/[pair].astro`, `src/pages/convert.astro`, `src/components/ConversionTable.astro`
- Test: `tests/dist/zones.test.ts`

**Interfaces:**
- Consumes: `abbrView`/`offsetView` (Task 6), `pairView` (Task 7), and the same components.
- **Pages:**
  - Timezone page: H1, hero card for the fixed zone, `inEffectNote` callout with a link to the representative's page, definition, used-in, sibling link, ambiguity note, pair chips (`pairsFrom`). Offset pages list `citiesNow`.
  - Pair page: H1, summary, Converter (`pageZones = [from, to]`), ConversionTable (24 rows, dayShift badges), meeting text, DST change list, `inEffectNote` + `cityEquivalent` link, reverse link, related pairs.
  - JSON-LD for pair pages also includes `webAppLd`.
  - Hub `/timezone`: abbreviations grouped by region, then offsets in ascending order.
  - Hub `/convert`: the first 60 abbreviation pairs and the first 60 place pairs, plus "Convert from…" chip lists linking to all 30 abbreviation pages and all 60 popular place pages.

- [ ] **Step 1: Write the failing test.**

```ts
// tests/dist/zones.test.ts
import { it, expect } from 'vitest';
import { readdirSync } from 'node:fs';
import { page } from './helpers';
const count = (dir: string) => readdirSync(dir).filter(f => f.endsWith('.html')).length;
it('builds every timezone and pair page', () => {
  expect(count('dist/convert')).toBe(4410);
  expect(count('dist/timezone')).toBeGreaterThanOrEqual(80);
});
it('pair page content', () => {
  const d = page('/convert/new-york-to-london');
  expect(d.querySelectorAll('h1')).toHaveLength(1);
  expect(d.querySelectorAll('[data-conversion-row]')).toHaveLength(24);
  expect(d.querySelector('a[href="/convert/london-to-new-york"]')).toBeTruthy();
  const e = page('/convert/est-to-ist');
  expect(e.querySelector('a[href="/convert/new-york-to-new-delhi"]')).toBeTruthy();
});
it('timezone pages and hubs', () => {
  const est = page('/timezone/est');
  expect(est.querySelector('h1')?.text).toBe('EST \u2014 Eastern Standard Time (UTC\u22125)');
  expect(est.querySelector('a[href="/convert/est-to-pst"]')).toBeTruthy();
  expect(page('/timezone/utc-plus-5-30').querySelector('a[href="/time/mumbai"]')).toBeTruthy();
  expect(new Set(page('/convert').querySelectorAll('a[href^="/time/"]').map(a => a.getAttribute('href'))).size).toBeGreaterThanOrEqual(60);
});
```

- [ ] **Step 2: Run the test to verify it fails.** Run `npm run build && npm run test:dist`. Expected: FAIL.
- [ ] **Step 3: Implement the pages.**
- [ ] **Step 4: Run the test to verify it passes.** Run `npm run build && npm run test:dist`. Expected: PASS.
- [ ] **Step 5: Commit.** `git add -A && git commit -m "feat: timezone and converter pages with hubs"`

---

### Task 15: Home, DST page, trust pages, 404, robots, sitemap, images

**Files:**
- Create: `src/pages/daylight-saving-time.astro`, `about.astro`, `privacy.astro`, `terms.astro`, `contact.astro`, `404.astro`, `robots.txt.ts`, `ads.txt.ts`, `scripts/make-images.ts`, `public/favicon.svg`, `public/apple-touch-icon.png`, `public/og/{home,place,timezone,pair,default}.png`
- Modify: `src/pages/index.astro` (final home), `astro.config.mjs` (add `sitemap({ filter: p => !p.endsWith('/404') })`)
- Test: `tests/dist/site.test.ts`

**Interfaces:**
- **Home:** H1 `World Clock & Time Zone Converter`, hero card for the visitor's zone (SSR: UTC snapshot; `data-zone="visitor"` per the Task 10 contract), Converter (`isHome`), a 12-card `HOME_GRID` of mini clocks linking to their pages, guide text (≈300 words: how to use, what UTC/GMT is, DST), links to the three hubs.
- **DST page:** `dstTable(BUILD_NOW)` rendered as a table (country, zone, starts, ends, this year and next) plus a ≈250-word explainer.
- **Trust pages:** copy as listed in spec §3 (About credits GeoNames under CC BY 4.0 and the IANA tz database; Privacy covers AdSense cookies, Google consent messages, Cloudflare Web Analytics, localStorage; Terms includes an accuracy disclaimer; Contact gives `mailto:hello@timezonehop.com`).
- **404:** `noindex`, a search box, and hub links.
- `robots.txt`: `User-agent: *` / `Allow: /` / `Sitemap: https://timezonehop.com/sitemap-index.xml`.
- `ads.txt`: `google.com, ${PUBLIC_ADSENSE_CLIENT minus 'ca-'}, DIRECT, f08c47fec0942fa0` when set, else an empty body.
- **`make-images.ts`:** install `sharp` as a dev dependency. Render SVG templates (logo, sky gradient, page-type headline) to 1200×630 PNGs, plus a 180×180 apple-touch-icon. Commit the outputs.

- [ ] **Step 1: Write the failing test.**

```ts
// tests/dist/site.test.ts
import { it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { page } from './helpers';
it('home, DST and trust pages exist with one H1 each', () => {
  for (const p of ['/', '/daylight-saving-time', '/about', '/privacy', '/terms', '/contact', '/time', '/timezone', '/convert'])
    expect(page(p).querySelectorAll('h1'), p).toHaveLength(1);
  expect(page('/').querySelectorAll('a[href^="/time/"]').length).toBeGreaterThanOrEqual(12);
  // date-agnostic: this suite also runs in the daily CI build
  const dst = page('/daylight-saving-time');
  expect(dst.querySelectorAll('tbody tr').length).toBeGreaterThanOrEqual(40);
  expect(dst.querySelector('a[href="/time/usa"]')).toBeTruthy();
  expect(page('/about').text).toContain('GeoNames');
});
it('404 is noindex; robots and sitemap are complete', () => {
  expect(page('/404').querySelector('meta[name=robots]')?.getAttribute('content')).toContain('noindex');
  expect(readFileSync('dist/robots.txt', 'utf8')).toContain('Sitemap: https://timezonehop.com/sitemap-index.xml');
  const sm = readFileSync('dist/sitemap-0.xml', 'utf8');
  const locs = sm.match(/<loc>/g)!.length;
  expect(locs).toBeGreaterThanOrEqual(5600);
  expect(sm).not.toContain('/404');
  expect(sm).toContain('<loc>https://timezonehop.com/convert/est-to-pst</loc>');
  expect(existsSync('dist/og/place.png')).toBe(true);
});
```

- [ ] **Step 2: Run the test to verify it fails.** Run `npm run build && npm run test:dist`. Expected: FAIL.
- [ ] **Step 3: Implement the pages, run `node scripts/make-images.ts`, and add the sitemap integration.**
- [ ] **Step 4: Run the test to verify it passes.** Run `npm run build && npm run test:dist`. Expected: PASS. Spot-check that `/daylight-saving-time` shows `Mar 8, 2026` and `Nov 1, 2026` for the US Eastern row.
- [ ] **Step 5: Commit.** `git add -A && git commit -m "feat: home, DST page, trust pages, robots, sitemap, images"`

---

### Task 16: Ads, headers, Cloudflare config, CI

**Files:**
- Create: `src/scripts/ads.ts`, `public/_headers`, `wrangler.jsonc`, `.github/workflows/deploy.yml`
- Modify: `src/components/AdSlot.astro`, `src/components/Layout.astro`
- Test: `tests/unit/ads.test.ts`, `tests/dist/ads-off.test.ts`

**Interfaces:**
- **`ads.ts`:** `export function scheduleAds(client: string, win?: Window): void`. Injects `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}` (async, crossorigin) **once**, on whichever fires first:
  - `load` + `requestIdleCallback` (fallback: `setTimeout` 1 ms),
  - the first `pointerdown`/`keydown`/`scroll`,
  - 3 s after `load`.

  Then it pushes `{}` to `adsbygoogle` once per `ins.adsbygoogle` present.
- **AdSlot sizes:** `below-tool` / `in-content`: `<ins class="adsbygoogle" data-ad-client data-ad-slot={env PUBLIC_AD_SLOT_*} data-ad-format="auto" data-full-width-responsive="true">` inside a wrapper with `min-height: 280px` (mobile) / `250px` (≥ 1024 px). `sidebar`: 300×600, sticky, `display: none` below 1024 px.
- **Layout:** when `PUBLIC_ADSENSE_CLIENT` is set, emit `<meta name="google-adsense-account" content=…>`. When ads are enabled, also inline the `scheduleAds` call (via `?iife`).
- **`public/_headers`:**
  ```
  /_astro/*
    Cache-Control: public, max-age=31536000, immutable
  /*
    Strict-Transport-Security: max-age=31536000; includeSubDomains
    X-Content-Type-Options: nosniff
    Referrer-Policy: strict-origin-when-cross-origin
    Permissions-Policy: camera=(), microphone=(), geolocation=()
  /search-index.json
    Cache-Control: public, max-age=3600
  ```
- **`wrangler.jsonc`:**
  ```jsonc
  { "name": "timezonehop", "compatibility_date": "2026-10-01",
    "assets": { "directory": "./dist", "not_found_handling": "404-page", "html_handling": "auto-trailing-slash" },
    "routes": [{ "pattern": "timezonehop.com", "custom_domain": true }] }
  ```
- **`deploy.yml`:**
  - Triggers: `push` to `main`, `schedule: cron '5 0 * * *'`, `workflow_dispatch`.
  - Job: ubuntu-latest, `actions/setup-node` Node 24 with npm cache, then `npm ci`, `npm test`, `npm run build`, `npm run test:dist`, `npx wrangler deploy`.
  - Env: `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` from secrets; `PUBLIC_ADSENSE_CLIENT`, `PUBLIC_ADS_ENABLED`, and `PUBLIC_AD_SLOT_BELOW_TOOL` / `IN_CONTENT` / `SIDEBAR` from repository variables.

- [ ] **Step 1: Write the failing tests.**

```ts
// tests/unit/ads.test.ts
// @vitest-environment happy-dom
import { it, expect, vi } from 'vitest';
import { scheduleAds } from '../../src/scripts/ads';
it('injects the AdSense script once, lazily', () => {
  vi.useFakeTimers();
  scheduleAds('ca-pub-123'); scheduleAds('ca-pub-123');
  expect(document.querySelectorAll('script[src*="adsbygoogle"]')).toHaveLength(0);
  window.dispatchEvent(new Event('load')); vi.advanceTimersByTime(3000);
  window.dispatchEvent(new Event('pointerdown'));
  expect(document.querySelectorAll('script[src*="adsbygoogle.js?client=ca-pub-123"]')).toHaveLength(1);
});
```

```ts
// tests/dist/ads-off.test.ts
import { it, expect } from 'vitest';
import { page } from './helpers';
it('ships no ad markup or scripts while ads are disabled', () => {
  const html = page('/time/tokyo').toString();
  expect(html).not.toContain('adsbygoogle'); expect(html).not.toContain('google-adsense-account');
});
```

- [ ] **Step 2: Run the tests to verify they fail.** Run `npx vitest run tests/unit/ads.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement the files listed above.**
- [ ] **Step 4: Run the tests to verify they pass.** Run `npx vitest run tests/unit/ads.test.ts && npm run build && npm run test:dist`. Expected: PASS.
  - Then run `PUBLIC_ADSENSE_CLIENT=ca-pub-0000000000000000 PUBLIC_ADS_ENABLED=true npm run build` and check `grep -c adsbygoogle dist/time/tokyo.html` is ≥ 1. Rebuild without the env afterwards.
  - Run `npx wrangler deploy --dry-run`. Expected: it validates and lists the asset count, which must be < 20,000.
- [ ] **Step 5: Commit.** `git add -A && git commit -m "feat: lazy AdSense slots, security headers, Cloudflare + CI config"`

---

### Task 17: Whole-site verification (links, budgets, Lighthouse)

**Files:**
- Create: `tests/dist/integrity.test.ts`, `scripts/lighthouse.ts`

**Interfaces:**
- **`integrity.test.ts`:** walk every `dist/**/*.html` and assert each has:
  - exactly one `<h1>`, one canonical, a non-empty `<title>` and meta description;
  - every internal `href` (starting with `/`, not `//`) resolving to `dist/{path}.html`, `dist/index.html`, or an existing asset file.

  Also compute gzip sizes of every JS chunk referenced by `/`, `/time/tokyo`, `/convert/est-to-pst`, and `/convert/new-york-to-london`; the total per page must be ≤ 35 KB. Total CSS per page ≤ 15 KB gzip.
- **`scripts/lighthouse.ts`** (run with `node scripts/lighthouse.ts`):
  - Start `astro preview` and run `npx lighthouse <url> --form-factor=mobile --output=json --quiet --chrome-flags="--headless=new"` for those 4 pages.
  - Fail unless Performance ≥ 0.95, SEO = 1, Accessibility ≥ 0.95, Best Practices ≥ 0.95, and CLS < 0.02.
  - Uses `CHROME_PATH` if set (Playwright's Chromium works).

- [ ] **Step 1: Write `tests/dist/integrity.test.ts` with the assertions above.**
- [ ] **Step 2: Run the integrity test.** Run `npm run build && npm run test:dist`. Expected: if it FAILS, fix the reported pages/links (real defects), then re-run until it PASSES.
- [ ] **Step 3: Write `scripts/lighthouse.ts`, then run `node scripts/lighthouse.ts`.** Expected: all 4 pages pass. Fix regressions (render-blocking resources, contrast, tap targets) and re-run.
- [ ] **Step 4: Run the full suite.** Run `npm test && npm run test:dist && npm run test:e2e`. Expected: all PASS.
- [ ] **Step 5: Commit.** `git add -A && git commit -m "test: site integrity, payload budgets, Lighthouse checks"`

---

### Task 18: First deploy (owner-assisted)

**Files:** none new.

- [ ] **Step 1 (owner):** in the Cloudflare dashboard → My Profile → API Tokens, create a token from the **Edit Cloudflare Workers** template, scoped to the account and the `timezonehop.com` zone. Copy the Account ID from the dashboard home.
- [ ] **Step 2:** create a private GitHub repo `timezonehop`.
  - If `gh` is authenticated: `gh repo create timezonehop --private --source . --push`.
  - Otherwise the owner creates it in the browser, and we run `git remote add origin … && git push -u origin main`.
- [ ] **Step 3 (owner):** add repository secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` (Settings → Secrets and variables → Actions).
- [ ] **Step 4:** trigger the workflow (`gh workflow run deploy.yml`, or push). Expected: the workflow is green, and `https://timezonehop.com/time/tokyo` returns 200 with a ticking clock.
- [ ] **Step 5 (owner, guided):** in the Cloudflare dashboard:
  - Rules → Redirect Rules → template **"Redirect from WWW to root"** (adds the proxied `www` DNS record).
  - Email → Email Routing: `hello@timezonehop.com` → owner inbox.
  - Analytics → Web Analytics: enable for the site.
  - Caching → Configuration: Crawler Hints **on**.
  - AI Crawl Control: allow search crawlers.
- [ ] **Step 6:** verify with `curl -sI https://www.timezonehop.com/time/tokyo` (expect 301 → apex), `curl -sI https://timezonehop.com/time/tokyo/` (expect a redirect to no trailing slash), and `curl -s https://timezonehop.com/robots.txt`.
- [ ] **Step 7 (owner, guided):** add the domain property in Google Search Console (DNS TXT verification in Cloudflare) and submit `https://timezonehop.com/sitemap-index.xml`. Do the same in Bing Webmaster Tools (import from Search Console).
- [ ] **Step 8:** set the spec's Status line to `Live since YYYY-MM-DD` and commit with `git commit -am "docs: record launch date"`.
- [ ] **Later (weeks 2–4, owner, guided):** apply to AdSense. After approval, set the repository variables `PUBLIC_ADSENSE_CLIENT`, `PUBLIC_AD_SLOT_*`, and `PUBLIC_ADS_ENABLED=true`, and turn on the AdSense **Privacy & messaging** GDPR and US-state messages (spec §7).
