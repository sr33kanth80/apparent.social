#!/usr/bin/env node
/**
 * upload-feed.mjs — push a local JSON file to the Apparent Cloudflare R2 bucket.
 *
 * Zero dependencies: native node:crypto SigV4 signing + global fetch (Node 18+).
 * Built for the Apparent scheduled ingestion job that sources external
 * launches and publishes the daily feeds the dashboard reads.
 *
 * ── Usage ───────────────────────────────────────────────────────────────────
 *   node scripts/upload-feed.mjs <localFile> <feed>
 *
 *   <feed> ∈ "external-launches" | "daily-digest"
 *           (mapped to feeds/external-launches.json | feeds/daily-digest.json)
 *
 *   Examples:
 *     node scripts/upload-feed.mjs ./out/launches.json external-launches
 *     node scripts/upload-feed.mjs ./out/digest.json   daily-digest
 *
 * ── Required environment variables ──────────────────────────────────────────
 *   R2_ACCOUNT_ID         Cloudflare account ID (32 hex chars)
 *   R2_BUCKET_NAME        the R2 bucket name
 *   R2_ACCESS_KEY_ID      R2 S3 API access key id
 *   R2_SECRET_ACCESS_KEY  R2 S3 API secret access key
 *
 * The script validates the file is JSON and matches the expected
 * { launches: [...] } shape before uploading, so a malformed scrape never
 * reaches production.
 */
import { existsSync, readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createHash, createHmac } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const FEEDS = {
  'external-launches': 'feeds/external-launches.json',
  'daily-digest': 'feeds/daily-digest.json',
};

// Load R2 secrets from a gitignored .env file at the repo root if env vars
// aren't already set. Lets a locally-scheduled run (scheduler / cron) pick
// up credentials without them being exported in the shell or baked into a
// task prompt. Looked-up files, in order: .env.r2.local, .env.local, .env
const loadLocalEnv = () => {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  for (const name of ['.env.r2.local', '.env.local', '.env']) {
    const path = join(root, name);
    if (!existsSync(path)) continue;
    try {
      const text = readFileSync(path, 'utf8');
      for (const line of text.split(/\r?\n/)) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
        if (!m) continue;
        const key = m[1];
        let val = m[2].replace(/^["']|["']$/g, ''); // strip surrounding quotes
        if (process.env[key] === undefined && val) process.env[key] = val;
      }
    } catch {
      /* unreadable file — ignore, fall through to whatever's in process.env */
    }
  }
};
loadLocalEnv();

const ACCOUNT_ID = process.env.R2_ACCOUNT_ID ?? '';
const BUCKET = process.env.R2_BUCKET_NAME ?? '';
const ACCESS_KEY = process.env.R2_ACCESS_KEY_ID ?? '';
const SECRET_KEY = process.env.R2_SECRET_ACCESS_KEY ?? '';

const sha256hex = (data) => createHash('sha256').update(data).digest('hex');
const hmac = (key, data) => createHmac('sha256', key).update(data).digest();

function sigV4Key(secret, date, region, service) {
  return hmac(hmac(hmac(hmac(`AWS4${secret}`, date), region), service), 'aws4_request');
}

function die(message) {
  console.error(`✗ ${message}`);
  process.exit(1);
}

async function main() {
  const [, , localPath, feedName] = process.argv;

  if (!localPath || !feedName) {
    die('Usage: node scripts/upload-feed.mjs <localFile> <external-launches|daily-digest>');
  }
  const key = FEEDS[feedName];
  if (!key) {
    die(`Unknown feed "${feedName}". Use "external-launches" or "daily-digest".`);
  }
  for (const [name, val] of [
    ['R2_ACCOUNT_ID', ACCOUNT_ID],
    ['R2_BUCKET_NAME', BUCKET],
    ['R2_ACCESS_KEY_ID', ACCESS_KEY],
    ['R2_SECRET_ACCESS_KEY', SECRET_KEY],
  ]) {
    if (!val) die(`Missing required env var ${name}.`);
  }

  // Read + validate the payload before uploading.
  let raw;
  try {
    raw = await readFile(localPath, 'utf8');
  } catch {
    die(`Cannot read file: ${localPath}`);
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    die('File is not valid JSON.');
  }
  if (!parsed || !Array.isArray(parsed.launches)) {
    die('JSON must be an object with a "launches" array.');
  }
  const named = parsed.launches.filter((l) => l && typeof l.name === 'string' && l.name.trim());
  if (named.length === 0) {
    die('No launches with a "name" field — refusing to upload an empty/invalid feed.');
  }

  // Re-serialize so we always upload clean, normalized JSON.
  const body = Buffer.from(JSON.stringify({ updatedAt: new Date().toISOString(), launches: parsed.launches }, null, 2));

  // ── SigV4 (authorization header, signed payload) ──
  const host = `${ACCOUNT_ID}.r2.cloudflarestorage.com`;
  const region = 'auto';
  const service = 's3';
  const now = new Date();
  const amzDate = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''); // 20240101T000000Z
  const dateStamp = amzDate.slice(0, 8);
  const canonicalUri = `/${BUCKET}/${key}`;
  const payloadHash = sha256hex(body);

  const canonicalHeaders =
    `host:${host}\n` +
    `x-amz-content-sha256:${payloadHash}\n` +
    `x-amz-date:${amzDate}\n`;
  const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';

  const canonicalRequest = ['PUT', canonicalUri, '', canonicalHeaders, signedHeaders, payloadHash].join('\n');
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, credentialScope, sha256hex(canonicalRequest)].join('\n');
  const signature = createHmac('sha256', sigV4Key(SECRET_KEY, dateStamp, region, service))
    .update(stringToSign)
    .digest('hex');

  const authorization =
    `AWS4-HMAC-SHA256 Credential=${ACCESS_KEY}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const res = await fetch(`https://${host}${canonicalUri}`, {
    method: 'PUT',
    headers: {
      Authorization: authorization,
      'x-amz-date': amzDate,
      'x-amz-content-sha256': payloadHash,
      'Content-Type': 'application/json',
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    die(`R2 upload failed: ${res.status} ${res.statusText}\n${text}`);
  }

  console.log(`✓ Uploaded ${named.length} launches → ${key} (${body.length} bytes)`);
}

main().catch((err) => die(err?.message ?? String(err)));
