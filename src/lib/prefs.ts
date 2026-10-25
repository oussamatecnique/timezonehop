/** Per-visitor preferences in localStorage. Every access is guarded: storage can be blocked. */
import { defaultHour12 } from './time/format';

export interface Prefs {
  hour12: boolean | null;
  theme: 'light' | 'dark' | null;
  savedZones: string[];
}

export const PREFS_KEY = 'tzh:prefs';
/** Fired on window after prefs change, so clocks re-render. */
export const PREFS_EVENT = 'tzh:prefs';

const defaults = (): Prefs => ({ hour12: null, theme: null, savedZones: [] });

export function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return defaults();
    const v = JSON.parse(raw);
    return {
      hour12: typeof v?.hour12 === 'boolean' ? v.hour12 : null,
      theme: v?.theme === 'light' || v?.theme === 'dark' ? v.theme : null,
      savedZones: Array.isArray(v?.savedZones) ? v.savedZones.filter((s: unknown) => typeof s === 'string').slice(0, 6) : [],
    };
  } catch {
    return defaults();
  }
}

export function savePrefs(patch: Partial<Prefs>): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify({ ...loadPrefs(), ...patch }));
  } catch {
    // Storage blocked (private mode, quota): preferences just won't persist.
  }
  try {
    window.dispatchEvent(new Event(PREFS_EVENT));
  } catch {
    // Not in a browser.
  }
}

export function effectiveHour12(): boolean {
  return loadPrefs().hour12 ?? defaultHour12();
}
