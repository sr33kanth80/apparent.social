'use strict';

// One-off: rasterize the Apparent logo SVG path into shaded ASCII at a few sizes,
// so we can hardcode the best one into lib/logo.js. Not shipped.

// Cubic bezier point.
const bez = (p0, c1, c2, p3, t) => {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return [a * p0[0] + b * c1[0] + c * c2[0] + d * p3[0], a * p0[1] + b * c1[1] + c * c2[1] + d * p3[1]];
};

const flattenCubic = (p0, c1, c2, p3, steps = 24) => {
  const pts = [];
  for (let i = 1; i <= steps; i += 1) pts.push(bez(p0, c1, c2, p3, i / steps));
  return pts;
};

// Build the two subpaths as closed polylines (from LogoIcon.tsx).
const subA = (() => {
  const pts = [[128.005, 191.173]];
  pts.push(...flattenCubic([128.005, 191.173], [128.448, 156.208], [156.93, 128], [192, 128]));
  pts.push([192, 64]);
  pts.push([128, 64]);
  pts.push(...flattenCubic([128, 64], [128, 99.346], [99.346, 128], [64, 128]));
  pts.push([64, 192]);
  pts.push([128, 192]);
  return pts;
})();

const subB = (() => {
  const pts = [[192, 256]];
  pts.push([64, 256]);
  pts.push(...flattenCubic([64, 256], [28.654, 256], [0, 227.346], [0, 192]));
  pts.push([0, 64]);
  pts.push([64, 64]);
  pts.push([64, 0]);
  pts.push([192, 0]);
  pts.push(...flattenCubic([192, 0], [227.346, 0], [256, 28.654], [256, 64]));
  pts.push([256, 192]);
  pts.push([192, 192]);
  return pts;
})();

const isLeft = (a, b, p) => (b[0] - a[0]) * (p[1] - a[1]) - (p[0] - a[0]) * (b[1] - a[1]);

const winding = (poly, px, py) => {
  let wn = 0;
  for (let i = 0; i < poly.length; i += 1) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    if (a[1] <= py) {
      if (b[1] > py && isLeft(a, b, [px, py]) > 0) wn += 1;
    } else if (b[1] <= py && isLeft(a, b, [px, py]) < 0) wn -= 1;
  }
  return wn;
};

const inside = (px, py) => winding(subA, px, py) + winding(subB, px, py) !== 0;

const SHADES = ' ░▒▓█';

const render = (cols, rows, ss = 3) => {
  const out = [];
  for (let r = 0; r < rows; r += 1) {
    let line = '';
    for (let cgrid = 0; cgrid < cols; cgrid += 1) {
      let hit = 0;
      for (let sy = 0; sy < ss; sy += 1) {
        for (let sx = 0; sx < ss; sx += 1) {
          const px = ((cgrid + (sx + 0.5) / ss) / cols) * 256;
          const py = ((r + (sy + 0.5) / ss) / rows) * 256;
          if (inside(px, py)) hit += 1;
        }
      }
      const frac = hit / (ss * ss);
      line += SHADES[Math.min(4, Math.round(frac * 4))];
    }
    out.push(line);
  }
  return out.join('\n');
};

for (const [cols, rows] of [[14, 7], [18, 9], [22, 11]]) {
  process.stdout.write(`\n=== ${cols}x${rows} ===\n`);
  process.stdout.write(render(cols, rows) + '\n');
}
