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

/**
 * Deterministic per-(user, username) verification code. Stable so we don't need
 * to persist a pending token: only the logged-in user gets this exact code for
 * this exact claimed username, so a code in a public gist proves both identity
 * and account control. djb2-style hash → base36, prefixed for shape-validation
 * on the API side.
 */
export const githubVerificationCode = (user: AppUser, username: string): string => {
  const seed = `${user.id}:${username.toLowerCase()}`;
  let h = 5381;
  for (let i = 0; i < seed.length; i += 1) {
    h = ((h << 5) + h + seed.charCodeAt(i)) >>> 0;
  }
  // Mix in a second pass so short seeds still spread well.
  let h2 = 52711;
  for (let i = seed.length - 1; i >= 0; i -= 1) {
    h2 = ((h2 << 5) + h2 + seed.charCodeAt(i)) >>> 0;
  }
  const token = (h.toString(36) + h2.toString(36)).slice(0, 16);
  return `apparent-verify-${token}`;
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

/**
 * Ask the public-GitHub API whether the founder's gist proof is live, and on
 * success persist github_verified + the resolved username. Returns the updated
 * trust state (or the existing one on failure) plus an ok flag + message.
 */
export const verifyGithubOwnership = async (
  user: AppUser,
  username: string,
): Promise<{ ok: boolean; message: string; trust: FounderTrustState }> => {
  const login = extractGithubLogin(username) || username.trim();
  if (!login) {
    return { ok: false, message: 'Enter your GitHub username first.', trust: { ...EMPTY_TRUST } };
  }

  const code = githubVerificationCode(user, login);

  let verified = false;
  try {
    const res = await fetch(
      `/api/github?username=${encodeURIComponent(login)}&verify=${encodeURIComponent(code)}`,
    );
    if (res.ok) {
      const body = (await res.json()) as { verified?: boolean };
      verified = Boolean(body.verified);
    }
  } catch {
    verified = false;
  }

  if (!verified) {
    const current = await loadFounderTrust(user);
    return {
      ok: false,
      message:
        'No matching gist found yet. Create a public gist containing the code, then check again. It can take a few seconds for GitHub to update.',
      trust: current,
    };
  }

  // Verified — persist. Dev / no-Supabase: just return the verified state.
  if (!isSupabaseConfigured || !supabase || user.isDev) {
    return {
      ok: true,
      message: 'GitHub ownership verified.',
      trust: {
        ...EMPTY_TRUST,
        githubUsername: login,
        githubVerified: true,
        githubVerifiedAt: new Date().toISOString(),
      },
    };
  }

  try {
    const { error } = await supabase
      .from('founder_profiles')
      .update({
        github_username: login,
        github_verified: true,
        github_verified_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);
    if (error) {
      return { ok: false, message: error.message, trust: await loadFounderTrust(user) };
    }
    return {
      ok: true,
      message: 'GitHub ownership verified.',
      trust: await loadFounderTrust(user),
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'Unable to save verification.',
      trust: await loadFounderTrust(user),
    };
  }
};

/** Founder can disconnect/clear their GitHub verification. */
export const clearGithubVerification = async (user: AppUser): Promise<void> => {
  if (!isSupabaseConfigured || !supabase || user.isDev) return;
  try {
    await supabase
      .from('founder_profiles')
      .update({ github_verified: false, github_verified_at: null })
      .eq('user_id', user.id);
  } catch {
    /* non-fatal */
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
