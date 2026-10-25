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

export const MIN_ZONES = 2;
export const MAX_ZONES = 6;

export const UTC_ZONE: ConverterZone = { key: 'UTC', label: 'UTC', token: 'utc' };
export const LONDON_ZONE: ConverterZone = { key: 'Europe/London', label: 'London', token: 'london' };

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

/** A zone known only by its key (saved prefs, visitor zone). */
export function zoneFromSavedKey(key: string): ConverterZone | null {
  const ref = zoneFromKey(key);
  if (!ref) return null;
  if (key === 'UTC' || key === 'Etc/UTC') return UTC_ZONE;
  return { key, label: ref.kind === 'fixed' ? formatOffset(ref.offsetMinutes) : labelFromIana(key) };
}

export function initialZones(o: { pageZones: ConverterZone[]; visitorTz: string; saved: string[]; isHome: boolean }): ConverterZone[] {
  const isUtc = (k: string) => k === 'UTC' || k === 'Etc/UTC';
  const visitor: ConverterZone | null =
    isValidIana(o.visitorTz) && !isUtc(o.visitorTz) ? { key: o.visitorTz, label: `${labelFromIana(o.visitorTz)} (you)` } : null;

  if (o.isHome) {
    const saved = o.saved.map(zoneFromSavedKey).filter((z): z is ConverterZone => z !== null);
    if (saved.length >= MIN_ZONES) return saved.slice(0, MAX_ZONES);
    return visitor ? [visitor, UTC_ZONE] : [UTC_ZONE, LONDON_ZONE];
  }

  if (o.pageZones.length >= 2) return o.pageZones.slice(0, MAX_ZONES);
  const first = o.pageZones[0] ?? UTC_ZONE;
  let second = visitor && visitor.key !== first.key ? visitor : UTC_ZONE;
  if (second.key === first.key) second = LONDON_ZONE;
  return [first, second];
}
