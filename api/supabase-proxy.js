const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';

const ALLOWED_PREFIXES = ['/auth/v1/', '/rest/v1/', '/storage/v1/', '/functions/v1/'];
const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'content-length',
  'host',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'x-forwarded-for',
  'x-forwarded-host',
  'x-forwarded-port',
  'x-forwarded-proto',
  'x-real-ip',
]);

const readBody = async (req) => {
  if (req.body != null) {
    if (Buffer.isBuffer(req.body)) return req.body;
    if (typeof req.body === 'string') return Buffer.from(req.body);
    return Buffer.from(JSON.stringify(req.body));
  }

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return chunks.length ? Buffer.concat(chunks) : undefined;
};

const getHeaderEntries = (headers) =>
  Object.entries(headers || {})
    .filter(([name]) => !HOP_BY_HOP_HEADERS.has(name.toLowerCase()))
    .flatMap(([name, value]) => {
      if (Array.isArray(value)) return value.map((item) => [name, item]);
      return value == null ? [] : [[name, String(value)]];
    });

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (!SUPABASE_URL) {
    res.status(500).json({ error: 'server_misconfigured', missing: ['SUPABASE_URL'] });
    return;
  }

  let configuredOrigin;
  let targetUrl;
  try {
    configuredOrigin = new URL(SUPABASE_URL).origin;
    targetUrl = new URL(String(req.query?.target || ''));
  } catch {
    res.status(400).json({ error: 'bad_target' });
    return;
  }

  if (
    targetUrl.origin !== configuredOrigin ||
    !ALLOWED_PREFIXES.some((prefix) => targetUrl.pathname.startsWith(prefix))
  ) {
    res.status(403).json({ error: 'target_not_allowed' });
    return;
  }

  try {
    const method = String(req.method || 'GET').toUpperCase();
    const upstream = await fetch(targetUrl.toString(), {
      method,
      headers: getHeaderEntries(req.headers),
      body: ['GET', 'HEAD'].includes(method) ? undefined : await readBody(req),
      redirect: 'manual',
    });

    res.status(upstream.status);
    upstream.headers.forEach((value, name) => {
      if (!HOP_BY_HOP_HEADERS.has(name.toLowerCase()) && name.toLowerCase() !== 'set-cookie') {
        res.setHeader(name, value);
      }
    });
    res.setHeader('Cache-Control', 'no-store');

    const buffer = Buffer.from(await upstream.arrayBuffer());
    res.end(buffer);
  } catch (error) {
    res.status(502).json({
      error: 'supabase_proxy_failed',
      detail: String(error?.message || error),
    });
  }
}
