const CAPTURE_KEY = 'record-agent-demos-4c7fb52e8a164c0aa87ad8c95a4d83d6';

const INVESTOR_CRITERIA = {
  name: 'Apparent Demo Investor',
  firm: 'Apparent Demo Fund',
  thesis: 'Seed and Series A developer tools, AI infrastructure, and workflow software with technical founders, early customer proof, and open-source or developer adoption signals.',
  sectors: ['Developer tools', 'AI infrastructure', 'B2B software'],
  stage: 'Seed, Series A',
  stages: ['Seed', 'Series A'],
  geographies: ['United States', 'Canada', 'Europe'],
  checkSize: '$250k to $1m',
  founderSignals: ['Technical founder', 'Customer proof', 'Open-source adoption', 'Early revenue'],
};

const FOUNDER_PROFILE = {
  name: 'Alex Morgan',
  profileName: 'Alex Morgan',
  headline: 'Building a fundraising and investor-research workspace for startups',
  currentBuild: 'Apparent Demo Company, a workflow product for startup fundraising and investor research',
  website: 'https://apparent.social',
  bio: 'A public-safe sample founder profile used to demonstrate how Apparent matches founder proof with investor thesis. It contains no private customer or financial data.',
  category: 'B2B software and fundraising infrastructure',
  stage: 'Seed',
  location: 'United States',
  fundraisingStatus: 'Raising',
  raisingRound: 'Seed',
  raisingAmount: 'Not disclosed',
  traction: 'Public product and launch evidence only. No private revenue or customer claims are included in this demo profile.',
  dossier: 'Demo dossier: product workflow, public launch evidence, and founder-supplied profile context. Treat all private commercial metrics as unknown.',
};

const header = (req, name) => String(req.headers?.[name] || req.headers?.[name.toLowerCase()] || '');

export const isTemporaryDemoCapture = (req, role) => (
  req.query?.demoCapture === role
  && header(req, 'x-apparent-demo-capture') === CAPTURE_KEY
);

export const createTemporaryDemoCaptureBody = (role, requestBody) => {
  const prompt = String(requestBody?.prompt || '').trim().slice(0, 4_000);
  const suppliedMessages = Array.isArray(requestBody?.messages)
    ? requestBody.messages
      .filter((message) => message && (message.role === 'user' || message.role === 'assistant') && String(message.content || '').trim())
      .slice(-20)
      .map((message) => ({ role: message.role, content: String(message.content).trim().slice(0, 12_000) }))
    : [];
  const messages = suppliedMessages.length ? suppliedMessages : (prompt ? [{ role: 'user', content: prompt }] : []);
  if (!messages.length || messages[messages.length - 1].role !== 'user') {
    throw new Error('A demo capture conversation ending with a user message is required.');
  }

  const shared = {
    messages,
    memories: [],
    contacted: [],
    stream: requestBody?.stream === true,
  };

  return role === 'investor'
    ? { ...shared, criteria: INVESTOR_CRITERIA, autonomy: 'manual' }
    : { ...shared, founder: FOUNDER_PROFILE };
};

export const temporaryDemoCaptureUserId = '00000000-0000-4000-8000-000000000001';
