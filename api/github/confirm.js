// GitHub OAuth — step 3 of 3.
//
// The browser (holding the Supabase session) POSTs the signed blob from the
// callback here, with the founder's Supabase JWT in the Authorization header.
// We verify the blob's HMAC + expiry (so the login is server-trusted and
// unforgeable), validate the JWT to learn which Apparent user is calling, then
// write github_verified for THAT user with the service-role key — the only
// path allowed to write the locked verification columns.

import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const CLIENT_SECRET = process.env.GITHUB_OAUTH_SECRET || '';
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const base64url = (input) =>
  Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const timingSafeEqual = (a, b) => {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'method_not_allowed' });
    return;
  }
  if (!CLIENT_SECRET || !SUPABASE_URL || !SERVICE_ROLE_KEY) {
    res.status(500).json({ ok: false, error: 'server_misconfigured' });
    return;
  }

  // Body may arrive parsed (Vercel) or raw.
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }
  const token = String((body && body.token) || '');
  const [payloadB64, sigB64] = token.split('.');
  if (!payloadB64 || !sigB64) {
    res.status(400).json({ ok: false, error: 'bad_token' });
    return;
  }

  // 1. Verify the blob signature + expiry.
  const payload = Buffer.from(payloadB64.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString();
  const expectedSig = base64url(crypto.createHmac('sha256', CLIENT_SECRET).update(payload).digest());
  if (!timingSafeEqual(sigB64, expectedSig)) {
    res.status(401).json({ ok: false, error: 'bad_signature' });
    return;
  }
  const [login, , expStr] = payload.split(':');
  const exp = Number(expStr);
  if (!login || !Number.isFinite(exp) || Date.now() > exp) {
    res.status(401).json({ ok: false, error: 'expired' });
    return;
  }

  // 2. Identify the Apparent user from their Supabase JWT.
  const authHeader = String(req.headers.authorization || '');
  const jwt = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!jwt) {
    res.status(401).json({ ok: false, error: 'no_session' });
    return;
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: userData, error: userError } = await admin.auth.getUser(jwt);
  if (userError || !userData || !userData.user) {
    res.status(401).json({ ok: false, error: 'invalid_session' });
    return;
  }
  const userId = userData.user.id;

  // 3. Write the verification under that user (service role bypasses the
  //    column lock). Upsert so it works whether the founder_profiles row
  //    exists yet or not.
  const { error: writeError } = await admin
    .from('founder_profiles')
    .upsert(
      {
        user_id: userId,
        github_username: login,
        github_verified: true,
        github_verified_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );

  if (writeError) {
    res.status(500).json({ ok: false, error: 'write_failed' });
    return;
  }

  res.status(200).json({ ok: true, username: login });
}
