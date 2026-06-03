// Real GitHub contribution calendar for a verified founder's public profile.
//
// Looks up the founder by their verified github_username (service-role read
// only, since the encrypted token column is REVOKE'd from all client roles),
// decrypts their OAuth access token, then queries the GitHub GraphQL API for
// their contributionsCollection.contributionCalendar.
//
// The same calendar is publicly visible on github.com/<login> — we're using
// the founder's own token only because GitHub gates the GraphQL contribution
// endpoint behind any authenticated request. Nothing private leaves the
// server.

import { createClient } from '@supabase/supabase-js';
import { decryptToken } from './_crypto.js';

const CLIENT_SECRET = process.env.GITHUB_OAUTH_SECRET || '';
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// GitHub usernames: 1–39 chars, alphanumeric + single hyphens. Constrain the
// input shape so a caller can't inject a path/query into the GraphQL request.
const VALID_LOGIN = /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/;

const GRAPHQL_QUERY = `query($login: String!) {
  user(login: $login) {
    contributionsCollection {
      contributionCalendar {
        totalContributions
        weeks {
          contributionDays {
            date
            contributionCount
          }
        }
      }
    }
  }
}`;

export default async function handler(req, res) {
  try {
    const username = String((req.query && req.query.username) || '').trim();
    if (!VALID_LOGIN.test(username)) {
      res.status(400).json({ ok: false, error: 'invalid_username' });
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

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Match the verified username case-insensitively — GitHub returns
    // canonical case, founders may type either.
    const { data, error } = await admin
      .from('founder_profiles')
      .select('github_username, github_verified, github_access_token_enc')
      .ilike('github_username', username)
      .eq('github_verified', true)
      .maybeSingle();

    if (error) {
      // Detect "column does not exist" so the UI degrades gracefully when the
      // token-storage migration hasn't been applied yet. Postgres / PostgREST
      // codes this as 42703 — treat as no_token so the grid falls back to
      // the deterministic mock instead of bricking the profile.
      const missingColumn =
        error.code === '42703' ||
        (typeof error.message === 'string' && error.message.toLowerCase().includes('does not exist'));
      if (missingColumn) {
        console.warn('[gh-contributions] token column missing — migration 3 not applied?');
        res.setHeader('Cache-Control', 'no-store');
        res.status(404).json({
          ok: false,
          error: 'migration_pending',
          detail:
            'Apply supabase/migrations/202606030003_github_token_storage.sql to enable real contribution grids.',
        });
        return;
      }
      console.error('[gh-contributions] lookup error', error);
      res.status(500).json({
        ok: false,
        error: 'lookup_failed',
        detail: String(error.message || ''),
        code: error.code || '',
        hint: error.hint || '',
      });
      return;
    }
    if (!data || !data.github_verified || !data.github_access_token_enc) {
      // No verified row, or no stored token (founder verified before the
      // token-storage migration was live; they need to disconnect + reconnect
      // to refresh). Caller falls back to the deterministic mock.
      res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=600');
      res.status(404).json({
        ok: false,
        error: data && data.github_verified ? 'reconnect_required' : 'no_token',
      });
      return;
    }

    const token = decryptToken(data.github_access_token_enc, CLIENT_SECRET);
    if (!token) {
      res.status(500).json({ ok: false, error: 'token_decrypt_failed' });
      return;
    }

    const ghRes = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        accept: 'application/vnd.github+json',
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
        'user-agent': 'apparent-app',
      },
      body: JSON.stringify({ query: GRAPHQL_QUERY, variables: { login: data.github_username } }),
    });

    if (ghRes.status === 401 || ghRes.status === 403) {
      // Token was revoked at GitHub or scopes changed — treat as unavailable
      // so the UI falls back gracefully.
      res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=600');
      res.status(404).json({ ok: false, error: 'token_revoked' });
      return;
    }
    if (!ghRes.ok) {
      const body = await ghRes.text().catch(() => '');
      console.error('[gh-contributions] github error', ghRes.status, body.slice(0, 200));
      res.status(502).json({ ok: false, error: 'github_upstream', status: ghRes.status });
      return;
    }

    const json = await ghRes.json().catch(() => ({}));
    const calendar = json && json.data && json.data.user
      ? json.data.user.contributionsCollection.contributionCalendar
      : null;
    if (!calendar) {
      res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=600');
      res.status(404).json({ ok: false, error: 'no_calendar' });
      return;
    }

    // Edge-cache the response for an hour with a day-long SWR window. The
    // calendar updates daily; serving stale-while-revalidate keeps the
    // profile snappy without hammering GitHub's rate limit.
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    res.status(200).json({
      ok: true,
      username: data.github_username,
      totalContributions: calendar.totalContributions,
      // Flatten to a 7×N grid (rows = days of week, cols = weeks) so the
      // client doesn't have to translate weeks ↔ columns.
      weeks: calendar.weeks.map((w) =>
        w.contributionDays.map((d) => ({ date: d.date, count: d.contributionCount })),
      ),
    });
  } catch (err) {
    console.error('[gh-contributions] unhandled', err);
    res.status(500).json({
      ok: false,
      error: 'unhandled',
      detail: String((err && err.message) || err),
    });
  }
}
