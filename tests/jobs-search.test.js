// Jobs Map search — covers the money and trust paths:
//   1. fresh cache must NOT call Orthogonal
//   2. rate-limit deny must 429 before any spend
//   3. non-http(s) URLs must never be stored
//   4. stale cache falls through to Orthogonal and upserts

import test from 'node:test';
import assert from 'node:assert/strict';

process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';
process.env.ORTHOGONAL_API_KEY = 'test-key';

const { default: jobsSearchHandler } = await import('../server/jobs-search.js');
const { geocodeCity } = await import('../server/city-coords.js');

const makeRes = () => {
  const res = {
    statusCode: 0,
    body: null,
    headers: {},
    setHeader(k, v) {
      this.headers[k.toLowerCase()] = v;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
  return res;
};

const makeReq = (body) => ({
  method: 'POST',
  headers: { 'x-forwarded-for': '203.0.113.9' },
  body,
});

/** Routes fetch by URL so a test can assert exactly what was called. */
const installFetch = ({ rateAllowed = true, companies = [], orthogonal = null }) => {
  const calls = { rate: 0, select: 0, upsert: 0, orthogonal: 0 };
  const upserted = [];

  globalThis.fetch = async (url, options = {}) => {
    const href = String(url);
    const json = (value) => ({ ok: true, status: 200, text: async () => JSON.stringify(value), json: async () => value });

    if (href.includes('/rpc/consume_agent_rate_limit')) {
      calls.rate += 1;
      return json([{ allowed: rateAllowed, retry_after: 42 }]);
    }
    if (href.includes('/rest/v1/companies')) {
      if ((options.method || 'GET') === 'POST') {
        calls.upsert += 1;
        upserted.push(...JSON.parse(options.body));
        return json({});
      }
      calls.select += 1;
      return json(companies);
    }
    if (href.includes('api.orthogonal.com')) {
      calls.orthogonal += 1;
      if (!orthogonal) throw new Error('unexpected Orthogonal call');
      if (href.endsWith('/v1/search')) return json(orthogonal.search);
      if (href.endsWith('/v1/details')) return json(orthogonal.details);
      if (href.endsWith('/v1/run')) return json(orthogonal.run);
    }
    throw new Error(`unexpected fetch: ${href}`);
  };

  return { calls, upserted };
};

const freshRow = {
  canonical_domain: 'ramp.com',
  name: 'Ramp',
  website: 'https://ramp.com',
  careers_url: 'https://ramp.com/careers',
  one_liner: 'Finance automation',
  city: 'New York',
  latitude: 40.7128,
  longitude: -74.006,
  open_roles: 12,
  is_hiring: true,
  last_enriched_at: new Date().toISOString(),
};

test('fresh cache is served without calling Orthogonal', async () => {
  const { calls } = installFetch({ companies: [freshRow] });
  const res = makeRes();

  await jobsSearchHandler(makeReq({ query: 'fintech', city: 'New York' }), res, { geocode: geocodeCity });

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.source, 'cache');
  assert.equal(res.body.companies.length, 1);
  assert.equal(res.body.companies[0].name, 'Ramp');
  assert.equal(calls.orthogonal, 0, 'must not spend when cache is fresh');
});

test('rate-limited request 429s before any lookup or spend', async () => {
  const { calls } = installFetch({ rateAllowed: false, companies: [freshRow] });
  const res = makeRes();

  await jobsSearchHandler(makeReq({ query: 'fintech' }), res, { geocode: geocodeCity });

  assert.equal(res.statusCode, 429);
  assert.equal(res.body.error, 'rate_limited');
  assert.equal(res.headers['retry-after'], '42');
  assert.equal(calls.select, 0, 'must not query before the limiter clears');
  assert.equal(calls.orthogonal, 0, 'must not spend when rate limited');
});

test('stale cache falls through to Orthogonal, sanitizes URLs, and upserts', async () => {
  const staleRow = { ...freshRow, last_enriched_at: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString() };
  const { calls, upserted } = installFetch({
    companies: [staleRow],
    orthogonal: {
      search: { data: { results: [{ slug: 'jobsapi', endpoints: [{ path: '/companies' }] }] } },
      details: { endpoint: { price: 0.02 } },
      run: {
        priceCents: 2,
        data: {
          results: [
            { name: 'Linear', website: 'https://linear.app', careers_url: 'https://linear.app/careers', city: 'Berlin, Germany', open_roles: 5 },
            { name: 'Evil', website: 'javascript:alert(1)', careers_url: 'javascript:alert(1)', city: 'London' },
            { name: '', website: 'https://nameless.com' },
          ],
        },
      },
    },
  });
  const res = makeRes();

  await jobsSearchHandler(makeReq({ query: 'startups', city: 'Berlin' }), res, { geocode: geocodeCity });

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.source, 'orthogonal');
  assert.equal(calls.upsert, 1);

  // Only the well-formed row survives: javascript: yields no usable domain, and
  // the nameless row is skipped outright.
  assert.equal(upserted.length, 1);
  assert.equal(upserted[0].canonical_domain, 'linear.app');
  assert.equal(upserted[0].open_roles, 5);
  // "Berlin, Germany" must still resolve to the Berlin centroid.
  assert.equal(Math.round(upserted[0].latitude), 53);

  for (const row of upserted) {
    for (const url of [row.website, row.careers_url]) {
      assert.ok(url === '' || url.startsWith('http'), `unsafe url stored: ${url}`);
    }
  }
});

test('geocodeCity resolves decorated city strings and rejects unknowns', () => {
  assert.equal(geocodeCity('Berlin, Germany').latitude, 52.52);
  assert.equal(geocodeCity('SAN FRANCISCO, CA').latitude, 37.7749);
  assert.equal(geocodeCity('Remote - London').latitude, 51.5072);
  assert.equal(geocodeCity('Atlantis'), null);
  assert.equal(geocodeCity(''), null);
});
