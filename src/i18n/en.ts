/** All user-facing English copy. Templates use {name} placeholders, filled by t(). */
import { core } from './core';

export const en = {
  ...core,

  // place pages
  'place.h1': 'Current time in {name}',
  'place.dst.none': '{name} does not observe daylight saving time.',
  'place.dst.next': '{name} is on {season} time. Clocks go {direction} {delta} on {date} at {time}.',
  'place.dst.season.daylight': 'daylight saving',
  'place.dst.season.standard': 'standard',
  'place.dst.forward': 'forward',
  'place.dst.back': 'back',
  'place.diff.ahead': '{other} is {diff} ahead',
  'place.diff.behind': '{other} is {diff} behind',
  'place.diff.same': '{other} has the same time',
  'place.faq.zone.q': 'What time zone is {name} in?',
  'place.faq.zone.a': '{name} is in the {longName} ({abbr}) time zone, which is {offset} right now. Its IANA time zone ID is {tzId}.',
  'place.faq.dst.q': 'Does {name} observe daylight saving time?',
  'place.faq.dst.yes': 'Yes. {name} is currently on {season} time. The next change is on {date} at {time}, when clocks go {direction} {delta}.',
  'place.faq.dst.no': 'No. {name} does not observe daylight saving time, so its clocks stay at {offset} all year.',
  'place.faq.diff.q': 'What is the time difference between {name} and {other}?',
  'place.faq.diff.ahead': '{name} is {diff} ahead of {other}.',
  'place.faq.diff.behind': '{name} is {diff} behind {other}.',
  'place.faq.diff.same': '{name} has the same time as {other}.',

  // timezone pages
  'abbr.h1': '{abbr} — {name} ({offset})',
  'abbr.definition.ahead': '{abbr} ({name}) is {diff} ahead of Coordinated Universal Time ({offset}).',
  'abbr.definition.behind': '{abbr} ({name}) is {diff} behind Coordinated Universal Time ({offset}).',
  'abbr.definition.zero': '{abbr} ({name}) has the same time as Coordinated Universal Time.',
  'abbr.definition.daylight': ' It is the daylight saving (summer) version of {sibling}.',
  'abbr.definition.standard': ' During daylight saving time, places that use {abbr} switch to {sibling} ({siblingOffset}).',
  'abbr.inEffect.same': '{rep} currently uses {abbr}.',
  'abbr.inEffect.sibling': 'Most places that use {abbr} are currently on {sibling} ({siblingOffset}) until {date}. {rep} is currently {offset}.',
  'abbr.inEffect.other': '{rep} is currently {offset}.',
  'offset.h1': 'Current time in {offset}',

  // converter pair pages
  'pair.h1.abbr': '{from} to {to} Converter',
  'pair.h1.place': '{from} to {to} Time Converter',
  'pair.summary.ahead': '{to} is {diff} ahead of {from}.',
  'pair.summary.behind': '{to} is {diff} behind {from}.',
  'pair.summary.same': '{to} has the same time as {from}.',
  'pair.summary.example': ' When it is 9:00 AM in {from}, it is {time}{day} in {to}.',
  'pair.day.next': ' the next day',
  'pair.day.previous': ' the previous day',
  'pair.meeting.overlap': 'The best time to meet is {fromStart}–{fromEnd} in {from} ({toStart}–{toEnd} in {to}), when both are within 9 AM–5 PM working hours.',
  'pair.meeting.compromise': 'Working hours (9 AM–5 PM) do not overlap. The closest compromise is {fromTime} in {from}, which is {toTime} in {to}.',
  'pair.dst.change': 'On {date}, {who} switches to {abbr} ({offset}). From then on, {to} is {diff}.',
  'pair.dst.diff.ahead': '{diff} ahead of {from}',
  'pair.dst.diff.behind': '{diff} behind {from}',
  'pair.dst.diff.same': 'on the same time as {from}',
} as const;

export type EnKey = keyof typeof en;
