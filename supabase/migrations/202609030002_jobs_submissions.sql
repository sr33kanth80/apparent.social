-- Reader submissions for the Jobs Map.
--
-- Our data source resolves companies to a CITY, never to a building. A street
-- address typed by someone who actually works there is the only way a listing
-- ever becomes the right building rather than the right neighbourhood, so these
-- submissions are the curation loop around the live data.
--
-- Both tables are insert-only from the public: anyone may file one, nobody may
-- read them back. Reports can be filed anonymously.

create extension if not exists pgcrypto;

create table if not exists public.company_submissions (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  website text not null default '',
  office_address text not null default '',
  area text not null default '',
  careers_url text not null default '',
  description text not null default '',
  submitter_name text not null default '',
  submitter_email text not null default '',
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create table if not exists public.problem_reports (
  id uuid primary key default gen_random_uuid(),
  details text not null,
  -- Optional by design: the form promises anonymous reporting.
  email text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists company_submissions_status_idx
  on public.company_submissions (status, created_at desc);
create index if not exists problem_reports_created_idx
  on public.problem_reports (created_at desc);

alter table public.company_submissions enable row level security;
alter table public.problem_reports enable row level security;

-- Write-only for the public: submissions must never be readable by other
-- visitors, since they carry the submitter's name and email.
drop policy if exists "company submissions insert" on public.company_submissions;
create policy "company submissions insert" on public.company_submissions
for insert with check (true);

drop policy if exists "problem reports insert" on public.problem_reports;
create policy "problem reports insert" on public.problem_reports
for insert with check (true);

grant insert on public.company_submissions to anon, authenticated;
grant insert on public.problem_reports to anon, authenticated;
revoke select on public.company_submissions from anon, authenticated;
revoke select on public.problem_reports from anon, authenticated;
