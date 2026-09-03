// Marker packing rules for the Jobs Map.
//
// Pure logic, tested without a map: what overlaps and what folds is the part
// that actually goes wrong.

import test from 'node:test';
import assert from 'node:assert/strict';

const { layoutMarkers, fanOffset } = await import('../src/components/jobs/marker-layout.ts');

const company = (domain, openRoles, extra = {}) => ({
  domain,
  name: domain.replace('.com', ''),
  website: '',
  careersUrl: '',
  oneLiner: '',
  city: 'Seattle',
  latitude: 47.6,
  longitude: -122.3,
  openRoles,
  ...extra,
});

const at = (domain, openRoles, x, y) => ({ domain, company: company(domain, openRoles), x, y });

test('markers on the exact same point fold into one stack', () => {
  // The city-centroid case: every unresolved company shares a coordinate.
  const { states, stacks } = layoutMarkers([
    at('a.com', 10, 500, 400),
    at('b.com', 5, 500, 400),
    at('c.com', 2, 500, 400),
  ]);

  // The biggest hirer anchors; the rest hide beneath it rather than drawing
  // directly on top of each other.
  assert.equal(states.get('a.com'), 'full');
  assert.equal(states.get('b.com'), 'stacked');
  assert.equal(states.get('c.com'), 'stacked');
  assert.deepEqual(stacks.get('a.com'), ['b.com', 'c.com']);
});

test('a nearby marker keeps its own pin but loses its label', () => {
  // 40px apart: too far to be "the same spot", close enough that the name
  // plates would overprint.
  const { states, stacks } = layoutMarkers([at('a.com', 10, 500, 400), at('b.com', 5, 540, 400)]);

  assert.equal(states.get('a.com'), 'full');
  assert.equal(states.get('b.com'), 'dot', 'should collapse to a dot, not vanish');
  assert.equal(stacks.size, 0, 'a neighbour is not a stack');
});

test('well-separated markers all keep their labels', () => {
  const { states } = layoutMarkers([
    at('a.com', 10, 100, 100),
    at('b.com', 5, 400, 300),
    at('c.com', 2, 700, 500),
  ]);
  assert.equal(states.get('a.com'), 'full');
  assert.equal(states.get('b.com'), 'full');
  assert.equal(states.get('c.com'), 'full');
});

test('packing does not depend on which company is selected', () => {
  // Selecting a company used to make it the anchor of its stack, which re-keyed
  // the stack and collapsed any fan the viewer had opened — so reading one
  // company's roles swept every other pin off the map. Layout must stay put.
  const markers = [at('big.com', 90, 500, 400), at('small.com', 1, 500, 400)];

  const first = layoutMarkers(markers);
  const second = layoutMarkers(markers);

  assert.equal(first.states.get('big.com'), 'full');
  assert.equal(first.states.get('small.com'), 'stacked');
  assert.deepEqual(first.stacks.get('big.com'), ['small.com']);

  // Identical inputs, identical packing — nothing about the viewer's selection
  // can reshuffle it.
  assert.deepEqual([...second.states], [...first.states]);
  assert.deepEqual([...second.stacks], [...first.stacks]);
});

test('anchoring is stable when a smaller company is added later', () => {
  // The anchor is the biggest hirer regardless of input order, so markers do
  // not swap places as data trickles in from geocoding batches.
  const a = layoutMarkers([at('big.com', 90, 500, 400), at('small.com', 1, 500, 400)]);
  const b = layoutMarkers([at('small.com', 1, 500, 400), at('big.com', 90, 500, 400)]);

  assert.equal(a.states.get('big.com'), 'full');
  assert.equal(b.states.get('big.com'), 'full');
  assert.deepEqual([...a.stacks], [...b.stacks]);
});

test('fanned members are spread apart, not piled up', () => {
  const offsets = [0, 1, 2, 3].map((i) => fanOffset(i, 4));
  const unique = new Set(offsets.map(([x, y]) => `${Math.round(x)},${Math.round(y)}`));
  assert.equal(unique.size, 4, 'every member needs its own position to be clickable');
  // All within a sane distance of the anchor.
  for (const [x, y] of offsets) assert.ok(Math.hypot(x, y) < 220);
});
