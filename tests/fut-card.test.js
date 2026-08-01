// Self-check for the daily-digest card's stage code.
// Run: node --test tests/fut-card.test.js
import assert from 'node:assert';
import { test } from 'node:test';
import { stagePosition } from '../src/lib/fut-card.ts';

test('stagePosition maps rounds to card codes', () => {
  assert.equal(stagePosition('Pre-seed'), 'PRE');
  assert.equal(stagePosition('Seed'), 'SEED');
  assert.equal(stagePosition('Series A'), 'A');
  assert.equal(stagePosition('Growth'), 'GRW');
  assert.equal(stagePosition(''), 'NEW');
  // Unknown stages fall back to a truncation rather than dropping out.
  assert.equal(stagePosition('Bootstrapped'), 'BOOT');
});

test('pre-seed is not swallowed by the looser seed pattern', () => {
  for (const variant of ['Pre-seed', 'pre seed', 'PRESEED', 'Pre-Seed round']) {
    assert.equal(stagePosition(variant), 'PRE', `${variant} must not read as SEED`);
  }
});
