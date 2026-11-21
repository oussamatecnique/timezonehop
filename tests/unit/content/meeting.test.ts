import { it, expect } from 'vitest';
import { awakeWindow, meetingWindow } from '../../../src/lib/content/meeting';

it('overlaps and compromises', () => {
  expect(meetingWindow(300)).toEqual({ kind: 'overlap', fromStart: 540, fromEnd: 720, toStart: 840, toEnd: 1020 });
  expect(meetingWindow(-300)).toEqual({ kind: 'overlap', fromStart: 840, fromEnd: 1020, toStart: 540, toEnd: 720 });
  expect(meetingWindow(330)).toEqual({ kind: 'overlap', fromStart: 540, fromEnd: 690, toStart: 870, toEnd: 1020 });
  expect(meetingWindow(0)).toEqual({ kind: 'overlap', fromStart: 540, fromEnd: 1020, toStart: 540, toEnd: 1020 });
  expect(meetingWindow(780)).toEqual({ kind: 'compromise', fromHour: 18, toMinutes: 420 });
});

it('finds the longest shared waking window (8 AM–10 PM)', () => {
  expect(awakeWindow(0)).toEqual({ fromStart: 480, fromEnd: 1320, toStart: 480, toEnd: 1320 });
  expect(awakeWindow(300)).toEqual({ fromStart: 480, fromEnd: 1020, toStart: 780, toEnd: 1320 });
  expect(awakeWindow(-300)).toEqual({ fromStart: 780, fromEnd: 1320, toStart: 480, toEnd: 1020 });
  // 18 hours ahead: 1 PM–10 PM here is 7 AM... so the window is 2 PM–10 PM here, 8 AM–4 PM there (next day).
  expect(awakeWindow(1080)).toEqual({ fromStart: 840, fromEnd: 1320, toStart: 480, toEnd: 960 });
});
