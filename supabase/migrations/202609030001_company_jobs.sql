-- Per-role job postings for the Jobs Map.
--
-- Discovery already fetches ~50 job rows per page and then collapsed them into
-- company rows, discarding every title, seniority and posting date. That left
-- the map able to say "3 open roles" without saying WHAT they are, and the
-- careers link pointing at one arbitrary posting. This keeps the roles.
--
-- Everything here is data we were already paying Orthogonal for, so storing it
-- costs nothing extra per call. Idempotent — safe to re-run.

create extension if not exists pgcrypto;

-- Company-level fields that were also being dropped on the floor.
alter table public.companies
  add column if not exists logo_url text not null default '',
  add column if not exists industry text not null default '',
  add column if not exists linkedin_url text not null default '',
  add column if not exists employee_count integer,
  add column if not exists founded_year integer;

create table if not exists public.company_jobs (
  id uuid primary key default gen_random_uuid(),
  -- Stable identity for one posting, so re-discovering a city updates rows
  -- instead of duplicating them. Provider job id where available, else the
  -- posting URL.
  job_key text not null,
  -- Ties a role to its pin. companies.canonical_domain is unique, so it can be
  -- referenced directly; discovery upserts companies before jobs.
  company_domain text not null references public.companies(canonical_domain) on delete cascade,
  title text not null,
  job_url text not null default '',
  location text not null default '',
  city text not null default '',
  employment_type text not null default '',
  seniority text not null default '',
  job_function text not null default '',
  -- Freshness matters more than almost anything else on a job board: a stale
  -- listing is worse than no listing.
  posted_at timestamptz,
  valid_through timestamptz,
  applicants integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint company_jobs_job_key_unique unique (job_key)
);

-- Roles for one pin, newest first (the panel's query).
create index if not exists company_jobs_company_posted_idx
  on public.company_jobs (company_domain, posted_at desc nulls last);

-- Filtering by freshness and by role attributes.
create index if not exists company_jobs_posted_idx on public.company_jobs (posted_at desc nulls last);
create index if not exists company_jobs_seniority_idx on public.company_jobs (seniority);
create index if not exists company_jobs_employment_idx on public.company_jobs (employment_type);

drop trigger if exists company_jobs_set_updated_at on public.company_jobs;
create trigger company_jobs_set_updated_at before update on public.company_jobs
for each row execute function public.set_updated_at();

-- Same posture as companies: anyone may read the map, only the service-role
-- search route writes.
alter table public.company_jobs enable row level security;

drop policy if exists "company jobs public read" on public.company_jobs;
create policy "company jobs public read" on public.company_jobs
for select using (true);

grant select on public.company_jobs to anon, authenticated;
