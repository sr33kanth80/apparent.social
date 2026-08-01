// Self-check for the daily-digest trading-card model.
// Run: node --test tests/fut-card.test.js
//
// The card's numbers are shown to investors as if they mean something, so the
// two properties that make them trustworthy are worth pinning: they must be
// DETERMINISTIC (same record → same card, every render) and MONOTONIC (more
// evidence never scores lower than less).
import assert from 'node:assert';
import { test } from 'node:test';
import { buildFutCard, metricMagnitude, stagePosition, clamp99 } from '../src/lib/fut-card.ts';

const base = {
  id: '1',
  ownerId: 'o',
  name: 'Acme',
  tagline: 'Dev tools for agents',
  category: 'AI infra',
  stage: 'Seed',
  location: 'San Francisco',
  launchUrl: '',
  proofUrl: '',
  metrics: '',
  updatedAt: new Date().toISOString(),
};

const noCriteria = {};

test('metricMagnitude reads the largest figure, with k/m/b suffixes', () => {
  assert.equal(metricMagnitude('4k MAU / 22% MoM'), 4000);
  assert.equal(metricMagnitude('1.5m ARR'), 1_500_000);
  assert.equal(metricMagnitude('no numbers here'), 0);
  // The bare 22 must not beat the suffixed 4k.
  assert.ok(metricMagnitude('4k MAU / 22% MoM') > 22);
});

test('stagePosition maps rounds to card positions', () => {
  assert.equal(stagePosition('Pre-seed'), 'PRE');
  assert.equal(stagePosition('Seed'), 'SEED');
  assert.equal(stagePosition('Series A'), 'A');
  assert.equal(stagePosition(''), 'NEW');
  // Pre-seed must not fall through to the looser /seed/ rule.
  assert.notEqual(stagePosition('pre seed'), 'SEED');
});

test('clamp99 keeps every stat on a 1..99 axis', () => {
  assert.equal(clamp99(-40), 1);
  assert.equal(clamp99(1e6), 99);
  assert.equal(clamp99(50.4), 50);
});

test('the same record always renders the same card', () => {
  const a = buildFutCard(base, noCriteria);
  const b = buildFutCard(base, noCriteria);
  assert.deepEqual(a, b);
});

test('every stat and the overall stay inside 1..99', () => {
  const rich = {
    ...base,
    metrics: '900m ARR',
    teamSummary: 'x'.repeat(4000),
    founderSignals: Array.from({ length: 40 }, (_, i) => `tag${i}`),
    teamMembers: Array.from({ length: 30 }, () => ({ name: 'n' })),
    launchUrl: 'a', proofUrl: 'b', sourceUrl: 'c',
    pitchDeckUrl: 'd', demoVideoUrl: 'e', pitchVideoUrl: 'f',
    upvoteCount: 5000,
  };
  for (const record of [base, rich, { ...base, updatedAt: '' }]) {
    const card = buildFutCard(record, { thesis: 'agents dev tools infra', sectors: 'AI infra' });
    for (const s of card.stats) {
      assert.ok(s.value >= 1 && s.value <= 99, `${s.label}=${s.value} out of range`);
    }
    assert.ok(card.ovr >= 1 && card.ovr <= 99, `ovr=${card.ovr} out of range`);
  }
});

test('more evidence never scores worse than less', () => {
  const thin = buildFutCard(base, noCriteria);
  const withTraction = buildFutCard({ ...base, metrics: '40k MAU' }, noCriteria);
  const withProof = buildFutCard({ ...base, launchUrl: 'a', pitchDeckUrl: 'b' }, noCriteria);

  assert.ok(withTraction.stats.find((s) => s.label === 'TRC').value >
            thin.stats.find((s) => s.label === 'TRC').value, 'traction must lift TRC');
  assert.ok(withProof.stats.find((s) => s.label === 'PRF').value >
            thin.stats.find((s) => s.label === 'PRF').value, 'artifacts must lift PRF');
  assert.ok(withTraction.ovr > thin.ovr, 'traction must lift the overall');
});

test('a stale sighting scores lower momentum than a fresh one', () => {
  const old = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const fresh = buildFutCard(base, noCriteria);
  const stale = buildFutCard({ ...base, updatedAt: old }, noCriteria);
  assert.ok(stale.stats.find((s) => s.label === 'MOM').value <
            fresh.stats.find((s) => s.label === 'MOM').value);
});

test('FIT reflects thesis overlap, and sits neutral when no thesis is set', () => {
  const onThesis = buildFitValue({ thesis: 'agents developer tools infra', sectors: 'AI infra' });
  const offThesis = buildFitValue({ thesis: 'biotech oncology diagnostics', sectors: 'health' });
  const noThesis = buildFitValue({});

  assert.ok(onThesis > offThesis, 'matching thesis must outrank a mismatched one');
  // No criteria captured yet — don't invent a match either way.
  assert.equal(noThesis, 50);

  function buildFitValue(criteria) {
    return buildFutCard(base, criteria).stats.find((s) => s.label === 'FIT').value;
  }
});
