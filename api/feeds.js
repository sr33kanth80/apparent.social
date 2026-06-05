// Same-origin proxy for the scraper feed files on Cloudflare R2.
// The browser can't fetch() R2 directly without a CORS policy on the bucket,
// so this route pulls the file server-side (no CORS) and returns the JSON.
// Reuses the existing R2_PUBLIC_URL env var — the same public base that already
// serves uploaded images. Returns an empty feed (never an error) when the file
// is missing or R2 isn't configured, so the dashboard degrades gracefully.

const PUBLIC_URL = (process.env.R2_PUBLIC_URL ?? '').replace(/\/$/, '');

// Whitelist of feed names → object keys. Prevents the proxy from being used to
// fetch arbitrary paths off the bucket.
const FEEDS = {
  'external-launches': 'feeds/external-launches.json',
  'daily-digest': 'feeds/daily-digest.json',
};

// Don't cache empty / error / not-yet-uploaded responses — otherwise a stale
// "missing file" response can keep the dashboard empty even after the scraper
// uploads real data. Only successful responses with actual launches get cached.
const NO_CACHE = 'no-store, no-cache, must-revalidate, max-age=0';
const FRESH_CACHE = 's-maxage=60, stale-while-revalidate=600';

export default async function handler(req, res) {
  const name = String(req.query.name ?? '');
  const key = FEEDS[name];

  if (!key) {
    res.setHeader('Cache-Control', NO_CACHE);
    return res.status(400).json({ error: 'unknown feed', launches: [] });
  }

  // R2 not configured — hand back an empty feed so the client stays happy.
  if (!PUBLIC_URL) {
    res.setHeader('Cache-Control', NO_CACHE);
    return res.status(200).json({ launches: [], _diag: 'R2_PUBLIC_URL not set' });
  }

  const upstreamUrl = `${PUBLIC_URL}/${key}`;

  try {
    // Pull the freshest file from R2 (the edge handles the actual caching below).
    const upstream = await fetch(upstreamUrl, { cache: 'no-store' });

    // 404 = scraper hasn't written this file yet. Treat as empty, not an error,
    // but DON'T cache the empty — the file might appear any second.
    if (!upstream.ok) {
      res.setHeader('Cache-Control', NO_CACHE);
      return res.status(200).json({ launches: [], _diag: `upstream ${upstream.status}` });
    }

    const data = await upstream.json();
    const launches = Array.isArray(data?.launches) ? data.launches : [];

    // Only cache when there's actual data — otherwise we risk pinning an empty
    // result at the edge across uploads. Daily scraper write + 60s edge TTL is
    // a comfortable balance: R2 isn't hammered, but new uploads land within ~1min.
    res.setHeader('Cache-Control', launches.length > 0 ? FRESH_CACHE : NO_CACHE);
    return res.status(200).json(data);
  } catch (err) {
    res.setHeader('Cache-Control', NO_CACHE);
    return res.status(200).json({ launches: [], _diag: `fetch failed: ${err?.message ?? 'unknown'}` });
  }
}
