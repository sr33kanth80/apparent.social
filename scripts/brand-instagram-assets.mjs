import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const root = process.cwd();
const assetDir = path.join(root, "assets", "apparent-instagram-branded-seal");
const rawDir = path.join(assetDir, "raw");
const tempDir = path.join(assetDir, ".render");
const chromeCandidates = [
  process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
].filter(Boolean);

const WIDTH = 1080;
const HEIGHT = 1350;
const BG = "#ffffff";
const INK = "#111111";

const apparentLogoPath =
  "M 128.005 191.173 C 128.448 156.208 156.93 128 192 128 L 192 64 L 128 64 C 128 99.346 99.346 128 64 128 L 64 192 L 128 192 Z M 192 256 L 64 256 C 28.654 256 0 227.346 0 192 L 0 64 L 64 64 L 64 0 L 192 0 C 227.346 0 256 28.654 256 64 L 256 192 L 192 192 Z";

const assets = [
  {
    input: "01-proof-not-pitch.png",
    output: "01-proof-not-pitch-branded.png",
    label: "Founder signal",
    meta: "Proof beats pitch",
  },
  {
    input: "02-investor-signal.png",
    output: "02-investor-signal-branded.png",
    label: "Investor signal",
    meta: "Thesis beats noise",
  },
  {
    input: "03-matched-intro.png",
    output: "03-matched-intro-branded.png",
    label: "Founder signal",
    meta: "Proof to intro",
  },
  {
    input: "04-reviewed-outreach.png",
    output: "04-reviewed-outreach-branded.png",
    label: "Investor signal",
    meta: "Reviewed outreach",
  },
  {
    input: "05-founder-proof-board.png",
    output: "05-founder-proof-board-branded.png",
    label: "Founder signal",
    meta: "Proof becomes signal",
  },
  {
    input: "06-thesis-fit-tray.png",
    output: "06-thesis-fit-tray-branded.png",
    label: "Investor signal",
    meta: "Fit moves first",
  },
  {
    input: "07-proof-thesis-intro.png",
    output: "07-proof-thesis-intro-branded.png",
    label: "Shared signal",
    meta: "Match before intro",
  },
  {
    input: "08-builder-map-lead.png",
    output: "08-builder-map-lead-branded.png",
    label: "Investor signal",
    meta: "Find hidden momentum",
  },
];

function escapeXml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderHtml({ imageUrl, label, meta, index, count }) {
  const slide = `${String(index + 1).padStart(2, "0")}/${String(count).padStart(2, "0")}`;

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; background: ${BG}; }
    .frame {
      position: relative;
      width: ${WIDTH}px;
      height: ${HEIGHT}px;
      overflow: hidden;
      background: ${BG};
      color: ${INK};
      font-family: Inter, Arial, Helvetica, sans-serif;
    }
    .border {
      position: absolute;
      inset: 24px;
      border: 4px solid ${INK};
      border-radius: 34px;
      pointer-events: none;
      z-index: 2;
    }
    .art {
      position: absolute;
      left: 60px;
      top: 54px;
      width: 960px;
      height: 1130px;
      object-fit: contain;
      background: ${BG};
      z-index: 1;
    }
    .divider {
      position: absolute;
      left: 48px;
      right: 48px;
      top: 1210px;
      height: 3px;
      background: ${INK};
      z-index: 3;
    }
    .eyebrow {
      position: absolute;
      left: 64px;
      top: 1154px;
      font-size: 28px;
      line-height: 1;
      font-weight: 800;
      z-index: 3;
    }
    .slide {
      position: absolute;
      right: 64px;
      top: 1154px;
      font-size: 28px;
      line-height: 1;
      font-weight: 700;
      z-index: 3;
    }
    .brand {
      position: absolute;
      left: 64px;
      top: 1244px;
      display: flex;
      align-items: center;
      gap: 12px;
      z-index: 3;
    }
    .brand svg {
      width: 41px;
      height: 41px;
      display: block;
    }
    .brand-name {
      font-size: 42px;
      line-height: 1;
      font-weight: 800;
    }
    .meta {
      position: absolute;
      right: 64px;
      top: 1250px;
      font-size: 30px;
      line-height: 1;
      font-weight: 700;
      z-index: 3;
    }
  </style>
</head>
<body>
  <main class="frame">
    <img class="art" src="${escapeXml(imageUrl)}" alt="">
    <div class="border"></div>
    <div class="eyebrow">${escapeXml(label)}</div>
    <div class="slide">${escapeXml(slide)}</div>
    <div class="divider"></div>
    <div class="brand">
      <svg viewBox="0 0 256 256" aria-hidden="true"><path d="${apparentLogoPath}" fill="${INK}"/></svg>
      <div class="brand-name">Apparent</div>
    </div>
    <div class="meta">${escapeXml(meta)}</div>
  </main>
</body>
</html>`;
}

await fs.mkdir(assetDir, { recursive: true });
await fs.mkdir(tempDir, { recursive: true });

async function firstExistingPath(paths) {
  for (const candidate of paths) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // Keep looking.
    }
  }
  throw new Error("Chrome or Edge was not found. Set CHROME_PATH to a browser executable.");
}

const browserPath = await firstExistingPath(chromeCandidates);

for (const [index, item] of assets.entries()) {
  const inputPath = path.join(rawDir, item.input);
  const outputPath = path.join(assetDir, item.output);
  const htmlPath = path.join(tempDir, item.output.replace(/\.png$/i, ".html"));
  const imageUrl = pathToFileURL(inputPath).href;

  await fs.writeFile(htmlPath, renderHtml({ ...item, imageUrl, index, count: assets.length }), "utf8");
  await execFileAsync(browserPath, [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--allow-file-access-from-files",
    `--window-size=${WIDTH},${HEIGHT}`,
    `--screenshot=${outputPath}`,
    pathToFileURL(htmlPath).href,
  ]);

  console.log(path.relative(root, outputPath));
}

await fs.rm(tempDir, { recursive: true, force: true });
