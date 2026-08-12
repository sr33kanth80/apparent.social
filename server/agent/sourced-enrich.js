// Sourced-startup deep dive — on-demand agent enrichment (Phase 2).
//
// An investor opens a /sourced/:id profile and clicks "Generate deep dive".
// This runs the Apparent runtime with Orthogonal search/fetch to research that company and
// produce a structured, investor-facing dossier (summary, team, traction,
// thesis fit, sources), then caches it onto the source_signals row so every
// later view is instant and free. On-demand by design: we only spend credits on
// startups an investor actually opens.
//
// Auth: caller must present a signed-in token (Authorization: Bearer <jwt>),
// verified by the shared Kinde-or-Supabase guard the chat agents use. Any
// signed-in user can trigger — the token is the guard against anonymous
// credit-burning, and requireAgentAccess rate-limits by IP and user on top.
// ponytail: not role-gated; tighten to investors-only if abuse shows up.
//
// Request:  POST { signalId: string, force?: boolean }
// Response: { ok, dossier, cached } | { ok:false, error }
//
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, VITE_SUPABASE_ANON_KEY (auth),
// ORTHOGONAL_API_KEY.

import { createClient } from '@supabase/supabase-js';
import { requireAgentAccess, sendAgentAccessError } from './agent-guard.js';
import { beginAgentRun, finishAgentRun } from './agent-run-control.js';
import {
  createApparentAgentRuntime,
  createPublicResearchPolicy,
  isAuthorizedResearchUrl,
  runStandardOrthogonalTool,
  standardOrthogonalTools,
} from './apparent-agent-runtime.js';

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

// Sourced facts change slowly — a long cache keeps the bill down. force bypasses.
const CACHE_TTL_MS = 14 * 24 * 60 * 60 * 1000;
const FORCE_COOLDOWN_MS = 15 * 60 * 1000;
const MAX_AGENT_STEPS = 10;
const SAFE_RUNTIME_MS = Math.min(Math.max(Number(process.env.AGENT_SAFE_RUNTIME_MS) || 240_000, 60_000), 270_000);

const str = (v) => (v == null ? '' : String(v));

const readJsonBody = async (req) => {
  if (req.body && typeof req.body === 'object') return req.body;
  let raw = '';
  for await (const chunk of req) raw += chunk;
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const TOOLS = [
  ...standardOrthogonalTools,
  {
    name: 'record_dossier',
    description:
      'Record the finished investor dossier for the company. Call ONCE, after researching via web_search/web_fetch. Ground every field only in what you actually read — never invent people, numbers, or URLs. Leave arrays empty rather than guessing.',
    input_schema: {
      type: 'object',
      properties: {
        summary: { type: 'string', description: '2-4 sentences: what they build, the wedge, and the single strongest real signal an investor should know.' },
        what_they_build: { type: 'string', description: 'A concrete paragraph on the product and who it is for.' },
        team: {
          type: 'array',
          description: 'Known founders/team with a short note each. Empty if you could not verify anyone real.',
          items: {
            type: 'object',
            properties: { name: { type: 'string' }, role: { type: 'string' }, note: { type: 'string' } },
            required: ['name'],
          },
        },
        traction: {
          type: 'array',
          description: 'Concrete momentum signals you verified (launch, customers, funding, growth, notable users). Empty if none found.',
          items: { type: 'string' },
        },
        thesis_fit: { type: 'string', description: 'Balanced: why a venture investor might lean in, and the main risk or unknown. Not hype.' },
        sources: {
          type: 'array',
          description: 'The real pages you used, so the investor can verify.',
          items: {
            type: 'object',
            properties: { label: { type: 'string' }, url: { type: 'string' } },
            required: ['url'],
          },
        },
      },
      required: ['summary'],
    },
  },
];

const buildSystemPrompt = (seed) =>
  [
    "You are Apparent's research analyst building a deep-dive dossier on ONE startup for a venture investor.",
    '',
    'The startup (an agent-sourced lead, not yet verified):',
    `  Company: ${seed.company}`,
    seed.homepage ? `  Homepage: ${seed.homepage}` : '',
    seed.detail ? `  What we know so far: ${seed.detail}` : '',
    seed.stage ? `  Stage (rough): ${seed.stage}` : '',
    seed.location ? `  Location: ${seed.location}` : '',
    seed.githubUrl ? `  GitHub: ${seed.githubUrl}` : '',
    '',
    'How to work:',
    '- Use fetch_public_url on the homepage first to ground yourself in what they actually do.',
    '- Use search_public_web to find the founders, any funding/launch coverage, customers, and real traction.',
    '- Then call record_dossier ONCE with what you verified.',
    '',
    'Hard rules:',
    '- NEVER fabricate a person, metric, customer, or URL. If you cannot verify something, leave it out.',
    '- Be specific and grounded. If the signal is thin, say so in thesis_fit rather than padding.',
    '- This is a lead, not vetted dealflow — keep claims honest and sourced.',
  ]
    .filter(Boolean)
    .join('\n');

const normalizeDossier = (input) => ({
  summary: str(input.summary).trim(),
  whatTheyBuild: str(input.what_they_build).trim(),
  team: Array.isArray(input.team)
    ? input.team
        .map((m) => ({ name: str(m?.name).trim(), role: str(m?.role).trim(), note: str(m?.note).trim() }))
        .filter((m) => m.name)
    : [],
  traction: Array.isArray(input.traction) ? input.traction.map((t) => str(t).trim()).filter(Boolean) : [],
  thesisFit: str(input.thesis_fit).trim(),
  sources: Array.isArray(input.sources)
    ? input.sources
        .map((s) => ({ label: str(s?.label).trim(), url: str(s?.url).trim() }))
        .filter((s) => /^https?:\/\//i.test(s.url))
    : [],
  generatedAt: new Date().toISOString(),
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }
  if (!SUPABASE_URL || !SERVICE_KEY || !ANON_KEY || !process.env.ORTHOGONAL_API_KEY) {
    return res.status(200).json({ ok: false, error: 'server_misconfigured' });
  }

  // Credit guard. This used to verify against Supabase alone, which rejected
  // every real caller: sign-in goes through Kinde, so there is no Supabase user
  // behind the token. The shared verifier accepts either, and rate-limits by IP
  // and user — worth having on an endpoint that spends credits per call.
  const access = await requireAgentAccess(req, null, 'sourced-enrich');
  if (!access.ok) return sendAgentAccessError(res, access);

  const body = await readJsonBody(req);
  const signalId = str(body?.signalId).trim();
  const force = body?.force === true;
  if (!signalId) return res.status(400).json({ ok: false, error: 'missing_signal_id' });

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  const { data: row, error: rowErr } = await admin
    .from('source_signals')
    .select('id, company, founder, detail, source_url, profile_url, stage, location, github_url, raw_tags, dossier, dossier_at')
    .eq('id', signalId)
    .maybeSingle();

  if (rowErr || !row) return res.status(200).json({ ok: false, error: 'signal_not_found' });

  // Serve the cached dossier unless stale or a refresh was asked for.
  const cachedAt = row.dossier_at ? new Date(row.dossier_at).getTime() : 0;
  const isFresh = cachedAt && Date.now() - cachedAt < CACHE_TTL_MS;
  if (row.dossier && isFresh && (!force || Date.now() - cachedAt < FORCE_COOLDOWN_MS)) {
    return res.status(200).json({ ok: true, cached: true, dossier: row.dossier });
  }

  const requestKey = str(body?.requestId).trim().slice(0, 160)
    || `sourced-enrich:${access.userId}:${signalId}:${Math.floor(Date.now() / FORCE_COOLDOWN_MS)}`;
  let admission;
  try {
    admission = await beginAgentRun({ requestKey, userKey: access.userId, role: access.role || 'investor', endpoint: 'sourced-enrich' });
  } catch (error) {
    return res.status(error?.status || 503).json({ ok: false, error: error?.code || 'agent_run_control_unavailable' });
  }
  if (admission.action === 'completed' && admission.responsePayload) return res.status(200).json(admission.responsePayload);
  if (admission.action !== 'started') {
    if (admission.retryAfter) res.setHeader('Retry-After', String(admission.retryAfter));
    return res.status(admission.action.includes('quota') ? 429 : 409).json({ ok: false, error: admission.errorCode || admission.action });
  }
  const runStartedAt = Date.now();
  const controller = new AbortController();
  res.on?.('close', () => { if (!res.writableEnded) controller.abort(); });

  const seed = {
    company: str(row.company),
    homepage: str(row.profile_url) || str(row.source_url),
    detail: str(row.detail),
    stage: str(row.stage),
    location: str(row.location),
    githubUrl: str(row.github_url),
  };

  const system = buildSystemPrompt(seed);
  const messages = [{ role: 'user', content: `Research ${seed.company} and record the dossier.` }];
  const publicResearchPolicy = createPublicResearchPolicy({ publicContext: JSON.stringify(seed) });

  let dossier = null;
  let runtime;
  let runtimeResult;
  try {
    runtime = createApparentAgentRuntime({ sessionOptions: { signal: controller.signal, deadlineAt: runStartedAt + SAFE_RUNTIME_MS } });
    runtimeResult = await runtime.run({
      system,
      messages,
      tools: TOOLS,
      maxSteps: MAX_AGENT_STEPS,
      maxTokens: 2048,
      executeTool: async (name, input, { session }) => {
        const external = await runStandardOrthogonalTool(session, name, input, publicResearchPolicy);
        if (external !== null) return external;
        if (name !== 'record_dossier') return { error: `Unknown tool: ${name}` };
        const normalized = normalizeDossier(input || {});
        if (!normalized.summary) {
          return { status: 'rejected', reason: 'summary is required' };
        }
        const sourcesAuthorized = normalized.sources.length > 0 && normalized.sources.every((source) =>
          isAuthorizedResearchUrl(publicResearchPolicy, source.url),
        );
        const hasFetchedSource = normalized.sources.some((source) =>
          isAuthorizedResearchUrl(publicResearchPolicy, source.url, { fetchedOnly: true, sameOrigin: true }),
        );
        if (!sourcesAuthorized || !hasFetchedSource) {
          return { status: 'rejected', reason: 'At least one fetched, authorized source is required and every cited URL must come from approved research.' };
        }
        dossier = normalized;
        return { status: 'recorded' };
      },
    });
  } catch (err) {
    await finishAgentRun({
      runId: admission.runId, requestKey, userKey: access.userId,
      status: err?.code === 'agent_cancelled' ? 'cancelled' : 'failed',
      usage: runtime?.session?.usage?.() || {}, durationMs: Date.now() - runStartedAt,
      errorCode: err?.code || 'sourced_enrich_failed',
    });
    return res.status(200).json({ ok: false, error: `enrich_failed: ${err?.message ?? 'unknown'}` });
  }

  if (!dossier) {
    await finishAgentRun({
      runId: admission.runId, requestKey, userKey: access.userId, status: 'failed',
      usage: runtimeResult?.usage || {}, durationMs: Date.now() - runStartedAt, errorCode: 'no_dossier',
    });
    return res.status(200).json({ ok: false, error: 'no_dossier' });
  }

  const { error: saveErr } = await admin
    .from('source_signals')
    .update({ dossier, dossier_at: dossier.generatedAt })
    .eq('id', signalId);

  if (saveErr) {
    await finishAgentRun({
      runId: admission.runId, requestKey, userKey: access.userId, status: 'failed',
      usage: runtimeResult?.usage || {}, durationMs: Date.now() - runStartedAt, errorCode: 'save_failed',
    });
    return res.status(200).json({ ok: false, error: `save_failed: ${saveErr.message}` });
  }

  const responsePayload = { ok: true, cached: false, dossier };
  await finishAgentRun({
    runId: admission.runId, requestKey, userKey: access.userId, status: 'completed',
    usage: runtimeResult?.usage || {}, durationMs: Date.now() - runStartedAt, responsePayload,
  });
  return res.status(200).json(responsePayload);
}
