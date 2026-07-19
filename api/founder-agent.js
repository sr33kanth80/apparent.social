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
// Env: ORTHOGONAL_API_KEY (required), VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY.

import { requireAgentAccess, sendAgentAccessError } from '../server/agent/agent-guard.js';
import {
  apparentAgentErrorResponse,
  createAgentSse,
  createApparentAgentRuntime,
  createPublicResearchPolicy,
  logApparentAgentError,
  runStandardOrthogonalTool,
  standardOrthogonalTools,
  toolStatusLabel,
} from '../server/agent/apparent-agent-runtime.js';

// Vercel Node functions buffer responses unless streaming is opted into.
export const config = { supportsResponseStreaming: true };

// The Apparent runtime owns the tool loop; inference is replaceable behind Orthogonal.
const MAX_AGENT_STEPS = 6;

const SUPABASE_URL = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

const str = (v) => (v == null ? '' : String(v));

const FOUNDER_PROFILE_FIELDS = new Set([
  'profileName',
  'headline',
  'bio',
  'currentBuild',
  'category',
  'stage',
  'github',
  'traction',
  'lookingFor',
  'location',
  'press',
  'website',
  'linkedin',
  'xProfile',
  'pastProducts',
  'mrr',
  'tractionType',
  'tractionValue',
  'teamSize',
  'priorRaiseAmount',
  'targetCloseDate',
  'fundraisingStatus',
  'raisingRound',
  'raisingAmount',
  'raisingAsk',
  'openToContact',
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
    && /\b(profile|bio|about me|github|product|launch|website|linkedin|links?|deck|traction)\b/i.test(text);

  const brief = !urls.length && !hasPastedText && !asksProfileSetup
    ? '- No explicit source-ingestion request detected in the latest user message.'
    : [
        asksProfileSetup
          ? '- Latest user message appears to ask for founder profile setup/update from external context.'
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

const buildFounderProfilePatch = (input, current) => {
  const fields = Array.isArray(input?.fields) ? input.fields : [];
  const patchFields = fields
    .map((field) => {
      const key = str(field?.field);
      const newValue = str(field?.newValue).trim();
      if (!FOUNDER_PROFILE_FIELDS.has(key) || !newValue) return null;
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
    role: 'founder',
    summary: str(input?.summary) || 'I drafted updates to your founder profile from the available source material.',
    sourceUrls: arr(input?.sourceUrls),
    unavailableSources: arr(input?.unavailableSources),
    fields: patchFields,
  };
};

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
  // Server-side tools are only for reading the founder's own supplied/public
  // sources during profile setup. Investor targeting stays on-platform.
  ...standardOrthogonalTools,
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
    name: 'propose_founder_profile_update',
    description:
      "Draft a structured, reviewable patch to the founder's Apparent profile from URLs, public-source findings, or pasted text. Use this when the founder asks you to set up, fill, import, update, or complete their profile from sources like GitHub, a product site, personal site, LinkedIn, launch page, deck text, blogs, or pasted text. If a URL cannot be read, include it in unavailableSources, use whatever other sources or pasted text are available, and say plainly what could not be accessed. Never invent unsupported facts.",
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
                enum: ['profileName', 'headline', 'bio', 'currentBuild', 'category', 'stage', 'github', 'traction', 'lookingFor', 'location', 'press', 'website', 'linkedin', 'xProfile', 'pastProducts', 'mrr', 'tractionType', 'tractionValue', 'teamSize', 'priorRaiseAmount', 'targetCloseDate', 'fundraisingStatus', 'raisingRound', 'raisingAmount', 'raisingAsk', 'openToContact', 'shareable'],
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

const buildSystemPrompt = (founder, contactedIds, memories, sourceBrief) => {
  const f = founder || {};
  const contacted = Array.isArray(contactedIds) ? contactedIds.filter(Boolean) : [];
  return [
    "You are Apparent's agent that works FOR a founder. Your single mission: make this founder \"Apparent\" to the venture investors who are ALREADY on Apparent.",
    'You never use the open web to hunt for investors outside Apparent. You work the on-platform investor base: find the ones whose thesis fits, draft intros, and amplify the founder to matched investors.',
    'You may use fetch_public_url/search_public_web only when the founder asks you to set up, import, complete, or update their own Apparent profile from supplied links, public sources, or pasted text. If LinkedIn or any source cannot be read, say so plainly, list it as unavailable in the patch, and ask for another link or pasted text.',
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
    'Durable agent memory for this founder:',
    formatMemories(memories),
    '',
    'Latest source-ingestion brief:',
    sourceBrief,
    '',
    contacted.length
      ? `- The founder has already messaged these investor ids — don't draft intros to them again: ${contacted.join(', ')}.`
      : '- The founder has not messaged any investors yet.',
    '',
    'Rules:',
    '- For profile setup or profile edits from links/pasted text, call propose_founder_profile_update with source-backed fields. Do not claim any URL was read if it was not.',
    '- To discuss or target investors, ALWAYS call find_matching_investors and ground every claim in its results. Never invent investors, theses, or contact info.',
    "- Rank by real thesis/sector/stage/geography fit and explain WHY each investor fits this founder's work.",
    '- Call draft_intro (once per investor) only when the founder wants to reach out; skip investors already messaged.',
    "- Call amplify_to_investors when the founder wants to be discovered / put in front of investors. Tell them how many matched investors will be notified after.",
    '- Format every reply in GitHub-flavored markdown. Lead with one short sentence, then bullet lists with investor names in bold (e.g. "- **Jane Doe** — Fund: one-line why they fit you"). Use ### headings only when a reply has distinct sections, and markdown links instead of raw URLs. Be concise and scannable — no walls of prose.',
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

  if (!process.env.ORTHOGONAL_API_KEY) {
    return res.status(200).json({
      reply: "The Apparent agent isn't switched on yet — ORTHOGONAL_API_KEY needs to be set.",
    });
  }

  const access = await requireAgentAccess(req, 'founder', 'founder-agent');
  if (!access.ok) return sendAgentAccessError(res, access);

  const body = await readJsonBody(req);
  const incoming = Array.isArray(body.messages) ? body.messages : [];
  const founder = body.founder || {};
  const memories = Array.isArray(body.memories) ? body.memories : [];
  const contactedIds = Array.isArray(body.contacted) ? body.contacted.map(String).slice(0, 200) : [];

  const messages = incoming
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .slice(-20)
    .map((m) => ({ role: m.role, content: m.content }));

  if (messages.length === 0 || messages[messages.length - 1].role !== 'user') {
    return res.status(400).json({ error: 'Expected a non-empty conversation ending with a user message.' });
  }

  const sourceAnalysis = analyzeSourceIngestion(messages[messages.length - 1]?.content || '');
  const latestUserMessage = messages[messages.length - 1].content;
  // Feed the whole conversation, the founder's profile, and agent memories into
  // the research policy so authorized web research can use the founder's own
  // terms, not just words from the latest message.
  const publicResearchPolicy = createPublicResearchPolicy({
    publicContext: [
      ...messages.map((m) => m.content),
      ...Object.values(founder || {}).map(str),
      ...memories.map((memory) => `${str(memory?.key)} ${str(memory?.value)}`),
      ...sourceAnalysis.urls,
    ].join(' '),
  });
  const publicResearchIntent = sourceAnalysis.asksProfileSetup && (
    sourceAnalysis.urls.length > 0 || /\b(?:public|web|website|github|linkedin|source|look up|research)\b/i.test(latestUserMessage)
  );
  const priorAssistantMessage = [...messages].reverse().find((message) => message.role === 'assistant')?.content || '';
  const confirmsPriorAction = /^\s*(?:yes|approved?|confirm(?:ed)?|do it|go ahead|proceed|send (?:it|them)|make it happen)\b/i.test(latestUserMessage);
  const actionDenied = /\b(?:do not|don't|dont|never|not yet|hold off|without (?:sending|contacting|messaging|notifying)|research only|just research)\b/i.test(latestUserMessage);
  const introPattern = /\b(?:reach out to|introduce me to|connect me with|write to)\b|\b(?:contact|message|dm|e-?mail)\s+(?!list\b|details\b|info(?:rmation)?\b|history\b|summary\b)\w+|\b(?:draft|prepare|compose)\b.{0,40}\b(?:message|dm|e-?mail|intro|outreach)\b|\bsend\b.{0,50}\b(?:message|dm|e-?mail|intro|outreach)\s+to\b|\bsend\s+(?:them|him|her|these investors|those investors|the investor)\b/i;
  const amplifyPattern = /\b(?:amplify me|make me apparent|put me in front of investors|notify (?:the )?investors|help me (?:get|be) discovered)\b/i;
  const asksOnly = /\b(?:who|which|should|could|would|can)\b.{0,40}\b(?:contact|message|e-?mail|reach out)\b[^.!]*\?/i.test(latestUserMessage);
  const sendsToSelf = /\bsend\s+me\b/i.test(latestUserMessage);
  const introIntent = !actionDenied && !asksOnly && !sendsToSelf && (introPattern.test(latestUserMessage) || (confirmsPriorAction && introPattern.test(priorAssistantMessage)));
  const amplifyIntent = !actionDenied && (amplifyPattern.test(latestUserMessage) || (confirmsPriorAction && amplifyPattern.test(priorAssistantMessage)));
  const system = buildSystemPrompt(founder, contactedIds, memories, sourceAnalysis.brief);
  const proposals = [];
  const profilePatches = [];
  const seenInvestors = new Set();
  let amplifyRequested = false;

  // SSE progress streaming, opted into by the client. Validation errors above
  // stay plain JSON; the stream only starts once the agent loop is about to run.
  const { streaming, emit } = createAgentSse(res, body.stream === true);

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
        if (name === 'propose_founder_profile_update') return sourceAnalysis.asksProfileSetup && !actionDenied;
        if (name === 'draft_intro') return introIntent;
        if (name === 'amplify_to_investors') return amplifyIntent;
        return true;
      },
      executeTool: async (name, input, { session }) => {
        emit({ type: 'status', label: toolStatusLabel(name, input) });
        const external = await runStandardOrthogonalTool(session, name, input, publicResearchPolicy);
        if (external !== null) return external;
        let result;
        if (name === 'find_matching_investors') {
          try {
            result = await findMatchingInvestors(input, founder);
          } catch (err) {
            result = { error: `lookup_failed: ${err?.message ?? 'unknown'}` };
          }
        } else if (name === 'propose_founder_profile_update') {
          const patch = buildFounderProfilePatch(input, founder);
          if (patch.fields.length > 0) {
            profilePatches.push(patch);
            result = { status: 'drafted', fields: patch.fields.map((field) => field.field) };
          } else {
            result = { status: 'skipped', reason: 'No supported profile fields were proposed.' };
          }
        } else if (name === 'draft_intro') {
          const investorId = str(input?.investor_id);
          const investorName = str(input?.investor_name);
          const subject = str(input?.subject);
          const messageBody = str(input?.body);
          if (investorId && messageBody && !seenInvestors.has(investorId) && !contactedIds.includes(investorId)) {
            seenInvestors.add(investorId);
            proposals.push({ investorId, investorName, subject, body: messageBody });
            result = { status: 'queued', investor_id: investorId };
          } else {
            result = { status: 'skipped', reason: 'duplicate, already-messaged, or missing fields' };
          }
        } else if (name === 'amplify_to_investors') {
          amplifyRequested = true;
          result = { status: 'queued', note: 'Matched investors will be notified.' };
        } else {
          result = { error: `Unknown tool: ${name}` };
        }
        return result;
      },
    });

    let reply = runtimeResult.reply.trim();

    if (sourceAnalysis.asksProfileSetup && profilePatches.length === 0) {
      const sourceNote = sourceAnalysis.likelyLimited.length
        ? `I could not turn those sources into a profile draft yet. Some supplied sources may be hard to read directly (${sourceAnalysis.likelyLimited.join(', ')}). Send another public product/GitHub/site link or paste the relevant founder bio, traction, or product text here, and I can use that instead.`
        : 'I could not turn the supplied context into a profile draft yet. Send another public source or paste the relevant founder bio, traction, or product text here, and I can use that instead.';
      if (!reply.includes(sourceNote)) reply = `${reply ? `${reply}\n\n` : ''}${sourceNote}`;
    }

    const responsePayload = {
      reply: reply || "I couldn't find anything to say about that — try rephrasing.",
      proposals,
      profilePatches,
      amplify: amplifyRequested,
    };
    if (streaming) {
      emit({ type: 'done', ...responsePayload });
      return res.end();
    }
    return res.status(200).json(responsePayload);
  } catch (err) {
    logApparentAgentError(err, 'founder-agent');
    const failure = apparentAgentErrorResponse(err);
    if (streaming) {
      emit({ type: 'error', error: failure.error, code: failure.code });
      return res.end();
    }
    return res.status(failure.status).json({ error: failure.error, code: failure.code });
  }
}
