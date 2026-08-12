import { createRemoteJWKSet, jwtVerify } from 'jose';

const SUPABASE_URL = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
export const normalizeKindeIssuer = (value) => {
  const domain = String(value || '').trim().replace(/\/+$/, '');
  if (!domain) return '';
  return /^https?:\/\//i.test(domain) ? domain : `https://${domain}`;
};

const KINDE_DOMAIN = normalizeKindeIssuer(process.env.KINDE_DOMAIN || process.env.VITE_KINDE_DOMAIN);
const KINDE_AUDIENCE = process.env.KINDE_AUDIENCE || process.env.VITE_KINDE_AUDIENCE || '';

const DEFAULT_WINDOW_MS = 15 * 60 * 1000;
const DEFAULT_USER_LIMIT = 20;
const DEFAULT_IP_LIMIT = 80;
const DEFAULT_MAX_BODY_BYTES = 220_000;

const numEnv = (name, fallback) => {
  const parsed = Number(process.env[name]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const RATE_WINDOW_MS = numEnv('AGENT_RATE_LIMIT_WINDOW_MS', DEFAULT_WINDOW_MS);
const USER_LIMIT = numEnv('AGENT_RATE_LIMIT_USER_MAX', DEFAULT_USER_LIMIT);
const IP_LIMIT = numEnv('AGENT_RATE_LIMIT_IP_MAX', DEFAULT_IP_LIMIT);
const MAX_BODY_BYTES = numEnv('AGENT_MAX_BODY_BYTES', DEFAULT_MAX_BODY_BYTES);
const REQUIRE_PERSISTENT_LIMITER = process.env.VERCEL === '1'
  || process.env.NODE_ENV === 'production'
  || process.env.AGENT_REQUIRE_PERSISTENT_RATE_LIMIT === 'true';

const state = globalThis.__apparentAgentRateLimits || new Map();
globalThis.__apparentAgentRateLimits = state;

let kindeJwks;

const getBearerToken = (req) => {
  const header = String(req.headers.authorization || req.headers.Authorization || '');
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || '';
};

const getIp = (req) => {
  const forwarded = String(req.headers['x-forwarded-for'] || '');
  return forwarded.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
};

const checkBodySize = (req) => {
  const length = Number(req.headers['content-length'] || 0);
  if (Number.isFinite(length) && length > MAX_BODY_BYTES) {
    return { ok: false, status: 413, error: 'Agent request is too large.' };
  }
  return { ok: true };
};

const checkRateLimit = (key, max) => {
  const now = Date.now();
  const current = state.get(key);
  if (!current || current.resetAt <= now) {
    state.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return { ok: true };
  }

  if (current.count >= max) {
    return {
      ok: false,
      status: 429,
      error: 'Agent rate limit reached. Please try again shortly.',
      retryAfter: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }

  current.count += 1;
  return { ok: true };
};

const checkPersistentRateLimit = async (key, max) => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;

  const headers = {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
  };

  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/consume_agent_rate_limit`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ bucket_key: key, window_ms: RATE_WINDOW_MS, max_count: max }),
  });
  if (!res.ok) return null;

  const data = await res.json().catch(() => null);
  const result = Array.isArray(data) ? data[0] : data;
  if (!result) return null;

  if (!result.allowed) {
    return {
      ok: false,
      status: 429,
      error: 'Agent rate limit reached. Please try again shortly.',
      retryAfter: Math.max(1, Number(result.retry_after || 60)),
    };
  }

  return { ok: true };
};

const enforceRateLimit = async (key, max) => {
  try {
    const persistent = await checkPersistentRateLimit(key, max);
    if (persistent) return persistent;
  } catch {
    /* handled below */
  }
  if (REQUIRE_PERSISTENT_LIMITER) {
    return {
      ok: false,
      status: 503,
      error: 'The Agent safety service is temporarily unavailable. Please retry shortly.',
      retryAfter: 15,
    };
  }
  return checkRateLimit(key, max);
};

const invalidSession = () => ({
  ok: false,
  status: 401,
  error: 'Your session expired. Sign in again to use the agent.',
});

const getKindeJwks = () => {
  if (!kindeJwks) kindeJwks = createRemoteJWKSet(new URL(`${KINDE_DOMAIN}/.well-known/jwks`));
  return kindeJwks;
};

const roleFromKindeClaims = (payload) => {
  const explicit = String(payload.apparent_role || '').trim().toLowerCase();
  if (explicit === 'founder' || explicit === 'investor') return explicit;

  const values = Array.isArray(payload.roles) ? payload.roles : [];
  const roles = new Set(values.flatMap((value) => {
    if (typeof value === 'string') return [value.toLowerCase()];
    if (!value || typeof value !== 'object') return [];
    return [value.key, value.name, value.id]
      .filter((entry) => typeof entry === 'string')
      .map((entry) => entry.toLowerCase());
  }));
  const isFounder = roles.has('founder') || roles.has('apparent-founder');
  const isInvestor = roles.has('investor') || roles.has('apparent-investor');
  if (isFounder === isInvestor) return '';
  return isFounder ? 'founder' : 'investor';
};

const verifyKindeToken = async (token) => {
  if (!KINDE_DOMAIN || !KINDE_AUDIENCE) return null;

  try {
    const { payload } = await jwtVerify(token, getKindeJwks(), {
      issuer: KINDE_DOMAIN,
      audience: KINDE_AUDIENCE,
      algorithms: ['RS256'],
    });
    const subject = String(payload.sub || '').trim();
    if (!subject) return null;
    return {
      ok: true,
      provider: 'kinde',
      providerUserId: subject,
      userId: `kinde:${subject}`,
      email: String(payload.email || '').trim().slice(0, 320),
      role: roleFromKindeClaims(payload),
    };
  } catch {
    return null;
  }
};

const verifySupabaseToken = async (token) => {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return { ok: false, status: 503, error: 'Agent auth is not configured.' };
  }

  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) return invalidSession();
  const user = await res.json().catch(() => null);
  const id = String(user?.id || '');
  if (!id) return invalidSession();
  return { ok: true, provider: 'supabase', userId: id };
};

const verifyAgentToken = async (token) => {
  if (!token) return { ok: false, status: 401, error: 'Sign in to use the agent.' };

  const kindeIdentity = await verifyKindeToken(token);
  if (kindeIdentity) return kindeIdentity;

  if (SUPABASE_URL && SUPABASE_ANON_KEY) return verifySupabaseToken(token);
  return invalidSession();
};

const readProfileRole = async (userId, token) => {
  const params = new URLSearchParams({
    id: `eq.${userId}`,
    select: 'role',
    limit: '1',
  });
  const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?${params.toString()}`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) return '';
  const rows = await res.json().catch(() => []);
  return String(rows?.[0]?.role || '');
};

const kindeIdentityHeaders = () => ({
  apikey: SUPABASE_SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
  'Content-Type': 'application/json',
});

export const readKindeBoundRole = async (providerUserId) => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !providerUserId) return '';
  const params = new URLSearchParams({
    kinde_user_id: `eq.${providerUserId}`,
    select: 'role',
    limit: '1',
  });
  const res = await fetch(`${SUPABASE_URL}/rest/v1/kinde_identities?${params.toString()}`, {
    headers: kindeIdentityHeaders(),
  });
  if (!res.ok) return '';
  const rows = await res.json().catch(() => []);
  const role = String(rows?.[0]?.role || '');
  return role === 'founder' || role === 'investor' ? role : '';
};

export const bindKindeRole = async (identity, requestedRole) => {
  if (identity?.role) return identity.role;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !identity?.providerUserId) return '';

  const existing = await readKindeBoundRole(identity.providerUserId);
  if (existing) return existing;
  if (requestedRole !== 'founder' && requestedRole !== 'investor') return '';

  const params = new URLSearchParams({ on_conflict: 'kinde_user_id' });
  await fetch(`${SUPABASE_URL}/rest/v1/kinde_identities?${params.toString()}`, {
    method: 'POST',
    headers: {
      ...kindeIdentityHeaders(),
      Prefer: 'resolution=ignore-duplicates,return=minimal',
    },
    body: JSON.stringify({
      kinde_user_id: identity.providerUserId,
      role: requestedRole,
      email: identity.email || null,
    }),
  });

  return readKindeBoundRole(identity.providerUserId);
};

export const verifyKindeRequest = async (req) => {
  const token = getBearerToken(req);
  if (!token) return { ok: false, status: 401, error: 'Sign in to continue.' };
  const identity = await verifyKindeToken(token);
  return identity || invalidSession();
};

export const requireAgentAccess = async (req, expectedRole, endpoint, { rateLimit = true } = {}) => {
  const size = checkBodySize(req);
  if (!size.ok) return size;

  const ip = getIp(req);
  if (rateLimit) {
    const ipLimit = await enforceRateLimit(`ip:${endpoint}:${ip}`, IP_LIMIT);
    if (!ipLimit.ok) return ipLimit;
  }

  const token = getBearerToken(req);
  const verified = await verifyAgentToken(token);
  if (!verified.ok) return verified;

  const role = verified.provider === 'kinde'
    ? (verified.role || await readKindeBoundRole(verified.providerUserId))
    : await readProfileRole(verified.userId, token);
  if (expectedRole && role && role !== expectedRole) {
    return { ok: false, status: 403, error: `Use the ${role} agent for this account.` };
  }
  if (expectedRole && !role) {
    return verified.provider === 'kinde'
      ? { ok: false, status: 403, error: 'Your Apparent account role setup is incomplete.' }
      : { ok: false, status: 403, error: 'Your profile is not ready for agent access yet.' };
  }

  if (rateLimit) {
    const userLimit = await enforceRateLimit(`user:${endpoint}:${verified.userId}`, USER_LIMIT);
    if (!userLimit.ok) return userLimit;
  }

  return { ok: true, userId: verified.userId, role, ip };
};

export const sendAgentAccessError = (res, access) => {
  if (access.retryAfter) res.setHeader('Retry-After', String(access.retryAfter));
  return res.status(access.status || 403).json({ error: access.error || 'Agent access denied.' });
};
