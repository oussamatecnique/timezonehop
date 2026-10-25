/**
 * Search for cities, countries and time zones. 'navigate' goes to the page; 'pick' hands
 * the zone to the converter. The index (/search-index.json) loads on first focus.
 */
import { useEffect, useRef, useState } from 'preact/hooks';
import { search, type SearchEntry } from '../lib/search/match';
import type { ConverterZone } from './converter/state';

let indexPromise: Promise<SearchEntry[]> | null = null;

export function loadIndex(): Promise<SearchEntry[]> {
  if (!indexPromise) {
    indexPromise = fetch('/search-index.json')
      .then(r => {
        if (!r.ok) throw new Error(`search index: HTTP ${r.status}`);
        return r.json() as Promise<SearchEntry[]>;
      })
      .catch(err => {
        indexPromise = null;
        throw err;
      });
  }
  return indexPromise;
}

export function entryToZone(e: SearchEntry): ConverterZone {
  return { key: e.z, label: e.n, token: e.u.split('/').pop() };
}

const isTyping = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName));

interface Props {
  id: string;
  mode: 'navigate' | 'pick';
  onPick?: (z: ConverterZone) => void;
  autoFocus?: boolean;
}

export default function SearchBox({ id, mode, onPick, autoFocus }: Props) {
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState<SearchEntry[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  const ensureIndex = () => {
    if (index) return;
    setFailed(false);
    loadIndex().then(setIndex, () => setFailed(true));
  };

  useEffect(() => {
    // Keep anything typed before this island hydrated.
    const early = input.current?.value ?? '';
    if (early) {
      setQuery(early);
      setOpen(document.activeElement === input.current);
      ensureIndex();
    }
    if (autoFocus) {
      input.current?.focus();
      ensureIndex();
    }
    if (mode !== 'navigate') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '/' && !isTyping(e.target)) {
        e.preventDefault();
        input.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const results = index && query.trim() ? search(index, query, 8) : [];
  const listId = `${id}-list`;
  const showPanel = open && query.trim().length > 0;

  const choose = (e: SearchEntry) => {
    if (mode === 'navigate') {
      location.href = e.u;
      return;
    }
    onPick?.(entryToZone(e));
    setQuery('');
    setOpen(false);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      setOpen(true);
      if (results.length) setActive(a => (a + (e.key === 'ArrowDown' ? 1 : results.length - 1)) % results.length);
    } else if (e.key === 'Enter') {
      const pick = results[active] ?? results[0];
      if (pick) {
        e.preventDefault();
        choose(pick);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div class="search" role="search">
      <label class="visually-hidden" for={id}>
        Search cities, countries and time zones
      </label>
      <div class="search__field">
        <svg class="search__icon" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" />
        </svg>
        <input
          id={id}
          ref={input}
          class="search__input"
          type="search"
          role="combobox"
          autoComplete="off"
          spellcheck={false}
          placeholder={mode === 'navigate' ? 'Search a city or time zone' : 'Type a city, country or time zone'}
          aria-autocomplete="list"
          aria-expanded={showPanel && results.length > 0}
          aria-controls={listId}
          aria-activedescendant={showPanel && results[active] ? `${id}-opt-${active}` : undefined}
          value={query}
          onFocus={() => {
            ensureIndex();
            setOpen(true);
          }}
          onInput={e => {
            setQuery((e.currentTarget as HTMLInputElement).value);
            setActive(0);
            setOpen(true);
          }}
          onKeyDown={onKeyDown}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
        />
      </div>
      {showPanel && (
        <div class="search__panel">
          {failed ? (
            <p class="search__note">
              Search is unavailable right now. <a href="/time">Browse all cities</a>
            </p>
          ) : results.length > 0 ? (
            <ul id={listId} role="listbox" class="search__list">
              {results.map((r, i) => (
                <li
                  id={`${id}-opt-${i}`}
                  role="option"
                  aria-selected={i === active}
                  class="search__option"
                  onMouseDown={e => e.preventDefault()}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose(r)}
                >
                  <span class="search__name">{r.n}</span>
                  <span class="search__detail">{r.d}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p class="search__note">{index ? `No matches for “${query.trim()}”. Try a city, a country or a time zone like EST.` : 'Loading…'}</p>
          )}
        </div>
      )}
    </div>
  );
}
