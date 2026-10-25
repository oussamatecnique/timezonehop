/** Converter state transitions and share links. Pure functions, unit-tested. */
import { isValidIana, zoneFromKey } from '../../lib/time/zone';
import { formatOffset, labelFromIana } from '../../lib/time/format';

export interface ConverterZone {
  /** Zone key: IANA id or 'fixed:<minutes>' */
  key: string;
  label: string;
  /** Last URL segment of the zone's page, used in share links */
  token?: string;
}

export interface ConverterState {
  zones: ConverterZone[];
  anchor: 'now' | number;
  hour12: boolean;
}

export const MIN_ZONES = 1;
export const MAX_ZONES = 6;

export const UTC_ZONE: ConverterZone = { key: 'UTC', label: 'UTC', token: 'utc' };
/** Server-rendered stand-in for the visitor's own zone; the inline clock script fills it in before first paint. */
export const VISITOR_PLACEHOLDER: ConverterZone = { key: 'visitor', label: 'Your time' };

const isUtcKey = (k: string) => k === 'UTC' || k === 'Etc/UTC' || k === 'fixed:0';

export function addZone(s: ConverterState, z: ConverterZone): ConverterState {
  if (s.zones.length >= MAX_ZONES || s.zones.some(x => x.key === z.key)) return s;
  return { ...s, zones: [...s.zones, z] };
}

export function removeZone(s: ConverterState, i: number): ConverterState {
  if (s.zones.length <= MIN_ZONES || i < 0 || i >= s.zones.length) return s;
  return { ...s, zones: s.zones.filter((_, j) => j !== i) };
}

export function moveZone(s: ConverterState, i: number, dir: -1 | 1): ConverterState {
  const j = i + dir;
  if (i < 0 || j < 0 || i >= s.zones.length || j >= s.zones.length) return s;
  const zones = [...s.zones];
  [zones[i], zones[j]] = [zones[j], zones[i]];
  return { ...s, zones };
}

export function swapFirstTwo(s: ConverterState): ConverterState {
  return moveZone(s, 0, 1);
}

/** '?t=2026-10-25T14:07Z&z=new-york,london' */
export function serializeShare(s: ConverterState, now: number): string {
  const t = new Date(s.anchor === 'now' ? now : s.anchor).toISOString().slice(0, 16) + 'Z';
  const z = s.zones.map(x => encodeURIComponent(x.token ?? x.key)).join(',');
  return `?t=${t}&z=${z}`;
}

/** Defensive: ignores bad times, unknown or duplicate zones, and anything beyond MAX_ZONES. */
export function parseShare(
  search: string,
  resolve: (token: string) => ConverterZone | null,
): { zones?: ConverterZone[]; anchor?: number } {
  const params = new URLSearchParams(search);
  const out: { zones?: ConverterZone[]; anchor?: number } = {};
  const t = params.get('t');
  if (t && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}Z$/.test(t)) {
    const ms = Date.parse(t.replace('Z', ':00Z'));
    if (Number.isFinite(ms)) out.anchor = ms;
  }
  const tokens = (params.get('z') ?? '').split(',').map(s => s.trim()).filter(Boolean).slice(0, 24);
  const zones: ConverterZone[] = [];
  for (const token of tokens) {
    if (zones.length >= MAX_ZONES) break;
    const z = resolve(token);
    if (z && !zones.some(x => x.key === z.key)) zones.push(z);
  }
  if (zones.length >= MIN_ZONES) out.zones = zones;
  return out;
}

/**
 * Resolves share-link tokens (already URL-decoded by URLSearchParams): known zones first,
 * then search-index entries by their page slug, then raw zone keys. Bare words such as
 * 'cet' are only accepted via the index, never as legacy IANA aliases.
 */
export function makeResolver(
  known: ConverterZone[],
  entries: { n: string; u: string; z: string }[] = [],
): (token: string) => ConverterZone | null {
  return token => {
    const hit = known.find(z => z.token === token || z.key === token);
    if (hit) return hit;
    const entry = entries.find(e => e.u.split('/').pop() === token);
    if (entry) return { key: entry.z, label: entry.n, token };
    const looksLikeKey = token.includes('/') || token.startsWith('fixed:') || token === 'UTC';
    return looksLikeKey ? zoneFromSavedKey(token) : null;
  };
}

/** Stable server-rendered defaults (personalized on the client after mount). */
export function serverZones(pageZones: ConverterZone[], isHome: boolean): ConverterZone[] {
  if (isHome || pageZones.length === 0) return [VISITOR_PLACEHOLDER];
  if (pageZones.length >= 2) return pageZones.slice(0, MAX_ZONES);
  return [pageZones[0], VISITOR_PLACEHOLDER];
}

/** A zone known only by its key (saved prefs, visitor zone). */
export function zoneFromSavedKey(key: string): ConverterZone | null {
  const ref = zoneFromKey(key);
  if (!ref) return null;
  if (key === 'UTC' || key === 'Etc/UTC') return UTC_ZONE;
  return { key, label: ref.kind === 'fixed' ? formatOffset(ref.offsetMinutes) : labelFromIana(key) };
}

export function initialZones(o: { pageZones: ConverterZone[]; visitorTz: string; saved: string[]; isHome: boolean }): ConverterZone[] {
  const visitor: ConverterZone | null = isValidIana(o.visitorTz)
    ? { key: o.visitorTz, label: `${labelFromIana(o.visitorTz)} (you)` }
    : null;

  if (o.isHome) {
    const saved = o.saved
      .map(k => (visitor && k === visitor.key ? visitor : zoneFromSavedKey(k)))
      .filter((z): z is ConverterZone => z !== null);
    if (saved.length >= MIN_ZONES) return saved.slice(0, MAX_ZONES);
    return [visitor ?? UTC_ZONE];
  }

  if (o.pageZones.length >= 2) return o.pageZones.slice(0, MAX_ZONES);
  const first = o.pageZones[0] ?? UTC_ZONE;
  const sameAsPage = !visitor || visitor.key === first.key || (isUtcKey(visitor.key) && isUtcKey(first.key));
  return sameAsPage ? [first] : [first, visitor];
}
