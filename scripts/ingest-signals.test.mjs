// Self-check for the dedup key. Run: node scripts/ingest-signals.test.mjs
// Lives outside api/ so Vercel doesn't deploy it as a serverless function.
// The (source_type, source_url) unique index only dedupes EXACT source_url
// matches, so canonicalSourceUrl must collapse every way the model might cite
// one startup to a single bare-domain key — or the 12h re-run duplicates rows.
import assert from 'node:assert';
import { canonicalSourceUrl } from '../api/ingest-signals.js';
import { parseShowHNTitle, mapHNHit, mapGitHubRepo, mapYCCompany, batchRecency } from '../server/agent/ingest-sources.js';

const sameStartup = [
  'https://www.acme.com',
  'http://acme.com/',
  'acme.com',
  'https://acme.com/launch?ref=ph',
  'https://ACME.com/blog/post',
];
const keys = new Set(sameStartup.map(canonicalSourceUrl));
assert.strictEqual(keys.size, 1, `expected one canonical key, got ${[...keys]}`);
assert.strictEqual([...keys][0], 'https://acme.com');

assert.strictEqual(canonicalSourceUrl('https://app.beta.example.io/x'), 'https://app.beta.example.io');
assert.notStrictEqual(canonicalSourceUrl('https://acme.com'), canonicalSourceUrl('https://other.com'));
assert.strictEqual(canonicalSourceUrl(''), '');
assert.strictEqual(canonicalSourceUrl('   '), '');

// Multi-tenant hosts must KEEP their path — collapsing github.com/a/x and
// github.com/b/y to "https://github.com" would merge every repo into one row.
assert.strictEqual(canonicalSourceUrl('https://GitHub.com/Acme/Tool/'), 'https://github.com/acme/tool');
assert.notStrictEqual(
  canonicalSourceUrl('https://github.com/a/x'),
  canonicalSourceUrl('https://github.com/b/y'),
);
assert.strictEqual(canonicalSourceUrl('https://github.com/acme/tool?tab=readme'), 'https://github.com/acme/tool');

// Show HN title parsing → company + tail, across separator styles
assert.deepStrictEqual(parseShowHNTitle('Show HN: Acme – open-source X'), { company: 'Acme', tail: 'open-source X' });
assert.deepStrictEqual(parseShowHNTitle('Launch HN: Beta (YC W26): AI for Y'), { company: 'Beta (YC W26)', tail: 'AI for Y' });
assert.strictEqual(parseShowHNTitle('Ask HN: how do I…'), null);
assert.strictEqual(mapHNHit({ title: 'Show HN: NoUrl – text post', url: '' }), null);
const hnRow = mapHNHit({ title: 'Show HN: Acme – open-source X', url: 'https://acme.com', points: 42, objectID: '99' });
assert.strictEqual(hnRow.company, 'Acme');
assert.strictEqual(hnRow.found_via, 'https://news.ycombinator.com/item?id=99');

// GitHub mapper: skips forks and content repos, keeps real products
assert.strictEqual(mapGitHubRepo({ name: 'awesome-llms', description: 'a list', fork: false }), null);
assert.strictEqual(mapGitHubRepo({ name: 'acme', fork: true }), null);
const ghRow = mapGitHubRepo({ name: 'acme', description: 'AI infra', fork: false, archived: false, html_url: 'https://github.com/o/acme', homepage: 'https://acme.dev', stargazers_count: 120, owner: { login: 'octo' }, topics: ['ai'] });
assert.strictEqual(ghRow.homepage_url, 'https://acme.dev');
assert.strictEqual(ghRow.github_url, 'https://github.com/o/acme');

// YC mapper: Active + website required; batch recency orders correctly
assert.strictEqual(mapYCCompany({ name: 'Dead Co', status: 'Inactive', website: 'https://x.com' }), null);
assert.ok(batchRecency('Winter 2026') > batchRecency('Fall 2025'));
assert.ok(batchRecency('Spring 2026') > batchRecency('Winter 2026'));
const ycRow = mapYCCompany({ name: 'Acme', status: 'Active', website: 'https://acme.com', one_liner: 'AI for Z', batch: 'Winter 2026', industry: 'B2B', all_locations: 'San Francisco, CA, USA; Remote', slug: 'acme' });
assert.strictEqual(ycRow.stage, 'YC Winter 2026');
assert.strictEqual(ycRow.location, 'San Francisco, CA, USA');

console.log('ok — canonicalSourceUrl dedup + hn/github/yc mappers behave');
