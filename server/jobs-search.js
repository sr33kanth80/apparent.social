// Jobs Map search — the only writer of public.companies.
//
// The companies/company_jobs tables are a READ-THROUGH CACHE, not a corpus.
// Every result originates live from Orthogonal; storing it only stops the same
// place being re-billed within the cache window (JOBS_CACHE_TTL_MINUTES, 30 by
// default). Past that, the next look at an area refetches it. Spend therefore
// scales with distinct places and time, not with traffic.
//
// Request:  POST { query?, city? }  -- search, or discovery for a named place
//
// Coordinates are resolved live through Orthogonal's catalog; the city name a
// request carries comes from the map's own OpenStreetMap labels.
// Response: { ok, companies: [...], source: 'cache' | 'orthogonal', resolvedCity? }
//
// Env: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (writes), ORTHOGONAL_API_KEY,
//      JOBS_MAX_SPEND_CENTS (per-request cap, default 25).

import { createOrthogonalSession, orthogonalData, OrthogonalError } from './agent/orthogonal.js';
import { geocodeCompany, geocodePlace } from './geocode.js';

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

/**
 * How long a stored row is allowed to answer for.
 *
 * The table is a read-through cache, not a corpus: results are always Orthogonal's
 * live data, and this only stops the same place being re-billed in quick
 * succession. A week made the map a stale archive; half an hour keeps it live
 * while a burst of visitors to one city still costs a single lookup.
 */
const STALE_MS =
  (Number.parseInt(process.env.JOBS_CACHE_TTL_MINUTES || '', 10) || 30) * 60 * 1000;
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 5; // per IP per minute — this route can spend money.
const MAX_QUERY_CHARS = 200;
// Companies kept per discovery. One page of jobs collapses to a handful of
// companies, so the ceiling has to sit well above a single page.
const MAX_UPSERT_ROWS = 150;
// Job rows requested per page, and how many pages one discovery may pull. The
// spend cap is still the real limit; this just stops a runaway crawl.
const PAGE_SIZE = 50;
const MAX_DISCOVERY_PAGES = 4;
// Precise geocodes per request. Each is a paid lookup, so the map asks for what
// it is showing rather than the whole city.
const MAX_RESOLVE_PER_REQUEST = 12;
/**
 * How far a resolved office may sit from its city before we refuse to believe
 * it. Asking for "NVIDIA, Seattle" came back with an office in Zurich: the
 * geocoder matched the company and quietly ignored the city. Without this, a
 * marker silently teleports to another continent.
 */
const MAX_OFFICE_DRIFT_KM = 75;

const distanceKm = (aLat, aLng, bLat, bLng) => {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
};

const str = (v) => (v == null ? '' : String(v));
/**
 * Some providers return UTF-8 that was already decoded as Latin-1 ("â€”" for an
 * em dash). Repair only when those telltale sequences appear, so genuinely
 * accented text is left alone.
 */
const fixMojibake = (value) => {
  if (!/Ã.|â€|Â./.test(value)) return value;
  try {
    const repaired = Buffer.from(value, 'latin1').toString('utf8');
    return repaired.includes('�') ? value : repaired;
  } catch {
    return value;
  }
};

const clean = (v, max = 300) => fixMojibake(str(v)).replace(/\s+/g, ' ').trim().slice(0, max);

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

/**
 * Providers commonly return a bare host ("example.com") rather than an absolute
 * URL, which new URL() rejects outright. Coerce those to https:// before
 * validating, so a scheme-less website is usable instead of silently dropped.
 */
const toAbsoluteUrl = (value) => {
  const raw = clean(value, 500);
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return safeUrl(raw);
  // Only host-looking strings get a scheme; this must not rescue "javascript:".
  if (/^[a-z0-9-]+(\.[a-z0-9-]+)+(\/.*)?$/i.test(raw)) return safeUrl(`https://${raw}`);
  return '';
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

/** Provider dates arrive in mixed shapes; anything unparseable becomes null. */
const toTimestamp = (value) => {
  const raw = clean(value, 60);
  if (!raw) return null;
  const ms = Date.parse(raw);
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
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

/**
 * Write discovered companies without trampling resolved offices.
 *
 * Discovery only knows a company's CITY, so it carries the city centroid for
 * every row. Upserting that directly overwrote coordinates that had been
 * resolved to a real office — and since geo_precision was not in the payload
 * it survived as 'exact', leaving rows that claimed to be a street address
 * while sitting on the city centre. Every company in a city ended up on one
 * point, labelled precise.
 *
 * So coordinates are written in a second pass that skips anything already
 * resolved. New rows still get the centroid; resolved ones keep their office.
 */
const upsertCompanies = async (rows) => {
  if (!rows.length || !SUPABASE_URL || !SERVICE_KEY) return;

  const withoutCoordinates = rows.map((row) => {
    const { latitude, longitude, ...rest } = row;
    return rest;
  });

  await fetch(`${SUPABASE_URL}/rest/v1/companies?on_conflict=canonical_domain`, {
    method: 'POST',
    headers: { ...serviceHeaders(), Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(withoutCoordinates),
  }).catch(() => null);

  // Group by the coordinate they'd take, so one PATCH covers a whole city.
  const byPoint = new Map();
  for (const row of rows) {
    if (row.latitude == null || row.longitude == null) continue;
    const key = `${row.latitude},${row.longitude}`;
    const group = byPoint.get(key) ?? { latitude: row.latitude, longitude: row.longitude, domains: [] };
    group.domains.push(row.canonical_domain);
    byPoint.set(key, group);
  }

  await Promise.all(
    [...byPoint.values()].map((group) => {
      const list = group.domains.map((d) => `"${d}"`).join(',');
      // geo_precision=neq.exact is the guard: a resolved office is never
      // dragged back to the city centre.
      const url =
        `${SUPABASE_URL}/rest/v1/companies` +
        `?canonical_domain=in.(${encodeURIComponent(list)})` +
        `&geo_precision=neq.exact`;
      return fetch(url, {
        method: 'PATCH',
        headers: { ...serviceHeaders(), Prefer: 'return=minimal' },
        body: JSON.stringify({ latitude: group.latitude, longitude: group.longitude }),
      }).catch(() => null);
    }),
  );
};

/**
 * Roles are written after companies because company_jobs references
 * companies.canonical_domain: the parent row has to exist first.
 */
const upsertJobs = async (rows) => {
  if (!rows.length || !SUPABASE_URL || !SERVICE_KEY) return;
  await fetch(`${SUPABASE_URL}/rest/v1/company_jobs?on_conflict=job_key`, {
    method: 'POST',
    headers: { ...serviceHeaders(), Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(rows),
  }).catch(() => null);
};

/**
 * Re-geocode rows that were stored before the geocoder knew their location.
 *
 * Coordinates are resolved at write time, so widening the geocoder does nothing
 * for rows already saved with a null latitude — they stay permanently invisible
 * on the map despite being perfectly good companies. ("California" alone
 * accounted for 15 such rows.) This heals them in place.
 *
 * Grouped by city so one PATCH fixes every row sharing a location, rather than
 * one request per row. Costs no Orthogonal spend, and once the table is clean
 * the initial select returns nothing and this is a single cheap query.
 */
const backfillMissingCoordinates = async (geocode) => {
  if (!SUPABASE_URL || !SERVICE_KEY) return 0;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/companies?select=city&latitude=is.null&city=neq.&limit=200`,
      { headers: serviceHeaders() },
    );
    if (!res.ok) return 0;
    const rows = (await res.json().catch(() => [])) || [];

    const cities = [...new Set(rows.map((row) => clean(row?.city, 120)).filter(Boolean))];
    let healed = 0;

    for (const city of cities.slice(0, 15)) {
      const coords = await geocode(city);
      if (!coords) continue; // still unplaceable (a bare country, say)
      const patched = await fetch(
        `${SUPABASE_URL}/rest/v1/companies?latitude=is.null&city=eq.${encodeURIComponent(city)}`,
        {
          method: 'PATCH',
          headers: { ...serviceHeaders(), Prefer: 'return=minimal' },
          body: JSON.stringify({ latitude: coords.latitude, longitude: coords.longitude }),
        },
      );
      if (patched.ok) healed += 1;
    }
    return healed;
  } catch {
    return 0;
  }
};

/**
 * Resolve companies to their real office coordinates, on demand.
 *
 * Not done during discovery: a city yields dozens of companies and geocoding
 * every one of them up front would cost more than the hiring lookup itself.
 * The map asks for the handful it is actually showing, and the answer is
 * stored, so each company is paid for once ever.
 */
const resolvePreciseLocations = async (requests) => {
  const out = [];
  const pending = requests.slice(0, MAX_RESOLVE_PER_REQUEST);
  if (!pending.length) return out;

  // Each distinct city is geocoded once (memoised) to give the drift check
  // something to measure against.
  const cities = [...new Set(pending.map((entry) => clean(entry?.city, 120)).filter(Boolean))];
  const cityPoints = new Map(
    await Promise.all(
      cities.map(async (city) => {
        try {
          return [city, await geocodePlace(city)];
        } catch {
          return [city, null];
        }
      }),
    ),
  );

  // Independent lookups, so in parallel; serial would blow the time budget.
  const resolved = await Promise.all(
    pending.map(async (entry) => {
      const domain = clean(entry?.domain, 200).toLowerCase();
      const name = clean(entry?.name, 200);
      const city = clean(entry?.city, 120);
      if (!domain || !name) return null;
      try {
        const point = await geocodeCompany(name, city);
        if (!point) return null;

        const anchor = cityPoints.get(city);
        if (anchor) {
          const km = distanceKm(anchor.latitude, anchor.longitude, point.latitude, point.longitude);
          // A different continent is not a better answer than the city centre.
          if (km > MAX_OFFICE_DRIFT_KM) return null;
        }
        return { domain, ...point };
      } catch {
        return null;
      }
    }),
  );

  const rows = [];
  for (const hit of resolved) {
    if (!hit) continue;
    out.push(hit);
    rows.push({
      canonical_domain: hit.domain,
      latitude: hit.latitude,
      longitude: hit.longitude,
      geo_precision: 'exact',
      geo_resolved_at: new Date().toISOString(),
    });
  }

  // PATCH per row: an upsert would need every NOT NULL column, and these
  // companies already exist.
  if (SUPABASE_URL && SERVICE_KEY) {
    await Promise.all(
      rows.map((row) =>
        fetch(
          `${SUPABASE_URL}/rest/v1/companies?canonical_domain=eq.${encodeURIComponent(row.canonical_domain)}`,
          {
            method: 'PATCH',
            headers: { ...serviceHeaders(), Prefer: 'return=minimal' },
            body: JSON.stringify({
              latitude: row.latitude,
              longitude: row.longitude,
              geo_precision: row.geo_precision,
              geo_resolved_at: row.geo_resolved_at,
            }),
          },
        ).catch(() => null),
      ),
    );
  }

  return out;
};

// ---------- Orthogonal ----------

/**
 * Field names are read defensively with fallbacks: the exact shape of a catalog
 * endpoint's response isn't contractual, and the discovery call may route to
 * different providers. Anything we can't identify is skipped rather than stored
 * half-formed.
 */
/**
 * Hiring endpoints return one row per JOB, but the map is company-level, so
 * rows are grouped by company and the group size becomes the open-role count.
 *
 * Note this is roles *seen in this response* — a lower bound, not the company's
 * true total, since the endpoint pages. A real lower bound beats both a zero and
 * an invented number.
 *
 * Field names are read defensively: the catalog routes to different providers
 * and no response shape is contractual. JSON:API envelopes are flattened first.
 */
const aggregateCompanies = (items, fallbackCity) => {
  const byDomain = {};
  const jobs = [];

  for (const raw of items) {
    const item = raw?.attributes && typeof raw.attributes === 'object' ? { ...raw, ...raw.attributes } : raw;

    const name = clean(
      item?.companyName ?? item?.company_name ?? item?.name ?? item?.company ?? item?.organization,
      200,
    );
    if (!name) continue;

    // The dedup key must come from the COMPANY's own domain. Deriving it from a
    // job URL would collapse every posting on a job board into one row keyed by
    // the board's domain.
    const website = toAbsoluteUrl(
      item?.companyWebsite ?? item?.website ?? item?.company_url ?? item?.companyDomain ?? item?.domain ?? item?.company_domain,
    );
    const domain = canonicalDomain(website, '');
    if (!domain) continue;

    const jobUrl = toAbsoluteUrl(item?.jobUrl ?? item?.job_url ?? item?.url ?? item?.applyUrl);
    const careersUrl = toAbsoluteUrl(item?.careers_url ?? item?.careersUrl ?? item?.jobs_url ?? item?.job_board_url) || jobUrl;
    const city = clean(item?.city ?? item?.location ?? item?.region ?? item?.headquarters ?? fallbackCity, 120);
    const oneLiner = clean(
      item?.one_liner ?? item?.companyIndustry ?? item?.industry ?? item?.companyDescription ?? item?.description ?? item?.summary ?? item?.tagline,
      180,
    );
    // An explicit count, when the provider gives one, beats counting rows.
    const stated = nonNegativeInt(
      item?.open_roles ?? item?.openRoles ?? item?.job_count ?? item?.jobs_count ?? item?.total_jobs,
    );

    // Keep the role itself, not just the fact that one exists. job_key gives a
    // posting stable identity so re-discovering a city updates rows instead of
    // duplicating them.
    const title = clean(item?.title ?? item?.jobTitle ?? item?.position ?? item?.role, 200);
    const jobKey = clean(item?.jobId ?? item?.job_id ?? item?.id, 160) || jobUrl;
    if (title && jobKey) {
      jobs.push({
        job_key: jobKey,
        company_domain: domain,
        title,
        job_url: jobUrl,
        location: clean(item?.location, 200),
        city,
        employment_type: clean(item?.employmentType ?? item?.employment_type, 60),
        seniority: clean(item?.seniorityLevel ?? item?.seniority ?? item?.seniority_level, 60),
        job_function: clean(item?.jobFunction ?? item?.job_function ?? item?.department, 120),
        posted_at: toTimestamp(item?.datePosted ?? item?.date_posted ?? item?.postedAt),
        valid_through: toTimestamp(item?.validThrough ?? item?.valid_through),
        applicants: Number.isFinite(Number(item?.numApplicants)) ? Number(item.numApplicants) : null,
      });
    }

    const existing = byDomain[domain];
    if (existing) {
      existing.open_roles += stated || 1;
      if (!existing.careers_url && careersUrl) existing.careers_url = careersUrl;
      if (!existing.one_liner && oneLiner) existing.one_liner = oneLiner;
      if (!existing.city && city) existing.city = city;
      continue;
    }

    byDomain[domain] = {
      canonical_domain: domain,
      name,
      website,
      careers_url: careersUrl,
      one_liner: oneLiner,
      city,
      latitude: null,
      longitude: null,
      open_roles: stated || 1,
      is_hiring: true,
      source: 'orthogonal',
      last_enriched_at: new Date().toISOString(),
      logo_url: toAbsoluteUrl(item?.companyLogoUrl ?? item?.companyLogo ?? item?.logo_url),
      industry: clean(item?.companyIndustry ?? item?.industry, 120),
      linkedin_url: toAbsoluteUrl(item?.companyLinkedin ?? item?.company_linkedin_url),
      employee_count: Number.isFinite(Number(item?.companyEmployeeCount))
        ? Number(item.companyEmployeeCount)
        : null,
      founded_year: Number.isFinite(Number(item?.companyFoundedYear))
        ? Number(item.companyFoundedYear)
        : null,
    };
  }

  // A posting can legitimately appear on more than one page, and the repeat is
  // often thinner than the first sighting. Merge instead of overwriting, or a
  // sparse duplicate erases the title, seniority and date already captured.
  const uniqueJobs = Object.values(
    jobs.reduce((acc, job) => {
      const existingJob = acc[job.job_key];
      if (!existingJob) {
        acc[job.job_key] = job;
        return acc;
      }
      for (const [key, value] of Object.entries(job)) {
        const alreadySet = existingJob[key] !== '' && existingJob[key] != null;
        if (!alreadySet && value !== '' && value != null) existingJob[key] = value;
      }
      return acc;
    }, {}),
  );

  return { companies: Object.values(byDomain), jobs: uniqueJobs };
};

/**
 * Fill in coordinates for aggregated rows.
 *
 * Geocoding is a paid live lookup now rather than a table read, so it runs once
 * per DISTINCT city rather than once per company — a city search typically
 * yields a handful of distinct place strings across dozens of companies. Rows
 * whose city cannot be resolved keep null coordinates: still listed, just not
 * pinned.
 */
const attachCoordinates = async (rows, geocode) => {
  const cities = [...new Set(rows.map((row) => row.city).filter(Boolean))];

  // Resolved in parallel: these are independent network calls and doing them in
  // series pushed the request past its time limit.
  const pairs = await Promise.all(
    cities.map(async (city) => {
      try {
        return [city, await geocode(city)];
      } catch {
        return [city, null];
      }
    }),
  );
  const resolved = new Map(pairs);

  for (const row of rows) {
    const coords = resolved.get(row.city);
    row.latitude = coords?.latitude ?? null;
    row.longitude = coords?.longitude ?? null;
  }
  return rows;
};

const extractItems = (payload) => {
  const data = orthogonalData(payload);
  const candidates = [data, data?.results, data?.companies, data?.data, data?.items, data?.jobs];
  for (const candidate of candidates) {
    if (Array.isArray(candidate) && candidate.length) return candidate;
  }
  return [];
};

// Endpoint relevance signal for a hiring search.
const JOB_TERMS = ['job_opening', 'job-opening', 'job', 'hiring', 'career', 'vacanc', 'employment', 'recruit'];

/**
 * Build the request body from the endpoint's OWN declared parameter names.
 *
 * The location filter was silently ignored because the body hardcoded
 * `location`, while signalbase declares `city` and `search`. Guessing a common
 * shape does not work across providers, so intent is mapped onto whatever each
 * endpoint actually accepts.
 */
const buildRunBody = (candidate, query, city) => {
  const declared = Array.isArray(candidate?.params) ? candidate.params : [];
  // No schema published: fall back to the broadest common spelling.
  if (!declared.length) return { query, location: city || undefined, limit: PAGE_SIZE };

  const has = (name) => declared.includes(name);
  const body = {};

  const queryKey = ['search', 'query', 'title', 'q'].find(has);
  if (queryKey && query) body[queryKey] = query;

  if (city) {
    const cityKey = ['city', 'location'].find(has);
    if (cityKey) body[cityKey] = city;
  }

  if (has('limit')) body.limit = PAGE_SIZE;
  if (has('active_only')) body.active_only = true;
  if (has('not_closed')) body.not_closed = true;

  return body;
};

// Catalog structure, prices and endpoint errors are useful when tuning this
// integration but should not be public by default: set JOBS_DEBUG=1 to include
// them in responses.
const debugEnabled = () => process.env.JOBS_DEBUG === '1';

const withDebug = (payload, extra) => (debugEnabled() ? { ...payload, ...extra } : payload);

const jobsBudgetCents = () => Number.parseInt(process.env.JOBS_MAX_SPEND_CENTS || '', 10) || 25;

/**
 * Price the candidate endpoints before running any of them.
 *
 * /v1/search and /v1/details are unpaid, so the catalog's prices can be read for
 * free and the cheapest usable endpoint picked deliberately — rather than paying
 * whatever the first result happens to cost. Endpoints without a fixed price are
 * skipped: the session wrapper refuses to auto-execute unbounded pricing anyway.
 */
const priceCandidates = async (session, prompt) => {
  const found = await session.search(prompt, 10);
  const items = extractItems(found);

  // Structure-only trace of what discovery returned. The catalog response shape
  // is not contractual, so when nothing parses this is what says why — keys and
  // counts only, never values, since this is served on a public endpoint.
  const shape = {
    topLevelKeys: Object.keys(orthogonalData(found) || {}).slice(0, 15),
    itemCount: items.length,
    firstItemKeys: items.length ? Object.keys(items[0] || {}).slice(0, 20) : [],
    firstItemEndpointKeys:
      items.length && Array.isArray(items[0]?.endpoints) && items[0].endpoints.length
        ? Object.keys(items[0].endpoints[0] || {}).slice(0, 20)
        : [],
  };

  const priced = [];

  for (const entry of items.slice(0, 5)) {
    const api = clean(entry?.slug ?? entry?.api ?? entry?.provider, 80).toLowerCase();
    const endpoints = Array.isArray(entry?.endpoints) ? entry.endpoints : [entry];
    for (const endpoint of endpoints.slice(0, 4)) {
      const path = clean(endpoint?.path ?? endpoint?.endpoint, 200);
      if (!api || !path.startsWith('/')) continue;
      // Templated paths ("/v3/companies/{company_id_or_domain}/job_openings")
      // need an identifier a discovery search does not have, so they can never
      // be satisfied here — and being cheap, they otherwise crowd out the
      // endpoints that can actually answer.
      if (path.includes('{')) continue;
      try {
        const details = await session.details({ api, path });
        const info = details?.endpoint ?? details?.data?.endpoint ?? {};
        const priceUsd = Number(info?.price);
        const haystack = `${path} ${clean(endpoint?.description, 200)}`.toLowerCase();
        priced.push({
          api,
          path,
          method: (clean(endpoint?.method, 10) || 'GET').toUpperCase(),
          jobScore: JOB_TERMS.reduce((n, term) => (haystack.includes(term) ? n + 1 : n), 0),
          description: clean(endpoint?.description, 200),
          params: (() => {
            const raw = info?.parameters ?? info?.params ?? info?.queryParams ?? info?.schema;
            if (Array.isArray(raw)) return raw.map((x) => clean(x?.name ?? x, 40)).slice(0, 25);
            if (raw && typeof raw === 'object') return Object.keys(raw).slice(0, 25);
            return [];
          })(),
          priceCents: Number.isFinite(priceUsd) && priceUsd >= 0 ? Math.round(priceUsd * 100) : null,
          dynamic: info?.hasDynamicPricing === true || !Number.isFinite(priceUsd) || priceUsd < 0,
        });
      } catch {
        // Not priceable (not allowlisted, lookup failed) — it simply isn't a candidate.
      }
    }
  }

  // Relevance before price: the cheapest endpoint in a jobs search was a
  // "startup platform posts" feed, which is not hiring data at any price.
  priced.sort((a, b) => (b.jobScore - a.jobScore) || ((a.priceCents ?? Infinity) - (b.priceCents ?? Infinity)));
  return { priced, shape };
};

/**
 * Discovery, then at most one paid run against the cheapest affordable endpoint.
 *
 * When nothing is affordable the prices found are returned rather than a bare
 * failure, so the cap can be set from real catalog numbers instead of guesswork.
 */
const discoverAndRun = async (query, city, geocode) => {
  const budgetCents = jobsBudgetCents();
  // search/details are unpaid, and pricing a cold catalog needs many of them,
  // so the call ceiling is generous. Spending stays bounded by maxSpendCents.
  const session = createOrthogonalSession({ maxCalls: 40, maxSpendCents: budgetCents });

  const prompt = city
    ? `companies hiring in ${city} with open job postings and careers page: ${query}`
    : `companies hiring with open job postings and careers page: ${query}`;

  const { priced: candidates, shape } = await priceCandidates(session, prompt);
  const affordable = candidates.filter((c) => !c.dynamic && c.priceCents != null && c.priceCents <= budgetCents);

  if (!affordable.length) {
    return { companies: [], unaffordable: candidates.slice(0, 8), budgetCents, shape };
  }

  let lastRunShape = null;
  const attemptErrors = [];
  for (const candidate of affordable.slice(0, 4)) {
    try {
      // A GET endpoint takes its filters as query parameters. Sending them in
      // the body meant every filter was silently ignored and the same default
      // page came back for every search.
      const runBody = buildRunBody(candidate, query, city);
      const isGet = candidate.method !== 'POST' && candidate.method !== 'PUT' && candidate.method !== 'PATCH';
      // Query parameters must be strings — a numeric limit is rejected with
      // "Expected string, received number".
      const asQuery = Object.fromEntries(Object.entries(runBody).map(([k, v]) => [k, String(v)]));
      const run = await session.run({
        api: candidate.api,
        path: candidate.path,
        body: isGet ? {} : runBody,
        query: isGet ? asQuery : {},
      });

      let items = extractItems(run);

      // One page of job rows collapses to only a handful of companies once
      // grouped, which is why the corpus grew so slowly. Pull further pages
      // while the endpoint supports paging and the budget allows; the session
      // throws once spending is exhausted, and that is the natural stop.
      const supportsPaging = Array.isArray(candidate.params) && candidate.params.includes('page');
      if (supportsPaging && items.length) {
        for (let page = 2; page <= MAX_DISCOVERY_PAGES; page += 1) {
          try {
            const pageBody = { ...runBody, page };
            const pageQuery = Object.fromEntries(
              Object.entries(pageBody).map(([k, v]) => [k, String(v)]),
            );
            const more = await session.run({
              api: candidate.api,
              path: candidate.path,
              body: isGet ? {} : pageBody,
              query: isGet ? pageQuery : {},
            });
            const moreItems = extractItems(more);
            if (!moreItems.length) break; // ran out of results
            items = items.concat(moreItems);
          } catch (error) {
            // Budget or call ceiling reached: keep what earlier pages returned
            // rather than losing the whole search.
            if (error instanceof OrthogonalError && BUDGET_STOP.has(error.code)) break;
            break;
          }
        }
      }

      const aggregated = aggregateCompanies(items, city);
      const mapped = await attachCoordinates(aggregated.companies.slice(0, MAX_UPSERT_ROWS), geocode);
      // Only keep roles whose company survived the cap, so the foreign key
      // always has a parent.
      const keptDomains = new Set(mapped.map((row) => row.canonical_domain));
      const mappedJobs = aggregated.jobs.filter((job) => keptDomains.has(job.company_domain));
      if (mapped.length) {
        return {
          companies: mapped,
          jobs: mappedJobs,
          usage: session.usage(),
          shape,
          used: {
            api: candidate.api,
            path: candidate.path,
            method: candidate.method,
            sent: runBody,
            pagesFetched: supportsPaging ? Math.ceil(items.length / Math.max(runBody.limit || 40, 1)) : 1,
            jobRows: items.length,
          },
        };
      }
      lastRunShape = { api: candidate.api, path: candidate.path, ...runShape(run) };
    } catch (error) {
      // Out of budget stops everything; a single bad endpoint just loses its turn.
      if (error instanceof OrthogonalError && BUDGET_STOP.has(error.code)) throw error;
      attemptErrors.push({
        api: candidate.api,
        path: candidate.path,
        code: error?.code || 'error',
        status: error?.status || 0,
        message: clean(error?.message, 160),
      });
    }
  }
  return { companies: [], usage: session.usage(), shape, lastRunShape, candidates: candidates.slice(0, 10), attemptErrors };
};

/** Structure-only trace of a run response, for the same reason as `shape`. */
const runShape = (run) => {
  const items = extractItems(run);
  // Keys alone proved insufficient: a field can be present but null for every
  // row, which is indistinguishable from a naming mismatch. Count how many rows
  // actually carry a value for the fields the mapper depends on.
  const fill = {};
  for (const raw of items.slice(0, 40)) {
    const item = raw?.attributes && typeof raw.attributes === 'object' ? { ...raw, ...raw.attributes } : raw;
    for (const key of Object.keys(item || {})) {
      const value = item[key];
      const present = value != null && String(value).trim() !== '';
      if (present) fill[key] = (fill[key] || 0) + 1;
    }
  }
  return {
    itemCount: items.length,
    firstItemKeys: items.length ? Object.keys(items[0] || {}).slice(0, 25) : [],
    nonEmptyCounts: fill,
  };
};

const BUDGET_STOP = new Set(['orthogonal_budget_reached', 'orthogonal_insufficient_credits', 'orthogonal_call_limit']);

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
  // The client merges by freshness, so a row that omits this would look older
  // than the cached copy it is meant to replace.
  lastEnrichedAt: row.last_enriched_at ?? row.lastEnrichedAt ?? null,
});

export default async function jobsSearchHandler(req, res, { geocode }) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  const body = await readJsonBody(req);

  if (Array.isArray(body?.resolve)) {
    const gate = await rateLimitOk(req);
    if (!gate.ok) {
      res.setHeader('Retry-After', String(gate.retryAfter));
      return res.status(429).json({ ok: false, error: 'rate_limited', retryAfter: gate.retryAfter });
    }
    const located = await resolvePreciseLocations(body.resolve);
    return res.status(200).json({ ok: true, located });
  }

  const query = clean(body?.query, MAX_QUERY_CHARS);
  const city = clean(body?.city, 120);

  // Exploration sends the place name the basemap's own OpenStreetMap labels
  // report, so there is no reverse geocoding to do here. A viewport with no
  // place label under it never reaches this endpoint.
  const resolvedCity = city;

  if (!query && !city) {
    return res.status(400).json({ ok: false, error: 'query_required' });
  }

  const limit = await rateLimitOk(req);
  if (!limit.ok) {
    res.setHeader('Retry-After', String(limit.retryAfter));
    return res.status(429).json({ ok: false, error: 'rate_limited', retryAfter: limit.retryAfter });
  }

  // Heal rows the geocoder can place now but could not when they were written.
  // Cheap, unpaid, and self-terminating once the table has no null rows left.
  await backfillMissingCoordinates(geocode);

  // Cache first — never spend if the corpus already answers this.
  const cached = await selectCompanies(query, city);
  const fresh = cached.filter(isFresh);
  if (fresh.length) {
    return res.status(200).json({ ok: true, source: 'cache', companies: fresh.map(toClient), resolvedCity });
  }

  try {
    const { companies, jobs, unaffordable, budgetCents, shape, lastRunShape, candidates, used, attemptErrors } = await discoverAndRun(query, city, geocode);

    // Nothing in the catalog fits the cap. Report what the endpoints actually
    // cost so the cap can be set from real numbers (and so this doesn't look
    // like a generic outage).
    if (unaffordable) {
      return res.status(200).json(
        withDebug(
          {
            ok: true,
            source: 'cache',
            companies: cached.map(toClient),
            degraded: unaffordable.length ? 'over_budget' : 'no_endpoints',
          },
          { budgetCents, endpointPrices: unaffordable, shape },
        ),
      );
    }

    if (!companies.length) {
      // Nothing new; stale rows still beat an empty map. The shape trace says
      // whether discovery found nothing or the response just didn't map.
      return res.status(200).json(
        withDebug(
          { ok: true, source: 'cache', companies: cached.map(toClient), degraded: 'no_results' },
          { shape, lastRunShape, candidates, attemptErrors },
        ),
      );
    }
    await upsertCompanies(companies);
    await upsertJobs(jobs || []);
    return res.status(200).json(
      withDebug({ ok: true, source: 'orthogonal', companies: companies.map(toClient), resolvedCity }, { used }),
    );
  } catch (error) {
    const status = error instanceof OrthogonalError ? error.status : 502;
    const code = error instanceof OrthogonalError ? error.code : 'jobs_search_failed';
    if (cached.length) {
      return res.status(200).json({ ok: true, source: 'cache', companies: cached.map(toClient), degraded: code });
    }
    return res.status(status >= 400 && status < 600 ? status : 502).json({ ok: false, error: code });
  }
}
