// Founder agent — GitHub dossier enrichment (Phase F0).
//
// Pulls the founder's PUBLIC GitHub (profile, top repos, languages, stars, top
// READMEs) using their stored, encrypted OAuth token (service-role read only),
// then synthesizes a concise investor-facing dossier with Claude and saves it
// onto the public founder_profiles row — where the investor agent reads it.
//
// Auth: the caller must present their Supabase access token (Authorization:
// Bearer <jwt>); we resolve it to the founder's user id and only ever enrich
// that founder's own profile. Nothing private leaves the server.
//
// Request:  POST { force?: boolean }   (Authorization: Bearer <supabase jwt>)
// Response: { ok, dossier, summary, githubSummary, updatedAt } | { ok:false, error }
//
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GITHUB_OAUTH_SECRET (token
// decrypt), ANTHROPIC_API_KEY (narrative; falls back to a deterministic summary
// when unset), FOUNDER_ENRICH_MODEL (default claude-sonnet-4-6).

import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { decryptToken } from '../server/github-crypto.js';

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
const GITHUB_SECRET = process.env.GITHUB_OAUTH_SECRET || '';
// Founders are free, so keep enrichment on a cheaper model by default. Swappable.
const ENRICH_MODEL = process.env.FOUNDER_ENRICH_MODEL || 'claude-sonnet-4-6';

const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // don't re-burn the GitHub token / credits within 12h

const str = (v) => (v == null ? '' : String(v));

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

const gh = async (path, token, accept = 'application/vnd.github+json') => {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: {
      accept,
      authorization: `Bearer ${token}`,
      'user-agent': 'apparent-app',
      'x-github-api-version': '2022-11-28',
    },
  });
  if (!res.ok) return null;
  return accept.includes('raw') ? res.text() : res.json();
};

// ---------- GitHub data → structured dossier ----------

const buildGithubDossier = async (token) => {
  const [profile, repos] = await Promise.all([
    gh('/user', token),
    gh('/user/repos?per_page=100&sort=pushed&visibility=public&affiliation=owner', token),
  ]);

  const publicRepos = Array.isArray(repos) ? repos.filter((r) => r && !r.fork && !r.private) : [];
  publicRepos.sort((a, b) => (b.stargazers_count ?? 0) - (a.stargazers_count ?? 0));

  const totalStars = publicRepos.reduce((sum, r) => sum + (r.stargazers_count ?? 0), 0);
  const languageCounts = {};
  for (const r of publicRepos) {
    const lang = str(r.language);
    if (lang) languageCounts[lang] = (languageCounts[lang] ?? 0) + 1;
  }
  const languages = Object.entries(languageCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([lang]) => lang);

  const topRepos = publicRepos.slice(0, 8).map((r) => ({
    name: str(r.name),
    description: str(r.description),
    language: str(r.language),
    stars: r.stargazers_count ?? 0,
    forks: r.forks_count ?? 0,
    url: str(r.html_url),
    topics: Array.isArray(r.topics) ? r.topics.slice(0, 6) : [],
    updatedAt: str(r.pushed_at),
  }));

  // Pull READMEs for the top few repos to give the LLM real substance.
  const readmeTargets = publicRepos.slice(0, 4).filter((r) => r.full_name);
  const readmes = [];
  for (const r of readmeTargets) {
    // eslint-disable-next-line no-await-in-loop
    const text = await gh(`/repos/${r.full_name}/readme`, token, 'application/vnd.github.raw+json');
    if (text && typeof text === 'string') {
      readmes.push({ repo: str(r.name), excerpt: text.slice(0, 1800) });
    }
  }

  return {
    githubLogin: str(profile?.login),
    githubName: str(profile?.name),
    githubBio: str(profile?.bio),
    githubCompany: str(profile?.company),
    blog: str(profile?.blog),
    followers: profile?.followers ?? 0,
    publicRepos: profile?.public_repos ?? publicRepos.length,
    totalStars,
    languages,
    topRepos,
    readmes,
    fetchedAt: new Date().toISOString(),
  };
};

const deterministicGithubSummary = (d) => {
  const parts = [];
  if (d.totalStars) parts.push(`${d.totalStars} GitHub stars across ${d.publicRepos} public repos`);
  else if (d.publicRepos) parts.push(`${d.publicRepos} public repos`);
  if (d.languages.length) parts.push(`top languages: ${d.languages.slice(0, 4).join(', ')}`);
  return parts.join(' · ');
};

// ---------- LLM narrative ----------

const synthesizeNarrative = async (profile, launches, gd) => {
  if (!process.env.ANTHROPIC_API_KEY) {
    // No key — fall back to a deterministic blurb so the dossier still populates.
    const lead = str(profile.headline) || str(profile.current_build) || 'Building on Apparent.';
    return `${lead} ${deterministicGithubSummary(gd)}`.trim();
  }

  const client = new Anthropic();
  const facts = {
    apparent: {
      name: str(profile.profile_name),
      headline: str(profile.headline),
      bio: str(profile.bio),
      currentBuild: str(profile.current_build),
      category: str(profile.category),
      stage: str(profile.stage),
      traction: str(profile.traction),
      launches: (launches || []).slice(0, 5).map((l) => ({ name: str(l.name), tagline: str(l.tagline), metrics: str(l.metrics) })),
    },
    github: {
      bio: gd.githubBio,
      followers: gd.followers,
      publicRepos: gd.publicRepos,
      totalStars: gd.totalStars,
      languages: gd.languages.slice(0, 6),
      topRepos: gd.topRepos.slice(0, 6),
      readmes: gd.readmes,
    },
  };

  const system =
    "You write a tight, factual founder dossier for venture investors evaluating this builder on Apparent. " +
    "Use ONLY the provided facts — never invent metrics, repos, or claims. 120-180 words, plain prose (no headings, no markdown). " +
    "Lead with what they're building and the strongest real signal, then concrete GitHub evidence (notable repos, languages, traction). " +
    "Be specific and grounded; if signal is thin, say so plainly rather than padding.";

  try {
    const res = await client.messages.create({
      model: ENRICH_MODEL,
      max_tokens: 1024,
      thinking: { type: 'disabled' },
      system,
      messages: [
        {
          role: 'user',
          content: `Write the dossier from these facts:\n\n${JSON.stringify(facts, null, 2)}`,
        },
      ],
    });
    const text = res.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();
    return text || `${str(profile.headline)} ${deterministicGithubSummary(gd)}`.trim();
  } catch {
    return `${str(profile.headline) || str(profile.current_build)} ${deterministicGithubSummary(gd)}`.trim();
  }
};

// ---------- Handler ----------

export default async function handler(req, res) {
  // The sourced-startup deep dive shares this function to stay under Vercel's
  // 12-function cap (same JWT auth + Anthropic/Supabase deps). It's mounted at
  // /api/sourced-enrich via a vercel.json rewrite → ?route=sourced and lives in
  // the underscore helper (not its own routable function). Static import string
  // so node-file-trace bundles it.
  if (String(req.query?.route || '') === 'sourced') {
    const { default: sourcedHandler } = await import('./_sourced-enrich.js');
    return sourcedHandler(req, res);
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }
  if (!SUPABASE_URL || !SERVICE_KEY || !ANON_KEY) {
    return res.status(200).json({ ok: false, error: 'server_misconfigured' });
  }

  // Resolve the caller's identity from their Supabase JWT.
  const authHeader = str(req.headers.authorization);
  const jwt = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!jwt) return res.status(401).json({ ok: false, error: 'unauthenticated' });

  const anon = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
  const { data: userData, error: userErr } = await anon.auth.getUser(jwt);
  const userId = userData?.user?.id;
  if (userErr || !userId) return res.status(401).json({ ok: false, error: 'invalid_token' });

  const body = await readJsonBody(req);
  const force = body?.force === true;

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  const { data: profile, error: profileErr } = await admin
    .from('founder_profiles')
    .select(
      'user_id, profile_name, headline, bio, current_build, category, stage, traction, github_username, github_verified, github_access_token_enc, agent_dossier, github_summary, dossier, dossier_updated_at',
    )
    .eq('user_id', userId)
    .maybeSingle();

  if (profileErr || !profile) return res.status(200).json({ ok: false, error: 'no_profile' });

  if (!profile.github_verified || !profile.github_access_token_enc) {
    return res.status(200).json({ ok: false, error: 'github_not_connected' });
  }

  // Serve the cached dossier unless it's stale or a refresh was requested.
  const updatedAt = profile.dossier_updated_at ? new Date(profile.dossier_updated_at).getTime() : 0;
  const isFresh = updatedAt && Date.now() - updatedAt < CACHE_TTL_MS;
  if (isFresh && !force && profile.agent_dossier) {
    return res.status(200).json({
      ok: true,
      cached: true,
      dossier: profile.dossier || {},
      summary: str(profile.agent_dossier),
      githubSummary: str(profile.github_summary),
      updatedAt: profile.dossier_updated_at,
    });
  }

  const token = decryptToken(profile.github_access_token_enc, GITHUB_SECRET);
  if (!token) return res.status(200).json({ ok: false, error: 'token_decrypt_failed' });

  let githubData;
  try {
    githubData = await buildGithubDossier(token);
  } catch (err) {
    return res.status(200).json({ ok: false, error: `github_fetch_failed: ${err?.message ?? 'unknown'}` });
  }

  const { data: launchRows } = await admin
    .from('product_launches')
    .select('name, tagline, metrics')
    .eq('owner_id', userId)
    .eq('public_profile_enabled', true)
    .order('updated_at', { ascending: false })
    .limit(5);

  const narrative = await synthesizeNarrative(profile, launchRows || [], githubData);
  const githubSummary = deterministicGithubSummary(githubData);
  const nowIso = new Date().toISOString();

  const { error: saveErr } = await admin
    .from('founder_profiles')
    .update({
      agent_dossier: narrative,
      github_summary: githubSummary,
      dossier: githubData,
      dossier_updated_at: nowIso,
    })
    .eq('user_id', userId);

  if (saveErr) return res.status(200).json({ ok: false, error: `save_failed: ${saveErr.message}` });

  return res.status(200).json({
    ok: true,
    cached: false,
    dossier: githubData,
    summary: narrative,
    githubSummary,
    updatedAt: nowIso,
  });
}
