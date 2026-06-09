'use strict';

// All local-git reads. Uses `git` plumbing only — never opens source files
// (the one exception is the repo's own README, which the founder opts into).

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'vendor', 'target', '.cache', 'coverage']);

const git = (cwd, args) => {
  try {
    return execFileSync('git', args, {
      cwd,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    return '';
  }
};

const hasGit = () => Boolean(git(process.cwd(), ['--version']));

const isRepo = (dir) => git(dir, ['rev-parse', '--is-inside-work-tree']).trim() === 'true';

const repoRoot = (dir) => git(dir, ['rev-parse', '--show-toplevel']).trim();

const configEmail = (dir) => git(dir, ['config', 'user.email']).trim();
const configName = (dir) => git(dir, ['config', 'user.name']).trim();

/** Find git repos under `root` (bounded depth). A dir with .git is a repo; we don't recurse into it. */
const findRepos = (root, maxDepth = 4) => {
  const found = [];
  const walk = (dir, depth) => {
    if (depth > maxDepth) return;
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    if (entries.some((e) => e.isDirectory() && e.name === '.git')) {
      found.push(dir);
      return; // don't descend into a repo
    }
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      if (SKIP_DIRS.has(e.name) || e.name.startsWith('.')) continue;
      walk(path.join(dir, e.name), depth + 1);
    }
  };
  walk(root, 0);
  return found;
};

/** [{ email, name, commits }] for a repo, sorted by commit count desc. */
const listAuthors = (dir) => {
  const out = git(dir, ['log', '--format=%ae\t%an']);
  const counts = new Map();
  for (const line of out.split('\n')) {
    if (!line.trim()) continue;
    const [email, name] = line.split('\t');
    const key = (email || '').toLowerCase();
    if (!key) continue;
    const prev = counts.get(key) || { email: key, name: name || '', commits: 0 };
    prev.commits += 1;
    counts.set(key, prev);
  }
  return [...counts.values()].sort((a, b) => b.commits - a.commits);
};

const authorArgs = (emails) => emails.map((e) => `--author=${e}`);

/** Commit dates (YYYY-MM-DD) authored by `emails`. */
const commitDates = (dir, emails) => {
  const out = git(dir, ['log', ...authorArgs(emails), '--format=%ad', '--date=short']);
  return out.split('\n').map((s) => s.trim()).filter(Boolean);
};

/** { added, removed } summed over `emails`' commits — numbers only, never file contents. */
const lineStats = (dir, emails) => {
  const out = git(dir, ['log', ...authorArgs(emails), '--numstat', '--format=']);
  let added = 0;
  let removed = 0;
  for (const line of out.split('\n')) {
    const parts = line.split('\t');
    if (parts.length < 2) continue;
    const a = parseInt(parts[0], 10);
    const r = parseInt(parts[1], 10);
    if (Number.isInteger(a)) added += a;
    if (Number.isInteger(r)) removed += r;
  }
  return { added, removed };
};

/** Tracked file paths (used only locally to derive language %). */
const trackedFiles = (dir) =>
  git(dir, ['ls-files']).split('\n').map((s) => s.trim()).filter(Boolean);

/** Opt-in: title + first paragraph from the repo's README. */
const readReadme = (dir) => {
  const candidates = ['README.md', 'readme.md', 'README.MD', 'Readme.md', 'README'];
  for (const name of candidates) {
    const full = path.join(dir, name);
    try {
      if (!fs.existsSync(full)) continue;
      const text = fs.readFileSync(full, 'utf8');
      const lines = text.split('\n');
      let title = '';
      const para = [];
      for (const raw of lines) {
        const line = raw.trim();
        if (!title && line.startsWith('# ')) {
          title = line.replace(/^#+\s*/, '').trim();
          continue;
        }
        if (title || !line.startsWith('#')) {
          if (line && !line.startsWith('#') && !line.startsWith('![') && !line.startsWith('[!')) {
            para.push(line);
            if (para.length >= 2) break;
          } else if (para.length) {
            break;
          }
        }
      }
      const description = para
        .join(' ')
        .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // strip md links → text
        .replace(/[*_`>#]/g, '')
        .trim();
      return { title, description };
    } catch {
      /* ignore */
    }
  }
  return { title: '', description: '' };
};

module.exports = {
  hasGit,
  isRepo,
  repoRoot,
  configEmail,
  configName,
  findRepos,
  listAuthors,
  commitDates,
  lineStats,
  trackedFiles,
  readReadme,
};
