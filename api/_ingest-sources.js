// Structured deal-flow fetchers — the high-volume counterpart to the Apparent
// web-discovery scout in api/ingest-signals.js. Each fetcher pulls a machine-
// readable launch/startup feed and returns normalized candidates:
//   { company, founder?, detail, homepage_url, stage?, location?, github_url?, sector?, found_via? }
// ingest-signals.js canonicalizes, dedupes, and inserts them into
// public.source_signals (ignore-duplicates, so re-runs never bump freshness_at
// and flood the investor Daily list). Underscore prefix keeps Vercel from
// deploying this as its own serverless function (Hobby 12-function cap).

const str = (v) => (v == null ? '' : String(v));

// ---------- Hacker News "Show HN" via Algolia (free, no key) ----------

// "Show HN: Acme – open-source X" → { company: 'Acme', tail: 'open-source X' }
export const parseShowHNTitle = (title) => {
  const m = str(title).match(/^(?:show|launch)\s+hn:?\s*(.+)$/i);
  if (!m) return null;
  // Split on " – " / " — " / " - " (spaced, so hyphenated names survive) or ": "
  const parts = m[1].trim().split(/\s+[–—-]\s+|:\s+/);
  const company = (parts[0] || '').replace(/[.,;]+$/, '').trim();
  if (!company) return null;
  return { company, tail: parts.slice(1).join(' — ').trim() };
};

export const mapHNHit = (hit) => {
  const parsed = parseShowHNTitle(hit?.title);
  const url = str(hit?.url);
  if (!parsed || !url) return null; // text posts have no product URL — skip
  const points = Number(hit?.points) || 0;
  return {
    company: parsed.company.slice(0, 80),
    detail: `${parsed.tail || parsed.company} (Show HN, ${points} points).`,
    homepage_url: url,
    stage: 'launched',
    github_url: /github\.com\//i.test(url) ? url : '',
    found_via: `https://news.ycombinator.com/item?id=${str(hit?.objectID)}`,
  };
};

export const fetchShowHN = async ({ sinceDays = 2, minPoints = 5 } = {}) => {
  const since = Math.floor(Date.now() / 1000) - sinceDays * 86400;
  const filters = encodeURIComponent(`created_at_i>${since},points>=${minPoints}`);
  const res = await fetch(
    `https://hn.algolia.com/api/v1/search_by_date?tags=story&query=${encodeURIComponent('Show HN')}&hitsPerPage=100&numericFilters=${filters}`,
  );
  if (!res.ok) throw new Error(`HN Algolia ${res.status}`);
  const data = await res.json();
  return (Array.isArray(data?.hits) ? data.hits : []).map(mapHNHit).filter(Boolean);
};

// ---------- Product Hunt GraphQL (needs PRODUCTHUNT_TOKEN) ----------

// PH's `website` field is sometimes a producthunt.com/r/ redirect; follow one hop.
const resolvePhWebsite = async (url) => {
  if (!url) return '';
  if (!/producthunt\.com|ph\.to/i.test(url)) return url;
  try {
    const res = await fetch(url, { method: 'HEAD', redirect: 'manual' });
    return res.headers.get('location') || '';
  } catch {
    return '';
  }
};

export const fetchProductHunt = async ({ token = process.env.PRODUCTHUNT_TOKEN, sinceDays = 2 } = {}) => {
  if (!token) return { skipped: 'PRODUCTHUNT_TOKEN not set' };
  const postedAfter = new Date(Date.now() - sinceDays * 86400000).toISOString();
  const query = `{
    posts(order: NEWEST, postedAfter: "${postedAfter}", first: 50) {
      nodes {
        name tagline website url votesCount
        topics(first: 3) { nodes { name } }
        makers { name }
      }
    }
  }`;
  const res = await fetch('https://api.producthunt.com/v2/api/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Product Hunt ${res.status}: ${text.slice(0, 200)}`);
  }
  const data = await res.json();
  const nodes = data?.data?.posts?.nodes ?? [];
  const items = await Promise.all(
    nodes.map(async (post) => {
      const homepage = await resolvePhWebsite(str(post?.website));
      const name = str(post?.name).trim();
      if (!homepage || !name) return null;
      return {
        company: name,
        founder: str(post?.makers?.[0]?.name),
        detail: `${str(post?.tagline) || name} (Product Hunt launch, ${Number(post?.votesCount) || 0} upvotes).`,
        homepage_url: homepage,
        stage: 'launched',
        sector: str(post?.topics?.nodes?.[0]?.name),
        found_via: str(post?.url),
      };
    }),
  );
  return items.filter(Boolean);
};

// ---------- GitHub rising repos (token optional — one search request) ----------

// Content repos aren't startups: lists, courses, papers, interview prep.
const REPO_NOISE = /\b(awesome|tutorials?|roadmaps?|interview|courses?|cheat-?sheets?|leetcode|dotfiles|boilerplate|handbook|curated|study|examples|papers?|survey|book)\b/i;

export const mapGitHubRepo = (repo) => {
  if (!repo || repo.fork || repo.archived) return null;
  const name = str(repo.name);
  const desc = str(repo.description);
  if (!name || REPO_NOISE.test(`${name} ${desc}`)) return null;
  const homepage = /^https?:\/\//i.test(str(repo.homepage)) ? str(repo.homepage).trim() : str(repo.html_url);
  return {
    company: name.slice(0, 80),
    founder: str(repo.owner?.login),
    detail: `${desc || 'New fast-growing repository.'} (${Number(repo.stargazers_count) || 0}★ on GitHub within ~30 days of creation).`,
    homepage_url: homepage,
    github_url: str(repo.html_url),
    sector: str(Array.isArray(repo.topics) ? repo.topics[0] : ''),
    found_via: str(repo.html_url),
  };
};

export const fetchGitHubRising = async ({
  token = process.env.GITHUB_INGEST_TOKEN || process.env.GITHUB_TOKEN,
  sinceDays = 30,
  minStars = 30,
} = {}) => {
  const since = new Date(Date.now() - sinceDays * 86400000).toISOString().slice(0, 10);
  const q = encodeURIComponent(`created:>${since} stars:>=${minStars}`);
  const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'apparent-ingest' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(
    `https://api.github.com/search/repositories?q=${q}&sort=stars&order=desc&per_page=60`,
    { headers },
  );
  if (!res.ok) throw new Error(`GitHub search ${res.status}`);
  const data = await res.json();
  return (Array.isArray(data?.items) ? data.items : []).map(mapGitHubRepo).filter(Boolean);
};

// ---------- Y Combinator recent batches via yc-oss.github.io (free, no key) ----------

const BATCH_SEASONS = { winter: 0, spring: 1, summer: 2, fall: 3 };

// "Winter 2026" → sortable integer; 0 when unparseable.
export const batchRecency = (batch) => {
  const m = str(batch).match(/(winter|spring|summer|fall)\s+(\d{4})/i);
  return m ? Number(m[2]) * 4 + BATCH_SEASONS[m[1].toLowerCase()] : 0;
};

export const mapYCCompany = (c) => {
  if (!c || str(c.status) !== 'Active' || !str(c.website) || !str(c.name)) return null;
  const batch = str(c.batch);
  return {
    company: str(c.name),
    detail: `${str(c.one_liner) || 'YC company.'} (YC ${batch}).`,
    homepage_url: str(c.website),
    stage: `YC ${batch}`,
    location: str(c.all_locations).split(';')[0]?.trim() ?? '',
    sector: str(c.industry),
    found_via: str(c.url) || `https://www.ycombinator.com/companies/${str(c.slug)}`,
  };
};

export const fetchYCRecent = async ({ maxCompanies = 300 } = {}) => {
  const res = await fetch('https://yc-oss.github.io/api/companies/all.json');
  if (!res.ok) throw new Error(`yc-oss ${res.status}`);
  const all = await res.json();
  const cutoff = (new Date().getFullYear() - 1) * 4; // Winter of last year onward
  return (Array.isArray(all) ? all : [])
    .filter((c) => batchRecency(c?.batch) >= cutoff)
    .sort((a, b) => batchRecency(b?.batch) - batchRecency(a?.batch))
    .slice(0, maxCompanies)
    .map(mapYCCompany)
    .filter(Boolean);
};
