-- Jobs Map — a search-seeded, self-caching map of companies that are hiring.
--
-- The map's substrate is this `companies` table. It starts empty and accretes:
-- when a visitor searches ("startups hiring in Lisbon"), the /api/jobs route
-- makes ONE Orthogonal call, upserts the returned companies here, and stamps
-- last_enriched_at. Every later browse of that area is a free anon SELECT — no
-- Orthogonal call. A staleness TTL (7 days, enforced in the route) re-fires
-- Orthogonal only for rows that have gone cold.
--
-- Company-level only (no per-role table): a pin is a company, intensity is its
-- open_roles count, click links to careers_url. Idempotent — safe to re-run.

create extension if not exists pgcrypto;

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  -- Dedup key: lowercased registrable host, no scheme/path/www.
  -- e.g. "ramp.com". The route derives it before upsert.
  canonical_domain text not null,
  name text not null,
  website text not null default '',
  careers_url text not null default '',
  one_liner text not null default '',
  city text not null default '',
  -- City-centroid placement via src/lib/app-defaults cityGeoCoordinates.
  -- Nullable: unknown city => pin hidden, row still searchable.
  latitude double precision,
  longitude double precision,
  open_roles integer not null default 0 check (open_roles >= 0),
  is_hiring boolean not null default false,
  source text not null default 'orthogonal',
  last_enriched_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint companies_canonical_domain_unique unique (canonical_domain)
);

-- Map query: hiring companies, densest first.
create index if not exists companies_hiring_roles_idx
  on public.companies (is_hiring, open_roles desc);

-- City browse + staleness sweep.
create index if not exists companies_city_idx on public.companies (city);
create index if not exists companies_enriched_idx on public.companies (last_enriched_at);

drop trigger if exists companies_set_updated_at on public.companies;
create trigger companies_set_updated_at before update on public.companies
for each row execute function public.set_updated_at();

-- RLS: anyone may read the map; only the service-role route writes (no anon
-- insert/update/delete grants), so the search endpoint is the sole writer.
alter table public.companies enable row level security;

drop policy if exists "companies public read" on public.companies;
create policy "companies public read" on public.companies
for select using (true);

grant select on public.companies to anon, authenticated;
