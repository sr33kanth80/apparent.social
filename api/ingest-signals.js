// Proactive deal-flow ingestion — the scheduled counterpart to the investor
// agent's ad-hoc web sourcing (see api/agent.js, which uses the same
// web_search/web_fetch tools per chat). This runs on a schedule (a Claude Code
// Routine POSTs it every 12h), discovers recently-launched startups across the
// web that match the sectors the platform's investors actually care about, and
// upserts them into public.source_signals so every investor gets a fresh,
// deduped, browseable, filterable deal-flow list — and so the per-investor
// agent has a warm pool to rank against instead of re-discovering from scratch.
//
// PROVENANCE: these rows are "Sourced" leads, NOT verified founders. They land
// with source_type='web' and no GitHub verification, so the dashboard renders
// them distinctly from native Apparent builders (which are GitHub-verified).
//
// DEDUP: public.source_signals has a unique index on (source_type, source_url).
// We upsert with on_conflict=source_type,source_url so re-runs refresh
// freshness_at instead of creating duplicates. The only rule the writer must
// follow is: pick ONE canonical, stable source_url per startup. We canonicalize
// to the company's bare homepage domain so the same startup collapses to one row
// across runs even if the model cites it via different paths.
//
// SAFETY: disabled by default. Runs only when AGENT_CRON_SECRET (caller must
// present it as x-agent-cron-secret), SUPABASE_SERVICE_ROLE_KEY, and
// ANTHROPIC_API_KEY are all set. The service role lets the upsert bypass RLS.
//
// Wire a Routine to: POST /api/ingest-signals  with header
//   x-agent-cron-secret: <AGENT_CRON_SECRET>

import Anthropic from '@anthropic-ai/sdk';

const SUPABASE_URL = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const CRON_SECRET = process.env.AGENT_CRON_SECRET || '';
const MODEL = process.env.INGEST_MODEL || process.env.AGENT_MODEL || 'claude-sonnet-4-6';

const MAX_TOKENS = 8192;
const MAX_AGENT_STEPS = 22; // more targets need more web_search/web_fetch headroom
// Per-run scrape volume. Default 24, env-tunable up to 60. Each run upserts into
// source_signals (deduped), so the investor Daily list grows run over run rather
// than resetting — bigger target = faster accumulation, but a longer/costlier
// agent loop, so keep the ceiling sane.
const TARGET_COUNT = Math.min(Math.max(Number(process.env.INGEST_TARGET_COUNT) || 24, 1), 60);

const DEFAULT_SECTORS = 'developer tools, AI infrastructure, vertical SaaS, fintech, agents, devops, data infrastructure';

const str = (v) => (v == null ? '' : String(v));

// ---------- Canonical source_url — the dedup key ----------
// Collapse any URL the model cites for a startup to its bare homepage domain so
// "acme.com/launch", "https://www.acme.com", and "acme.com/" all dedupe to one.
export const canonicalSourceUrl = (rawUrl) => {
  const raw = str(rawUrl).trim();
  if (!raw) return '';
  let host = raw;
  try {
    host = new URL(raw.includes('://') ? raw : `https://${raw}`).hostname;
  } catch {
    host = raw.replace(/^https?:\/\//i, '').split('/')[0];
  }
  host = host.toLowerCase().replace(/^www\./, '').trim();
  return host ? `https://${host}` : '';
};

// ---------- Supabase REST (service role) ----------

const sbHeaders = () => ({
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
});

// Aggregate the sectors/theses actual investors saved, so discovery is relevant
// to the people paying for the product rather than generic. Falls back to a
// sensible default set when the platform has no investor criteria yet.
const loadTargetSectors = async () => {
  if (!SUPABASE_URL || !SERVICE_KEY) return DEFAULT_SECTORS;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/investor_criteria?select=sectors,thesis,stage&limit=200`,
      { headers: sbHeaders() },
    );
    if (!res.ok) return DEFAULT_SECTORS;
    const rows = await res.json().catch(() => []);
    const sectors = new Set();
    for (const row of Array.isArray(rows) ? rows : []) {
      str(row.sectors)
        .split(/[,;\n]/)
        .map((s) => s.trim())
        .filter((s) => s.length > 1)
        .forEach((s) => sectors.add(s));
    }
    return sectors.size ? Array.from(sectors).slice(0, 24).join(', ') : DEFAULT_SECTORS;
  } catch {
    return DEFAULT_SECTORS;
  }
};

const upsertSignals = async (rows) => {
  if (!rows.length) return 0;
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/source_signals?on_conflict=source_type,source_url`,
    {
      method: 'POST',
      headers: { ...sbHeaders(), Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(rows),
    },
  );
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`source_signals upsert failed (${res.status}): ${text.slice(0, 300)}`);
  }
  return rows.length;
};

const logScrapeRun = async (fields) => {
  if (!SUPABASE_URL || !SERVICE_KEY) return;
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/scrape_runs`, {
      method: 'POST',
      headers: { ...sbHeaders(), Prefer: 'return=minimal' },
      body: JSON.stringify([{ source_name: 'claude-web-discovery', ...fields }]),
    });
  } catch {
    /* observability only — never fail the run on a logging error */
  }
};

// ---------- Discovery tool ----------

const TOOLS = [
  { type: 'web_search_20260209', name: 'web_search' },
  { type: 'web_fetch_20260209', name: 'web_fetch' },
  {
    name: 'record_startup',
    description:
      'Record ONE real, recently-launched startup you found and verified via web_search/web_fetch. Call once per distinct startup. Only record startups with a real, working homepage you actually reached — never invent a company, founder, or URL. Skip anything you cannot verify.',
    input_schema: {
      type: 'object',
      properties: {
        company: { type: 'string', description: 'The startup/company name.' },
        founder: { type: 'string', description: "The founder's name if known; otherwise a short descriptor like 'Founding team'." },
        homepage_url: { type: 'string', description: "The startup's canonical homepage URL (e.g. https://acme.com). Required — this is the dedup key." },
        detail: { type: 'string', description: 'One or two sentences: what they build, the wedge, and any real traction/launch signal you found. Grounded only in what you read.' },
        sector: { type: 'string', description: 'Primary sector/category (e.g. "AI infra", "fintech").' },
        stage: { type: 'string', description: 'Rough stage if discernible (e.g. "pre-seed", "seed", "launched"). Leave empty if unknown.' },
        location: { type: 'string', description: 'City / region / "Remote" if discernible.' },
        github_url: { type: 'string', description: "The company or founder's GitHub URL if you found one; otherwise omit." },
        source_url: { type: 'string', description: 'The public URL where you found/verified this startup (launch post, directory, article). Used to attribute the lead.' },
      },
      required: ['company', 'homepage_url', 'detail'],
    },
  },
];

const buildSystemPrompt = (sectors, sinceLabel) =>
  [
    'You are Apparent\'s deal-flow scout. Apparent is a platform where venture investors discover thesis-fit startups.',
    '',
    `Your job this run: find up to ${TARGET_COUNT} REAL startups that launched or showed fresh momentum recently (roughly since ${sinceLabel}) and that fit the sectors Apparent\'s investors care about:`,
    `  ${sectors}`,
    '',
    'How to work:',
    '- Use web_search to find recently-launched startups in these sectors (Launch HN, Product Hunt, YC batches, launch coverage, "raising seed/pre-seed" posts).',
    '- Use web_fetch to open a candidate\'s homepage/launch post and confirm it is a real, live company before recording it.',
    '- Call record_startup once per distinct startup you verified, with its canonical homepage URL.',
    '',
    'Hard rules:',
    '- NEVER fabricate a company, founder, metric, or URL. If you cannot verify it with a real page you fetched, do not record it.',
    '- Prefer breadth across the listed sectors over many startups in one niche.',
    '- Skip well-known late-stage companies; favor early, fresh, fundable teams an investor would not already know.',
    '- Do not record the same startup twice.',
    '',
    `When you have recorded a good batch (aim for ${TARGET_COUNT}, fewer is fine if you cannot verify more), stop and briefly summarize what you sourced.`,
  ].join('\n');

// ---------- Handler ----------

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!CRON_SECRET || !SERVICE_KEY || !SUPABASE_URL || !process.env.ANTHROPIC_API_KEY) {
    return res.status(200).json({
      skipped:
        'ingest-signals not configured — set AGENT_CRON_SECRET, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL, and ANTHROPIC_API_KEY to enable.',
    });
  }

  if (req.headers['x-agent-cron-secret'] !== CRON_SECRET) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const startedAt = new Date().toISOString();
  const sectors = await loadTargetSectors();
  const sinceLabel = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const client = new Anthropic();
  const system = buildSystemPrompt(sectors, sinceLabel);
  const messages = [{ role: 'user', content: `Source fresh thesis-fit startups for our investors. Target sectors: ${sectors}.` }];

  // Collected server-side as the model calls record_startup. Keyed by canonical
  // URL so duplicates within a single run collapse before we ever hit the DB.
  const byUrl = new Map();

  const callModel = () =>
    client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      thinking: { type: 'adaptive' },
      output_config: { effort: 'medium' },
      system,
      tools: TOOLS,
      messages,
    });

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
        if (block.name !== 'record_startup') {
          toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify({ error: `Unknown tool: ${block.name}` }) });
          continue;
        }

        const input = block.input || {};
        const canonical = canonicalSourceUrl(input.homepage_url);
        const company = str(input.company).trim();
        const detail = str(input.detail).trim();

        let result;
        if (!canonical || !company || !detail) {
          result = { status: 'skipped', reason: 'missing company, detail, or a valid homepage_url' };
        } else if (byUrl.has(canonical)) {
          result = { status: 'skipped', reason: 'already recorded this startup this run' };
        } else {
          byUrl.set(canonical, {
            company,
            founder: str(input.founder).trim() || 'Founding team',
            detail,
            source_type: 'web',
            source_url: canonical,
            profile_url: canonical,
            stage: str(input.stage).trim(),
            location: str(input.location).trim(),
            github_url: str(input.github_url).trim(),
            raw_tags: [str(input.sector).trim()].filter(Boolean),
            freshness_at: new Date().toISOString(),
            raw: { discovered_at: new Date().toISOString(), found_via: str(input.source_url).trim(), sector: str(input.sector).trim() },
          });
          result = { status: 'recorded', company, count_so_far: byUrl.size };
        }
        toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify(result) });
      }

      if (toolResults.length === 0) break;
      messages.push({ role: 'user', content: toolResults });
      response = await callModel();
    }

    const rows = Array.from(byUrl.values());
    const upserted = await upsertSignals(rows);

    await logScrapeRun({
      status: 'ok',
      item_count: upserted,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      input_json: { sectors, target: TARGET_COUNT, since: sinceLabel, model: MODEL },
    });

    return res.status(200).json({ ok: true, discovered: rows.length, upserted, sectors });
  } catch (err) {
    const message = err?.message ?? 'unknown';
    await logScrapeRun({
      status: 'error',
      item_count: byUrl.size,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      error_text: String(message).slice(0, 500),
      input_json: { sectors, target: TARGET_COUNT, since: sinceLabel, model: MODEL },
    });
    if (err instanceof Anthropic.APIError) {
      return res.status(200).json({ error: `ingest hit an API error (${err.status})`, upserted: 0 });
    }
    return res.status(500).json({ error: `ingest-signals failed: ${message}` });
  }
}
