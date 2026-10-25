/**
 * Live clocks for static pages. Inlined at the end of <body> so the first paint already
 * shows the right time. DOM contract:
 *   [data-zone]       zone key ('Asia/Tokyo' | 'fixed:-300' | 'visitor'), plus data-offset
 *                     (build-time minutes, fallback for old browsers) and data-label (fixed zones)
 *   [data-clock]      data-format: time | time-seconds | hm | sec | ampm | date-long | date-short | abbr | offset | zone
 *                     (zone taken from the closest [data-zone])
 *   [data-diff-you]   "14 hours ahead of you"
 *   [data-sky]        gets class sky-<phase> and --t (fraction of the local day); optional
 *                     data-rise/data-set (minutes after local midnight) or data-polar="day|night"
 */
import { fixed, iana, isValidIana, offsetAt, zoneFromKey, zonedParts, formatOffset, type ZoneRef } from '../lib/time/zone';
import { formatDate, formatDifference, formatTime, zoneAbbreviation } from '../lib/time/format';
import { skyPhase, type SkyPhase, type SunMinutes } from '../lib/time/sky';
import { tc } from '../i18n/core';
import { effectiveHour12, PREFS_EVENT } from '../lib/prefs';

const PHASES: SkyPhase[] = ['night', 'dawn', 'day', 'dusk', 'evening'];
const pad = (n: number) => String(n).padStart(2, '0');

const resolved = new WeakMap<Element, { key: string; zone: ZoneRef; stale: boolean }>();

function zoneFor(el: Element, visitor: ZoneRef): { zone: ZoneRef; stale: boolean } {
  const host = el.closest('[data-zone]') ?? el;
  const raw = host.getAttribute('data-zone') ?? 'UTC';
  if (raw === 'visitor') return { zone: visitor, stale: false };
  const cached = resolved.get(host);
  if (cached && cached.key === raw) return cached;
  const label = host.getAttribute('data-label') ?? undefined;
  let zone = zoneFromKey(raw, label);
  let stale = false;
  if (!zone) {
    const off = Number(host.getAttribute('data-offset'));
    zone = fixed(Number.isFinite(off) ? off : 0, label ?? formatOffset(Number.isFinite(off) ? off : 0));
    stale = true;
  }
  const entry = { key: raw, zone, stale };
  resolved.set(host, entry);
  return entry;
}

function setText(el: Element, text: string) {
  if (el.textContent !== text) el.textContent = text;
}

function clockText(format: string, zone: ZoneRef, now: number, hour12: boolean): string {
  switch (format) {
    case 'time-seconds': return formatTime(zone, now, { hour12, seconds: true });
    case 'hm': {
      const p = zonedParts(zone, now);
      return hour12 ? `${p.hour % 12 || 12}:${pad(p.minute)}` : `${pad(p.hour)}:${pad(p.minute)}`;
    }
    case 'sec': return `:${pad(zonedParts(zone, now).second)}`;
    case 'ampm': return hour12 ? tc(zonedParts(zone, now).hour < 12 ? 'time.am' : 'time.pm') : '';
    case 'date-long': return formatDate(zone, now, 'long');
    case 'date-short': return formatDate(zone, now, 'short');
    case 'abbr': return zoneAbbreviation(zone, now);
    case 'offset': return formatOffset(offsetAt(zone, now));
    case 'zone': {
      const abbr = zoneAbbreviation(zone, now);
      const off = formatOffset(offsetAt(zone, now));
      return abbr === off ? off : `${abbr} (${off})`;
    }
    default: return formatTime(zone, now, { hour12 });
  }
}

function sunOf(el: Element): SunMinutes | undefined {
  const polar = el.getAttribute('data-polar');
  if (polar === 'day') return 'polar-day';
  if (polar === 'night') return 'polar-night';
  const rise = el.getAttribute('data-rise');
  const set = el.getAttribute('data-set');
  return rise !== null && set !== null ? { rise: Number(rise), set: Number(set) } : undefined;
}

export function renderClocks(root: ParentNode, now: number, hour12: boolean, visitorTz: string): void {
  const visitor = isValidIana(visitorTz) ? iana(visitorTz) : iana('UTC');

  for (const el of root.querySelectorAll('[data-clock]')) {
    const { zone, stale } = zoneFor(el, visitor);
    setText(el, clockText(el.getAttribute('data-format') ?? 'time', zone, now, hour12));
    if (stale) el.setAttribute('data-stale', '');
  }

  const visitorOffset = offsetAt(visitor, now);
  for (const el of root.querySelectorAll('[data-diff-you]')) {
    const { zone } = zoneFor(el, visitor);
    const diff = offsetAt(zone, now) - visitorOffset;
    const vars = { diff: formatDifference(diff) };
    setText(el, diff > 0 ? tc('you.ahead', vars) : diff < 0 ? tc('you.behind', vars) : tc('you.same'));
  }

  for (const el of root.querySelectorAll('[data-sky]')) {
    const { zone } = zoneFor(el, visitor);
    const p = zonedParts(zone, now);
    const minutes = p.hour * 60 + p.minute;
    const phase = skyPhase(minutes, sunOf(el));
    if (!el.classList.contains(`sky-${phase}`)) {
      for (const ph of PHASES) el.classList.remove(`sky-${ph}`);
      el.classList.add(`sky-${phase}`);
    }
    (el as HTMLElement).style?.setProperty('--t', (minutes / 1440).toFixed(4));
  }
}

export function startClocks(): void {
  let visitorTz = 'UTC';
  try {
    visitorTz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    // keep UTC
  }
  let timer: ReturnType<typeof setTimeout> | undefined;
  const tick = () => {
    const now = Date.now();
    renderClocks(document, now, effectiveHour12(), visitorTz);
    clearTimeout(timer);
    if (document.visibilityState !== 'hidden') timer = setTimeout(tick, 1000 - (now % 1000) + 5);
  };
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') clearTimeout(timer);
    else tick();
  });
  window.addEventListener(PREFS_EVENT, tick);
  tick();
}
