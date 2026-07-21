import fs from "node:fs";
import path from "node:path";

const out = process.argv[2] || "assets/music-bed.wav";
const duration = Number(process.argv[3] || 20);
const sampleRate = 48000;
const channels = 2;
const bitsPerSample = 16;
const samples = Math.floor(duration * sampleRate);
const dataSize = samples * channels * 2;
const buffer = Buffer.alloc(44 + dataSize);

function writeAscii(offset, value) {
  for (let i = 0; i < value.length; i += 1) buffer[offset + i] = value.charCodeAt(i);
}

function writeInt(offset, value) {
  buffer.writeUInt32LE(value, offset);
}

function writeShort(offset, value) {
  buffer.writeInt16LE(value, offset);
}

function clamp(value, min = -1, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function soft(value) {
  return Math.tanh(value * 1.18);
}

function mulberry32(seed) {
  return function random() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const random = mulberry32(73421);
const roots = [146.83, 196, 246.94, 220];
const chords = [
  [0, 4, 7, 12],
  [0, 5, 9, 12],
  [0, 3, 7, 10],
  [0, 4, 9, 12],
];
const arp = [0, 2, 3, 1, 2, 3, 2, 1];
const bpm = 118;

writeAscii(0, "RIFF");
writeInt(4, 36 + dataSize);
writeAscii(8, "WAVE");
writeAscii(12, "fmt ");
writeInt(16, 16);
buffer.writeUInt16LE(1, 20);
buffer.writeUInt16LE(channels, 22);
writeInt(24, sampleRate);
writeInt(28, sampleRate * channels * 2);
buffer.writeUInt16LE(channels * 2, 32);
buffer.writeUInt16LE(bitsPerSample, 34);
writeAscii(36, "data");
writeInt(40, dataSize);

let offset = 44;
for (let i = 0; i < samples; i += 1) {
  const t = i / sampleRate;
  const beat = (t * bpm) / 60;
  const bar = Math.floor(beat / 4);
  const chordIndex = bar % roots.length;
  const root = roots[chordIndex];
  const intervals = chords[chordIndex];

  let padL = 0;
  let padR = 0;
  for (let c = 0; c < intervals.length; c += 1) {
    const freq = root * Math.pow(2, intervals[c] / 12);
    const slow = 0.82 + 0.18 * Math.sin(t * 0.7 + c);
    padL += Math.sin(2 * Math.PI * freq * t + c * 0.41) * 0.043 * slow;
    padR += Math.sin(2 * Math.PI * freq * t + c * 0.67) * 0.043 * slow;
    padL += Math.sin(2 * Math.PI * freq * 2 * t) * 0.008;
    padR += Math.sin(2 * Math.PI * freq * 2 * t + 0.4) * 0.008;
  }

  const step = Math.floor(beat * 2) % arp.length;
  const stepPhase = (beat * 2) % 1;
  const pluckFreq = root * 2 * Math.pow(2, intervals[arp[step]] / 12);
  const pluckEnv = Math.exp(-stepPhase * 7.4);
  const pluck = (Math.sin(2 * Math.PI * pluckFreq * t) + Math.sin(2 * Math.PI * pluckFreq * 2 * t) * 0.16) * pluckEnv * 0.075;

  const kickPhase = beat % 1;
  const kick = Math.sin(2 * Math.PI * (52 + 24 * Math.exp(-kickPhase * 16)) * t) * Math.exp(-kickPhase * 10) * 0.42;
  const snapPhase = (beat + 2) % 4;
  const snap = snapPhase < 0.16 ? (random() * 2 - 1) * Math.exp(-snapPhase * 16) * 0.16 : 0;
  const hatPhase = (beat * 4) % 1;
  const hat = (random() * 2 - 1) * Math.exp(-hatPhase * 24) * 0.024;
  const bass = Math.sin(2 * Math.PI * (root / 2) * t) * 0.13 * (0.5 + Math.exp(-kickPhase * 5) * 0.5);

  const entry = clamp(t / 0.7, 0, 1);
  const exit = clamp((duration - t) / 1.5, 0, 1);
  const envelope = Math.min(entry, exit);
  const lift = t > 9.4 ? 1.12 : 1;
  const side = 0.76 + 0.24 * clamp(kickPhase * 2.4, 0, 1);

  const left = soft((padL * side + pluck * 0.95 + bass * side + kick + snap + hat) * envelope * lift);
  const right = soft((padR * side + pluck * 1.05 + bass * side + kick + snap * 0.9 + hat) * envelope * lift);

  writeShort(offset, Math.round(clamp(left) * 32767));
  writeShort(offset + 2, Math.round(clamp(right) * 32767));
  offset += 4;
}

fs.mkdirSync(path.dirname(out), {recursive: true});
fs.writeFileSync(out, buffer);
console.log(`wrote ${out}`);
