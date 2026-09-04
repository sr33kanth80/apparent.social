// Ordering rules for a company's open roles.
//
// The part that goes wrong is dates the provider never gave: half of real rows
// have no posting date, and they must not crowd out the ones that do.

import test from 'node:test';
import assert from 'node:assert/strict';

const { sortJobs } = await import('../src/components/jobs/sort-jobs.ts');

const jobs = [
  { title: 'Cook', postedAt: '2026-08-01T00:00:00Z' },
  { title: 'Analyst', postedAt: null },
  { title: 'Driver', postedAt: '2026-09-01T00:00:00Z' },
  { title: 'Baker', postedAt: 'not a date' },
];

test('newest first, undated roles last', () => {
  assert.deepEqual(
    sortJobs(jobs, 'fresh').map((j) => j.title),
    ['Driver', 'Cook', 'Analyst', 'Baker'],
  );
});

test('oldest first still leaves undated roles last', () => {
  // Not first: a missing date is unknown, not "posted at the epoch".
  assert.deepEqual(
    sortJobs(jobs, 'oldest').map((j) => j.title),
    ['Cook', 'Driver', 'Analyst', 'Baker'],
  );
});

test('by title ignores dates entirely', () => {
  assert.deepEqual(
    sortJobs(jobs, 'title').map((j) => j.title),
    ['Analyst', 'Baker', 'Cook', 'Driver'],
  );
});

test('the input array is left alone', () => {
  const original = [...jobs];
  sortJobs(jobs, 'fresh');
  assert.deepEqual(jobs, original);
});
