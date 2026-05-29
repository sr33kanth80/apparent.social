-- ─────────────────────────────────────────────────────────────────────────────
-- Daily Apify scrape trigger.
-- Fires start_daily_scrapes once a day at 08:00 UTC (≈ 3:00 AM US Central during
-- CDT; shift to '0 9 * * *' in winter / CST if you want to hold 3 AM local).
--
-- The X-Cron-Secret header is read from Supabase Vault at run time, so the secret
-- never lives in this migration or the cron.job table in plaintext. Populate it
-- once (you, not committed anywhere):
--
--   select vault.create_secret(
--     '<your CRON_SECRET value>',
--     'apparent_cron_secret',
--     'X-Cron-Secret for start_daily_scrapes'
--   );
--
-- Until that secret exists the job simply 401s nightly (harmless).
-- ─────────────────────────────────────────────────────────────────────────────

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Drop any prior version so re-running this migration doesn't duplicate the job.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'apparent-daily-scrapes') then
    perform cron.unschedule('apparent-daily-scrapes');
  end if;
end $$;

select cron.schedule(
  'apparent-daily-scrapes',
  '0 8 * * *',
  $cron$
  select net.http_post(
    url := 'https://ykyskhezxfctqvzjbcfy.supabase.co/functions/v1/start_daily_scrapes',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Cron-Secret', (select decrypted_secret from vault.decrypted_secrets where name = 'apparent_cron_secret')
    ),
    body := '{}'::jsonb
  );
  $cron$
);
