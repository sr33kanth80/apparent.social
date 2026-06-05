/**
 * External launch feed — reads scraper-produced JSON files hosted on
 * Cloudflare R2 and normalizes them into the same ProductLaunch shape the
 * "For You" feed already renders.
 *
 * Pipeline (write side, NOT in this repo):
 *   A scraper (e.g. Perplexity Computer, cron at 07:00 PST) writes two files
 *   to the public R2 bucket:
 *     - feeds/external-launches.json  → broad discovery feed (Idea 1)
 *     - feeds/daily-digest.json       → curated daily VC deal flow (Idea 2)
 *   See public/feeds/external-launches.sample.json for the expected schema.
 *
 * Read side (this module): plain public `fetch()` — the bucket already serves
 * uploaded assets publicly, so no auth/keys are needed in the browser. Uses a
 * localStorage stale-while-revalidate cache so the feed paints instantly on
 * revisit and survives a transient R2 hiccup.
 */
import type { ExternalLaunchFeed, ExternalLaunchRecord, ProductLaunch } from '@/lib/apparent-types';

// Public CDN base for the R2 bucket, e.g. https://cdn.apparent.dev
// (no trailing slash). When unset, the external feed is simply disabled —
// the dashboard falls back to Apparent-only launches.
const R2_PUBLIC_URL = ((import.meta.env.VITE_R2_PUBLIC_URL as string | undefined) ?? '').replace(/\/$/, '');

export const isExternalFeedConfigured = Boolean(R2_PUBLIC_URL);

const EXTERNAL_LAUNCHES_PATH = 'feeds/external-launches.json';
const DAILY_DIGEST_PATH = 'feeds/daily-digest.json';

const EXTERNAL_CACHE_KEY = 'apparent:external-launches-v1';
const DIGEST_CACHE_KEY = 'apparent:daily-digest-v1';

// ---------- localStorage SWR cache (mirrors dashboard-service) ----------

const readCache = <T>(key: string): { data: T; ts: number } | null => {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { data: T; ts: number };
    return parsed?.data !== undefined && typeof parsed.ts === 'number' ? parsed : null;
  } catch {
    return null;
  }
};

const writeCache = (key: string, data: unknown): void => {
  try {
    window.localStorage.setItem(key, JSON.stringify({ data, ts: Date.now() }));
  } catch {
    /* quota exceeded — ignore */
  }
};

// ---------- normalization ----------

const safeHttpUrl = (value?: string): string => {
  const raw = (value ?? '').trim();
  return /^https?:\/\//i.test(raw) ? raw : '';
};

/**
 * Turn a loose scraper record into a fully-formed ProductLaunch tagged
 * origin:'external'. Deterministic id so the feed dedupe + React keys are
 * stable across refreshes when the scraper omits an explicit id.
 */
const normalizeRecord = (record: ExternalLaunchRecord, index: number): ProductLaunch | null => {
  const name = (record.name ?? '').trim();
  if (!name) return null; // a launch with no name is unusable

  const source = (record.source ?? 'External').trim() || 'External';
  const stableId =
    (record.id && String(record.id).trim()) ||
    `ext-${source.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}-${index}`;

  return {
    id: stableId,
    ownerId: '', // no Apparent owner — external
    name,
    tagline: (record.tagline ?? '').trim(),
    intro: (record.description ?? '').trim(),
    category: (record.category ?? '').trim(),
    stage: (record.stage ?? 'Launched').trim() || 'Launched',
    location: (record.location ?? '').trim(),
    launchUrl: safeHttpUrl(record.url),
    proofUrl: safeHttpUrl(record.sourceUrl),
    logoUrl: safeHttpUrl(record.logoUrl),
    bannerUrl: safeHttpUrl(record.bannerUrl),
    founderSignals: Array.isArray(record.founderSignals) ? record.founderSignals : [],
    metrics: (record.metrics ?? record.mrr ?? '').trim(),
    updatedAt: (record.launchedAt ?? new Date().toISOString()).trim(),
    origin: 'external',
    source,
    sourceUrl: safeHttpUrl(record.sourceUrl),
  };
};

const normalizeFeed = (feed: ExternalLaunchFeed | null): ProductLaunch[] => {
  if (!feed || !Array.isArray(feed.launches)) return [];
  return feed.launches
    .map((record, index) => normalizeRecord(record, index))
    .filter((launch): launch is ProductLaunch => launch !== null);
};

// ---------- fetchers ----------

const fetchFeed = async (path: string): Promise<ExternalLaunchFeed | null> => {
  if (!R2_PUBLIC_URL) return null;
  try {
    // cache:no-store so we always pull the freshest scraper write; the R2 CDN
    // edge cache is short-lived but the browser HTTP cache could otherwise pin
    // a stale file for the whole session.
    const res = await fetch(`${R2_PUBLIC_URL}/${path}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()) as ExternalLaunchFeed;
  } catch {
    return null; // network error / malformed JSON → treat as empty
  }
};

/**
 * Broad discovery feed (Idea 1). Mixed into "For You" alongside real Apparent
 * launches. Returns [] when the feed is unconfigured or unreachable so callers
 * degrade gracefully to Apparent-only content.
 */
export const loadExternalLaunches = async (
  onCached?: (launches: ProductLaunch[]) => void,
): Promise<ProductLaunch[]> => {
  if (!R2_PUBLIC_URL) return [];

  const cached = readCache<ProductLaunch[]>(EXTERNAL_CACHE_KEY);
  if (cached && onCached) onCached(cached.data);

  const feed = await fetchFeed(EXTERNAL_LAUNCHES_PATH);
  if (!feed) return cached?.data ?? [];

  const launches = normalizeFeed(feed);
  writeCache(EXTERNAL_CACHE_KEY, launches);
  return launches;
};

/**
 * Curated daily VC deal flow (Idea 2). Refreshed by the scraper at 07:00 PST;
 * surfaced at the top of the investor Overview as "Fresh today".
 */
export const loadDailyDigest = async (
  onCached?: (launches: ProductLaunch[]) => void,
): Promise<ProductLaunch[]> => {
  if (!R2_PUBLIC_URL) return [];

  const cached = readCache<ProductLaunch[]>(DIGEST_CACHE_KEY);
  if (cached && onCached) onCached(cached.data);

  const feed = await fetchFeed(DAILY_DIGEST_PATH);
  if (!feed) return cached?.data ?? [];

  const launches = normalizeFeed(feed);
  writeCache(DIGEST_CACHE_KEY, launches);
  return launches;
};
