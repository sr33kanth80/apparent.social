'use strict';

// Renders the ASCII build card with colour. Content may contain ANSI codes;
// padding is computed on VISIBLE width (ANSI stripped) so the box stays aligned
// in any terminal. All glyphs are single-width block/box chars (no emoji).
// When stdout isn't a TTY, the colour helpers no-op and it renders as plain text.

const { c, visLen } = require('./ui');
const logo = require('./logo');

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

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const monthYear = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

const daysSince = (iso) => {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return Infinity;
  return Math.floor((Date.now() - t) / 86400000);
};

const relAgo = (iso) => {
  const d = daysSince(iso);
  if (d <= 0) return 'today';
  if (d === 1) return 'yesterday';
  if (d < 7) return `${d}d ago`;
  if (d < 30) return `${Math.round(d / 7)}w ago`;
  return `${Math.round(d / 30)}mo ago`;
};

// Always-positive momentum facts (never a put-down label).
const momentumParts = (totals, cadence) => {
  const parts = [];
  const since = monthYear(totals.firstCommit);
  if (since) parts.push(`building since ${since}`);
  const perWeek = Math.round((cadence.shippedDaysLast60 / 60) * 7);
  if (perWeek >= 1) parts.push(`~${perWeek} days/week`);
  if (totals.lastCommit && daysSince(totals.lastCommit) <= 7) parts.push('active this week');
  else if (totals.lastCommit) parts.push(`last shipped ${relAgo(totals.lastCommit)}`);
  return parts;
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
  const headline = kind === 'project' && projects[0] ? projects[0].name : name || 'A builder';
  const momentum = momentumParts(totals, cadence);

  // Brand header: the rasterized Apparent mark (block-centered, uniform left pad
  // so the art stays a rectangle), then the title.
  const logoPad = ' '.repeat(Math.max(0, Math.floor((INNER - logo.WIDTH) / 2)));
  const lines = [top, blank];
  for (const l of logo.LINES) lines.push(row(logoPad + c.green(l.padEnd(logo.WIDTH))));
  lines.push(blank);
  lines.push(center(c.dim('· · ·   ') + c.boldWhite('A P P A R E N T') + c.dim('   · · ·')));
  lines.push(center(c.dim('b u i l d   c a r d')));
  lines.push(mid);
  lines.push(row(c.boldWhite(clip(headline, INNER))));
  if (momentum.length) {
    const [first, ...rest] = momentum;
    const metaText = c.yellow(first) + rest.map((p) => c.dim('  ·  ') + c.white(p)).join('');
    lines.push(row(metaText));
  }
  lines.push(blank);
  lines.push(statRow(totals));
  lines.push(blank);

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
