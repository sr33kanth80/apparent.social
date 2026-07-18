import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import test, { after, before } from 'node:test';

import { exportJWK, generateKeyPair, SignJWT } from 'jose';

let baseUrl;
let bindKindeRole;
const kindeRoleBindings = new Map();
let kindeProfileHandler;
let privateKey;
let normalizeKindeIssuer;
let requireAgentAccess;
let server;
const nativeFetch = globalThis.fetch;

before(async () => {
  const keys = await generateKeyPair('RS256');
  privateKey = keys.privateKey;
  const publicJwk = await exportJWK(keys.publicKey);
  publicJwk.kid = 'agent-auth-test';
  publicJwk.use = 'sig';

  server = createServer((req, res) => {
    if (req.url === '/.well-known/jwks') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ keys: [publicJwk] }));
      return;
    }
    res.writeHead(404).end();
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;

  process.env.KINDE_DOMAIN = baseUrl;
  process.env.KINDE_AUDIENCE = 'apparent-agent-api';
  process.env.SUPABASE_URL = 'https://supabase.test';
  process.env.SUPABASE_ANON_KEY = 'anon-test';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-test';

  globalThis.fetch = async (url, options = {}) => {
    const href = String(url);
    if (href.startsWith(baseUrl)) return nativeFetch(url, options);
    if (href.includes('/rest/v1/rpc/consume_agent_rate_limit')) return new Response('{}', { status: 404 });
    if (href.includes('/rest/v1/kinde_identities')) {
      if (options.method === 'POST') {
        const row = JSON.parse(String(options.body || '{}'));
        if (!kindeRoleBindings.has(row.kinde_user_id)) kindeRoleBindings.set(row.kinde_user_id, row.role);
        return new Response('', { status: 201 });
      }
      const id = new URL(href).searchParams.get('kinde_user_id')?.replace(/^eq\./, '');
      const role = id ? kindeRoleBindings.get(id) : '';
      return Response.json(role ? [{ role }] : []);
    }
    if (href.includes('/auth/v1/user')) return new Response('{}', { status: 401 });
    throw new Error(`Unexpected fetch in agent guard test: ${href}`);
  };

  ({ bindKindeRole, normalizeKindeIssuer, requireAgentAccess } = await import(`./_agent-guard.js?test=${Date.now()}`));
  ({ default: kindeProfileHandler } = await import(`./kinde-profile.js?test=${Date.now()}`));
});

after(async () => {
  globalThis.fetch = nativeFetch;
  if (server) await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
});

const signKindeAccessToken = ({
  subject = 'kp_user_123',
  audience = 'apparent-agent-api',
  roles = [{ id: 'role_investor', key: 'investor', name: 'Investor' }],
} = {}) =>
  new SignJWT({ email: 'founder@example.com', roles })
    .setProtectedHeader({ alg: 'RS256', kid: 'agent-auth-test' })
    .setIssuer(baseUrl)
    .setAudience(audience)
    .setSubject(subject)
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(privateKey);

const requestWith = (token = '') => ({
  headers: token ? { authorization: `Bearer ${token}`, 'x-forwarded-for': '203.0.113.10' } : {},
  socket: { remoteAddress: '203.0.113.10' },
});

const responseRecorder = () => {
  const result = { statusCode: 200, body: null };
  return {
    result,
    setHeader() {},
    status(statusCode) {
      result.statusCode = statusCode;
      return this;
    },
    json(body) {
      result.body = body;
      return this;
    },
  };
};

test('bare Kinde domains are normalized to an HTTPS issuer', () => {
  assert.equal(normalizeKindeIssuer('tenant.kinde.com/'), 'https://tenant.kinde.com');
  assert.equal(normalizeKindeIssuer(baseUrl), baseUrl);
});

test('a valid Kinde access token is verified with its signed Apparent role', async () => {
  const token = await signKindeAccessToken();
  const access = await requireAgentAccess(requestWith(token), 'investor', 'investor-agent');

  assert.equal(access.ok, true);
  assert.equal(access.userId, 'kinde:kp_user_123');
  assert.equal(access.role, 'investor');
});

test('a Kinde identity cannot use an agent outside its signed role', async () => {
  const token = await signKindeAccessToken();
  const access = await requireAgentAccess(requestWith(token), 'founder', 'founder-agent');

  assert.equal(access.ok, false);
  assert.equal(access.status, 403);
  assert.equal(access.error, 'Use the investor agent for this account.');
});

test('a Kinde token issued for another client is rejected', async () => {
  const token = await signKindeAccessToken({ subject: 'wrong_audience', audience: 'another-client' });
  const access = await requireAgentAccess(requestWith(token), 'founder', 'founder-agent');

  assert.equal(access.ok, false);
  assert.equal(access.status, 401);
});

test('a Kinde token without exactly one Apparent role is denied', async () => {
  const token = await signKindeAccessToken({ subject: 'missing_role', roles: [] });
  const access = await requireAgentAccess(requestWith(token), 'founder', 'founder-agent');

  assert.equal(access.ok, false);
  assert.equal(access.status, 403);
  assert.equal(access.error, 'Your Apparent account role setup is incomplete.');
});

test('a self-service role is bound once and cannot be switched later', async () => {
  const identity = {
    providerUserId: 'kp_self_service',
    email: 'self-service@example.com',
    role: '',
  };

  assert.equal(await bindKindeRole(identity, 'founder'), 'founder');
  assert.equal(await bindKindeRole(identity, 'investor'), 'founder');
  assert.equal(await bindKindeRole(identity), 'founder');
});

test('the Kinde profile endpoint provisions a verified self-service signup', async () => {
  const token = await signKindeAccessToken({ subject: 'kp_endpoint_signup', roles: [] });
  const req = { ...requestWith(token), method: 'POST', body: { role: 'investor' } };
  const res = responseRecorder();

  await kindeProfileHandler(req, res);

  assert.equal(res.result.statusCode, 200);
  assert.deepEqual(res.result.body, { role: 'investor' });
});

test('requests without a session remain blocked before agent execution', async () => {
  const access = await requireAgentAccess(requestWith(), 'founder', 'founder-agent');

  assert.equal(access.ok, false);
  assert.equal(access.status, 401);
  assert.equal(access.error, 'Sign in to use the agent.');
});
