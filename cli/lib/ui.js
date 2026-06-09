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
  brightGreen: '\x1b[38;5;120m',
  gray: '\x1b[90m',
  white: '\x1b[97m',
  boldWhite: '\x1b[1;38;5;231m',
  cyan: '\x1b[38;5;44m',
  yellow: '\x1b[38;5;214m',
  magenta: '\x1b[38;5;170m',
  frame: '\x1b[38;5;65m',
};

const paint = (code, text) => (isTTY ? `${code}${text}${codes.reset}` : text);

const c = {
  green: (t) => paint(codes.green, t),
  brightGreen: (t) => paint(codes.brightGreen, t),
  bold: (t) => paint(codes.bold, t),
  dim: (t) => paint(codes.dim, t),
  gray: (t) => paint(codes.gray, t),
  white: (t) => paint(codes.white, t),
  boldWhite: (t) => paint(codes.boldWhite, t),
  cyan: (t) => paint(codes.cyan, t),
  yellow: (t) => paint(codes.yellow, t),
  magenta: (t) => paint(codes.magenta, t),
  frame: (t) => paint(codes.frame, t),
};

// ANSI-aware width helpers so colored content still aligns inside the card box.
const ANSI = /\x1b\[[0-9;]*m/g;
const stripAnsi = (s) => String(s).replace(ANSI, '');
const visLen = (s) => stripAnsi(s).length;

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

module.exports = { isTTY, c, log, ask, parseIndices, codes, paint, stripAnsi, visLen };
