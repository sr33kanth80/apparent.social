// Self-check for the dedup key. Run: node scripts/ingest-signals.test.mjs
// Lives outside api/ so Vercel doesn't deploy it as a serverless function.
// The (source_type, source_url) unique index only dedupes EXACT source_url
// matches, so canonicalSourceUrl must collapse every way the model might cite
// one startup to a single bare-domain key — or the 12h re-run duplicates rows.
import assert from 'node:assert';
import { canonicalSourceUrl } from '../api/ingest-signals.js';

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

console.log('ok — canonicalSourceUrl dedupes to a single bare-domain key');
