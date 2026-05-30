-- Drop every dependence on Apify.
--
-- We removed the Apify-driven edge functions (apify_ingest, start_daily_scrapes)
-- because Apify actors proved unreliable. This migration tears down the nightly
-- pg_cron job that called them so it stops firing in already-deployed databases.
--
-- The source_signals table and its already-ingested rows are intentionally kept —
-- Builder Radar reads from it, and future ingestion can write to it by other means.
-- The scrape_runs observability table is also left in place (harmless and empty
-- going forward); drop it manually if you want it gone.

do $$
begin
  if exists (
    select 1 from pg_extension where extname = 'pg_cron'
  ) and exists (
    select 1 from cron.job where jobname = 'apparent-daily-scrapes'
  ) then
    perform cron.unschedule('apparent-daily-scrapes');
  end if;
end $$;
