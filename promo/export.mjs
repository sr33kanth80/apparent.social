// promo/export.mjs
// Render each .slide in apparent-carousel.html to a PNG at 1080×1350.
//
// Setup:
//   npm i -D playwright
//   npx playwright install chromium
//
// Run:
//   node promo/export.mjs
//
// Output:
//   promo/out/01-cover.png ... 08-cta.png

import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HTML = resolve(__dirname, 'apparent-carousel.html');
const OUT = resolve(__dirname, 'out');
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1080, height: 1350 },
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
console.log(`\nDone. ${i} slides exported to promo/out/`);
