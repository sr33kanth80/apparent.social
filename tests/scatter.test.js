// Spreading unresolved companies across a city's buildings.
//
// Pure logic, tested without a map: whether two companies can end up on the
// same rooftop, and whether a company keeps the same one, are the parts that
// actually go wrong.

import test from 'node:test';
import assert from 'node:assert/strict';

const { assignBuildings, hashDomain, ringCentre, metresBetween, scatterAround } = await import(
  '../src/components/jobs/scatter.ts'
);

const grid = (n) => Array.from({ length: n }, (_, i) => [-122.33 + i * 0.001, 47.61 + (i % 5) * 0.001]);

test('every company gets its own building', () => {
  const domains = ['a.com', 'b.com', 'c.com', 'd.com', 'e.com'];
  const assigned = assignBuildings(domains, grid(20));

  assert.equal(assigned.size, domains.length);
  const used = [...assigned.values()].map((p) => p.join(','));
  // Sharing a rooftop would recreate the stacking this exists to remove.
  assert.equal(new Set(used).size, domains.length, 'no two companies on one building');
});

test('the same company lands on the same building every time', () => {
  const domains = ['a.com', 'b.com', 'c.com'];
  const buildings = grid(20);

  const first = assignBuildings(domains, buildings);
  const second = assignBuildings(domains, buildings);

  // Markers must not hop to a different rooftop when tiles reload.
  for (const domain of domains) {
    assert.deepEqual(second.get(domain), first.get(domain), `${domain} moved`);
  }
});

test('assignment does not depend on the order companies arrive in', () => {
  const buildings = grid(20);
  const forward = assignBuildings(['a.com', 'b.com', 'c.com'], buildings);
  const backward = assignBuildings(['c.com', 'b.com', 'a.com'], buildings);

  for (const domain of ['a.com', 'b.com', 'c.com']) {
    assert.deepEqual(backward.get(domain), forward.get(domain));
  }
});

test('more companies than buildings places what it can and stops', () => {
  const assigned = assignBuildings(['a.com', 'b.com', 'c.com', 'd.com'], grid(2));
  assert.equal(assigned.size, 2);
  assert.equal(new Set([...assigned.values()].map((p) => p.join(','))).size, 2);
});

test('buildings already taken are not handed out again', () => {
  const buildings = grid(6);
  const first = assignBuildings(['a.com'], buildings);
  const takenPoint = first.get('a.com');

  // Same list minus the used building, as the component does.
  const free = buildings.filter((p) => p.join(',') !== takenPoint.join(','));
  const second = assignBuildings(['b.com'], free);

  assert.notDeepEqual(second.get('b.com'), takenPoint);
});

test('no buildings at all yields nothing, so callers fall back', () => {
  assert.equal(assignBuildings(['a.com'], []).size, 0);
});

test('ringCentre averages a footprint and rejects a degenerate one', () => {
  const square = [
    [0, 0],
    [0, 2],
    [2, 2],
    [2, 0],
  ];
  assert.deepEqual(ringCentre(square), [1, 1]);
  assert.equal(ringCentre([[0, 0]]), null, 'two points cannot be a building');
  assert.equal(ringCentre(undefined), null);
});

test('the fallback scatter separates companies instead of stacking them', () => {
  const centre = [-122.33, 47.61];
  const points = ['a.com', 'b.com', 'c.com', 'd.com'].map((d, i) => scatterAround(d, centre, i));
  const unique = new Set(points.map((p) => p.map((n) => n.toFixed(6)).join(',')));

  assert.equal(unique.size, 4, 'fallback positions must all differ');
  // Still in the same city, not flung across the map.
  for (const point of points) assert.ok(metresBetween(centre, point) < 1200);
});

test('hashDomain is stable and spreads across the range', () => {
  assert.equal(hashDomain('ramp.com'), hashDomain('ramp.com'));
  assert.notEqual(hashDomain('ramp.com'), hashDomain('carta.com'));
});
