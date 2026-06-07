import type { AppUser, DashboardRole } from '@/lib/apparent-types';
import { deriveUsername, persistExternalAppUser } from '@/lib/auth-service';

const CLERK_ROLE_KEY = 'apparent:clerk-role';

interface ClerkUserLike {
  id: string;
  primaryEmailAddress?: { emailAddress: string } | null;
  emailAddresses: { emailAddress: string }[];
}

export const isClerkConfigured = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);

const roleKey = (clerkUserId: string) => `${CLERK_ROLE_KEY}:${clerkUserId}`;

const isDashboardRole = (value: unknown): value is DashboardRole =>
  value === 'founder' || value === 'investor';

export const saveRequestedClerkRole = (role: DashboardRole) => {
  try {
    window.localStorage.setItem(CLERK_ROLE_KEY, role);
  } catch {
    /* localStorage unavailable */
  }
};

export const resolveClerkRole = (clerkUserId: string, fallback: DashboardRole): DashboardRole => {
  try {
    const scoped = window.localStorage.getItem(roleKey(clerkUserId));
    if (isDashboardRole(scoped)) return scoped;

    const requested = window.localStorage.getItem(CLERK_ROLE_KEY);
    if (isDashboardRole(requested)) {
      window.localStorage.setItem(roleKey(clerkUserId), requested);
      return requested;
    }
  } catch {
    /* localStorage unavailable */
  }

  return fallback;
};

export const buildClerkAppUser = (clerkUser: ClerkUserLike, role: DashboardRole): AppUser => {
  const email =
    clerkUser.primaryEmailAddress?.emailAddress ||
    clerkUser.emailAddresses[0]?.emailAddress ||
    `${clerkUser.id}@clerk.apparent.local`;
  const username = deriveUsername(email);

  const appUser: AppUser = {
    id: `clerk:${clerkUser.id}`,
    email,
    role,
    isDev: true,
    username,
  };

  persistExternalAppUser(appUser);
  return appUser;
};
