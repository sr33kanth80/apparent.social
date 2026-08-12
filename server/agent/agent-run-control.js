const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const positiveInt = (value, fallback) => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const GLOBAL_CONCURRENCY = positiveInt(process.env.AGENT_GLOBAL_CONCURRENCY_MAX, 8);
const USER_CONCURRENCY = positiveInt(process.env.AGENT_USER_CONCURRENCY_MAX, 1);
const LEASE_SECONDS = positiveInt(process.env.AGENT_RUN_LEASE_SECONDS, 285);
const RESERVED_SPEND_CENTS = positiveInt(process.env.ORTHOGONAL_AGENT_MAX_SPEND_CENTS, 100);
const USER_DAILY_SPEND_CENTS = positiveInt(process.env.AGENT_USER_DAILY_SPEND_CENTS, 500);
const GLOBAL_DAILY_SPEND_CENTS = positiveInt(process.env.AGENT_GLOBAL_DAILY_SPEND_CENTS, 10_000);
const REQUIRE_DISTRIBUTED = process.env.VERCEL === '1'
  || process.env.NODE_ENV === 'production'
  || process.env.AGENT_REQUIRE_DISTRIBUTED_CONTROL === 'true';

const localRuns = globalThis.__apparentAgentRuns || new Map();
globalThis.__apparentAgentRuns = localRuns;

/** Test/dev seam; production state lives in Supabase and is unaffected. */
export const clearLocalAgentRuns = () => localRuns.clear();

const headers = () => ({
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
});

const firstRow = (value) => Array.isArray(value) ? value[0] : value;

export class AgentRunControlError extends Error {
  constructor(message, { status = 503, code = 'agent_run_control_unavailable', retryAfter = 15 } = {}) {
    super(message);
    this.name = 'AgentRunControlError';
    this.status = status;
    this.code = code;
    this.retryAfter = retryAfter;
  }
}

const rpc = async (name, body) => {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    throw new AgentRunControlError('Distributed Agent run control is not configured.');
  }
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new AgentRunControlError('Distributed Agent run control is unavailable.', {
      code: 'agent_run_control_unavailable',
    });
  }
  return response.json().catch(() => null);
};

const cleanLocalRuns = () => {
  const now = Date.now();
  for (const [key, run] of localRuns) {
    if (run.status === 'running' && run.expiresAt <= now) {
      localRuns.set(key, { ...run, status: 'expired', errorCode: 'agent_run_lease_expired' });
    }
  }
};

const beginLocal = ({ requestKey, userKey, role, endpoint }) => {
  cleanLocalRuns();
  const existing = localRuns.get(requestKey);
  if (existing) {
    if (existing.userKey !== userKey || existing.role !== role) return { action: 'conflict', errorCode: 'agent_run_key_conflict' };
    return {
      action: existing.status,
      runId: requestKey,
      responsePayload: existing.responsePayload ?? null,
      errorCode: existing.errorCode ?? null,
      retryAfter: existing.status === 'running' ? 15 : 0,
    };
  }
  const active = [...localRuns.values()].filter((run) => run.status === 'running');
  if (active.some((run) => run.userKey === userKey)) return { action: 'user_busy', retryAfter: 15, errorCode: 'agent_user_concurrency' };
  if (active.length >= GLOBAL_CONCURRENCY) return { action: 'global_busy', retryAfter: 20, errorCode: 'agent_global_concurrency' };
  localRuns.set(requestKey, {
    id: requestKey,
    requestKey,
    userKey,
    role,
    endpoint,
    status: 'running',
    expiresAt: Date.now() + LEASE_SECONDS * 1000,
  });
  return { action: 'started', runId: requestKey, retryAfter: 0 };
};

export const beginAgentRun = async ({ requestKey, userKey, role, endpoint, reservedSpendCents = RESERVED_SPEND_CENTS }) => {
  if (!requestKey || !userKey) throw new AgentRunControlError('An idempotency key is required.', { status: 400, code: 'agent_request_key_required' });
  if ((!SUPABASE_URL || !SERVICE_KEY) && !REQUIRE_DISTRIBUTED) return beginLocal({ requestKey, userKey, role, endpoint });

  try {
    const result = firstRow(await rpc('begin_agent_run', {
      p_request_key: requestKey,
      p_user_key: userKey,
      p_role: role,
      p_endpoint: endpoint,
      p_global_limit: GLOBAL_CONCURRENCY,
      p_user_limit: USER_CONCURRENCY,
      p_lease_seconds: LEASE_SECONDS,
      p_reserved_spend_cents: Math.max(Number(reservedSpendCents) || RESERVED_SPEND_CENTS, 0),
      p_daily_user_spend_cents: USER_DAILY_SPEND_CENTS,
      p_daily_global_spend_cents: GLOBAL_DAILY_SPEND_CENTS,
    }));
    if (!result?.action) throw new AgentRunControlError('Distributed Agent run control returned an invalid response.');
    return {
      action: result.action,
      runId: result.run_id,
      retryAfter: Number(result.retry_after || 0),
      responsePayload: result.response_payload ?? null,
      errorCode: result.error_code ?? null,
    };
  } catch (error) {
    if (!REQUIRE_DISTRIBUTED) return beginLocal({ requestKey, userKey, role, endpoint });
    throw error;
  }
};

export const finishAgentRun = async ({ runId, requestKey, userKey, status, usage = {}, durationMs, errorCode, responsePayload }) => {
  if (!runId || !userKey) return false;
  if ((!SUPABASE_URL || !SERVICE_KEY) && !REQUIRE_DISTRIBUTED) {
    const key = requestKey || runId;
    const existing = localRuns.get(key);
    if (!existing || existing.userKey !== userKey || existing.status !== 'running') return false;
    localRuns.set(key, { ...existing, status, usage, durationMs, errorCode, responsePayload });
    return true;
  }
  try {
    return Boolean(await rpc('finish_agent_run', {
      p_run_id: runId,
      p_user_key: userKey,
      p_status: status,
      p_call_count: Math.max(Number(usage.callCount) || 0, 0),
      p_spend_cents: Math.max(Number(usage.spentCents) || 0, 0),
      p_duration_ms: Math.max(Number(durationMs) || 0, 0),
      p_error_code: errorCode || null,
      p_response_payload: responsePayload || null,
    }));
  } catch (error) {
    if (REQUIRE_DISTRIBUTED) console.error('[agent-run-control] failed to finish run', { code: error?.code || 'agent_run_finish_failed' });
    return false;
  }
};

export const getAgentRun = async ({ requestKey, userKey }) => {
  if ((!SUPABASE_URL || !SERVICE_KEY) && !REQUIRE_DISTRIBUTED) {
    cleanLocalRuns();
    const run = localRuns.get(requestKey);
    if (!run || run.userKey !== userKey) return null;
    return {
      status: run.status,
      responsePayload: run.status === 'completed' ? run.responsePayload ?? null : null,
      errorCode: run.errorCode ?? null,
      retryAfter: run.status === 'running' ? 15 : 0,
    };
  }
  const result = firstRow(await rpc('get_agent_run', { p_request_key: requestKey, p_user_key: userKey }));
  if (!result) return null;
  return {
    status: result.status,
    responsePayload: result.response_payload ?? null,
    errorCode: result.error_code ?? null,
    retryAfter: Number(result.retry_after || 0),
  };
};

export const agentRunControlConfig = Object.freeze({
  globalConcurrency: GLOBAL_CONCURRENCY,
  userConcurrency: USER_CONCURRENCY,
  leaseSeconds: LEASE_SECONDS,
  userDailySpendCents: USER_DAILY_SPEND_CENTS,
  globalDailySpendCents: GLOBAL_DAILY_SPEND_CENTS,
});
