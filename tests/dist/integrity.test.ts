import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { gzipSync } from 'node:zlib';
import { parse } from 'node-html-parser';

const DIST = 'dist';

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(relative(DIST, p).split(sep).join('/'));
  }
  return out;
}

const files = new Set(walk(DIST));
const htmlFiles = [...files].filter(f => f.endsWith('.html'));

function resolves(href: string): boolean {
  const path = decodeURIComponent(href.split(/[?#]/)[0]);
  if (path === '/' || path === '') return files.has('index.html');
  const p = path.replace(/^\//, '');
  return files.has(`${p}.html`) || files.has(p) || files.has(`${p}/index.html`);
}

describe('every page', () => {
  it('has one H1, a canonical, a title, a description and no broken internal links', () => {
    const problems: string[] = [];
    for (const f of htmlFiles) {
      const doc = parse(readFileSync(join(DIST, f), 'utf8'));
      if (doc.querySelectorAll('h1').length !== 1) problems.push(`${f}: ${doc.querySelectorAll('h1').length} h1`);
      if (doc.querySelectorAll('link[rel=canonical]').length !== 1) problems.push(`${f}: canonical`);
      if (!doc.querySelector('title')?.text.trim()) problems.push(`${f}: title`);
      if (!doc.querySelector('meta[name=description]')?.getAttribute('content')?.trim()) problems.push(`${f}: description`);
      for (const a of doc.querySelectorAll('a[href], link[href]')) {
        const href = a.getAttribute('href')!;
        if (href.startsWith('/') && !href.startsWith('//') && !resolves(href)) problems.push(`${f}: broken ${href}`);
      }
      if (problems.length > 20) break;
    }
    expect(problems).toEqual([]);
  }, 300_000);
});

const gz = (s: string | Buffer) => gzipSync(s).length;

/** All JS a page loads: inline scripts plus every module chunk reachable from its islands. */
function jsBytes(page: string): number {
  const html = readFileSync(join(DIST, page), 'utf8');
  const doc = parse(html);
  let total = 0;
  for (const s of doc.querySelectorAll('script')) {
    const type = s.getAttribute('type');
    if (!s.getAttribute('src') && type !== 'application/ld+json') total += gz(s.text);
  }
  const queue = [
    ...[...html.matchAll(/(?:component-url|renderer-url|src)="(\/_astro\/[^"]+\.js)"/g)].map(m => m[1]),
    ...[...html.matchAll(/before-hydration-url="(\/_astro\/[^"]+\.js)"/g)].map(m => m[1]),
  ];
  const seen = new Set<string>();
  while (queue.length) {
    const url = queue.pop()!;
    if (seen.has(url)) continue;
    seen.add(url);
    const code = readFileSync(join(DIST, url), 'utf8');
    total += gz(code);
    for (const m of code.matchAll(/(?:from|import)\s*"\.\/([^"]+\.js)"/g)) queue.push(`/_astro/${m[1]}`);
  }
  return total;
}

function cssBytes(page: string): number {
  const doc = parse(readFileSync(join(DIST, page), 'utf8'));
  return doc.querySelectorAll('style').reduce((sum, s) => sum + gz(s.text), 0);
}

describe('payload budgets', () => {
  for (const page of ['index.html', 'time/tokyo.html', 'convert/est-to-pst.html', 'convert/new-york-to-london.html']) {
    it(`${page}: JS ≤ 35 KB gzip, CSS ≤ 15 KB gzip`, () => {
      expect(jsBytes(page)).toBeLessThanOrEqual(35 * 1024);
      expect(cssBytes(page)).toBeLessThanOrEqual(15 * 1024);
    });
  }
});
