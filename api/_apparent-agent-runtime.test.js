import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createApparentAgentRuntime,
  createPublicResearchPolicy,
  isAuthorizedResearchUrl,
  runStandardOrthogonalTool,
} from './_apparent-agent-runtime.js';
import { createOrthogonalSession, OrthogonalError } from './_orthogonal.js';

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
