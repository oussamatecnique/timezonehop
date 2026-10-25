import { en } from './en';
import { fill } from './core';

const strings = en as unknown as Record<string, unknown>;

/** Look up a copy template and fill its {placeholders}. Unknown keys are returned as-is. */
export function t(key: string, vars?: Record<string, string | number>): string {
  const template = strings[key];
  return typeof template === 'string' ? fill(template, vars) : key;
}

export { en };
