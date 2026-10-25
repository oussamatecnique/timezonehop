/** Client-side search over the prebuilt index. Small and dependency-free (ships in an island). */
import { normalize, parseOffsetQuery } from './normalize';

export { normalize, parseOffsetQuery };

export interface SearchEntry {
  /** name */
  n: string;
  /** aliases */
  a?: string[];
  /** url path */
  u: string;
  /** kind: city, country, zone */
  k: 'c' | 'n' | 'z';
  /** detail line, e.g. 'Japan' or 'Eastern Standard Time · UTC−5' */
  d: string;
  /** zone key: IANA id or 'fixed:<minutes>' */
  z: string;
  /** rank weight (population; zones rank above places) */
  p: number;
}

const normCache = new WeakMap<SearchEntry, string[]>();
function namesOf(e: SearchEntry): string[] {
  let names = normCache.get(e);
  if (!names) {
    names = [e.n, ...(e.a ?? [])].map(normalize).filter(Boolean);
    normCache.set(e, names);
  }
  return names;
}

/** Optimal string alignment distance ≤ 1 (one insert, delete, substitute or adjacent swap). */
function withinOne(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  if (a.length === b.length) {
    if (a.slice(i + 1) === b.slice(i + 1)) return true; // substitution
    return a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2); // swap
  }
  const [long, short] = a.length > b.length ? [a, b] : [b, a];
  return long.slice(i + 1) === short.slice(i);
}

function tier(names: string[], q: string): number {
  let best = Infinity;
  for (const name of names) {
    if (name === q) return 0;
    if (name.startsWith(q)) best = Math.min(best, 1);
    else if (name.includes(` ${q}`)) best = Math.min(best, 2);
    else if (name.includes(q)) best = Math.min(best, 3);
    else if (q.length >= 4 && (withinOne(q, name.slice(0, q.length)) || withinOne(q, name))) best = Math.min(best, 4);
  }
  return best;
}

const offsetUrl = (minutes: number) => {
  if (minutes === 0) return '/timezone/utc';
  const abs = Math.abs(minutes);
  const m = abs % 60;
  return `/timezone/utc-${minutes > 0 ? 'plus' : 'minus'}-${Math.floor(abs / 60)}${m ? `-${String(m).padStart(2, '0')}` : ''}`;
};

export function search(index: SearchEntry[], query: string, limit = 8): SearchEntry[] {
  if (!query.trim()) return [];
  const results: SearchEntry[] = [];
  const offset = parseOffsetQuery(query);
  if (offset !== null) {
    const hit = index.find(e => e.u === offsetUrl(offset));
    if (hit) results.push(hit);
  }
  const q = normalize(query);
  if (q) {
    const scored: { e: SearchEntry; t: number }[] = [];
    for (const e of index) {
      const t = tier(namesOf(e), q);
      if (t < Infinity) scored.push({ e, t });
    }
    scored.sort((x, y) => x.t - y.t || y.e.p - x.e.p || x.e.n.length - y.e.n.length);
    for (const { e } of scored) {
      if (results.length >= limit) break;
      if (!results.includes(e)) results.push(e);
    }
  }
  return results.slice(0, limit);
}
