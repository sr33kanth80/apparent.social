// Live public GitHub stats for a founder profile.
//
// Public profile, repos, stars, and top languages come from the REST API. Works
// unauthenticated; setting an optional read-only GITHUB_TOKEN in the Vercel
// project just raises the rate limit (no GitHub App / OAuth needed).

const GH_TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';

// GitHub usernames: 1–39 chars, alphanumeric or single hyphens (not leading/trailing).
const VALID_LOGIN = /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/;

const baseHeaders = () => ({
  accept: 'application/vnd.github+json',
  'user-agent': 'apparent-app',
  ...(GH_TOKEN ? { authorization: `Bearer ${GH_TOKEN}` } : {}),
});

async function ghRest(path) {
  try {
    const res = await fetch(`https://api.github.com${path}`, { headers: baseHeaders() });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  const username = String((req.query && req.query.username) || '').trim();
  if (!VALID_LOGIN.test(username)) {
    res.status(400).json({ error: 'invalid username' });
    return;
  }

  const user = await ghRest(`/users/${username}`);
  if (!user || user.message === 'Not Found') {
    res.status(404).json({ error: 'not found' });
    return;
  }

  const repos = (await ghRest(`/users/${username}/repos?per_page=100&sort=pushed&type=owner`)) || [];
  let stars = 0;
  const langCount = {};
  for (const r of Array.isArray(repos) ? repos : []) {
    if (r.fork) continue;
    stars += r.stargazers_count || 0;
    if (r.language) langCount[r.language] = (langCount[r.language] || 0) + 1;
  }
  const topLanguages = Object.entries(langCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([name]) => name);

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  res.status(200).json({
    profile: {
      login: user.login,
      name: user.name || user.login,
      avatarUrl: user.avatar_url,
      bio: user.bio || '',
      htmlUrl: user.html_url,
      company: user.company || '',
      location: user.location || '',
    },
    stats: {
      publicRepos: user.public_repos || 0,
      followers: user.followers || 0,
      stars,
      topLanguages,
    },
  });
}
