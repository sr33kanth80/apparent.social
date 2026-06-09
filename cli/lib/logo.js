'use strict';

// Apparent mark, rasterized from the real SVG path (src/components/LogoIcon.tsx)
// via scripts/raster-logo.js. 18 cols × 9 rows of shaded block glyphs. Each line
// is padded to WIDTH at render time; leading/interior spaces are part of the art.

const WIDTH = 18;

const LINES = [
  '    ▓██████████▓▒',
  '    ▓████████████▓',
  '▓▓▓▓█████░░░░▓████',
  '████████░    ▓████',
  '████▒░░    ░░▓████',
  '████░    ░████████',
  '████▒░░░░████▓▓▓▓▓',
  '▓████████████░',
  ' ▒▓██████████░',
];

module.exports = { LINES, WIDTH };
