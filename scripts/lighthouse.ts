/**
 * Lighthouse (mobile, simulated slow 4G) on representative pages against the built site.
 * Run after `npm run build`: `npm run lighthouse`. Exits non-zero if a budget is missed.
 * Uses CHROME_PATH if set, otherwise the installed Chrome.
 */
import { execFileSync, spawn } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';

const PORT = 4323;
const PAGES = ['/', '/time/tokyo', '/convert/est-to-pst', '/convert/new-york-to-london'];
const BUDGET = { performance: 0.95, seo: 1, accessibility: 0.95, 'best-practices': 0.95 } as const;
const MAX_CLS = 0.02;
const OUT = '.cache/lighthouse';

async function waitForServer(url: string) {
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      // not up yet
    }
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error(`server did not start at ${url}`);
}

mkdirSync(OUT, { recursive: true });
try {
  execFileSync('npx', ['astro', 'preview', 'stop'], { shell: true, stdio: 'ignore' });
} catch {
  // nothing running
}
const server = spawn('npx', ['astro', 'preview', '--port', String(PORT)], { shell: true, stdio: 'ignore' });
let failed = false;

try {
  await waitForServer(`http://localhost:${PORT}/`);
  for (const page of PAGES) {
    const file = `${OUT}/${page === '/' ? 'home' : page.slice(1).replace(/\//g, '_')}.json`;
    execFileSync(
      'npx',
      ['lighthouse', `http://localhost:${PORT}${page}`, '--output=json', `--output-path=${file}`, '--quiet', '--chrome-flags="--headless=new"'],
      { shell: true, stdio: 'inherit' },
    );
    const report = JSON.parse(readFileSync(file, 'utf8'));
    const scores = Object.fromEntries(Object.keys(BUDGET).map(k => [k, report.categories[k].score as number]));
    const cls = report.audits['cumulative-layout-shift'].numericValue as number;
    const lcp = report.audits['largest-contentful-paint'].numericValue as number;
    const misses = [
      ...Object.entries(BUDGET).filter(([k, min]) => scores[k] < min).map(([k, min]) => `${k} ${scores[k]} < ${min}`),
      ...(cls >= MAX_CLS ? [`CLS ${cls.toFixed(3)} >= ${MAX_CLS}`] : []),
    ];
    console.log(
      `${page}: perf ${scores.performance} seo ${scores.seo} a11y ${scores.accessibility} bp ${scores['best-practices']} ` +
        `LCP ${(lcp / 1000).toFixed(2)}s CLS ${cls.toFixed(3)} ${misses.length ? `FAIL (${misses.join(', ')})` : 'ok'}`,
    );
    if (misses.length) failed = true;
  }
} finally {
  server.kill();
  try {
    execFileSync('npx', ['astro', 'preview', 'stop'], { shell: true, stdio: 'ignore' });
  } catch {
    // already stopped
  }
}
process.exit(failed ? 1 : 0);
