import { supabase } from './supabase';
import type { CompanyJob, HiringCompany } from './apparent-types';

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

const SELECT_COLUMNS =
  'canonical_domain,name,website,careers_url,one_liner,city,latitude,longitude,open_roles';

/** Everything already discovered — the free path that paints the map on load. */
export const browseCompanies = async (limit = 500): Promise<HiringCompany[]> => {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('companies')
    .select(SELECT_COLUMNS)
    .eq('is_hiring', true)
    .order('open_roles', { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return (data as CompanyRow[]).map(fromRow);
};

export type MapBounds = { west: number; south: number; east: number; north: number };

/**
 * Companies inside the current viewport, densest first.
 *
 * This is what makes the map behave like a property search: panning or zooming
 * loads what is actually in view instead of one fixed global page. It stays a
 * direct anon read (public RLS), so moving the map never costs anything.
 *
 * ponytail: a viewport crossing the antimeridian is not split into two ranges;
 * add that if the map ever opens centred on the Pacific.
 */
export const browseCompaniesInBounds = async (
  bounds: MapBounds,
  limit = 300,
): Promise<HiringCompany[]> => {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('companies')
    .select(SELECT_COLUMNS)
    .eq('is_hiring', true)
    .gte('latitude', bounds.south)
    .lte('latitude', bounds.north)
    .gte('longitude', bounds.west)
    .lte('longitude', bounds.east)
    .order('open_roles', { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return (data as CompanyRow[]).map(fromRow);
};

export type JobsSearchResult = {
  companies: HiringCompany[];
  /** 'cache' means the corpus answered it; 'orthogonal' means we discovered new rows. */
  source: 'cache' | 'orthogonal';
  /** City an exploration resolved the viewport to, when it could name one. */
  resolvedCity?: string;
  error?: string;
};

const postJobs = async (payload: Record<string, unknown>): Promise<JobsSearchResult> => {
  try {
    const res = await fetch('/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => null);

    if (!res.ok || !data?.ok) {
      return {
        companies: [],
        source: 'cache',
        error:
          data?.error === 'rate_limited'
            ? 'Too many searches - give it a minute.'
            : 'Search is unavailable right now.',
      };
    }
    return {
      companies: Array.isArray(data.companies) ? (data.companies as HiringCompany[]) : [],
      source: data.source === 'orthogonal' ? 'orthogonal' : 'cache',
      resolvedCity: typeof data.resolvedCity === 'string' ? data.resolvedCity : '',
    };
  } catch {
    return { companies: [], source: 'cache', error: 'Search is unavailable right now.' };
  }
};

/**
 * Discover whoever is hiring in a place, named by the map's own OSM labels.
 *
 * Passing a name rather than a coordinate means no reverse geocoding is needed
 * anywhere: the basemap already knows what city the viewer is looking at.
 */
export const discoverArea = async (placeName: string): Promise<JobsSearchResult> =>
  postJobs({ city: placeName });

/** Explicit text search. Like discovery, this can spend. */
export const searchCompanies = async (query: string, city = ''): Promise<JobsSearchResult> =>
  postJobs({ query, city });

type JobRow = {
  job_key: string;
  title: string;
  job_url: string | null;
  location: string | null;
  employment_type: string | null;
  seniority: string | null;
  job_function: string | null;
  posted_at: string | null;
};

/**
 * The actual open roles at one company, newest first.
 *
 * Read straight from the table under public RLS, so opening a pin costs
 * nothing. Before roles were stored, the panel could only say how many were
 * open and link to one arbitrary posting.
 */
export const loadJobsForCompany = async (domain: string, limit = 25): Promise<CompanyJob[]> => {
  if (!supabase || !domain) return [];
  const { data, error } = await supabase
    .from('company_jobs')
    .select('job_key,title,job_url,location,employment_type,seniority,job_function,posted_at')
    .eq('company_domain', domain)
    .order('posted_at', { ascending: false, nullsFirst: false })
    .limit(limit);
  if (error || !data) return [];
  return (data as JobRow[]).map((row) => ({
    jobKey: row.job_key,
    title: row.title,
    jobUrl: row.job_url ?? '',
    location: row.location ?? '',
    employmentType: row.employment_type ?? '',
    seniority: row.seniority ?? '',
    jobFunction: row.job_function ?? '',
    postedAt: row.posted_at,
  }));
};
