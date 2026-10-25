import { describe, it, expect } from 'vitest';
import { iana, fixed } from '../../../src/lib/time/zone';
import { transitions, nextTransition, observesDst, standardOffset } from '../../../src/lib/time/transitions';

const U = Date.UTC;

describe('transitions', () => {
  it('finds 2026 DST changes to the minute', () => {
    expect(transitions(iana('America/New_York'), 2026)).toEqual([
      { instant: U(2026, 2, 8, 7), offsetBefore: -300, offsetAfter: -240 },
      { instant: U(2026, 10, 1, 6), offsetBefore: -240, offsetAfter: -300 },
    ]);
    expect(transitions(iana('Europe/London'), 2026).map(t => t.instant)).toEqual([U(2026, 2, 29, 1), U(2026, 9, 25, 1)]);
    expect(transitions(iana('Australia/Sydney'), 2026).map(t => t.instant)).toEqual([U(2026, 3, 4, 16), U(2026, 9, 3, 16)]);
    expect(transitions(iana('Asia/Tokyo'), 2026)).toEqual([]);
    expect(transitions(fixed(-300, 'EST'), 2026)).toEqual([]);
  });

  it('finds the next transition and DST facts', () => {
    expect(nextTransition(iana('America/New_York'), U(2026, 9, 25, 12))?.instant).toBe(U(2026, 10, 1, 6));
    expect(nextTransition(iana('Asia/Tokyo'), U(2026, 9, 25))).toBeNull();
    expect(observesDst(iana('Europe/Paris'), 2026)).toBe(true);
    expect(observesDst(iana('America/Phoenix'), 2026)).toBe(false);
    expect(standardOffset(iana('Europe/Paris'), 2026)).toBe(60);
  });
});
