'use strict';

// `npx apparent findinvestors` — fetch thesis-matched, emailable-now investors
// from Apparent's heat-map dataset and present them in the terminal, 5 at a time.
// The founder is always the sender (mailto / their own inbox), with a drafted,
// personalized opener — never a blast.

const { c, log, ask, isTTY } = require('./ui');
const config = require('./config');

const firstName = (partner) => {
  const n = String(partner || '').trim().split(/\s+/)[0];
  return n || 'there';
};

const clip = (s, n) => {
  const str = String(s || '');
  return str.length <= n ? str : `${str.slice(0, n - 1)}…`;
};

const opener = (project, vc) => {
  const proj = project ? project.name : 'something new';
  const desc = project && project.description ? ` — ${clip(project.description, 80)}` : '';
  const focus = (vc.why && vc.why[0]) || (vc.focus ? clip(vc.focus, 30) : 'this space');
  return `Hi ${firstName(vc.partner)}, I'm building ${proj}${desc}. Saw ${vc.name} backs ${focus} — I'd love to show you what I've shipped. Open to a quick look?`;
};

const mailto = (project, vc) => {
  const subject = `${project ? project.name : 'Quick intro'} — building in ${(vc.why && vc.why[0]) || 'your space'}`;
  const body = opener(project, vc);
  return `mailto:${vc.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
};

const renderInvestor = (vc, index, project) => {
  log('');
  log(`  ${c.green(`${index}.`)} ${c.boldWhite(vc.name)}${vc.focus ? c.dim(`  ·  ${clip(vc.focus, 40)}`) : ''}`);
  if (vc.why && vc.why.length) log(`     ${c.dim('fits because:')} ${c.white(vc.why.join(', '))}`);
  log(`     ${c.dim(vc.partner ? `${vc.partner} · ` : '')}${c.cyan(vc.email)}`);
  log(`     ${c.dim('opener:')} ${c.white(clip(opener(project, vc), 150))}`);
  log(`     ${c.dim(mailto(project, vc))}`);
};

const run = async ({ payload, name }) => {
  log('');
  log(c.bold('  Finding investors who fit what you\'re building…'));

  let data;
  try {
    const res = await fetch(`${config.BASE_URL}/api/cli-investors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ languages: payload.languages, projects: payload.projects }),
    });
    data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
  } catch (err) {
    log('');
    log(c.dim(`  Couldn't reach the investor map (${err && err.message ? err.message : 'unknown'}). Try again shortly.`));
    return;
  }

  const investors = Array.isArray(data.investors) ? data.investors : [];
  const project = payload.projects && payload.projects[0];

  if (!investors.length) {
    log('');
    log(c.dim("  No strong matches in the map yet for what you're building — and we'd rather show"));
    log(c.dim('  you zero great fits than a list of mediocre ones. As the dataset grows, so will this.'));
    log('');
    log('  ' + c.bold('Create your profile and let our agent surface you to VCs → ') + c.green(config.BASE_URL));
    log('');
    return;
  }

  log(c.dim(`  Found ${investors.length} investors you can email right now. These are public partner`));
  log(c.dim('  contacts — reach out personally and respectfully (the opener below is a starting point).'));

  // Drip 5 at a time.
  let shown = 0;
  while (shown < investors.length) {
    const batch = investors.slice(shown, shown + 5);
    batch.forEach((vc, i) => renderInvestor(vc, shown + i + 1, project));
    shown += batch.length;

    if (shown >= investors.length) break;
    if (!isTTY) break;
    log('');
    const more = (await ask(`  Show ${Math.min(5, investors.length - shown)} more? [Y/n]: `)).toLowerCase();
    if (more === 'n' || more === 'no') break;
  }

  // Honest nudge — separates what's real now from the on-platform loop.
  log('');
  log('  ' + c.bold('Keep track + let the agent work for you:'));
  log(c.dim('  • Create your Apparent profile to track who you\'ve reached and saved.'));
  log(c.dim('  • As VCs join Apparent, our agent surfaces your build to the ones who fit —'));
  log(c.dim('    and we\'ll DM you the moment a matched investor bites.'));
  log('');
  log('  ' + c.green(config.BASE_URL));
  log('');
};

module.exports = { run };
