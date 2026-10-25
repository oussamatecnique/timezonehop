// Inlined in <head>: apply the saved theme before first paint, and handle the theme toggle.
// Deliberately import-free so it stays a few hundred bytes.
const KEY = 'tzh:prefs';

function read(): Record<string, unknown> {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}') || {};
  } catch {
    return {};
  }
}

const root = document.documentElement;
const saved = read().theme;
if (saved === 'light' || saved === 'dark') root.dataset.theme = saved;

document.addEventListener('click', e => {
  const button = (e.target as Element | null)?.closest?.('[data-theme-toggle]');
  if (!button) return;
  const current = root.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  const next = current === 'dark' ? 'light' : 'dark';
  root.dataset.theme = next;
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...read(), theme: next }));
  } catch {
    // storage blocked: theme applies for this page view only
  }
});
