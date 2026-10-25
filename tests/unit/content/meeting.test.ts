import { it, expect } from 'vitest';
import { meetingWindow } from '../../../src/lib/content/meeting';

it('overlaps and compromises', () => {
  expect(meetingWindow(300)).toEqual({ kind: 'overlap', fromStart: 540, fromEnd: 720, toStart: 840, toEnd: 1020 });
  expect(meetingWindow(-300)).toEqual({ kind: 'overlap', fromStart: 840, fromEnd: 1020, toStart: 540, toEnd: 720 });
  expect(meetingWindow(330)).toEqual({ kind: 'overlap', fromStart: 540, fromEnd: 690, toStart: 870, toEnd: 1020 });
  expect(meetingWindow(0)).toEqual({ kind: 'overlap', fromStart: 540, fromEnd: 1020, toStart: 540, toEnd: 1020 });
  expect(meetingWindow(780)).toEqual({ kind: 'compromise', fromHour: 18, toMinutes: 420 });
});
