/**
 * Static public profiles for the real founders showcased on the Apparent
 * front page. These are served as a fallback when a /profile/:slug URL
 * doesn't match any Supabase profiles row (the founders don't have
 * Apparent accounts — they're curated showcase entries).
 *
 * Profile photos: https://unavatar.io/x/<handle> proxies the public
 * Twitter/X CDN so we never hard-code ephemeral pbs.twimg.com URLs.
 *
 * Data sourced from publicly available information: company websites,
 * LinkedIn, Twitter/X, TechCrunch, Crunchbase, etc.
 */

import type { ProductLaunch, PublicProfileResult } from '@/lib/apparent-types';

const nowIso = new Date().toISOString();

/** Build a minimal ProductLaunch card for display on a founder profile. */
const launch = (
  id: string,
  name: string,
  tagline: string,
  category: string,
  stage: string,
  website: string,
  metrics: string,
  location: string,
  logoUrl?: string,
): ProductLaunch => ({
  id,
  ownerId: id,
  slug: id,
  name,
  tagline,
  category,
  stage,
  location,
  launchUrl: website,
  proofUrl: website,
  logoUrl,
  metrics,
  updatedAt: nowIso,
  publicProfileEnabled: true,
});

/** Google Favicons API — reliable 128 px logo used throughout the app. */
const logo = (domain: string) =>
  `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;

/** Unavatar.io proxy for Twitter/X profile photos. */
const twitterPhoto = (handle: string) =>
  `https://unavatar.io/x/${handle.replace('@', '')}`;

export const STATIC_FOUNDER_PROFILES: Record<string, PublicProfileResult> = {
  // ─── Cursor ─────────────────────────────────────────────────────────────────
  'michael-truell': {
    kind: 'founder',
    profile: {
      userId: 'michael-truell',
      username: 'michael-truell',
      profileName: 'Michael Truell',
      headline: 'Co-founder & CEO at Cursor',
      bio: 'Michael co-founded Anysphere (Cursor) with three MIT classmates — Sualeh Asif, Arvid Lunnemark, and Aman Sanger. He studied Computer Science and Mathematics at MIT, previously interned at Google, and competed in programming competitions. Cursor launched in 2023 and reached $1B+ in annualized revenue within two years, achieving a $9B+ valuation backed by a16z, Thrive Capital, and Accel.',
      profilePhotoUrl: twitterPhoto('mntruell'),
      currentBuild: 'Cursor — AI-native code editor',
      category: 'AI devtools',
      stage: 'Growth',
      github: 'https://github.com/truell20',
      traction: '$1B+ ARR · 40M+ developers · $9B valuation',
      lookingFor: 'Enterprise-focused growth investors and strategic partners in developer tooling and AI infrastructure.',
      location: 'San Francisco',
      press: 'https://techcrunch.com/2025/12/09/why-cursors-ceo-believes-openai-anthropic-competition-wont-crush-his-startup/',
      website: 'https://cursor.com',
      linkedin: 'https://www.linkedin.com/in/michael-t-5b1bbb122/',
      xProfile: 'https://x.com/mntruell',
      pastProducts: 'Google (internship)\nMIT competitive programming',
      launches: [
        launch('cursor', 'Cursor', 'AI-native coding workspace for software teams.', 'AI devtools', 'Growth', 'https://cursor.com', 'Developer workflow pull · $1B+ ARR', 'San Francisco', logo('cursor.com')),
      ],
    },
  },

  // ─── Perplexity ─────────────────────────────────────────────────────────────
  'aravind-srinivas': {
    kind: 'founder',
    profile: {
      userId: 'aravind-srinivas',
      username: 'aravind-srinivas',
      profileName: 'Aravind Srinivas',
      headline: 'Co-founder & CEO at Perplexity AI',
      bio: 'Aravind earned dual degrees in Electrical Engineering from IIT Madras and completed a PhD in Computer Science at UC Berkeley. He held research roles at OpenAI and Google DeepMind, and co-taught Berkeley\'s CS294 Deep Unsupervised Learning course, before co-founding Perplexity AI in August 2022. Perplexity reached a $20B valuation by mid-2025, backed by Jeff Bezos, Nvidia, and IVP, serving hundreds of millions of users worldwide.',
      profilePhotoUrl: twitterPhoto('AravSrinivas'),
      currentBuild: 'Perplexity AI — answer engine for the internet',
      category: 'AI search',
      stage: 'Growth',
      github: 'https://github.com/aravindsrinivas',
      traction: '$200M+ ARR · $20B valuation · 100M+ monthly users',
      lookingFor: 'Strategic investors in AI infrastructure and consumer AI. Interested in distribution partnerships for search and knowledge workflows.',
      location: 'San Francisco',
      press: 'https://techcrunch.com/2024/07/16/perplexitys-aravind-srinivas-on-accelerating-everyday-ai-at-techcrunch-disrupt-2024/',
      website: 'https://www.perplexity.ai',
      linkedin: 'https://www.linkedin.com/in/aravind-srinivas-16051987/',
      xProfile: 'https://x.com/AravSrinivas',
      pastProducts: 'OpenAI (Research Scientist)\nGoogle DeepMind (Research Scientist)\nUC Berkeley (PhD & course instructor)',
      launches: [
        launch('perplexity', 'Perplexity', 'Answer engine for search, research, and knowledge work.', 'AI search', 'Growth', 'https://www.perplexity.ai', 'Consumer research habit · $20B valuation', 'San Francisco', logo('perplexity.ai')),
      ],
    },
  },

  // ─── Mistral AI ─────────────────────────────────────────────────────────────
  'arthur-mensch': {
    kind: 'founder',
    profile: {
      userId: 'arthur-mensch',
      username: 'arthur-mensch',
      profileName: 'Arthur Mensch',
      headline: 'Co-founder & CEO at Mistral AI',
      bio: 'Arthur studied at École Polytechnique and Télécom Paris, earning a PhD from Université Paris-Saclay. He joined Google DeepMind Paris in 2020, contributing to Flamingo and Gemini multimodal models, before co-founding Mistral AI in April 2023 with Guillaume Lample and Timothée Lacroix. Known as Europe\'s answer to OpenAI, Mistral achieved an €11.7B valuation in 2025 and is planning an IPO. The company pioneered an open-weight model strategy alongside a commercial API.',
      profilePhotoUrl: twitterPhoto('arthurmensch'),
      currentBuild: 'Mistral AI — frontier models, open and commercial',
      category: 'AI models',
      stage: 'Growth',
      github: '',
      traction: '€11.7B valuation · Flagship open-weight models · European AI leader',
      lookingFor: 'European sovereign and strategic investors. Enterprise API and open-source ecosystem partners. Aligned with responsible, sovereign AI development.',
      location: 'Paris',
      press: 'https://techcrunch.com/2024/06/11/paris-based-ai-startup-mistral-ai-raises-640-million/',
      website: 'https://mistral.ai',
      linkedin: 'https://www.linkedin.com/in/arthur-mensch/',
      xProfile: 'https://x.com/arthurmensch',
      pastProducts: 'Google DeepMind (Research Scientist, Flamingo & Gemini)\nÉcole Polytechnique & Télécom Paris (researcher)\nNYU Courant Institute (visiting researcher)',
      launches: [
        launch('mistral', 'Mistral AI', 'Frontier AI lab building open and commercial models.', 'AI models', 'Growth', 'https://mistral.ai', 'European AI infrastructure · €11.7B valuation', 'Paris', logo('mistral.ai')),
      ],
    },
  },

  // ─── Harvey ─────────────────────────────────────────────────────────────────
  'winston-weinberg': {
    kind: 'founder',
    profile: {
      userId: 'winston-weinberg',
      username: 'winston-weinberg',
      profileName: 'Winston Weinberg',
      headline: 'Co-founder & CEO at Harvey',
      bio: 'Winston holds a BA from Kenyon College and a JD from USC Gould School of Law. He practiced securities and antitrust litigation at O\'Melveny & Myers for one year before cold-emailing Sam Altman to secure early GPT-4 access and co-founding Harvey in 2022 with Gabriel Pereyra (ex-Meta/DeepMind). Harvey now serves 1,000+ clients across 60 countries at an $11B valuation, backed by OpenAI Startup Fund, Sequoia Capital, and GIC.',
      profilePhotoUrl: twitterPhoto('winstonweinberg'),
      currentBuild: 'Harvey — AI workflows for legal and professional services',
      category: 'AI legal',
      stage: 'Growth',
      github: '',
      traction: '$11B valuation · 1,000+ clients · 60+ countries',
      lookingFor: 'Tier-1 growth investors in vertical AI and legal tech. Strategic partners with enterprise and professional services distribution.',
      location: 'San Francisco',
      press: 'https://techcrunch.com/2025/11/14/inside-harvey-how-a-first-year-legal-associate-built-one-of-silicon-valleys-hottest-startups/',
      website: 'https://www.harvey.ai',
      linkedin: 'https://www.linkedin.com/in/winston-weinberg',
      xProfile: 'https://x.com/winstonweinberg',
      pastProducts: 'O\'Melveny & Myers LLP (litigation associate)',
      launches: [
        launch('harvey', 'Harvey', 'AI workflows for legal and professional services.', 'AI legal', 'Growth', 'https://www.harvey.ai', 'Enterprise legal adoption · $11B valuation', 'San Francisco', logo('harvey.ai')),
      ],
    },
  },

  // ─── Ramp ───────────────────────────────────────────────────────────────────
  'eric-glyman': {
    kind: 'founder',
    profile: {
      userId: 'eric-glyman',
      username: 'eric-glyman',
      profileName: 'Eric Glyman',
      headline: 'Co-founder & CEO at Ramp',
      bio: 'Eric graduated valedictorian from Harvard in 2012 with a degree in Economics and East Asian Studies. He previously co-founded Paribus, a price-tracking and refund-automation app acquired by Capital One in 2016, where he stayed as Senior Director until 2019. He co-founded Ramp in March 2019 with Gene Lee and Karim Atiyeh. Ramp is now valued at $22.5B and processes tens of billions in annual spend for 30,000+ customers.',
      profilePhotoUrl: twitterPhoto('eglyman'),
      currentBuild: 'Ramp — finance automation for spend, procurement, and accounting',
      category: 'Fintech',
      stage: 'Growth',
      github: '',
      traction: '$700M+ ARR · $22.5B valuation · 30,000+ customers',
      lookingFor: 'Growth and late-stage fintech/AI investors. Strategic partners in enterprise finance, AI automation, and payments infrastructure.',
      location: 'New York',
      press: 'https://techcrunch.com/2025/03/03/ramp-has-more-than-doubled-its-annualized-revenue-to-700-million/',
      website: 'https://ramp.com',
      linkedin: 'https://www.linkedin.com/in/eglyman/',
      xProfile: 'https://x.com/eglyman',
      pastProducts: 'Paribus (co-founder, acquired by Capital One 2016)\nCapital One (Senior Director post-acquisition)',
      launches: [
        launch('ramp', 'Ramp', 'Finance automation for cards, spend, procurement, and accounting.', 'Fintech', 'Growth', 'https://ramp.com', 'Finance ops expansion · $22.5B valuation', 'New York', logo('ramp.com')),
      ],
    },
  },

  // ─── Lovable ────────────────────────────────────────────────────────────────
  'anton-osika': {
    kind: 'founder',
    profile: {
      userId: 'anton-osika',
      username: 'anton-osika',
      profileName: 'Anton Osika',
      headline: 'Co-founder & CEO at Lovable',
      bio: 'Anton holds an M.Sc. in Engineering Physics & Applied Mathematics from KTH Royal Institute of Technology. He worked as a particle physicist at CERN, was a founding engineer at Sana Labs (Swedish AI unicorn), and co-founded e-commerce AI startup Depict.ai. In 2023, his open-source project gpt-engineer became one of the fastest-growing GitHub repos ever, directly leading to Lovable — a vibe-coding platform that reached $200M ARR within 12 months and a $6.6B valuation.',
      profilePhotoUrl: twitterPhoto('antonosika'),
      currentBuild: 'Lovable — AI app builder for shipping full-stack products from prompts',
      category: 'AI app builder',
      stage: 'Growth',
      github: 'https://github.com/AntonOsika',
      traction: '$200M ARR · $6.6B valuation · Series B led by CapitalG',
      lookingFor: 'Growth-stage investors in developer tools and AI-native SaaS. Partners with enterprise software and European tech ecosystem reach.',
      location: 'Stockholm',
      press: 'https://techcrunch.com/2025/12/18/vibe-coding-startup-lovable-raises-330m-at-a-6-6b-valuation/',
      website: 'https://lovable.dev',
      linkedin: 'https://se.linkedin.com/in/antonosika',
      xProfile: 'https://x.com/antonosika',
      pastProducts: 'gpt-engineer (open-source, one of fastest-growing GitHub repos ever)\nDepict.ai (co-founder & CTO, 2019–2023)\nSana Labs (founding engineer)\nCERN (particle physicist)',
      launches: [
        launch('lovable', 'Lovable', 'AI app builder for turning prompts into shipped products.', 'AI app builder', 'Growth', 'https://lovable.dev', 'Prototype velocity · $200M ARR', 'Stockholm', logo('lovable.dev')),
      ],
    },
  },

  // ─── Neon ───────────────────────────────────────────────────────────────────
  'nikita-shamgunov': {
    kind: 'founder',
    profile: {
      userId: 'nikita-shamgunov',
      username: 'nikita-shamgunov',
      profileName: 'Nikita Shamgunov',
      headline: 'Co-founder & CEO at Neon',
      bio: 'Nikita earned his PhD in St. Petersburg, Russia, and immigrated to the US in 2005. He built his engineering career at Microsoft and Facebook/Meta before co-founding MemSQL (rebranded SingleStore), a distributed SQL database company he grew to $100M+ revenue and $1B+ valuation. He founded Neon in 2021 with Heikki Linnakangas and Stas Kelvich to build serverless open-source Postgres. Neon was acquired by Databricks for approximately $1B in May 2025.',
      profilePhotoUrl: twitterPhoto('nikitabase'),
      currentBuild: 'Neon — serverless Postgres for modern product teams',
      category: 'Data infra',
      stage: 'Growth',
      github: '',
      traction: 'Acquired by Databricks ~$1B · Database branching pull · Open-source Postgres',
      lookingFor: 'Strategic investors in database infrastructure and developer tools. (Now part of Databricks — connecting with enterprises scaling Postgres workloads.)',
      location: 'San Francisco',
      press: 'https://techcrunch.com/2025/05/14/databricks-to-buy-open-source-database-startup-neon-for-1b/',
      website: 'https://neon.tech',
      linkedin: 'https://www.linkedin.com/in/nikitashamgunov',
      xProfile: 'https://x.com/nikitabase',
      pastProducts: 'MemSQL / SingleStore (co-founder, grew to $1B+ valuation)\nFacebook / Meta (engineer)\nMicrosoft (engineer)',
      launches: [
        launch('neon', 'Neon', 'Serverless Postgres for modern product teams.', 'Data infra', 'Growth', 'https://neon.tech', 'Database branching pull · Acquired by Databricks', 'San Francisco', logo('neon.tech')),
      ],
    },
  },

  // ─── Modal ──────────────────────────────────────────────────────────────────
  'erik-bernhardsson': {
    kind: 'founder',
    profile: {
      userId: 'erik-bernhardsson',
      username: 'erik-bernhardsson',
      profileName: 'Erik Bernhardsson',
      headline: 'Founder & CEO at Modal',
      bio: 'Erik holds an M.Sc. in Physics from KTH Stockholm and is an IOI gold medalist. He spent six years at Spotify building the music recommendation system (Related Artists, Radio, Discover Weekly) and open-sourced Luigi (workflow engine, 10K+ stars) and Annoy (approximate nearest neighbors). He then served as CTO of Better.com for six years before founding Modal Labs in 2021. Modal raised a $355M Series C at a $4.65B valuation in 2026, providing serverless GPU infrastructure for AI/ML teams.',
      profilePhotoUrl: twitterPhoto('bernhardsson'),
      currentBuild: 'Modal — serverless cloud compute for AI, data, and GPU workloads',
      category: 'AI infra',
      stage: 'Growth',
      github: 'https://github.com/erikbern',
      traction: '$4.65B valuation · $355M Series C · GPU workflow demand',
      lookingFor: 'Infrastructure-focused growth investors. AI/ML teams, enterprises running GPU workloads, and cloud-native developer tooling partners.',
      location: 'New York',
      press: 'https://techcrunch.com/2026/02/11/ai-inference-startup-modal-labs-in-talks-to-raise-at-2-5b-valuation-sources-say/',
      website: 'https://modal.com',
      linkedin: 'https://www.linkedin.com/in/erikbern/',
      xProfile: 'https://x.com/bernhardsson',
      pastProducts: 'Better.com (CTO, 2015–2021)\nSpotify (ML/recommendations engineering, 6 years)\nLuigi (open-source workflow engine)\nAnnoy (open-source approximate nearest neighbors)',
      launches: [
        launch('modal', 'Modal', 'Cloud compute for AI, data, and batch workloads.', 'AI infra', 'Growth', 'https://modal.com', 'GPU workflow demand · $4.65B valuation', 'New York', logo('modal.com')),
      ],
    },
  },

  // ─── Linear ─────────────────────────────────────────────────────────────────
  'karri-saarinen': {
    kind: 'founder',
    profile: {
      userId: 'karri-saarinen',
      username: 'karri-saarinen',
      profileName: 'Karri Saarinen',
      headline: 'Co-founder & CEO at Linear',
      bio: 'Karri is a Finnish designer-turned-founder who previously co-founded Kippt (YC-backed bookmarking tool acquired by Coinbase), served as Founding Designer at Coinbase, and was Principal Designer and co-creator of Airbnb\'s design system. He co-founded Linear in 2019 with Tuomas Artman and Jori Lallo. Linear reached a $1.25B valuation in 2025, is profitable, and counts OpenAI, Vercel, Ramp, and Cursor among its 18,000+ customers.',
      profilePhotoUrl: twitterPhoto('karrisaarinen'),
      currentBuild: 'Linear — issue tracking and product planning for high-velocity teams',
      category: 'Productivity',
      stage: 'Growth',
      github: 'https://github.com/ksaa',
      traction: '$1.25B valuation · 18,000+ teams · Profitable · Backed by Sequoia',
      lookingFor: 'Product-quality-focused investors aligned with sustainable, profitable growth. Enterprise product teams and software development organizations.',
      location: 'San Francisco',
      press: 'https://techcrunch.com/2025/06/10/atlassian-rival-linear-raises-82m-at-1-25b-valuation/',
      website: 'https://linear.app',
      linkedin: 'https://www.linkedin.com/in/karrisaarinen/',
      xProfile: 'https://x.com/karrisaarinen',
      pastProducts: 'Airbnb (Principal Designer, Design Systems)\nCoinbase (Founding Designer)\nKippt (co-founder, acquired by Coinbase)\nRails Girls (co-founder, education non-profit)',
      launches: [
        launch('linear', 'Linear', 'Issue tracking and product planning for high-velocity teams.', 'Productivity', 'Growth', 'https://linear.app', 'Product team operating system · $1.25B valuation', 'San Francisco', logo('linear.app')),
      ],
    },
  },

  // ─── ElevenLabs ─────────────────────────────────────────────────────────────
  'mati-staniszewski': {
    kind: 'founder',
    profile: {
      userId: 'mati-staniszewski',
      username: 'mati-staniszewski',
      profileName: 'Mati Staniszewski',
      headline: 'Co-founder & CEO at ElevenLabs',
      bio: 'Mati grew up near Warsaw, Poland, graduated from Imperial College London with a degree in Mathematics, and worked at Opera Software, BlackRock (launching the Aladdin Wealth platform), and Palantir Technologies. In May 2022, he co-founded ElevenLabs with his high-school friend Piotr Dabkowski (ex-Google ML engineer), inspired by poor dubbing of American films. ElevenLabs reached an $11B valuation after a $500M Series C led by a16z in 2026, and Mati joined Klarna\'s board in 2025.',
      profilePhotoUrl: twitterPhoto('matistanis'),
      currentBuild: 'ElevenLabs — AI audio generation for voices, agents, and media',
      category: 'AI audio',
      stage: 'Growth',
      github: '',
      traction: '$11B valuation · $500M Series C · Creator and enterprise audio AI',
      lookingFor: 'Late-stage growth investors in voice AI and multimodal AI. Media, enterprise, and consumer platform partners for voice AI integration.',
      location: 'London',
      press: 'https://techcrunch.com/2026/02/05/elevenlabs-ceo-voice-is-the-next-interface-for-ai/',
      website: 'https://elevenlabs.io',
      linkedin: 'https://uk.linkedin.com/in/matiii',
      xProfile: 'https://x.com/matistanis',
      pastProducts: 'Palantir Technologies (Deployment Strategist)\nBlackRock (Portfolio Analytics Group, Aladdin Wealth)\nOpera Software',
      launches: [
        launch('elevenlabs', 'ElevenLabs', 'AI audio generation for voices, agents, and media workflows.', 'AI audio', 'Growth', 'https://elevenlabs.io', 'Audio AI adoption · $11B valuation', 'London', logo('elevenlabs.io')),
      ],
    },
  },

  // ─── Aria Kim (test founder profile) ─────────────────────────────────────────
  // Fictional founder used to preview the founder profile UI. Visit /@ariakim.
  ariakim: {
    kind: 'founder',
    profile: {
      userId: 'ariakim',
      username: 'ariakim',
      profileName: 'Aria Kim',
      headline: 'Co-founder & CEO at AgentKit',
      bio: 'Aria builds AgentKit, an open-source framework for agents teams actually ship to production. Previously an ML engineer at Stripe and a CS grad from MIT, she started AgentKit after watching teams struggle to take agent prototypes past the demo. The project crossed 4.2k GitHub stars in its first year and is used in production by 38 design partners.',
      profilePhotoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=160&h=160&q=80',
      currentBuild: 'AgentKit v2 — open-source agent framework',
      category: 'AI agents',
      stage: 'Seed',
      github: 'https://github.com/ariakim/agentkit',
      traction: '4.2k GitHub stars · 38 design partners · $24K MRR (+22% MoM)',
      lookingFor: 'Seed investors who back technical, open-source-first founders. Also hiring founding engineers who love developer tooling.',
      location: 'San Francisco',
      press: '',
      website: 'https://agentkit.dev',
      linkedin: 'https://www.linkedin.com/in/ariakim',
      xProfile: 'https://x.com/ariakim',
      pastProducts: 'Stripe (ML engineer)\nMIT (Computer Science)',
      fundraisingStatus: 'raising',
      raisingRound: 'Seed',
      raisingAmount: '$1.5M',
      raisingAsk: 'Raising a $1.5M seed to grow the AgentKit team and ship the hosted platform. Looking for investors who understand developer tools and open source.',
      openToContact: true,
      shareable: true,
      launches: [
        launch('agentkit', 'AgentKit', 'Open-source framework for agents teams ship to production.', 'AI agents', 'Seed', 'https://agentkit.dev', '4.2k stars · 38 design partners', 'San Francisco', logo('agentkit.dev')),
      ],
    },
  },

  // ─── ApparentVC (test investor profile) ──────────────────────────────────────
  // Fictional fund used to preview the investor profile UI. Visit /@apparentvc.
  apparentvc: {
    kind: 'investor',
    profile: {
      userId: 'apparentvc',
      username: 'apparentvc',
      displayName: 'Marcus Bell',
      profilePhotoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=160&h=160&q=80',
      thesis:
        'General Partner at ApparentVC. We lead pre-seed and seed rounds in AI infrastructure, developer tools, and vertical SaaS, backing technical founders who ship before they pitch. We write first checks, move fast off real proof, and stay close through the messy early months.',
      sectors: 'AI infrastructure, Developer tools, Vertical SaaS, Fintech infrastructure',
      stage: 'Pre-seed, Seed',
      checkSize: '$250K – $2M',
      geography: 'US & Europe (remote-friendly)',
      portfolioExamples:
        'Ledgerline, Northwind, AgentKit, Cortex Labs, Beacon Health, Forge, Tidewall, Cadence',
      founderSignals:
        'Ships in public, has design partners before a deck, writes clearly, and obsesses over one specific user. We pass on momentum without a wedge.',
      publicFields: ['thesis', 'sectors', 'stage', 'geography', 'checkSize', 'portfolioExamples', 'founderSignals'],
      restricted: false,
      shareable: true,
    },
  },
};

/**
 * Look up a static founder profile by URL slug.
 * Returns null when the slug doesn't match any curated entry.
 */
export const getStaticFounderProfile = (slug: string): PublicProfileResult | null =>
  STATIC_FOUNDER_PROFILES[slug.toLowerCase()] ?? null;

/**
 * Return the public profile-photo URL for a curated founder slug, or ''
 * when the slug is unknown (caller should render an initials avatar).
 *
 * slug is the segment after /profile/ in founderProfilePath, e.g.
 * "michael-truell" from "/profile/michael-truell".
 */
export const getFounderPhotoUrl = (slug: string): string => {
  const result = STATIC_FOUNDER_PROFILES[slug.toLowerCase()];
  if (result?.kind === 'founder') return result.profile.profilePhotoUrl;
  return '';
};
