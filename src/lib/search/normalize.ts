/** Accent-insensitive, case-insensitive, punctuation-tolerant form for matching. */
export function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** 'utc+5:30', 'UTC +5:30', 'gmt-3', '+0545', 'utc' -> minutes; anything else -> null. */
export function parseOffsetQuery(q: string): number | null {
  const s = q.trim().toLowerCase().replace(/\s+/g, '').replace(/−/g, '-');
  const m = /^(utc|gmt)?(?:([+-])(\d{1,2})(?::?(\d{2}))?)?$/.exec(s);
  if (!m || (!m[1] && !m[2])) return null;
  if (!m[2]) return 0;
  const hours = Number(m[3]);
  const minutes = Number(m[4] ?? 0);
  if (hours > 14 || minutes >= 60) return null;
  return (m[2] === '-' ? -1 : 1) * (hours * 60 + minutes);
}
