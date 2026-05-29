-- PostgREST upsert (on_conflict=source_type,source_url) can't target a PARTIAL
-- unique index, which made every ingestion upsert fail. The ingestion mappers
-- never insert an empty source_url, so a full unique index is safe and lets
-- on-conflict upserts work.
drop index if exists public.source_signals_src_unique;

create unique index if not exists source_signals_src_unique
  on public.source_signals (source_type, source_url);
