// Generates a short-lived presigned PUT URL so the browser can upload
// directly to Cloudflare R2 without routing file bytes through Vercel.
// Uses native node:crypto for SigV4 signing — no @aws-sdk dependency.

import { createHash, createHmac, randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const ACCOUNT_ID = process.env.R2_ACCOUNT_ID ?? '';
const BUCKET     = process.env.R2_BUCKET_NAME ?? '';
const PUBLIC_URL = (process.env.R2_PUBLIC_URL ?? '').replace(/\/$/, '');
const ACCESS_KEY = process.env.R2_ACCESS_KEY_ID ?? '';
const SECRET_KEY = process.env.R2_SECRET_ACCESS_KEY ?? '';

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

// SVG is intentionally excluded: it can carry inline <script>, so an
// unauthenticated (or even authenticated) upload of an SVG served from our
// CDN origin would be a stored-XSS vector. Raster/video/doc types only.
const ALLOWED_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo',
  'application/pdf',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]);

const ALLOWED_FOLDERS = new Set(['logos', 'banners', 'videos', 'decks', 'photos']);

// ---------- SigV4 primitives ----------

const sha256 = (data) => createHash('sha256').update(data).digest('hex');
const hmac   = (key, data) => createHmac('sha256', key).update(data).digest();

function sigV4Key(secret, date, region, service) {
  return hmac(hmac(hmac(hmac(`AWS4${secret}`, date), region), service), 'aws4_request');
}

/**
 * Build a presigned PUT URL using Signature Version 4.
 * R2 is S3-compatible and uses region 'auto'.
 */
function presignPut(host, key) {
  const now = new Date();
  // Format: 20230615T120000Z
  const datetime = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const date = datetime.slice(0, 8);
  const region = 'auto';

  const credential = `${ACCESS_KEY}/${date}/${region}/s3/aws4_request`;
  const signedHeaders = 'host';

  // Query parameters must be sorted lexicographically for canonical form.
  const qParams = [
    ['X-Amz-Algorithm', 'AWS4-HMAC-SHA256'],
    ['X-Amz-Credential', credential],
    ['X-Amz-Date', datetime],
    ['X-Amz-Expires', '900'],
    ['X-Amz-SignedHeaders', signedHeaders],
  ].sort(([a], [b]) => a.localeCompare(b));

  const canonicalQS = qParams
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');

  // Canonical request — payload hash is UNSIGNED-PAYLOAD for presigned PUTs.
  const canonicalRequest = [
    'PUT',
    `/${key}`,
    canonicalQS,
    `host:${host}\n`, // canonical headers (trailing \n is part of the spec)
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

  return `https://${host}/${key}?${canonicalQS}&X-Amz-Signature=${signature}`;
}

// ---------- Handler ----------

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Require a signed-in user. Without this, anyone could mint R2 PUT URLs and
  // fill the bucket (cost/abuse) or stage content on the CDN domain.
  if (!SUPABASE_URL || !ANON_KEY) {
    return res.status(503).json({ error: 'auth_not_configured' });
  }
  const authHeader = String(req.headers.authorization || '');
  const jwt = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!jwt) {
    return res.status(401).json({ error: 'unauthenticated' });
  }
  const { data: userData, error: userErr } = await createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false },
  }).auth.getUser(jwt);
  if (userErr || !userData?.user) {
    return res.status(401).json({ error: 'invalid_token' });
  }

  const { filename, contentType, folder = 'uploads' } = req.query;

  if (!filename || !contentType) {
    return res.status(400).json({ error: 'filename and contentType are required' });
  }

  if (!ALLOWED_TYPES.has(String(contentType))) {
    return res.status(400).json({ error: 'File type not allowed' });
  }

  const missing = [
    !ACCOUNT_ID    && 'R2_ACCOUNT_ID',
    !BUCKET        && 'R2_BUCKET_NAME',
    !PUBLIC_URL    && 'R2_PUBLIC_URL',
    !ACCESS_KEY    && 'R2_ACCESS_KEY_ID',
    !SECRET_KEY    && 'R2_SECRET_ACCESS_KEY',
  ].filter(Boolean);

  if (missing.length > 0) {
    return res.status(503).json({ error: 'Storage not configured', missing });
  }

  const safeFolder = ALLOWED_FOLDERS.has(String(folder)) ? String(folder) : 'uploads';
  const rawExt = String(filename).split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') ?? 'bin';
  const key = `${safeFolder}/${randomUUID()}.${rawExt}`;

  // Path-style: host = {account}.r2.cloudflarestorage.com, bucket is in the path.
  // Virtual-hosted style ({bucket}.{account}.r2.cloudflarestorage.com) is a two-level
  // subdomain that Cloudflare's wildcard DNS does not resolve.
  const host = `${ACCOUNT_ID}.r2.cloudflarestorage.com`;
  const objectPath = `${BUCKET}/${key}`;

  const uploadUrl = presignPut(host, objectPath);
  const publicUrl = `${PUBLIC_URL}/${key}`;

  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({ uploadUrl, publicUrl });
}
