import type { AppUser } from '@/lib/apparent-types';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

// ── Trust layer ──────────────────────────────────────────────────────────────
// Verifiable founder proof. GitHub ownership is proven with a public-gist code;
// Stripe is a read-only connected fact surfaced as monthly revenue. Apparent
// never asserts these numbers are audited — it makes them legible so a VC's own
// diligence is faster.

export interface FounderTrustState {
  githubUsername: string;
  githubVerified: boolean;
  githubVerifiedAt: string;
  stripeConnected: boolean;
  stripeConnectedAt: string;
  /** Verified MRR snapshot in cents (null until Stripe is connected). */
  mrrCents: number | null;
  activeCustomers: number | null;
  mrrSyncedAt: string;
}

export interface MonthlyRevenuePoint {
  month: string; // YYYY-MM-01
  mrrCents: number;
  currency: string;
}

const EMPTY_TRUST: FounderTrustState = {
  githubUsername: '',
  githubVerified: false,
  githubVerifiedAt: '',
  stripeConnected: false,
  stripeConnectedAt: '',
  mrrCents: null,
  activeCustomers: null,
  mrrSyncedAt: '',
};

/** Pull the GitHub login (first path segment) out of a URL or @handle. */
export const extractGithubLogin = (github: string): string => {
  const raw = (github || '').trim();
  if (!raw) return '';
  try {
    const url = new URL(raw.startsWith('http') ? raw : `https://${raw}`);
    if (!/(^|\.)github\.com$/i.test(url.hostname)) return '';
    return url.pathname.split('/').filter(Boolean)[0] || '';
  } catch {
    return raw.replace(/^@/, '').split('/')[0];
  }
};

// GitHub OAuth App client id (public — safe in the bundle). Override with
// VITE_GITHUB_CLIENT_ID if you rotate the app.
const GITHUB_CLIENT_ID =
  (import.meta.env.VITE_GITHUB_CLIENT_ID as string | undefined) || 'Ov23li5dwJPP1dGzfy38';

// Must exactly match the OAuth App's registered Authorization callback URL.
const GITHUB_REDIRECT_URI = 'https://apparentsocial.vercel.app/api/github/callback';

const GH_STATE_KEY = 'apparent:gh-oauth-state';

/**
 * Kick off GitHub OAuth. Stores a CSRF nonce in sessionStorage and returns the
 * authorize URL; the caller redirects the browser to it. Scope read:user is
 * enough to confirm identity + read the public profile.
 */
export const buildGithubAuthorizeUrl = (): string => {
  const nonce = (typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  ).replace(/-/g, '');
  try {
    window.sessionStorage.setItem(GH_STATE_KEY, nonce);
  } catch {
    /* sessionStorage blocked — state check will just be skipped */
  }
  const params = new URLSearchParams({
    client_id: GITHUB_CLIENT_ID,
    redirect_uri: GITHUB_REDIRECT_URI,
    scope: 'read:user',
    state: nonce,
    allow_signup: 'true',
  });
  return `https://github.com/login/oauth/authorize?${params.toString()}`;
};

/** Confirm the CSRF nonce returned by GitHub matches what we stored. */
export const githubStateMatches = (returnedState: string): boolean => {
  try {
    const stored = window.sessionStorage.getItem(GH_STATE_KEY);
    window.sessionStorage.removeItem(GH_STATE_KEY);
    return Boolean(stored) && stored === returnedState;
  } catch {
    return true; // sessionStorage unavailable — don't hard-block.
  }
};

/**
 * Finish GitHub OAuth: hand the signed blob from the callback to
 * /api/github/confirm along with the founder's Supabase JWT. The server
 * verifies both and writes github_verified under their account.
 */
export const confirmGithubOAuth = async (
  blob: string,
): Promise<{ ok: boolean; username: string; message: string }> => {
  if (!isSupabaseConfigured || !supabase) {
    return { ok: false, username: '', message: 'Sign-in required to verify GitHub.' };
  }
  const { data } = await supabase.auth.getSession();
  const jwt = data.session?.access_token;
  if (!jwt) {
    return { ok: false, username: '', message: 'Your session expired — sign in again.' };
  }
  try {
    const res = await fetch('/api/github/confirm', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${jwt}` },
      body: JSON.stringify({ token: blob }),
    });
    const body = (await res.json().catch(() => ({}))) as { ok?: boolean; username?: string; error?: string };
    if (res.ok && body.ok) {
      return { ok: true, username: body.username ?? '', message: 'GitHub connected and verified.' };
    }
    return {
      ok: false,
      username: '',
      message: body.error === 'expired' ? 'That link expired — try connecting again.' : 'Could not verify GitHub. Try again.',
    };
  } catch {
    return { ok: false, username: '', message: 'Network error verifying GitHub.' };
  }
};

const mapTrustRow = (row: Record<string, unknown> | null): FounderTrustState => {
  if (!row) return { ...EMPTY_TRUST };
  return {
    githubUsername: String(row.github_username ?? ''),
    githubVerified: Boolean(row.github_verified),
    githubVerifiedAt: String(row.github_verified_at ?? ''),
    stripeConnected: Boolean(row.stripe_connected),
    stripeConnectedAt: String(row.stripe_connected_at ?? ''),
    mrrCents: row.mrr_cents === null || row.mrr_cents === undefined ? null : Number(row.mrr_cents),
    activeCustomers:
      row.active_customers === null || row.active_customers === undefined
        ? null
        : Number(row.active_customers),
    mrrSyncedAt: String(row.mrr_synced_at ?? ''),
  };
};

export const loadFounderTrust = async (user: AppUser): Promise<FounderTrustState> => {
  if (!isSupabaseConfigured || !supabase || user.isDev) {
    return { ...EMPTY_TRUST };
  }
  try {
    const { data } = await supabase
      .from('founder_profiles')
      .select(
        'github_username, github_verified, github_verified_at, stripe_connected, stripe_account_id, stripe_connected_at, mrr_cents, active_customers, mrr_synced_at',
      )
      .eq('user_id', user.id)
      .maybeSingle();
    return mapTrustRow(data as Record<string, unknown> | null);
  } catch {
    return { ...EMPTY_TRUST };
  }
};


/** Monthly revenue series for the project-page chart (public-readable for
 *  founders with a public profile). Empty until the Stripe sync populates it. */
export const loadFounderRevenueSeries = async (
  ownerId: string,
): Promise<MonthlyRevenuePoint[]> => {
  if (!isSupabaseConfigured || !supabase) return [];
  try {
    const { data, error } = await supabase
      .from('founder_revenue_monthly')
      .select('month, mrr_cents, currency')
      .eq('user_id', ownerId)
      .order('month', { ascending: true });
    if (error || !data) return [];
    return data.map((row) => ({
      month: String(row.month),
      mrrCents: Number(row.mrr_cents ?? 0),
      currency: String(row.currency ?? 'usd'),
    }));
  } catch {
    return [];
  }
};

// ── Stripe Connect — wiring lands in the Edge Function scaffold (next phase) ──
// startStripeConnect() will return the Connect OAuth URL; the callback Edge
// Function exchanges the code, stores stripe_account_id, and the sync job
// writes mrr_cents + founder_revenue_monthly. Placeholder kept here so the UI
// has a stable import target.
export const startStripeConnect = async (_user: AppUser): Promise<{ url: string } | null> => {
  // Until the Connect app + Edge Function exist this is a no-op the UI treats
  // as "coming soon".
  return null;
};
