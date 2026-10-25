import { en } from './en';

const strings = en as unknown as Record<string, unknown>;

/** Look up a copy template and fill its {placeholders}. Unknown keys are returned as-is. */
export function t(key: string, vars?: Record<string, string | number>): string {
  const template = strings[key];
  if (typeof template !== 'string') return key;
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (m, name: string) => (name in vars ? String(vars[name]) : m));
}

export { en };
