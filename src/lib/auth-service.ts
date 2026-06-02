import type { User } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { AppUser, DashboardRole } from '@/lib/apparent-types';

const DEV_SESSION_KEY = 'apparent-dev-session';

// One-shot evict at module load: if Supabase is configured (i.e., we're in
// any deployed environment) and a stale dev-session key is lingering from a
// pre-launch build, wipe it so a returning user can't ride the old synthetic
// session in.
if (typeof window !== 'undefined' && isSupabaseConfigured) {
  try {
    window.localStorage.removeItem(DEV_SESSION_KEY);
  } catch {
    /* localStorage unavailable — non-fatal */
  }
}

/** Derive a URL-safe @-handle from an email address (mirrors the DB trigger logic). */
export const deriveUsername = (email: string): string =>
  email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '') || 'user';

const getRoleFromMetadata = (user: User): DashboardRole =>
  user.user_metadata?.role === 'investor' ? 'investor' : 'founder';

const toAppUser = (user: User): AppUser => ({
  id: user.id,
  email: user.email ?? '',
  role: getRoleFromMetadata(user),
  isDev: false,
});

// Dev-session helpers are intentionally NOT exported. They power a
// localStorage-backed fallback used only when Supabase env vars are absent
// (i.e., a fresh dev clone). No code path outside this module can grant a
// synthetic logged-in session — the pre-launch "Skip login" button that used
// to call these has been removed.
const getDevSession = (): AppUser | null => {
  const raw = window.localStorage.getItem(DEV_SESSION_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AppUser;
  } catch {
    window.localStorage.removeItem(DEV_SESSION_KEY);
    return null;
  }
};

const createDevSession = (role: DashboardRole): AppUser => {
  const user: AppUser = {
    id: `dev-${role}`,
    email: role === 'investor' ? 'partner@apparent.dev' : 'founder@apparent.dev',
    role,
    isDev: true,
  };

  window.localStorage.setItem(DEV_SESSION_KEY, JSON.stringify(user));
  return user;
};

const clearDevSession = () => {
  window.localStorage.removeItem(DEV_SESSION_KEY);
};

export const getCurrentAppUser = async (): Promise<AppUser | null> => {
  // When Supabase is configured, real auth always takes priority over any dev session
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.auth.getUser();
    if (!error && data.user) {
      clearDevSession(); // evict any stale dev session
      const appUser = toAppUser(data.user);
      // Load the canonical username AND role from the profiles table. The DB
      // row is the source of truth — user_metadata.role is only used as a
      // fallback when the profile row hasn't been written yet (race on first
      // sign up, or out-of-band auth.users imports).
      const { data: profileRow } = await supabase
        .from('profiles')
        .select('username, role')
        .eq('id', appUser.id)
        .maybeSingle();
      const dbRole =
        profileRow?.role === 'investor' || profileRow?.role === 'founder'
          ? (profileRow.role as DashboardRole)
          : appUser.role;
      return {
        ...appUser,
        role: dbRole,
        username: profileRow?.username ?? deriveUsername(appUser.email),
      };
    }
  }

  // Fall back to dev session only when Supabase is not configured or has no active session
  const devSession = getDevSession();
  if (devSession) {
    return { ...devSession, username: deriveUsername(devSession.email) };
  }

  return null;
};

/**
 * Human-readable label for the role-mismatch error so the Login screen can
 * show it as-is without parsing.
 */
const ROLE_LABEL: Record<DashboardRole, string> = {
  founder: 'Founder',
  investor: 'Investor',
};

class RoleMismatchError extends Error {
  /** The role the account is actually bound to in the DB. */
  readonly actualRole: DashboardRole;
  /** The role the user tried to sign in as. */
  readonly attemptedRole: DashboardRole;

  constructor(actualRole: DashboardRole, attemptedRole: DashboardRole) {
    super(
      `This account is registered as a ${ROLE_LABEL[actualRole]}. ` +
        `Switch to the ${ROLE_LABEL[actualRole]} sign-in to continue, ` +
        `or use a different email to create a ${ROLE_LABEL[attemptedRole]} account.`,
    );
    this.name = 'RoleMismatchError';
    this.actualRole = actualRole;
    this.attemptedRole = attemptedRole;
  }
}

export const isRoleMismatchError = (error: unknown): error is RoleMismatchError =>
  error instanceof RoleMismatchError;

export const signInWithEmail = async (
  email: string,
  password: string,
  role: DashboardRole,
): Promise<AppUser & { isNew: boolean }> => {
  if (!isSupabaseConfigured || !supabase) {
    return { ...createDevSession(role), isNew: false };
  }

  clearDevSession(); // ensure no stale dev session survives a real sign-in

  const signInResult = await supabase.auth.signInWithPassword({ email, password });

  if (signInResult.data.user) {
    const base = toAppUser(signInResult.data.user);

    // The account already exists. The DB profile row is the source of truth
    // for which role this email is bound to. If the user picked the wrong
    // toggle, reject — never silently flip an existing account's role.
    const { data: profileRow } = await supabase
      .from('profiles')
      .select('role, username')
      .eq('id', base.id)
      .maybeSingle();

    const existingRole =
      profileRow?.role === 'investor' || profileRow?.role === 'founder'
        ? (profileRow.role as DashboardRole)
        : null;

    if (existingRole && existingRole !== role) {
      // Sign the user back out so a dangling session doesn't trail behind
      // the rejection (otherwise getCurrentAppUser would still resolve them
      // on the next page load).
      await supabase.auth.signOut();
      throw new RoleMismatchError(existingRole, role);
    }

    // Role matches (or the profile row is missing from a legacy account).
    // Pass `existingRole ?? role` to ensureProfile so the upsert never
    // changes the role on an existing row — only fills it in if absent.
    const username = await ensureProfile(base, existingRole ?? role);
    return { ...base, role: existingRole ?? role, username, isNew: false };
  }

  // No existing account — create one and bind the requested role for the
  // very first time. From this point forward the role is immutable from the
  // client.
  const signUpResult = await supabase.auth.signUp({
    email,
    password,
    options: { data: { role } },
  });

  if (signUpResult.error || !signUpResult.data.user) {
    throw signInResult.error ?? signUpResult.error ?? new Error('Unable to sign in.');
  }

  const appUser = { ...toAppUser(signUpResult.data.user), role };
  const username = await ensureProfile(appUser, role);
  return { ...appUser, username, isNew: true };
};

export const sendEmailLink = async (email: string, role: DashboardRole) => {
  if (!isSupabaseConfigured || !supabase) {
    createDevSession(role);
    return;
  }

  // The OTP redirect path is bound to the role THIS request was sent for.
  // The actual role check happens again post-redirect in getCurrentAppUser
  // (which reads role from profiles, never trusts metadata or the URL).
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      data: { role },
      emailRedirectTo: window.location.origin + `/dashboard/${role}`,
    },
  });

  if (error) {
    throw error;
  }
};

export const signOut = async () => {
  clearDevSession();
  if (supabase) {
    await supabase.auth.signOut();
  }
};

/**
 * Insert the profiles row on first sign-up, then read back the canonical
 * username. NEVER updates an existing row's role — once an email is bound to
 * a role, that binding is permanent until an explicit out-of-band change.
 * Callers that want to silently flip roles cannot do so through this helper.
 */
export const ensureProfile = async (user: AppUser, role = user.role): Promise<string> => {
  if (!isSupabaseConfigured || !supabase || user.isDev) {
    return deriveUsername(user.email);
  }

  // Look up the existing row first. If one exists we don't write at all —
  // just read back the username. This guarantees a returning user's role
  // can't be overwritten by a stale `role` argument.
  const { data: existing } = await supabase
    .from('profiles')
    .select('username, role')
    .eq('id', user.id)
    .maybeSingle();

  if (existing) {
    return existing.username ?? deriveUsername(user.email);
  }

  // No row yet — first sign-up. Insert with the role passed in. The DB
  // trigger fills in the canonical @-handle.
  const { error: insertError } = await supabase
    .from('profiles')
    .insert({ id: user.id, role, email: user.email });

  if (insertError) {
    // Race: another tab/request created the row between our read and write.
    // Treat that as success — read back what's there.
    const { data: raceWinner } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .maybeSingle();
    if (raceWinner) return raceWinner.username ?? deriveUsername(user.email);
    throw insertError;
  }

  const { data: created } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .maybeSingle();

  return created?.username ?? deriveUsername(user.email);
};
