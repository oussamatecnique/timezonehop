/** Build-time content for timezone (abbreviation and UTC offset) pages. */
import { t } from '../../i18n';
import {
  getCatalog, nameOf, pairsFrom, placeByRef, type AbbrZone, type City, type OffsetZone, type Pair,
} from '../../data/catalog';
import { TOP_ABBREVIATIONS } from '../../data/popular';
import { fixed, iana, offsetAt, type ZoneRef } from '../time/zone';
import { nextTransition } from '../time/transitions';
import { formatDate, formatDifference, formatOffset } from '../time/format';

export interface AbbrView {
  h1: string;
  zone: ZoneRef;
  offsetLabel: string;
  definition: string;
  usedIn: string[];
  sibling?: AbbrZone;
  inEffectNote: string | null;
  note: string | null;
  pairs: Pair[];
}

export interface OffsetView {
  h1: string;
  zone: ZoneRef;
  offsetLabel: string;
  citiesNow: City[];
  abbreviations: AbbrZone[];
}

/** Whether the abbreviation's representative place currently uses its sibling instead. */
export function representativeOnSibling(a: AbbrZone, now: number): boolean {
  const d = a.data;
  if (!d.representativeTz || !d.sibling) return false;
  const sib = getCatalog().timezone.get(d.sibling) as AbbrZone;
  return offsetAt(iana(d.representativeTz), now) === sib.data.offsetMinutes && sib.data.offsetMinutes !== d.offsetMinutes;
}

export function inEffectNote(a: AbbrZone, now: number): string | null {
  const d = a.data;
  if (!d.representative || !d.representativeTz) return null;
  const rep = nameOf(placeByRef(d.representative));
  const repZone = iana(d.representativeTz);
  const current = offsetAt(repZone, now);
  if (current === d.offsetMinutes) return t('abbr.inEffect.same', { rep, abbr: d.abbr });
  if (representativeOnSibling(a, now)) {
    const sib = (getCatalog().timezone.get(d.sibling!) as AbbrZone).data;
    const nt = nextTransition(repZone, now);
    const date = nt ? formatDate(fixed(nt.offsetBefore, ''), nt.instant, 'medium') : '';
    return t('abbr.inEffect.sibling', {
      abbr: d.abbr, sibling: sib.abbr, siblingOffset: formatOffset(sib.offsetMinutes), date, rep, offset: formatOffset(current),
    });
  }
  return t('abbr.inEffect.other', { rep, offset: formatOffset(current) });
}

export function abbrView(a: AbbrZone, now: number): AbbrView {
  const d = a.data;
  const cat = getCatalog();
  const offsetLabel = formatOffset(d.offsetMinutes);
  const sibling = d.sibling ? (cat.timezone.get(d.sibling) as AbbrZone) : undefined;
  const base = { abbr: d.abbr, name: d.name, offset: offsetLabel, diff: formatDifference(d.offsetMinutes) };
  let definition = t(
    d.offsetMinutes > 0 ? 'abbr.definition.ahead' : d.offsetMinutes < 0 ? 'abbr.definition.behind' : 'abbr.definition.zero',
    base,
  );
  if (sibling) {
    definition += d.isDaylight
      ? t('abbr.definition.daylight', { sibling: sibling.data.abbr })
      : t('abbr.definition.standard', {
          abbr: d.abbr, sibling: sibling.data.abbr, siblingOffset: formatOffset(sibling.data.offsetMinutes),
        });
  }
  return {
    h1: t('abbr.h1', { abbr: d.abbr, name: d.name, offset: offsetLabel }),
    zone: fixed(d.offsetMinutes, d.abbr),
    offsetLabel,
    definition,
    usedIn: d.usedIn,
    sibling,
    inEffectNote: inEffectNote(a, now),
    note: d.note ?? null,
    pairs: TOP_ABBREVIATIONS.includes(a.slug) ? pairsFrom(a) : [],
  };
}

export function offsetView(o: OffsetZone, now: number): OffsetView {
  const cat = getCatalog();
  return {
    h1: t('offset.h1', { offset: o.label }),
    zone: fixed(o.offsetMinutes, o.label),
    offsetLabel: o.label,
    citiesNow: cat.cities.filter(c => offsetAt(iana(c.tz), now) === o.offsetMinutes),
    abbreviations: cat.abbreviations.filter(a => a.data.offsetMinutes === o.offsetMinutes),
  };
}
