/**
 * Set the time by typing instead of dragging, in any of the converter's zones. A native time field:
 * only valid times get in, and phones show their own time picker.
 */
import { useEffect, useRef, useState } from 'preact/hooks';
import { iana, zonedParts, type ZoneRef } from '../lib/time/zone';
import { formatDate, formatTime } from '../lib/time/format';
import { atWallTime } from './converter/time-entry';

interface Props {
  zones: { key: string; label: string; ref: ZoneRef }[];
  instant: number;
  hour12: boolean;
  /** False until the island has mounted: the field stays empty rather than showing the build time. */
  hydrated: boolean;
  onSet: (instant: number) => void;
}

const pad = (n: number) => String(n).padStart(2, '0');
const wall = (hour: number, minute: number, hour12: boolean) =>
  formatTime(iana('UTC'), Date.UTC(2000, 0, 1, hour, minute), { hour12 });

export default function TimeEntry(p: Props) {
  // null follows the first zone, so a swap or reorder moves the field along with the timeline.
  const [zoneKey, setZoneKey] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const field = useRef<HTMLInputElement>(null);
  const zone = p.zones.find(z => z.key === zoneKey) ?? p.zones[0];
  const parts = zonedParts(zone.ref, p.instant);
  const value = p.hydrated ? `${pad(parts.hour)}:${pad(parts.minute)}` : '';

  // Uncontrolled while focused, so the live clock never overwrites a half-typed time.
  const sync = () => {
    const el = field.current;
    if (el && document.activeElement !== el && el.value !== value) el.value = value;
  };
  useEffect(sync);

  const onInput = (raw: string) => {
    const m = /^(\d{2}):(\d{2})/.exec(raw);
    if (!m) return; // a segment is still empty: wait for the rest
    const hour = Number(m[1]);
    const minute = Number(m[2]);
    const t = atWallTime(zone.ref, p.instant, hour, minute);
    const got = zonedParts(zone.ref, t);
    setNote(
      got.hour === hour && got.minute === minute
        ? ''
        : `${wall(hour, minute, p.hour12)} is skipped in ${zone.label} on ${formatDate(zone.ref, t, 'short')} (clocks spring forward), so it shows ${formatTime(zone.ref, t, { hour12: p.hour12 })}.`,
    );
    p.onSet(t);
  };

  return (
    <div class="time-entry">
      <div class="time-entry__group">
        <label class="time-entry__lead" for="time-entry">
          Type a time in
        </label>
        {p.zones.length > 1 ? (
          <span class="time-entry__select">
            <select
              class="field"
              aria-label="City or timezone for the typed time"
              value={zone.key}
              onChange={e => {
                setZoneKey((e.currentTarget as HTMLSelectElement).value);
                setNote('');
              }}
            >
              {p.zones.map(z => (
                <option value={z.key}>{z.label}</option>
              ))}
            </select>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
          </span>
        ) : (
          <strong class="time-entry__zone">{zone.label}</strong>
        )}
      </div>
      <input
        id="time-entry"
        ref={field}
        class="field time-entry__time"
        type="time"
        aria-label={`Time in ${zone.label}`}
        aria-describedby={note ? 'time-entry-note' : undefined}
        onInput={e => onInput((e.currentTarget as HTMLInputElement).value)}
        onBlur={sync}
      />
      {note && (
        <p id="time-entry-note" class="time-entry__note" role="alert">
          {note}
        </p>
      )}
    </div>
  );
}
