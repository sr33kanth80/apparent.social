// Sourced-startup deep dive — on-demand agent enrichment (Phase 2).
//
// An investor opens a /sourced/:id profile and clicks "Generate deep dive".
// This runs Claude with web_search + web_fetch to research that one company and
// produce a structured, investor-facing dossier (summary, team, traction,
// thesis fit, sources), then caches it onto the source_signals row so every
// later view is instant and free. On-demand by design: we only spend credits on
// startups an investor actually opens.
//
// Auth: caller must present their Supabase JWT (Authorization: Bearer <jwt>).
// Any signed-in user can trigger — the JWT is the guard against anonymous
// credit-burning. ponytail: not role-gated; tighten to investors-only if abuse
// shows up.
//
// Request:  POST { signalId: string, force?: boolean }
// Response: { ok, dossier, cached } | { ok:false, error }
//
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, VITE_SUPABASE_ANON_KEY (auth),
// ANTHROPIC_API_KEY, SOURCED_ENRICH_MODEL (default claude-sonnet-4-6).

import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
const ENRICH_MODEL = process.env.SOURCED_ENRICH_MODEL || 'claude-sonnet-4-6';

// Sourced facts change slowly — a long cache keeps the bill down. force bypasses.
const CACHE_TTL_MS = 14 * 24 * 60 * 60 * 1000;
const MAX_AGENT_STEPS = 10;

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
  { type: 'web_search_20260209', name: 'web_search' },
  { type: 'web_fetch_20260209', name: 'web_fetch' },
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
    '- Use web_fetch on the homepage first to ground yourself in what they actually do.',
    '- Use web_search to find the founders, any funding/launch coverage, customers, and real traction.',
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
  if (!SUPABASE_URL || !SERVICE_KEY || !ANON_KEY || !process.env.ANTHROPIC_API_KEY) {
    return res.status(200).json({ ok: false, error: 'server_misconfigured' });
  }

  // Resolve the caller's identity from their Supabase JWT (credit guard).
  const authHeader = str(req.headers.authorization);
  const jwt = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!jwt) return res.status(401).json({ ok: false, error: 'unauthenticated' });

  const anon = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
  const { data: userData, error: userErr } = await anon.auth.getUser(jwt);
  if (userErr || !userData?.user?.id) return res.status(401).json({ ok: false, error: 'invalid_token' });

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
  if (row.dossier && isFresh && !force) {
    return res.status(200).json({ ok: true, cached: true, dossier: row.dossier });
  }

  const seed = {
    company: str(row.company),
    homepage: str(row.profile_url) || str(row.source_url),
    detail: str(row.detail),
    stage: str(row.stage),
    location: str(row.location),
    githubUrl: str(row.github_url),
  };

  const client = new Anthropic();
  const system = buildSystemPrompt(seed);
  const messages = [{ role: 'user', content: `Research ${seed.company} and record the dossier.` }];

  const callModel = () =>
    client.messages.create({
      model: ENRICH_MODEL,
      max_tokens: 2048,
      thinking: { type: 'adaptive' },
      output_config: { effort: 'medium' },
      system,
      tools: TOOLS,
      messages,
    });

  let dossier = null;
  try {
    let response = await callModel();
    let steps = 0;

    while (steps < MAX_AGENT_STEPS && (response.stop_reason === 'tool_use' || response.stop_reason === 'pause_turn')) {
      steps += 1;
      messages.push({ role: 'assistant', content: response.content });

      if (response.stop_reason === 'pause_turn') {
        response = await callModel();
        continue;
      }

      const toolResults = [];
      for (const block of response.content) {
        if (block.type !== 'tool_use') continue; // skip server_tool_use (web_search/web_fetch)
        if (block.name !== 'record_dossier') {
          toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify({ error: `Unknown tool: ${block.name}` }) });
          continue;
        }
        const normalized = normalizeDossier(block.input || {});
        if (!normalized.summary) {
          toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify({ status: 'rejected', reason: 'summary is required' }) });
          continue;
        }
        dossier = normalized;
        toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify({ status: 'recorded' }) });
      }

      if (dossier) break; // got what we need — stop spending steps
      if (toolResults.length === 0) break;
      messages.push({ role: 'user', content: toolResults });
      response = await callModel();
    }
  } catch (err) {
    return res.status(200).json({ ok: false, error: `enrich_failed: ${err?.message ?? 'unknown'}` });
  }

  if (!dossier) return res.status(200).json({ ok: false, error: 'no_dossier' });

  const { error: saveErr } = await admin
    .from('source_signals')
    .update({ dossier, dossier_at: dossier.generatedAt })
    .eq('id', signalId);

  if (saveErr) return res.status(200).json({ ok: false, error: `save_failed: ${saveErr.message}` });

  return res.status(200).json({ ok: true, cached: false, dossier });
}
