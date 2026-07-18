// Apparent investor agent — Phase 0 ("deal-flow copilot over your own data").
//
// Server-side Apparent agent. Apparent owns orchestration, memory, permissions,
// and actions; Orthogonal supplies replaceable inference and external data.
//
// Request:  POST { messages: [{role:'user'|'assistant', content:string}], criteria }
// Response: { reply: string }  |  { error: string }
//
// Env: ORTHOGONAL_API_KEY (required), VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
// (or SUPABASE_URL / SUPABASE_ANON_KEY) for the founder search tool.

import { requireAgentAccess, sendAgentAccessError } from '../server/agent/agent-guard.js';
import {
  apparentAgentErrorResponse,
  createApparentAgentRuntime,
  createPublicResearchPolicy,
  logApparentAgentError,
  runStandardOrthogonalTool,
  standardOrthogonalTools,
} from '../server/agent/apparent-agent-runtime.js';
import { orthogonalData } from '../server/agent/orthogonal.js';
import kindeProfileHandler from '../server/agent/kinde-profile.js';

// Covers multi-step first-party and Orthogonal tool execution.
const MAX_AGENT_STEPS = 12;

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

const INVESTOR_PROFILE_FIELDS = new Set([
  'thesis',
  'sectors',
  'stage',
  'checkSize',
  'geography',
  'founderSignals',
  'passSignals',
  'portfolioExamples',
  'publicProfileEnabled',
  'publicFields',
  'shareable',
]);

const arr = (v) => (Array.isArray(v) ? v.map(str).filter(Boolean) : []);
const confidence = (v) => (v === 'low' || v === 'high' ? v : 'medium');

const formatMemories = (memories) => {
  const rows = Array.isArray(memories) ? memories.slice(0, 30) : [];
  if (rows.length === 0) return '- None yet.';
  return rows
    .map((memory) => {
      const source = str(memory?.sourceUrl);
      const confidenceLabel = str(memory?.confidence) || 'medium';
      return `- ${str(memory?.scope) || 'profile'}:${str(memory?.key)} = ${str(memory?.value)} (${confidenceLabel}${source ? `, source: ${source}` : ''})`;
    })
    .join('\n');
};

const extractUrls = (text) =>
  Array.from(str(text).matchAll(/https?:\/\/[^\s)>"']+/gi)).map((match) =>
    match[0].replace(/[.,;!?]+$/, ''),
  );

const analyzeSourceIngestion = (text) => {
  const urls = Array.from(new Set(extractUrls(text)));
  const likelyLimited = urls.filter((url) => /(^https?:\/\/)?([^/]+\.)?(linkedin\.com|x\.com|twitter\.com)\//i.test(url));
  const hasPastedText = str(text).replace(/https?:\/\/[^\s)>"']+/gi, '').trim().length >= 240;
  const asksProfileSetup = /\b(set\s*up|setup|fill|import|complete|update|edit|build)\b/i.test(text)
    && /\b(profile|criteria|thesis|bio|about me|firm page|team page|linkedin|links?)\b/i.test(text);

  const brief = !urls.length && !hasPastedText && !asksProfileSetup
    ? '- No explicit source-ingestion request detected in the latest user message.'
    : [
        asksProfileSetup
          ? '- Latest user message appears to ask for profile setup/update from external context.'
          : '- Latest user message includes possible source material.',
        urls.length ? `- URLs supplied: ${urls.join(', ')}` : '- URLs supplied: none.',
        likelyLimited.length
          ? `- Potentially limited/blocked sources: ${likelyLimited.join(', ')}. Try them if useful, but do not rely on them; if unreadable, say so and ask for another source or pasted text.`
          : '- No obviously limited source domains detected.',
        hasPastedText
          ? '- The message includes substantial pasted text; use it as a first-class source even if URLs fail.'
          : '- No substantial pasted text detected.',
      ].join('\n');

  return { urls, likelyLimited, hasPastedText, asksProfileSetup, brief };
};

const buildInvestorProfilePatch = (input, current) => {
  const fields = Array.isArray(input?.fields) ? input.fields : [];
  const patchFields = fields
    .map((field) => {
      const key = str(field?.field);
      const newValue = str(field?.newValue).trim();
      if (!INVESTOR_PROFILE_FIELDS.has(key) || !newValue) return null;
      return {
        field: key,
        label: str(field?.label),
        oldValue: str(current?.[key]),
        newValue,
        reason: str(field?.reason) || 'Inferred from the provided source material.',
        sourceUrl: str(field?.sourceUrl),
        confidence: confidence(field?.confidence),
      };
    })
    .filter(Boolean);

  return {
    role: 'investor',
    summary: str(input?.summary) || 'I drafted updates to your investor profile from the available source material.',
    sourceUrls: arr(input?.sourceUrls),
    unavailableSources: arr(input?.unavailableSources),
    fields: patchFields,
  };
};

// ---------- Tool: search_apparent_founders ----------

const searchApparentFounders = async (input) => {
  const limit = Math.min(Math.max(Number(input?.limit) || 12, 1), 25);

  const [profiles, launches] = await Promise.all([
    sbSelect(
      'founder_profiles',
      'public_profile_enabled=eq.true&select=user_id,profile_name,headline,bio,current_build,category,stage,github,traction,mrr,looking_for,location,fundraising_status,raising_round,raising_amount,open_to_contact,github_verified,agent_dossier,github_summary,updated_at&order=updated_at.desc&limit=300',
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
      // Founder-agent enrichment: a GitHub-grounded dossier the founder agent
      // wrote. High-signal — prefer it when explaining fit.
      dossier: str(p.agent_dossier),
      github_summary: str(p.github_summary),
      github_verified: p.github_verified === true,
      launch_count: ownLaunches.length,
      profile_url: `/profile/${owner}`,
    });

    if (cards.length >= limit) break;
  }

  return { count: cards.length, founders: cards };
};

// ---------- Tool: enrich_contact (off-platform, hybrid) ----------
// Contact enrichment is routed through Orthogonal's Tomba adapter.

const enrichContact = async (input, session) => {
  const name = str(input?.name).trim();
  const company = str(input?.company).trim();
  const domain = str(input?.domain).trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  if (!domain) return { status: 'domain_required', guidance: 'Research the company domain first, then retry contact enrichment.' };

  const [firstName, ...lastParts] = name.split(/\s+/).filter(Boolean);
  const query = { domain };
  if (firstName) query.first_name = firstName;
  if (lastParts.length) query.last_name = lastParts.join(' ');
  const data = orthogonalData(await session.run({ api: 'tomba', path: '/v1/email-finder', query }));
  const record = data?.data?.email ?? data?.email ?? data?.data ?? data;
  const email = str(record?.email).trim();
  return email
    ? { provider: 'tomba-via-orthogonal', email, confidence: record?.score ?? record?.confidence ?? null, name, company }
    : { provider: 'tomba-via-orthogonal', status: 'not_found', name, company, domain };
};

const TOOLS = [
  // Orthogonal-backed public tools source founders who are not on Apparent.
  ...standardOrthogonalTools,
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
  {
    name: 'propose_investor_profile_update',
    description:
      "Draft a structured, reviewable patch to the investor's Apparent profile/criteria from URLs, public-source findings, or pasted text. Use this when the investor asks you to set up, fill, import, update, or complete their profile from sources like a firm page, team bio, personal site, LinkedIn, blogs, podcasts, or pasted text. If a URL cannot be read (LinkedIn often cannot), include it in unavailableSources, use whatever other sources or pasted text are available, and say plainly what could not be accessed. Never invent unsupported facts.",
    input_schema: {
      type: 'object',
      properties: {
        summary: { type: 'string', description: 'One-sentence summary of what this patch updates and what sources were usable.' },
        sourceUrls: { type: 'array', items: { type: 'string' }, description: 'URLs that supported the proposed fields.' },
        unavailableSources: { type: 'array', items: { type: 'string' }, description: 'URLs the agent could not read directly.' },
        fields: {
          type: 'array',
          description: 'Profile fields to update. Only include supported, source-backed fields.',
          items: {
            type: 'object',
            properties: {
              field: {
                type: 'string',
                enum: ['thesis', 'sectors', 'stage', 'checkSize', 'geography', 'founderSignals', 'passSignals', 'portfolioExamples', 'publicProfileEnabled', 'publicFields', 'shareable'],
              },
              label: { type: 'string' },
              newValue: { type: 'string' },
              reason: { type: 'string' },
              sourceUrl: { type: 'string' },
              confidence: { type: 'string', enum: ['low', 'medium', 'high'] },
            },
            required: ['field', 'newValue', 'reason'],
          },
        },
      },
      required: ['fields'],
    },
  },
  {
    name: 'propose_outreach',
    description:
      "Draft a personalized first-touch outreach message to ONE on-platform founder and queue it for the investor. Call this once per founder when the investor asks to reach out to / contact / message / DM founders. Only propose outreach to founders returned by search_apparent_founders who are open to contact and have NOT already been contacted by this investor. Write the message in the investor's voice, grounded in the founder's real proof and the investor's thesis. Depending on the investor's autonomy setting, the message is either sent automatically as an in-app DM or shown to the investor to approve first.",
    input_schema: {
      type: 'object',
      properties: {
        founder_id: { type: 'string', description: 'The exact id of the founder from search_apparent_founders results.' },
        founder_name: { type: 'string', description: 'The founder\'s display name.' },
        subject: { type: 'string', description: 'A short, specific subject line.' },
        body: { type: 'string', description: 'The outreach message body — concise, personalized, referencing the founder\'s actual work and why it fits the thesis. No placeholders like [name].' },
      },
      required: ['founder_id', 'founder_name', 'body'],
    },
  },
  {
    name: 'enrich_contact',
    description:
      "Find a public contact for an OFF-PLATFORM founder (one NOT on Apparent). If an enrichment vendor is configured it is queried; otherwise you'll get guidance to use web_search/web_fetch. Use this after you've identified a promising off-platform founder via web_search and want their email before drafting an intro.",
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: "The founder's full name." },
        company: { type: 'string', description: "The founder's company/startup name." },
        domain: { type: 'string', description: "The company's website domain if known (e.g. acme.com), which greatly improves email lookup." },
      },
      required: ['name'],
    },
  },
  {
    name: 'prepare_mailto',
    description:
      "Queue a ready-to-send intro EMAIL draft for an OFF-PLATFORM founder (not on Apparent). The investor sends it from their own email client — off-platform outreach is ALWAYS draft-to-inbox and is never sent automatically, regardless of the autonomy setting. Provide a public to_email if you found one; leave it empty if you only have a social handle (mention the handle in the body).",
    input_schema: {
      type: 'object',
      properties: {
        founder_name: { type: 'string', description: "The founder's name." },
        company: { type: 'string', description: 'The startup/company name.' },
        to_email: { type: 'string', description: 'A public contact email if found; otherwise omit.' },
        subject: { type: 'string', description: 'A short, specific subject line.' },
        body: { type: 'string', description: "The email body — concise, personalized, in the investor's voice, grounded in what you actually found about the founder. No placeholders." },
        source_url: { type: 'string', description: 'A public URL where you found this founder/contact (for the investor to verify).' },
      },
      required: ['founder_name', 'body'],
    },
  },
];

const runTool = async (name, input, session) => {
  if (name === 'search_apparent_founders') return searchApparentFounders(input);
  if (name === 'enrich_contact') return enrichContact(input, session);
  return { error: `Unknown tool: ${name}` };
};

// ---------- System prompt ----------

const autonomyGuidance = (autonomy) => {
  if (autonomy === 'auto_onplatform' || autonomy === 'autonomous') {
    return 'Auto-send is ON: any outreach you propose will be sent automatically as an in-app DM. Be selective and only propose outreach to genuinely strong thesis fits. Tell the investor you have sent the messages.';
  }
  return 'Auto-send is OFF (draft & approve): outreach you propose is shown to the investor to review and send. Tell the investor you have drafted messages for their approval.';
};

const buildSystemPrompt = (criteria, autonomy, contactedIds, memories, sourceBrief) => {
  const c = criteria || {};
  const contacted = Array.isArray(contactedIds) ? contactedIds.filter(Boolean) : [];
  const lines = [
    'You are Apparent\'s sourcing copilot for a venture investor (a VC or GP).',
    'Apparent is a platform where founders publish profiles and product launches, and investors discover thesis-fit deal flow.',
    '',
    'Your job: help this investor explore thesis-fit founders, explain WHY each fits, and — when asked — draft and queue personalized outreach. You work two sources: founders already on Apparent, and founders out on the open web who are NOT yet on Apparent.',
    '',
    'The investor\'s saved thesis/criteria:',
    `- Thesis: ${str(c.thesis) || '(not set)'}`,
    `- Sectors: ${str(c.sectors) || '(not set)'}`,
    `- Stage: ${str(c.stage) || '(not set)'}`,
    `- Geography: ${str(c.geography) || '(not set)'}`,
    `- Founder signals they value: ${str(c.founderSignals) || '(not set)'}`,
    '',
    'Durable agent memory for this investor:',
    formatMemories(memories),
    '',
    'Latest source-ingestion brief:',
    sourceBrief,
    '',
    'Outreach mode:',
    `- ${autonomyGuidance(autonomy)}`,
    contacted.length
      ? `- The investor has ALREADY contacted these founder ids — never propose outreach to them again: ${contacted.join(', ')}.`
      : '- The investor has not contacted anyone yet.',
    '',
    'ON-PLATFORM founders (already on Apparent):',
    '- Find/discuss them with search_apparent_founders. Ground every claim strictly in tool results — never invent founders, metrics, or contact details.',
    '- To reach out, call propose_outreach (one per founder), only for founders that are open_to_contact and not already-contacted. These become in-app DMs, sent per the outreach mode above.',
    '',
    'OFF-PLATFORM founders (out on the web, not on Apparent):',
    '- When the investor wants founders beyond Apparent ("not on Apparent", "from the web", "find more like this", broad sourcing), use search_public_web to find real startups/founders matching the thesis, and fetch_public_url to read their site/profile for detail. Only surface real, verifiable results and cite the source URL.',
    '- To get a contact, call enrich_contact. Never invent an email; only use one returned by the tool.',
    '- To reach out, call prepare_mailto. OFF-PLATFORM outreach is ALWAYS a draft the investor sends from their own inbox — it is NEVER auto-sent, regardless of the autonomy setting. If you only found a social handle, leave to_email empty and put the handle in the body.',
    '',
    'General rules:',
    '- When the investor asks you to set up, import, complete, or update their Apparent profile from links or pasted text, use fetch_public_url/search_public_web where helpful, then call propose_investor_profile_update with a structured patch. Do not claim LinkedIn or any source was read if it was not; list inaccessible URLs as unavailable sources and ask for alternate links or pasted text when needed.',
    "- Some on-platform founders have a `dossier` field — a GitHub-grounded profile written by the founder's own agent. When present, treat it as high-signal and lean on it (and `github_summary` / `github_verified`) when explaining fit and writing outreach.",
    '- Default to on-platform founders first; reach to the web when the investor asks to go broader or for founders not yet on Apparent.',
    '- When ranking, explain fit against thesis/sectors/stage/geography and real proof (traction, launches, GitHub, raising intent).',
    '- Format every reply in GitHub-flavored markdown. Lead with one short sentence, then bullet lists with founder names in bold (e.g. "- **Jane Doe** — Acme: one-line why-it-fits"). Use ### headings only when a reply has distinct sections, and markdown links instead of raw URLs. Be concise and scannable — no walls of prose.',
    '- If a search returns nothing, say so plainly and suggest loosening a filter. Never fabricate founders, metrics, emails, or links.',
  ];
  return lines.join('\n');
};

// ---------- Handler ----------

// Vercel Node functions buffer responses unless streaming is opted into.
export const config = { supportsResponseStreaming: true };

/** Human-readable progress label for a tool call, streamed to the client. */
const toolStatusLabel = (name, input) => {
  if (name === 'search_apparent_founders') {
    const q = str(input?.query).trim();
    return q ? `Searching Apparent founders for “${q.slice(0, 60)}”…` : 'Searching founders on Apparent…';
  }
  if (name === 'search_public_web') return `Searching the web for “${str(input?.query).trim().slice(0, 60)}”…`;
  if (name === 'fetch_public_url') {
    try {
      return `Reading ${new URL(str(input?.url)).hostname}…`;
    } catch {
      return 'Reading a source…';
    }
  }
  if (name === 'enrich_contact') return `Finding contact details${input?.name ? ` for ${str(input.name)}` : ''}…`;
  if (name === 'propose_outreach') return `Drafting outreach to ${str(input?.founder_name) || 'a founder'}…`;
  if (name === 'prepare_mailto') return `Drafting an intro email${input?.founder_name ? ` to ${str(input.founder_name)}` : ''}…`;
  if (name === 'propose_investor_profile_update') return 'Drafting profile updates…';
  return 'Working…';
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
  if (req.query?.route === 'kinde-profile') {
    return kindeProfileHandler(req, res);
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.ORTHOGONAL_API_KEY) {
    return res.status(200).json({
      reply: "The Apparent agent isn't switched on yet — ORTHOGONAL_API_KEY needs to be set in the deployment environment.",
    });
  }

  const access = await requireAgentAccess(req, 'investor', 'investor-agent');
  if (!access.ok) return sendAgentAccessError(res, access);

  const body = await readJsonBody(req);
  const incoming = Array.isArray(body.messages) ? body.messages : [];
  const criteria = body.criteria || {};
  const memories = Array.isArray(body.memories) ? body.memories : [];
  const autonomy = body.autonomy === 'auto_onplatform' || body.autonomy === 'autonomous' ? body.autonomy : 'manual';
  const contactedIds = Array.isArray(body.contacted) ? body.contacted.map(String).slice(0, 200) : [];

  // Keep a bounded, text-only history. The Apparent runtime owns provider conversion.
  const messages = incoming
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .slice(-20)
    .map((m) => ({ role: m.role, content: m.content }));

  if (messages.length === 0 || messages[messages.length - 1].role !== 'user') {
    return res.status(400).json({ error: 'Expected a non-empty conversation ending with a user message.' });
  }

  const sourceAnalysis = analyzeSourceIngestion(messages[messages.length - 1]?.content || '');
  const latestUserMessage = messages[messages.length - 1].content;
  const publicResearchPolicy = createPublicResearchPolicy({
    publicContext: [latestUserMessage, ...sourceAnalysis.urls].join(' '),
  });
  const publicResearchIntent = /\b(?:off[- ]platform|outside apparent|public (?:web|source)|web search|research online|look up|source (?:founders|startups)|not on apparent)\b/i.test(latestUserMessage) ||
    (sourceAnalysis.asksProfileSetup && (sourceAnalysis.urls.length > 0 || /\b(?:public|web|website|source|look up|research)\b/i.test(latestUserMessage)));
  const priorAssistantMessage = [...messages].reverse().find((message) => message.role === 'assistant')?.content || '';
  const confirmsPriorAction = /^\s*(?:yes|approved?|confirm(?:ed)?|do it|go ahead|proceed|send (?:it|them)|make it happen)\b/i.test(latestUserMessage);
  const actionDenied = /\b(?:do not|don't|dont|never|not yet|hold off|without (?:sending|contacting|messaging)|research only|just research)\b/i.test(latestUserMessage);
  const sendPattern = /\b(?:reach out to|introduce me to|connect me with|write to)\b|\b(?:contact|message|dm|e-?mail)\s+(?!list\b|details\b|info(?:rmation)?\b|history\b|summary\b)\w+|\bsend\b.{0,50}\b(?:message|dm|e-?mail|intro|outreach)\s+to\b|\bsend\s+(?:them|him|her|these founders|those founders|the founder)\b/i;
  const draftPattern = /\b(?:draft|write|prepare|compose)\b.{0,40}\b(?:outreach|message|dm|e-?mail|intro)\b/i;
  const asksOnly = /\b(?:who|which|should|could|would|can)\b.{0,40}\b(?:contact|message|e-?mail|reach out)\b[^.!]*\?/i.test(latestUserMessage);
  const sendsToSelf = /\b(?:send|message|dm|e-?mail)\b[\s\S]*\b(?:me|myself)\b/i.test(latestUserMessage);
  const explicitFounderOutreach = /\b(?:reach out to|contact|message|dm|e-?mail|write to)\s+(?:(?:these|those|the|all|each|our)\s+)?(?:founder|founders|builder|builders|them|him|her)\b|\bsend\b.{0,50}\b(?:message|dm|e-?mail|intro|outreach)\s+to\s+(?:(?:these|those|the|all|each|our)\s+)?(?:founder|founders|builder|builders|them|him|her)\b|\bsend\s+(?:them|him|her|these founders|those founders|the founder)\b/i.test(latestUserMessage);
  const confirmedOutreach = confirmsPriorAction && /\b(?:send|reach out|contact)\b/i.test(priorAssistantMessage);
  const sendIntent = !actionDenied && !asksOnly && !sendsToSelf && sendPattern.test(latestUserMessage);
  const draftIntent = !actionDenied && (draftPattern.test(latestUserMessage) || confirmedOutreach);
  const system = buildSystemPrompt(criteria, autonomy, contactedIds, memories, sourceAnalysis.brief);
  const proposals = []; // on-platform DM proposals
  const emailDrafts = []; // off-platform mailto drafts
  const profilePatches = []; // reviewable profile edits
  const seenProposalFounders = new Set();
  const seenEmailKeys = new Set();

  // SSE progress streaming, opted into by the client. Validation errors above
  // stay plain JSON; the stream only starts once the agent loop is about to run.
  let streaming = false;
  const emit = (payload) => {
    if (!streaming) return;
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };
  if (body.stream === true) {
    streaming = true;
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.flushHeaders?.();
    emit({ type: 'status', label: 'Thinking…' });
  }

  try {
    const runtime = createApparentAgentRuntime();
    const runtimeResult = await runtime.run({
      system,
      messages,
      tools: TOOLS,
      maxSteps: MAX_AGENT_STEPS,
      maxTokens: 4096,
      authorizeTool: (name) => {
        if (name === 'search_public_web' || name === 'fetch_public_url') return publicResearchIntent;
        if (name === 'propose_investor_profile_update') return sourceAnalysis.asksProfileSetup && !actionDenied;
        if (name === 'propose_outreach') return autonomy === 'manual' ? sendIntent || draftIntent : sendIntent && explicitFounderOutreach;
        if (name === 'prepare_mailto') return sendIntent || draftIntent;
        return true;
      },
      executeTool: async (name, input, { session }) => {
        emit({ type: 'status', label: toolStatusLabel(name, input) });
        const external = await runStandardOrthogonalTool(session, name, input, publicResearchPolicy);
        if (external !== null) return external;
        let result;
        if (name === 'propose_investor_profile_update') {
          const patch = buildInvestorProfilePatch(input, criteria);
          if (patch.fields.length > 0) {
            profilePatches.push(patch);
            result = { status: 'drafted', fields: patch.fields.map((field) => field.field) };
          } else {
            result = { status: 'skipped', reason: 'No supported profile fields were proposed.' };
          }
        } else if (name === 'propose_outreach') {
          // On-platform DM — side-effect-free; the client performs the RLS-safe send.
          const founderId = str(input?.founder_id);
          const founderName = str(input?.founder_name);
          const subject = str(input?.subject);
          const messageBody = str(input?.body);
          if (founderId && messageBody && !seenProposalFounders.has(founderId) && !contactedIds.includes(founderId)) {
            seenProposalFounders.add(founderId);
            proposals.push({ founderId, founderName, subject, body: messageBody });
            result = { status: 'queued', founder_id: founderId };
          } else {
            result = { status: 'skipped', reason: 'duplicate, already-contacted, or missing fields' };
          }
        } else if (name === 'prepare_mailto') {
          // Off-platform email — always a draft for the investor's own inbox.
          const founderName = str(input?.founder_name);
          const company = str(input?.company);
          const toEmail = str(input?.to_email);
          const subject = str(input?.subject);
          const draftBody = str(input?.body);
          const key = (toEmail || `${founderName}|${company}`).toLowerCase();
          if (draftBody && !seenEmailKeys.has(key)) {
            seenEmailKeys.add(key);
            emailDrafts.push({
              founderName,
              company,
              toEmail,
              subject,
              body: draftBody,
              sourceUrl: str(input?.source_url),
            });
            result = { status: 'drafted', note: 'Shown to the investor to send from their own inbox.' };
          } else {
            result = { status: 'skipped', reason: 'duplicate or missing body' };
          }
        } else {
          try {
            result = await runTool(name, input, session);
          } catch (err) {
            result = { error: `Tool failed: ${err?.message ?? 'unknown error'}` };
          }
        }
        return result;
      },
    });

    let reply = runtimeResult.reply.trim();

    if (sourceAnalysis.asksProfileSetup && profilePatches.length === 0) {
      const sourceNote = sourceAnalysis.likelyLimited.length
        ? `I could not turn those sources into a profile draft yet. Some supplied sources may be hard to read directly (${sourceAnalysis.likelyLimited.join(', ')}). Send another public firm/team page or paste the relevant bio/thesis text here, and I can use that instead.`
        : 'I could not turn the supplied context into a profile draft yet. Send another public source or paste the relevant bio/thesis text here, and I can use that instead.';
      if (!reply.includes(sourceNote)) reply = `${reply ? `${reply}\n\n` : ''}${sourceNote}`;
    }

    const responsePayload = {
      reply: reply || "I couldn't find anything to say about that — try rephrasing your question.",
      proposals,
      emailDrafts,
      profilePatches,
    };
    if (streaming) {
      emit({ type: 'done', ...responsePayload });
      return res.end();
    }
    return res.status(200).json(responsePayload);
  } catch (err) {
    logApparentAgentError(err, 'investor-agent');
    const failure = apparentAgentErrorResponse(err);
    if (streaming) {
      emit({ type: 'error', error: failure.error, code: failure.code });
      return res.end();
    }
    return res.status(failure.status).json({ error: failure.error, code: failure.code });
  }
}
