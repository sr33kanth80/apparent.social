const CAPTURE_KEY = 'record-agent-demos-4c7fb52e8a164c0aa87ad8c95a4d83d6';

const INVESTOR_CRITERIA = {
  name: 'Apparent Demo Investor',
  firm: 'Apparent Demo Fund',
  thesis: 'Seed and Series A developer tools, AI infrastructure, and workflow software with technical founders, early customer proof, and open-source or developer adoption signals.',
  sectors: ['Developer tools', 'AI infrastructure', 'B2B software'],
  stages: ['Seed', 'Series A'],
  geographies: ['United States', 'Canada', 'Europe'],
  checkSize: '$250k to $1m',
  founderSignals: ['Technical founder', 'Customer proof', 'Open-source adoption', 'Early revenue'],
};

const FOUNDER_PROFILE = {
  founderName: 'Alex Morgan',
  companyName: 'Apparent Demo Company',
  website: 'https://apparent.social',
  oneLiner: 'A public-safe sample workspace used to demonstrate how Apparent matches founder proof with investor thesis.',
  description: 'The demo company builds workflow software for startup fundraising and investor research. Its profile is intentionally representative and contains no private customer or financial data.',
  sector: 'B2B software',
  stage: 'Seed',
  geography: 'United States',
  fundraisingStatus: 'Raising',
  round: 'Seed',
  traction: 'Public product and launch evidence only; no private revenue or customer claims are included.',
};

const header = (req, name) => String(req.headers?.[name] || req.headers?.[name.toLowerCase()] || '');

export const isTemporaryDemoCapture = (req, role) => (
  req.query?.demoCapture === role
  && header(req, 'x-apparent-demo-capture') === CAPTURE_KEY
);

export const createTemporaryDemoCaptureBody = (role, requestBody) => {
  const prompt = String(requestBody?.prompt || '').trim().slice(0, 4_000);
  if (!prompt) throw new Error('A demo capture prompt is required.');

  const shared = {
    messages: [{ role: 'user', content: prompt }],
    memories: [],
    contacted: [],
  };

  return role === 'investor'
    ? { ...shared, criteria: INVESTOR_CRITERIA, autonomy: 'manual' }
    : { ...shared, founder: FOUNDER_PROFILE };
};

export const temporaryDemoCaptureUserId = '00000000-0000-4000-8000-000000000001';
