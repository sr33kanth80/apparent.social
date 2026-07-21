import fs from "node:fs";
import path from "node:path";
import {createRequire} from "node:module";

const require = createRequire(import.meta.url);
const sharp = require("sharp");

const ROOT = process.cwd();
const WIDTH = 1080;
const HEIGHT = 1920;
const FPS = 30;
const DURATION = 20;
const TOTAL_FRAMES = FPS * DURATION;

const workDir = path.join(ROOT, "promo", "how-proof-gets-funded-openclaw-animated-work");
const framesDir = path.join(workDir, "frames");
const assetDir = path.join(ROOT, "assets", "how-proof-gets-funded-openclaw");
const musicPath = path.join(workDir, "music-bed.wav");

fs.mkdirSync(framesDir, {recursive: true});

const assets = [
  "01-scattered-proof.png",
  "02-verified-proof.png",
  "03-heat-map-route.png",
  "04-thesis-match.png",
  "05-warm-investor-conversation.png",
].map((file) => {
  const bytes = fs.readFileSync(path.join(assetDir, file));
  return `data:image/png;base64,${bytes.toString("base64")}`;
});

const scenes = [
  {
    start: 1.8,
    end: 5.0,
    title: "Your startup already has proof.",
    subtitle: "Repos. Launches. Early users.",
    asset: 0,
    action: "sort",
  },
  {
    start: 5.0,
    end: 8.1,
    title: "Make it investor-readable.",
    subtitle: "npx apparent turns work into a proof card.",
    asset: 1,
    action: "stamp",
  },
  {
    start: 8.1,
    end: 11.5,
    title: "Find the investors who fit.",
    subtitle: "Stage, sector, city, thesis.",
    asset: 2,
    action: "map",
  },
  {
    start: 11.5,
    end: 14.8,
    title: "Match proof to thesis.",
    subtitle: "The right investor sees why now.",
    asset: 3,
    action: "weigh",
  },
  {
    start: 14.8,
    end: 18.0,
    title: "Turn cold into warm.",
    subtitle: "Proof makes the first conversation easier.",
    asset: 4,
    action: "bridge",
  },
];

const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
const lerp = (start, end, amount) => start + (end - start) * amount;
const easeOut = (n) => 1 - Math.pow(1 - clamp(n), 3);
const easeInOut = (n) => {
  const c = clamp(n);
  return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
};
const pop = (n) => {
  const c = clamp(n);
  return 1 + Math.sin(c * Math.PI) * 0.07;
};
const esc = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

function text(value, x, y, size, fill = "#17140f", weight = 700, extra = "") {
  return `<text x="${x}" y="${y}" font-family="Segoe UI, Arial, sans-serif" font-size="${size}" font-weight="${weight}" letter-spacing="0" fill="${fill}" ${extra}>${esc(value)}</text>`;
}

function centeredText(value, x, y, size, fill = "#17140f", weight = 750) {
  return text(value, x, y, size, fill, weight, 'text-anchor="middle"');
}

function panel(x, y, w, h, fill = "#fffdf8", stroke = "#17140f", opacity = 1) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="20" fill="${fill}" stroke="${stroke}" stroke-width="5" opacity="${opacity}"/>`;
}

function shadowedPanel(x, y, w, h, fill = "#fffdf8") {
  return `<g><rect x="${x + 12}" y="${y + 12}" width="${w}" height="${h}" rx="20" fill="#17140f" opacity="0.14"/>${panel(x, y, w, h, fill)}</g>`;
}

function backdrop(asset, t, sceneStart, sceneEnd) {
  const phase = clamp((t - sceneStart) / (sceneEnd - sceneStart));
  const opacity = 0.15 + Math.sin(phase * Math.PI) * 0.07;
  const scale = 1.02 + phase * 0.035;
  const w = 900 * scale;
  const h = 506 * scale;
  return `<image href="${asset}" x="${(WIDTH - w) / 2}" y="${330 - (h - 506) / 2}" width="${w}" height="${h}" opacity="${opacity}" preserveAspectRatio="xMidYMid slice"/>`;
}

function openClaw({x, y, scale = 1, mood = "focus", wave = 0, bob = 0, body = "#f2d16b", scarf = "#f06b35"}) {
  const eyeY = mood === "happy" ? -8 : -4;
  const mouth = mood === "happy"
    ? `<path d="M-28 30 Q0 52 28 30" fill="none" stroke="#17140f" stroke-width="6" stroke-linecap="round"/>`
    : `<path d="M-25 33 Q0 42 25 33" fill="none" stroke="#17140f" stroke-width="6" stroke-linecap="round"/>`;
  const leftWave = Math.sin(wave) * 18;
  const rightWave = Math.cos(wave * 0.9) * 15;
  const floatY = Math.sin(bob) * 10;
  return `
    <g transform="translate(${x} ${y + floatY}) scale(${scale})">
      <ellipse cx="0" cy="98" rx="86" ry="20" fill="#17140f" opacity="0.12"/>
      <path d="M-58 76 L-88 118" stroke="#17140f" stroke-width="10" stroke-linecap="round"/>
      <path d="M58 76 L88 118" stroke="#17140f" stroke-width="10" stroke-linecap="round"/>
      <path d="M-92 118 Q-112 128 -132 116" fill="none" stroke="#17140f" stroke-width="10" stroke-linecap="round"/>
      <path d="M92 118 Q112 128 132 116" fill="none" stroke="#17140f" stroke-width="10" stroke-linecap="round"/>
      <line x1="-45" y1="-92" x2="-75" y2="-146" stroke="#17140f" stroke-width="8" stroke-linecap="round"/>
      <line x1="45" y1="-92" x2="75" y2="-146" stroke="#17140f" stroke-width="8" stroke-linecap="round"/>
      <circle cx="-79" cy="-153" r="15" fill="#3b82f6" stroke="#17140f" stroke-width="6"/>
      <circle cx="79" cy="-153" r="15" fill="#ef4444" stroke="#17140f" stroke-width="6"/>
      <circle cx="0" cy="0" r="112" fill="${body}" stroke="#17140f" stroke-width="8"/>
      <path d="M-84 56 C-45 84 45 84 84 56 L84 86 C42 116 -42 116 -84 86 Z" fill="${scarf}" stroke="#17140f" stroke-width="6"/>
      <circle cx="-40" cy="${eyeY}" r="12" fill="#17140f"/>
      <circle cx="40" cy="${eyeY}" r="12" fill="#17140f"/>
      <circle cx="-35" cy="${eyeY - 4}" r="4" fill="#fff"/>
      <circle cx="45" cy="${eyeY - 4}" r="4" fill="#fff"/>
      ${mouth}
      <g transform="translate(-111 -18) rotate(${-18 + leftWave})">
        <path d="M0 0 C-40 -34 -72 -28 -88 -2" fill="none" stroke="#17140f" stroke-width="11" stroke-linecap="round"/>
        <path d="M0 0 C-35 28 -68 22 -88 -2" fill="none" stroke="#17140f" stroke-width="11" stroke-linecap="round"/>
      </g>
      <g transform="translate(111 -18) rotate(${18 + rightWave})">
        <path d="M0 0 C40 -34 72 -28 88 -2" fill="none" stroke="#17140f" stroke-width="11" stroke-linecap="round"/>
        <path d="M0 0 C35 28 68 22 88 -2" fill="none" stroke="#17140f" stroke-width="11" stroke-linecap="round"/>
      </g>
    </g>
  `;
}

function headerBlock(scene, p) {
  const y = lerp(192, 158, easeOut(p));
  const opacity = clamp(p * 2.2);
  return `
    <g opacity="${opacity}">
      ${centeredText(scene.title, WIDTH / 2, y, 54, "#17140f", 780)}
      ${centeredText(scene.subtitle, WIDTH / 2, y + 64, 30, "#5b5448", 620)}
    </g>
  `;
}

function chip(label, x, y, active = false) {
  return `<g>
    <rect x="${x}" y="${y}" width="196" height="58" rx="29" fill="${active ? "#17140f" : "#ffffff"}" stroke="#17140f" stroke-width="4"/>
    ${centeredText(label, x + 98, y + 39, 22, active ? "#fffdf8" : "#17140f", 750)}
  </g>`;
}

function proofCard(x, y, scale, title, sub, accent = "#3b82f6") {
  return `<g transform="translate(${x} ${y}) scale(${scale})">
    <rect x="10" y="10" width="360" height="196" rx="18" fill="#17140f" opacity="0.13"/>
    <rect x="0" y="0" width="360" height="196" rx="18" fill="#fffdf8" stroke="#17140f" stroke-width="5"/>
    <rect x="24" y="26" width="74" height="74" rx="18" fill="${accent}" stroke="#17140f" stroke-width="4"/>
    ${text(title, 118, 54, 28, "#17140f", 780)}
    ${text(sub, 118, 91, 20, "#5b5448", 620)}
    <rect x="26" y="126" width="304" height="18" rx="9" fill="#ede6d6"/>
    <rect x="26" y="158" width="224" height="18" rx="9" fill="#ede6d6"/>
  </g>`;
}

function sortScene(p, t) {
  const gather = easeInOut(p);
  const pieces = [
    ["repo", "#3b82f6", 110, 680, 250, 1020],
    ["launch", "#f06b35", 730, 720, 430, 1020],
    ["users", "#22c55e", 420, 600, 610, 1020],
  ];
  return `
    ${pieces.map(([label, color, sx, sy, ex, ey], index) => {
      const wobble = Math.sin(t * 5 + index) * 8;
      const x = lerp(sx, ex, gather);
      const y = lerp(sy, ey, gather) + wobble * (1 - gather);
      return `<g transform="translate(${x} ${y}) rotate(${wobble}) scale(${pop(clamp((p - index * 0.08) / 0.55))})">
        <rect x="-92" y="-44" width="184" height="88" rx="16" fill="${color}" stroke="#17140f" stroke-width="5"/>
        ${centeredText(label, 0, 9, 27, "#fffdf8", 800)}
      </g>`;
    }).join("")}
    ${openClaw({x: 540, y: 1320, scale: 1.02, mood: "happy", wave: t * 7, bob: t * 4})}
  `;
}

function stampScene(p, t) {
  const stamp = easeOut(clamp((p - 0.25) / 0.35));
  const stampScale = lerp(1.8, 1, stamp);
  const stampOpacity = clamp((p - 0.18) / 0.2);
  return `
    ${proofCard(230, 710, 1.7, "Verified proof", "Built, shipped, used", "#22c55e")}
    <g opacity="${stampOpacity}" transform="translate(540 1040) rotate(-10) scale(${stampScale})">
      <rect x="-190" y="-62" width="380" height="124" rx="22" fill="#fffdf8" stroke="#ef4444" stroke-width="9"/>
      ${centeredText("INVESTOR READY", 0, 13, 38, "#ef4444", 850)}
    </g>
    ${openClaw({x: 260 + Math.sin(t * 3) * 10, y: 1340, scale: 0.74, mood: "focus", wave: t * 6, bob: t * 4, body: "#d9b4ff", scarf: "#3b82f6"})}
    ${openClaw({x: 820 + Math.sin(t * 3 + 1) * 10, y: 1345, scale: 0.76, mood: "happy", wave: t * 7, bob: t * 4 + 1, body: "#f2d16b", scarf: "#f06b35"})}
  `;
}

function mapScene(p, t) {
  const route = easeInOut(clamp((p - 0.1) / 0.75));
  const dotX = lerp(260, 820, route);
  const dotY = lerp(1150, 800, route) + Math.sin(route * Math.PI * 3) * 45;
  return `
    ${shadowedPanel(150, 640, 780, 650, "#f6efe0")}
    <path d="M230 1140 C380 920 510 1250 640 990 S760 760 840 812" fill="none" stroke="#17140f" stroke-width="8" stroke-linecap="round" stroke-dasharray="${route * 980} 980"/>
    ${["NYC", "SF", "Austin", "Miami"].map((city, i) => {
      const points = [[230, 1140], [478, 1025], [655, 990], [840, 812]];
      const [x, y] = points[i];
      return `<g>
        <circle cx="${x}" cy="${y}" r="${30 + Math.sin(t * 5 + i) * 4}" fill="${i === 1 ? "#f06b35" : "#3b82f6"}" stroke="#17140f" stroke-width="5"/>
        ${centeredText(city, x, y + 74, 22, "#17140f", 760)}
      </g>`;
    }).join("")}
    <circle cx="${dotX}" cy="${dotY}" r="24" fill="#22c55e" stroke="#17140f" stroke-width="6"/>
    ${chip("stage", 184, 1330, route > 0.2)}
    ${chip("sector", 442, 1330, route > 0.45)}
    ${chip("thesis", 700, 1330, route > 0.7)}
    ${openClaw({x: dotX, y: dotY - 105, scale: 0.42, mood: "happy", wave: t * 10, bob: t * 6, body: "#f2d16b", scarf: "#22c55e"})}
  `;
}

function weighScene(p, t) {
  const tilt = Math.sin(t * 2.6) * 5 * (1 - clamp((p - 0.55) / 0.3));
  const locked = easeOut(clamp((p - 0.46) / 0.35));
  return `
    <g transform="translate(540 940) rotate(${tilt})">
      <line x1="-280" y1="0" x2="280" y2="0" stroke="#17140f" stroke-width="10" stroke-linecap="round"/>
      <line x1="0" y1="0" x2="0" y2="360" stroke="#17140f" stroke-width="10" stroke-linecap="round"/>
      <path d="M-260 0 L-340 180 L-180 180 Z" fill="#fffdf8" stroke="#17140f" stroke-width="6"/>
      <path d="M260 0 L180 180 L340 180 Z" fill="#fffdf8" stroke="#17140f" stroke-width="6"/>
      ${centeredText("proof", -260, 128, 30, "#17140f", 800)}
      ${centeredText("thesis", 260, 128, 30, "#17140f", 800)}
    </g>
    <g opacity="${locked}" transform="translate(540 1370) scale(${pop(locked)})">
      <circle cx="0" cy="0" r="86" fill="#22c55e" stroke="#17140f" stroke-width="7"/>
      <path d="M-38 -3 L-10 28 L45 -34" fill="none" stroke="#fffdf8" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/>
    </g>
    ${openClaw({x: 305, y: 1470, scale: 0.58, mood: "happy", wave: t * 6, bob: t * 3, body: "#d9b4ff", scarf: "#3b82f6"})}
    ${openClaw({x: 775, y: 1470, scale: 0.58, mood: "happy", wave: t * 6 + 2, bob: t * 3 + 1, body: "#f2d16b", scarf: "#f06b35"})}
  `;
}

function bridgeScene(p, t) {
  const bridge = easeInOut(clamp((p - 0.1) / 0.6));
  const cardX = lerp(130, 360, bridge);
  const investorX = lerp(890, 720, bridge);
  return `
    <path d="M220 1130 C380 970 660 970 840 1130" fill="none" stroke="#17140f" stroke-width="12" stroke-linecap="round" stroke-dasharray="${bridge * 780} 780"/>
    ${proofCard(cardX - 130, 850, 0.82, "Proof", "clear signal", "#22c55e")}
    <g transform="translate(${investorX} 930)">
      ${shadowedPanel(-140, -90, 280, 180, "#fffdf8")}
      ${centeredText("VC thesis", 0, -20, 30, "#17140f", 820)}
      ${centeredText("matches", 0, 38, 28, "#f06b35", 820)}
    </g>
    <g opacity="${clamp((p - 0.55) / 0.24)}" transform="translate(540 1200) scale(${pop(clamp((p - 0.55) / 0.24))})">
      <rect x="-170" y="-58" width="340" height="116" rx="58" fill="#17140f"/>
      ${centeredText("warm intro", 0, 14, 36, "#fffdf8", 830)}
    </g>
    ${openClaw({x: 270, y: 1435, scale: 0.7, mood: "happy", wave: t * 8, bob: t * 4, body: "#f2d16b", scarf: "#f06b35"})}
    ${openClaw({x: 810, y: 1435, scale: 0.7, mood: "happy", wave: t * 8 + 2, bob: t * 4 + 1, body: "#d9b4ff", scarf: "#3b82f6"})}
  `;
}

function sceneAction(scene, p, t) {
  if (scene.action === "sort") return sortScene(p, t);
  if (scene.action === "stamp") return stampScene(p, t);
  if (scene.action === "map") return mapScene(p, t);
  if (scene.action === "weigh") return weighScene(p, t);
  return bridgeScene(p, t);
}

function intro(t) {
  const p = easeOut(t / 1.8);
  return `
    <rect x="0" y="0" width="${WIDTH}" height="${HEIGHT}" fill="#fbfaf7"/>
    <circle cx="186" cy="318" r="${80 + Math.sin(t * 8) * 8}" fill="#3b82f6" opacity="0.12"/>
    <circle cx="894" cy="1458" r="${110 + Math.cos(t * 7) * 8}" fill="#f06b35" opacity="0.12"/>
    <g transform="translate(540 ${lerp(980, 850, p)}) scale(${lerp(0.84, 1.08, p)})">
      ${openClaw({x: 0, y: 0, scale: 1, mood: "happy", wave: t * 9, bob: t * 5})}
    </g>
    <g opacity="${p}">
      ${centeredText("APPARENT", 540, 1235, 74, "#17140f", 850)}
      ${centeredText("Proof gets funded faster.", 540, 1300, 34, "#5b5448", 650)}
    </g>
  `;
}

function outro(t) {
  const p = easeOut((t - 18) / 2);
  const y = lerp(1050, 905, p);
  return `
    <rect x="0" y="0" width="${WIDTH}" height="${HEIGHT}" fill="#fbfaf7"/>
    ${openClaw({x: 540, y: y - 180, scale: 0.98, mood: "happy", wave: t * 9, bob: t * 4, body: "#f2d16b", scarf: "#f06b35"})}
    <g opacity="${p}">
      ${centeredText("Run npx apparent", 540, 1165, 66, "#17140f", 850)}
      ${centeredText("Turn proof into investor signal.", 540, 1232, 33, "#5b5448", 650)}
      <g transform="translate(540 1368) scale(${pop(p)})">
        <rect x="-238" y="-56" width="476" height="112" rx="56" fill="#17140f"/>
        ${centeredText("Get discovered", 0, 14, 38, "#fffdf8", 820)}
      </g>
    </g>
  `;
}

function sceneFrame(scene, t) {
  const p = clamp((t - scene.start) / (scene.end - scene.start));
  const enter = easeOut(clamp((t - scene.start) / 0.5));
  return `
    <rect x="0" y="0" width="${WIDTH}" height="${HEIGHT}" fill="#fbfaf7"/>
    ${backdrop(assets[scene.asset], t, scene.start, scene.end)}
    ${headerBlock(scene, enter)}
    <g opacity="${clamp((p + 0.05) * 1.3)}">
      ${sceneAction(scene, p, t)}
    </g>
    <g opacity="0.72">
      <line x1="150" y1="1710" x2="${150 + 780 * clamp(t / DURATION)}" y2="1710" stroke="#17140f" stroke-width="7" stroke-linecap="round"/>
      <line x1="${150 + 780 * clamp(t / DURATION)}" y1="1710" x2="930" y2="1710" stroke="#d9d0c0" stroke-width="7" stroke-linecap="round"/>
    </g>
  `;
}

function frameSvg(frame) {
  const t = frame / FPS;
  let content = "";
  if (t < 1.8) {
    content = intro(t);
  } else if (t >= 18) {
    content = outro(t);
  } else {
    const scene = scenes.find((candidate) => t >= candidate.start && t < candidate.end) || scenes[scenes.length - 1];
    content = sceneFrame(scene, t);
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
  <svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
    <style>
      text { paint-order: stroke; }
    </style>
    ${content}
  </svg>`;
}

function writeMusicWav(file, durationSeconds) {
  const sampleRate = 44100;
  const channels = 2;
  const bitsPerSample = 16;
  const samples = Math.floor(durationSeconds * sampleRate);
  const dataSize = samples * channels * (bitsPerSample / 8);
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(channels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * channels * (bitsPerSample / 8), 28);
  buffer.writeUInt16LE(channels * (bitsPerSample / 8), 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  const notes = [220, 277.18, 329.63, 415.3, 554.37, 659.25];
  let offset = 44;
  for (let i = 0; i < samples; i += 1) {
    const second = i / sampleRate;
    const beat = Math.floor(second * 2.3);
    const note = notes[beat % notes.length];
    const next = notes[(beat + 2) % notes.length];
    const kick = Math.sin(2 * Math.PI * 58 * second) * Math.exp(-((second * 2.3) % 1) * 8);
    const tone = Math.sin(2 * Math.PI * note * second) * 0.32 + Math.sin(2 * Math.PI * next * second) * 0.18;
    const hat = (Math.random() * 2 - 1) * 0.04 * (beat % 2 === 0 ? 1 : 0.45);
    const fadeIn = clamp(second / 0.55);
    const fadeOut = clamp((durationSeconds - second) / 1.1);
    const envelope = Math.min(fadeIn, fadeOut);
    const value = clamp((tone + kick * 0.55 + hat) * envelope, -1, 1);
    const sample = Math.round(value * 32767);
    buffer.writeInt16LE(sample, offset);
    buffer.writeInt16LE(sample, offset + 2);
    offset += 4;
  }

  fs.writeFileSync(file, buffer);
}

async function renderFrames() {
  for (let frame = 0; frame < TOTAL_FRAMES; frame += 1) {
    const file = path.join(framesDir, `frame-${String(frame).padStart(4, "0")}.png`);
    const svg = frameSvg(frame);
    await sharp(Buffer.from(svg)).png().toFile(file);
    if (frame % 30 === 0) {
      console.log(`rendered ${frame}/${TOTAL_FRAMES}`);
    }
  }
}

async function main() {
  writeMusicWav(musicPath, DURATION);
  await renderFrames();
  console.log(`wrote ${TOTAL_FRAMES} animated frames and ${musicPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
