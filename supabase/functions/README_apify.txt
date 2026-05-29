Apify integration (V2) — YC Directory + GitHub Trending + Product Hunt + Hacker News

Edge Functions
1) apify_ingest
   - Webhook target for Apify runs. Source discriminator via ?src=
     * ?src=yc  → YC Directory
     * ?src=gh  → GitHub Trending
     * ?src=ph  → Product Hunt
     * ?src=hn  → Hacker News (Show HN)
   - Validates X-Hook-Secret header (APIFY_WEBHOOK_SECRET)
   - Fetches dataset items via Apify REST (APIFY_TOKEN)
   - Maps items into public.source_signals, upserting by (source_type, source_url)
   - Drops rows with no source_url/company; logs to public.scrape_runs

2) start_daily_scrapes
   - Starts four Apify actors with per-run webhooks back to apify_ingest
   - Inputs (verify each against your chosen actor's input schema)
     * YC: { proxyConfiguration: { useApifyProxy: true, apifyProxyGroups: [] } }
     * GH: { since: 'daily', languages: [] }
     * PH: { maxItems: 100, sort: 'newest' }
     * HN: { maxItems: 100, category: 'show' }
   - Returns JSON status { yc, gh, ph, hn: 'started'|'error ...' }

IMPORTANT — verify actor slugs before going live
   The default actor slugs are best-guess marketplace handles and MUST be
   confirmed (and likely overridden) on apify.com:
     * YC_ACTOR_SLUG (default clearpath~ycombinator-api-scraper)
     * GH_ACTOR_SLUG (default viralanalyzer~github-trending-scraper)
     * PH_ACTOR_SLUG (default bebity~product-hunt-scraper)
     * HN_ACTOR_SLUG (default lhotanok~hacker-news-scraper)
   Each actor's output field names also vary — the mappers in apify_ingest
   read several common aliases, but check the dataset shape after a test run.

Required secrets (never commit these; set via Supabase CLI):
  supabase secrets set \
    APIFY_TOKEN="<your token>" \
    APIFY_WEBHOOK_SECRET="<random-long-secret>" \
    CRON_SECRET="<another-random-long-secret>" \
    SUPABASE_URL="https://<ref>.supabase.co" \
    SUPABASE_SERVICE_ROLE_KEY="<service role key>"

Scheduling (3:00 AM Central Time daily)
- Central Time is UTC-5 (CDT) in summer and UTC-6 (CST) in winter.
- For now, schedule 08:00 UTC for summer and adjust to 09:00 UTC in winter, OR choose a fixed UTC.

Example dev test
- Deploy functions, set secrets.
- Call start_daily_scrapes once:
  curl -i 'https://<ref>.supabase.co/functions/v1/start_daily_scrapes' \
    -H 'X-Cron-Secret: <CRON_SECRET>'
- When Apify calls back, apify_ingest responds with { ok: true, upserted: N }
- Verify rows in public.source_signals and entries in public.scrape_runs.

Notes
- Unique index on (source_type, source_url) prevents duplicates across days.
- YC/GitHub mappings keep raw JSON in source_signals.raw for debugging.
- Extend with additional sources by reusing the same pattern (add src= param and a new mapper).
