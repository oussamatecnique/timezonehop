/** Typed times: which instant a wall-clock time means in a zone. */
import { zonedParts, zonedToInstant, type ZoneRef } from '../../lib/time/zone';

/**
 * The instant `zone` reads hour:minute on the calendar day it shows at `instant`.
 * A time skipped by a DST jump lands just after it (2:30 AM becomes 3:30 AM).
 */
export function atWallTime(zone: ZoneRef, instant: number, hour: number, minute: number): number {
  const p = zonedParts(zone, instant);
  return zonedToInstant(zone, { year: p.year, month: p.month, day: p.day, hour, minute });
}
