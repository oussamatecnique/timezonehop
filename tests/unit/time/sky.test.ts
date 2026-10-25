import { describe, it, expect } from 'vitest';
import { skyPhase, SKY, INK } from '../../../src/lib/time/sky';

function lum(hex: string) {
  const c = [1, 3, 5]
    .map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
const contrast = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

describe('skyPhase', () => {
  it('default hour-based phases', () => {
    expect([0, 300, 360, 420, 1019, 1020, 1140, 1260].map(m => skyPhase(m)))
      .toEqual(['night', 'dawn', 'dawn', 'day', 'day', 'dusk', 'evening', 'night']);
  });

  it('sun-based phases wrap past midnight', () => {
    const sun = { rise: 240, set: 1320 };
    expect(skyPhase(210, sun)).toBe('dawn');
    expect(skyPhase(30, sun)).toBe('evening');
    expect(skyPhase(90, sun)).toBe('night');
    expect(skyPhase(30, 'polar-day')).toBe('day');
    expect(skyPhase(720, 'polar-night')).toBe('night');
  });

  it('every sky has AA contrast for its ink', () => {
    for (const s of Object.values(SKY)) {
      expect(contrast(INK[s.ink], s.from)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(INK[s.ink], s.to)).toBeGreaterThanOrEqual(4.5);
    }
  });
});
