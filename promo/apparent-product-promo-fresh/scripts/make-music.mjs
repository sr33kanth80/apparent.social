import fs from "node:fs";
import path from "node:path";

const out = process.argv[2] || "assets/music-bed.wav";
const duration = Number(process.argv[3] || 24);
const sampleRate = 48000;
const channels = 2;
const samples = Math.floor(duration * sampleRate);
const buffer = Buffer.alloc(44 + samples * channels * 2);

function writeAscii(offset, value) {
  for (let i = 0; i < value.length; i += 1) buffer[offset + i] = value.charCodeAt(i);
}

function clamp(value, min = -1, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function soft(value) {
  return Math.tanh(value * 1.22);
}

function rng(seed) {
  return function next() {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const random = rng(42241);
const dataSize = samples * channels * 2;
writeAscii(0, "RIFF");
buffer.writeUInt32LE(36 + dataSize, 4);
writeAscii(8, "WAVE");
writeAscii(12, "fmt ");
buffer.writeUInt32LE(16, 16);
buffer.writeUInt16LE(1, 20);
buffer.writeUInt16LE(channels, 22);
buffer.writeUInt32LE(sampleRate, 24);
buffer.writeUInt32LE(sampleRate * channels * 2, 28);
buffer.writeUInt16LE(channels * 2, 32);
buffer.writeUInt16LE(16, 34);
writeAscii(36, "data");
buffer.writeUInt32LE(dataSize, 40);

const roots = [110, 146.83, 196, 164.81];
const chords = [
  [0, 7, 12, 16],
  [0, 5, 9, 12],
  [0, 4, 7, 11],
  [0, 3, 7, 10],
];
const arp = [0, 2, 3, 2, 1, 2, 3, 1];
const bpm = 122;
let offset = 44;

for (let i = 0; i < samples; i += 1) {
  const t = i / sampleRate;
  const beat = (t * bpm) / 60;
  const bar = Math.floor(beat / 4);
  const root = roots[bar % roots.length];
  const intervals = chords[bar % chords.length];
  const phase = beat % 1;
  let padL = 0;
  let padR = 0;

  for (let c = 0; c < intervals.length; c += 1) {
    const f = root * Math.pow(2, intervals[c] / 12);
    const drift = 0.78 + 0.22 * Math.sin(t * 0.52 + c);
    padL += Math.sin(2 * Math.PI * f * t + c * 0.21) * 0.033 * drift;
    padR += Math.sin(2 * Math.PI * f * t + c * 0.41) * 0.033 * drift;
  }

  const step = Math.floor(beat * 2) % arp.length;
  const stepPhase = (beat * 2) % 1;
  const pluckFreq = root * 2 * Math.pow(2, intervals[arp[step]] / 12);
  const pluck = Math.sin(2 * Math.PI * pluckFreq * t) * Math.exp(-stepPhase * 7.6) * 0.06;
  const bass = Math.sin(2 * Math.PI * (root / 2) * t) * 0.16 * (0.55 + 0.45 * Math.exp(-phase * 6));
  const kick = Math.sin(2 * Math.PI * (48 + 28 * Math.exp(-phase * 15)) * t) * Math.exp(-phase * 10) * 0.46;
  const snapPhase = (beat + 2) % 4;
  const snap = snapPhase < 0.18 ? (random() * 2 - 1) * Math.exp(-snapPhase * 18) * 0.13 : 0;
  const tickPhase = (beat * 4) % 1;
  const tick = (random() * 2 - 1) * Math.exp(-tickPhase * 30) * 0.024;
  const entry = clamp(t / 0.55, 0, 1);
  const exit = clamp((duration - t) / 1.2, 0, 1);
  const lift = t > 9 ? 1.08 : 1;
  const side = 0.76 + 0.24 * clamp(phase * 2.8, 0, 1);
  const l = soft((padL * side + bass * side + pluck + kick + snap + tick) * entry * exit * lift);
  const r = soft((padR * side + bass * side + pluck * 1.04 + kick + snap * 0.9 + tick) * entry * exit * lift);
  buffer.writeInt16LE(Math.round(clamp(l) * 32767), offset);
  buffer.writeInt16LE(Math.round(clamp(r) * 32767), offset + 2);
  offset += 4;
}

fs.mkdirSync(path.dirname(out), {recursive: true});
fs.writeFileSync(out, buffer);
console.log(`wrote ${out}`);
