import { useMemo, useRef } from 'preact/hooks';
import { zoneKey, zonedParts, zonedToInstant, type ZoneRef } from '../lib/time/zone';
import { formatDate, formatTime } from '../lib/time/format';
import { STEP, fractionToInstant, instantToFraction, snap, type Range } from './converter/timeline';

interface Props {
  zone: ZoneRef;
  zoneLabel: string;
  range: Range;
  instant: number;
  /** Where the thumb sits, 0–1: under the pointer while dragging, at the (snapped) instant otherwise. */
  fraction: number;
  hour12: boolean;
  onChange: (instant: number) => void;
  /** The unsnapped pointer position while dragging; null when the drag ends. */
  onScrub: (fraction: number | null) => void;
  /** Called with the final instant when a drag ends (keyboard changes are announced by aria-valuetext). */
  onCommit: (instant: number) => void;
  onDay: (dir: -1 | 1) => void;
}

const MINUTE = 60_000;

export default function Timeline(p: Props) {
  const track = useRef<HTMLDivElement>(null);
  // While dragging: pointer x minus the thumb centre at pointerdown, so a grabbed thumb doesn't jump.
  const grab = useRef<number | null>(null);
  const last = useRef(p.instant);
  const ticks = useMemo(() => {
    const day = zonedParts(p.zone, p.range.start);
    return [0, 6, 12, 18].map(hour => {
      const t = zonedToInstant(p.zone, { year: day.year, month: day.month, day: day.day, hour, minute: 0 });
      const label = p.hour12 ? formatTime(p.zone, t, { hour12: true }).replace(':00', '') : `${String(hour).padStart(2, '0')}:00`;
      return { left: instantToFraction(t, p.range), label };
    });
  }, [zoneKey(p.zone), p.range.start, p.range.end, p.hour12]);

  const fromPointer = (clientX: number) => {
    const rect = track.current!.getBoundingClientRect();
    const f = Math.min(1, Math.max(0, (clientX - grab.current! - rect.left) / rect.width));
    last.current = fractionToInstant(f, p.range);
    p.onScrub(f);
    p.onChange(last.current);
  };

  const endDrag = (commit: boolean) => {
    if (grab.current === null) return;
    grab.current = null;
    p.onScrub(null);
    if (commit) p.onCommit(last.current);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    const step = (e.shiftKey ? 60 : 15) * MINUTE;
    let next: number | null = null;
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        next = snap(p.instant) + step;
        break;
      case 'ArrowLeft':
      case 'ArrowDown':
        next = snap(p.instant) - step;
        break;
      case 'PageUp':
        next = snap(p.instant) + 60 * MINUTE;
        break;
      case 'PageDown':
        next = snap(p.instant) - 60 * MINUTE;
        break;
      case 'Home':
        next = p.range.start;
        break;
      case 'End':
        next = p.range.end - STEP;
        break;
      default:
        return;
    }
    e.preventDefault();
    // Stay within the shown day; the day buttons move between days.
    p.onChange(Math.min(p.range.end - STEP, Math.max(p.range.start, next)));
  };

  const valueNow = Math.round((p.instant - p.range.start) / MINUTE);

  return (
    <div class="timeline">
      <div class="timeline__head">
        <button type="button" class="tool" onClick={() => p.onDay(-1)} aria-label="Previous day">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
        </button>
        <span class="timeline__date">{formatDate(p.zone, p.range.start, 'long')}</span>
        <button type="button" class="tool" onClick={() => p.onDay(1)} aria-label="Next day">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
        </button>
      </div>
      <div
        class="timeline__track"
        ref={track}
        onPointerDown={e => {
          if (e.button !== 0) return;
          const rect = track.current!.getBoundingClientRect();
          const onThumb = (e.target as Element).closest('.timeline__thumb');
          grab.current = onThumb ? e.clientX - (rect.left + p.fraction * rect.width) : 0;
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          fromPointer(e.clientX);
        }}
        onPointerMove={e => grab.current !== null && fromPointer(e.clientX)}
        onPointerUp={() => endDrag(true)}
        onPointerCancel={() => endDrag(false)}
      >
        <div class="timeline__rail" />
        {ticks.map(t => (
          <span class="timeline__tick" style={{ left: `${t.left * 100}%` }} aria-hidden="true">
            {t.label}
          </span>
        ))}
        <div class="timeline__thumb-wrap" style={{ transform: `translateX(${p.fraction * 100}%)` }}>
          <div
            class="timeline__thumb"
            role="slider"
            tabIndex={0}
            aria-label={`Time in ${p.zoneLabel}`}
            aria-valuemin={0}
            aria-valuemax={Math.round((p.range.end - p.range.start) / MINUTE)}
            aria-valuenow={valueNow}
            aria-valuetext={`${formatTime(p.zone, p.instant, { hour12: p.hour12 })} in ${p.zoneLabel}`}
            onKeyDown={onKeyDown}
          />
        </div>
      </div>
    </div>
  );
}
