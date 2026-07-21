// Self-check for the batched record_startups path. Run:
//   node scripts/ingest-batch.test.mjs
//
// The batch handler decides whether a run saves anything at all, and it failed
// silently once already, so it gets a test. This mirrors the executeTool body:
// provenance gate, in-batch dedup, canonical-URL keying.
import assert from 'node:assert';
import { canonicalSourceUrl } from '../api/ingest-signals.js';
import { createPublicResearchPolicy, isAuthorizedResearchUrl } from '../server/agent/apparent-agent-runtime.js';

const str = (v) => (v == null ? '' : String(v));

// Mirrors the real handler's accept/reject logic.
const runBatch = (policy, byUrl, startups) => {
  const wwwVariants = (value) => {
    const raw = str(value).trim();
    if (!raw) return [];
    const stripped = raw.replace(/^(https?:\/\/)www\./i, '$1');
    const prefixed = raw.replace(/^(https?:\/\/)(?!www\.)/i, '$1www.');
    return [...new Set([raw, stripped, prefixed])];
  };
  const seen = (value) =>
    wwwVariants(value).some((candidate) =>
      isAuthorizedResearchUrl(policy, candidate, { fetchedOnly: true, sameOrigin: true }) ||
      isAuthorizedResearchUrl(policy, candidate, { sameOrigin: true }));
  let recorded = 0;
  const rejected = [];
  for (const input of startups) {
    const canonical = canonicalSourceUrl(input?.homepage_url);
    const company = str(input?.company).trim();
    const detail = str(input?.detail).trim();
    if (!canonical || !company || !detail || !(seen(input?.homepage_url) || seen(input?.source_url))) {
      rejected.push(company || 'unnamed');
      continue;
    }
    if (byUrl.has(canonical)) {
      rejected.push(company);
      continue;
    }
    byUrl.set(canonical, { company });
    recorded += 1;
  }
  return { recorded, rejected };
};

// A policy that has "seen" two companies via a prior tool result.
const policy = createPublicResearchPolicy({
  publicContext: 'results: https://acme.com https://beta.io',
  openQueries: true,
});
const byUrl = new Map();

const result = runBatch(policy, byUrl, [
  { company: 'Acme', homepage_url: 'https://www.acme.com/launch', detail: 'AI infra' },
  { company: 'Beta', homepage_url: 'https://beta.io', detail: 'fintech' },
  // Same startup as Acme via a different path — must collapse, not duplicate.
  { company: 'Acme dupe', homepage_url: 'https://acme.com/pricing', detail: 'AI infra' },
  // Never appeared in a tool result — the model made it up.
  { company: 'Ghost', homepage_url: 'https://invented.example', detail: 'nope' },
  // Missing required fields.
  { company: 'NoDetail', homepage_url: 'https://acme.com', detail: '' },
]);

assert.strictEqual(result.recorded, 2, `expected 2 recorded, got ${result.recorded}`);
assert.strictEqual(byUrl.size, 2);
assert.ok(byUrl.has('https://acme.com'), 'acme should be keyed by canonical bare domain');
assert.ok(byUrl.has('https://beta.io'));
assert.ok(result.rejected.includes('Ghost'), 'invented URL must be rejected');
assert.ok(result.rejected.includes('NoDetail'), 'missing detail must be rejected');
assert.ok(result.rejected.includes('Acme dupe'), 'in-batch duplicate must be rejected');

// A second batch must not re-record what the first already took.
const second = runBatch(policy, byUrl, [
  { company: 'Acme again', homepage_url: 'https://acme.com', detail: 'AI infra' },
]);
assert.strictEqual(second.recorded, 0, 'cross-batch dedup failed');
assert.strictEqual(byUrl.size, 2);

console.log('ok — batch recording dedupes, enforces provenance, rejects invented URLs');
