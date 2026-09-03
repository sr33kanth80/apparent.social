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
  last_enriched_at?: string | null;
  geo_precision?: string | null;
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
  lastEnrichedAt: row.last_enriched_at ?? null,
  geoPrecision: row.geo_precision === 'exact' ? 'exact' : 'city',
});

/**
 * Columns every deployment is guaranteed to have.
 *
 * geo_precision arrives with a later migration, and selecting a column that
 * does not exist yet makes PostgREST reject the whole query — which would
 * empty the map until the migration ran. It is requested separately and
 * dropped if the database has not caught up.
 */
const BASE_COLUMNS =
  'canonical_domain,name,website,careers_url,one_liner,city,latitude,longitude,open_roles,last_enriched_at';
const OPTIONAL_COLUMNS = 'geo_precision';

/** Run a select with the optional columns, retrying without them on failure. */
const selectWithFallback = async (
  build: (columns: string) => PromiseLike<{ data: unknown; error: unknown }>,
): Promise<CompanyRow[]> => {
  const withOptional = await build(`${BASE_COLUMNS},${OPTIONAL_COLUMNS}`);
  if (!withOptional.error && withOptional.data) return withOptional.data as CompanyRow[];

  const base = await build(BASE_COLUMNS);
  if (!base.error && base.data) return base.data as CompanyRow[];
  return [];
};

/** Everything already discovered — the free path that paints the map on load. */
export const browseCompanies = async (limit = 500): Promise<HiringCompany[]> => {
  const client = supabase;
  if (!client) return [];
  const rows = await selectWithFallback((columns) =>
    client
      .from('companies')
      .select(columns)
      .eq('is_hiring', true)
      .order('open_roles', { ascending: false })
      .limit(limit),
  );
  return rows.map(fromRow);
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
  const client = supabase;
  if (!client) return [];
  const rows = await selectWithFallback((columns) =>
    client
      .from('companies')
      .select(columns)
      .eq('is_hiring', true)
      .gte('latitude', bounds.south)
      .lte('latitude', bounds.north)
      .gte('longitude', bounds.west)
      .lte('longitude', bounds.east)
      .order('open_roles', { ascending: false })
      .limit(limit),
  );
  return rows.map(fromRow);
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

export type CompanySubmission = {
  companyName: string;
  website: string;
  officeAddress: string;
  area: string;
  careersUrl: string;
  description: string;
  submitterName: string;
  submitterEmail: string;
};

/**
 * Submissions are insert-only under RLS: anyone may file one, nobody may read
 * them back, because they carry the submitter's name and email.
 */
export const submitCompany = async (submission: CompanySubmission): Promise<boolean> => {
  if (!supabase) return false;
  const { error } = await supabase.from('company_submissions').insert({
    company_name: submission.companyName,
    website: submission.website,
    office_address: submission.officeAddress,
    area: submission.area,
    careers_url: submission.careersUrl,
    description: submission.description,
    submitter_name: submission.submitterName,
    submitter_email: submission.submitterEmail,
  });
  return !error;
};

/** Email is optional: the form promises reports can be anonymous. */
export const submitProblemReport = async (report: {
  details: string;
  email: string;
}): Promise<boolean> => {
  if (!supabase) return false;
  const { error } = await supabase
    .from('problem_reports')
    .insert({ details: report.details, email: report.email });
  return !error;
};

/**
 * Ask the server to resolve companies to their real office coordinates.
 *
 * Each is a paid geocode, so the map requests only what it is showing; the
 * server stores the answer, making it a one-time cost per company.
 */
export const resolvePreciseLocations = async (
  entries: Array<{ domain: string; name: string; city: string }>,
): Promise<Array<{ domain: string; latitude: number; longitude: number }>> => {
  if (!entries.length) return [];
  try {
    const res = await fetch('/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resolve: entries }),
    });
    const data = await res.json().catch(() => null);
    return Array.isArray(data?.located) ? data.located : [];
  } catch {
    return [];
  }
};

/**
 * Fetch one company's individual roles.
 *
 * A city-wide discovery only keeps the first few pages of job rows, so many
 * companies carry a role COUNT with no roles behind it — as does every company
 * discovered before roles were stored at all. This asks for that company alone
 * and the server stores the result, so it is paid for once rather than once
 * per viewer.
 */
export const fetchCompanyRoles = async (
  domain: string,
  name: string,
  city: string,
): Promise<number> => {
  try {
    const res = await fetch('/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roles: { domain, name, city } }),
    });
    const data = await res.json().catch(() => null);
    return typeof data?.stored === 'number' ? data.stored : 0;
  } catch {
    return 0;
  }
};
