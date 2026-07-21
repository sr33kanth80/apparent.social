#!/usr/bin/env node
/**
 * purge-legacy-sources.mjs — inspect or clear public.source_signals.
 *
 * Modes:
 *   (default)  Delete rows tagged as pre-Orthogonal scrapers
 *              (raw.source ∈ hn|producthunt|github|yc).
 *   --inspect  Print total row count + a breakdown by raw.source tag +
 *              a few sample rows so you can see what's actually in there.
 *   --all      Delete EVERY row in source_signals. Use when you truly want
 *              to start fresh and let the next cron repopulate.
 *   --dry-run  With any mode: count only, do not delete.
 *
 * Env:
 *   SUPABASE_URL (or VITE_SUPABASE_URL)
 *   SUPABASE_SERVICE_ROLE_KEY
 */
const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const DRY_RUN = process.argv.includes('--dry-run');
const INSPECT = process.argv.includes('--inspect');
const ALL = process.argv.includes('--all');

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
  process.exit(1);
}

const headers = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
};

const countRows = async (filter = '') => {
  const url = `${SUPABASE_URL}/rest/v1/source_signals?select=id${filter ? `&${filter}` : ''}`;
  const res = await fetch(url, { headers: { ...headers, Prefer: 'count=exact', Range: '0-0' } });
  return Number((res.headers.get('content-range') || '').split('/')[1]) || 0;
};

if (INSPECT) {
  const total = await countRows();
  console.log(`total rows in source_signals: ${total}`);
  const sampleRes = await fetch(
    `${SUPABASE_URL}/rest/v1/source_signals?select=id,company,source_type,source_url,freshness_at,raw&order=freshness_at.desc&limit=5`,
    { headers },
  );
  const sample = await sampleRes.json();
  console.log('\nnewest 5 rows:');
  for (const row of sample) {
    console.log(`  · ${row.company} — source_type=${row.source_type} raw.source=${row.raw?.source ?? '(none)'} — ${row.source_url}`);
  }
  process.exit(0);
}

const filter = ALL ? '' : 'raw->>source=in.(hn,producthunt,github,yc)';
const total = await countRows(filter);
console.log(`${ALL ? 'total' : 'legacy'} rows found: ${total}`);

if (!total || DRY_RUN) {
  console.log(DRY_RUN ? 'dry-run — nothing deleted.' : 'nothing to delete.');
  process.exit(0);
}

// PostgREST refuses an unqualified DELETE; when wiping everything use a
// tautological filter on id to satisfy that guard.
const delFilter = ALL ? 'id=not.is.null' : filter;
const delRes = await fetch(
  `${SUPABASE_URL}/rest/v1/source_signals?${delFilter}`,
  { method: 'DELETE', headers: { ...headers, Prefer: 'return=minimal' } },
);
if (!delRes.ok) {
  console.error(`delete failed (${delRes.status}): ${await delRes.text()}`);
  process.exit(1);
}
console.log(`deleted ${total} rows.`);
