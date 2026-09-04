// When panning the map is allowed to spend money.
//
// Each 'discover' is a paid run, and one long drag settles over dozens of
// named places, so the guards here are the difference between a map that fills
// in as you travel and a bill.

import test from 'node:test';
import assert from 'node:assert/strict';

const { decideDiscovery } = await import('../src/components/jobs/explore-policy.ts');

const view = (overrides = {}) => ({
  place: 'Austin',
  zoom: 14,
  minZoom: 12,
  seen: new Set(),
  autoDiscoveries: 0,
  limit: 8,
  holdsFresh: false,
  ...overrides,
});

test('an unvisited city at street zoom is worth discovering', () => {
  assert.equal(decideDiscovery(view()), 'discover');
});

test('an unnamed view is never discovered', () => {
  // Bounds alone still read what is stored; there is nothing to ask about.
  assert.equal(decideDiscovery(view({ place: '' })), 'unnamed');
});

test('zoomed out, the nearest label is not what the viewer is looking at', () => {
  assert.equal(decideDiscovery(view({ zoom: 6 })), 'too-far-out');
});

test('a place already discovered this session is not bought twice', () => {
  assert.equal(decideDiscovery(view({ seen: new Set(['Austin']) })), 'already-seen');
});

test('fresh rows already loaded outrank arriving there again', () => {
  assert.equal(decideDiscovery(view({ holdsFresh: true })), 'held-fresh');
});

test('the session cap stops a long drag from billing per city', () => {
  assert.equal(decideDiscovery(view({ autoDiscoveries: 8 })), 'capped');
});

test('the cap does not silence a place we already hold', () => {
  // Order matters: a capped session should still report the cheaper reason,
  // so the caller can remember the skip rather than reconsidering it.
  assert.equal(decideDiscovery(view({ autoDiscoveries: 8, holdsFresh: true })), 'held-fresh');
});
