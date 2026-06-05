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

export default async function handler(req, res) {
  const name = String(req.query.name ?? '');
  const key = FEEDS[name];

  if (!key) {
    return res.status(400).json({ error: 'unknown feed', launches: [] });
  }

  // R2 not configured — hand back an empty feed so the client stays happy.
  if (!PUBLIC_URL) {
    return res.status(200).json({ launches: [] });
  }

  try {
    // Pull the freshest file from R2; our own response is edge-cached below.
    const upstream = await fetch(`${PUBLIC_URL}/${key}`, { cache: 'no-store' });

    // 404 = scraper hasn't written this file yet. Treat as empty, not an error.
    if (!upstream.ok) {
      return res.status(200).json({ launches: [] });
    }

    const data = await upstream.json();

    // Cache at Vercel's edge for 5 min, serve stale up to 1h while revalidating.
    // The scraper only writes once a day, so this is plenty fresh and shields R2.
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=3600');
    return res.status(200).json(data);
  } catch {
    return res.status(200).json({ launches: [] });
  }
}
