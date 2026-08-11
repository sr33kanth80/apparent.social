import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const BASE_URL = process.env.APPARENT_DEMO_CAPTURE_URL || 'https://apparent.social';
const CAPTURE_KEY = 'record-agent-demos-4c7fb52e8a164c0aa87ad8c95a4d83d6';
const OUTPUT_PATH = resolve('src/data/agent-demo-recordings.generated.json');

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
].map(([id, role, title, prompt]) => ({ id, role, title, prompt }));

const parseSse = async (response) => {
  const text = await response.text();
  const events = text
    .split(/\n\n+/)
    .map((block) => block.split('\n').find((line) => line.startsWith('data: '))?.slice(6))
    .filter(Boolean)
    .map((value) => JSON.parse(value));
  const steps = events.filter((event) => event.type === 'status').map((event) => event.label);
  const done = events.findLast((event) => event.type === 'done');
  const failed = events.findLast((event) => event.type === 'error');
  if (!done) throw new Error(failed?.error || `Agent recording ended without a result (${response.status}).`);
  return { steps: [...new Set(steps)], result: done };
};

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

const completedIds = new Set(recordings.map((recording) => recording.id));
for (const [index, definition] of definitions.entries()) {
  if (completedIds.has(definition.id)) {
    console.log(`[${index + 1}/${definitions.length}] ${definition.id} already captured`);
    continue;
  }
  process.stdout.write(`[${index + 1}/${definitions.length}] ${definition.id}... `);
  const startedAt = Date.now();
  const response = await fetch(`${BASE_URL}/api/${definition.role === 'investor' ? 'agent' : 'founder-agent'}?demoCapture=${definition.role}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-apparent-demo-capture': CAPTURE_KEY,
    },
    body: JSON.stringify({ prompt: definition.prompt, stream: true }),
  });
  if (!response.ok) throw new Error(`${definition.id} failed with HTTP ${response.status}: ${await response.text()}`);
  const { steps, result } = await parseSse(response);
  const reply = String(result.reply || '').trim();
  if (!reply) throw new Error(`${definition.id} returned an empty reply.`);
  recordings.push({
    ...definition,
    recordedAt: new Date().toISOString(),
    durationMs: Date.now() - startedAt,
    steps,
    reply,
    proposals: Array.isArray(result.proposals) ? result.proposals : [],
    emailDrafts: Array.isArray(result.emailDrafts) ? result.emailDrafts : [],
    profilePatches: Array.isArray(result.profilePatches) ? result.profilePatches : [],
    amplify: result.amplify === true,
  });
  await saveRecordings(recordings);
  process.stdout.write(`${Math.round((Date.now() - startedAt) / 1000)}s, ${reply.length} chars\n`);
}

console.log(`Saved ${recordings.length} real Agent recordings to ${OUTPUT_PATH}`);
