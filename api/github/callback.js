// GitHub OAuth — step 2 of 3.
//
// GitHub redirects here after the founder authorizes Apparent. We exchange the
// one-time code for an access token (server-side, with the secret), fetch the
// authenticated GitHub user, then HMAC-sign { login, id } into a short-lived
// blob and bounce the browser back to the dashboard. The browser — which holds
// the Supabase session — then POSTs that blob to /api/github/confirm, where it
// gets written under the founder's account. The callback never touches the DB,
// so it doesn't need to know who the Apparent user is.

import crypto from 'crypto';

const CLIENT_ID = process.env.GITHUB_OAUTH_CLIENT_ID || 'Ov23li5dwJPP1dGzfy38';
const CLIENT_SECRET = process.env.GITHUB_OAUTH_SECRET || '';
// Where to send the browser back to. Must be the deployed origin so the
// dashboard route exists.
const APP_URL = process.env.APP_URL || 'https://apparentsocial.vercel.app';
// Signed blobs live for 10 minutes — plenty for the redirect round-trip.
const BLOB_TTL_MS = 10 * 60 * 1000;

const base64url = (input) =>
  Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const sign = (payload) =>
  base64url(crypto.createHmac('sha256', CLIENT_SECRET).update(payload).digest());

const redirect = (res, params) => {
  const qs = new URLSearchParams(params).toString();
  res.statusCode = 302;
  res.setHeader('Location', `${APP_URL}/dashboard/founder/profile?${qs}`);
  res.end();
};

export default async function handler(req, res) {
  const code = String((req.query && req.query.code) || '').trim();
  const state = String((req.query && req.query.state) || '').trim();

  if (!code) {
    redirect(res, { gh_error: 'missing_code' });
    return;
  }
  if (!CLIENT_SECRET) {
    redirect(res, { gh_error: 'server_misconfigured' });
    return;
  }

  try {
    // 1. Exchange the code for an access token.
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { accept: 'application/json', 'content-type': 'application/json' },
      body: JSON.stringify({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code,
        redirect_uri: `${APP_URL}/api/github/callback`,
      }),
    });
    const tokenBody = await tokenRes.json().catch(() => ({}));
    const accessToken = tokenBody.access_token;
    if (!accessToken) {
      redirect(res, { gh_error: 'token_exchange_failed', gh_state: state });
      return;
    }

    // 2. Identify the authenticated GitHub user.
    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        accept: 'application/vnd.github+json',
        authorization: `Bearer ${accessToken}`,
        'user-agent': 'apparent-app',
      },
    });
    const ghUser = await userRes.json().catch(() => ({}));
    if (!ghUser || !ghUser.login) {
      redirect(res, { gh_error: 'user_fetch_failed', gh_state: state });
      return;
    }

    // 3. Sign { login, id, exp } so the confirm step can trust it without a
    //    second GitHub round-trip and without the founder being able to forge
    //    a login.
    const exp = Date.now() + BLOB_TTL_MS;
    const payload = `${ghUser.login}:${ghUser.id}:${exp}`;
    const blob = `${base64url(payload)}.${sign(payload)}`;

    redirect(res, { gh_token: blob, gh_state: state });
  } catch {
    redirect(res, { gh_error: 'unexpected', gh_state: state });
  }
}
