// Shared signal mappers for Apify ingestion.
// Each maps one raw dataset item from a source actor into a public.source_signals row.

export type JsonRecord = Record<string, unknown>

export type SignalRow = {
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

export type SourceKey = 'yc' | 'gh' | 'ph' | 'hn'

export function sourceName(src: string): string {
  return src === 'yc'
    ? 'yc'
    : src === 'gh'
      ? 'github_trending'
      : src === 'ph'
        ? 'product_hunt'
        : src === 'hn'
          ? 'hacker_news'
          : src
}

export function text(val: unknown): string {
  return typeof val === 'string' ? val : ''
}

export function asArray<T = unknown>(val: unknown): T[] {
  return Array.isArray(val) ? (val as T[]) : []
}

export function safeIso(val?: string | null): string {
  if (val) {
    const d = new Date(val)
    if (!Number.isNaN(d.getTime())) return d.toISOString()
  }
  return new Date().toISOString()
}

// Schema: clearpath~ycombinator-api-scraper. Each dataset item is a YC company
// record: { name, slug, website, one_liner, description, batch, industry,
// subindustry, tags[], pretty_location, all_locations, country, regions[],
// founders[{ full_name, linkedin, founder_bio }], _metadata.scraped_at, ... }
export function mapYcItemToSignal(item: JsonRecord, runFinishedAt?: string): SignalRow {
  const company = text(item.name ?? item.companyName)
  const slug = text(item.slug)
  const oneLiner = text(item.one_liner ?? item.tagline)
  const description = text(item.description ?? item.long_description)
  const batch = text(item.batch)
  const industry = text(item.industry)
  const subindustry = text(item.subindustry)
  const teamSize = item.team_size
  const website = text(item.website ?? item.website_display)

  const founders = asArray<JsonRecord>(item.founders)
  const firstFounder = (founders[0] || {}) as JsonRecord
  const founderName = text(firstFounder.full_name) ||
    [text(firstFounder.first_name), text(firstFounder.last_name)].filter(Boolean).join(' ')
  const founderLinkedin = text(firstFounder.linkedin ?? firstFounder.linkedinUrl)

  // Prefer a stable YC company page URL for dedup; fall back to website.
  const sourceUrl = slug ? `https://www.ycombinator.com/companies/${slug}` : website

  const locationCandidates = [
    text(item.pretty_location),
    text(item.all_locations),
    asArray<string>(item.regions).filter(Boolean).join(', '),
    text(item.country),
  ].filter(Boolean)
  const location = locationCandidates[0] || undefined

  const tags = asArray<string>(item.tags).filter(Boolean)
  const rawTags = [industry, subindustry, ...tags, batch ? `YC ${batch}` : ''].filter(Boolean) as string[]

  const parts: string[] = []
  if (oneLiner) parts.push(oneLiner)
  else if (description) parts.push(description.slice(0, 280))
  const meta: string[] = []
  if (batch) meta.push(`YC ${batch}`)
  if (industry) meta.push(industry)
  if (typeof teamSize === 'number' && teamSize > 0) meta.push(`team ${teamSize}`)
  if (meta.length) parts.push(meta.join(' · '))

  return {
    company: company || '',
    founder: founderName || '',
    detail: parts.join(' — ').trim() || company || 'YC company',
    source_type: 'YC Directory',
    source_url: sourceUrl || '',
    profile_url: founderLinkedin || website || '',
    stage: batch ? `YC ${batch}` : 'YC',
    location,
    freshness_at: safeIso(
      runFinishedAt ??
        text((item._metadata as JsonRecord | undefined)?.scraped_at as string | undefined) ??
        text(item.scrapedAt as string | undefined),
    ),
    github_url: undefined,
    raw_tags: rawTags.length ? rawTags : undefined,
    raw: item,
  }
}

export function mapGithubTrendingItemToSignal(item: JsonRecord): SignalRow {
  const owner = text(item.owner ?? item.author ?? item.username)
  const fullName = text(item.fullName ?? item.name ?? item.repo)
  const description = text(item.description)
  const language = text(item.language ?? item.programmingLanguage)
  const totalStars = typeof item.totalStars === 'number'
    ? item.totalStars
    : Number(item.totalStars ?? item.stars ?? item.stargazers ?? 0)
  const starsToday = typeof item.starsToday === 'number'
    ? item.starsToday
    : Number(item.starsToday ?? item.currentPeriodStars ?? 0)
  const since = text(item.since)
  const repoUrl = text(item.repoUrl ?? item.url ?? item.link)
  const scrapedAt = text(item.scrapedAt ?? item.scraped_at)

  const detailBits: string[] = []
  if (fullName) detailBits.push(fullName)
  if (description) detailBits.push(description)
  const metaBits: string[] = []
  if (language) metaBits.push(language)
  if (Number.isFinite(totalStars) && totalStars > 0) metaBits.push(`⭐ ${totalStars}`)
  if (Number.isFinite(starsToday) && starsToday > 0) metaBits.push(`(+${starsToday}${since ? ' ' + since : ''})`)
  if (metaBits.length) detailBits.push(metaBits.join(' • '))

  const tags = [language, since, 'github'].filter(Boolean) as string[]

  return {
    company: fullName || owner || '',
    founder: owner || '',
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

export function mapProductHuntItemToSignal(item: JsonRecord): SignalRow {
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

export function mapHackerNewsItemToSignal(item: JsonRecord): SignalRow {
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

/** Map a batch of raw dataset items for a given source into signal rows. */
export function mapItemsForSource(src: string, items: JsonRecord[], finishedAt?: string): SignalRow[] {
  let rows: SignalRow[] = []
  if (src === 'yc') rows = items.map((it) => mapYcItemToSignal(it, finishedAt))
  else if (src === 'gh') rows = items.map((it) => mapGithubTrendingItemToSignal(it))
  else if (src === 'ph') rows = items.map((it) => mapProductHuntItemToSignal(it))
  else if (src === 'hn') rows = items.map((it) => mapHackerNewsItemToSignal(it))
  // Keep only rows with a usable dedup key + name.
  return rows.filter((row) => row.source_url && row.company)
}
