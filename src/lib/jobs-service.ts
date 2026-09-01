import { supabase } from './supabase';
import type { HiringCompany } from './apparent-types';

/**
 * Jobs Map data access.
 *
 * Browsing reads the companies table directly (public RLS select) so panning
 * the map never touches a serverless function or spends Orthogonal budget.
 * Only an explicit search hits /api/jobs, which is rate-limited and cache-first
 * server-side.
 */

type CompanyRow = {
  canonical_domain: string;
  name: string;
  website: string | null;
  careers_url: string | null;
  one_liner: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  open_roles: number | null;
};

const fromRow = (row: CompanyRow): HiringCompany => ({
  domain: row.canonical_domain,
  name: row.name,
  website: row.website ?? '',
  careersUrl: row.careers_url ?? '',
  oneLiner: row.one_liner ?? '',
  city: row.city ?? '',
  latitude: row.latitude,
  longitude: row.longitude,
  openRoles: Number(row.open_roles ?? 0),
});

/** Everything already discovered — the free path that paints the map on load. */
export const browseCompanies = async (limit = 500): Promise<HiringCompany[]> => {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('companies')
    .select('canonical_domain,name,website,careers_url,one_liner,city,latitude,longitude,open_roles')
    .eq('is_hiring', true)
    .order('open_roles', { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return (data as CompanyRow[]).map(fromRow);
};

export type JobsSearchResult = {
  companies: HiringCompany[];
  /** 'cache' means the corpus answered it; 'orthogonal' means we discovered new rows. */
  source: 'cache' | 'orthogonal';
  error?: string;
};

/** Explicit search — the only path that can spend. */
export const searchCompanies = async (query: string, city = ''): Promise<JobsSearchResult> => {
  try {
    const res = await fetch('/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, city }),
    });
    const payload = await res.json().catch(() => null);

    if (!res.ok || !payload?.ok) {
      const code = payload?.error === 'rate_limited'
        ? 'Too many searches — give it a minute.'
        : 'Search is unavailable right now.';
      return { companies: [], source: 'cache', error: code };
    }
    return {
      companies: Array.isArray(payload.companies) ? (payload.companies as HiringCompany[]) : [],
      source: payload.source === 'orthogonal' ? 'orthogonal' : 'cache',
    };
  } catch {
    return { companies: [], source: 'cache', error: 'Search is unavailable right now.' };
  }
};
