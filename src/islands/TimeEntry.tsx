/** Type a time instead of dragging: "3pm", "15:00" or "21h30", in any of the converter's zones. */
import { useState } from 'preact/hooks';
import { iana, zonedParts, type ZoneRef } from '../lib/time/zone';
import { formatDate, formatTime } from '../lib/time/format';
import { atWallTime, parseTime } from './converter/time-entry';

interface EntryZone {
  key: string;
  label: string;
  ref: ZoneRef;
}

interface Props {
  zones: EntryZone[];
  instant: number;
  hour12: boolean;
  /** False until the island has mounted: the field stays empty rather than showing the build time. */
  hydrated: boolean;
  onSet: (instant: number) => void;
}

const wall = (hour: number, minute: number, hour12: boolean) =>
  formatTime(iana('UTC'), Date.UTC(2000, 0, 1, hour, minute), { hour12 });

export default function TimeEntry(p: Props) {
  // null follows the first zone, so a swap or reorder moves the field along with the timeline.
  const [zoneKey, setZoneKey] = useState<string | null>(null);
  // null shows the zone's current time; a string is what the visitor is typing.
  const [draft, setDraft] = useState<string | null>(null);
  const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null);
  const zone = p.zones.find(z => z.key === zoneKey) ?? p.zones[0];
  const shown = p.hydrated ? formatTime(zone.ref, p.instant, { hour12: p.hour12 }) : '';

  const apply = (text: string, z: EntryZone) => {
    const parsed = parseTime(text);
    if (!parsed.ok) {
      setMessage({ error: true, text: parsed.error });
      return;
    }
    const t = atWallTime(z.ref, p.instant, parsed.hour, parsed.minute);
    const got = zonedParts(z.ref, t);
    setDraft(null);
    setMessage(
      got.hour === parsed.hour && got.minute === parsed.minute
        ? null
        : {
            error: false,
            text: `${wall(parsed.hour, parsed.minute, p.hour12)} is skipped in ${z.label} on ${formatDate(z.ref, t, 'short')} (clocks spring forward), so it shows ${formatTime(z.ref, t, { hour12: p.hour12 })}.`,
          },
    );
    p.onSet(t);
  };

  return (
    <form
      class="time-entry"
      noValidate
      onSubmit={e => {
        e.preventDefault();
        if (draft !== null) apply(draft, zone);
      }}
    >
      <div class="time-entry__group">
        <span class="time-entry__lead">Type a time in</span>
        {p.zones.length > 1 ? (
          <span class="time-entry__select">
            <select
              class="field"
              aria-label="City or timezone for the typed time"
              value={zone.key}
              onChange={e => {
                const next = p.zones.find(z => z.key === (e.currentTarget as HTMLSelectElement).value) ?? zone;
                setZoneKey(next.key);
                // "3pm", then London: that's the whole question, so answer it.
                if (draft !== null) apply(draft, next);
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
      <div class="time-entry__group">
        <input
          class="field time-entry__time"
          type="text"
          value={draft ?? shown}
          placeholder={p.hour12 ? 'e.g. 3:30 PM' : 'e.g. 15:30'}
          aria-label={`Time in ${zone.label}`}
          aria-invalid={message?.error ? 'true' : undefined}
          aria-describedby={message ? 'time-entry-message' : undefined}
          autocomplete="off"
          autocapitalize="off"
          spellcheck={false}
          enterkeyhint="go"
          maxLength={16}
          onFocus={e => (e.currentTarget as HTMLInputElement).select()}
          onInput={e => {
            setDraft((e.currentTarget as HTMLInputElement).value);
            setMessage(null);
          }}
          onBlur={e => {
            // Leaving the form applies what was typed; moving to the zone menu or Set leaves that to them.
            const next = e.relatedTarget as Node | null;
            if (draft !== null && !(next && (e.currentTarget as HTMLInputElement).form?.contains(next))) apply(draft, zone);
          }}
          onKeyDown={e => {
            if (e.key !== 'Escape' || draft === null) return;
            e.preventDefault();
            setDraft(null);
            setMessage(null);
          }}
        />
        <button type="submit" class="btn">Set</button>
      </div>
      {message && (
        <p id="time-entry-message" class={message.error ? 'time-entry__error' : 'time-entry__note'} role="alert">
          {message.text}
        </p>
      )}
    </form>
  );
}
