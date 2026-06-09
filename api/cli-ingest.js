// npx apparent — ingest endpoint.
//
// Receives the founder-approved build payload from the CLI (aggregate git stats
// only; no source, no file paths), stores it as a pending submission keyed by a
// short code, and returns a claim URL. The founder signs in and claims it (see
// claim_cli_build in migration 202606080006).
//
// Unauthenticated by design — the CLI holds no login. The payload is the
// founder's own data, which they explicitly confirmed before this call.
//
// Env: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (service role inserts the row).

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const MAX_BYTES = 200 * 1024;

// Unambiguous alphabet (no 0/O/1/I/L).
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const genCode = (len = 8) => {
  let s = '';
  for (let i = 0; i < len; i += 1) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return s;
};

const readJsonBody = async (req) => {
  if (req.body && typeof req.body === 'object') return req.body;
  let raw = '';
  for await (const chunk of req) raw += chunk;
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    return null;
  }
};

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return res.status(200).json({ ok: false, error: 'server_misconfigured' });
  }

  const payload = await readJsonBody(req);
  if (!payload || typeof payload !== 'object' || typeof payload.totals !== 'object') {
    return res.status(400).json({ ok: false, error: 'invalid_payload' });
  }
  if (JSON.stringify(payload).length > MAX_BYTES) {
    return res.status(413).json({ ok: false, error: 'payload_too_large' });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  let code = '';
  for (let attempt = 0; attempt < 5; attempt += 1) {
    code = genCode();
    const { error } = await admin.from('cli_build_submissions').insert({ code, payload });
    if (!error) break;
    // Unique-collision (rare) → retry; anything else → fail out.
    if (!String(error.message || '').toLowerCase().includes('duplicate')) {
      return res.status(500).json({ ok: false, error: `store_failed: ${error.message}` });
    }
    code = '';
  }
  if (!code) return res.status(500).json({ ok: false, error: 'code_generation_failed' });

  const host = req.headers['x-forwarded-host'] || req.headers.host || '';
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const claimUrl = host ? `${proto}://${host}/claim-build?code=${code}` : `/claim-build?code=${code}`;

  return res.status(200).json({ ok: true, code, claimUrl });
}
