/** Build-time content for converter pair pages. */
import { t } from '../../i18n';
import {
  cityEquivalent, getCatalog, nameOf, pairFor, pairsFrom, urlOf, zoneOf, type AbbrZone, type Pair, type PairEnd,
} from '../../data/catalog';
import { dayShift, fixed, offsetAt, zonedParts, zonedToInstant, type ZoneRef } from '../time/zone';
import { observesDst, transitionsBetween } from '../time/transitions';
import { formatDate, formatDifference, formatOffset, formatTime, zoneAbbreviation, zoneLongName } from '../time/format';
import { awakeWindow, meetingWindow, type MeetingWindow } from './meeting';
import type { Faq } from './place';
import { inEffectNote, representativeOnSibling } from './timezone';

export interface PairRow {
  hour: number;
  fromLabel: string;
  toLabel: string;
  dayShift: -1 | 0 | 1;
}

export interface PairFact {
  term: string;
  value: string;
  href?: string;
}

export interface DstChange {
  instant: number;
  date: string;
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
  /** Shown when dstChanges is empty. */
  noChangesText: string;
  facts: PairFact[];
  callText: string;
  faq: Faq[];
  inEffectNote: string | null;
  cityEquivalent?: Pair;
  reverse: Pair;
  fromOthers: Pair[];
  toOthers: Pair[];
}

const YEAR_MS = 365 * 86_400_000;
const H12 = { hour12: true } as const;

/** "9:00 AM" for minutes after local midnight. */
function minutesLabel(m: number): string {
  return formatTime(fixed(0, ''), (((m % 1440) + 1440) % 1440) * 60_000, H12);
}

const EARTH_RADIUS_KM = 6371;
const KM_PER_MILE = 1.609344;

/** Great-circle distance in kilometres. */
export function distanceKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/** "5,570", grouped by hand so the text never depends on the build machine's locale data. */
function grouped(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function zoneFact(end: PairEnd, now: number): PairFact {
  const name = nameOf(end);
  const href = urlOf(end);
  if (end.kind === 'abbr') {
    return { term: name, value: `${end.data.name} (${formatOffset(end.data.offsetMinutes)})`, href };
  }
  const zone = zoneOf(end);
  const offset = formatOffset(offsetAt(zone, now));
  const abbr = zoneAbbreviation(zone, now);
  const long = zoneLongName(zone, now);
  const inner = abbr === offset ? offset : `${abbr}, ${offset}`;
  return { term: t('pair.facts.zone', { name }), value: long === offset ? inner : `${long} (${inner})`, href };
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
  const nineAm = at(9);
  const shift = dayShift(toZone, fromZone, nineAm);
  const summary =
    t(summaryKey, { from: A, to: B, diff: formatDifference(diffMinutes) }) +
    t('pair.summary.example', {
      from: A,
      to: B,
      time: formatTime(toZone, nineAm, H12),
      day: shift > 0 ? t('pair.day.next') : shift < 0 ? t('pair.day.previous') : '',
    });

  const rows: PairRow[] = Array.from({ length: 24 }, (_, hour) => {
    const instant = at(hour);
    return {
      hour,
      fromLabel: formatTime(fromZone, instant, H12),
      toLabel: formatTime(toZone, instant, H12),
      dayShift: dayShift(toZone, fromZone, instant),
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
    const date = formatDate(fixed(tr.offsetBefore, ''), tr.instant, 'medium');
    const text = t('pair.dst.change', {
      date,
      who,
      abbr: zoneAbbreviation(zone, tr.instant),
      offset: formatOffset(tr.offsetAfter),
      to: B,
      diff: diffPhrase(newDiffMinutes, A),
    });
    dstChanges.push({ instant: tr.instant, date, who, newDiffMinutes, text });
  }

  const noChangesText = t(p.kind === 'abbr' ? 'pair.dst.none.abbr' : 'pair.dst.none.place', { from: A, to: B });

  const facts: PairFact[] = [zoneFact(p.from, now), zoneFact(p.to, now)];
  if (p.from.kind === 'city' && p.to.kind === 'city') {
    const km = distanceKm(p.from, p.to);
    facts.push({
      term: t('pair.facts.distance'),
      value: t('pair.facts.distance.value', { km: grouped(km), miles: grouped(km / KM_PER_MILE) }),
    });
  }
  if (p.kind === 'place') {
    const year = new Date(now).getUTCFullYear();
    const fromDst = observesDst(fromZone, year);
    const toDst = observesDst(toZone, year);
    const value =
      fromDst && toDst ? t('pair.facts.dst.both', { from: A, to: B })
      : fromDst ? t('pair.facts.dst.one', { yes: A, no: B })
      : toDst ? t('pair.facts.dst.one', { yes: B, no: A })
      : t('pair.facts.dst.neither', { from: A, to: B });
    facts.push({ term: t('pair.facts.dst'), value });
  }

  const awake = awakeWindow(diffMinutes);
  const callText = t('pair.call', {
    from: A, to: B,
    fromStart: minutesLabel(awake.fromStart), fromEnd: minutesLabel(awake.fromEnd),
    toStart: minutesLabel(awake.toStart), toEnd: minutesLabel(awake.toEnd),
  });

  const dayWord = (s: -1 | 0 | 1) => (s > 0 ? t('pair.day.next') : s < 0 ? t('pair.day.previous') : '');
  const noonFrom = at(12);
  const toToday = zonedParts(toZone, now);
  const noonTo = zonedToInstant(toZone, { year: toToday.year, month: toToday.month, day: toToday.day, hour: 12, minute: 0 });
  const faq: Faq[] = [
    {
      q: t('pair.faq.noon.q', { from: A, to: B }),
      a: t('pair.faq.noon.a', {
        from: A, to: B, time: formatTime(toZone, noonFrom, H12), day: dayWord(dayShift(toZone, fromZone, noonFrom)),
      }),
    },
    {
      q: t('pair.faq.noon.q', { from: B, to: A }),
      a: t('pair.faq.noon.a', {
        from: B, to: A, time: formatTime(fromZone, noonTo, H12), day: dayWord(dayShift(fromZone, toZone, noonTo)),
      }),
    },
    {
      q: t('pair.faq.ahead.q', { from: A, to: B }),
      a:
        t(summaryKey, { from: A, to: B, diff: formatDifference(diffMinutes) }) +
        t('pair.faq.ahead.offsets', {
          from: A, to: B, fromOffset: formatOffset(offsetAt(fromZone, now)), toOffset: formatOffset(offsetAt(toZone, now)),
        }),
    },
    {
      q: t('pair.faq.change.q', { from: A, to: B }),
      a: dstChanges.length
        ? t('pair.faq.change.yes', {
            now: formatDifference(diffMinutes),
            next: formatDifference(dstChanges[0].newDiffMinutes),
            date: dstChanges[0].date,
          })
        : t('pair.faq.change.no', { text: noChangesText }),
    },
  ];

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
    noChangesText,
    facts,
    callText,
    faq,
    inEffectNote: note,
    cityEquivalent: cityEquivalent(p),
    reverse: pairFor(p.to, p.from)!,
    fromOthers: pairsFrom(p.from).filter(x => x !== p && x.to !== p.from).slice(0, 12),
    toOthers: pairsTo(p.to).filter(x => x !== p && x.from !== p.to).slice(0, 12),
  };
}
