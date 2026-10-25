/**
 * Renders the social share images (public/og/*.png) and the apple-touch-icon from SVG.
 * Run manually after changing the artwork: `npx tsx scripts/make-images.ts`. Outputs are committed.
 */
import { mkdirSync } from 'node:fs';
import sharp from 'sharp';

const FONT = "'Manrope', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif";

const logo = (x: number, y: number, s: number, ink: string) => `
  <g transform="translate(${x} ${y}) scale(${s})">
    <path d="M5 25.5 Q16 1.5 27 25.5" fill="none" stroke="${ink}" stroke-width="2.4" stroke-linecap="round" stroke-dasharray="0.1 4.6"/>
    <path d="M3 27.5h26" stroke="${ink}" stroke-width="2.4" stroke-linecap="round"/>
    <circle cx="16" cy="13.5" r="5" fill="#ffb627"/>
  </g>`;

const SKIES = {
  day: ['#5fb4ee', '#a9dcff', '#0b1220'],
  night: ['#0f1a3d', '#23306b', '#ffffff'],
  dusk: ['#f59e5b', '#b4639e', '#0b1220'],
} as const;

function card(headline: string, sub: string, sky: keyof typeof SKIES): string {
  const [from, to, ink] = SKIES[sky];
  const stars =
    sky === 'night'
      ? [[120, 90], [340, 60], [520, 140], [760, 80], [980, 120], [1100, 60], [880, 200], [220, 220]]
          .map(([cx, cy]) => `<circle cx="${cx}" cy="${cy}" r="2" fill="#fff" opacity="0.8"/>`)
          .join('')
      : '';
  const sun = sky === 'night' ? '' : `<circle cx="930" cy="170" r="70" fill="#ffb627"/><circle cx="930" cy="170" r="38" fill="#fff7da"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <defs><linearGradient id="g" x1="0" y1="0" x2="0.4" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs>
    <rect width="1200" height="630" fill="url(#g)"/>
    ${stars}${sun}
    ${logo(72, 64, 2.2, ink)}
    <text x="148" y="112" font-family="${FONT}" font-size="40" font-weight="800" fill="${ink}">TimezoneHop</text>
    <text x="72" y="430" font-family="${FONT}" font-size="76" font-weight="750" fill="${ink}" letter-spacing="-2">${headline}</text>
    <text x="72" y="510" font-family="${FONT}" font-size="36" font-weight="500" fill="${ink}" opacity="0.85">${sub}</text>
  </svg>`;
}

const OG: Record<string, [string, string, keyof typeof SKIES]> = {
  home: ['World clock &amp; converter', 'The time anywhere, and when to call', 'day'],
  place: ['What time is it there?', 'Live local time for 1,200+ places', 'night'],
  timezone: ['Every time zone, explained', 'EST, CET, IST, JST and every UTC offset', 'dusk'],
  pair: ['Convert time zones', 'Find a time that works in every city', 'day'],
  default: ['TimezoneHop', 'World clock and time zone converter', 'day'],
};

mkdirSync('public/og', { recursive: true });
for (const [name, [headline, sub, sky]] of Object.entries(OG)) {
  await sharp(Buffer.from(card(headline, sub, sky))).png({ compressionLevel: 9 }).toFile(`public/og/${name}.png`);
}

const icon = `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 180 180">
  <rect width="180" height="180" fill="#f3f5fa"/>${logo(26, 22, 4, '#121a33')}</svg>`;
await sharp(Buffer.from(icon)).png().toFile('public/apple-touch-icon.png');
console.log('images written');
