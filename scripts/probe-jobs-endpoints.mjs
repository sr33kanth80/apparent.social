/**
 * Ask Orthogonal's catalog which hiring endpoints can filter by recency.
 *
 * The docs do not publish the catalog — it is discovered at runtime — so the
 * only authoritative answer to "can we get postings from the last 7 days" is
 * to search for the endpoints and read their declared parameters.
 *
 * Free: /v1/search and /v1/details are unpaid, and nothing here calls /v1/run.
 *
 *   $env:ORTHOGONAL_API_KEY='...'; node scripts/probe-jobs-endpoints.mjs
 */

import { createOrthogonalSession } from '../server/agent/orthogonal.js';

const PROMPTS = [
  'job postings published in the last 7 days, sorted by date posted',
  'fresh new job openings posted recently at companies',
  'companies hiring with open job postings and careers page',
  'job board feed of newly posted vacancies with posted date',
  'real time job posting alerts for new openings',
];

/** Parameter names that would let us ask for recent postings only. */
const RECENCY = /(post(ed)?|created|published|updated|date|since|recent|fresh|age|days|new|window|after|from)/i;
const SORTING = /(sort|order|newest|latest)/i;

const session = createOrthogonalSession({ maxCalls: 200, maxSpendCents: 0 });

const seen = new Map();

for (const prompt of PROMPTS) {
  let result;
  try {
    result = await session.search(prompt, 20);
  } catch (error) {
    console.error(`search failed for "${prompt}": ${error.message}`);
    continue;
  }

  for (const api of result?.results ?? []) {
    for (const endpoint of api?.endpoints ?? []) {
      const key = `${api.slug}${endpoint.path}`;
      if (seen.has(key)) continue;
      seen.set(key, { api: api.slug, path: endpoint.path, description: endpoint.description ?? '' });
    }
  }
}

console.log(`${seen.size} candidate endpoints; reading declared parameters…\n`);

const rows = [];
for (const entry of seen.values()) {
  let details;
  try {
    details = await session.details({ api: entry.api, path: entry.path });
  } catch (error) {
    rows.push({ ...entry, error: error.message });
    continue;
  }
  const params = details?.endpoint?.parameters ?? details?.parameters ?? [];
  const names = (Array.isArray(params) ? params : Object.keys(params || {})).map(String);
  rows.push({
    ...entry,
    priceCents: Math.round((details?.endpoint?.price ?? 0) * 100),
    params: names,
    recency: names.filter((n) => RECENCY.test(n)),
    sorting: names.filter((n) => SORTING.test(n)),
  });
}

// Endpoints that can actually answer "posted in the last 7 days" come first.
rows.sort((a, b) => (b.recency?.length ?? 0) - (a.recency?.length ?? 0));

for (const row of rows) {
  if (row.error) {
    console.log(`✗ ${row.api}${row.path} — ${row.error}`);
    continue;
  }
  const mark = row.recency.length ? '★' : ' ';
  console.log(`${mark} ${row.api}${row.path}  ${row.priceCents}¢`);
  if (row.recency.length) console.log(`    recency: ${row.recency.join(', ')}`);
  if (row.sorting.length) console.log(`    sorting: ${row.sorting.join(', ')}`);
  console.log(`    all: ${row.params.join(', ') || '(none declared)'}`);
}
