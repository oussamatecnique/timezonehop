import { offsetAt, zonedParts, type ZoneRef } from '../lib/time/zone';
import { formatDate, formatDifference, formatOffset, formatTime, zoneAbbreviation } from '../lib/time/format';
import { skyPhase, skyStrip } from '../lib/time/sky';
import { dayShift, type Range } from './converter/timeline';

interface Props {
  label: string;
  /** Zone key, or 'visitor' for the server-rendered stand-in of the visitor's own zone. */
  zoneKey: string;
  /**
   * True until the island has mounted: the row then carries the clock script's data
   * attributes so it shows the right (and, for 'visitor', the visitor's) time before hydration.
   */
  serverRendered: boolean;
  zone: ZoneRef;
  reference: ZoneRef;
  isFirst: boolean;
  instant: number;
  range: Range;
  fraction: number;
  hour12: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  canRemove: boolean;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
}

const SEGMENTS = 24;

/** Sky phase per hour of the timeline range, plus the 9–17 working-hour runs, in this row's local time. */
function stripFor(zone: ZoneRef, range: Range) {
  const len = range.end - range.start;
  const phases = [];
  const work: { left: number; width: number }[] = [];
  for (let i = 0; i < SEGMENTS; i++) {
    const p = zonedParts(zone, range.start + ((i + 0.5) / SEGMENTS) * len);
    phases.push(skyPhase(p.hour * 60 + p.minute));
    if (p.hour >= 9 && p.hour < 17) {
      const last = work[work.length - 1];
      if (last && Math.abs(last.left + last.width - i / SEGMENTS) < 1e-9) last.width += 1 / SEGMENTS;
      else work.push({ left: i / SEGMENTS, width: 1 / SEGMENTS });
    }
  }
  return { background: skyStrip(phases), work };
}

export default function ZoneRow(p: Props) {
  const off = offsetAt(p.zone, p.instant);
  const offLabel = formatOffset(off);
  const abbr = zoneAbbreviation(p.zone, p.instant);
  const diff = off - offsetAt(p.reference, p.instant);
  const shift = dayShift(p.zone, p.reference, p.instant);
  const rel = p.isFirst
    ? ''
    : diff === 0
      ? 'same time'
      : `${formatDifference(diff)} ${diff > 0 ? 'ahead' : 'behind'}`;
  const { background, work } = stripFor(p.zone, p.range);
  const isVisitor = p.zoneKey === 'visitor';
  const clock = (format: string) => (p.serverRendered ? { 'data-clock': '', 'data-format': format } : {});
  const host = p.serverRendered
    ? { 'data-zone': p.zoneKey, 'data-offset': off, 'data-label': p.zone.kind === 'fixed' ? p.zone.label : undefined }
    : {};

  return (
    <li class="zone-row" data-zone-row {...host}>
      <div class="zone-row__top">
        <div class="zone-row__name">
          <strong {...(isVisitor ? clock('you-place') : {})}>{p.label}</strong>
          <span class="zone-row__meta">
            <span {...clock('zone')}>{abbr === offLabel ? offLabel : `${abbr} (${offLabel})`}</span>
            {rel && !isVisitor && `, ${rel}`}
          </span>
        </div>
        <div class="zone-row__time">
          <span class="zone-row__clock" {...clock('time')}>
            {formatTime(p.zone, p.instant, { hour12: p.hour12 })}
          </span>
          <span class="zone-row__date">
            <span {...clock('date-short')}>{formatDate(p.zone, p.instant, 'short')}</span>
            {shift !== 0 && !isVisitor && <span class="badge">{shift > 0 ? '+1 day' : '−1 day'}</span>}
          </span>
        </div>
      </div>
      <div class="zone-row__strip" style={{ background }} aria-hidden="true">
        {work.map(w => (
          <span class="zone-row__work" style={{ left: `${w.left * 100}%`, width: `${w.width * 100}%` }} />
        ))}
        <span class="zone-row__marker" style={{ transform: `translateX(${p.fraction * 100}%)` }}>
          <span />
        </span>
      </div>
      {(p.canMoveUp || p.canMoveDown || p.canRemove) && (
        <div class="zone-row__tools">
          {p.canMoveUp && (
            <button type="button" class="tool" onClick={() => p.onMove(-1)} aria-label={`Move ${p.label} up`}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M6 11l6-6 6 6" /></svg>
            </button>
          )}
          {p.canMoveDown && (
            <button type="button" class="tool" onClick={() => p.onMove(1)} aria-label={`Move ${p.label} down`}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M6 13l6 6 6-6" /></svg>
            </button>
          )}
          {p.canRemove && (
            <button type="button" class="tool" onClick={p.onRemove} aria-label={`Remove ${p.label}`}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          )}
        </div>
      )}
    </li>
  );
}
