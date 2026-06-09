#!/usr/bin/env node
/*
 * apparent — v1 (local build card).
 *
 * Scans LOCAL git (never your source) for your build activity, renders a
 * brag-worthy card you can screenshot, and shows exactly what would go on your
 * Apparent profile. Nothing leaves your machine in this release.
 *
 * See cli/BLUEPRINT.md for the full spec and the upcoming upload/claim phase.
 */

'use strict';

const path = require('path');
const { spawn } = require('child_process');
const { c, log, ask, isTTY, parseIndices, stripAnsi } = require('../lib/ui');
const git = require('../lib/git');
const { repoStats, aggregate } = require('../lib/stats');
const card = require('../lib/card');
const config = require('../lib/config');

const openUrl = (url) => {
  try {
    if (process.platform === 'win32') {
      spawn('cmd', ['/c', 'start', '', url], { detached: true, stdio: 'ignore' }).unref();
    } else if (process.platform === 'darwin') {
      spawn('open', [url], { detached: true, stdio: 'ignore' }).unref();
    } else {
      spawn('xdg-open', [url], { detached: true, stdio: 'ignore' }).unref();
    }
  } catch {
    /* best-effort; the URL is printed regardless */
  }
};

const upload = async (payload) => {
  const res = await fetch(`${config.BASE_URL}/api/cli-ingest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
};

const HEADER = [
  '',
  c.green('  ◆ apparent') + c.dim('  ·  make your real work apparent'),
  '',
];

const fail = (msg) => {
  log('');
  log(c.bold('  ' + msg));
  log('');
  process.exit(1);
};

const mergeAuthors = (repos) => {
  const byEmail = new Map();
  for (const dir of repos) {
    for (const a of git.listAuthors(dir)) {
      const prev = byEmail.get(a.email) || { email: a.email, name: a.name, commits: 0 };
      prev.commits += a.commits;
      if (!prev.name && a.name) prev.name = a.name;
      byEmail.set(a.email, prev);
    }
  }
  return [...byEmail.values()].sort((a, b) => b.commits - a.commits);
};

const chooseScope = async (cwd) => {
  const here = git.isRepo(cwd);
  log(c.bold('  What should I look at?'));
  log(`    ${c.green('1)')} this repo${here ? '' : c.dim(' (not a git repo here)')}`);
  log(`    ${c.green('2)')} pick repos in this folder`);
  log(`    ${c.green('3)')} whole workspace (everything under here)`);
  log('');
  const answer = (await ask('  Choose 1 / 2 / 3 [1]: ')) || '1';

  if (answer === '1') {
    if (!here) fail("This folder isn't a git repo. Re-run inside a project, or pick option 2/3.");
    return { scope: 'repo', repos: [git.repoRoot(cwd)] };
  }

  const found = git.findRepos(cwd);
  if (!found.length) fail('No git repos found under this folder.');

  if (answer === '3') return { scope: 'workspace', repos: found };

  // option 2: checklist (deselect)
  log('');
  log(c.bold(`  Found ${found.length} repos:`));
  found.forEach((dir, i) => log(`    ${c.green(`${i + 1})`)} ${path.basename(dir)} ${c.dim(dir)}`));
  log('');
  const excludeRaw = await ask('  Numbers to EXCLUDE (comma-separated), or Enter to keep all: ');
  const exclude = new Set(parseIndices(excludeRaw).map((n) => n - 1));
  const repos = found.filter((_, i) => !exclude.has(i));
  if (!repos.length) fail('No repos selected.');
  return { scope: 'workspace', repos };
};

const chooseEmails = async (cwd, repos) => {
  const authors = mergeAuthors(repos);
  if (!authors.length) fail('No commits found in the selected repos.');

  const configured = git.configEmail(cwd).toLowerCase();
  const preselected = authors.findIndex((a) => a.email === configured);

  if (!isTTY) {
    return preselected >= 0 ? [authors[preselected].email] : [authors[0].email];
  }

  log('');
  log(c.bold('  Which git identities are you?'));
  authors.slice(0, 12).forEach((a, i) => {
    const mark = i === preselected ? c.green(' ← your git config') : '';
    log(`    ${c.green(`${i + 1})`)} ${a.email} ${c.dim(`(${a.commits} commits)`)}${mark}`);
  });
  log('');
  const def = preselected >= 0 ? String(preselected + 1) : '1';
  const raw = (await ask(`  Enter numbers (comma-separated) [${def}]: `)) || def;
  const picked = parseIndices(raw).map((n) => authors[n - 1]).filter(Boolean);
  const emails = (picked.length ? picked : [authors[Math.max(0, preselected)] || authors[0]]).map((a) => a.email);
  return emails;
};

const previewLine = (label, value) => log(`    ${c.dim(label.padEnd(16))} ${value}`);

const main = async () => {
  HEADER.forEach((l) => log(l));

  if (!git.hasGit()) fail('git is not installed or not on your PATH. Install git and re-run.');

  const cwd = process.cwd();
  const { scope, repos } = isTTY
    ? await chooseScope(cwd)
    : { scope: 'repo', repos: git.isRepo(cwd) ? [git.repoRoot(cwd)] : [] };

  if (!repos.length) fail("This folder isn't a git repo. Re-run inside a project.");

  const emails = await chooseEmails(cwd, repos);

  log('');
  log(c.dim('  Reading local git (your code never leaves this machine)…'));

  const perRepo = repos.map((dir) => repoStats(dir, emails)).filter((r) => r.commits > 0);
  if (!perRepo.length) fail('No commits found for your selected identity in these repos.');

  const payload = aggregate(perRepo, emails, scope);
  const name = git.configName(cwd) || 'A builder';
  const kind = perRepo.length === 1 && scope === 'repo' ? 'project' : 'founder';

  // The card (self-coloured).
  const rendered = card.render({ payload, name, kind });
  log('');
  log(rendered);
  log('');
  log(c.dim('  ↑ screenshot this and post it. The footer is how other founders find apparent.'));

  // Exactly what would be shared if they choose to add it to their profile.
  log('');
  log(c.bold('  What gets added to your Apparent profile:'));
  previewLine('Commits', String(payload.totals.commits));
  previewLine('Projects', String(payload.totals.repos));
  previewLine('Lines added', payload.totals.linesAdded.toLocaleString('en-US'));
  previewLine('Languages', payload.languages.map((l) => `${l.name} ${l.percent}%`).join(', ') || '—');
  previewLine('Top project', payload.projects[0] ? payload.projects[0].name : '—');
  log('');
  log(c.dim('  Aggregate stats only — source code never read, file paths never sent.'));

  if (!isTTY) {
    log('');
    log('  ' + c.bold('Build your founder profile → ') + c.green(config.BASE_URL));
    log('');
    return;
  }

  log('');
  const consent = (await ask('  Add this to your Apparent profile? (uploads the stats above) [y/N]: ')).toLowerCase();
  if (consent === 'y' || consent === 'yes') {
    log('');
    log(c.dim('  Uploading…'));
    try {
      const { claimUrl } = await upload({
        ...payload,
        displayName: name,
        kind,
        cardText: stripAnsi(rendered),
      });
      log('');
      log('  ' + c.bold('One step left — claim it on Apparent:'));
      log('  ' + c.green(claimUrl));
      openUrl(claimUrl);
      log('');
      log(c.dim('  Opened your browser — sign in or create your founder account to attach this.'));
      log(c.dim('  Link expires in 30 minutes.'));
    } catch (err) {
      log('');
      log(c.dim(`  Upload failed (${err && err.message ? err.message : 'unknown'}). Your card is still yours — screenshot it above.`));
    }
  } else {
    log('');
    log(c.dim('  Nothing uploaded. Screenshot the card above to share it.'));
  }

  log('');
  log('  ' + c.bold('Your founder profile → ') + c.green(config.BASE_URL));
  log('');
};

main().catch((err) => fail(`Something broke: ${err && err.message ? err.message : err}`));
