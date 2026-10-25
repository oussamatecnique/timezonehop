import { describe, it, expect } from 'vitest';
import {
  addZone, removeZone, swapFirstTwo, serializeShare, parseShare, initialZones, makeResolver, serverZones, MAX_ZONES,
} from '../../../src/islands/converter/state';

const z = (key: string, token?: string) => ({ key, label: key, token });
const base = { zones: [z('America/New_York', 'new-york'), z('Europe/London', 'london')], anchor: 'now' as const, hour12: true };
const keys = (zones: { key: string }[]) => zones.map(x => x.key);

describe('state', () => {
  it('enforces limits and uniqueness', () => {
    let s = base;
    for (let i = 0; i < 10; i++) s = addZone(s, z(`fixed:${i * 60}`));
    expect(s.zones).toHaveLength(MAX_ZONES);
    expect(addZone(base, z('Europe/London')).zones).toHaveLength(2);
    const one = removeZone(base, 0);
    expect(keys(one.zones)).toEqual(['Europe/London']);
    expect(removeZone(one, 0).zones).toHaveLength(1); // never empty
    expect(swapFirstTwo(base).zones.map(x => x.key)).toEqual(['Europe/London', 'America/New_York']);
    expect(swapFirstTwo(one)).toEqual(one);
  });

  it('serializes and parses share links defensively', () => {
    const q = serializeShare({ ...base, anchor: Date.UTC(2026, 9, 25, 14, 7) }, 0);
    expect(q).toBe('?t=2026-10-25T14:07Z&z=new-york,london');
    const resolve = (t: string) => (['new-york', 'london', 'tokyo'].includes(t) ? z(t, t) : null);
    expect(parseShare(q, resolve)).toEqual({
      anchor: Date.UTC(2026, 9, 25, 14, 7), zones: [z('new-york', 'new-york'), z('london', 'london')],
    });
    const messy = parseShare('?t=garbage&z=tokyo,tokyo,nowhere,london,new-york,tokyo,london,london', resolve);
    expect(messy.anchor).toBeUndefined();
    expect(messy.zones!.map(x => x.key)).toEqual(['tokyo', 'london', 'new-york']);
    expect(parseShare('?z=nowhere', resolve)).toEqual({}); // no valid zone -> ignored
    expect(keys(parseShare('?z=tokyo', resolve).zones!)).toEqual(['tokyo']); // one zone is enough
    expect(parseShare('?t=2031-01-01T00:00Z', resolve).anchor).toBe(Date.UTC(2031, 0, 1)); // far future is allowed
  });

  it('resolves share tokens safely', () => {
    const known = [{ key: 'America/New_York', label: 'New York', token: 'new-york' }];
    const entries = [{ n: 'CET', u: '/timezone/cet', z: 'fixed:60' }];
    const bare = makeResolver(known);
    expect(() => parseShare('?z=new-york,lon%2', bare)).not.toThrow();
    expect(() => parseShare('?z=tokyo,%25', bare)).not.toThrow();
    expect(bare('new-york')).toEqual(known[0]);
    expect(bare('America/Chicago')).toEqual({ key: 'America/Chicago', label: 'Chicago' });
    expect(bare('fixed:330')).toEqual({ key: 'fixed:330', label: 'UTC+5:30' });
    expect(bare('cet')).toBeNull(); // a legacy IANA alias, not our CET abbreviation
    expect(makeResolver(known, entries)('cet')).toEqual({ key: 'fixed:60', label: 'CET', token: 'cet' });
  });

  it('never adds UTC by default', () => {
    const utcPage = [{ key: 'fixed:0', label: 'UTC', token: 'utc' }];
    expect(keys(initialZones({ pageZones: utcPage, visitorTz: 'UTC', saved: [], isHome: false }))).toEqual(['fixed:0']);
    expect(keys(initialZones({ pageZones: utcPage, visitorTz: 'Asia/Tokyo', saved: [], isHome: false })))
      .toEqual(['fixed:0', 'Asia/Tokyo']);
  });

  it('server-renders the visitor row as a placeholder the clock script fills in', () => {
    const page = [z('Asia/Tokyo', 'tokyo')];
    expect(keys(serverZones([], true))).toEqual(['visitor']);
    expect(keys(serverZones(page, false))).toEqual(['Asia/Tokyo', 'visitor']);
    expect(keys(serverZones([z('Asia/Tokyo'), z('Europe/Paris')], false))).toEqual(['Asia/Tokyo', 'Europe/Paris']);
  });

  it('picks initial zones', () => {
    const page = [z('Asia/Tokyo', 'tokyo')];
    expect(initialZones({ pageZones: page, visitorTz: 'America/Indiana/Knox', saved: [], isHome: false }).map(x => [x.key, x.label]))
      .toEqual([['Asia/Tokyo', 'Asia/Tokyo'], ['America/Indiana/Knox', 'Knox (you)']]);
    expect(keys(initialZones({ pageZones: page, visitorTz: 'Asia/Tokyo', saved: [], isHome: false }))).toEqual(['Asia/Tokyo']);
    expect(initialZones({ pageZones: [], visitorTz: 'Asia/Tokyo', saved: [], isHome: true }).map(x => [x.key, x.label]))
      .toEqual([['Asia/Tokyo', 'Tokyo (you)']]);
    expect(initialZones({ pageZones: [], visitorTz: 'UTC', saved: [], isHome: true }).map(x => [x.key, x.label]))
      .toEqual([['UTC', 'UTC (you)']]);
    expect(keys(initialZones({ pageZones: [], visitorTz: 'garbage', saved: [], isHome: true }))).toEqual(['UTC']);
    expect(keys(initialZones({ pageZones: [], visitorTz: 'Asia/Tokyo', saved: ['Asia/Dubai', 'Europe/Paris'], isHome: true })))
      .toEqual(['Asia/Dubai', 'Europe/Paris']);
    expect(keys(initialZones({ pageZones: [], visitorTz: 'Asia/Tokyo', saved: ['Asia/Dubai'], isHome: true }))).toEqual(['Asia/Dubai']);
    // A returning visitor's own saved zone keeps its "(you)" label.
    expect(initialZones({ pageZones: [], visitorTz: 'Asia/Tokyo', saved: ['Asia/Tokyo', 'Asia/Dubai'], isHome: true }).map(x => x.label))
      .toEqual(['Tokyo (you)', 'Dubai']);
  });
});
