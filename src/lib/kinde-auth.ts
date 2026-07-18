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
export const kindeAudience = (import.meta.env.VITE_KINDE_AUDIENCE as string | undefined)?.trim() || '';
export const isKindeConfigured = Boolean(kindeClientId && kindeDomain);

// Connection IDs from the Kinde dashboard (Settings → Authentication → Identity
// Providers — each provider exposes a `conn_…` id). When we pass one of these
// as `connection_id` in authUrlParams, Kinde skips its hosted picker page and
// routes the user straight into that provider's flow:
//   - For OAuth (Google): one click → Google → back to Apparent. No Kinde UI.
//   - For email/password: skip the picker → land directly on Kinde's email form.
//
// IDs are read from Vite env vars so we can wire / re-wire connections without
// a code change. If an id is missing, the matching button hides itself; if ALL
// three are missing the panel falls back to the picker so the page never
// breaks during initial setup.
export const kindeGoogleConnectionId =
  (import.meta.env.VITE_KINDE_GOOGLE_CONN_ID as string | undefined)?.trim() || '';
export const kindeEmailPasswordConnectionId =
  (import.meta.env.VITE_KINDE_EMAIL_PASSWORD_CONN_ID as string | undefined)?.trim() || '';
export const kindeUsernamePasswordConnectionId =
  (import.meta.env.VITE_KINDE_USERNAME_PASSWORD_CONN_ID as string | undefined)?.trim() || '';

export type KindeConnectionKey = 'google' | 'email' | 'username';

export const kindeConnectionIds: Record<KindeConnectionKey, string> = {
  google: kindeGoogleConnectionId,
  email: kindeEmailPasswordConnectionId,
  username: kindeUsernamePasswordConnectionId,
};

/** True when at least one provider's connection id is configured. */
export const hasAnyKindeConnection = Object.values(kindeConnectionIds).some(Boolean);

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

export const roleFromKindeRoles = (values: unknown): DashboardRole | null => {
  if (!Array.isArray(values)) return null;
  const roles = new Set(values.flatMap((value) => {
    if (typeof value === 'string') return [value.toLowerCase()];
    if (!value || typeof value !== 'object') return [];
    const role = value as { id?: unknown; key?: unknown; name?: unknown };
    return [role.key, role.name, role.id]
      .filter((entry): entry is string => typeof entry === 'string')
      .map((entry) => entry.toLowerCase());
  }));
  const isFounder = roles.has('founder') || roles.has('apparent-founder');
  const isInvestor = roles.has('investor') || roles.has('apparent-investor');
  if (isFounder === isInvestor) return null;
  return isFounder ? 'founder' : 'investor';
};

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

export const resolveKindeAppRole = async (
  getToken: () => Promise<string | undefined>,
  requestedRole?: DashboardRole,
): Promise<DashboardRole> => {
  const token = await getToken();
  if (!token) throw new Error('Your session expired. Sign in again.');
  const response = await fetch('/api/kinde-profile', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestedRole ? { role: requestedRole } : {}),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !isDashboardRole(payload?.role)) {
    throw new Error(payload?.error || 'Unable to finish Apparent account setup.');
  }
  return payload.role;
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
