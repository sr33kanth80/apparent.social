import assert from 'node:assert/strict';
import test from 'node:test';

import {
  agentCallBudget,
  apparentAgentErrorResponse,
  createApparentAgentRuntime,
  createPublicResearchPolicy,
  isAuthorizedResearchUrl,
  rankCatalogEndpoints,
  runDynamicOrthogonalTool,
  runOrthogonalRouterTool,
  runEnrichmentAdapter,
  runStandardOrthogonalTool,
} from '../server/agent/apparent-agent-runtime.js';
import { clearOrthogonalDetailsCache, createOrthogonalSession, OrthogonalError } from '../server/agent/orthogonal.js';

test('the Apparent runtime executes tools and returns the final reply', async () => {
  const completions = [
    {
      content: '',
      toolCalls: [{ id: 'call_1', name: 'lookup', input: { query: 'infra' }, raw: null }],
    },
    { content: 'Two matching founders were found.', toolCalls: [] },
  ];
  const runtime = createApparentAgentRuntime({
    session: { usage: () => ({ callCount: 0, spentCents: 0 }) },
    complete: async () => completions.shift(),
  });
  const calls = [];

  const result = await runtime.run({
    system: 'You are Apparent.',
    messages: [{ role: 'user', content: 'Find founders.' }],
    tools: [{ name: 'lookup', description: 'Lookup', input_schema: { type: 'object', properties: {} } }],
    executeTool: async (name, input) => {
      calls.push({ name, input });
      return { count: 2 };
    },
  });

  assert.equal(result.reply, 'Two matching founders were found.');
  assert.deepEqual(calls, [{ name: 'lookup', input: { query: 'infra' } }]);
});

test('Orthogonal session enforces its API allowlist before making a request', async () => {
  let fetched = false;
  const session = createOrthogonalSession({
    apiKey: 'test',
    detailsCache: new Map(),
    allowedApis: ['linkup'],
    fetchImpl: async () => {
      fetched = true;
      return new Response('{}');
    },
  });

  await assert.rejects(
    session.run({ api: 'apollo', path: '/v1/people/match' }),
    (error) => error instanceof OrthogonalError && error.code === 'orthogonal_api_not_allowed',
  );
  assert.equal(fetched, false);
});

test('public URL fetch rejects credentials before calling Orthogonal', async () => {
  let called = false;
  const result = await runStandardOrthogonalTool(
    { run: async () => { called = true; } },
    'fetch_public_url',
    { url: 'https://user:secret@example.com/private' },
  );

  assert.deepEqual(result, { error: 'public_http_url_required' });
  assert.equal(called, false);
});

test('the default inference route is the verified Orthogonal Baseten endpoint', async () => {
  const calls = [];
  const session = {
    run: async (request) => {
      calls.push(request);
      return { data: { choices: [{ message: { content: 'Apparent is ready.' } }] } };
    },
    usage: () => ({ callCount: calls.length, spentCents: 0 }),
  };
  const runtime = createApparentAgentRuntime({ session });

  const result = await runtime.run({
    system: 'You are Apparent.',
    messages: [{ role: 'user', content: 'Hello' }],
    tools: [],
    executeTool: async () => null,
  });

  assert.equal(result.reply, 'Apparent is ready.');
  assert.equal(calls[0].api, 'baseten');
  assert.equal(calls[0].path, '/v1/chat/completions');
  assert.equal(calls[0].body.model, 'zai-org/GLM-5.2');
});

test('public research rejects private hosts, signed URLs, and unapproved query terms', async () => {
  let called = false;
  const session = { run: async () => { called = true; } };
  const policy = createPublicResearchPolicy({ publicContext: 'Find fintech startups https://example.com' });

  assert.deepEqual(
    await runStandardOrthogonalTool(session, 'fetch_public_url', { url: 'http://169.254.169.254/latest/meta-data' }, policy),
    { error: 'public_http_url_required' },
  );
  assert.deepEqual(
    await runStandardOrthogonalTool(session, 'fetch_public_url', { url: 'http://[::ffff:127.0.0.1]/private' }, policy),
    { error: 'public_http_url_required' },
  );
  assert.deepEqual(
    await runStandardOrthogonalTool(session, 'fetch_public_url', { url: 'https://example.com/deck?token=secret' }, policy),
    { error: 'public_http_url_required' },
  );
  assert.deepEqual(
    await runStandardOrthogonalTool(session, 'fetch_public_url', { url: 'https://example.com/secret/private-value' }, policy),
    { error: 'public_http_url_required' },
  );
  assert.equal(
    (await runStandardOrthogonalTool(session, 'search_public_web', { query: 'privateperson fintech startups' }, policy)).error,
    'public_query_not_authorized',
  );
  assert.equal(called, false);
});

test('search results extend the query allowlist and enable same-origin fetches', async () => {
  const policy = createPublicResearchPolicy({ publicContext: 'Find fintech startups' });
  const session = {
    run: async ({ api }) => (api === 'linkup'
      ? { data: { results: [{ title: 'Acme logistics platform', url: 'https://acme.com' }] } }
      : { data: { text: 'Team page.' } }),
  };

  // Terms discovered in search results become queryable in follow-up searches.
  await runStandardOrthogonalTool(session, 'search_public_web', { query: 'fintech startups' }, policy);
  const followUp = await runStandardOrthogonalTool(session, 'search_public_web', { query: 'acme logistics funding' }, policy);
  assert.equal(followUp.error, undefined);

  // Same-origin subpages of a discovered site are fetchable.
  const subpage = await runStandardOrthogonalTool(session, 'fetch_public_url', { url: 'https://acme.com/team' }, policy);
  assert.equal(subpage.error, undefined);
  // Unrelated origins stay blocked.
  const foreign = await runStandardOrthogonalTool(session, 'fetch_public_url', { url: 'https://attacker.example/team' }, policy);
  assert.equal(foreign.error, 'public_url_not_authorized');
});

test('public web research accepts date/source modifiers and falls back from Linkup to Serper', async () => {
  const policy = createPublicResearchPolicy({ publicContext: 'funding rounds June 2026' });
  const calls = [];
  const session = {
    run: async ({ api, path }) => {
      calls.push(`${api}${path}`);
      if (api === 'linkup') throw new Error('route unavailable');
      return { data: { organic: [{ title: 'Funding announcement', link: 'https://techcrunch.com/example' }] } };
    },
  };

  const result = await runStandardOrthogonalTool(
    session,
    'search_public_web',
    { query: 'June 2026 funding rounds TechCrunch' },
    policy,
  );

  assert.equal(result.error, undefined);
  assert.deepEqual(calls, ['linkup/v1/search', 'serper/search']);
});

test('the term allowlist blocks off-context queries but openQueries lifts it', async () => {
  const seed = 'Source fresh thesis-fit startups. Sectors: fintech.';
  const session = { run: async () => ({ data: { results: [] } }) };
  const query = { query: 'Show HN launches raising pre-seed' };

  const gated = await runStandardOrthogonalTool(
    session,
    'search_public_web',
    query,
    createPublicResearchPolicy({ publicContext: seed }),
  );
  assert.equal(gated.error, 'public_query_not_authorized');

  const open = await runStandardOrthogonalTool(
    session,
    'search_public_web',
    query,
    createPublicResearchPolicy({ publicContext: seed, openQueries: true }),
  );
  assert.equal(open.error, undefined);

  // openQueries lifts the allowlist, never the sensitive-data filter.
  const sensitive = await runStandardOrthogonalTool(
    session,
    'search_public_web',
    { query: 'user password hunter2' },
    createPublicResearchPolicy({ publicContext: seed, openQueries: true }),
  );
  assert.equal(sensitive.error, 'public_query_not_authorized');
});

test('catalog results feed the research policy so their URLs carry provenance', async () => {
  const policy = createPublicResearchPolicy({ publicContext: 'sectors: fintech', openQueries: true });
  const endpoint = { api: 'demo', path: '/v1/companies' };
  const session = {
    isDiscovered: () => true,
    run: async () => ({ data: { companies: [{ name: 'Acme', site: 'https://acme.com' }] } }),
  };

  assert.equal(isAuthorizedResearchUrl(policy, 'https://acme.com', { sameOrigin: true }), false);
  await runDynamicOrthogonalTool(session, 'run_orthogonal_api', endpoint, policy);
  assert.equal(isAuthorizedResearchUrl(policy, 'https://acme.com', { sameOrigin: true }), true);
});

test('public news research uses Orthogonal Serper news search', async () => {
  const policy = createPublicResearchPolicy({ publicContext: 'funding announcements June 2026' });
  const calls = [];
  const session = {
    run: async (request) => {
      calls.push(request);
      return { data: { news: [{ title: 'Acme raised a seed round', link: 'https://example.com/acme' }] } };
    },
  };

  const result = await runStandardOrthogonalTool(
    session,
    'search_public_news',
    { query: 'June 2026 funding announcements', limit: 12 },
    policy,
  );

  assert.equal(result.error, undefined);
  assert.equal(calls[0].api, 'serper');
  assert.equal(calls[0].path, '/news');
  assert.equal(calls[0].body.num, 12);
});

test('catalog discovery authorizes only the exact discovered Orthogonal endpoint', async () => {
  const fetchImpl = async (url) => {
    const path = new URL(url).pathname;
    if (path === '/v1/search') {
      return new Response(JSON.stringify({ results: [{ slug: 'funding-data', endpoints: [{ path: '/v1/rounds', price: 0.01 }] }] }), { status: 200 });
    }
    if (path === '/v1/details') {
      return new Response(JSON.stringify({ endpoint: { path: '/v1/rounds', price: 0.01, hasDynamicPricing: false } }), { status: 200 });
    }
    if (path === '/v1/run') {
      return new Response(JSON.stringify({ data: { rounds: [{ company: 'Acme' }] }, priceCents: 1 }), { status: 200 });
    }
    return new Response(JSON.stringify({ error: 'not found' }), { status: 404 });
  };
  const session = createOrthogonalSession({
    apiKey: 'test-key',
    fetchImpl,
    allowedApis: ['baseten'],
    maxSpendCents: 10,
  });

  const discovery = await runDynamicOrthogonalTool(session, 'discover_orthogonal_apis', { prompt: 'funding rounds by date' });
  assert.equal(discovery.error, undefined);
  const details = await runDynamicOrthogonalTool(session, 'get_orthogonal_api_details', { api: 'funding-data', path: '/v1/rounds' });
  assert.equal(details.endpoint.path, '/v1/rounds');
  const result = await runDynamicOrthogonalTool(session, 'run_orthogonal_api', { api: 'funding-data', path: '/v1/rounds', query: { month: '2026-06' } });
  assert.equal(result.rounds[0].company, 'Acme');
  await assert.rejects(
    session.run({ api: 'funding-data', path: '/v1/people' }),
    (error) => error instanceof OrthogonalError && error.code === 'orthogonal_api_not_allowed',
  );
});

test('runEnrichmentAdapter falls through candidates and never throws', async () => {
  const calls = [];
  const session = {
    run: async ({ api, path }) => {
      calls.push(`${api}${path}`);
      if (api === 'apollo') throw new Error('route not found');
      return { data: { name: 'Acme', funding: '$2M' } };
    },
    search: async () => ({ data: [] }),
  };

  const result = await runEnrichmentAdapter(session, {
    candidates: [
      { api: 'apollo', path: '/api/v1/organizations/enrich', query: { domain: 'acme.com' } },
      { api: 'peopledatalabs', path: '/v5/company/enrich', query: { website: 'acme.com' } },
    ],
    discovery: { prompt: 'test: company enrichment fallthrough', query: { domain: 'acme.com' } },
  });

  assert.equal(result.error, undefined);
  assert.equal(result.provider, 'peopledatalabs/v5/company/enrich');
  assert.deepEqual(calls, ['apollo/api/v1/organizations/enrich', 'peopledatalabs/v5/company/enrich']);
});

test('runEnrichmentAdapter self-heals via catalog discovery when candidates fail', async () => {
  const calls = [];
  const session = {
    run: async ({ api, path }) => {
      calls.push(`${api}${path}`);
      if (api === 'discovered') return { data: { ok: true } };
      throw new Error('route not found');
    },
    search: async () => ({ data: { endpoints: [{ api: 'discovered', path: '/v1/enrich' }] } }),
  };

  const result = await runEnrichmentAdapter(session, {
    candidates: [{ api: 'apollo', path: '/wrong/path', query: { domain: 'acme.com' } }],
    discovery: { prompt: 'test: discovery self-heal', query: { domain: 'acme.com' } },
  });

  assert.equal(result.error, undefined);
  assert.equal(result.provider, 'discovered/v1/enrich');
  assert.deepEqual(calls, ['apollo/wrong/path', 'discovered/v1/enrich']);
});

test('public research records deterministic fetched URL provenance', async () => {
  const policy = createPublicResearchPolicy({ publicContext: 'Research https://example.com/company' });
  const session = { run: async () => ({ data: { text: 'Public company page.' } }) };
  await runStandardOrthogonalTool(session, 'fetch_public_url', { url: 'https://example.com/company' }, policy);

  assert.equal(isAuthorizedResearchUrl(policy, 'https://example.com/company'), true);
  assert.equal(isAuthorizedResearchUrl(policy, 'https://example.com/company', { fetchedOnly: true }), true);
  assert.equal(isAuthorizedResearchUrl(policy, 'https://attacker.example/company', { fetchedOnly: true }), false);
});

test('action tools are not executed when deterministic user intent is absent', async () => {
  const completions = [
    { content: '', toolCalls: [{ id: 'action_1', name: 'send_message', input: {}, raw: null }] },
    { content: 'I need your confirmation first.', toolCalls: [] },
  ];
  let executed = false;
  const runtime = createApparentAgentRuntime({
    session: { usage: () => ({ callCount: 0, spentCents: 0 }) },
    complete: async () => completions.shift(),
  });
  const result = await runtime.run({
    system: 'You are Apparent.',
    messages: [{ role: 'user', content: 'Research this founder.' }],
    tools: [{ name: 'send_message', description: 'Send', input_schema: { type: 'object', properties: {} } }],
    authorizeTool: () => false,
    executeTool: async () => { executed = true; },
  });
  assert.equal(executed, false);
  assert.equal(result.reply, 'I need your confirmation first.');
});

test('the runtime rejects oversized conversation fields before inference', async () => {
  let completed = false;
  const runtime = createApparentAgentRuntime({
    session: { usage: () => ({ callCount: 0, spentCents: 0 }) },
    complete: async () => { completed = true; },
  });
  await assert.rejects(
    runtime.run({
      system: 'You are Apparent.',
      messages: [{ role: 'user', content: 'x'.repeat(12_001) }],
      tools: [],
      executeTool: async () => null,
    }),
    (error) => error instanceof OrthogonalError && error.code === 'agent_context_too_large',
  );
  assert.equal(completed, false);
});

test('the runtime rechecks aggregate context after tool output', async () => {
  let completionCount = 0;
  const runtime = createApparentAgentRuntime({
    session: { usage: () => ({ callCount: 0, spentCents: 0 }) },
    complete: async () => {
      completionCount += 1;
      return {
        content: '',
        toolCalls: Array.from({ length: 8 }, (_, index) => ({
          id: `bulk_${index}`,
          name: 'bulk_lookup',
          input: {},
          raw: null,
        })),
      };
    },
  });
  await assert.rejects(
    runtime.run({
      system: 'You are Apparent.',
      messages: [{ role: 'user', content: 'Research these.' }],
      tools: [{ name: 'bulk_lookup', description: 'Bulk', input_schema: { type: 'object', properties: {} } }],
      executeTool: async () => ({ data: 'x'.repeat(30_000) }),
    }),
    (error) => error instanceof OrthogonalError && error.code === 'agent_context_too_large',
  );
  assert.equal(completionCount, 1);
});

test('Orthogonal checks the catalog price before a paid run', async () => {
  const paths = [];
  const session = createOrthogonalSession({
    apiKey: 'test',
    detailsCache: new Map(),
    allowedApis: ['baseten'],
    maxSpendCents: 100,
    fetchImpl: async (url) => {
      paths.push(new URL(url).pathname);
      return new Response(JSON.stringify({ success: true, endpoint: { price: 2, hasDynamicPricing: false } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    },
  });
  await assert.rejects(
    session.run({ api: 'baseten', path: '/v1/chat/completions', body: {} }),
    (error) => error instanceof OrthogonalError && error.code === 'orthogonal_budget_reached',
  );
  assert.deepEqual(paths, ['/v1/details']);
});

test('Orthogonal reserves the catalog price when run responses omit billing metadata', async () => {
  const paths = [];
  const session = createOrthogonalSession({
    apiKey: 'test',
    detailsCache: new Map(),
    allowedApis: ['baseten'],
    maxSpendCents: 100,
    fetchImpl: async (url) => {
      const path = new URL(url).pathname;
      paths.push(path);
      if (path === '/v1/details') {
        return new Response(JSON.stringify({ success: true, endpoint: { price: 0.6, hasDynamicPricing: false } }));
      }
      return new Response(JSON.stringify({ success: true, data: { ok: true } }));
    },
  });
  await session.run({ api: 'baseten', path: '/v1/chat/completions', body: { turn: 1 } });
  await assert.rejects(
    session.run({ api: 'baseten', path: '/v1/chat/completions', body: { turn: 2 } }),
    (error) => error instanceof OrthogonalError && error.code === 'orthogonal_budget_reached',
  );
  assert.equal(session.usage().spentCents, 60);
  assert.deepEqual(paths, ['/v1/details', '/v1/run']);
});

test('Orthogonal permits explicitly approved usage-priced inference and records its reported cost', async () => {
  const paths = [];
  const session = createOrthogonalSession({
    apiKey: 'test',
    detailsCache: new Map(),
    allowedApis: ['baseten'],
    dynamicPricingEndpoints: [{ api: 'baseten', path: '/v1/chat/completions' }],
    dynamicPriceEstimateCents: 10,
    maxSpendCents: 100,
    fetchImpl: async (url) => {
      const path = new URL(url).pathname;
      paths.push(path);
      if (path === '/v1/details') {
        return new Response(JSON.stringify({ success: true, endpoint: { price: null, hasDynamicPricing: true } }));
      }
      return new Response(JSON.stringify({ success: true, priceCents: 3.5, data: { ok: true } }));
    },
  });

  const result = await session.run({ api: 'baseten', path: '/v1/chat/completions', body: { turn: 1 } });

  assert.deepEqual(result.data, { ok: true });
  assert.equal(session.usage().spentCents, 3.5);
  assert.deepEqual(paths, ['/v1/details', '/v1/run']);
});

test('Orthogonal retries a transient paid upstream response with one idempotency key', async () => {
  const paths = [];
  const runIdempotencyKeys = [];
  let runAttempts = 0;
  const session = createOrthogonalSession({
    apiKey: 'test',
    detailsCache: new Map(),
    allowedApis: ['baseten'],
    dynamicPricingEndpoints: [{ api: 'baseten', path: '/v1/chat/completions' }],
    maxRetries: 1,
    retryBaseDelayMs: 1,
    fetchImpl: async (url, init) => {
      const path = new URL(url).pathname;
      paths.push(path);
      if (path === '/v1/details') {
        return new Response(JSON.stringify({ success: true, endpoint: { price: null, hasDynamicPricing: true } }));
      }
      runAttempts += 1;
      runIdempotencyKeys.push(init.headers['Idempotency-Key']);
      if (runAttempts === 1) {
        return new Response(JSON.stringify({ success: false, error: 'temporary provider failure' }), { status: 503 });
      }
      return new Response(JSON.stringify({ success: true, priceCents: 2, data: { ok: true } }));
    },
  });

  const result = await session.run({ api: 'baseten', path: '/v1/chat/completions', body: { turn: 1 } });

  assert.deepEqual(result.data, { ok: true });
  assert.deepEqual(paths, ['/v1/details', '/v1/run', '/v1/run']);
  assert.equal(runIdempotencyKeys.length, 2);
  assert.equal(runIdempotencyKeys[0], runIdempotencyKeys[1]);
  assert.equal(session.usage().spentCents, 2);
});

test('Orthogonal retries a transport failure with one idempotency key', async () => {
  const idempotencyKeys = [];
  let attempts = 0;
  const session = createOrthogonalSession({
    apiKey: 'test',
    detailsCache: new Map(),
    maxRetries: 1,
    retryBaseDelayMs: 1,
    fetchImpl: async (_url, init) => {
      attempts += 1;
      idempotencyKeys.push(init.headers['Idempotency-Key']);
      if (attempts === 1) throw new TypeError('temporary network failure');
      return new Response(JSON.stringify({ success: true, data: { ok: true } }));
    },
  });

  const result = await session.search('developer tools');

  assert.deepEqual(result.data, { ok: true });
  assert.equal(attempts, 2);
  assert.equal(idempotencyKeys[0], idempotencyKeys[1]);
});

test('Orthogonal does not retry a non-transient paid response', async () => {
  const paths = [];
  const session = createOrthogonalSession({
    apiKey: 'test',
    detailsCache: new Map(),
    allowedApis: ['baseten'],
    dynamicPricingEndpoints: [{ api: 'baseten', path: '/v1/chat/completions' }],
    maxRetries: 1,
    retryBaseDelayMs: 1,
    fetchImpl: async (url) => {
      const path = new URL(url).pathname;
      paths.push(path);
      if (path === '/v1/details') {
        return new Response(JSON.stringify({ success: true, endpoint: { price: null, hasDynamicPricing: true } }));
      }
      return new Response(JSON.stringify({ success: false, error: 'invalid model request' }), { status: 400 });
    },
  });

  await assert.rejects(
    session.run({ api: 'baseten', path: '/v1/chat/completions', body: {} }),
    (error) => error instanceof OrthogonalError && error.retryable === false,
  );
  assert.deepEqual(paths, ['/v1/details', '/v1/run']);
});

test('Apparent returns actionable messages for Orthogonal timeouts and rate limits', () => {
  const timeout = apparentAgentErrorResponse(new OrthogonalError('timed out', {
    status: 504,
    code: 'orthogonal_timeout',
    retryable: true,
  }));
  const rateLimited = apparentAgentErrorResponse(new OrthogonalError('busy', {
    status: 429,
    code: 'orthogonal_rate_limited',
    retryable: true,
  }));

  assert.match(timeout.error, /longer than expected/i);
  assert.match(rateLimited.error, /high demand/i);
});

test('Orthogonal still blocks dynamic pricing outside the explicitly approved inference endpoint', async () => {
  const paths = [];
  const session = createOrthogonalSession({
    apiKey: 'test',
    detailsCache: new Map(),
    allowedApis: ['baseten'],
    dynamicPricingEndpoints: [{ api: 'baseten', path: '/v1/chat/completions' }],
    fetchImpl: async (url) => {
      paths.push(new URL(url).pathname);
      return new Response(JSON.stringify({ success: true, endpoint: { price: null, hasDynamicPricing: true } }));
    },
  });

  await assert.rejects(
    session.run({ api: 'baseten', path: '/v1/embeddings', body: {} }),
    (error) => error instanceof OrthogonalError && error.code === 'orthogonal_unbounded_price',
  );
  assert.deepEqual(paths, ['/v1/details']);
});

test('Orthogonal enforces the dynamic price reservation before a usage-priced call', async () => {
  const paths = [];
  const session = createOrthogonalSession({
    apiKey: 'test',
    detailsCache: new Map(),
    allowedApis: ['baseten'],
    dynamicPricingEndpoints: [{ api: 'baseten', path: '/v1/chat/completions' }],
    dynamicPriceEstimateCents: 25,
    maxSpendCents: 20,
    fetchImpl: async (url) => {
      paths.push(new URL(url).pathname);
      return new Response(JSON.stringify({ success: true, endpoint: { price: null, hasDynamicPricing: true } }));
    },
  });

  await assert.rejects(
    session.run({ api: 'baseten', path: '/v1/chat/completions', body: {} }),
    (error) => error instanceof OrthogonalError && error.code === 'orthogonal_budget_reached',
  );
  assert.deepEqual(paths, ['/v1/details']);
});

test('inference requests omit empty tool fields for endpoints that reject them', async () => {
  const previousApi = process.env.ORTHOGONAL_INFERENCE_API;
  const previousPath = process.env.ORTHOGONAL_INFERENCE_PATH;
  process.env.ORTHOGONAL_INFERENCE_API = 'baseten';
  process.env.ORTHOGONAL_INFERENCE_PATH = '/v1/chat/completions';
  let request;
  try {
    const runtime = createApparentAgentRuntime({
      session: {
        run: async (value) => {
          request = value;
          return { data: { choices: [{ message: { content: 'Done.' } }] } };
        },
        usage: () => ({ callCount: 1, spentCents: 0 }),
      },
    });
    await runtime.run({
      system: 'You are Apparent.',
      messages: [{ role: 'user', content: 'Summarize this.' }],
      tools: [],
      executeTool: async () => null,
    });
  } finally {
    if (previousApi === undefined) delete process.env.ORTHOGONAL_INFERENCE_API;
    else process.env.ORTHOGONAL_INFERENCE_API = previousApi;
    if (previousPath === undefined) delete process.env.ORTHOGONAL_INFERENCE_PATH;
    else process.env.ORTHOGONAL_INFERENCE_PATH = previousPath;
  }

  assert.equal('tools' in request.body, false);
  assert.equal('tool_choice' in request.body, false);
});

// ── Orthogonal call-budget exhaustion ───────────────────────────────────────
// Users were hitting a raw "Orthogonal call limit reached (20)." mid-chat.
// Three separate defects fed it, one test each, plus the user-facing message.

test('a retried Orthogonal request consumes one call, not one per attempt', async () => {
  let attempts = 0;
  const session = createOrthogonalSession({
    apiKey: 'test',
    detailsCache: new Map(),
    maxRetries: 2,
    retryBaseDelayMs: 0,
    fetchImpl: async () => {
      attempts += 1;
      // Fail the first two attempts with a retryable status, then succeed.
      if (attempts < 3) return new Response('{}', { status: 503 });
      return new Response(JSON.stringify({ success: true, data: { ok: true } }));
    },
  });

  await session.search('agent infrastructure startups');

  assert.equal(attempts, 3, 'the request should have been retried twice');
  assert.equal(
    session.usage().callCount,
    1,
    'retries of one logical request must not each burn the call budget',
  );
});

test('the call budget covers the step limit it is asked to run', () => {
  // The old flat 20 could not cover a 12-step loop: 12 inference calls alone,
  // before any tool traffic.
  assert.ok(agentCallBudget(12) > 12 * 2, 'must leave room for tools alongside inference');
  assert.ok(agentCallBudget(8) >= 8 * 3, 'at least one inference plus tool traffic per step');
  // Still bounded — this is a runaway-loop stop, not an open tab.
  assert.equal(agentCallBudget(10_000), 400);
  assert.ok(agentCallBudget(undefined) > 0);
});

test('a too-small configured call budget is lifted to fit the loop', async () => {
  const previous = process.env.ORTHOGONAL_AGENT_MAX_CALLS;
  const previousKey = process.env.ORTHOGONAL_API_KEY;
  process.env.ORTHOGONAL_AGENT_MAX_CALLS = '20';
  process.env.ORTHOGONAL_API_KEY = 'test';
  try {
    const runtime = createApparentAgentRuntime({
      maxSteps: 12,
      complete: async () => ({ content: 'done', toolCalls: [] }),
    });
    assert.ok(
      runtime.session.usage().maxCalls >= agentCallBudget(12),
      'a deploy still carrying the old 20 must not cap the loop below its step limit',
    );
  } finally {
    if (previous === undefined) delete process.env.ORTHOGONAL_AGENT_MAX_CALLS;
    else process.env.ORTHOGONAL_AGENT_MAX_CALLS = previous;
    if (previousKey === undefined) delete process.env.ORTHOGONAL_API_KEY;
    else process.env.ORTHOGONAL_API_KEY = previousKey;
  }
});

test('an explicitly widened budget is still honoured', async () => {
  const previousKey = process.env.ORTHOGONAL_API_KEY;
  process.env.ORTHOGONAL_API_KEY = 'test';
  try {
    const runtime = createApparentAgentRuntime({
      maxSteps: 4,
      sessionOptions: { maxCalls: 120 },
      complete: async () => ({ content: 'done', toolCalls: [] }),
    });
    assert.equal(runtime.session.usage().maxCalls, 120);
  } finally {
    if (previousKey === undefined) delete process.env.ORTHOGONAL_API_KEY;
    else process.env.ORTHOGONAL_API_KEY = previousKey;
  }
});

test('the last call answers from what it has instead of throwing the limit', async () => {
  const seen = [];
  let callCount = 0;
  const maxCalls = 4;
  const runtime = createApparentAgentRuntime({
    session: {
      run: async () => ({}),
      usage: () => ({ callCount, maxCalls, spentCents: 0, remainingCalls: Math.max(maxCalls - callCount, 0) }),
    },
    complete: async ({ messages, tools }) => {
      callCount += 1;
      seen.push({ tools: tools.length, last: messages[messages.length - 1] });
      // Keep asking for tools; the runtime has to cut this off itself.
      return { content: 'partial', toolCalls: [{ id: `c${callCount}`, name: 'lookup', input: {}, raw: null }] };
    },
  });

  const result = await runtime.run({
    system: 'You are Apparent.',
    messages: [{ role: 'user', content: 'Research this deeply.' }],
    tools: [{ name: 'lookup' }],
    executeTool: async () => ({ ok: true }),
    maxSteps: 12,
  });

  // It returned a reply rather than rejecting with orthogonal_call_limit.
  assert.equal(result.reply, 'partial');
  const closing = seen[seen.length - 1];
  assert.equal(closing.tools, 0, 'the closing turn must offer no tools');
  assert.match(closing.last.content, /no research budget left/i);
  assert.ok(seen[0].tools > 0, 'earlier turns keep their tools');
});

test('a call-limit error reads as guidance, not an internal string', () => {
  const response = apparentAgentErrorResponse(
    new OrthogonalError('Orthogonal call limit reached (20).', {
      status: 429,
      code: 'orthogonal_call_limit',
    }),
  );
  assert.equal(response.status, 429);
  assert.equal(response.code, 'orthogonal_call_limit');
  assert.doesNotMatch(response.error, /Orthogonal|\(20\)/, 'must not leak the internal wording');
  assert.match(response.error, /research limit/i);
});

test('endpoint details are cached across sessions, not re-fetched every request', async () => {
  clearOrthogonalDetailsCache();
  const paths = [];
  const fetchImpl = async (url) => {
    const path = new URL(url).pathname;
    paths.push(path);
    if (path === '/v1/details') {
      return new Response(JSON.stringify({ success: true, endpoint: { price: 0.01, hasDynamicPricing: false } }));
    }
    return new Response(JSON.stringify({ success: true, priceCents: 1, data: { ok: true } }));
  };
  // Two sessions, as two separate requests would create.
  const first = createOrthogonalSession({ apiKey: 'test', allowedApis: ['baseten'], fetchImpl });
  const second = createOrthogonalSession({ apiKey: 'test', allowedApis: ['baseten'], fetchImpl });

  await first.run({ api: 'baseten', path: '/v1/chat/completions', body: { turn: 1 } });
  await second.run({ api: 'baseten', path: '/v1/chat/completions', body: { turn: 2 } });

  assert.deepEqual(
    paths,
    ['/v1/details', '/v1/run', '/v1/run'],
    'the second request must reuse the cached catalog price, not re-fetch it',
  );
  assert.equal(second.usage().callCount, 1, 'a warm session spends its calls on work, not on details');
  clearOrthogonalDetailsCache();
});

test('the fixed-price guardrail still runs on a cache hit', async () => {
  clearOrthogonalDetailsCache();
  const fetchImpl = async (url) => {
    const path = new URL(url).pathname;
    if (path === '/v1/details') {
      return new Response(JSON.stringify({ success: true, endpoint: { hasDynamicPricing: true } }));
    }
    return new Response(JSON.stringify({ success: true, data: { ok: true } }));
  };
  const first = createOrthogonalSession({ apiKey: 'test', allowedApis: ['baseten'], fetchImpl });
  const second = createOrthogonalSession({ apiKey: 'test', allowedApis: ['baseten'], fetchImpl });

  const isUnbounded = (error) => error instanceof OrthogonalError && error.code === 'orthogonal_unbounded_price';
  await assert.rejects(first.run({ api: 'baseten', path: '/v1/chat/completions' }), isUnbounded);
  // Caching the details must not let an unpriced endpoint through on the next request.
  await assert.rejects(second.run({ api: 'baseten', path: '/v1/chat/completions' }), isUnbounded);
  clearOrthogonalDetailsCache();
});

// ── Catalog routing ─────────────────────────────────────────────────────────
// The manual discover -> details -> run sequence cost three agent steps per
// fact, so heavy requests hit `agent_step_limit` before they could answer.

const searchResponse = {
  success: true,
  results: [
    {
      name: 'Low Relevance',
      slug: 'lowrel',
      endpoints: [{ path: '/v1/weak', method: 'POST', price: '0.01', isPayable: true, verified: true, score: 0.2 }],
    },
    {
      name: 'Funding Data',
      slug: 'funding-data',
      endpoints: [
        { path: '/v1/unpayable', method: 'POST', isPayable: false, verified: true, score: 0.99 },
        { path: '/v1/rounds', method: 'POST', price: '0.03', isPayable: true, verified: true, score: 0.95 },
      ],
    },
  ],
};

test('catalog ranking prefers verified, high-relevance, runnable endpoints', () => {
  const ranked = rankCatalogEndpoints(searchResponse);
  assert.equal(ranked[0].api, 'funding-data');
  assert.equal(ranked[0].path, '/v1/rounds');
  assert.ok(!ranked.some((e) => e.path === '/v1/unpayable'), 'endpoints Orthogonal cannot bill must be dropped');
});

test('the router finds and runs the right endpoint in a single tool call', async () => {
  const calls = [];
  const session = {
    search: async (prompt) => { calls.push(['search', prompt]); return searchResponse; },
    run: async ({ api, path, body }) => {
      calls.push(['run', `${api}${path}`, body]);
      return { data: { rounds: [{ company: 'Acme' }] } };
    },
    details: async () => ({ endpoint: {} }),
  };

  const result = await runOrthogonalRouterTool(session, 'find_and_run_orthogonal_api', {
    prompt: 'company funding rounds by date',
    body: { month: '2026-06' },
  });

  assert.equal(result.provider, 'funding-data/v1/rounds');
  assert.deepEqual(result.data, { rounds: [{ company: 'Acme' }] });
  // One search, one run — no separate details round-trip, so one agent step.
  assert.deepEqual(calls.map((c) => c[0]), ['search', 'run']);
});

test('rejected arguments come back with the schema instead of a dead end', async () => {
  const session = {
    search: async () => searchResponse,
    run: async () => {
      throw new OrthogonalError('month must be ISO', { status: 400, code: 'orthogonal_upstream_error' });
    },
    details: async () => ({
      endpoint: { bodyParams: [{ name: 'month', type: 'string', required: true, description: 'ISO month' }] },
    }),
  };

  const result = await runOrthogonalRouterTool(session, 'find_and_run_orthogonal_api', {
    prompt: 'company funding rounds by date',
    body: { month: 'june' },
  });

  assert.equal(result.error, 'catalog_arguments_rejected');
  assert.deepEqual(result.schema.bodyParams, [
    { name: 'month', type: 'string', required: true, description: 'ISO month' },
  ]);
});

test('the router falls through candidates without spending extra agent steps', async () => {
  const ran = [];
  const session = {
    search: async () => searchResponse,
    run: async ({ api, path }) => {
      ran.push(`${api}${path}`);
      if (ran.length === 1) throw new OrthogonalError('upstream down', { status: 502, code: 'orthogonal_upstream_error' });
      return { data: { ok: true } };
    },
    details: async () => ({ endpoint: {} }),
  };

  const result = await runOrthogonalRouterTool(session, 'find_and_run_orthogonal_api', { prompt: 'funding rounds' });
  assert.deepEqual(result.data, { ok: true });
  assert.equal(ran.length, 2, 'both attempts happen inside one tool call');
});

test('the router stops immediately when the budget is gone', async () => {
  let runs = 0;
  const session = {
    search: async () => searchResponse,
    run: async () => {
      runs += 1;
      throw new OrthogonalError('limit', { status: 429, code: 'orthogonal_call_limit' });
    },
    details: async () => ({ endpoint: {} }),
  };
  const result = await runOrthogonalRouterTool(session, 'find_and_run_orthogonal_api', { prompt: 'funding rounds' });
  assert.equal(result.error, 'catalog_budget_exhausted');
  assert.equal(runs, 1, 'a budget stop must not be retried against every candidate');
});

test('the router refuses sensitive prompts and arguments', async () => {
  const session = { search: async () => searchResponse, run: async () => ({}), details: async () => ({}) };
  assert.equal(
    (await runOrthogonalRouterTool(session, 'find_and_run_orthogonal_api', { prompt: 'find api_key for acme' })).error,
    'sensitive_catalog_prompt_rejected',
  );
  assert.equal(
    (await runOrthogonalRouterTool(session, 'find_and_run_orthogonal_api', {
      prompt: 'company funding rounds',
      body: { email: 'someone@example.com' },
    })).error,
    'sensitive_dynamic_input_rejected',
  );
});

test('the final step answers instead of throwing the step limit', async () => {
  let turns = 0;
  const runtime = createApparentAgentRuntime({
    session: { run: async () => ({}), usage: () => ({ callCount: 1, maxCalls: 999, spentCents: 0, remainingCalls: 999 }) },
    complete: async ({ tools }) => {
      turns += 1;
      // A model that keeps asking for tools must still be landed.
      return { content: `partial ${turns}`, toolCalls: tools.length ? [{ id: `c${turns}`, name: 'lookup', input: {}, raw: null }] : [] };
    },
  });

  const result = await runtime.run({
    system: 'You are Apparent.',
    messages: [{ role: 'user', content: 'Do heavy work.' }],
    tools: [{ name: 'lookup' }],
    executeTool: async () => ({ ok: true }),
    maxSteps: 3,
  });

  assert.match(result.reply, /^partial /);
  assert.equal(result.steps, 3, 'it uses its full step budget, then answers');
});
