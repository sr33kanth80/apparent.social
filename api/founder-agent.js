// Apparent founder agent — works FOR the founder to make them "Apparent" to the
// VCs already on Apparent. It never hunts for off-platform investors; it ranks
// on-platform investors the founder fits, drafts intros, and (via the client)
// amplifies the founder to thesis-matched investors.
//
// Mirrors api/agent.js: reads run server-side; actions (sending an intro DM,
// amplifying) are returned as intents and executed client-side as the
// authenticated founder (RLS-safe).
//
// Request:  POST { messages, founder, contacted? }
// Response: { reply, proposals, amplify }
//
// Env: ANTHROPIC_API_KEY (required), VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY.

import Anthropic from '@anthropic-ai/sdk';

const MODEL = 'claude-opus-4-8';
const MAX_TOKENS = 8192;
const MAX_AGENT_STEPS = 6;

const SUPABASE_URL = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

const str = (v) => (v == null ? '' : String(v));

const sbSelect = async (table, query) => {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return [];
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
  });
  if (!res.ok) return [];
  return res.json();
};

// ---------- Tool: find_matching_investors ----------

const significantTokens = (text) =>
  new Set(
    str(text)
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length >= 3),
  );

const findMatchingInvestors = async (input, founder) => {
  const limit = Math.min(Math.max(Number(input?.limit) || 12, 1), 20);

  // Public investors = investor profiles with a publicly-visible criteria row.
  const [profiles, criteria] = await Promise.all([
    sbSelect('profiles', "role=eq.investor&select=id,username,display_name,email"),
    sbSelect(
      'investor_criteria',
      'public_profile_enabled=eq.true&select=user_id,thesis,sectors,stage,check_size,geography,founder_signals',
    ),
  ]);

  const profileById = new Map((profiles || []).map((p) => [str(p.id), p]));

  // Build the founder's term set once for overlap ranking.
  const founderTerms = significantTokens(
    [
      str(founder?.category),
      str(founder?.sectors),
      str(founder?.headline),
      str(founder?.bio),
      str(founder?.currentBuild),
      str(founder?.traction),
      str(founder?.dossier),
      str(input?.query),
    ].join(' '),
  );

  const cards = [];
  for (const c of criteria || []) {
    const profile = profileById.get(str(c.user_id));
    if (!profile) continue;

    const investorTerms = significantTokens(`${str(c.sectors)} ${str(c.thesis)} ${str(c.geography)}`);
    let overlap = 0;
    founderTerms.forEach((t) => {
      if (investorTerms.has(t)) overlap += 1;
    });

    cards.push({
      id: str(c.user_id),
      name: str(profile.display_name) || str(profile.email).split('@')[0] || 'Investor on Apparent',
      username: str(profile.username),
      thesis: str(c.thesis),
      sectors: str(c.sectors),
      stage: str(c.stage),
      checkSize: str(c.check_size),
      geography: str(c.geography),
      founderSignals: str(c.founder_signals),
      overlap,
    });
  }

  // Optional sector filter, then rank by thesis overlap.
  const wantSector = str(input?.sector).toLowerCase().trim();
  const filtered = wantSector
    ? cards.filter((c) => `${c.sectors} ${c.thesis}`.toLowerCase().includes(wantSector))
    : cards;
  filtered.sort((a, b) => b.overlap - a.overlap);

  return { count: Math.min(filtered.length, limit), investors: filtered.slice(0, limit) };
};

const TOOLS = [
  {
    name: 'find_matching_investors',
    description:
      "Find investors who are ALREADY on Apparent and whose thesis fits this founder. Use whenever the founder wants to know which investors to target, who fits their thesis, or who to reach out to. Returns on-platform investors ranked by thesis overlap — never invent investors.",
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Optional keywords to focus the match (e.g. "devtools", "AI infra").' },
        sector: { type: 'string', description: 'Optional sector substring filter.' },
        limit: { type: 'number', description: 'Max investors to return (1-20, default 12).' },
      },
      required: [],
    },
  },
  {
    name: 'draft_intro',
    description:
      "Draft a short, personalized intro the founder can send to ONE on-platform investor (from find_matching_investors). Call once per investor when the founder wants to reach out. Write it in the founder's voice, grounded in their real work and why it maps to that investor's thesis — no placeholders. The founder reviews and sends each one.",
    input_schema: {
      type: 'object',
      properties: {
        investor_id: { type: 'string', description: 'The investor id from find_matching_investors.' },
        investor_name: { type: 'string', description: "The investor's name." },
        subject: { type: 'string', description: 'A short, specific subject line.' },
        body: { type: 'string', description: "The intro message — concise, personalized, in the founder's voice." },
      },
      required: ['investor_id', 'investor_name', 'body'],
    },
  },
  {
    name: 'amplify_to_investors',
    description:
      "Push this founder in front of every on-platform investor whose thesis they match — they each get a notification pointing to the founder's dossier. Call this when the founder wants to 'be put in front of investors', 'be discovered', or 'make me apparent'. Each matched investor is only ever notified once.",
    input_schema: { type: 'object', properties: {}, required: [] },
  },
];

const buildSystemPrompt = (founder, contactedIds) => {
  const f = founder || {};
  const contacted = Array.isArray(contactedIds) ? contactedIds.filter(Boolean) : [];
  return [
    "You are Apparent's agent that works FOR a founder. Your single mission: make this founder \"Apparent\" to the venture investors who are ALREADY on Apparent.",
    'You never search the open web or hunt for investors outside Apparent. You work the on-platform investor base: find the ones whose thesis fits, draft intros, and amplify the founder to matched investors.',
    '',
    "The founder's profile:",
    `- Name: ${str(f.name) || '(not set)'}`,
    `- Building: ${str(f.currentBuild) || str(f.headline) || '(not set)'}`,
    `- Category/sector: ${str(f.category) || '(not set)'}`,
    `- Stage: ${str(f.stage) || '(not set)'}`,
    `- Location: ${str(f.location) || '(not set)'}`,
    `- Traction: ${str(f.traction) || '(not set)'}`,
    `- Fundraising: ${str(f.fundraisingStatus) || 'not specified'}${f.raisingRound ? ` (${str(f.raisingRound)} ${str(f.raisingAmount)})` : ''}`,
    f.dossier ? `- GitHub dossier: ${str(f.dossier)}` : '- GitHub dossier: (not built yet — suggest connecting GitHub for a stronger profile)',
    '',
    contacted.length
      ? `- The founder has already messaged these investor ids — don't draft intros to them again: ${contacted.join(', ')}.`
      : '- The founder has not messaged any investors yet.',
    '',
    'Rules:',
    '- To discuss or target investors, ALWAYS call find_matching_investors and ground every claim in its results. Never invent investors, theses, or contact info.',
    "- Rank by real thesis/sector/stage/geography fit and explain WHY each investor fits this founder's work.",
    '- Call draft_intro (once per investor) only when the founder wants to reach out; skip investors already messaged.',
    "- Call amplify_to_investors when the founder wants to be discovered / put in front of investors. Tell them how many matched investors will be notified after.",
    '- Be concise and encouraging but honest. If the founder profile or dossier is thin, suggest concrete ways to strengthen it (connect GitHub, add traction, publish a launch).',
  ].join('\n');
};

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
      reply: "Your agent isn't switched on yet — an ANTHROPIC_API_KEY needs to be set. Once it is, I can find the investors who fit you and help you reach them.",
    });
  }

  const body = await readJsonBody(req);
  const incoming = Array.isArray(body.messages) ? body.messages : [];
  const founder = body.founder || {};
  const contactedIds = Array.isArray(body.contacted) ? body.contacted.map(String).slice(0, 200) : [];

  const messages = incoming
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .slice(-20)
    .map((m) => ({ role: m.role, content: m.content }));

  if (messages.length === 0 || messages[messages.length - 1].role !== 'user') {
    return res.status(400).json({ error: 'Expected a non-empty conversation ending with a user message.' });
  }

  const client = new Anthropic();
  const system = buildSystemPrompt(founder, contactedIds);
  const proposals = [];
  const seenInvestors = new Set();
  let amplifyRequested = false;

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

    while (steps < MAX_AGENT_STEPS && response.stop_reason === 'tool_use') {
      steps += 1;
      messages.push({ role: 'assistant', content: response.content });

      const toolResults = [];
      for (const block of response.content) {
        if (block.type !== 'tool_use') continue;

        let result;
        if (block.name === 'find_matching_investors') {
          try {
            result = await findMatchingInvestors(block.input, founder);
          } catch (err) {
            result = { error: `lookup_failed: ${err?.message ?? 'unknown'}` };
          }
        } else if (block.name === 'draft_intro') {
          const investorId = str(block.input?.investor_id);
          const investorName = str(block.input?.investor_name);
          const subject = str(block.input?.subject);
          const messageBody = str(block.input?.body);
          if (investorId && messageBody && !seenInvestors.has(investorId) && !contactedIds.includes(investorId)) {
            seenInvestors.add(investorId);
            proposals.push({ investorId, investorName, subject, body: messageBody });
            result = { status: 'queued', investor_id: investorId };
          } else {
            result = { status: 'skipped', reason: 'duplicate, already-messaged, or missing fields' };
          }
        } else if (block.name === 'amplify_to_investors') {
          amplifyRequested = true;
          result = { status: 'queued', note: 'Matched investors will be notified.' };
        } else {
          result = { error: `Unknown tool: ${block.name}` };
        }

        toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify(result) });
      }

      if (toolResults.length === 0) break;
      messages.push({ role: 'user', content: toolResults });
      response = await callModel();
    }

    const reply = response.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();

    return res.status(200).json({
      reply: reply || "I couldn't find anything to say about that — try rephrasing.",
      proposals,
      amplify: amplifyRequested,
    });
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      return res.status(200).json({ reply: `The agent hit an API error (${err.status}). Please try again in a moment.` });
    }
    return res.status(500).json({ error: `Agent error: ${err?.message ?? 'unknown'}` });
  }
}
