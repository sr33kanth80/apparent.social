// Jobs Map search — covers the money and trust paths:
//   1. fresh cache must NOT call Orthogonal
//   2. rate-limit deny must 429 before any spend
//   3. non-http(s) URLs must never be stored
//   4. stale cache falls through to Orthogonal and upserts

import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';

process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';
process.env.ORTHOGONAL_API_KEY = 'test-key';

const { default: jobsSearchHandler } = await import('../server/jobs-search.js');
const { geocodeCity, nearestCity } = await import('../server/city-coords.js');
const { clearOrthogonalDetailsCache } = await import('../server/agent/orthogonal.js');

// The Orthogonal wrapper caches endpoint details and paid run results
// PROCESS-wide, by design, so repeats across turns are not re-charged. In tests
// that means one case's cached endpoint schema and results leak into the next.
// Clearing before each test keeps them independent.
beforeEach(() => clearOrthogonalDetailsCache());

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
      // Real signalbase /signals/hiring shape: one row per JOB, camelCase.
      run: {
        priceCents: 2,
        data: {
          results: [
            // Bare host with no scheme — the real signalbase shape.
            { companyName: 'Linear', companyWebsite: 'linear.app', jobUrl: 'https://jobs.example/1', city: 'Berlin, Germany', title: 'Engineer', companyIndustry: 'Software' },
            { companyName: 'Linear', companyWebsite: 'https://linear.app', jobUrl: 'https://jobs.example/2', city: 'Berlin, Germany', title: 'Designer' },
            { companyName: 'Linear', companyWebsite: 'https://linear.app', jobUrl: 'https://jobs.example/3', city: 'Berlin, Germany', title: 'PM' },
            { companyName: 'Evil', companyWebsite: 'javascript:alert(1)', jobUrl: 'javascript:alert(1)', city: 'London' },
            { companyName: '', companyWebsite: 'https://nameless.com' },
            // JSON:API envelope must be flattened.
            { id: 'x', type: 'job', attributes: { companyName: 'Wrapped', companyWebsite: 'https://wrapped.io', city: 'London', jobUrl: 'https://jobs.example/9' } },
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

  // javascript: yields no usable domain and the nameless row is skipped, so
  // only Linear (3 jobs, collapsed) and the JSON:API-wrapped row survive.
  assert.equal(upserted.length, 2);

  const linear = upserted.find((r) => r.canonical_domain === 'linear.app');
  assert.ok(linear, 'Linear should be aggregated');
  // Three job rows for one company must become one pin with three roles.
  assert.equal(linear.open_roles, 3);
  assert.equal(linear.one_liner, 'Software');
  // A scheme-less host must be coerced to https, not dropped.
  assert.equal(linear.website, 'https://linear.app/');
  // "Berlin, Germany" must still resolve to the Berlin centroid.
  assert.equal(Math.round(linear.latitude), 53);

  // The {id,type,attributes} envelope must be flattened, not dropped.
  const wrapped = upserted.find((r) => r.canonical_domain === 'wrapped.io');
  assert.ok(wrapped, 'JSON:API-wrapped row should be read');
  assert.equal(wrapped.name, 'Wrapped');

  // A job-board URL must never become the dedup key (it would merge companies).
  assert.ok(!upserted.some((r) => r.canonical_domain === 'jobs.example'));

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
  // Metro phrasings must land on the city itself.
  assert.equal(geocodeCity('Greater Boston').latitude, 42.3601);
  assert.equal(geocodeCity('Boston Metropolitan Area').latitude, 42.3601);
  assert.equal(geocodeCity('Atlantis'), null);
  assert.equal(geocodeCity(''), null);
  // A country is not a place to put a pin.
  assert.equal(geocodeCity('United States'), null);
});

test('discovery pages through results and stops when a page is empty', async () => {
  const pagesSeen = [];
  let upserted = [];

  globalThis.fetch = async (url, options = {}) => {
    const href = String(url);
    const json = (value) => ({ ok: true, status: 200, text: async () => JSON.stringify(value), json: async () => value });

    if (href.includes('/rpc/consume_agent_rate_limit')) return json([{ allowed: true }]);
    if (href.includes('/rest/v1/companies')) {
      const method = options.method || 'GET';
      if (method === 'POST') { upserted = JSON.parse(options.body); return json({}); }
      if (method === 'PATCH') return json({});
      return json([]); // empty cache => must discover
    }
    if (href.endsWith('/v1/search')) {
      return json({ results: [{ slug: 'signalbase', endpoints: [{ path: '/signals/hiring', method: 'GET' }] }] });
    }
    if (href.endsWith('/v1/details')) {
      return json({ endpoint: { price: 0.02, parameters: ['page', 'limit', 'search', 'city'] } });
    }
    if (href.endsWith('/v1/run')) {
      const page = Number(JSON.parse(options.body).query.page || 1);
      pagesSeen.push(page);
      // Two pages of data, then an empty page that must halt the loop.
      if (page > 2) return json({ results: [] });
      return json({
        priceCents: 2,
        results: [
          { companyName: `Co A${page}`, companyWebsite: `a${page}.com`, city: 'Boston', jobUrl: 'https://j.example/1' },
          { companyName: `Co B${page}`, companyWebsite: `b${page}.com`, city: 'Boston', jobUrl: 'https://j.example/2' },
        ],
      });
    }
    throw new Error(`unexpected fetch: ${href}`);
  };

  const res = makeRes();
  await jobsSearchHandler(makeReq({ query: 'engineer', city: 'Boston' }), res, { geocode: geocodeCity });

  assert.equal(res.body.source, 'orthogonal');
  // Page 1 plus further pages, halting at the empty one rather than burning
  // every allowed page.
  assert.deepEqual(pagesSeen, [1, 2, 3]);
  // Both pages contributed distinct companies instead of only the first.
  assert.equal(upserted.length, 4);
  assert.ok(upserted.some((r) => r.canonical_domain === 'a1.com'));
  assert.ok(upserted.some((r) => r.canonical_domain === 'b2.com'));
});

test('exploring open water resolves no city and never spends', async () => {
  let orthogonalCalls = 0;
  globalThis.fetch = async (url, options = {}) => {
    const href = String(url);
    const json = (v) => ({ ok: true, status: 200, text: async () => JSON.stringify(v), json: async () => v });
    if (href.includes('/rpc/consume_agent_rate_limit')) return json([{ allowed: true }]);
    if (href.includes('/rest/v1/companies')) return json([]);
    if (href.includes('api.orthogonal.com')) { orthogonalCalls += 1; return json({}); }
    throw new Error(`unexpected fetch: ${href}`);
  };

  const res = makeRes();
  // Middle of the Atlantic.
  await jobsSearchHandler(makeReq({ lat: 30, lng: -40 }), res, { geocode: geocodeCity, nearestCity });

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.degraded, 'no_city_nearby');
  assert.equal(res.body.companies.length, 0);
  assert.equal(orthogonalCalls, 0, 'must not spend where there is no city');
});

test('exploring near a city resolves it and discovers there', async () => {
  let sentCity = null;
  let upserted = [];
  globalThis.fetch = async (url, options = {}) => {
    const href = String(url);
    const json = (v) => ({ ok: true, status: 200, text: async () => JSON.stringify(v), json: async () => v });
    if (href.includes('/rpc/consume_agent_rate_limit')) return json([{ allowed: true }]);
    if (href.includes('/rest/v1/companies')) {
      const method = options.method || 'GET';
      if (method === 'POST') { upserted = JSON.parse(options.body); return json({}); }
      if (method === 'PATCH') return json({});
      return json([]);
    }
    if (href.endsWith('/v1/search')) {
      return json({ results: [{ slug: 'signalbase', endpoints: [{ path: '/signals/hiring', method: 'GET' }] }] });
    }
    if (href.endsWith('/v1/details')) return json({ endpoint: { price: 0.02, parameters: ['limit', 'city'] } });
    if (href.endsWith('/v1/run')) {
      sentCity = JSON.parse(options.body).query.city;
      return json({ priceCents: 2, results: [
        { companyName: 'Wonder', companyWebsite: 'wonder.com', city: 'Boston', jobUrl: 'https://j.example/1' },
      ] });
    }
    throw new Error(`unexpected fetch: ${href}`);
  };

  const res = makeRes();
  // A point in Boston, sent as coordinates the way the map does it.
  await jobsSearchHandler(makeReq({ lat: 42.36, lng: -71.06 }), res, { geocode: geocodeCity, nearestCity });

  assert.equal(res.body.source, 'orthogonal');
  // The coordinate must be reverse-geocoded into the city filter.
  assert.equal(sentCity, 'Boston');
  assert.equal(res.body.resolvedCity, 'Boston');
  assert.equal(upserted.length, 1);
  assert.equal(upserted[0].canonical_domain, 'wonder.com');
});

test('roles are stored per job, not collapsed into the company', async () => {
  let companyRows = [];
  let jobRows = [];

  globalThis.fetch = async (url, options = {}) => {
    const href = String(url);
    const json = (v) => ({ ok: true, status: 200, text: async () => JSON.stringify(v), json: async () => v });

    if (href.includes('/rpc/consume_agent_rate_limit')) return json([{ allowed: true }]);
    if (href.includes('/rest/v1/company_jobs')) { jobRows = JSON.parse(options.body); return json({}); }
    if (href.includes('/rest/v1/companies')) {
      const method = options.method || 'GET';
      if (method === 'POST') { companyRows = JSON.parse(options.body); return json({}); }
      if (method === 'PATCH') return json({});
      return json([]);
    }
    if (href.endsWith('/v1/search')) {
      return json({ results: [{ slug: 'signalbase', endpoints: [{ path: '/signals/hiring', method: 'GET' }] }] });
    }
    if (href.endsWith('/v1/details')) return json({ endpoint: { price: 0.02, parameters: ['limit', 'city'] } });
    if (href.endsWith('/v1/run')) {
      return json({ priceCents: 2, results: [
        { jobId: 'j1', companyName: 'Wonder', companyWebsite: 'wonder.com', city: 'Boston',
          title: 'Senior Backend Engineer', jobUrl: 'https://j.example/1', employmentType: 'Full-time',
          seniorityLevel: 'Senior', jobFunction: 'Engineering', datePosted: '2026-08-20',
          numApplicants: 12, companyLogoUrl: 'https://logo.example/w.png', companyEmployeeCount: 240 },
        { jobId: 'j2', companyName: 'Wonder', companyWebsite: 'wonder.com', city: 'Boston',
          title: 'Product Designer', jobUrl: 'https://j.example/2', employmentType: 'Contract',
          seniorityLevel: 'Mid-Senior level', datePosted: 'not-a-date' },
        // Same posting seen again on another page: must not duplicate.
        { jobId: 'j1', companyName: 'Wonder', companyWebsite: 'wonder.com', city: 'Boston',
          title: 'Senior Backend Engineer', jobUrl: 'https://j.example/1' },
        // No title: not a storable role, but still counts toward the company.
        { companyName: 'Wonder', companyWebsite: 'wonder.com', city: 'Boston' },
      ] });
    }
    throw new Error(`unexpected fetch: ${href}`);
  };

  const res = makeRes();
  await jobsSearchHandler(makeReq({ query: 'engineer', city: 'Boston' }), res, { geocode: geocodeCity, nearestCity });

  assert.equal(res.body.source, 'orthogonal');

  // One company pin, but its individual roles are kept.
  assert.equal(companyRows.length, 1);
  assert.equal(companyRows[0].canonical_domain, 'wonder.com');
  // Company-level extras that used to be discarded.
  assert.equal(companyRows[0].employee_count, 240);
  assert.equal(companyRows[0].logo_url, 'https://logo.example/w.png');

  // The repeated posting is deduped by job_key.
  assert.equal(jobRows.length, 2);
  const eng = jobRows.find((j) => j.job_key === 'j1');
  assert.equal(eng.title, 'Senior Backend Engineer');
  assert.equal(eng.seniority, 'Senior');
  assert.equal(eng.employment_type, 'Full-time');
  assert.equal(eng.job_function, 'Engineering');
  assert.equal(eng.applicants, 12);
  assert.ok(eng.posted_at.startsWith('2026-08-20'));
  assert.equal(eng.company_domain, 'wonder.com');

  // An unparseable date must become null rather than a bad timestamp.
  const design = jobRows.find((j) => j.job_key === 'j2');
  assert.equal(design.posted_at, null);
  assert.equal(design.employment_type, 'Contract');
});
