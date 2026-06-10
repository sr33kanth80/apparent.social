// Server-rendered metadata for crawlers and link-preview bots.
//
// The public app is a client-rendered SPA. Bots often read only the first HTML
// response, so Vercel rewrites crawler requests here for shareable public URLs.

import { findBlogArticle, siteMeta, staticPageMeta } from './public-meta-data.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_ANON = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

const ESCAPE = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (value) => String(value == null ? '' : value).replace(/[&<>"']/g, (c) => ESCAPE[c]);
const isUuid = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value || ''));
const clip = (value, max = 200) => {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}...` : text;
};

const normalizePath = (path) => {
  const clean = `/${String(path || '').replace(/^\/+/, '')}`.replace(/\/+$/, '');
  return clean === '' ? '/' : clean;
};

const absoluteUrl = (origin, value) => {
  const text = String(value || '').trim();
  if (!text) return `${origin}${siteMeta.image}`;
  if (/^https?:\/\//i.test(text)) return text;
  return `${origin}/${text.replace(/^\/+/, '')}`;
};

const parseArticleDate = (date) => {
  const parsed = new Date(`${date} 00:00:00 GMT`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
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

const baseMeta = (origin) => ({
  title: siteMeta.title,
  description: siteMeta.description,
  image: absoluteUrl(origin, siteMeta.image),
  url: origin,
  type: 'website',
  noindex: false,
  bodyHtml: '',
  jsonLd: null,
});

const staticMeta = (origin, path) => {
  const route = normalizePath(path);
  const page = staticPageMeta[route];
  if (!page) return null;
  return {
    ...baseMeta(origin),
    title: page.title,
    description: page.description,
    image: absoluteUrl(origin, page.image),
    url: `${origin}${route === '/' ? '' : route}`,
    noindex: page.noindex === true,
    bodyHtml: `<h1>${esc(page.title)}</h1><p>${esc(page.description)}</p>`,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: page.title,
      description: page.description,
      url: `${origin}${route === '/' ? '' : route}`,
      isPartOf: {
        '@type': 'WebSite',
        name: siteMeta.name,
        url: origin,
      },
    },
  };
};

const blogPostMeta = (origin, slug) => {
  const article = findBlogArticle(slug);
  if (!article) return null;
  const url = `${origin}/blog/${article.slug}`;
  const description = clip(article.dek || article.excerpt, 240);
  const published = parseArticleDate(article.date);
  return {
    ...baseMeta(origin),
    title: `${article.title} - Apparent`,
    description,
    image: absoluteUrl(origin, article.image),
    url,
    type: 'article',
    bodyHtml: `<article><h1>${esc(article.title)}</h1><p>${esc(article.excerpt)}</p><p>${esc(article.dek)}</p></article>`,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: article.title,
      description,
      image: [absoluteUrl(origin, article.image)],
      author: {
        '@type': 'Organization',
        name: article.author,
      },
      publisher: {
        '@type': 'Organization',
        name: siteMeta.name,
        logo: {
          '@type': 'ImageObject',
          url: absoluteUrl(origin, siteMeta.image),
        },
      },
      datePublished: published,
      dateModified: published,
      mainEntityOfPage: url,
    },
  };
};

async function projectMeta(origin, id) {
  const meta = baseMeta(origin);
  meta.url = `${origin}/projects/${id}`;

  let launch = await sbOne(
    `product_launches?select=name,tagline,intro,logo_url,banner_url&public_profile_enabled=eq.true&slug=eq.${encodeURIComponent(id)}&limit=1`,
  );
  if (!launch && isUuid(id)) {
    launch = await sbOne(
      `product_launches?select=name,tagline,intro,logo_url,banner_url&public_profile_enabled=eq.true&id=eq.${encodeURIComponent(id)}&limit=1`,
    );
  }

  if (launch) {
    meta.title = `${launch.name} - Apparent`;
    meta.description = clip(launch.tagline || launch.intro || meta.description);
    meta.image = absoluteUrl(origin, launch.banner_url || launch.logo_url || siteMeta.image);
    meta.bodyHtml = `<h1>${esc(launch.name)}</h1><p>${esc(meta.description)}</p>`;
    meta.jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: launch.name,
      description: meta.description,
      image: meta.image,
      url: meta.url,
    };
  }

  return meta;
}

async function profileMeta(origin, { handle = '', id = '' }) {
  const key = handle || id;
  const meta = baseMeta(origin);

  let profile = null;
  if (handle) {
    profile = await sbOne(
      `profiles?select=id,username,display_name,email,role&username=ilike.${encodeURIComponent(handle)}&limit=1`,
    );
  }
  if (!profile && isUuid(key)) {
    profile = await sbOne(`profiles?select=id,username,display_name,email,role&id=eq.${encodeURIComponent(key)}&limit=1`);
  }

  if (!profile) {
    meta.url = `${origin}/@${handle || key}`;
    meta.title = handle ? `@${handle} - Apparent` : siteMeta.title;
    meta.bodyHtml = `<h1>${esc(meta.title)}</h1><p>${esc(meta.description)}</p>`;
    return meta;
  }

  const uname = profile.username || handle || key;
  const name = String(profile.display_name || '').trim() || String(profile.email || '').split('@')[0] || uname;
  meta.type = 'profile';
  meta.url = `${origin}/@${uname}`;

  if (profile.role === 'investor') {
    const crit = await sbOne(
      `investor_criteria?select=thesis,sectors,stage,public_profile_enabled&user_id=eq.${profile.id}&limit=1`,
    );
    meta.title = `${name} - Investor on Apparent`;
    if (crit && crit.public_profile_enabled) {
      const focus = [crit.stage, crit.sectors].map((v) => String(v || '').trim()).filter(Boolean).join(' - ');
      meta.description = clip(crit.thesis || (focus ? `Investing in ${focus}.` : 'Investor on Apparent.'));
    } else {
      meta.description = 'Investor on Apparent - message to request an intro.';
    }
  } else {
    const fp = await sbOne(
      `founder_profiles?select=profile_name,headline,bio,profile_photo_url,fundraising_status,raising_round&public_profile_enabled=eq.true&user_id=eq.${profile.id}&limit=1`,
    );
    const fname = (fp && String(fp.profile_name || '').trim()) || name;
    meta.title = `${fname} - Founder on Apparent`;
    let prefix = '';
    if (fp && fp.fundraising_status === 'raising') {
      prefix = `Raising${fp.raising_round ? ` ${fp.raising_round}` : ''} - `;
    } else if (fp && fp.fundraising_status === 'open') {
      prefix = 'Open to intros - ';
    }
    meta.description = clip(prefix + ((fp && (fp.headline || fp.bio)) || 'Founder building on Apparent.'));
    if (fp && fp.profile_photo_url) meta.image = absoluteUrl(origin, fp.profile_photo_url);
  }

  meta.bodyHtml = `<h1>${esc(meta.title)}</h1><p>${esc(meta.description)}</p>`;
  meta.jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    name: meta.title,
    description: meta.description,
    url: meta.url,
  };
  return meta;
}

function renderHtml(meta) {
  const robots = meta.noindex ? 'noindex, nofollow, noarchive' : 'index, follow, max-image-preview:large';
  const jsonLd = meta.jsonLd
    ? `<script type="application/ld+json">${JSON.stringify(meta.jsonLd).replace(/</g, '\\u003c')}</script>`
    : '';

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(meta.title)}</title>
<meta name="description" content="${esc(meta.description)}">
<meta name="robots" content="${esc(robots)}">
<meta property="og:type" content="${esc(meta.type)}">
<meta property="og:site_name" content="${esc(siteMeta.name)}">
<meta property="og:title" content="${esc(meta.title)}">
<meta property="og:description" content="${esc(meta.description)}">
<meta property="og:image" content="${esc(meta.image)}">
<meta property="og:url" content="${esc(meta.url)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(meta.title)}">
<meta name="twitter:description" content="${esc(meta.description)}">
<meta name="twitter:image" content="${esc(meta.image)}">
<link rel="canonical" href="${esc(meta.url)}">
${jsonLd}
</head>
<body>
${meta.bodyHtml || `<p><a href="${esc(meta.url)}">${esc(meta.title)}</a></p>`}
</body>
</html>`;
}

export default async function handler(req, res) {
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'apparent.social';
  const origin = `https://${host}`;
  const query = req.query || {};
  const type = String(query.type || 'static');

  let meta = null;

  try {
    if (type === 'blog') {
      meta = blogPostMeta(origin, String(query.slug || ''));
    } else if (type === 'project') {
      meta = await projectMeta(origin, String(query.id || ''));
    } else if (type === 'profile') {
      meta = await profileMeta(origin, {
        handle: String(query.handle || '').replace(/^@/, ''),
        id: String(query.id || ''),
      });
    } else if (type === 'noindex') {
      const path = normalizePath(query.path || '');
      meta = {
        ...baseMeta(origin),
        title: 'Apparent',
        description: siteMeta.description,
        url: `${origin}${path === '/' ? '' : path}`,
        noindex: true,
        bodyHtml: '<h1>Apparent</h1>',
      };
    } else {
      meta = staticMeta(origin, query.path || '/');
    }
  } catch {
    meta = null;
  }

  const finalMeta = meta || baseMeta(origin);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  if (finalMeta.noindex) {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
  }
  res.setHeader('Cache-Control', finalMeta.noindex ? 'no-store' : 'public, s-maxage=300, stale-while-revalidate=600');
  res.status(200).send(renderHtml(finalMeta));
}
