// promo/export-pitch-deck.mjs
// Render each .slide in apparent-pitch-deck.html to a PNG at 1920×1080.
//
// Setup:
//   npm i -D playwright
//   npx playwright install chromium
//
// Run:
//   node promo/export-pitch-deck.mjs
//
// Output:
//   promo/out/01-cover.png ... 14-vision.png

import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HTML = resolve(__dirname, 'apparent-pitch-deck.html');
const OUT = resolve(__dirname, 'out', 'pitch-deck');
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 2, // 2x for crisp output
});
const page = await ctx.newPage();
await page.goto('file://' + HTML);
// give web fonts a beat to settle
await page.waitForTimeout(400);

const slides = await page.$$('.slide');
let i = 0;
for (const slide of slides) {
  i++;
  const name = (await slide.getAttribute('data-slide')) || `slide-${i}`;
  const file = resolve(OUT, `${name}.png`);
  await slide.screenshot({ path: file, omitBackground: false });
  console.log(`✔ ${name}.png`);
}

await browser.close();
console.log(`\nDone. ${i} slides exported to promo/out/pitch-deck/`);
