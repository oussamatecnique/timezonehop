/** All user-facing English copy. Templates use {name} placeholders, filled by t(). */
export const en = {
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
} as const;

export type EnKey = keyof typeof en;
