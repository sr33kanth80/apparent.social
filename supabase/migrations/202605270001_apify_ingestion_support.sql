-- Apify ingestion support (created 2026-05-27)
-- 1) Add raw jsonb to source_signals for audit/debug
alter table if exists public.source_signals
  add column if not exists raw jsonb;

-- 2) Create scrape_runs table for observability
create table if not exists public.scrape_runs (
  id uuid primary key default gen_random_uuid(),
  source_name text not null,
  actor_id text default '',
  run_id text default '',
  dataset_id text default '',
  status text not null default 'new',
  item_count integer not null default 0,
  started_at timestamptz,
  finished_at timestamptz,
  input_json jsonb,
  error_text text default '',
  created_at timestamptz not null default now()
);

-- 3) Unique index to dedupe signals by source
create unique index if not exists source_signals_src_unique
  on public.source_signals (source_type, source_url)
  where coalesce(source_url, '') <> '';
