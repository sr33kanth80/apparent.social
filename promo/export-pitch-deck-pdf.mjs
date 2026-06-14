// promo/export-pitch-deck-pdf.mjs
// Render apparent-pitch-deck.html to a single multi-page PDF — one slide per
// page, at the deck's native 1920x1080 — using the system Chrome/Edge in
// headless mode. No npm install / Chromium download required.
//
// Why image-based: Chrome's --print-to-pdf path does not reliably embed
// multi-weight @font-face web fonts (it silently falls back to Arial). Chrome's
// *screenshot* path renders them perfectly. So we screenshot each slide at 2x
// (Inter baked in as pixels) and then assemble those PNGs into the PDF via
// <img>, which print-to-pdf handles flawlessly.
//
// Run:  node promo/export-pitch-deck-pdf.mjs
// Out:  promo/apparent-pitch-deck.pdf

import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { readFileSync, writeFileSync, existsSync, rmSync, mkdirSync, mkdtempSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(__dirname, 'apparent-pitch-deck.html');
// So relative assets in the deck (e.g. founder-sree.png) resolve against the
// promo/ folder even though the per-slide temp HTML lives in a subdirectory.
const BASE_HREF = `file:///${__dirname.split('\\').join('/')}/`;
const WORK = resolve(__dirname, '_pdf-build');
const OUT = resolve(__dirname, 'apparent-pitch-deck.pdf');

const W = 1920;
const H = 1080;
const SCALE = 2; // 2x for crisp output

const CHROME_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const FONT_CSS_URL = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap';

function findBrowser() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  ].filter(Boolean);
  const found = candidates.find((p) => existsSync(p));
  if (!found) {
    console.error('No Chrome/Edge found. Set CHROME_PATH to a Chromium binary.');
    process.exit(1);
  }
  return found;
}

function runChrome(browser, extraArgs, fileUrl) {
  const profile = mkdtempSync(join(tmpdir(), 'apparent-pdf-'));
  const res = spawnSync(
    browser,
    [
      '--headless=old', // old headless renders @font-face reliably in screenshots
      '--disable-gpu',
      `--user-data-dir=${profile}`, // fresh instance, not the user's running Chrome
      '--no-first-run',
      '--hide-scrollbars',
      ...extraArgs,
      fileUrl,
    ],
    { stdio: ['ignore', 'ignore', 'inherit'] },
  );
  rmSync(profile, { recursive: true, force: true });
  return res.status;
}

// Inline Inter as base64 so the screenshot render never depends on a live
// Google Fonts fetch (the render path, unlike the print path, loads data: URIs).
async function inlineInter(source) {
  const cssRes = await fetch(FONT_CSS_URL, { headers: { 'User-Agent': CHROME_UA } });
  if (!cssRes.ok) throw new Error(`font css ${cssRes.status}`);
  let css = await cssRes.text();
  const urls = [...new Set([...css.matchAll(/url\((https:\/\/[^)]+\.woff2)\)/g)].map((m) => m[1]))];
  const cache = new Map();
  for (const url of urls) {
    const r = await fetch(url, { headers: { 'User-Agent': CHROME_UA } });
    if (!r.ok) throw new Error(`font file ${r.status}`);
    cache.set(url, `data:font/woff2;base64,${Buffer.from(await r.arrayBuffer()).toString('base64')}`);
  }
  css = css.replace(/url\((https:\/\/[^)]+\.woff2)\)/g, (_, u) => `url(${cache.get(u)})`);
  const styleTag = `<style id="inter-inline">${css}</style>`;
  const linkRe = /<link[^>]+fonts\.googleapis\.com\/css2[^>]*>/;
  return linkRe.test(source) ? source.replace(linkRe, styleTag) : source.replace('</head>', `${styleTag}\n</head>`);
}

const browser = findBrowser();
rmSync(WORK, { recursive: true, force: true });
mkdirSync(WORK, { recursive: true });

let html = readFileSync(SRC, 'utf8');
try {
  html = await inlineInter(html);
  console.log('✔ Inter inlined for rendering');
} catch (err) {
  console.warn(`⚠ could not inline Inter (${err.message}); rendering with live font load`);
}

// Only the real <section class="slide" data-slide="…"> elements, in DOM order.
// (data-slide also appears on a thumbnail/index block, so scope to sections.)
const slideNames = [...html.matchAll(/<section\b[^>]*>/g)]
  .map((m) => m[0])
  .filter((tag) => /\bclass="slide(\s|")/.test(tag))
  .map((tag) => (tag.match(/data-slide="([^"]+)"/) || [])[1])
  .filter(Boolean);
if (slideNames.length === 0) {
  console.error('No .slide[data-slide] elements found.');
  process.exit(1);
}
console.log(`Found ${slideNames.length} slides. Capturing at ${W * SCALE}x${H * SCALE}…`);

// 1) Screenshot each slide alone, at native size, with Inter baked in.
const pngPaths = [];
slideNames.forEach((name, i) => {
  const solo = `<style id="solo">
    html, body { background:#fff !important; margin:0 !important; padding:0 !important; gap:0 !important; display:block !important; }
    .slide { display:none !important; }
    .slide[data-slide="${name}"] { display:block !important; margin:0 !important; }
  </style>`;
  const perSlide = html.replace('</head>', `<base href="${BASE_HREF}">\n${solo}\n</head>`);
  const htmlPath = resolve(WORK, `slide-${i}.html`);
  const pngPath = resolve(WORK, `slide-${i}.png`);
  writeFileSync(htmlPath, perSlide);
  const fileUrl = `file:///${htmlPath.split('\\').join('/')}`;
  const status = runChrome(
    browser,
    [`--force-device-scale-factor=${SCALE}`, `--window-size=${W},${H}`, `--screenshot=${pngPath}`, '--virtual-time-budget=10000'],
    fileUrl,
  );
  if (status !== 0 || !existsSync(pngPath)) {
    console.error(`Failed to screenshot slide ${i} (${name}).`);
    process.exit(1);
  }
  pngPaths.push(pngPath);
  process.stdout.write(`  ✔ ${name}\n`);
});

// 2) Assemble the PNGs into one PDF — each image fills a 1920x1080 page.
const pages = pngPaths
  .map((p) => `<div class="pg"><img src="file:///${p.split('\\').join('/')}"></div>`)
  .join('\n');
const assembly = `<!doctype html><html><head><meta charset="utf8"><style>
  @page { size: ${W}px ${H}px; margin: 0; }
  * { margin: 0; padding: 0; }
  img { display: block; width: ${W}px; height: ${H}px; }
  .pg { break-after: page; page-break-after: always; }
  .pg:last-child { break-after: auto; page-break-after: auto; }
</style></head><body>${pages}</body></html>`;
const assemblyPath = resolve(WORK, 'assembly.html');
writeFileSync(assemblyPath, assembly);

const printStatus = runChrome(
  browser,
  ['--no-pdf-header-footer', `--print-to-pdf=${OUT}`, '--virtual-time-budget=8000'],
  `file:///${assemblyPath.split('\\').join('/')}`,
);

if (!process.env.KEEP_BUILD) rmSync(WORK, { recursive: true, force: true });

if (printStatus !== 0 || !existsSync(OUT)) {
  console.error('PDF assembly failed.');
  process.exit(1);
}
console.log(`\n✔ ${OUT} (${(statSync(OUT).size / 1024 / 1024).toFixed(1)} MB, ${slideNames.length} pages)`);
