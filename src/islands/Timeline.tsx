import { useRef } from 'preact/hooks';
import { zonedParts, zonedToInstant, type ZoneRef } from '../lib/time/zone';
import { formatDate, formatTime } from '../lib/time/format';
import { fractionToInstant, instantToFraction, snap, type Range } from './converter/timeline';

interface Props {
  zone: ZoneRef;
  zoneLabel: string;
  range: Range;
  instant: number;
  hour12: boolean;
  onChange: (instant: number) => void;
  onCommit: () => void;
  onDay: (dir: -1 | 1) => void;
}

const MINUTE = 60_000;

export default function Timeline(p: Props) {
  const track = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const fraction = instantToFraction(p.instant, p.range);
  const day = zonedParts(p.zone, p.range.start);
  const ticks = [0, 6, 12, 18].map(hour => {
    const t = zonedToInstant(p.zone, { year: day.year, month: day.month, day: day.day, hour, minute: 0 });
    const label = p.hour12 ? formatTime(p.zone, t, { hour12: true }).replace(':00', '') : `${String(hour).padStart(2, '0')}:00`;
    return { left: instantToFraction(t, p.range), label };
  });

  const fromPointer = (clientX: number) => {
    const rect = track.current!.getBoundingClientRect();
    p.onChange(fractionToInstant((clientX - rect.left) / rect.width, p.range));
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
        next = p.range.end;
        break;
      default:
        return;
    }
    e.preventDefault();
    p.onChange(Math.min(p.range.end, Math.max(p.range.start, next)));
    p.onCommit();
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
          dragging.current = true;
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          fromPointer(e.clientX);
        }}
        onPointerMove={e => dragging.current && fromPointer(e.clientX)}
        onPointerUp={() => {
          if (dragging.current) p.onCommit();
          dragging.current = false;
        }}
        onPointerCancel={() => (dragging.current = false)}
      >
        <div class="timeline__rail" />
        {ticks.map(t => (
          <span class="timeline__tick" style={{ left: `${t.left * 100}%` }} aria-hidden="true">
            {t.label}
          </span>
        ))}
        <div class="timeline__thumb-wrap" style={{ transform: `translateX(${fraction * 100}%)` }}>
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
