import type { AppUser, DashboardRole } from '@/lib/apparent-types';
import { deriveUsername, persistExternalAppUser } from '@/lib/auth-service';

const KINDE_ROLE_KEY = 'apparent:kinde-role';

interface KindeUserLike {
  id: string;
  email?: string;
}

const normalizeKindeDomain = (value: string) => {
  const normalized = value.trim().replace(/\/+$/, '');
  if (!normalized) return '';
  return /^https?:\/\//i.test(normalized) ? normalized : `https://${normalized}`;
};

export const kindeClientId = import.meta.env.VITE_KINDE_CLIENT_ID as string | undefined;
export const kindeDomain = import.meta.env.VITE_KINDE_DOMAIN as string | undefined;
export const isKindeConfigured = Boolean(kindeClientId && kindeDomain);

export const getKindeRedirectUri = () =>
  (import.meta.env.VITE_KINDE_REDIRECT_URI as string | undefined) ||
  (typeof window !== 'undefined' ? `${window.location.origin}/login` : '');

export const getKindeLogoutUri = () =>
  (import.meta.env.VITE_KINDE_LOGOUT_URI as string | undefined) ||
  (typeof window !== 'undefined' ? `${window.location.origin}/login` : '');

export const getKindeDomain = () => normalizeKindeDomain(kindeDomain ?? '');

const roleKey = (kindeUserId: string) => `${KINDE_ROLE_KEY}:${kindeUserId}`;

const isDashboardRole = (value: unknown): value is DashboardRole =>
  value === 'founder' || value === 'investor';

export const saveRequestedKindeRole = (role: DashboardRole) => {
  try {
    window.localStorage.setItem(KINDE_ROLE_KEY, role);
  } catch {
    /* localStorage unavailable */
  }
};

export const resolveKindeRole = (kindeUserId: string, fallback: DashboardRole): DashboardRole => {
  try {
    const scoped = window.localStorage.getItem(roleKey(kindeUserId));
    if (isDashboardRole(scoped)) return scoped;

    const requested = window.localStorage.getItem(KINDE_ROLE_KEY);
    if (isDashboardRole(requested)) {
      window.localStorage.setItem(roleKey(kindeUserId), requested);
      return requested;
    }
  } catch {
    /* localStorage unavailable */
  }

  return fallback;
};

export const buildKindeAppUser = (kindeUser: KindeUserLike, role: DashboardRole): AppUser => {
  const email = kindeUser.email || `${kindeUser.id}@kinde.apparent.local`;
  const username = deriveUsername(email);

  const appUser: AppUser = {
    id: `kinde:${kindeUser.id}`,
    email,
    role,
    isDev: true,
    username,
  };

  persistExternalAppUser(appUser);
  return appUser;
};
