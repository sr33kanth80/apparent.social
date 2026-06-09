// Apparent investor agent — Phase 0 ("deal-flow copilot over your own data").
//
// Server-side so the Anthropic API key never touches the browser. Runs a manual
// tool-use loop with a single tool, `search_apparent_founders`, that queries the
// public Apparent founder/launch data in Supabase. Later phases add web sourcing,
// contact enrichment, drafting, and in-app DM tools to this same loop.
//
// Request:  POST { messages: [{role:'user'|'assistant', content:string}], criteria }
// Response: { reply: string }  |  { error: string }
//
// Env: ANTHROPIC_API_KEY (required), VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
// (or SUPABASE_URL / SUPABASE_ANON_KEY) for the founder search tool.

import Anthropic from '@anthropic-ai/sdk';

const MODEL = 'claude-opus-4-8';
const MAX_TOKENS = 8192;
const MAX_TOOL_ITERATIONS = 5;

const SUPABASE_URL = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

// ---------- Supabase REST helpers (anon, public reads only) ----------

const sbSelect = async (table, query) => {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return [];
  const url = `${SUPABASE_URL}/rest/v1/${table}?${query}`;
  const res = await fetch(url, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
  });
  if (!res.ok) return [];
  return res.json();
};

const str = (v) => (v == null ? '' : String(v));

// ---------- Tool: search_apparent_founders ----------

const searchApparentFounders = async (input) => {
  const limit = Math.min(Math.max(Number(input?.limit) || 12, 1), 25);

  const [profiles, launches] = await Promise.all([
    sbSelect(
      'founder_profiles',
      'public_profile_enabled=eq.true&select=user_id,profile_name,headline,bio,current_build,category,stage,github,traction,mrr,looking_for,location,fundraising_status,raising_round,raising_amount,open_to_contact,updated_at&order=updated_at.desc&limit=300',
    ),
    sbSelect(
      'product_launches',
      'public_profile_enabled=eq.true&select=owner_id,name,tagline,category,stage,launch_url,metrics,updated_at&order=updated_at.desc&limit=500',
    ),
  ]);

  const launchesByOwner = new Map();
  for (const l of launches) {
    const owner = str(l.owner_id);
    if (!owner) continue;
    if (!launchesByOwner.has(owner)) launchesByOwner.set(owner, []);
    launchesByOwner.get(owner).push(l);
  }

  const wanted = {
    query: str(input?.query).toLowerCase().trim(),
    category: str(input?.category).toLowerCase().trim(),
    stage: str(input?.stage).toLowerCase().trim(),
    location: str(input?.location).toLowerCase().trim(),
    raisingOnly: input?.raising_only === true,
  };

  const cards = [];
  for (const p of profiles) {
    const owner = str(p.user_id);
    const ownLaunches = launchesByOwner.get(owner) || [];
    // Mirror the app's rule: only founders with a published launch are "on the radar".
    if (ownLaunches.length === 0) continue;

    const latest = ownLaunches[0];
    const category = str(p.category) || str(latest.category);
    const stage = str(p.stage) || str(latest.stage);
    const location = str(p.location);
    const fundraising = str(p.fundraising_status) || 'not_raising';
    const haystack = [
      str(p.profile_name), str(p.headline), str(p.bio), str(p.current_build),
      str(p.traction), str(p.looking_for), category, stage, location,
      ...ownLaunches.map((l) => `${str(l.name)} ${str(l.tagline)} ${str(l.metrics)}`),
    ].join(' ').toLowerCase();

    if (wanted.query && !haystack.includes(wanted.query)) continue;
    if (wanted.category && !category.toLowerCase().includes(wanted.category)) continue;
    if (wanted.stage && !stage.toLowerCase().includes(wanted.stage)) continue;
    if (wanted.location && !location.toLowerCase().includes(wanted.location)) continue;
    if (wanted.raisingOnly && !(fundraising === 'raising' || fundraising === 'open')) continue;

    cards.push({
      id: owner,
      name: str(p.profile_name) || `${str(latest.name)} builder`,
      company: str(latest.name),
      category,
      stage,
      location,
      traction: str(p.traction) || str(p.mrr) || str(latest.metrics),
      fundraising_status: fundraising,
      raising_round: str(p.raising_round),
      raising_amount: str(p.raising_amount),
      open_to_contact: p.open_to_contact !== false,
      github: str(p.github),
      launch_url: str(latest.launch_url),
      summary: str(p.bio) || str(p.headline) || str(p.current_build) || str(latest.tagline),
      launch_count: ownLaunches.length,
      profile_url: `/profile/${owner}`,
    });

    if (cards.length >= limit) break;
  }

  return { count: cards.length, founders: cards };
};

const TOOLS = [
  {
    name: 'search_apparent_founders',
    description:
      "Search founders who are live on Apparent (public profile + at least one published launch). Use this whenever the investor wants to find, surface, rank, count, or ask about builders/founders/deal flow. Returns structured founder records only — never invent founders not returned by this tool. All filters are optional; omit them to browse broadly.",
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Free-text keyword to match across name, summary, traction, category, and launches (e.g. "developer tools", "agents").' },
        category: { type: 'string', description: 'Filter by sector/category substring (e.g. "fintech", "AI").' },
        stage: { type: 'string', description: 'Filter by funding/company stage substring (e.g. "pre-seed", "seed").' },
        location: { type: 'string', description: 'Filter by city/location substring (e.g. "San Francisco", "Remote").' },
        raising_only: { type: 'boolean', description: 'When true, only return founders who declared they are actively raising or open to intros.' },
        limit: { type: 'number', description: 'Max founders to return (1-25, default 12).' },
      },
      required: [],
    },
  },
];

const runTool = async (name, input) => {
  if (name === 'search_apparent_founders') return searchApparentFounders(input);
  return { error: `Unknown tool: ${name}` };
};

// ---------- System prompt ----------

const buildSystemPrompt = (criteria) => {
  const c = criteria || {};
  const lines = [
    'You are Apparent\'s sourcing copilot for a venture investor (a VC or GP).',
    'Apparent is a platform where founders publish profiles and product launches, and investors discover thesis-fit deal flow.',
    '',
    'Your job right now: help this investor explore and reason about the founders who are live on Apparent. Answer questions about their deal flow, surface and rank thesis-fit founders, and explain WHY each one fits.',
    '',
    'The investor\'s saved thesis/criteria:',
    `- Thesis: ${str(c.thesis) || '(not set)'}`,
    `- Sectors: ${str(c.sectors) || '(not set)'}`,
    `- Stage: ${str(c.stage) || '(not set)'}`,
    `- Geography: ${str(c.geography) || '(not set)'}`,
    `- Founder signals they value: ${str(c.founderSignals) || '(not set)'}`,
    '',
    'Rules:',
    '- To find or discuss founders, ALWAYS call the search_apparent_founders tool. Ground every claim about a founder strictly in the tool results — never invent founders, metrics, or contact details.',
    '- When ranking, explain fit against the investor\'s thesis/sectors/stage/geography and the founder\'s proof (traction, launches, GitHub, raising intent).',
    '- Be concise and scannable. Prefer short founder call-outs (name — company — one-line why-it-fits) over long prose.',
    '- If the search returns nothing, say so plainly and suggest loosening a filter. Do not fabricate.',
    '- Scope note: you can currently search and reason over on-platform founders only. Sending messages, drafting outreach, and finding founders who are NOT yet on Apparent are coming soon — if asked, say those are on the way and not yet available.',
  ];
  return lines.join('\n');
};

// ---------- Handler ----------

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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(200).json({
      reply:
        "The agent isn't switched on yet — an ANTHROPIC_API_KEY needs to be set in the deployment environment. Once that's added, I can start sourcing founders against your thesis.",
    });
  }

  const body = await readJsonBody(req);
  const incoming = Array.isArray(body.messages) ? body.messages : [];
  const criteria = body.criteria || {};

  // Normalize to Anthropic message shape; keep only role + string content.
  const messages = incoming
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .slice(-20)
    .map((m) => ({ role: m.role, content: m.content }));

  if (messages.length === 0 || messages[messages.length - 1].role !== 'user') {
    return res.status(400).json({ error: 'Expected a non-empty conversation ending with a user message.' });
  }

  const client = new Anthropic();
  const system = buildSystemPrompt(criteria);

  try {
    let response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      thinking: { type: 'adaptive' },
      output_config: { effort: 'medium' },
      system,
      tools: TOOLS,
      messages,
    });

    let iterations = 0;
    while (response.stop_reason === 'tool_use' && iterations < MAX_TOOL_ITERATIONS) {
      iterations += 1;

      // Preserve the assistant turn verbatim (thinking + tool_use blocks) so the
      // loop stays coherent across tool calls.
      messages.push({ role: 'assistant', content: response.content });

      const toolResults = [];
      for (const block of response.content) {
        if (block.type === 'tool_use') {
          let result;
          try {
            result = await runTool(block.name, block.input);
          } catch (err) {
            result = { error: `Tool failed: ${err?.message ?? 'unknown error'}` };
          }
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: JSON.stringify(result),
          });
        }
      }

      messages.push({ role: 'user', content: toolResults });

      response = await client.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        thinking: { type: 'adaptive' },
        output_config: { effort: 'medium' },
        system,
        tools: TOOLS,
        messages,
      });
    }

    const reply = response.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();

    return res.status(200).json({ reply: reply || "I couldn't find anything to say about that — try rephrasing your question." });
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      return res.status(200).json({ reply: `The agent hit an API error (${err.status}). Please try again in a moment.` });
    }
    return res.status(500).json({ error: `Agent error: ${err?.message ?? 'unknown'}` });
  }
}
