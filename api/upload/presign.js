// Generates a short-lived presigned PUT URL so the browser can upload
// directly to Cloudflare R2 without routing file bytes through this function.
// Also ensures the bucket CORS policy allows browser PUTs (once per cold start).

import { S3Client, PutObjectCommand, PutBucketCorsCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

const ACCOUNT_ID  = process.env.R2_ACCOUNT_ID ?? '';
const BUCKET      = process.env.R2_BUCKET_NAME ?? '';
const PUBLIC_URL  = (process.env.R2_PUBLIC_URL ?? '').replace(/\/$/, '');

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId:     process.env.R2_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
  },
});

// Set bucket CORS once per cold start so browsers can PUT directly to R2.
let corsReady = false;
async function ensureCors() {
  if (corsReady) return;
  try {
    await r2.send(new PutBucketCorsCommand({
      Bucket: BUCKET,
      CORSConfiguration: {
        CORSRules: [{
          AllowedOrigins: ['*'],
          AllowedMethods: ['PUT', 'GET', 'HEAD'],
          AllowedHeaders: ['*'],
          MaxAgeSeconds: 3600,
        }],
      },
    }));
    corsReady = true;
  } catch {
    // Non-fatal — presigned PUT will still work if CORS was set previously.
  }
}

const ALLOWED_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo',
  'application/pdf',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]);

const ALLOWED_FOLDERS = new Set(['logos', 'banners', 'videos', 'decks', 'photos']);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { filename, contentType, folder = 'uploads' } = req.query;

  if (!filename || !contentType) {
    return res.status(400).json({ error: 'filename and contentType are required' });
  }

  if (!ALLOWED_TYPES.has(String(contentType))) {
    return res.status(400).json({ error: 'File type not allowed' });
  }

  if (!ACCOUNT_ID || !BUCKET || !PUBLIC_URL) {
    return res.status(503).json({ error: 'Storage not configured' });
  }

  await ensureCors();

  const safeFolder = ALLOWED_FOLDERS.has(String(folder)) ? String(folder) : 'uploads';
  const rawExt = String(filename).split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') ?? 'bin';
  const key = `${safeFolder}/${randomUUID()}.${rawExt}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: String(contentType),
  });

  const uploadUrl = await getSignedUrl(r2, command, { expiresIn: 900 }); // 15 min
  const publicUrl = `${PUBLIC_URL}/${key}`;

  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({ uploadUrl, publicUrl });
}
