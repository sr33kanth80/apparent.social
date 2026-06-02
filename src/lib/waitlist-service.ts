import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export type WaitlistRole = '' | 'founder' | 'investor' | 'curious';

export interface WaitlistSignupInput {
  email: string;
  role?: WaitlistRole;
  source?: string;
}

export interface WaitlistSignupResult {
  ok: boolean;
  /** True when a row was created. False on duplicate-email re-submit. */
  isNew: boolean;
  message: string;
}

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const WAITLIST_LOCAL_KEY = 'apparent:waitlist-local';

/**
 * Insert into `waitlist_signups`. Falls back to a localStorage stash when
 * Supabase isn't configured (dev clones without env vars) so the form still
 * behaves correctly. Duplicate-email submits return ok=true, isNew=false so
 * the UI can show a friendly "you're already on it" message instead of an
 * error.
 */
export const signupForWaitlist = async (
  input: WaitlistSignupInput,
): Promise<WaitlistSignupResult> => {
  const email = input.email.trim().toLowerCase();
  if (!email || !EMAIL_SHAPE.test(email)) {
    return { ok: false, isNew: false, message: 'Enter a valid email address.' };
  }

  const role: WaitlistRole = input.role ?? '';
  const source = input.source ?? 'landing-cta';

  // Dev / no-Supabase fallback: stash locally so the form still feels alive.
  if (!isSupabaseConfigured || !supabase) {
    try {
      const raw = window.localStorage.getItem(WAITLIST_LOCAL_KEY);
      const list = raw ? (JSON.parse(raw) as string[]) : [];
      const alreadyOnList = list.includes(email);
      if (!alreadyOnList) {
        list.push(email);
        window.localStorage.setItem(WAITLIST_LOCAL_KEY, JSON.stringify(list));
      }
      return {
        ok: true,
        isNew: !alreadyOnList,
        message: alreadyOnList
          ? "You're already on the list."
          : "You're on the list — we'll be in touch.",
      };
    } catch {
      return {
        ok: false,
        isNew: false,
        message: 'Unable to save your email locally.',
      };
    }
  }

  try {
    const userAgent =
      typeof window !== 'undefined' ? window.navigator.userAgent.slice(0, 240) : '';
    const referrer = typeof document !== 'undefined' ? document.referrer.slice(0, 240) : '';

    const { error } = await supabase.from('waitlist_signups').insert({
      email,
      role,
      source,
      user_agent: userAgent,
      referrer,
    });

    if (!error) {
      return {
        ok: true,
        isNew: true,
        message: "You're on the list — we'll be in touch when early access opens.",
      };
    }

    // Postgres unique-violation = duplicate email. Treat as success so the
    // visitor doesn't see a scary error for what's really a no-op.
    const isDuplicate =
      error.code === '23505' ||
      (typeof error.message === 'string' && error.message.toLowerCase().includes('duplicate'));
    if (isDuplicate) {
      return {
        ok: true,
        isNew: false,
        message: "You're already on the list — we'll be in touch when early access opens.",
      };
    }

    return {
      ok: false,
      isNew: false,
      message: error.message || 'Unable to save your email. Please try again.',
    };
  } catch (error) {
    return {
      ok: false,
      isNew: false,
      message: error instanceof Error ? error.message : 'Unable to save your email.',
    };
  }
};
