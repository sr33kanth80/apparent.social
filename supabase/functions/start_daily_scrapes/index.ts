// Supabase Edge Function: start_daily_scrapes
// Runs each source actor SYNCHRONOUSLY via Apify's run-sync-get-dataset-items,
// maps the returned items, and upserts them straight into public.source_signals
// (logging each run to public.scrape_runs). No webhooks / callbacks — the whole
// pipeline happens in one invocation, which is far easier to operate and debug.
//
// Trigger: daily via pg_cron (see migration) or manually with X-Cron-Secret.
//
// Secrets required:
// - APIFY_TOKEN
// - CRON_SECRET (X-Cron-Secret header to authorize)
// - SUPABASE_URL
// - SUPABASE_SERVICE_ROLE_KEY
//
// Optional env to override actor slugs (verify on the Apify marketplace):
// - YC_ACTOR_SLUG, GH_ACTOR_SLUG, PH_ACTOR_SLUG, HN_ACTOR_SLUG

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { mapItemsForSource, sourceName, type JsonRecord, type SignalRow } from '../_shared/mappers.ts'

const APIFY_TOKEN = Deno.env.get('APIFY_TOKEN') as string
const CRON_SECRET = Deno.env.get('CRON_SECRET') as string
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') as string
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string

const YC_ACTOR_SLUG = Deno.env.get('YC_ACTOR_SLUG') || 'clearpath~ycombinator-api-scraper'
const GH_ACTOR_SLUG = Deno.env.get('GH_ACTOR_SLUG') || 'viralanalyzer~github-trending-scraper'
// NOTE: verify these on the Apify marketplace and override via env.
const PH_ACTOR_SLUG = Deno.env.get('PH_ACTOR_SLUG') || 'danpoletaev~product-hunt-scraper'
const HN_ACTOR_SLUG = Deno.env.get('HN_ACTOR_SLUG') || 'epctex~hackernews-scraper'

// Max seconds to wait for each actor run (Apify caps run-sync at 300s; keep
// under the edge function wall-clock budget).
const RUN_TIMEOUT_SECONDS = 110

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

type SourceSpec = { src: 'yc' | 'gh' | 'ph' | 'hn'; slug: string; input: JsonRecord }

const SPECS: SourceSpec[] = [
  { src: 'yc', slug: YC_ACTOR_SLUG, input: { proxyConfiguration: { useApifyProxy: true, apifyProxyGroups: [] } } },
  { src: 'gh', slug: GH_ACTOR_SLUG, input: { since: 'daily', languages: [] } },
  { src: 'ph', slug: PH_ACTOR_SLUG, input: { maxItems: 100, sort: 'newest' } },
  { src: 'hn', slug: HN_ACTOR_SLUG, input: { maxItems: 100, category: 'show' } },
]

async function logRun(meta: {
  source_name: string
  status: string
  item_count: number
  started_at?: string
  finished_at?: string
  input_json?: unknown
  error_text?: string
}) {
  const { error } = await supabase.from('scrape_runs').insert({
    source_name: meta.source_name,
    actor_id: '',
    run_id: '',
    dataset_id: '',
    status: meta.status,
    item_count: meta.item_count,
    started_at: meta.started_at ?? null,
    finished_at: meta.finished_at ?? null,
    input_json: meta.input_json ?? null,
    error_text: meta.error_text ?? '',
  })
  if (error) console.error('scrape_runs insert error', error)
}

function errText(err: unknown): string {
  if (err instanceof Error) return err.message
  if (err && typeof err === 'object') {
    const e = err as Record<string, unknown>
    const msg = [e.message, e.details, e.hint, e.code].filter(Boolean).join(' | ')
    if (msg) return msg
    try {
      return JSON.stringify(err)
    } catch {
      return String(err)
    }
  }
  return String(err)
}

type SourceResult = { src: string; status: string; count: number; error?: string }

async function runSource(spec: SourceSpec): Promise<SourceResult> {
  const startedAt = new Date().toISOString()
  const name = sourceName(spec.src)
  try {
    const url =
      `https://api.apify.com/v2/acts/${encodeURIComponent(spec.slug)}/run-sync-get-dataset-items` +
      `?token=${encodeURIComponent(APIFY_TOKEN)}&format=json&clean=true&timeout=${RUN_TIMEOUT_SECONDS}`

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(spec.input),
    })

    if (!res.ok) {
      const txt = await res.text().catch(() => '')
      await logRun({
        source_name: name,
        status: 'run_failed',
        item_count: 0,
        started_at: startedAt,
        finished_at: new Date().toISOString(),
        input_json: spec.input,
        error_text: `HTTP ${res.status}: ${txt.slice(0, 300)}`,
      })
      return { src: spec.src, status: `error ${res.status}`, count: 0 }
    }

    const data = await res.json().catch(() => [])
    const items: JsonRecord[] = Array.isArray(data) ? data : []
    const rows: SignalRow[] = mapItemsForSource(spec.src, items, new Date().toISOString())

    if (rows.length) {
      const { error } = await supabase
        .from('source_signals')
        .upsert(rows, { onConflict: 'source_type,source_url', ignoreDuplicates: false })
      if (error) throw error
    }

    await logRun({
      source_name: name,
      status: 'succeeded',
      item_count: rows.length,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      input_json: spec.input,
    })
    return { src: spec.src, status: 'ok', count: rows.length }
  } catch (err) {
    await logRun({
      source_name: name,
      status: 'error',
      item_count: 0,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      input_json: spec.input,
      error_text: errText(err).slice(0, 300),
    })
    return { src: spec.src, status: 'error', count: 0, error: errText(err) }
  }
}

serve(async (req) => {
  if (!APIFY_TOKEN || !CRON_SECRET || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response('missing secrets', { status: 500 })
  }
  if (req.headers.get('x-cron-secret') !== CRON_SECRET) {
    return new Response('unauthorized', { status: 401 })
  }

  // Optional: limit to specific sources via ?only=yc,gh
  const only = new URL(req.url).searchParams.get('only')
  const specs = only
    ? SPECS.filter((s) => only.split(',').map((x) => x.trim()).includes(s.src))
    : SPECS

  // Run all sources, but keep the work alive even if the caller disconnects.
  const work = Promise.all(specs.map(runSource))
  // deno-lint-ignore no-explicit-any
  const edge = (globalThis as any).EdgeRuntime
  if (edge && typeof edge.waitUntil === 'function') edge.waitUntil(work)

  const results = await work
  return new Response(JSON.stringify({ results }), {
    headers: { 'content-type': 'application/json' },
  })
})
