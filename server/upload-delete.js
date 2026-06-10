// Deletes one or more objects from Cloudflare R2 using presigned DELETE URLs.
// Called server-side after a product launch is removed from Supabase.

import { createHash, createHmac } from 'node:crypto';

const ACCOUNT_ID = process.env.R2_ACCOUNT_ID ?? '';
const BUCKET     = process.env.R2_BUCKET_NAME ?? '';
const PUBLIC_URL = (process.env.R2_PUBLIC_URL ?? '').replace(/\/$/, '');
const ACCESS_KEY = process.env.R2_ACCESS_KEY_ID ?? '';
const SECRET_KEY = process.env.R2_SECRET_ACCESS_KEY ?? '';

const sha256 = (data) => createHash('sha256').update(data).digest('hex');
const hmac   = (key, data) => createHmac('sha256', key).update(data).digest();

function sigV4Key(secret, date, region, service) {
  return hmac(hmac(hmac(hmac(`AWS4${secret}`, date), region), service), 'aws4_request');
}

function presignDelete(host, objectPath) {
  const now = new Date();
  const datetime = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const date = datetime.slice(0, 8);
  const region = 'auto';

  const credential = `${ACCESS_KEY}/${date}/${region}/s3/aws4_request`;
  const signedHeaders = 'host';

  const qParams = [
    ['X-Amz-Algorithm', 'AWS4-HMAC-SHA256'],
    ['X-Amz-Credential', credential],
    ['X-Amz-Date', datetime],
    ['X-Amz-Expires', '300'],
    ['X-Amz-SignedHeaders', signedHeaders],
  ].sort(([a], [b]) => a.localeCompare(b));

  const canonicalQS = qParams
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');

  const canonicalRequest = [
    'DELETE',
    `/${objectPath}`,
    canonicalQS,
    `host:${host}\n`,
    signedHeaders,
    'UNSIGNED-PAYLOAD',
  ].join('\n');

  const stringToSign = [
    'AWS4-HMAC-SHA256',
    datetime,
    `${date}/${region}/s3/aws4_request`,
    sha256(canonicalRequest),
  ].join('\n');

  const signature = createHmac('sha256', sigV4Key(SECRET_KEY, date, region, 's3'))
    .update(stringToSign)
    .digest('hex');

  return `https://${host}/${objectPath}?${canonicalQS}&X-Amz-Signature=${signature}`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // R2 not configured — nothing to do.
  if (!ACCOUNT_ID || !BUCKET || !PUBLIC_URL || !ACCESS_KEY || !SECRET_KEY) {
    return res.status(200).json({ deleted: 0 });
  }

  const { urls } = req.body ?? {};
  if (!Array.isArray(urls)) {
    return res.status(400).json({ error: 'urls must be an array' });
  }

  const host = `${ACCOUNT_ID}.r2.cloudflarestorage.com`;
  const prefix = PUBLIC_URL + '/';

  const results = await Promise.allSettled(
    urls
      .filter((url) => typeof url === 'string' && url.startsWith(prefix))
      .map(async (url) => {
        const key = url.slice(prefix.length);
        const objectPath = `${BUCKET}/${key}`;
        const deleteUrl = presignDelete(host, objectPath);
        const response = await fetch(deleteUrl, { method: 'DELETE' });
        // 404 means already gone — treat as success.
        if (!response.ok && response.status !== 404) {
          throw new Error(`R2 DELETE failed for ${key}: ${response.status}`);
        }
        return key;
      }),
  );

  const deleted = results.filter((r) => r.status === 'fulfilled').length;
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({ deleted });
}
