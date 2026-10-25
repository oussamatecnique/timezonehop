import { readFileSync, existsSync } from 'node:fs';
import { parse } from 'node-html-parser';

/** Parse a built page: '/' or '/time/tokyo'. */
export function page(path: string) {
  const file = path === '/' ? 'dist/index.html' : `dist${path}.html`;
  if (!existsSync(file)) throw new Error(`missing ${file}`);
  return parse(readFileSync(file, 'utf8'));
}
