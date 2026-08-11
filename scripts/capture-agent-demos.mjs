import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const BASE_URL = process.env.APPARENT_DEMO_CAPTURE_URL || 'https://apparent.social';
const CAPTURE_KEY = 'record-agent-demos-4c7fb52e8a164c0aa87ad8c95a4d83d6';
const OUTPUT_PATH = resolve('src/data/agent-demo-recordings.generated.json');
const FORCE_ROLE = String(process.env.APPARENT_DEMO_CAPTURE_FORCE_ROLE || '').trim();
const FORCE_IDS = new Set(String(process.env.APPARENT_DEMO_CAPTURE_FORCE_IDS || '').split(',').map((value) => value.trim()).filter(Boolean));

const followUps = {
  'investor-pressure-checklist': 'Use PostHog (posthog.com) as the demo opportunity. Assess it against the saved developer-tools and AI-infrastructure thesis.',
  'investor-diligence-company': 'Use PostHog and its co-founder and CEO James Hawkins for this recorded demo. Research only public, current evidence.',
  'investor-diligence-momentum': 'Use PostHog (posthog.com) as the startup for this recorded demo.',
  'investor-profile-setup': 'Use this public-safe demo biography: Apparent Demo Fund invests $250k to $1m at Seed and Series A in developer tools, AI infrastructure, and B2B workflow software across North America and Europe. It values technical founders, customer proof, open-source adoption, and early revenue.',
  'founder-profile-setup': 'Use this public-safe demo information: Alex Morgan is building Apparent Demo Company, a Seed-stage B2B fundraising and investor-research workspace in the United States. The public product is at https://apparent.social. The company is raising a Seed round; no private revenue, customer, or round-size claims should be added.',
  'founder-intro-rewrite': 'Here is the demo introduction to improve: Hi, I am building a fundraising tool and looking for investors. We are at Seed stage. Would you like to chat?',
};

const definitions = [
  ['investor-source-raising', 'investor', 'Source thesis-fit founders', 'Show me founders raising now on Apparent who fit my thesis, and explain the fit.'],
  ['investor-source-public', 'investor', 'Source thesis-fit founders', 'Find developer-tools founders outside Apparent with recent funding or hiring signals.'],
  ['investor-pressure-compare', 'investor', 'Pressure-test an opportunity', 'Compare my top three founder matches and show the strongest evidence for and against each one.'],
  ['investor-pressure-checklist', 'investor', 'Pressure-test an opportunity', 'What would need to be true for this opportunity to fit my thesis? Build me a verification checklist.'],
  ['investor-diligence-company', 'investor', 'Run company and founder diligence', 'Research this company and founder. Separate verified facts, positive signals, risks, and open questions.'],
  ['investor-diligence-momentum', 'investor', 'Run company and founder diligence', 'Check whether this startup is gaining momentum through funding, hiring, launches, and current news.'],
  ['investor-market-map', 'investor', 'Map a market', 'Map the current AI developer-tools market by category, notable startups, funding stage, and differentiation.'],
  ['investor-market-change', 'investor', 'Map a market', 'Research the latest changes in this market and tell me what could create new investment opportunities.'],
  ['investor-outreach-platform', 'investor', 'Prepare founder outreach', 'Draft personalized outreach to the top three on-platform founders who fit my thesis.'],
  ['investor-outreach-public', 'investor', 'Prepare founder outreach', 'Find one strong off-platform founder, verify the contact path, and prepare an email draft for me.'],
  ['investor-profile-setup', 'investor', 'Build your investor profile', 'Set up my investor profile from the firm links and biography I paste next.'],
  ['investor-profile-audit', 'investor', 'Build your investor profile', 'Review my current thesis and show me which profile fields would make founder matching more precise.'],
  ['founder-match-open', 'founder', 'Find thesis-fit investors', 'Which investors on Apparent are the strongest fit for what I am building, and why?'],
  ['founder-match-rank', 'founder', 'Find thesis-fit investors', 'Rank the top investors for my round by sector, stage, geography, and thesis overlap.'],
  ['founder-profile-setup', 'founder', 'Strengthen your fundraising profile', 'Set up my founder profile from the links and product information I paste next.'],
  ['founder-profile-audit', 'founder', 'Strengthen your fundraising profile', 'Audit my profile and tell me what evidence is missing before an investor reviews it.'],
  ['founder-market-competitors', 'founder', 'Research your market', 'Map my closest competitors and compare their positioning, funding, traction signals, and recent activity.'],
  ['founder-market-change', 'founder', 'Research your market', 'Research the latest changes in my market and explain what they mean for my fundraising story.'],
  ['founder-meeting-prepare', 'founder', 'Prepare for investor meetings', 'Prepare me for a meeting with one of my matched investors. Show thesis fit and likely objections.'],
  ['founder-meeting-pressure', 'founder', 'Prepare for investor meetings', 'Pressure-test my fundraising story from an investor perspective and identify weak claims.'],
  ['founder-intro-matches', 'founder', 'Draft targeted introductions', 'Draft personalized introductions to my top three matched investors for me to review.'],
  ['founder-intro-rewrite', 'founder', 'Draft targeted introductions', 'Rewrite my investor introduction using my strongest traction and product evidence.'],
  ['founder-discovery-count', 'founder', 'Get discovered by the right investors', 'Show me how many investors currently match my profile before I choose to notify them.'],
  ['founder-discovery-amplify', 'founder', 'Get discovered by the right investors', 'Put me in front of investors whose thesis matches what I am building.'],
].map(([id, role, title, prompt]) => ({ id, role, title, prompt, followUp: followUps[id] || '' }));

const saveRecordings = async (recordings) => {
  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, `${JSON.stringify({ schemaVersion: 1, recordings }, null, 2)}\n`, 'utf8');
};

let recordings = [];
try {
  const current = JSON.parse(await readFile(OUTPUT_PATH, 'utf8'));
  if (Array.isArray(current.recordings)) recordings = current.recordings;
} catch {
  // Start a new capture when no prior output exists.
}

if (FORCE_ROLE || FORCE_IDS.size) {
  recordings = recordings.filter((recording) => (
    !(FORCE_ROLE && recording.role === FORCE_ROLE)
    && !FORCE_IDS.has(recording.id)
  ));
  await saveRecordings(recordings);
}

const completedIds = new Set(recordings.map((recording) => recording.id));
const runAgent = async (definition, body) => {
  const response = await fetch(`${BASE_URL}/api/${definition.role === 'investor' ? 'agent' : 'founder-agent'}?demoCapture=${definition.role}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-apparent-demo-capture': CAPTURE_KEY,
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`${definition.id} failed with HTTP ${response.status}: ${await response.text()}`);
  const result = await response.json();
  if (result.error) throw new Error(`${definition.id} failed: ${result.error}`);
  const reply = String(result.reply || '').trim();
  if (!reply) throw new Error(`${definition.id} returned an empty reply.`);
  return { result, reply };
};

for (const [index, definition] of definitions.entries()) {
  if (completedIds.has(definition.id)) {
    console.log(`[${index + 1}/${definitions.length}] ${definition.id} already captured`);
    continue;
  }
  process.stdout.write(`[${index + 1}/${definitions.length}] ${definition.id}... `);
  const startedAt = Date.now();
  const first = await runAgent(definition, { prompt: definition.prompt });
  const messages = [
    { role: 'user', content: definition.prompt },
    { role: 'assistant', content: first.reply },
  ];
  let captured = first;
  if (definition.followUp) {
    messages.push({ role: 'user', content: definition.followUp });
    captured = await runAgent(definition, { messages });
    messages.push({ role: 'assistant', content: captured.reply });
  }
  recordings.push({
    id: definition.id,
    role: definition.role,
    title: definition.title,
    prompt: definition.prompt,
    recordedAt: new Date().toISOString(),
    durationMs: Date.now() - startedAt,
    steps: [],
    messages,
    reply: captured.reply,
    proposals: Array.isArray(captured.result.proposals) ? captured.result.proposals : [],
    emailDrafts: Array.isArray(captured.result.emailDrafts) ? captured.result.emailDrafts : [],
    profilePatches: Array.isArray(captured.result.profilePatches) ? captured.result.profilePatches : [],
    amplify: captured.result.amplify === true,
  });
  await saveRecordings(recordings);
  process.stdout.write(`${Math.round((Date.now() - startedAt) / 1000)}s, ${captured.reply.length} chars\n`);
}

console.log(`Saved ${recordings.length} real Agent recordings to ${OUTPUT_PATH}`);
