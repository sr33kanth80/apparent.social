import type { User } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { AppUser, DashboardRole } from '@/lib/apparent-types';

const DEV_SESSION_KEY = 'apparent-dev-session';

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

export const getDevSession = (): AppUser | null => {
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

export const createDevSession = (role: DashboardRole): AppUser => {
  const user: AppUser = {
    id: `dev-${role}`,
    email: role === 'investor' ? 'partner@apparent.dev' : 'founder@apparent.dev',
    role,
    isDev: true,
  };

  window.localStorage.setItem(DEV_SESSION_KEY, JSON.stringify(user));
  return user;
};

export const clearDevSession = () => {
  window.localStorage.removeItem(DEV_SESSION_KEY);
};

export const getCurrentAppUser = async (): Promise<AppUser | null> => {
  // When Supabase is configured, real auth always takes priority over any dev session
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.auth.getUser();
    if (!error && data.user) {
      clearDevSession(); // evict any stale dev session
      const appUser = toAppUser(data.user);
      // Load the canonical username from the profiles table.
      // Falls back to the client-side derivation if the row isn't ready yet.
      const { data: profileRow } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', appUser.id)
        .maybeSingle();
      return { ...appUser, username: profileRow?.username ?? deriveUsername(appUser.email) };
    }
  }

  // Fall back to dev session only when Supabase is not configured or has no active session
  const devSession = getDevSession();
  if (devSession) {
    return { ...devSession, username: deriveUsername(devSession.email) };
  }

  return null;
};

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
    const username = await ensureProfile(base, role);
    return { ...base, role, username, isNew: false };
  }

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

/** Upserts the profiles row and returns the canonical username. */
export const ensureProfile = async (user: AppUser, role = user.role): Promise<string> => {
  if (!isSupabaseConfigured || !supabase || user.isDev) {
    return deriveUsername(user.email);
  }

  // Upsert without username — the DB trigger sets it on INSERT.
  // On UPDATE (existing user) the username column is untouched.
  const { error } = await supabase.from('profiles').upsert({
    id: user.id,
    role,
    email: user.email,
  });

  if (error) throw error;

  // Read back the canonical username (the trigger may have added a numeric suffix).
  const { data } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .maybeSingle();

  return data?.username ?? deriveUsername(user.email);
};
