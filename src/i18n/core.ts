/**
 * The small set of strings the browser runtime needs (clocks, differences).
 * Kept separate from page copy so the inlined clock script stays tiny.
 */
export const core = {
  months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  monthsShort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  daysShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],

  'time.am': 'AM',
  'time.pm': 'PM',
  'diff.hour': '{n} hour',
  'diff.hours': '{n} hours',
  'diff.minute': '{n} minute',
  'diff.minutes': '{n} minutes',
  'you.ahead': '{diff} ahead of you',
  'you.behind': '{diff} behind you',
  'you.same': 'Same time as you',
} as const;

/** Fill {placeholders} in a template. */
export function fill(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (m, name: string) => (name in vars ? String(vars[name]) : m));
}

/** t() over the core strings only. */
export function tc(key: keyof typeof core, vars?: Record<string, string | number>): string {
  const template = core[key];
  return typeof template === 'string' ? fill(template, vars) : key;
}
