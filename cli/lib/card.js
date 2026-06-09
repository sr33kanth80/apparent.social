'use strict';

// Renders the ASCII build card. Returns plain text (no ANSI) so width math is
// exact; the caller paints the whole card one colour for a clean screenshot.
// All glyphs are single-width block/box characters (no emoji) so columns align
// in any terminal.

const INNER = 60; // visible chars between the side borders

const num = (n) => Number(n || 0).toLocaleString('en-US');

const truncate = (s, n) => {
  const str = String(s || '');
  return str.length <= n ? str : `${str.slice(0, n - 1)}…`;
};

const top = `╔${'═'.repeat(INNER + 2)}╗`;
const mid = `╠${'═'.repeat(INNER + 2)}╣`;
const bottom = `╚${'═'.repeat(INNER + 2)}╝`;
const blank = `║ ${' '.repeat(INNER)} ║`;

const row = (text = '') => `║ ${truncate(text, INNER).padEnd(INNER)} ║`;

const center = (text) => {
  const t = truncate(text, INNER);
  const pad = Math.max(0, Math.floor((INNER - t.length) / 2));
  return `║ ${' '.repeat(pad)}${t}${' '.repeat(INNER - pad - t.length)} ║`;
};

// A filled/empty bar: ▕████████░░░░▏
const bar = (percent, width = 22) => {
  const filled = Math.max(0, Math.min(width, Math.round((width * percent) / 100)));
  return `▕${'█'.repeat(filled)}${'░'.repeat(width - filled)}▏`;
};

// Sparkline from daily counts using 8 block heights.
const SPARK = ' ▁▂▃▄▅▆▇█';
const sparkline = (counts) => {
  const max = Math.max(1, ...counts);
  return counts.map((n) => SPARK[Math.min(8, Math.round((n / max) * 8))]).join('');
};

// A playful, honest rank from how many of the last 60 days shipped code.
const rank = (shipped) => {
  if (shipped >= 45) return 'unrelenting';
  if (shipped >= 30) return 'shipping daily';
  if (shipped >= 15) return 'in the arena';
  if (shipped >= 5) return 'warming up';
  return 'just getting started';
};

// "commits 280     lines +88,011     projects 1" spread across the inner width.
const statRow = (totals) => {
  const segs = [
    `commits ${num(totals.commits)}`,
    `lines +${num(totals.linesAdded)}`,
    `projects ${num(totals.repos)}`,
  ];
  const text = segs.join('     ');
  return row(text);
};

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
    center('░▒▓  A P P A R E N T  ▓▒░'),
    center('· · ·   B U I L D   C A R D   · · ·'),
    mid,
    row(headline),
    row(`${range}${range ? '   ·   ' : ''}${rank(cadence.shippedDaysLast60)}  ·  shipped ${cadence.shippedDaysLast60}/60`),
    blank,
    statRow(totals),
    blank,
  ];

  // Language bars (the data-art centrepiece).
  const langs = languages.slice(0, 4);
  for (const l of langs) {
    lines.push(row(`${truncate(l.name, 11).padEnd(11)} ${bar(l.percent)} ${String(l.percent).padStart(3)}%`));
  }

  // Activity sparkline (last 30 days).
  if (Array.isArray(activity) && activity.length) {
    lines.push(blank);
    lines.push(row(`last 30 days  ${sparkline(activity)}`));
  }

  // Top project (founder card) or its description (project card).
  const lead = projects[0];
  if (lead) {
    lines.push(blank);
    if (kind === 'project') {
      if (lead.description) lines.push(row(lead.description));
    } else {
      lines.push(row(`top: ${lead.name}${lead.description ? ` — ${lead.description}` : ''}`));
    }
  }

  lines.push(mid);
  lines.push(center('built with  npx apparent  ·  apparent.social'));
  lines.push(bottom);
  return lines.join('\n');
};

module.exports = { render };
