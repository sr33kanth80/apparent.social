'use strict';

const path = require('path');
const git = require('./git');
const { rankLanguages } = require('./languages');

const daysAgo = (n) => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
};

/** Compute a single repo's stats, attributed to `emails` only. */
const repoStats = (dir, emails) => {
  const dates = git.commitDates(dir, emails);
  const { added, removed } = git.lineStats(dir, emails);
  const files = git.trackedFiles(dir);
  const languages = rankLanguages(files);
  const readme = git.readReadme(dir);

  const ts = dates.map((d) => new Date(d).getTime()).filter((t) => !Number.isNaN(t)).sort((a, b) => a - b);
  const uniqueDays = new Set(dates);
  const since30 = daysAgo(30).getTime();
  const since60 = daysAgo(60).getTime();
  const since90 = daysAgo(90).getTime();

  const daysInWindow = (cut) => new Set(dates.filter((d) => new Date(d).getTime() >= cut)).size;

  return {
    name: path.basename(dir),
    description: readme.description || readme.title || '',
    commits: dates.length,
    linesAdded: added,
    linesRemoved: removed,
    languages,
    primaryLanguage: languages[0] ? languages[0].name : '',
    firstCommit: ts.length ? new Date(ts[0]).toISOString().slice(0, 10) : '',
    lastCommit: ts.length ? new Date(ts[ts.length - 1]).toISOString().slice(0, 10) : '',
    activeDays: uniqueDays.size,
    commitsLast30d: dates.filter((d) => new Date(d).getTime() >= since30).length,
    commitsLast90d: dates.filter((d) => new Date(d).getTime() >= since90).length,
    shippedDaysLast60: daysInWindow(since60),
    _dates: dates, // raw dates, used only for cross-repo union; stripped from payload
  };
};

/** Merge per-repo stats into the upload-shaped aggregate payload. */
const aggregate = (perRepo, emails, scope) => {
  const langCounts = {};
  let commits = 0;
  let linesAdded = 0;
  let linesRemoved = 0;
  let commitsLast30d = 0;
  let commitsLast90d = 0;
  const activeDaySet = new Set();
  const allDates = [];
  let first = '';
  let last = '';

  for (const r of perRepo) {
    commits += r.commits;
    linesAdded += r.linesAdded;
    linesRemoved += r.linesRemoved;
    commitsLast30d += r.commitsLast30d;
    commitsLast90d += r.commitsLast90d;
    for (const l of r.languages) langCounts[l.name] = (langCounts[l.name] || 0) + l.percent;
    for (const d of r._dates || []) {
      activeDaySet.add(d);
      allDates.push(d);
    }
    if (r.firstCommit && (!first || r.firstCommit < first)) first = r.firstCommit;
    if (r.lastCommit && (!last || r.lastCommit > last)) last = r.lastCommit;
  }

  const since60 = daysAgo(60).getTime();
  const shippedDaysLast60Union = new Set(allDates.filter((d) => new Date(d).getTime() >= since60)).size;

  // Daily commit counts for the last 30 days (oldest → newest) → sparkline art.
  const dayCount = new Map();
  for (const d of allDates) dayCount.set(d, (dayCount.get(d) || 0) + 1);
  const activity = [];
  for (let i = 29; i >= 0; i -= 1) {
    const day = daysAgo(i).toISOString().slice(0, 10);
    activity.push(dayCount.get(day) || 0);
  }

  const langTotal = Object.values(langCounts).reduce((s, n) => s + n, 0) || 1;
  const languages = Object.entries(langCounts)
    .map(([name, n]) => ({ name, percent: Math.round((n / langTotal) * 100) }))
    .sort((a, b) => b.percent - a.percent)
    .slice(0, 6);

  const projects = perRepo
    .slice()
    .sort((a, b) => b.commits - a.commits)
    .map((r) => ({
      name: r.name,
      description: r.description,
      primaryLanguage: r.primaryLanguage,
      commits: r.commits,
      lastActive: r.lastCommit,
    }));

  return {
    scope,
    authoredEmails: emails,
    totals: {
      commits,
      repos: perRepo.length,
      linesAdded,
      linesRemoved,
      firstCommit: first,
      lastCommit: last,
      activeDays: activeDaySet.size,
    },
    cadence: { commitsLast30d, commitsLast90d, shippedDaysLast60: shippedDaysLast60Union },
    activity,
    languages,
    projects,
    generatedAt: new Date().toISOString(),
  };
};

module.exports = { repoStats, aggregate };
