#!/usr/bin/env node
/**
 * purge-legacy-sources.mjs — delete rows in public.source_signals that came
 * from the pre-Orthogonal scrapers (HN, Product Hunt, GitHub search, YC). The
 * Orthogonal scout writes rows with no `raw.source` field, so filtering on
 * `raw->>source=in.(hn,producthunt,github,yc)` targets exactly the legacy set.
 *
 * Usage:
 *   node scripts/purge-legacy-sources.mjs [--dry-run]
 *
 * Env:
 *   SUPABASE_URL (or VITE_SUPABASE_URL)
 *   SUPABASE_SERVICE_ROLE_KEY
 */
const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const DRY_RUN = process.argv.includes('--dry-run');

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
  process.exit(1);
}

const headers = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
};

const filter = 'raw->>source=in.(hn,producthunt,github,yc)';

const countRes = await fetch(
  `${SUPABASE_URL}/rest/v1/source_signals?select=id&${filter}`,
  { headers: { ...headers, Prefer: 'count=exact', Range: '0-0' } },
);
const contentRange = countRes.headers.get('content-range') || '';
const total = Number(contentRange.split('/')[1]) || 0;
console.log(`legacy rows found: ${total}`);

if (!total || DRY_RUN) {
  console.log(DRY_RUN ? 'dry-run — nothing deleted.' : 'nothing to delete.');
  process.exit(0);
}

const delRes = await fetch(
  `${SUPABASE_URL}/rest/v1/source_signals?${filter}`,
  { method: 'DELETE', headers: { ...headers, Prefer: 'return=minimal' } },
);
if (!delRes.ok) {
  console.error(`delete failed (${delRes.status}): ${await delRes.text()}`);
  process.exit(1);
}
console.log(`deleted ${total} legacy rows.`);
