'use strict';

// Renders the ASCII build card with colour. Content may contain ANSI codes;
// padding is computed on VISIBLE width (ANSI stripped) so the box stays aligned
// in any terminal. All glyphs are single-width block/box chars (no emoji).
// When stdout isn't a TTY, the colour helpers no-op and it renders as plain text.

const { c, visLen } = require('./ui');

const INNER = 60; // visible chars between the side borders

const num = (n) => Number(n || 0).toLocaleString('en-US');

const clip = (s, n) => {
  const str = String(s || '');
  return str.length <= n ? str : `${str.slice(0, n - 1)}…`;
};

const padVis = (s, n) => `${s}${' '.repeat(Math.max(0, n - visLen(s)))}`;

const V = c.frame('║');
const top = c.frame(`╔${'═'.repeat(INNER + 2)}╗`);
const mid = c.frame(`╠${'═'.repeat(INNER + 2)}╣`);
const bottom = c.frame(`╚${'═'.repeat(INNER + 2)}╝`);
const blank = `${V} ${' '.repeat(INNER)} ${V}`;

// content may contain ANSI; pad by visible width.
const row = (content = '') => `${V} ${padVis(content, INNER)} ${V}`;

const center = (content) => {
  const len = visLen(content);
  const pad = Math.max(0, Math.floor((INNER - len) / 2));
  return `${V} ${' '.repeat(pad)}${content}${' '.repeat(Math.max(0, INNER - pad - len))} ${V}`;
};

// ▕████████░░░░▏ — filled bright-green, empty dim.
const bar = (percent, width = 22) => {
  const filled = Math.max(0, Math.min(width, Math.round((width * percent) / 100)));
  return `${c.dim('▕')}${c.brightGreen('█'.repeat(filled))}${c.dim('░'.repeat(width - filled))}${c.dim('▏')}`;
};

const SPARK = ' ▁▂▃▄▅▆▇█';
const sparkline = (counts) => {
  const max = Math.max(1, ...counts);
  return counts.map((n) => SPARK[Math.min(8, Math.round((n / max) * 8))]).join('');
};

const rank = (shipped) => {
  if (shipped >= 45) return 'unrelenting';
  if (shipped >= 30) return 'shipping daily';
  if (shipped >= 15) return 'in the arena';
  if (shipped >= 5) return 'warming up';
  return 'just getting started';
};

const statRow = (totals) =>
  row(
    [
      `${c.dim('commits')} ${c.boldWhite(num(totals.commits))}`,
      `${c.dim('lines')} ${c.green(`+${num(totals.linesAdded)}`)}`,
      `${c.dim('projects')} ${c.boldWhite(num(totals.repos))}`,
    ].join('     '),
  );

/**
 * @param {object} opts
 * @param {object} opts.payload  aggregate payload from stats.aggregate
 * @param {string} opts.name     founder display name (or handle)
 * @param {'founder'|'project'} opts.kind
 */
const render = ({ payload, name, kind }) => {
  const { totals, cadence, languages, projects, activity } = payload;
  const range = totals.firstCommit && totals.lastCommit ? `${totals.firstCommit} → ${totals.lastCommit}` : '';
  const headline = kind === 'project' && projects[0] ? projects[0].name : name || 'A builder';

  const lines = [
    top,
    center(`${c.magenta('░▒▓')}  ${c.brightGreen('A P P A R E N T')}  ${c.magenta('▓▒░')}`),
    center(c.dim('· · ·   ') + c.boldWhite('B U I L D   C A R D') + c.dim('   · · ·')),
    mid,
    row(c.boldWhite(clip(headline, INNER))),
    row(
      `${c.dim(range)}${range ? c.dim('   ·   ') : ''}${c.yellow(rank(cadence.shippedDaysLast60))}` +
        `${c.dim('  ·  shipped ')}${c.yellow(`${cadence.shippedDaysLast60}/60`)}`,
    ),
    blank,
    statRow(totals),
    blank,
  ];

  for (const l of languages.slice(0, 4)) {
    lines.push(row(`${c.white(clip(l.name, 11).padEnd(11))} ${bar(l.percent)} ${c.green(`${String(l.percent).padStart(3)}%`)}`));
  }

  if (Array.isArray(activity) && activity.length) {
    lines.push(blank);
    lines.push(row(`${c.dim('last 30 days')}  ${c.cyan(sparkline(activity))}`));
  }

  const lead = projects[0];
  if (lead) {
    lines.push(blank);
    if (kind === 'project') {
      if (lead.description) lines.push(row(c.dim(clip(lead.description, INNER))));
    } else {
      lines.push(row(c.dim('top: ') + c.white(clip(`${lead.name}${lead.description ? ` — ${lead.description}` : ''}`, INNER - 5))));
    }
  }

  lines.push(mid);
  lines.push(center(c.dim('built with  ') + c.brightGreen('npx apparent') + c.dim('  ·  apparent.social')));
  lines.push(bottom);
  return lines.join('\n');
};

module.exports = { render };
