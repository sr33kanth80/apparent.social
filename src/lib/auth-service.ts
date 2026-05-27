import type { User } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { AppUser, DashboardRole } from '@/lib/apparent-types';

const DEV_SESSION_KEY = 'apparent-dev-session';

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
  const devSession = getDevSession();
  if (devSession) {
    return devSession;
  }

  if (!isSupabaseConfigured || !supabase) {
    return null;
  }

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return null;
  }

  return toAppUser(data.user);
};

export const signInWithEmail = async (
  email: string,
  password: string,
  role: DashboardRole,
): Promise<AppUser> => {
  if (!isSupabaseConfigured || !supabase) {
    return createDevSession(role);
  }

  const signInResult = await supabase.auth.signInWithPassword({ email, password });

  if (signInResult.data.user) {
    await ensureProfile(toAppUser(signInResult.data.user), role);
    return { ...toAppUser(signInResult.data.user), role };
  }

  const signUpResult = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { role },
    },
  });

  if (signUpResult.error || !signUpResult.data.user) {
    throw signInResult.error ?? signUpResult.error ?? new Error('Unable to sign in.');
  }

  const appUser = { ...toAppUser(signUpResult.data.user), role };
  await ensureProfile(appUser, role);
  return appUser;
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

export const ensureProfile = async (user: AppUser, role = user.role) => {
  if (!isSupabaseConfigured || !supabase || user.isDev) {
    return;
  }

  const { error } = await supabase.from('profiles').upsert({
    id: user.id,
    role,
    email: user.email,
  });

  if (error) {
    throw error;
  }
};
