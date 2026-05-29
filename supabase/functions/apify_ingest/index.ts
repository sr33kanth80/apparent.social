// Supabase Edge Function: apify_ingest
// Receives Apify webhooks, fetches dataset items, normalizes, dedupes, upserts into public.source_signals,
// and logs run metadata into public.scrape_runs.
//
// Secrets required (set via `supabase secrets set`):
// - SUPABASE_URL
// - SUPABASE_SERVICE_ROLE_KEY
// - APIFY_WEBHOOK_SECRET (to validate incoming webhook)
// - APIFY_TOKEN (used to read dataset items)
//
// Invoke URL: https://<project-ref>.functions.supabase.co/apify_ingest
// We append a source discriminator, e.g., ?src=yc or ?src=gh

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

type JsonRecord = Record<string, unknown>

type SignalRow = {
  company: string
  founder: string
  detail: string
  source_type: string
  source_url: string
  profile_url: string
  stage?: string | null
  location?: string | null
  freshness_at: string
  github_url?: string | null
  raw_tags?: string[] | null
  raw?: unknown | null
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') as string
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string
const APIFY_TOKEN = Deno.env.get('APIFY_TOKEN') as string
const APIFY_WEBHOOK_SECRET = Deno.env.get('APIFY_WEBHOOK_SECRET') as string

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('apify_ingest: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

function text(val: unknown): string {
  return typeof val === 'string' ? val : ''
}

function asArray<T = unknown>(val: unknown): T[] {
  return Array.isArray(val) ? (val as T[]) : []
}

function safeIso(val?: string | null): string {
  if (val) {
    const d = new Date(val)
    if (!Number.isNaN(d.getTime())) return d.toISOString()
  }
  return new Date().toISOString()
}

function mapYcItemToSignal(item: JsonRecord, runFinishedAt?: string): SignalRow {
  const company = text(item.companyName ?? item.name)
  const description = text(item.description ?? item.tagline ?? '')
  const batch = text(item.batch ?? item.batchYear ? `S${item.batchYear}` : '')
  const status = text(item.status)
  const ycUrl = text(item.detailPageUrl ?? item.url ?? '')
  const founders = asArray<JsonRecord>(item.founders)
  const firstFounder = founders[0] || {}
  const founderName = text((firstFounder as JsonRecord).name)
  const founderLinkedin = text((firstFounder as JsonRecord).linkedin ?? (firstFounder as JsonRecord).linkedinUrl)
  const industries = asArray<string>(item.industries ?? item.tags)
  const locations = asArray<string>(item.locations)

  const parts: string[] = []
  if (description) parts.push(description)
  const meta: string[] = []
  if (batch) meta.push(`YC ${batch}`)
  if (status) meta.push(status)
  if (meta.length) parts.push(meta.join(' · '))

  return {
    company: company || '',
    founder: founderName || '',
    detail: parts.join(' — ').trim() || company || 'YC company',
    source_type: 'YC Directory',
    source_url: ycUrl || '',
    profile_url: founderLinkedin || '',
    stage: 'YC',
    location: locations.join(', ') || undefined,
    freshness_at: safeIso(runFinishedAt ?? text((item as JsonRecord).scrapedAt as string | undefined)),
    github_url: undefined,
    raw_tags: industries.length ? industries : undefined,
    raw: item,
  }
}

function mapGithubTrendingItemToSignal(item: JsonRecord): SignalRow {
  const owner = text(item.owner)
  const fullName = text(item.fullName)
  const description = text(item.description)
  const language = text(item.language)
  const totalStars = typeof item.totalStars === 'number' ? item.totalStars : Number(item.totalStars ?? 0)
  const starsToday = typeof item.starsToday === 'number' ? item.starsToday : Number(item.starsToday ?? 0)
  const since = text(item.since)
  const repoUrl = text(item.repoUrl)
  const scrapedAt = text(item.scrapedAt)

  const detailBits: string[] = []
  if (fullName) detailBits.push(fullName)
  if (description) detailBits.push(description)
  const metaBits: string[] = []
  if (language) metaBits.push(language)
  if (Number.isFinite(totalStars)) metaBits.push(`⭐ ${totalStars}`)
  if (Number.isFinite(starsToday) && since) metaBits.push(`(+${starsToday} ${since})`)
  if (metaBits.length) detailBits.push(metaBits.join(' • '))

  const tags = [language, since, 'github'].filter(Boolean) as string[]

  return {
    company: owner || '',
    founder: '',
    detail: detailBits.join(' — ').trim() || fullName || 'GitHub repo',
    source_type: 'GitHub Trending',
    source_url: repoUrl || '',
    profile_url: owner ? `https://github.com/${owner}` : '',
    stage: 'Open Source',
    location: undefined,
    freshness_at: safeIso(scrapedAt),
    github_url: repoUrl || undefined,
    raw_tags: tags.length ? tags : undefined,
    raw: item,
  }
}

function mapProductHuntItemToSignal(item: JsonRecord): SignalRow {
  const name = text(item.name ?? item.title)
  const tagline = text(item.tagline ?? item.subtitle)
  const description = text(item.description ?? item.text)
  const url = text(item.url ?? item.postUrl ?? item.link)
  const website = text(item.website ?? item.websiteUrl ?? item.redirectUrl)
  const votesRaw = item.votesCount ?? item.votes ?? item.votesCountTotal
  const votes = typeof votesRaw === 'number' ? votesRaw : Number(votesRaw ?? 0)
  const topics = asArray<unknown>(item.topics ?? item.tags)
    .map((t) => (typeof t === 'string' ? t : text((t as JsonRecord).name)))
    .filter(Boolean) as string[]
  const makers = asArray<JsonRecord>(item.makers ?? item.hunters)
  const firstMaker = (makers[0] || {}) as JsonRecord
  const makerName = text(firstMaker.name ?? firstMaker.username)
  const makerUrl = text(firstMaker.profileUrl ?? firstMaker.url)
  const createdAt = text(item.createdAt ?? item.featuredAt ?? item.scrapedAt)

  const parts: string[] = []
  if (tagline) parts.push(tagline)
  if (description && description !== tagline) parts.push(description)
  const meta: string[] = []
  if (Number.isFinite(votes) && votes > 0) meta.push(`▲ ${votes} upvotes`)
  if (topics.length) meta.push(topics.slice(0, 3).join(', '))
  if (meta.length) parts.push(meta.join(' • '))

  return {
    company: name || '',
    founder: makerName || '',
    detail: parts.join(' — ').trim() || name || 'Product Hunt launch',
    source_type: 'Product Hunt',
    source_url: url || website || '',
    profile_url: makerUrl || website || '',
    stage: 'Launch',
    location: undefined,
    freshness_at: safeIso(createdAt),
    github_url: undefined,
    raw_tags: topics.length ? topics : undefined,
    raw: item,
  }
}

function mapHackerNewsItemToSignal(item: JsonRecord): SignalRow {
  const rawTitle = text(item.title)
  // Strip Show HN / Ask HN / Tell HN prefixes, then take the project name
  // before a dash/colon separator.
  const cleanedTitle = rawTitle.replace(/^(show|ask|tell)\s+hn:?\s*/i, '').trim()
  const company = (cleanedTitle.split(/\s+[–—:-]\s+/)[0] || cleanedTitle).slice(0, 80)
  const author = text(item.author ?? item.by)
  const pointsRaw = item.points ?? item.score
  const points = typeof pointsRaw === 'number' ? pointsRaw : Number(pointsRaw ?? 0)
  const commentsRaw = item.num_comments ?? item.descendants ?? item.numComments
  const numComments = typeof commentsRaw === 'number' ? commentsRaw : Number(commentsRaw ?? 0)
  const externalUrl = text(item.url ?? item.story_url ?? item.storyUrl)
  const objectId = text(item.objectID ?? item.id ?? item.storyId)
  const hnItemUrl = objectId ? `https://news.ycombinator.com/item?id=${objectId}` : ''
  const createdAt = text(item.created_at ?? item.createdAt)
  const isGithub = /github\.com/i.test(externalUrl)

  const parts: string[] = []
  if (cleanedTitle) parts.push(cleanedTitle)
  const meta: string[] = []
  if (Number.isFinite(points) && points > 0) meta.push(`▲ ${points}`)
  if (Number.isFinite(numComments) && numComments > 0) meta.push(`${numComments} comments`)
  if (meta.length) parts.push(meta.join(' • '))

  return {
    company: company || '',
    founder: author || '',
    detail: parts.join(' — ').trim() || cleanedTitle || 'Hacker News post',
    source_type: 'Hacker News',
    source_url: hnItemUrl || externalUrl || '',
    profile_url: author ? `https://news.ycombinator.com/user?id=${author}` : '',
    stage: 'Show HN',
    location: undefined,
    freshness_at: safeIso(createdAt),
    github_url: isGithub ? externalUrl : undefined,
    raw_tags: ['hacker-news', 'show-hn'],
    raw: item,
  }
}

async function upsertSignals(rows: SignalRow[]) {
  if (!rows.length) return { count: 0 }
  const { error } = await supabase
    .from('source_signals')
    .upsert(rows, { ignoreDuplicates: false, onConflict: 'source_type,source_url' })
  if (error) throw error
  return { count: rows.length }
}

async function logRun(meta: {
  source_name: string
  actor_id?: string
  run_id?: string
  dataset_id?: string
  status: string
  item_count: number
  started_at?: string
  finished_at?: string
  input_json?: unknown
  error_text?: string
}) {
  const { error } = await supabase.from('scrape_runs').insert({
    source_name: meta.source_name,
    actor_id: meta.actor_id ?? '',
    run_id: meta.run_id ?? '',
    dataset_id: meta.dataset_id ?? '',
    status: meta.status,
    item_count: meta.item_count,
    started_at: meta.started_at ? new Date(meta.started_at).toISOString() : null,
    finished_at: meta.finished_at ? new Date(meta.finished_at).toISOString() : null,
    input_json: meta.input_json ?? null,
    error_text: meta.error_text ?? '',
  })
  if (error) console.error('scrape_runs insert error', error)
}

serve(async (req) => {
  try {
    const url = new URL(req.url)
    const src = url.searchParams.get('src') // 'yc' | 'gh' | 'ph' | 'hn'
    if (!src) return new Response('missing src', { status: 400 })

    const sourceName =
      src === 'yc'
        ? 'yc'
        : src === 'gh'
          ? 'github_trending'
          : src === 'ph'
            ? 'product_hunt'
            : src === 'hn'
              ? 'hacker_news'
              : src

    const hookHeader = req.headers.get('x-hook-secret') || ''
    if (!APIFY_WEBHOOK_SECRET || hookHeader !== APIFY_WEBHOOK_SECRET) {
      return new Response('unauthorized', { status: 401 })
    }

    const body = await req.json().catch(() => ({})) as JsonRecord

    // Our payloadTemplate will include datasetId, startedAt, finishedAt, itemsTotal, runId
    // Fall back to default Apify webhook shape if necessary.
    const datasetId = text((body as JsonRecord).datasetId) ||
      text((body.resource as JsonRecord | undefined)?.defaultDatasetId)
    const resource = body.resource as JsonRecord | undefined
    const resourceStats = resource?.stats as JsonRecord | undefined
    const itemsTotalRaw = (body as JsonRecord).itemsTotal ?? resourceStats?.itemsTotal
    const itemsTotal = typeof itemsTotalRaw === 'number' ? itemsTotalRaw : Number(itemsTotalRaw ?? 0)
    const startedAt = text((body as JsonRecord).startedAt) || text((body.resource as JsonRecord | undefined)?.startedAt)
    const finishedAt = text((body as JsonRecord).finishedAt) || text((body.resource as JsonRecord | undefined)?.finishedAt)
    const runId = text((body as JsonRecord).runId) || text((body.resource as JsonRecord | undefined)?.id)

    if (!datasetId) return new Response('missing datasetId', { status: 400 })

    // Fetch items from dataset
    const dsUrl = `https://api.apify.com/v2/datasets/${encodeURIComponent(datasetId)}/items?clean=true&format=json&token=${encodeURIComponent(APIFY_TOKEN)}`
    const dsRes = await fetch(dsUrl)
    if (!dsRes.ok) {
      await logRun({
        source_name: sourceName,
        status: 'fetch_failed',
        run_id: runId,
        dataset_id: datasetId,
        item_count: 0,
        started_at: startedAt,
        finished_at: finishedAt,
        error_text: `Dataset fetch failed: ${dsRes.status}`,
      })
      return new Response('dataset fetch failed', { status: 502 })
    }

    const items = (await dsRes.json()) as JsonRecord[]

    // Map items to signals
    let rows: SignalRow[] = []
    if (src === 'yc') {
      rows = items.map((it) => mapYcItemToSignal(it, finishedAt))
    } else if (src === 'gh') {
      rows = items.map((it) => mapGithubTrendingItemToSignal(it))
    } else if (src === 'ph') {
      rows = items.map((it) => mapProductHuntItemToSignal(it))
    } else if (src === 'hn') {
      rows = items.map((it) => mapHackerNewsItemToSignal(it))
    } else {
      return new Response('unsupported src', { status: 400 })
    }

    // Drop rows without a usable source_url (keeps the dedup index meaningful)
    rows = rows.filter((row) => row.source_url && row.company)

    // Upsert
    await upsertSignals(rows)

    // Log success
    await logRun({
      source_name: sourceName,
      status: 'succeeded',
      run_id: runId,
      dataset_id: datasetId,
      item_count: rows.length,
      started_at: startedAt,
      finished_at: finishedAt,
    })

    return new Response(JSON.stringify({ ok: true, upserted: rows.length }), {
      headers: { 'content-type': 'application/json' },
    })
  } catch (err) {
    console.error('ingest error', err)
    return new Response('internal error', { status: 500 })
  }
})
