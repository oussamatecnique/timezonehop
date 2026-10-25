import { describe, it, expect } from 'vitest';
import {
  addZone, removeZone, swapFirstTwo, serializeShare, parseShare, initialZones, MAX_ZONES,
} from '../../../src/islands/converter/state';

const z = (key: string, token?: string) => ({ key, label: key, token });
const base = { zones: [z('America/New_York', 'new-york'), z('Europe/London', 'london')], anchor: 'now' as const, hour12: true };

describe('state', () => {
  it('enforces limits and uniqueness', () => {
    let s = base;
    for (let i = 0; i < 10; i++) s = addZone(s, z(`fixed:${i * 60}`));
    expect(s.zones).toHaveLength(MAX_ZONES);
    expect(addZone(base, z('Europe/London')).zones).toHaveLength(2);
    expect(removeZone(base, 0).zones).toHaveLength(2);
    expect(swapFirstTwo(base).zones.map(x => x.key)).toEqual(['Europe/London', 'America/New_York']);
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
    expect(parseShare('?z=nowhere', resolve)).toEqual({}); // < 2 valid zones -> ignored
    expect(parseShare('?t=2031-01-01T00:00Z', resolve).anchor).toBe(Date.UTC(2031, 0, 1)); // far future is allowed
  });

  it('picks initial zones', () => {
    const page = [z('Asia/Tokyo', 'tokyo')];
    expect(initialZones({ pageZones: page, visitorTz: 'America/Indiana/Knox', saved: [], isHome: false }).map(x => [x.key, x.label]))
      .toEqual([['Asia/Tokyo', 'Asia/Tokyo'], ['America/Indiana/Knox', 'Knox (you)']]);
    expect(initialZones({ pageZones: page, visitorTz: 'Asia/Tokyo', saved: [], isHome: false })[1].key).toBe('UTC');
    expect(initialZones({ pageZones: [], visitorTz: 'garbage', saved: [], isHome: true }).map(x => x.key))
      .toEqual(['UTC', 'Europe/London']);
    expect(initialZones({ pageZones: [], visitorTz: 'Asia/Tokyo', saved: ['Asia/Dubai', 'Europe/Paris'], isHome: true }).map(x => x.key))
      .toEqual(['Asia/Dubai', 'Europe/Paris']);
  });
});
