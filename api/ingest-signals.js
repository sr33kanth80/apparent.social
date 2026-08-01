// Proactive deal-flow ingestion — the scheduled counterpart to the investor
// agent's ad-hoc web sourcing (see api/agent.js, which uses the same Orthogonal
// search/fetch tools per chat). Runs on a daily cron, discovers recently-launched
// startups across the web that match the sectors Apparent's investors care about,
// and upserts them into public.source_signals so every investor gets a fresh,
// deduped, browseable, filterable deal-flow list.
//
// SINGLE SOURCE: Orthogonal search/fetch is the only pipe. HN/PH/GitHub/YC
// scrapers were removed — the agent already covers those surfaces (Launch HN,
// Product Hunt, YC batches) when its prompt tells it to, and consolidating on
// one provider means one API key, one failure mode, one place to tune thesis.
//
// PROVENANCE: rows are "Sourced" leads, NOT GitHub-verified founders. They land
// with source_type='web' so the dashboard renders them distinctly from native
// Apparent builders.
//
// DEDUP: public.source_signals has a unique index on (source_type, source_url).
// Upserts with on_conflict=source_type,source_url so re-runs refresh freshness_at
// instead of duplicating. canonicalSourceUrl collapses every way the model may
// cite a startup to its bare homepage domain.
//
// SAFETY: disabled unless AGENT_CRON_SECRET, SUPABASE_SERVICE_ROLE_KEY, and
// ORTHOGONAL_API_KEY are all set.
//
// USAGE: POST /api/ingest-signals with header x-agent-cron-secret: <secret>.
// Scheduled by .github/workflows/ingest-dealflow.yml.

import {
  createApparentAgentRuntime,
  createPublicResearchPolicy,
  dynamicOrthogonalTools,
  isAuthorizedResearchUrl,
  runDynamicOrthogonalTool,
  runOrthogonalRouterTool,
  runStandardOrthogonalTool,
  standardOrthogonalTools,
} from '../server/agent/apparent-agent-runtime.js';
import { requireAgentAccess, sendAgentAccessError } from '../server/agent/agent-guard.js';

// A full scout loop legitimately runs minutes. Without this the platform kills
// the function mid-loop and the partial-save in the catch block never runs.
export const maxDuration = 300;

const SUPABASE_URL = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const CRON_SECRET = process.env.AGENT_CRON_SECRET || '';
// Soft throttle so an investor's manual refresh can't be double-tapped into two
// concurrent scout runs. Re-check by the freshest row's age — a successful run
// stamps freshness_at=now(), so this trails the last successful ingest.
const MANUAL_COOLDOWN_MS = 10 * 60 * 1000;
// With batched recording a productive run is roughly: search, record 8, search,
// record 8, search, record 8. That is well under this ceiling — the headroom is
// for retries and dead-end searches, not for one-company-at-a-time recording.
const MAX_AGENT_STEPS = Math.min(Math.max(Number(process.env.INGEST_MAX_STEPS) || 30, 8), 60);
// Orthogonal bills per call, and EVERY request counts — inference completions
// included. A 22-step loop that fetches 1-3 pages per step needs roughly
// 22 inference + ~60 tool calls, so the chat-sized default of 20 is nowhere near
// enough. Env-tunable; keep the spend cap in sight since catalog runs are paid.
const INGEST_MAX_CALLS = Math.min(Math.max(Number(process.env.INGEST_MAX_CALLS) || 120, 20), 400);
const INGEST_MAX_SPEND_CENTS = Math.min(Math.max(Number(process.env.INGEST_MAX_SPEND_CENTS) || 500, 50), 5000);
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

// Refreshes existing rows via merge-duplicates so re-runs bump freshness_at
// rather than duplicating.
const upsertSignals = async (rows) => {
  if (!rows.length) return 0;
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/source_signals?on_conflict=source_type,source_url&select=id`,
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
      body: JSON.stringify([{ source_name: 'apparent-orthogonal-discovery', ...fields }]),
    });
  } catch {
    /* observability only — never fail the run on a logging error */
  }
};

// ---------- Discovery tool ----------

const TOOLS = [
  ...standardOrthogonalTools,
  ...dynamicOrthogonalTools,
  {
    name: 'record_startups',
    // Batched on purpose: one startup per call meant a full target of 24 needed
    // 24 tool calls on top of search/fetch, which exhausted the step budget
    // after a couple of finds. A whole search page can now land in one call.
    description:
      'Record a BATCH of real startups you found in search or catalog results. Pass every startup from a result page in ONE call — do not call this once per company. Never invent a company, founder, or URL: each startup\'s homepage_url must be one that appeared in a tool result.',
    input_schema: {
      type: 'object',
      properties: {
        startups: {
          type: 'array',
          description: 'Every distinct startup you are recording right now. Aim for 6-12 per call.',
          items: {
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
              source_url: { type: 'string', description: 'The public URL where you found this startup (launch post, directory, article).' },
            },
            required: ['company', 'homepage_url', 'detail'],
          },
        },
      },
      required: ['startups'],
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
    'You have a limited number of steps, so work in wide sweeps — never one company at a time.',
    '',
    'The loop that works:',
    '1. search_public_web for a whole CATEGORY of recent launches: "Show HN new AI infrastructure startups", "YC W26 fintech companies", "developer tools startups raising pre-seed". Each search returns many companies at once.',
    '2. Immediately call record_startups with EVERY usable company from those results in ONE call (aim for 6-12 per call). A search result gives you name, URL, and description — that is enough to record.',
    '3. Repeat with a different sector or a different source until you hit the target.',
    '',
    'Tool notes:',
    '- fetch_public_url is for the occasional ambiguous candidate ONLY. Do not fetch every company — it is the slowest thing you can do and will burn your steps before you find much.',
    '- search_public_news works well for funding announcements.',
    '- When plain search genuinely cannot answer (e.g. structured "raised seed in the last 30 days" queries), use find_and_run_orthogonal_api with the capability in plain words — it finds and runs the right endpoint in one step. Reach for discover_orthogonal_apis only to compare providers before spending. Discovery and details are free; run is paid.',
    '',
    'Hard rules:',
    '- NEVER invent a company, founder, or URL. Every homepage_url you record must have appeared in a tool result.',
    '- Prefer breadth across the listed sectors over depth in one niche.',
    '- Skip well-known late-stage companies; favor early, fresh, fundable teams an investor would not already know.',
    '- Do not record the same startup twice.',
    '',
    `Keep going until you have recorded about ${TARGET_COUNT} startups, then stop and summarize briefly. Every record_startups result tells you how many remain.`,
  ].join('\n');

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

  // Two callers allowed:
  //   1. GitHub Actions cron (x-agent-cron-secret)
  //   2. Signed-in investor clicking "Refresh" (Authorization: Bearer <jwt>).
  //      For that path we verify the JWT against Supabase and throttle by the
  //      freshest source_signals row so double-taps don't stack runs.
  const cronOk = req.headers['x-agent-cron-secret'] === CRON_SECRET;
  if (!cronOk) {
    // Same Kinde-or-Supabase verifier the chat agent uses. Investor-only so a
    // founder account can't trigger it. requireAgentAccess also rate-limits by
    // IP + user, so the manual-refresh path picks that up for free.
    const access = await requireAgentAccess(req, 'investor', 'ingest-signals');
    if (!access.ok) return sendAgentAccessError(res, access);
    // Throttle: refuse if the freshest row is younger than the cooldown.
    const freshRes = await fetch(
      `${SUPABASE_URL}/rest/v1/source_signals?select=freshness_at&order=freshness_at.desc&limit=1`,
      { headers: sbHeaders() },
    );
    const freshRows = await freshRes.json().catch(() => []);
    const newestAt = freshRows?.[0]?.freshness_at ? Date.parse(freshRows[0].freshness_at) : 0;
    const ageMs = Date.now() - newestAt;
    if (newestAt && ageMs < MANUAL_COOLDOWN_MS) {
      return res.status(429).json({
        error: 'cooldown',
        retryInSec: Math.ceil((MANUAL_COOLDOWN_MS - ageMs) / 1000),
      });
    }
  }

  if (!process.env.ORTHOGONAL_API_KEY) {
    return res.status(200).json({ skipped: 'ingest-signals needs ORTHOGONAL_API_KEY.' });
  }

  const startedAt = new Date().toISOString();
  const sectors = await loadTargetSectors();
  const sinceLabel = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const system = buildSystemPrompt(sectors, sinceLabel);
  const messages = [{ role: 'user', content: `Source fresh thesis-fit startups for our investors. Target sectors: ${sectors}.` }];
  // openQueries: the seed prompt above is a server-authored constant with no user
  // data in it, so the anti-exfiltration term allowlist has nothing to protect
  // here — it only blocked the scout's own discovery queries.
  const publicResearchPolicy = createPublicResearchPolicy({
    publicContext: messages[0].content,
    openQueries: true,
  });

  // Collected server-side as the model calls record_startup. Keyed by canonical
  // URL so duplicates within a single run collapse before we ever hit the DB.
  const byUrl = new Map();
  // Rejected record_startup attempts, logged to scrape_runs. A run that finds
  // nothing should say why rather than looking like the scout found nothing.
  const skipped = [];

  try {
    // The shared session defaults (20 calls / 100¢) are sized for a short chat
    // turn. This loop spends one call per inference step plus one per tool call,
    // so it exhausted 20 within a few steps and threw away everything it had
    // found. Size the budget to the loop instead.
    const runtime = createApparentAgentRuntime({
      sessionOptions: {
        maxCalls: INGEST_MAX_CALLS,
        maxSpendCents: INGEST_MAX_SPEND_CENTS,
      },
    });
    await runtime.run({
      system,
      messages,
      tools: TOOLS,
      maxSteps: MAX_AGENT_STEPS,
      maxTokens: 8192,
      executeTool: async (name, rawInput, { session }) => {
        const external = await runStandardOrthogonalTool(session, name, rawInput, publicResearchPolicy);
        if (external !== null) return external;
        const routed = await runOrthogonalRouterTool(session, name, rawInput, publicResearchPolicy);
        if (routed !== null) return routed;
        const dynamic = await runDynamicOrthogonalTool(session, name, rawInput, publicResearchPolicy);
        if (dynamic !== null) return dynamic;
        if (name !== 'record_startups') return { error: `Unknown tool: ${name}` };

        // Provenance: the URL must have come out of a tool result, never straight
        // from the model. A fetched page is the strongest evidence, but a URL that
        // appeared in a search result or catalog response is real provenance too —
        // and requiring `fetchedOnly` silently rejected every startup the scout
        // found through the catalog, which is most of them.
        // Origin comparison is exact, so "https://www.acme.com" and
        // "https://acme.com" read as different sites and a legitimate find gets
        // dropped on a www mismatch — search results mix the two forms freely.
        // Check both variants; same registrable domain, same owner.
        const wwwVariants = (value) => {
          const raw = str(value).trim();
          if (!raw) return [];
          const stripped = raw.replace(/^(https?:\/\/)www\./i, '$1');
          const prefixed = raw.replace(/^(https?:\/\/)(?!www\.)/i, '$1www.');
          return [...new Set([raw, stripped, prefixed])];
        };
        const seenInToolResult = (value) =>
          wwwVariants(value).some((candidate) =>
            isAuthorizedResearchUrl(publicResearchPolicy, candidate, { fetchedOnly: true, sameOrigin: true }) ||
            isAuthorizedResearchUrl(publicResearchPolicy, candidate, { sameOrigin: true }));

        const batch = Array.isArray(rawInput?.startups) ? rawInput.startups : [];
        if (!batch.length) return { error: 'startups array is required and must not be empty' };

        let recorded = 0;
        const rejected = [];
        for (const input of batch.slice(0, TARGET_COUNT * 2)) {
          const canonical = canonicalSourceUrl(input?.homepage_url);
          const company = str(input?.company).trim();
          const detail = str(input?.detail).trim();
          const hasProvenance = seenInToolResult(input?.homepage_url) || seenInToolResult(input?.source_url);

          if (!canonical || !company || !detail || !hasProvenance) {
            const why = !canonical ? 'no canonical url' : !company ? 'no company' : !detail ? 'no detail' : 'no authorized source provenance';
            skipped.push(`${company || 'unnamed'}: ${why}`);
            rejected.push({ company: company || 'unnamed', reason: why });
            continue;
          }
          if (byUrl.has(canonical)) {
            rejected.push({ company, reason: 'already recorded this run' });
            continue;
          }
          const now = new Date().toISOString();
          byUrl.set(canonical, {
            company,
            founder: str(input?.founder).trim() || 'Founding team',
            detail,
            source_type: 'web',
            source_url: canonical,
            profile_url: canonical,
            stage: str(input?.stage).trim(),
            location: str(input?.location).trim(),
            github_url: str(input?.github_url).trim(),
            raw_tags: [str(input?.sector).trim()].filter(Boolean),
            freshness_at: now,
            raw: { discovered_at: now, found_via: str(input?.source_url).trim(), sector: str(input?.sector).trim() },
          });
          recorded += 1;
        }

        return {
          status: 'ok',
          recorded,
          rejected: rejected.slice(0, 10),
          total_so_far: byUrl.size,
          remaining: Math.max(0, TARGET_COUNT - byUrl.size),
        };
      },
    });

    const rows = Array.from(byUrl.values());
    const upserted = await upsertSignals(rows);

    await logScrapeRun({
      status: 'ok',
      item_count: upserted,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      input_json: { sectors, target: TARGET_COUNT, since: sinceLabel, provider: 'orthogonal', skipped: skipped.slice(0, 40) },
    });

    return res.status(200).json({ ok: true, discovered: rows.length, upserted, skipped: skipped.length, sectors });
  } catch (err) {
    const message = err?.message ?? 'unknown';
    // The agent loop hit a wall (call limit, step limit, budget, timeout). Whatever
    // it verified before that point is still good data — save it rather than
    // discarding a two-minute run. Only a genuinely empty batch is a hard failure.
    const rows = Array.from(byUrl.values());
    let upserted = 0;
    let saveError = '';
    if (rows.length) {
      try {
        upserted = await upsertSignals(rows);
      } catch (saveErr) {
        saveError = saveErr?.message ?? 'upsert failed';
      }
    }

    await logScrapeRun({
      status: upserted ? 'partial' : 'error',
      item_count: upserted,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      error_text: `${message}${saveError ? ` | save: ${saveError}` : ''}`.slice(0, 500),
      input_json: { sectors, target: TARGET_COUNT, since: sinceLabel, provider: 'orthogonal', skipped: skipped.slice(0, 40) },
    });

    if (upserted) {
      return res.status(200).json({
        ok: true,
        partial: true,
        discovered: rows.length,
        upserted,
        sectors,
        note: `Scout stopped early (${message}) — saved what it verified.`,
      });
    }
    return res.status(500).json({ error: `ingest-signals failed: ${message}` });
  }
}
