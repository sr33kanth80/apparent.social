// Self-check for placeholder founder names on sourced startups.
// Run: node --test tests/sourced-founder.test.js
import assert from 'node:assert';
import { test } from 'node:test';
import { realFounderName } from '../src/lib/sourced-founder.ts';

test('placeholder descriptors read as no name', () => {
  // The one that shipped: rendered as "Founder: Founding team".
  assert.equal(realFounderName('Founding team'), '');
  for (const variant of ['founding team', 'FOUNDING TEAM', ' Founding  Team ', 'The Founders', 'Unknown', 'N/A', '-']) {
    assert.equal(realFounderName(variant), '', `${variant} must not read as a name`);
  }
});

test('real names survive untouched', () => {
  assert.equal(realFounderName('  Ada Lovelace '), 'Ada Lovelace');
  // Contains a placeholder word but is a real person.
  assert.equal(realFounderName('Grace Founder'), 'Grace Founder');
});

test('missing values are empty, not "undefined"', () => {
  for (const empty of [undefined, null, '', '   ']) {
    assert.equal(realFounderName(empty), '');
  }
});
