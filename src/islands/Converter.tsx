/**
 * The time zone converter island: 2–6 zone rows, a draggable timeline, share links.
 * Server-rendered with stable defaults; personalized (visitor zone, saved zones, share URL) after mount.
 */
import { useEffect, useRef, useState } from 'preact/hooks';
import { iana, zoneFromKey, type ZoneRef } from '../lib/time/zone';
import { formatTime } from '../lib/time/format';
import { effectiveHour12, loadPrefs, savePrefs } from '../lib/prefs';
import {
  MAX_ZONES, UTC_ZONE, addZone, initialZones, moveZone, parseShare, removeZone, serializeShare, swapFirstTwo,
  zoneFromSavedKey, type ConverterState, type ConverterZone,
} from './converter/state';
import { dayRange, instantToFraction, shiftDay } from './converter/timeline';
import ZoneRow from './ZoneRow';
import Timeline from './Timeline';
import SearchBox, { entryToZone, loadIndex } from './SearchBox';
import type { SearchEntry } from '../lib/search/match';

interface Props {
  title: string;
  pageZones: ConverterZone[];
  quickPicks: ConverterZone[];
  isHome: boolean;
  ssrNow: number;
}

const refOf = (z: ConverterZone): ZoneRef => zoneFromKey(z.key, z.label) ?? iana('UTC');

function ssrZones(pageZones: ConverterZone[], isHome: boolean): ConverterZone[] {
  if (isHome || pageZones.length === 0) return [{ key: 'America/New_York', label: 'New York', token: 'new-york' }, UTC_ZONE];
  if (pageZones.length >= 2) return pageZones.slice(0, MAX_ZONES);
  return [pageZones[0], pageZones[0].key === 'UTC' ? { key: 'Europe/London', label: 'London', token: 'london' } : UTC_ZONE];
}

export default function Converter({ title, pageZones, quickPicks, isHome, ssrNow }: Props) {
  // Live from the first render (`now` starts at the build time), so hydration doesn't swap the header.
  const [state, setState] = useState<ConverterState>({ zones: ssrZones(pageZones, isHome), anchor: 'now', hour12: true });
  const [now, setNow] = useState(ssrNow);
  const [picking, setPicking] = useState(false);
  const [status, setStatus] = useState('');
  const [shareUrl, setShareUrl] = useState('');
  const mounted = useRef(false);

  // Personalize after mount: visitor zone, saved zones, share link, 12/24h, live clock.
  useEffect(() => {
    let visitorTz = 'UTC';
    try {
      visitorTz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    } catch {
      // keep UTC
    }
    const known = [...pageZones, ...quickPicks];
    const resolver = (entries: SearchEntry[] = []) => (token: string) => {
      const decoded = decodeURIComponent(token);
      const fromIndex = entries.find(e => e.u.endsWith(`/${decoded}`));
      return known.find(z => z.token === decoded || z.key === decoded) ?? (fromIndex ? entryToZone(fromIndex) : zoneFromSavedKey(decoded));
    };
    const shared = parseShare(location.search, resolver());
    setState({
      zones: shared.zones ?? initialZones({ pageZones, visitorTz, saved: loadPrefs().savedZones, isHome }),
      anchor: shared.anchor ?? 'now',
      hour12: effectiveHour12(),
    });
    // Share links can name any city: resolve the rest once the search index arrives.
    if (new URLSearchParams(location.search).has('z')) {
      loadIndex()
        .then(entries => {
          const full = parseShare(location.search, resolver(entries));
          if (full.zones) setState(s => ({ ...s, zones: full.zones! }));
        })
        .catch(() => {
          // keep what resolved without the index
        });
    }
    setNow(Date.now());
    mounted.current = true;

    let timer: ReturnType<typeof setInterval> | undefined;
    const start = () => {
      clearInterval(timer);
      timer = setInterval(() => setNow(Date.now()), 1000);
    };
    const onVisibility = () => (document.visibilityState === 'hidden' ? clearInterval(timer) : (setNow(Date.now()), start()));
    start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  // Remember the home page's zones.
  useEffect(() => {
    if (mounted.current && isHome) savePrefs({ savedZones: state.zones.map(z => z.key) });
  }, [state.zones]);

  const instant = state.anchor === 'now' ? now : state.anchor;
  const zone0 = refOf(state.zones[0]);
  const range = dayRange(zone0, instant);
  const fraction = instantToFraction(instant, range);
  const update = (f: (s: ConverterState) => ConverterState) => setState(s => f(s));

  const add = (z: ConverterZone) => {
    update(s => addZone(s, z));
    setPicking(false);
  };

  const copyLink = async () => {
    const url = location.origin + location.pathname + serializeShare(state, now);
    history.replaceState(null, '', url);
    try {
      await navigator.clipboard.writeText(url);
      setShareUrl('');
      setStatus('Link copied');
    } catch {
      setShareUrl(url);
      setStatus('Copy this link:');
    }
  };

  const toggleHour12 = () => {
    const hour12 = !state.hour12;
    update(s => ({ ...s, hour12 }));
    savePrefs({ hour12 });
  };

  const announce = () =>
    setStatus(`${formatTime(zone0, state.anchor === 'now' ? Date.now() : instant, { hour12: state.hour12 })} in ${state.zones[0].label}`);

  return (
    <section class="converter" aria-labelledby="converter-title">
      <div class="converter__head">
        <h2 id="converter-title">{title}</h2>
        {state.anchor === 'now' ? (
          <span class="live">Live</span>
        ) : (
          <button type="button" class="btn" onClick={() => update(s => ({ ...s, anchor: 'now' }))}>
            Back to now
          </button>
        )}
      </div>

      <ol class="zone-rows">
        {state.zones.map((z, i) => (
          <ZoneRow
            key={z.key}
            label={z.label}
            zone={refOf(z)}
            reference={zone0}
            isFirst={i === 0}
            instant={instant}
            range={range}
            fraction={fraction}
            hour12={state.hour12}
            canMoveUp={i > 0}
            canMoveDown={i < state.zones.length - 1}
            canRemove={state.zones.length > 2}
            onMove={dir => update(s => moveZone(s, i, dir))}
            onRemove={() => update(s => removeZone(s, i))}
          />
        ))}
      </ol>

      <Timeline
        zone={zone0}
        zoneLabel={state.zones[0].label}
        range={range}
        instant={instant}
        hour12={state.hour12}
        onChange={t => update(s => ({ ...s, anchor: t }))}
        onCommit={announce}
        onDay={dir => update(s => ({ ...s, anchor: shiftDay(zone0, instant, dir) }))}
      />

      <div class="converter__actions">
        <button
          type="button"
          class="btn btn--primary"
          aria-expanded={picking}
          disabled={state.zones.length >= MAX_ZONES}
          onClick={() => setPicking(v => !v)}
        >
          Add city
        </button>
        <button type="button" class="btn" onClick={() => update(swapFirstTwo)}>
          Swap
        </button>
        <button type="button" class="btn" aria-pressed={state.anchor === 'now'} onClick={() => update(s => ({ ...s, anchor: 'now' }))}>
          Now
        </button>
        <button type="button" class="btn" onClick={copyLink}>
          Copy link
        </button>
        <button type="button" class="btn" aria-pressed={!state.hour12} onClick={toggleHour12}>
          24-hour clock
        </button>
      </div>

      {picking && (
        <div class="picker">
          <SearchBox id="add-city-search" mode="pick" autoFocus onPick={add} />
          <p class="picker__hint">Or pick a popular one</p>
          <ul class="chips">
            {quickPicks
              .filter(q => !state.zones.some(z => z.key === q.key))
              .map(q => (
                <li>
                  <button type="button" class="chip" onClick={() => add(q)}>
                    {q.label}
                  </button>
                </li>
              ))}
          </ul>
        </div>
      )}

      <p class="converter__status" role="status">
        {status}
        {shareUrl && <input class="share-url" readOnly value={shareUrl} aria-label="Share link" onFocus={e => (e.currentTarget as HTMLInputElement).select()} />}
      </p>
    </section>
  );
}
