/**
 * External launch feed — reads scraper-produced JSON files hosted on
 * Cloudflare R2 and normalizes them into the same ProductLaunch shape the
 * "For You" feed already renders.
 *
 * Pipeline (write side, NOT in this repo):
 *   A Claude Code Routine (scheduled cron job) sources external launches and
 *   writes two files to the R2 bucket via the S3 API (see scripts/upload-feed.mjs):
 *     - feeds/external-launches.json  → broad discovery feed (Idea 1)
 *     - feeds/daily-digest.json       → curated daily VC deal flow (Idea 2)
 *   Feed files must be JSON objects with a `launches` array.
 *
 * Read side (this module): fetches a SAME-ORIGIN proxy route (/api/feeds) that
 * pulls the file from R2 server-side and returns it. Going through the proxy
 * avoids browser CORS on the R2 origin and reuses the existing server-side
 * R2_PUBLIC_URL env var — no public R2 URL needs to be exposed to the client.
 * A localStorage stale-while-revalidate cache paints the feed instantly on
 * revisit and survives a transient hiccup.
 */
import type { ExternalLaunchFeed, ExternalLaunchRecord, ProductLaunch } from '@/lib/apparent-types';

// Same-origin proxy. `name` selects which feed file the server pulls from R2.
const FEED_PROXY = '/api/feeds';

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

// `name` ∈ 'external-launches' | 'daily-digest'. The proxy maps it to the
// matching R2 file. Returns null on any error so callers fall back to cache/[].
const fetchFeed = async (name: string): Promise<ExternalLaunchFeed | null> => {
  try {
    const res = await fetch(`${FEED_PROXY}?name=${encodeURIComponent(name)}`, { cache: 'no-store' });
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
  const cached = readCache<ProductLaunch[]>(EXTERNAL_CACHE_KEY);
  if (cached && onCached) onCached(cached.data);

  const feed = await fetchFeed('external-launches');
  if (!feed) return cached?.data ?? [];

  const launches = normalizeFeed(feed);
  writeCache(EXTERNAL_CACHE_KEY, launches);
  return launches;
};

/**
 * Curated daily VC deal flow (Idea 2). Refreshed by the Claude Code Routine
 * (scheduled cron job); surfaced on the investor "Daily" tab.
 */
export const loadDailyDigest = async (
  onCached?: (launches: ProductLaunch[]) => void,
): Promise<ProductLaunch[]> => {
  const cached = readCache<ProductLaunch[]>(DIGEST_CACHE_KEY);
  if (cached && onCached) onCached(cached.data);

  const feed = await fetchFeed('daily-digest');
  if (!feed) return cached?.data ?? [];

  const launches = normalizeFeed(feed);
  writeCache(DIGEST_CACHE_KEY, launches);
  return launches;
};
