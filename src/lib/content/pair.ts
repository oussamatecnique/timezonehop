/** Build-time content for converter pair pages. */
import { t } from '../../i18n';
import {
  cityEquivalent, getCatalog, nameOf, pairFor, pairsFrom, zoneOf, type AbbrZone, type Pair, type PairEnd,
} from '../../data/catalog';
import { fixed, offsetAt, zonedParts, zonedToInstant, type ZoneRef } from '../time/zone';
import { transitionsBetween } from '../time/transitions';
import { formatDate, formatDifference, formatOffset, formatTime, zoneAbbreviation } from '../time/format';
import { meetingWindow, type MeetingWindow } from './meeting';
import { inEffectNote, representativeOnSibling } from './timezone';

export interface PairRow {
  hour: number;
  fromLabel: string;
  toLabel: string;
  dayShift: -1 | 0 | 1;
}

export interface DstChange {
  instant: number;
  who: string;
  newDiffMinutes: number;
  text: string;
}

export interface PairView {
  h1: string;
  summary: string;
  diffMinutes: number;
  fromZone: ZoneRef;
  toZone: ZoneRef;
  rows: PairRow[];
  meeting: MeetingWindow;
  meetingText: string;
  dstChanges: DstChange[];
  inEffectNote: string | null;
  cityEquivalent?: Pair;
  reverse: Pair;
  fromOthers: Pair[];
  toOthers: Pair[];
}

const YEAR_MS = 365 * 86_400_000;
const H12 = { hour12: true } as const;

/** −1/0/+1: is `zone`'s local date before, equal to, or after `ref`'s at this instant? */
export function dayShiftAt(zone: ZoneRef, ref: ZoneRef, instant: number): -1 | 0 | 1 {
  const a = zonedParts(zone, instant);
  const b = zonedParts(ref, instant);
  const diff = Date.UTC(a.year, a.month - 1, a.day) - Date.UTC(b.year, b.month - 1, b.day);
  return diff > 0 ? 1 : diff < 0 ? -1 : 0;
}

/** "9:00 AM" for minutes after local midnight. */
function minutesLabel(m: number): string {
  return formatTime(fixed(0, ''), m * 60_000, H12);
}

const toIndex = new Map<PairEnd, Pair[]>();
function pairsTo(end: PairEnd): Pair[] {
  if (!toIndex.size) {
    for (const p of getCatalog().pairs) {
      const list = toIndex.get(p.to) ?? [];
      list.push(p);
      toIndex.set(p.to, list);
    }
  }
  return toIndex.get(end) ?? [];
}

function diffPhrase(diff: number, from: string): string {
  const key = diff > 0 ? 'pair.dst.diff.ahead' : diff < 0 ? 'pair.dst.diff.behind' : 'pair.dst.diff.same';
  return t(key, { diff: formatDifference(diff), from });
}

export function pairView(p: Pair, now: number): PairView {
  const fromZone = zoneOf(p.from);
  const toZone = zoneOf(p.to);
  const A = nameOf(p.from);
  const B = nameOf(p.to);
  const diffMinutes = offsetAt(toZone, now) - offsetAt(fromZone, now);
  const today = zonedParts(fromZone, now);
  const at = (hour: number) => zonedToInstant(fromZone, { year: today.year, month: today.month, day: today.day, hour, minute: 0 });

  const summaryKey = diffMinutes > 0 ? 'pair.summary.ahead' : diffMinutes < 0 ? 'pair.summary.behind' : 'pair.summary.same';
  const summary =
    t(summaryKey, { from: A, to: B, diff: formatDifference(diffMinutes) }) +
    t('pair.summary.example', { from: A, to: B, time: formatTime(toZone, at(9), H12) });

  const rows: PairRow[] = Array.from({ length: 24 }, (_, hour) => {
    const instant = at(hour);
    return {
      hour,
      fromLabel: formatTime(fromZone, instant, H12),
      toLabel: formatTime(toZone, instant, H12),
      dayShift: dayShiftAt(toZone, fromZone, instant),
    };
  });

  const meeting = meetingWindow(diffMinutes);
  const meetingText =
    meeting.kind === 'overlap'
      ? t('pair.meeting.overlap', {
          from: A, to: B,
          fromStart: minutesLabel(meeting.fromStart), fromEnd: minutesLabel(meeting.fromEnd),
          toStart: minutesLabel(meeting.toStart), toEnd: minutesLabel(meeting.toEnd),
        })
      : t('pair.meeting.compromise', {
          from: A, to: B, fromTime: minutesLabel(meeting.fromHour * 60), toTime: minutesLabel(meeting.toMinutes),
        });

  const changes = [
    ...transitionsBetween(fromZone, now, now + YEAR_MS).map(tr => ({ tr, zone: fromZone, who: A })),
    ...transitionsBetween(toZone, now, now + YEAR_MS).map(tr => ({ tr, zone: toZone, who: B })),
  ].sort((x, y) => x.tr.instant - y.tr.instant);
  const dstChanges: DstChange[] = [];
  let lastDiff = diffMinutes;
  for (const { tr, zone, who } of changes) {
    const newDiffMinutes = offsetAt(toZone, tr.instant) - offsetAt(fromZone, tr.instant);
    if (newDiffMinutes === lastDiff) continue;
    lastDiff = newDiffMinutes;
    const text = t('pair.dst.change', {
      date: formatDate(fixed(tr.offsetBefore, ''), tr.instant, 'medium'),
      who,
      abbr: zoneAbbreviation(zone, tr.instant),
      offset: formatOffset(tr.offsetAfter),
      to: B,
      diff: diffPhrase(newDiffMinutes, A),
    });
    dstChanges.push({ instant: tr.instant, who, newDiffMinutes, text });
  }

  let note: string | null = null;
  if (p.kind === 'abbr') {
    const notes = [p.from, p.to]
      .filter((e): e is AbbrZone => e.kind === 'abbr' && representativeOnSibling(e, now))
      .map(e => inEffectNote(e, now));
    note = notes.length ? notes.join(' ') : null;
  }

  return {
    h1: t(p.kind === 'abbr' ? 'pair.h1.abbr' : 'pair.h1.place', { from: A, to: B }),
    summary,
    diffMinutes,
    fromZone,
    toZone,
    rows,
    meeting,
    meetingText,
    dstChanges,
    inEffectNote: note,
    cityEquivalent: cityEquivalent(p),
    reverse: pairFor(p.to, p.from)!,
    fromOthers: pairsFrom(p.from).filter(x => x !== p && x.to !== p.from).slice(0, 12),
    toOthers: pairsTo(p.to).filter(x => x !== p && x.from !== p.to).slice(0, 12),
  };
}
