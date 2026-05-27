// Supabase Edge Function: start_daily_scrapes
// Triggers Apify actors for YC Directory and GitHub Trending, with secure webhooks back to apify_ingest.
// Schedule this function daily at 3:00 AM Central Time (set cron in UTC: 08:00 during DST, 09:00 in winter).
//
// Secrets required:
// - APIFY_TOKEN
// - APIFY_WEBHOOK_SECRET
// - CRON_SECRET (required in X-Cron-Secret header to start runs)
//
// Optional env to override actor slugs:
// - YC_ACTOR_SLUG (default: clearpath~ycombinator-api-scraper)
// - GH_ACTOR_SLUG (default: viralanalyzer~github-trending-scraper)
// - INGEST_BASE_URL (if not auto-detecting the functions domain)

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const APIFY_TOKEN = Deno.env.get('APIFY_TOKEN') as string
const APIFY_WEBHOOK_SECRET = Deno.env.get('APIFY_WEBHOOK_SECRET') as string
const CRON_SECRET = Deno.env.get('CRON_SECRET') as string
const YC_ACTOR_SLUG = Deno.env.get('YC_ACTOR_SLUG') || 'clearpath~ycombinator-api-scraper'
const GH_ACTOR_SLUG = Deno.env.get('GH_ACTOR_SLUG') || 'viralanalyzer~github-trending-scraper'

function baseUrlFromRequest(req: Request): string {
  const url = new URL(req.url)
  // Supabase functions are usually hosted like https://<ref>.functions.supabase.co/<fn>
  return `${url.protocol}//${url.host}`
}

async function startActorRun(actorSlug: string, input: unknown, webhookUrl: string) {
  const startUrl = `https://api.apify.com/v2/acts/${encodeURIComponent(actorSlug)}/runs?token=${encodeURIComponent(APIFY_TOKEN)}`
  const payload = {
    input,
    webhooks: [
      {
        eventTypes: ['ACTOR.RUN.SUCCEEDED'],
        requestUrl: webhookUrl,
        headers: { 'X-Hook-Secret': APIFY_WEBHOOK_SECRET },
        payloadTemplate:
          '{"datasetId":"{{resource.defaultDatasetId}}","startedAt":"{{resource.startedAt}}","finishedAt":"{{resource.finishedAt}}","itemsTotal":"{{resource.stats.itemsTotal}}","runId":"{{resource.id}}"}',
      },
    ],
  }

  const res = await fetch(startUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const txt = await res.text()
    return { ok: false as const, status: res.status, error: txt }
  }
  const json = await res.json().catch(() => ({}))
  return { ok: true as const, data: json }
}

serve(async (req) => {
  if (!APIFY_TOKEN || !APIFY_WEBHOOK_SECRET || !CRON_SECRET) {
    return new Response('missing secrets', { status: 500 })
  }

  if (req.headers.get('x-cron-secret') !== CRON_SECRET) {
    return new Response('unauthorized', { status: 401 })
  }

  const base = baseUrlFromRequest(req)
  const ycWebhook = `${base}/apify_ingest?src=yc`
  const ghWebhook = `${base}/apify_ingest?src=gh`

  // YC input (proxy enabled)
  const ycInput = {
    proxyConfiguration: { useApifyProxy: true, apifyProxyGroups: [] as string[] },
  }
  // GitHub trending input (daily, all languages)
  const ghInput = {
    since: 'daily',
    languages: [] as string[],
  }

  const [yc, gh] = await Promise.all([
    startActorRun(YC_ACTOR_SLUG, ycInput, ycWebhook),
    startActorRun(GH_ACTOR_SLUG, ghInput, ghWebhook),
  ])

  const result = {
    yc: yc.ok ? 'started' : `error ${yc.status}`,
    gh: gh.ok ? 'started' : `error ${gh.status}`,
  }

  if (!yc.ok || !gh.ok) {
    return new Response(JSON.stringify(result), { status: 502, headers: { 'content-type': 'application/json' } })
  }

  return new Response(JSON.stringify(result), { headers: { 'content-type': 'application/json' } })
})
