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
  // Wrap the entire handler so any throw (createClient with malformed URL,
  // network failure in supabase-js, schema mismatch on upsert, etc.) returns
  // a structured JSON error instead of a bare 500 the UI can't parse.
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ ok: false, error: 'method_not_allowed' });
      return;
    }
    if (!CLIENT_SECRET || !SUPABASE_URL || !SERVICE_ROLE_KEY) {
      const missing = [
        !CLIENT_SECRET && 'GITHUB_OAUTH_SECRET',
        !SUPABASE_URL && 'SUPABASE_URL',
        !SERVICE_ROLE_KEY && 'SUPABASE_SERVICE_ROLE_KEY',
      ].filter(Boolean);
      res.status(500).json({ ok: false, error: 'server_misconfigured', missing });
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

    let admin;
    try {
      admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
    } catch (clientError) {
      console.error('[gh-confirm] createClient threw', clientError);
      res.status(500).json({
        ok: false,
        error: 'supabase_client_init_failed',
        detail: String(clientError && clientError.message) || 'unknown',
      });
      return;
    }

    const { data: userData, error: userError } = await admin.auth.getUser(jwt);
    if (userError) {
      console.error('[gh-confirm] auth.getUser error', userError);
      res.status(401).json({
        ok: false,
        error: 'invalid_session',
        detail: String(userError.message || ''),
      });
      return;
    }
    if (!userData || !userData.user) {
      res.status(401).json({ ok: false, error: 'invalid_session', detail: 'no_user' });
      return;
    }
    const userId = userData.user.id;

    // 3. Write the verification under that user (service role bypasses RLS
    //    AND the column-level REVOKE we apply to authenticated / anon).
    //    Upsert so it works whether the founder_profiles row exists yet
    //    or not — many founders verify GitHub before filling out the rest
    //    of their profile.
    const { data: writeData, error: writeError } = await admin
      .from('founder_profiles')
      .upsert(
        {
          user_id: userId,
          github_username: login,
          github_verified: true,
          github_verified_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      )
      .select('user_id, github_verified, github_username');

    if (writeError) {
      // Surface the postgres code + message so misconfig is diagnosable.
      console.error('[gh-confirm] upsert error', writeError);
      res.status(500).json({
        ok: false,
        error: 'write_failed',
        detail: String(writeError.message || ''),
        code: writeError.code || '',
        hint: writeError.hint || '',
      });
      return;
    }

    console.log('[gh-confirm] verified', { userId, login, rows: writeData });
    res.status(200).json({ ok: true, username: login });
  } catch (err) {
    // Anything that escapes the try/catch above (e.g. supabase-js throws
    // mid-call) lands here so the client gets a real error instead of a
    // 500 with an empty body.
    console.error('[gh-confirm] unhandled', err);
    res.status(500).json({
      ok: false,
      error: 'unhandled',
      detail: String((err && err.message) || err),
    });
  }
}
