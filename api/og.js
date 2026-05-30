// Server-rendered Open Graph tags for social crawlers.
//
// The app is a client-rendered SPA, so crawlers (which don't run JS) would
// otherwise see an empty <head>. vercel.json rewrites crawler requests for
// profile/project URLs to this function, which fetches the entity from the
// Supabase REST API and returns a tiny HTML doc with the right OG/Twitter meta.
// Real humans never hit this — they're served index.html and React Router
// renders the page client-side.

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_ANON = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

const ESCAPE = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (value) => String(value == null ? '' : value).replace(/[&<>"']/g, (c) => ESCAPE[c]);
const isUuid = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value || ''));
const clip = (value, max = 200) => {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
};

async function sbOne(path) {
  if (!SUPABASE_URL || !SUPABASE_ANON) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      headers: { apikey: SUPABASE_ANON, authorization: `Bearer ${SUPABASE_ANON}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data) ? data[0] || null : data || null;
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'apparentsocial.vercel.app';
  const origin = `https://${host}`;
  const query = req.query || {};
  const type = String(query.type || 'profile');
  const handle = String(query.handle || '').replace(/^@/, '');
  const id = String(query.id || '');

  let title = 'Apparent';
  let description = 'Where cracked founders meet the capital that backs them.';
  let image = `${origin}/apparent-wordmark.png`;
  let url = origin;
  let ogType = 'website';

  try {
    if (type === 'project' && id) {
      url = `${origin}/projects/${id}`;
      let launch = await sbOne(
        `product_launches?select=name,tagline,intro,logo_url,banner_url&public_profile_enabled=eq.true&slug=eq.${encodeURIComponent(id)}&limit=1`,
      );
      if (!launch && isUuid(id)) {
        launch = await sbOne(
          `product_launches?select=name,tagline,intro,logo_url,banner_url&public_profile_enabled=eq.true&id=eq.${encodeURIComponent(id)}&limit=1`,
        );
      }
      if (launch) {
        title = `${launch.name} · Apparent`;
        description = clip(launch.tagline || launch.intro || description);
        image = launch.banner_url || launch.logo_url || image;
      }
    } else {
      const key = handle || id;
      let profile = null;
      if (handle) {
        profile = await sbOne(
          `profiles?select=id,username,display_name,email,role&username=ilike.${encodeURIComponent(handle)}&limit=1`,
        );
      }
      if (!profile && isUuid(key)) {
        profile = await sbOne(`profiles?select=id,username,display_name,email,role&id=eq.${encodeURIComponent(key)}&limit=1`);
      }

      if (profile) {
        const uname = profile.username || handle || key;
        url = `${origin}/@${uname}`;
        const name =
          String(profile.display_name || '').trim() || String(profile.email || '').split('@')[0] || uname;

        if (profile.role === 'investor') {
          ogType = 'profile';
          const crit = await sbOne(
            `investor_criteria?select=thesis,sectors,stage,public_profile_enabled&user_id=eq.${profile.id}&limit=1`,
          );
          title = `${name} · Investor on Apparent`;
          if (crit && crit.public_profile_enabled) {
            const focus = [crit.stage, crit.sectors].map((v) => String(v || '').trim()).filter(Boolean).join(' · ');
            description = clip(crit.thesis || (focus ? `Investing in ${focus}.` : 'Investor on Apparent.'));
          } else {
            description = 'Investor on Apparent — message to request an intro.';
          }
        } else {
          ogType = 'profile';
          const fp = await sbOne(
            `founder_profiles?select=profile_name,headline,bio,profile_photo_url,fundraising_status,raising_round&public_profile_enabled=eq.true&user_id=eq.${profile.id}&limit=1`,
          );
          const fname = (fp && String(fp.profile_name || '').trim()) || name;
          title = `${fname} · Founder on Apparent`;
          let prefix = '';
          if (fp && fp.fundraising_status === 'raising') {
            prefix = `Raising${fp.raising_round ? ` ${fp.raising_round}` : ''} · `;
          } else if (fp && fp.fundraising_status === 'open') {
            prefix = 'Open to intros · ';
          }
          description = clip(prefix + ((fp && (fp.headline || fp.bio)) || 'Founder building on Apparent.'));
          if (fp && fp.profile_photo_url) image = fp.profile_photo_url;
        }
      } else {
        url = `${origin}/@${handle || key}`;
        title = handle ? `@${handle} · Apparent` : 'Apparent';
      }
    }
  } catch {
    /* fall through to defaults */
  }

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta property="og:type" content="${esc(ogType)}">
<meta property="og:site_name" content="Apparent">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${esc(image)}">
<meta property="og:url" content="${esc(url)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${esc(image)}">
<link rel="canonical" href="${esc(url)}">
</head>
<body>
<p><a href="${esc(url)}">${esc(title)}</a></p>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
  res.status(200).send(html);
}
