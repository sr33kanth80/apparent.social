// Jobs Map search — the only writer of public.companies.
//
// Cache-first by design: a search reads the companies table and only calls
// Orthogonal when the local corpus can't answer (no fresh rows for the query).
// Results are upserted, so the map self-populates: the next visitor who browses
// that area gets the same pins for free. Orthogonal spend therefore scales with
// novel discovery, not with traffic.
//
// Request:  POST { query: string, city?: string }
// Response: { ok, companies: [...], source: 'cache' | 'orthogonal' }
//
// Env: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (writes), ORTHOGONAL_API_KEY,
//      JOBS_MAX_SPEND_CENTS (per-request cap, default 25).

import { createOrthogonalSession, orthogonalData, OrthogonalError } from './agent/orthogonal.js';

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const STALE_MS = 7 * 24 * 60 * 60 * 1000;
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 5; // per IP per minute — this route can spend money.
const MAX_QUERY_CHARS = 200;
const MAX_UPSERT_ROWS = 40;

const str = (v) => (v == null ? '' : String(v));
const clean = (v, max = 300) => str(v).replace(/\s+/g, ' ').trim().slice(0, max);

const serviceHeaders = () => ({
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
});

// ---------- untrusted-input hardening ----------

/**
 * Orthogonal output is untrusted data (it originates from third-party APIs and
 * scraped pages). Any URL we store gets rendered as a link visitors click, so
 * only absolute http(s) survives — this drops javascript:, data:, and garbage.
 */
const safeUrl = (value) => {
  const raw = clean(value, 500);
  if (!raw) return '';
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return '';
    return parsed.toString().slice(0, 500);
  } catch {
    return '';
  }
};

/** Dedup key: lowercased host without www, no scheme/path. "" if unusable. */
const canonicalDomain = (website, careersUrl) => {
  for (const candidate of [website, careersUrl]) {
    const url = safeUrl(candidate);
    if (!url) continue;
    try {
      const host = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
      if (host && host.includes('.')) return host;
    } catch {
      /* fall through */
    }
  }
  return '';
};

const nonNegativeInt = (value) => {
  const parsed = Number.parseInt(str(value), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

// ---------- rate limit ----------

const clientIp = (req) => {
  const forwarded = str(req.headers['x-forwarded-for']).split(',')[0].trim();
  return forwarded || str(req.headers['x-real-ip']).trim() || 'unknown';
};

/** Fails OPEN on infrastructure error but CLOSED on an explicit deny. */
const rateLimitOk = async (req) => {
  if (!SUPABASE_URL || !SERVICE_KEY) return { ok: true };
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/consume_agent_rate_limit`, {
      method: 'POST',
      headers: serviceHeaders(),
      body: JSON.stringify({
        bucket_key: `jobs:${clientIp(req)}`,
        window_ms: RATE_WINDOW_MS,
        max_count: RATE_MAX,
      }),
    });
    if (!res.ok) return { ok: true };
    const data = await res.json().catch(() => null);
    const result = Array.isArray(data) ? data[0] : data;
    if (result && result.allowed === false) {
      return { ok: false, retryAfter: Math.max(1, Number(result.retry_after || 60)) };
    }
    return { ok: true };
  } catch {
    return { ok: true };
  }
};

// ---------- companies table ----------

const selectCompanies = async (query, city) => {
  if (!SUPABASE_URL || !SERVICE_KEY) return [];
  const params = new URLSearchParams();
  params.set(
    'select',
    'canonical_domain,name,website,careers_url,one_liner,city,latitude,longitude,open_roles,is_hiring,last_enriched_at',
  );
  params.set('limit', '200');
  params.set('order', 'open_roles.desc');
  const term = clean(city || query, 80).replace(/[,()*]/g, ' ').trim();
  if (term) {
    // Match either the city column or the company name.
    params.set('or', `(city.ilike.*${term}*,name.ilike.*${term}*)`);
  }
  const res = await fetch(`${SUPABASE_URL}/rest/v1/companies?${params.toString()}`, {
    headers: serviceHeaders(),
  });
  if (!res.ok) return [];
  return (await res.json().catch(() => [])) || [];
};

const isFresh = (row) => {
  const at = Date.parse(str(row?.last_enriched_at));
  return Number.isFinite(at) && Date.now() - at < STALE_MS;
};

const upsertCompanies = async (rows) => {
  if (!rows.length || !SUPABASE_URL || !SERVICE_KEY) return;
  await fetch(`${SUPABASE_URL}/rest/v1/companies?on_conflict=canonical_domain`, {
    method: 'POST',
    headers: { ...serviceHeaders(), Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(rows),
  }).catch(() => null);
};

// ---------- Orthogonal ----------

/**
 * Field names are read defensively with fallbacks: the exact shape of a catalog
 * endpoint's response isn't contractual, and the discovery call may route to
 * different providers. Anything we can't identify is skipped rather than stored
 * half-formed.
 */
const mapCompany = (item, fallbackCity, geocode) => {
  const name = clean(item?.name ?? item?.company ?? item?.company_name ?? item?.organization, 200);
  if (!name) return null;

  const website = safeUrl(item?.website ?? item?.url ?? item?.domain ?? item?.company_url);
  const careersUrl = safeUrl(item?.careers_url ?? item?.careersUrl ?? item?.jobs_url ?? item?.apply_url ?? item?.job_board_url);
  const domain = canonicalDomain(website, careersUrl);
  if (!domain) return null; // no stable dedup key => not storable

  const city = clean(item?.city ?? item?.location ?? item?.headquarters ?? fallbackCity, 120);
  const coords = geocode(city);
  const openRoles = nonNegativeInt(item?.open_roles ?? item?.openRoles ?? item?.job_count ?? item?.jobs_count ?? item?.total_jobs);

  return {
    canonical_domain: domain,
    name,
    website,
    careers_url: careersUrl,
    one_liner: clean(item?.one_liner ?? item?.description ?? item?.summary ?? item?.tagline, 280),
    city,
    latitude: coords?.latitude ?? null,
    longitude: coords?.longitude ?? null,
    open_roles: openRoles,
    is_hiring: openRoles > 0 || Boolean(careersUrl),
    source: 'orthogonal',
    last_enriched_at: new Date().toISOString(),
  };
};

const extractItems = (payload) => {
  const data = orthogonalData(payload);
  const candidates = [data, data?.results, data?.companies, data?.data, data?.items, data?.jobs];
  for (const candidate of candidates) {
    if (Array.isArray(candidate) && candidate.length) return candidate;
  }
  return [];
};

/**
 * One discovery call, then one paid run against the best-priced fixed-price
 * endpoint the catalog offers. The session enforces the spend cap; dynamic
 * (unbounded) pricing is refused by the wrapper, so a runaway endpoint can't be
 * executed here at all.
 */
const discoverAndRun = async (query, city, geocode) => {
  const session = createOrthogonalSession({
    maxCalls: 6,
    maxSpendCents: Number.parseInt(process.env.JOBS_MAX_SPEND_CENTS || '', 10) || 25,
  });

  const prompt = city
    ? `companies hiring in ${city} with open job postings and careers page: ${query}`
    : `companies hiring with open job postings and careers page: ${query}`;

  const found = await session.search(prompt, 10);
  const results = extractItems(found);

  for (const entry of results.slice(0, 4)) {
    const api = clean(entry?.slug ?? entry?.api ?? entry?.provider, 80).toLowerCase();
    const endpoints = Array.isArray(entry?.endpoints) ? entry.endpoints : [entry];
    for (const endpoint of endpoints.slice(0, 3)) {
      const path = clean(endpoint?.path ?? endpoint?.endpoint, 200);
      if (!api || !path.startsWith('/')) continue;
      try {
        const run = await session.run({
          api,
          path,
          body: { query, location: city || undefined, limit: MAX_UPSERT_ROWS },
          query: {},
        });
        const items = extractItems(run);
        const mapped = items
          .slice(0, MAX_UPSERT_ROWS)
          .map((item) => mapCompany(item, city, geocode))
          .filter(Boolean);
        if (mapped.length) return { companies: mapped, usage: session.usage() };
      } catch (error) {
        // Unbounded price, budget exhausted, or a shape we can't use — try the
        // next candidate rather than failing the whole search.
        if (error instanceof OrthogonalError && error.code === 'orthogonal_budget_reached') throw error;
      }
    }
  }
  return { companies: [], usage: session.usage() };
};

// ---------- handler ----------

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

const toClient = (row) => ({
  domain: row.canonical_domain,
  name: row.name,
  website: row.website || '',
  careersUrl: row.careers_url ?? row.careersUrl ?? '',
  oneLiner: row.one_liner ?? row.oneLiner ?? '',
  city: row.city || '',
  latitude: row.latitude ?? null,
  longitude: row.longitude ?? null,
  openRoles: Number(row.open_roles ?? row.openRoles ?? 0),
});

export default async function jobsSearchHandler(req, res, { geocode }) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  const body = await readJsonBody(req);
  const query = clean(body?.query, MAX_QUERY_CHARS);
  const city = clean(body?.city, 120);
  if (!query && !city) {
    return res.status(400).json({ ok: false, error: 'query_required' });
  }

  const limit = await rateLimitOk(req);
  if (!limit.ok) {
    res.setHeader('Retry-After', String(limit.retryAfter));
    return res.status(429).json({ ok: false, error: 'rate_limited', retryAfter: limit.retryAfter });
  }

  // Cache first — never spend if the corpus already answers this.
  const cached = await selectCompanies(query, city);
  const fresh = cached.filter(isFresh);
  if (fresh.length) {
    return res.status(200).json({ ok: true, source: 'cache', companies: fresh.map(toClient) });
  }

  try {
    const { companies } = await discoverAndRun(query, city, geocode);
    if (!companies.length) {
      // Nothing new; stale rows still beat an empty map.
      return res.status(200).json({ ok: true, source: 'cache', companies: cached.map(toClient) });
    }
    await upsertCompanies(companies);
    return res.status(200).json({ ok: true, source: 'orthogonal', companies: companies.map(toClient) });
  } catch (error) {
    const status = error instanceof OrthogonalError ? error.status : 502;
    const code = error instanceof OrthogonalError ? error.code : 'jobs_search_failed';
    if (cached.length) {
      return res.status(200).json({ ok: true, source: 'cache', companies: cached.map(toClient), degraded: code });
    }
    return res.status(status >= 400 && status < 600 ? status : 502).json({ ok: false, error: code });
  }
}
