'use strict';

// Renders the ASCII build card. Returns plain text (no ANSI) so width math is
// exact; the caller paints the whole card one color for a clean screenshot.

const INNER = 60; // visible chars between the side borders

const num = (n) => Number(n || 0).toLocaleString('en-US');

const truncate = (s, n) => {
  const str = String(s || '');
  return str.length <= n ? str : `${str.slice(0, n - 1)}…`;
};

const top = `╔${'═'.repeat(INNER + 2)}╗`;
const mid = `╠${'═'.repeat(INNER + 2)}╣`;
const bottom = `╚${'═'.repeat(INNER + 2)}╝`;

const row = (text = '') => `║ ${truncate(text, INNER).padEnd(INNER)} ║`;

const center = (text) => {
  const t = truncate(text, INNER);
  const pad = Math.max(0, Math.floor((INNER - t.length) / 2));
  return `║ ${' '.repeat(pad)}${t}${' '.repeat(INNER - pad - t.length)} ║`;
};

/**
 * @param {object} opts
 * @param {object} opts.payload  aggregate payload from stats.aggregate
 * @param {string} opts.name     founder display name (or handle)
 * @param {'founder'|'project'} opts.kind
 */
const render = ({ payload, name, kind }) => {
  const { totals, cadence, languages, projects } = payload;
  const langLine = languages.slice(0, 3).map((l) => `${l.name} ${l.percent}%`).join(' · ');
  const range = totals.firstCommit && totals.lastCommit ? `${totals.firstCommit} → ${totals.lastCommit}` : '';

  const lines = [top, center('APPARENT · BUILD CARD'), mid];

  if (kind === 'project') {
    const project = projects[0] || {};
    lines.push(row(project.name || name || 'project'));
    if (project.description) lines.push(row(project.description));
    lines.push(row(''));
    lines.push(row(`✦ ${num(totals.commits)} commits · ${num(totals.activeDays)} active days`));
    lines.push(row(`✦ shipped ${cadence.shippedDaysLast60} of the last 60 days`));
    lines.push(row(`✦ ${num(totals.linesAdded)} lines added`));
    if (langLine) lines.push(row(`✦ ${langLine}`));
  } else {
    lines.push(row(name || 'A builder'));
    if (range) lines.push(row(range));
    lines.push(row(''));
    lines.push(row(`✦ ${num(totals.commits)} commits across ${num(totals.repos)} projects`));
    lines.push(row(`✦ shipped ${cadence.shippedDaysLast60} of the last 60 days`));
    lines.push(row(`✦ ${num(totals.linesAdded)} lines added`));
    if (langLine) lines.push(row(`✦ ${langLine}`));
    const lead = projects[0];
    if (lead) {
      lines.push(row(''));
      lines.push(row(`top: ${lead.name}${lead.description ? ` — ${lead.description}` : ''}`));
    }
  }

  lines.push(mid);
  lines.push(center('built with  npx apparent  ·  apparent.social'));
  lines.push(bottom);
  return lines.join('\n');
};

module.exports = { render };
