'use strict';

// Tiny ANSI + prompt helpers. Zero dependencies on purpose — people inspect npx
// tools, and a fat dep tree reads as supply-chain risk.

const readline = require('readline');

const isTTY = process.stdout.isTTY && process.stdin.isTTY;

const codes = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[38;5;106m',
  gray: '\x1b[90m',
  white: '\x1b[97m',
};

const paint = (code, text) => (isTTY ? `${code}${text}${codes.reset}` : text);

const c = {
  green: (t) => paint(codes.green, t),
  bold: (t) => paint(codes.bold, t),
  dim: (t) => paint(codes.dim, t),
  gray: (t) => paint(codes.gray, t),
  white: (t) => paint(codes.white, t),
};

const log = (text = '') => process.stdout.write(`${text}\n`);

const ask = (question) =>
  new Promise((resolve) => {
    if (!isTTY) {
      resolve('');
      return;
    }
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });

// Parse "1,3,4" → [1,3,4] (1-based indices).
const parseIndices = (raw) =>
  String(raw || '')
    .split(/[\s,]+/)
    .map((n) => parseInt(n, 10))
    .filter((n) => Number.isInteger(n) && n > 0);

module.exports = { isTTY, c, log, ask, parseIndices, codes, paint };
