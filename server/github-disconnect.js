// Disconnects a founder's GitHub verification. The github_verified columns
// are REVOKE'd from the authenticated role at the Postgres grant level (see
// 202606030002_lock_github_verification.sql), so even the founder can't
// clear them through normal client writes — only the service role can. This
// endpoint validates the founder's session, then clears the trust state
// under that user.

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ ok: false, error: 'method_not_allowed' });
      return;
    }
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      const missing = [
        !SUPABASE_URL && 'SUPABASE_URL',
        !SERVICE_ROLE_KEY && 'SUPABASE_SERVICE_ROLE_KEY',
      ].filter(Boolean);
      res.status(500).json({ ok: false, error: 'server_misconfigured', missing });
      return;
    }

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
      res.status(401).json({
        ok: false,
        error: 'invalid_session',
        detail: String((userError && userError.message) || 'no_user'),
      });
      return;
    }
    const userId = userData.user.id;

    const { error: writeError } = await admin
      .from('founder_profiles')
      .update({
        github_verified: false,
        github_username: '',
        github_verified_at: null,
        github_access_token_enc: '',
      })
      .eq('user_id', userId);

    if (writeError) {
      console.error('[gh-disconnect] update error', writeError);
      res.status(500).json({
        ok: false,
        error: 'write_failed',
        detail: String(writeError.message || ''),
        code: writeError.code || '',
        hint: writeError.hint || '',
      });
      return;
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[gh-disconnect] unhandled', err);
    res.status(500).json({
      ok: false,
      error: 'unhandled',
      detail: String((err && err.message) || err),
    });
  }
}
