// @vitest-environment happy-dom
import { it, expect, vi } from 'vitest';
import { renderClocks, startClocks } from '../../src/scripts/clock-runtime';

const html = `<span data-clock data-zone="America/New_York" data-format="time"></span>
<span data-clock data-zone="America/New_York" data-format="abbr"></span>
<span data-clock data-zone="Fake/Zone" data-offset="540" data-format="time"></span>
<span data-diff-you data-zone="Asia/Tokyo"></span><span data-diff-you data-zone="Asia/Kolkata"></span>
<div data-sky data-zone="Asia/Tokyo"></div>`;

it('renders, recomputes offsets every call, and handles unknown visitor zones', () => {
  document.body.innerHTML = html;
  renderClocks(document, Date.UTC(2026, 10, 1, 5, 59), true, 'America/Indiana/Knox');
  const [t, abbr, stale] = document.querySelectorAll('[data-clock]');
  expect(t.textContent).toBe('1:59 AM');
  expect(abbr.textContent).toBe('EDT');
  renderClocks(document, Date.UTC(2026, 10, 1, 6, 0), true, 'America/Indiana/Knox'); // DST ends while open
  expect(t.textContent).toBe('1:00 AM');
  expect(abbr.textContent).toBe('EST');
  expect(stale.textContent).toBe('3:00 PM');
  expect(stale.hasAttribute('data-stale')).toBe(true);
  const [d1, d2] = document.querySelectorAll('[data-diff-you]');
  expect(d1.textContent).toBe('14 hours ahead of you'); // Knox is still CDT (UTC−5) until 07:00Z
  renderClocks(document, Date.UTC(2026, 10, 1, 6, 0), true, 'Not/AZone'); // invalid -> UTC
  expect(d1.textContent).toBe('9 hours ahead of you');
  expect(d2.textContent).toBe('5 hours 30 minutes ahead of you');
  expect(document.querySelector('[data-sky]')!.className).toMatch(/^sky-/);
});

it('resyncs immediately when a sleeping tab becomes visible', () => {
  vi.useFakeTimers();
  vi.setSystemTime(Date.UTC(2026, 9, 25, 12, 0, 0));
  localStorage.setItem('tzh:prefs', JSON.stringify({ hour12: true }));
  document.body.innerHTML = '<span data-clock data-zone="UTC" data-format="time-seconds"></span>';
  startClocks();
  const el = document.querySelector('[data-clock]')!;
  expect(el.textContent).toBe('12:00:00 PM');
  vi.setSystemTime(Date.UTC(2026, 9, 25, 15, 30, 5)); // laptop slept; no timers fired
  document.dispatchEvent(new Event('visibilitychange'));
  expect(el.textContent).toBe('3:30:05 PM');
  vi.useRealTimers();
});
