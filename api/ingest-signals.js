// Proactive deal-flow ingestion — the scheduled counterpart to the investor
// agent's ad-hoc web sourcing (see api/agent.js, which uses the same
// Orthogonal search/fetch tools per chat). This runs on a schedule (an automation
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
// ORTHOGONAL_API_KEY are all set. The service role lets the upsert bypass RLS.
//
// SOURCES: POST /api/ingest-signals?source=<name> with header
//   x-agent-cron-secret: <AGENT_CRON_SECRET>
// where <name> is one of:
//   web         (default) Apparent agent with Orthogonal search/fetch — the long-tail
//               scout. Needs ORTHOGONAL_API_KEY. Refreshes freshness_at on re-runs.
//   hn          Show HN stories via Algolia (free, no key)
//   producthunt Product Hunt launches (needs PRODUCTHUNT_TOKEN)
//   github      Fast-rising new repos via GitHub search (GITHUB_INGEST_TOKEN optional)
//   yc          Recent YC batches via yc-oss.github.io (free, no key)
// Structured sources insert with ignore-duplicates so daily re-runs don't bump
// freshness_at and pin the same rows atop the investor Daily list.
// Scheduled by .github/workflows/ingest-dealflow.yml (daily cron).

import { fetchShowHN, fetchProductHunt, fetchGitHubRising, fetchYCRecent } from '../server/agent/ingest-sources.js';
import {
  createApparentAgentRuntime,
  createPublicResearchPolicy,
  isAuthorizedResearchUrl,
  runStandardOrthogonalTool,
  standardOrthogonalTools,
} from '../server/agent/apparent-agent-runtime.js';

const SUPABASE_URL = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const CRON_SECRET = process.env.AGENT_CRON_SECRET || '';
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
// EXCEPT multi-tenant hosts (github.com/user/repo etc.), where collapsing to the
// bare domain would merge every product hosted there into one row — those keep
// their (lowercased) path.
const MULTI_TENANT_HOSTS = new Set([
  'github.com', 'gitlab.com', 'bitbucket.org', 'huggingface.co',
  'apps.apple.com', 'play.google.com', 'chromewebstore.google.com',
  'marketplace.visualstudio.com', 'npmjs.com', 'pypi.org',
  'producthunt.com', 'news.ycombinator.com',
  'x.com', 'twitter.com', 'linkedin.com', 'medium.com',
]);

export const canonicalSourceUrl = (rawUrl) => {
  const raw = str(rawUrl).trim();
  if (!raw) return '';
  let host = raw;
  let path = '';
  try {
    const u = new URL(raw.includes('://') ? raw : `https://${raw}`);
    host = u.hostname;
    path = u.pathname;
  } catch {
    host = raw.replace(/^https?:\/\//i, '').split(/[/?#]/)[0];
  }
  host = host.toLowerCase().replace(/^www\./, '').trim();
  if (!host) return '';
  if (MULTI_TENANT_HOSTS.has(host)) {
    return `https://${host}${path.toLowerCase().replace(/\/+$/, '')}`;
  }
  return `https://${host}`;
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

// merge-duplicates (web scout) refreshes existing rows; ignore-duplicates
// (structured feeds) inserts only genuinely new startups and returns how many.
const upsertSignals = async (rows, { ignoreDuplicates = false } = {}) => {
  if (!rows.length) return 0;
  const prefer = ignoreDuplicates
    ? 'resolution=ignore-duplicates,return=representation'
    : 'resolution=merge-duplicates,return=minimal';
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/source_signals?on_conflict=source_type,source_url&select=id`,
    {
      method: 'POST',
      headers: { ...sbHeaders(), Prefer: prefer },
      body: JSON.stringify(rows),
    },
  );
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`source_signals upsert failed (${res.status}): ${text.slice(0, 300)}`);
  }
  if (!ignoreDuplicates) return rows.length;
  const inserted = await res.json().catch(() => null);
  return Array.isArray(inserted) ? inserted.length : rows.length;
};

const logScrapeRun = async (fields) => {
  if (!SUPABASE_URL || !SERVICE_KEY) return;
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/scrape_runs`, {
      method: 'POST',
      headers: { ...sbHeaders(), Prefer: 'return=minimal' },
      body: JSON.stringify([{ source_name: 'apparent-orthogonal-discovery', ...fields }]),
    });
  } catch {
    /* observability only — never fail the run on a logging error */
  }
};

// ---------- Discovery tool ----------

const TOOLS = [
  ...standardOrthogonalTools,
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
    '- Use search_public_web to find recently-launched startups in these sectors (Launch HN, Product Hunt, YC batches, launch coverage, "raising seed/pre-seed" posts).',
    '- Use fetch_public_url to open a candidate\'s homepage/launch post and confirm it is a real, live company before recording it.',
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

// ---------- Structured feed sources ----------

const STRUCTURED_SOURCES = {
  hn: fetchShowHN,
  producthunt: fetchProductHunt,
  github: fetchGitHubRising,
  yc: fetchYCRecent,
};

// Normalize a fetcher candidate to a source_signals row. All ingested leads are
// source_type='web' — "web-sourced, not GitHub-verified" is the provenance the
// dashboard cares about, and sharing one source_type means the unique index
// dedupes the same startup across HN/PH/YC/scout automatically. The actual feed
// lives in raw.source.
const toSignalRow = (item, source) => {
  const canonical = canonicalSourceUrl(item?.homepage_url);
  const company = str(item?.company).trim();
  const detail = str(item?.detail).trim();
  if (!canonical || !company || !detail) return null;
  const now = new Date().toISOString();
  return {
    company,
    founder: str(item?.founder).trim() || 'Founding team',
    detail,
    source_type: 'web',
    source_url: canonical,
    profile_url: str(item?.homepage_url).trim() || canonical,
    stage: str(item?.stage).trim(),
    location: str(item?.location).trim(),
    github_url: str(item?.github_url).trim(),
    raw_tags: [str(item?.sector).trim()].filter(Boolean),
    freshness_at: now,
    raw: { discovered_at: now, found_via: str(item?.found_via).trim(), sector: str(item?.sector).trim(), source },
  };
};

const runStructuredSource = async (source, res) => {
  const startedAt = new Date().toISOString();
  try {
    const fetched = await STRUCTURED_SOURCES[source]();
    if (fetched && !Array.isArray(fetched) && fetched.skipped) {
      return res.status(200).json({ skipped: fetched.skipped, source });
    }
    const byUrl = new Map();
    for (const item of fetched) {
      const row = toSignalRow(item, source);
      if (row && !byUrl.has(row.source_url)) byUrl.set(row.source_url, row);
    }
    const rows = Array.from(byUrl.values());
    const inserted = await upsertSignals(rows, { ignoreDuplicates: true });
    await logScrapeRun({
      source_name: `${source}-feed`,
      status: 'ok',
      item_count: inserted,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      input_json: { source, discovered: rows.length },
    });
    return res.status(200).json({ ok: true, source, discovered: rows.length, inserted });
  } catch (err) {
    const message = err?.message ?? 'unknown';
    await logScrapeRun({
      source_name: `${source}-feed`,
      status: 'error',
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      error_text: String(message).slice(0, 500),
      input_json: { source },
    });
    return res.status(500).json({ error: `${source} ingest failed: ${message}` });
  }
};

// ---------- Handler ----------

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!CRON_SECRET || !SERVICE_KEY || !SUPABASE_URL) {
    return res.status(200).json({
      skipped:
        'ingest-signals not configured — set AGENT_CRON_SECRET, SUPABASE_SERVICE_ROLE_KEY, and SUPABASE_URL to enable.',
    });
  }

  if (req.headers['x-agent-cron-secret'] !== CRON_SECRET) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const source = str(req.query?.source ?? '').toLowerCase().trim() || 'web';
  if (source !== 'web') {
    if (!STRUCTURED_SOURCES[source]) {
      return res.status(400).json({ error: `unknown source '${source}' — expected web, ${Object.keys(STRUCTURED_SOURCES).join(', ')}` });
    }
    return runStructuredSource(source, res);
  }

  if (!process.env.ORTHOGONAL_API_KEY) {
    return res.status(200).json({ skipped: 'web scout needs ORTHOGONAL_API_KEY — structured sources (?source=hn|producthunt|github|yc) still work.' });
  }

  const startedAt = new Date().toISOString();
  const sectors = await loadTargetSectors();
  const sinceLabel = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const system = buildSystemPrompt(sectors, sinceLabel);
  const messages = [{ role: 'user', content: `Source fresh thesis-fit startups for our investors. Target sectors: ${sectors}.` }];
  const publicResearchPolicy = createPublicResearchPolicy({ publicContext: messages[0].content });

  // Collected server-side as the model calls record_startup. Keyed by canonical
  // URL so duplicates within a single run collapse before we ever hit the DB.
  const byUrl = new Map();

  try {
    const runtime = createApparentAgentRuntime();
    await runtime.run({
      system,
      messages,
      tools: TOOLS,
      maxSteps: MAX_AGENT_STEPS,
      maxTokens: 8192,
      executeTool: async (name, rawInput, { session }) => {
        const external = await runStandardOrthogonalTool(session, name, rawInput, publicResearchPolicy);
        if (external !== null) return external;
        if (name !== 'record_startup') return { error: `Unknown tool: ${name}` };

        const input = rawInput || {};
        const canonical = canonicalSourceUrl(input.homepage_url);
        const company = str(input.company).trim();
        const detail = str(input.detail).trim();
        const hasFetchedProvenance =
          isAuthorizedResearchUrl(publicResearchPolicy, input.homepage_url, { fetchedOnly: true, sameOrigin: true }) ||
          isAuthorizedResearchUrl(publicResearchPolicy, input.source_url, { fetchedOnly: true, sameOrigin: true });

        let result;
        if (!canonical || !company || !detail || !hasFetchedProvenance) {
          result = { status: 'skipped', reason: 'missing fields or no fetched, authorized source provenance' };
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
        return result;
      },
    });

    const rows = Array.from(byUrl.values());
    const upserted = await upsertSignals(rows);

    await logScrapeRun({
      status: 'ok',
      item_count: upserted,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      input_json: { sectors, target: TARGET_COUNT, since: sinceLabel, provider: 'orthogonal' },
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
      input_json: { sectors, target: TARGET_COUNT, since: sinceLabel, provider: 'orthogonal' },
    });
    return res.status(500).json({ error: `ingest-signals failed: ${message}` });
  }
}
