/** "Sky-tinted clocks": which part of the day it is, and the colors for it. */

export type SkyPhase = 'night' | 'dawn' | 'day' | 'dusk' | 'evening';

/** Local sunrise/sunset as minutes after local midnight, or a polar state. */
export type SunMinutes = { rise: number; set: number } | 'polar-day' | 'polar-night';

const DEFAULT_SUN = { rise: 360, set: 1080 };
const DAY_MINUTES = 1440;

const within = (m: number, start: number, end: number) => {
  const len = (end - start + DAY_MINUTES) % DAY_MINUTES;
  return (m - start + DAY_MINUTES) % DAY_MINUTES < len;
};

/** Phase windows: dawn rise±60, day until set−60, dusk set±60, evening until set+180, else night. */
export function skyPhase(localMinutes: number, sun: SunMinutes = DEFAULT_SUN): SkyPhase {
  if (sun === 'polar-day') return 'day';
  if (sun === 'polar-night') return 'night';
  const m = ((localMinutes % DAY_MINUTES) + DAY_MINUTES) % DAY_MINUTES;
  const { rise, set } = sun;
  if (within(m, rise - 60, rise + 60)) return 'dawn';
  if (within(m, rise + 60, set - 60)) return 'day';
  if (within(m, set - 60, set + 60)) return 'dusk';
  if (within(m, set + 60, set + 180)) return 'evening';
  return 'night';
}

export const INK = { light: '#ffffff', dark: '#0b1220' } as const;

export const SKY: Record<SkyPhase, { from: string; to: string; ink: 'light' | 'dark' }> = {
  night: { from: '#0f1a3d', to: '#23306b', ink: 'light' },
  dawn: { from: '#f6b8a8', to: '#fde3c4', ink: 'dark' },
  day: { from: '#5fb4ee', to: '#a9dcff', ink: 'dark' },
  dusk: { from: '#f59e5b', to: '#b4639e', ink: 'dark' },
  evening: { from: '#3a3f8f', to: '#6a4c93', ink: 'light' },
};

/** A horizontal gradient with one color stop per phase (e.g. 24 hourly phases). */
export function skyStrip(phases: SkyPhase[]): string {
  const n = phases.length;
  const stops = phases.map((p, i) => `${SKY[p].from} ${(((i + 0.5) / n) * 100).toFixed(2)}%`);
  return `linear-gradient(90deg, ${stops.join(', ')})`;
}
