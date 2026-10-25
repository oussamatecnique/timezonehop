// @vitest-environment happy-dom
import { it, expect, vi } from 'vitest';
import { loadPrefs, savePrefs } from '../../src/lib/prefs';

it('round-trips and survives broken storage', () => {
  savePrefs({ hour12: false, savedZones: ['Asia/Tokyo'] });
  expect(loadPrefs()).toMatchObject({ hour12: false, savedZones: ['Asia/Tokyo'] });
  localStorage.setItem('tzh:prefs', '{not json');
  expect(loadPrefs()).toEqual({ hour12: null, theme: null, savedZones: [] });
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('blocked');
  });
  expect(loadPrefs()).toEqual({ hour12: null, theme: null, savedZones: [] });
  expect(() => savePrefs({ theme: 'dark' })).not.toThrow();
});
