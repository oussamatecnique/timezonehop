# TimezoneHop — Design Spec

**Date:** 2026-10-25
**Domain:** timezonehop.com (verified available 2026-10-25, to be registered at Cloudflare Registrar)
**Status:** Live since 2026-10-25 (https://timezonehop.com)

---

## 1. Goal & success criteria

A world-time website whose job is to attract large volumes of organic search traffic and monetize it with Google AdSense.

**What it does for users**
- Shows the current time in any city, country, or timezone.
- Converts a time between two zones, with optional extra zones for meeting planning.

**Success criteria**
- Every page is pre-rendered HTML, readable by crawlers with no JavaScript.
- Lighthouse (mobile): Performance ≥ 95, SEO = 100, Accessibility ≥ 95, Best Practices ≥ 95 (measured with ads disabled).
- Core Web Vitals: LCP < 2.0 s on simulated slow 4G, CLS < 0.02, INP < 100 ms.
- Per-page payload budgets: JS ≤ 35 KB gzip (excluding ads), CSS ≤ 15 KB gzip, font ≤ 30 KB.
- ~5,700 indexable pages at launch, each with a unique title, description, H1, and computed facts.
- Passes AdSense site review: original useful content plus About, Privacy, Terms, and Contact pages.

**Decisions made with the owner**
| Decision | Choice |
|---|---|
| Site shape | One tool + programmatically generated landing pages |
| Languages | English at launch, URL/i18n structure ready for `/fr/`, `/es/`, … |
| Converter | Starts with the visitor's own zone (plus the page's subject); "Add city or timezone" up to 6 zones; no UTC by default (owner request 2026-10-25); drag timeline |
| Stack | Astro (static) + Preact islands, hosted on Cloudflare (free tier) |
| Domain | timezonehop.com |
| Visual direction | "Sky-tinted clocks"; owner delegated details: fast, performant, user-friendly |

**Out of scope for v1 (YAGNI):** user accounts, any server or database, languages other than English, embeddable widgets, calendar (.ics) export, clock-accuracy checks against a time server.

---

## 2. Pages & URLs

All URLs have **no trailing slash**. Every page shares one layout and the same live tool, pre-set for that page's subject.

| Type | URL pattern | Example | v1 count |
|---|---|---|---|
| Home | `/` | — | 1 |
| City time | `/time/{city}` | `/time/tokyo` | ~1,000 |
| Country time | `/time/{country}` | `/time/japan`, `/time/usa` | ~250 |
| Timezone (abbreviation) | `/timezone/{abbr}` | `/timezone/est` | ~40 |
| Timezone (UTC offset) | `/timezone/utc-plus-{h}[-{mm}]`, `/timezone/utc-minus-{h}[-{mm}]`, `/timezone/utc` | `/timezone/utc-plus-5-30` | ~38 |
| Converter pair | `/convert/{a}-to-{b}` | `/convert/est-to-pst`, `/convert/new-york-to-london` | ~4,410 |
| DST dates | `/daylight-saving-time` | — | 1 |
| Indexes (hubs) | `/time`, `/timezone`, `/convert` | — | 3 |
| Trust pages | `/about`, `/privacy`, `/terms`, `/contact` | — | 4 |
| 404 | `/404` | — | 1 (noindex) |

The UTC-offset slug uses `plus`/`minus` instead of `+`, so URLs never need percent-encoding. This replaces the `utc+5-30` example discussed in chat.

### Slug rules
- Slug = ASCII name, lowercased, every run of non-alphanumerics replaced by `-`, trimmed.
- **Country slugs win** over city slugs. A city whose slug collides with a country gets `-city` appended (e.g. `luxembourg-city`). A city-state whose city and country are the same entity (Singapore, Monaco, Vatican, …) gets no separate city page; its name becomes a search alias of the country page.
- **City vs. city collisions:** the most populous city keeps the bare slug. Others get `-{admin1}` for countries with meaningful states/provinces (US, CA, AU, BR, MX, IN, RU, CN, DE, …), otherwise `-{country}` (e.g. `portland` → Portland, Oregon; `portland-maine`).
- Country overrides: United States → `usa`, United Kingdom → `uk`, United Arab Emirates → `uae`. All other countries use their slugified GeoNames name.
- Pair slugs are generated from the catalogue, never parsed from URLs, so a `-to-` inside a city slug is harmless. Every pair produces two pages, one per direction (`est-to-pst` and `pst-to-est`).

### Pair selection
- **Abbreviation pairs:** the 30 most-searched abbreviations (curated list) × each other = 870 pages.
- **City pairs:** the 60 most-searched cities (curated list, not raw population) × each other = 3,540 pages.

### Internal linking
- Hub pages list all pages of their type, A–Z, grouped by letter/region.
- Every inner page has breadcrumbs (`Home › Time › Japan › Tokyo`) and "related" link blocks (same-zone cities, popular conversions from/to this place, the reverse pair).
- Every page is reachable within 3 clicks of `/`.

### i18n readiness
- English lives at the root. All user-facing strings go through `src/i18n/en.ts` via a `t()` helper.
- Head tags emit `hreflang="en"` and `hreflang="x-default"` now; more locales later get prefixes (`/fr/time/tokyo`).

---

## 3. Page content (what makes each page useful)

All facts are computed at build time from the timezone database and refreshed by a **daily rebuild**. Client JS recomputes live values (clock, "difference from you", today's sun times) in the visitor's context.

### City page — `/time/tokyo`
- **H1:** "Current time in Tokyo, Japan"
- Sky-tinted live clock card: time with seconds, date, zone abbreviation, UTC offset.
- "X hours ahead of/behind you" (client-side).
- **Facts:** time zone name, IANA id, UTC offset, DST status ("does not observe DST" or "DST ends Sun, Nov 1, 2026 at 2:00 AM; clocks go back 1 hour"), sunrise/sunset today, coordinates, population, country (linked).
- **Time difference table** against 8 reference cities (London, New York, Los Angeles, Dubai, New Delhi, Singapore, Tokyo, Sydney; the page's own city is swapped for Paris).
- Converter pre-filled: this city → visitor's local zone (client-side; static fallback: → UTC). If the visitor is already in the city's zone, the second row stays UTC.
- **Related:** other cities in the same zone, popular conversions involving this city (if it's in the top 60), nearby major cities in the same country.
- **Q&A** (visible text, no FAQ schema): "What time zone is Tokyo in?", "Does Tokyo observe daylight saving time?", "What is the time difference between Tokyo and New York?"

### Country page — `/time/japan`
- Single-zone country: same structure as the city page, with the capital as reference point.
- Multi-zone country (USA, Canada, Russia, Australia, Brazil, Mexico, Indonesia, …): a list of zones, each with a live clock and its main cities; country DST rules; link to every city page in the country.

### Timezone page — `/timezone/est`
- **H1:** "EST — Eastern Standard Time (UTC−5)"
- Live clock at that fixed offset.
- Definition, the regions that use it, and its standard/daylight sibling (EST ↔ EDT).
- **"Currently in effect" note:** e.g. "Most places that use EST are on EDT (UTC−4) until Nov 1, 2026. New York is currently UTC−4," linking to the city page.
- Conversion links (EST → PST, CST, GMT, IST, …).
- UTC-offset pages (`/timezone/utc-plus-5-30`) list every catalogued city currently at that offset.

**Abbreviation semantics:** an abbreviation page or pair is a **fixed UTC offset** (EST is always UTC−5). Because searchers often mean "the local time in that region", every abbreviation page and abbreviation pair shows the "currently in effect" note and links to the DST-aware city equivalent (`est-to-ist` → `new-york-to-kolkata` when both exist).

Ambiguous abbreviations resolve to the most-searched meaning, with the alternatives noted on the page: `IST` = India (Israel and Irish noted), `CST` = US Central (China noted), `BST` = British Summer Time (Bangladesh noted).

### Converter pair page — `/convert/new-york-to-london`
- **H1:** "New York to London Time Converter"
- Summary sentence: "London is 5 hours ahead of New York. When it is 9:00 AM in New York, it is 2:00 PM in London."
- The live converter, pre-filled with both zones.
- **24-hour conversion table:** each hour of A (00:00–23:00) → time in B, with "+1 day"/"−1 day" markers.
- **Best time to meet:** overlap of 09:00–17:00 local working hours in both places, or the closest compromise when there is no overlap.
- **DST notes** (city pairs): every transition in the next 12 months for either side, and how the difference changes, e.g. "From Mar 8 to Mar 29, 2026 the difference is 4 hours instead of 5."
- Related links: reverse pair, A → other popular cities, other popular cities → B.

### DST page — `/daylight-saving-time`
- A table of every country/zone in the catalogue that observes DST, with start and end dates for the current and next year (computed), plus a short explainer. Targets seasonal "when does daylight saving time end" searches.

### Home — `/`
- H1 "World Clock & Time Zone Converter"
- Hero: the visitor's local time (client-side).
- Converter: visitor's zone → a sensible default (UTC on first visit; afterwards the visitor's saved zones).
- "Popular cities" grid of sky-tinted mini clocks (12 cities).
- Short guide text (how to use, what UTC is) and links to hubs.

### Trust pages
- **About:** who we are, data sources (GeoNames CC BY 4.0 attribution, IANA tz database via browser `Intl`).
- **Privacy:** cookies used by AdSense, Google's consent tools, cookie-less Cloudflare Web Analytics, localStorage preferences.
- **Terms:** standard terms with an accuracy disclaimer.
- **Contact:** a `mailto:` link to a dedicated address (owner to create, e.g. `hello@timezonehop.com` via Cloudflare Email Routing).

---

## 4. UI/UX & visual design

### Concept: sky-tinted clocks
Every clock card's background is a gradient matching that place's sky right now: night (deep indigo), dawn (peach/rose), day (clear blue), dusk (amber/violet). It answers "is it night there?" at a glance.

- Phase comes from real sunrise/sunset when coordinates are known (cities), otherwise from local hour (night <5 or ≥21, dawn 5–7, day 7–17, dusk 17–19, evening 19–21).
- Gradients interpolate smoothly between phases.
- Text on cards always meets WCAG AA contrast against its gradient (light text on night/dusk, dark text on day).

### Layout (mobile-first)
```
Header:   logo · search (press "/" to focus) · light/dark toggle
Hero:     H1 + sky clock card + "X hours ahead of you"
Tool:     zone rows (name · time · 24h sky strip with 9–17 highlighted)
          drag timeline · [+ Add city] [⇅ Swap] [Now] [Copy link]
Ad slot:  reserved size (only when ads are enabled)
Content:  facts · tables · Q&A · related links
Footer:   hub links · trust pages · GeoNames attribution
```
- Desktop (≥ 1024 px): tool and facts in two columns; a sticky sidebar ad slot.

### Interaction details
- **Timeline:** horizontal drag across a 24 h range around the anchor. Snaps to 15 min; arrow keys ±15 min; Shift+arrow ±1 h; Home/End jump to the start/end of the range. All rows update live. The thumb updates with CSS transforms only (60 fps). "Now" returns to live mode, where the clocks tick again.
- **Zone rows:** 1–6 rows. Any row can be removed while 2+ remain. Rows can be reordered with up/down buttons (no drag-reorder in v1). Swap (shown with 2+ rows) exchanges rows 1 and 2.
- **12h/24h:** default from the visitor's locale (`Intl.DateTimeFormat().resolvedOptions().hourCycle`); toggle in the tool; persisted.
- **Copy link:** writes `?t=<UTC ISO minute>&z=<slug>,<slug>,…` to the clipboard. Opening such a URL restores that state. The canonical URL never includes query parameters. The page's URL is only updated (`history.replaceState`) when the visitor presses Copy link, so normal browsing keeps clean URLs.
- **Saved zones:** on the home page, the visitor's last converter zones are remembered.
- **Search:** one search box (header) serving both navigation and "Add city". It matches cities, countries, abbreviations, and offsets ("utc+5:30", "gmt-3"). Matching is accent-insensitive, prefix-first, then substring, with edit-distance-1 typo tolerance for queries ≥ 4 chars. Aliases cover NYC, LA, SF, Bombay, Peking, etc. Keyboard: ↑/↓ to move, Enter to choose, Esc to close. The index (`/search-index.json`, ~25 KB gzip) loads on first focus.

### Visual system
- **Typeface:** Manrope Variable (self-hosted Latin subset, `font-display: swap`, metric-matched fallback via `size-adjust` to avoid layout shift). Clock digits use `font-variant-numeric: tabular-nums`.
- **Tokens** (CSS custom properties): colors, spacing scale (4 px base), radii, shadows, sky gradients. Light and dark themes: automatic via `prefers-color-scheme`, overridable with `data-theme` on `<html>` (persisted).
- **Motion:** subtle transitions (150–250 ms) on gradient changes and row add/remove. Under `prefers-reduced-motion: reduce`, animation is off except the ticking seconds.

### Accessibility
- All controls reachable and operable by keyboard. Visible focus rings.
- Timeline is a proper `role="slider"` with `aria-valuetext` ("9:00 AM in New York").
- Live clock regions are **not** announced every second. Changes from the slider are announced politely via a throttled `aria-live` region.
- Touch targets ≥ 44 × 44 px. Contrast ≥ WCAG AA everywhere.

---

## 5. Architecture

### Stack
- **Astro 7** (`output: 'static'`, `build.format: 'file'`, `trailingSlash: 'never'`), TypeScript strict.
- **Preact 11 + @preact/signals** for interactive islands only.
- Plain CSS with custom properties (Astro scoped styles + `src/styles/tokens.css`). No CSS framework.
- **@astrojs/sitemap** for sitemaps.
- **Vitest** (unit), **Playwright** (e2e smoke).
- No runtime date library: all timezone math uses the built-in `Intl` API, which ships the IANA tz database.

### Directory layout
```
astro.config.mjs  package.json  tsconfig.json  wrangler.jsonc
public/            favicon.svg, og/*.png, _headers
scripts/
  build-data.ts    # GeoNames → src/data/generated/*.json (run manually, output committed)
src/
  data/
    generated/     cities.json, countries.json      (committed; builds never hit the network)
    abbreviations.ts   # curated abbreviation table (offset, names, regions, ambiguity notes, sibling)
    zone-labels.ts     # IANA id → {std, dst} display abbreviation + long names (Intl doesn't give "JST")
    popular.ts         # top-60 cities, top-30 abbreviations, home grid, reference cities
    aliases.ts         # search aliases
    catalog.ts         # SINGLE SOURCE OF TRUTH: every entity, slug, page, pair
  lib/
    time/              # pure, isomorphic (build + browser)
      zone.ts          # ZoneRef, offsetAt, zonedParts, zonedToInstant
      transitions.ts   # DST transitions for a zone/year
      format.ts        # time/date/offset/difference formatting
      sun.ts           # sunrise/sunset (NOAA algorithm)
      sky.ts           # phase + gradient for a zone/instant
    content/           # build-time page content: city.ts, country.ts, timezone.ts, pair.ts, dst.ts
    seo/               # meta.ts (titles/descriptions), jsonld.ts
    search/            # normalize.ts, match.ts
    prefs.ts           # localStorage preferences (try/catch, defaults on failure)
  i18n/en.ts
  components/          # Layout, Header, Footer, Breadcrumbs, SkyClockCard, FactsList,
                       # ConversionTable, DifferenceTable, Faq, RelatedLinks, AdSlot
  islands/             # Converter.tsx, ZoneRow.tsx, Timeline.tsx, SearchBox.tsx
  scripts/
    clock-runtime.ts   # tiny vanilla ticker for every [data-clock] element
    ads.ts             # lazy AdSense loader
  styles/              # tokens.css, global.css
  pages/
    index.astro
    time/index.astro, time/[slug].astro
    timezone/index.astro, timezone/[slug].astro
    convert/index.astro, convert/[pair].astro
    daylight-saving-time.astro, about.astro, privacy.astro, terms.astro, contact.astro, 404.astro
    search-index.json.ts, robots.txt.ts
tests/
  unit/  e2e/
.github/workflows/deploy.yml
```

### Core units

**`ZoneRef`** — the one type every part of the system uses to name a zone:
```ts
type ZoneRef =
  | { kind: 'iana';  id: string }                            // e.g. 'Asia/Tokyo'
  | { kind: 'fixed'; offsetMinutes: number; label: string }; // e.g. EST = -300
```

**`lib/time/zone.ts`**
- `offsetAt(zone, instant): number` returns the offset in minutes. IANA zones use a cached `Intl.DateTimeFormat` with `formatToParts`. Fixed zones return their constant.
- `zonedParts(zone, instant)` returns `{year, month, day, hour, minute, second, weekday}`.
- `zonedToInstant(zone, wallTime)` converts a local wall-clock time to a UTC instant. A **gap** (nonexistent time during spring-forward) moves forward by the gap length. An **overlap** (fall-back) picks the earlier, pre-transition offset.
- Formatters are cached per zone id. Constructing `Intl.DateTimeFormat` is the main build-time cost.

**`lib/time/transitions.ts`**
- `transitions(zone, year)` returns `[{instant, offsetBefore, offsetAfter}]`. It samples offsets every 24 h across the year, then bisects to the minute where the offset changes. Memoized.

**`lib/time/sun.ts`**
- `sunTimes(lat, lon, date)` returns `{sunrise, sunset} | {polar: 'day' | 'night'}` using the NOAA solar position algorithm (~80 lines, no dependency).

**`data/catalog.ts`**
- Builds all entities (cities, countries, abbreviations, offsets) with slugs, applying the collision rules, and produces the page lists used by `getStaticPaths`, the search index, hub pages, and related links.
- Pages, sitemap, and search can never disagree because they all read from this catalogue.

**`scripts/clock-runtime.ts`** (vanilla, ~1 KB, inlined)
- Finds `[data-clock]` elements (attributes: zone, format, show-seconds) and updates their text. Uses one shared `setTimeout` aligned to the next second boundary.
- Also sets the sky gradient class.
- Runs synchronously right after the hero markup, so the first paint already shows the correct time (no flash of build-time time).
- Pauses while the tab is hidden (`visibilitychange`).

**`islands/Converter.tsx`** (hydrated `client:idle`)
- Signals: `zones: ZoneRef[]` (2–6), `anchor: 'now' | instant`, `hour12: boolean`.
- Initial state comes from page props, then URL params (if valid), then saved prefs (home page only).
- Server-rendered with the page's default zones, so the converter markup exists in the static HTML before hydration.

**`islands/SearchBox.tsx`** (hydrated `client:idle`; fetches its index on first focus).

### Data pipeline
- `scripts/build-data.ts`, run manually with `npm run data`. It downloads the GeoNames files `cities15000.txt`, `countryInfo.txt`, and `admin1CodesASCII.txt` (CC BY 4.0). It then selects all capitals (`PPLC`) plus the most populous cities until ~1,000 cities in total, guaranteeing every country its capital. It emits compact JSON to `src/data/generated/`, which is committed.
- Every IANA id in the generated data is validated against `Intl.supportedValuesOf('timeZone')` at build time. An unknown id fails the build.

### Build-time vs. client-time values
| Value | Build (static HTML) | Client |
|---|---|---|
| Offsets, DST dates, conversion tables, meeting overlap | ✅ computed for the build's UTC date | recomputed only by the converter as the user interacts |
| Live clock | — | ✅ inline runtime, before first paint |
| "Difference from you" | — | ✅ |
| Sunrise/sunset | ✅ for the build date (SEO text) | ✅ for the visitor's today |

The daily rebuild keeps static text correct across DST changes.

### Error handling
- **Unsupported zone in an old browser** (`RangeError` from `Intl`): catch it, show the build-time offset (embedded as a `data-` attribute) with a "your browser may not have the latest timezone data" note.
- **JavaScript disabled:** all facts, tables, and links are present. Clocks show the build-time snapshot labelled with its timestamp, and a `<noscript>` note explains that live clocks need JavaScript.
- **localStorage unavailable:** `prefs.ts` wraps every access in try/catch and falls back to defaults.
- **Invalid share-URL params:** unknown slugs and unparsable times are ignored silently; the page falls back to its default state.
- **Search index fails to load:** the box shows "Search unavailable, browse all cities" with a link to `/time`.
- **Data integrity:** the build fails on duplicate slugs, invalid IANA ids, or missing required fields.

---

## 6. SEO

- **Titles/descriptions** are generated per page type from templates in `lib/seo/meta.ts`, e.g.:
  - City: `Current Time in Tokyo, Japan (JST, UTC+9) | TimezoneHop`
  - Pair (abbr): `EST to PST Converter: Eastern to Pacific Time | TimezoneHop`
  - Pair (city): `New York to London Time Converter | TimezoneHop`
  - Descriptions include a computed fact (offset/difference) so they differ meaningfully.
  - A build-time test asserts all titles and descriptions are unique.
- **Canonical** tag on every page (absolute URL, no query, no trailing slash). The 404 page is `noindex`.
- **Structured data (JSON-LD):** `WebSite` + `Organization` (all pages), `BreadcrumbList` (inner pages), `WebApplication` (home and converter pages). No FAQPage schema, since Google no longer shows FAQ rich results for general sites; the Q&A stays as visible content.
- **Sitemaps:** `@astrojs/sitemap` with `lastmod` omitted. Daily rebuilds would otherwise mark every URL as changed every day, which teaches Google to ignore the field. `robots.txt` allows all and references the sitemap index.
- **Open Graph/Twitter:** one designed 1200×630 image per page type plus a page-specific title/description.
- **Speed is SEO:** static HTML, inlined critical CSS (`build.inlineStylesheets: 'auto'`), one font file, islands hydrated at idle, no render-blocking third-party scripts, ads loaded lazily.
- **Discovery:** Google Search Console and Bing Webmaster Tools (Bing also feeds DuckDuckGo and several AI search engines) both get the sitemap. Cloudflare **Crawler Hints** (IndexNow) is enabled so changes are pushed to Bing and Yandex.
- **AI crawlers:** in Cloudflare's AI Crawl Control, allow AI *search* crawlers (they cite and link sources, which brings visitors). Whether to block AI *training* crawlers is the owner's choice; it has no effect on Google ranking.
- **Content growth:** after launch, Search Console query data decides which cities, pairs, and languages to add next.

---

## 7. Monetization (Google AdSense)

- **Configuration via environment variables:**
  - `PUBLIC_ADSENSE_CLIENT` (e.g. `ca-pub-…`): when set, emits `<meta name="google-adsense-account">` for site verification and generates `/ads.txt`.
  - `PUBLIC_ADS_ENABLED=true`: renders ad slots and the loader. Until then the site has **no empty ad boxes**.
- **Placement** (manual units; Auto ads disabled so they can't shift the layout):
  1. Below the converter (responsive, reserved min-height).
  2. In the content, after the facts block.
  3. Desktop only: sticky sidebar 300×600.
  At most 3 units per page.
- **Lazy loading:** `ads.ts` injects the AdSense script after `load` + `requestIdleCallback`, on first user interaction, or after 3 s, whichever comes first, so ads never compete with the first paint.
- **Consent:** Google requires a Google-certified consent platform (CMP) for EEA/UK/Swiss visitors. Use AdSense's built-in **Privacy & messaging** GDPR message (free); also enable its US state privacy message. The privacy page documents this.
- **Application timing:** apply once the site is live and Google has indexed a meaningful number of pages (typically 2–4 weeks after launch).
- **Expectations (industry ranges, not guarantees):** utility/tool sites typically earn roughly $1–5 per 1,000 page views with AdSense, more with US/UK traffic. New domains usually need 3–6+ months of SEO growth before traffic is significant. Higher-paying ad networks (e.g. Mediavine, Raptive) open up at higher traffic thresholds.

---

## 8. Hosting & deployment

- **Host:** Cloudflare Workers with static assets (free plan: unlimited static requests and bandwidth, 20,000-file limit per deployment; v1 is ~5,800 files). Configured in `wrangler.jsonc`.
- **Repository:** private GitHub repo.
- **CI/CD (`.github/workflows/deploy.yml`):**
  - Triggers: push to `main`, a daily cron at 00:05 UTC, and manual dispatch.
  - Steps: `npm ci` → `npm test` → `npm run build` → `npx wrangler deploy`.
  - Secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`. Ad env vars are repository variables.
- **Domain:** timezonehop.com on Cloudflare Registrar (auto-renew on, account 2FA on). The apex is the canonical host; `www` 301-redirects to the apex via a Cloudflare redirect rule.
- **Headers (`public/_headers`):**
  - Hashed assets (`/_astro/*`): `Cache-Control: public, max-age=31536000, immutable`.
  - HTML: short cache.
  - Security headers: HSTS, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`.
  - No strict CSP in v1, because AdSense needs many origins.
- **Analytics:** Cloudflare Web Analytics (cookie-less, enabled in the dashboard) and Search Console. No GA4 in v1, which avoids extra JS and consent complexity.
- **Email:** Cloudflare Email Routing forwards `hello@timezonehop.com` to the owner's inbox.

### Launch checklist (owner + me)
1. Register timezonehop.com at Cloudflare Registrar *(owner)*.
2. Create a GitHub repo and a Cloudflare API token, and add them as repository secrets *(owner, guided)*.
3. First deploy and attach the custom domain; set up the www→apex redirect, Email Routing, Web Analytics, and Crawler Hints.
4. Verify Search Console and Bing Webmaster Tools, and submit the sitemap.
5. Weeks 2–4: apply to AdSense; once approved, set the env vars and enable the consent messages.
6. Ongoing: monthly Search Console review → expand pages and languages.

---

## 9. Testing & verification

- **Unit (Vitest), `lib/time`:**
  - Offsets for many zones, including half- and quarter-hour zones (Asia/Kolkata +5:30, Asia/Kathmandu +5:45, Pacific/Chatham +12:45/+13:45).
  - Known 2026 transitions: US Mar 8 / Nov 1, EU Mar 29 / Oct 25, Australia/Sydney Apr 5 / Oct 4.
  - Gap and overlap handling in `zonedToInstant`; fixed-offset zones.
  - Sunrise/sunset within ±2 min of NOAA reference values, including polar day/night.
- **Unit, data/catalog:** unique slugs, collision rules, every IANA id valid, pair counts as specified.
- **Unit, search:** normalization, aliases, typo tolerance, offset queries.
- **Unit, SEO:** all titles and descriptions unique and within length limits (title ≤ 60 chars where possible, description 120–160).
- **Build checks (script over `dist/`):** expected page counts per type, every internal link resolves, every page has exactly one H1, a canonical tag, and a title. The sitemap contains every indexable page.
- **E2E (Playwright, ~6 smoke tests):** home loads with ticking clock, converter drag/keyboard updates rows, swap, add/remove city, search navigates, share URL restores state. Run against `astro preview`.
- **Performance:** Lighthouse mobile run on 4 representative pages (home, city, abbreviation pair, city pair) must meet the budgets in §1, plus a JS bundle-size check.
