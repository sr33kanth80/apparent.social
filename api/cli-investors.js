// npx apparent findinvestors — match a founder's build to heat-map VCs they can
// email RIGHT NOW (public partner emails from the existing vc_contacts dataset).
//
// Solves the founder-side cold start: real, immediate value even with zero VCs
// registered on Apparent. Conservative matching (better few strong than many
// weak) — concepts weigh 3x raw keywords, and a VC must clear a real bar AND
// have a usable email to be returned.
//
// Request:  POST { languages:[{name}], projects:[{name,description}] }
// Response: { ok, investors: [{ name, focus, partner, email, website, location,
//             investments, why:[...] }] }
//
// Env: VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY (vc_contacts is public-readable).

const SUPABASE_URL = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

const str = (v) => (v == null ? '' : String(v));

// Sector concepts (compact mirror of the app-side matcher) → strong signal.
const CONCEPTS = {
  ai: ['ai', 'artificial intelligence', 'machine learning', 'ml', 'deep learning', 'llm', 'genai', 'generative', 'nlp', 'computer vision', 'agents', 'agentic'],
  devtools: ['devtools', 'developer tools', 'developer', 'sdk', 'cli', 'api', 'infrastructure tooling', 'dx'],
  infra: ['infra', 'infrastructure', 'cloud', 'devops', 'observability', 'kubernetes', 'serverless', 'platform', 'compute'],
  data: ['data', 'analytics', 'database', 'etl', 'warehouse', 'business intelligence', 'data infrastructure'],
  fintech: ['fintech', 'finance', 'financial', 'payments', 'banking', 'lending', 'insurance', 'insurtech', 'wealth', 'trading', 'accounting'],
  security: ['security', 'cybersecurity', 'infosec', 'cyber', 'privacy', 'compliance', 'identity', 'authentication'],
  health: ['health', 'healthcare', 'healthtech', 'medtech', 'biotech', 'bio', 'medical', 'clinical', 'life sciences', 'digital health'],
  saas: ['saas', 'b2b', 'enterprise', 'enterprise software', 'vertical saas', 'business software'],
  consumer: ['consumer', 'b2c', 'social', 'marketplace', 'creator', 'mobile', 'd2c'],
  commerce: ['commerce', 'ecommerce', 'e-commerce', 'retail', 'shopping'],
  crypto: ['crypto', 'web3', 'blockchain', 'defi', 'onchain', 'nft', 'wallet', 'stablecoin'],
  climate: ['climate', 'climatetech', 'cleantech', 'energy', 'sustainability', 'carbon', 'solar'],
  hardware: ['hardware', 'robotics', 'iot', 'devices', 'semiconductor', 'chips', 'drones'],
  productivity: ['productivity', 'workflow', 'collaboration', 'no-code', 'nocode', 'automation'],
  gaming: ['gaming', 'games', 'game', 'esports'],
  edtech: ['education', 'edtech', 'learning'],
  legal: ['legal', 'legaltech', 'contracts'],
  hr: ['hr', 'hrtech', 'recruiting', 'talent', 'hiring'],
  marketing: ['marketing', 'martech', 'growth', 'advertising', 'adtech', 'seo'],
};

// A few languages carry a sector hint; most don't, so keep this tiny.
const LANG_CONCEPT = { solidity: 'crypto', move: 'crypto' };

const STOP = new Set([
  'the', 'and', 'for', 'with', 'that', 'this', 'our', 'your', 'are', 'from', 'into', 'out', 'who', 'what', 'how',
  'use', 'using', 'build', 'building', 'builder', 'founder', 'startup', 'company', 'team', 'early', 'stage', 'tech',
  'technology', 'platform', 'tool', 'tools', 'app', 'apps', 'product', 'products', 'software', 'solution', 'solutions',
  'first', 'new', 'based', 'fund', 'funds', 'invest', 'investing', 'investments', 'investors', 'capital', 'ventures',
  'venture', 'seed', 'series', 'pre', 'backed', 'portfolio', 'companies', 'focus', 'focused', 'sector', 'sectors',
]);

const conceptsIn = (text) => {
  const norm = ` ${String(text).toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ')} `;
  const found = new Set();
  for (const [concept, forms] of Object.entries(CONCEPTS)) {
    for (const form of forms) {
      if (norm.includes(` ${form} `)) {
        found.add(concept);
        break;
      }
    }
  }
  return found;
};

const keywordsIn = (text) =>
  new Set(
    String(text)
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length >= 3 && !STOP.has(t)),
  );

const intersect = (a, b) => {
  const out = [];
  a.forEach((v) => {
    if (b.has(v)) out.push(v);
  });
  return out;
};

const sbSelect = async (table, query) => {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return [];
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
  });
  if (!res.ok) return [];
  return res.json();
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
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return res.status(200).json({ ok: false, error: 'server_misconfigured', investors: [] });
  }

  const body = await readJsonBody(req);
  const languages = Array.isArray(body.languages) ? body.languages : [];
  const projects = Array.isArray(body.projects) ? body.projects : [];

  // Founder fingerprint — weight what they're BUILDING (project text) over languages.
  const projectText = projects.map((p) => `${str(p.name)} ${str(p.description)}`).join(' ');
  const langText = languages.map((l) => str(l.name)).join(' ');
  const founderConcepts = conceptsIn(projectText);
  for (const l of languages) {
    const hint = LANG_CONCEPT[str(l.name).toLowerCase()];
    if (hint) founderConcepts.add(hint);
  }
  const founderKeywords = new Set([...keywordsIn(projectText), ...keywordsIn(langText)]);

  if (founderConcepts.size === 0 && founderKeywords.size === 0) {
    return res.status(200).json({ ok: true, investors: [], reason: 'thin_fingerprint' });
  }

  const rows = await sbSelect(
    'vc_contacts',
    'partner_email=not.is.null&select=investor_name,fund_focus_sectors,fund_description,partner_name,partner_email,website,location,number_of_investments&order=number_of_investments.desc&limit=2000',
  );

  const scored = [];
  for (const vc of rows || []) {
    const email = str(vc.partner_email).trim();
    if (!email.includes('@')) continue; // emailable-now is the whole point

    const vcText = `${str(vc.fund_focus_sectors)} ${str(vc.fund_description)}`;
    const conceptHits = intersect(founderConcepts, conceptsIn(vcText));
    const keywordHits = intersect(founderKeywords, keywordsIn(vcText));

    // Conservative bar: at least one shared sector concept, or two real keywords.
    if (conceptHits.length < 1 && keywordHits.length < 2) continue;

    const score = conceptHits.length * 3 + keywordHits.length;
    const why = [...conceptHits, ...keywordHits.filter((k) => !conceptHits.includes(k))].slice(0, 4);

    scored.push({
      name: str(vc.investor_name) || 'Investor',
      focus: str(vc.fund_focus_sectors),
      partner: str(vc.partner_name),
      email,
      website: str(vc.website),
      location: str(vc.location),
      investments: Number(vc.number_of_investments || 0),
      why,
      _score: score,
    });
  }

  scored.sort((a, b) => b._score - a._score || b.investments - a.investments);
  const investors = scored.slice(0, 15).map(({ _score, ...rest }) => rest);

  return res.status(200).json({ ok: true, investors });
}
