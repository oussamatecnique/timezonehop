// @vitest-environment happy-dom
import { it, expect, vi } from 'vitest';
import { loadPrefs, savePrefs } from '../../src/lib/prefs';

it('round-trips and survives broken storage', () => {
  savePrefs({ hour12: false, savedZones: [{ key: 'Africa/Casablanca', label: 'Rabat', token: 'rabat' }] });
  expect(loadPrefs()).toMatchObject({ hour12: false, savedZones: [{ key: 'Africa/Casablanca', label: 'Rabat', token: 'rabat' }] });
  // Older visits stored bare keys; junk entries are dropped.
  localStorage.setItem('tzh:prefs', JSON.stringify({ savedZones: ['Asia/Tokyo', 7, { label: 'no key' }, { key: 'Europe/Paris', label: 3 }] }));
  expect(loadPrefs().savedZones).toEqual([{ key: 'Asia/Tokyo' }, { key: 'Europe/Paris' }]);
  localStorage.setItem('tzh:prefs', '{not json');
  expect(loadPrefs()).toEqual({ hour12: null, theme: null, savedZones: [] });
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('blocked');
  });
  expect(loadPrefs()).toEqual({ hour12: null, theme: null, savedZones: [] });
  expect(() => savePrefs({ theme: 'dark' })).not.toThrow();
});
