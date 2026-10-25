/** Best meeting time between two places, given d = offset(to) − offset(from) in minutes. */

export type MeetingWindow =
  | { kind: 'overlap'; fromStart: number; fromEnd: number; toStart: number; toEnd: number }
  | { kind: 'compromise'; fromHour: number; toMinutes: number };

const WORK_START = 9 * 60;
const WORK_END = 17 * 60;

/** Hours outside a 9:00–17:00 day for a one-hour meeting starting at hour x. */
const outside = (x: number) => (x < 9 ? 9 - x : x > 16 ? x - 16 : 0);

export function meetingWindow(d: number): MeetingWindow {
  for (const shift of [0, 1440, -1440]) {
    const start = Math.max(WORK_START, WORK_START - d + shift);
    const end = Math.min(WORK_END, WORK_END - d + shift);
    if (end > start) {
      return { kind: 'overlap', fromStart: start, fromEnd: end, toStart: start + d - shift, toEnd: end + d - shift };
    }
  }
  let best = { fromHour: 0, toMinutes: 0, sum: Infinity, max: Infinity };
  for (let h = 0; h < 24; h++) {
    const toMinutes = (((h * 60 + d) % 1440) + 1440) % 1440;
    const a = outside(h);
    const b = outside(toMinutes / 60);
    const sum = a + b;
    const max = Math.max(a, b);
    if (sum < best.sum || (sum === best.sum && max < best.max)) best = { fromHour: h, toMinutes, sum, max };
  }
  return { kind: 'compromise', fromHour: best.fromHour, toMinutes: best.toMinutes };
}
