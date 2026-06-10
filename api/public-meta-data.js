export const siteMeta = {
  name: 'Apparent',
  title: 'Apparent - Where Cracked Founders Meet Capital',
  description: 'Where cracked founders meet the capital that backs them.',
  image: '/apparent-wordmark.png',
};

export const staticPageMeta = {
  '/': {
    title: siteMeta.title,
    description: siteMeta.description,
    image: siteMeta.image,
  },
  '/our-thesis': {
    title: 'Our Thesis - Apparent',
    description:
      'Apparent maps founder signal, investor taste, and early-stage capital so builders can find the funds that actually fit.',
    image: siteMeta.image,
  },
  '/for-founders': {
    title: 'For Founders - Apparent',
    description:
      'Find thesis-fit investors, sharpen your public signal, and move from broad fundraising lists to focused capital targets.',
    image: '/social/banners/apparent-founder-profile-banner.png',
  },
  '/for-vcs': {
    title: 'For VCs - Apparent',
    description:
      'Discover founders by thesis, stage, geography, traction, and proof signals before the market turns noisy.',
    image: '/social/banners/apparent-founder-card-banner.png',
  },
  '/heat-map': {
    title: 'VC Heat Map - Apparent',
    description:
      'Explore a searchable map of venture investors by geography, stage, sector focus, and founder fit.',
    image: siteMeta.image,
  },
  '/about': {
    title: 'About Apparent',
    description:
      'Apparent is building the founder and investor graph for early-stage fundraising decisions.',
    image: siteMeta.image,
  },
  '/resources': {
    title: 'Resources - Apparent',
    description:
      'Practical fundraising resources for founders researching investors, building target lists, and improving outreach.',
    image: siteMeta.image,
  },
  '/blog': {
    title: 'Latest Posts - Apparent',
    description:
      'Investor maps, fundraising research, and practical guides for founders navigating early-stage capital.',
    image: '/blog-images/vc-map.jpg',
  },
  '/contact': {
    title: 'Contact Apparent',
    description: 'Get in touch with Apparent about founder access, investor access, partnerships, and support.',
    image: siteMeta.image,
  },
  '/privacy': {
    title: 'Privacy Policy - Apparent',
    description: 'How Apparent collects, uses, and protects information across the platform.',
    image: siteMeta.image,
    noindex: true,
  },
  '/terms': {
    title: 'Terms of Service - Apparent',
    description: 'The terms that govern use of Apparent.',
    image: siteMeta.image,
    noindex: true,
  },
  '/cookies': {
    title: 'Cookie Policy - Apparent',
    description: 'How Apparent uses cookies and similar technologies.',
    image: siteMeta.image,
    noindex: true,
  },
};

export const blogArticles = [
  {
    slug: 'venture-funds-in-seattle-seed-growth-2026',
    title: '21 Seattle and PNW-Relevant Venture Funds Founders Should Know',
    author: 'Apparent Research',
    date: 'June 6, 2026',
    readTime: '10 min read',
    excerpt:
      'Seattle is not a spray-and-pray fundraising market. The strongest investor targets tend to have operator depth, technical taste, and a clear view of enterprise, AI, cloud, or durable consumer behavior.',
    dek: 'A useful Seattle investor list should separate first-check funds from seed firms, multi-stage platforms, angels, and strategic capital. The geography matters, but the better question is whether the investor actually matches the company you are building.',
    image: '/blog-images/vc-map.jpg',
    imageAlt: 'Laptop showing a world map on screen, representing investor landscape mapping.',
  },
  {
    slug: 'pre-seed-vcs-writing-first-checks-2026',
    title: '26 Pre-Seed VCs Writing First Checks Right Now (2026)',
    author: 'Apparent Research',
    date: 'June 5, 2026',
    readTime: '10 min read',
    excerpt:
      'Most founders build a target list backwards. They start with famous logos, then work down toward the funds that actually write the first check. This list flips that.',
    dek: 'A serious pre-seed list is not a beauty contest. It is a working shortlist of funds that still invest early, still have a clear thesis, and still look reachable for a first meeting.',
    image: '/blog-images/pre-seed-first-checks.jpg',
    imageAlt: 'Founder presenting early-stage fundraising material to investors in a meeting room.',
  },
  {
    slug: 'best-investors-by-vertical-2026',
    title: 'We Mapped 4,305 Investors. Here Are the Best for Your Vertical',
    author: 'Apparent Research',
    date: 'June 4, 2026',
    readTime: '9 min read',
    excerpt:
      'The fastest way to waste a week is to research venture firms one by one. The better move is to start from vertical fit, then work toward actual partners.',
    dek: 'A good investor list should feel narrower after research, not bigger. We grouped the firms in our dataset by the verticals founders most often ask about and pulled the names that keep showing up with credible thesis overlap.',
    image: '/blog-images/investors-by-vertical.jpg',
    imageAlt: 'Team reviewing charts and sector data during an investor strategy meeting.',
  },
  {
    slug: 'emerging-managers-worth-watching-2026',
    title: 'Emerging Managers Still Matter More Than Most Founders Think',
    author: 'Apparent Research',
    date: 'June 3, 2026',
    readTime: '8 min read',
    excerpt:
      'The best reason to track emerging managers is not novelty. It is that smaller firms often have sharper thesis fit, faster context building, and less internal theater around a first check.',
    dek: 'Using our investor dataset, we flagged 430 firms founded in 2018 or later that still show early-stage behavior. That is not a perfect proxy for first- or second-fund managers, but it is a practical one for founders trying to find investors who are still building their edge.',
    image: '/blog-images/emerging-managers.jpg',
    imageAlt: 'Small team in a bright office discussing a new venture presentation around a table.',
  },
  {
    slug: 'how-to-find-warm-intros-to-any-fund',
    title: 'How to Find Warm Intros to Any Fund (Without Knowing Anyone)',
    author: 'Apparent Editorial',
    date: 'June 2, 2026',
    readTime: '8 min read',
    excerpt: 'Warm intros are not magic. They are just graph problems that most founders never map carefully enough.',
    dek: "If your network does not reach the partner directly, the answer is not to give up. It is to work backwards through the fund's portfolio, co-investors, operators, and former founders until the path becomes obvious.",
    image: '/blog-images/warm-intros.jpg',
    imageAlt: 'Two professionals shaking hands at the end of an introduction.',
  },
  {
    slug: 'unexpected-ai-funds-writing-checks-2026',
    title: 'AI Fundraising in 2026: 8 Funds Worth Watching Beyond the Obvious Names',
    author: 'Apparent Research',
    date: 'June 1, 2026',
    readTime: '8 min read',
    excerpt:
      'The AI market is loud enough now that generic lists are almost useless. The firms that matter are the ones that still have a readable thesis once the AI label comes off.',
    dek: 'Every founder can name the obvious AI brands. The harder and more valuable job is identifying the firms that still invest with conviction when the company is selling workflow leverage, infrastructure durability, or vertical intelligence rather than a demo.',
    image: '/blog-images/ai-fundraising.jpg',
    imageAlt: 'Close-up of code on a laptop screen, representing technical AI and software infrastructure.',
  },
  {
    slug: 'investors-dead-ends-for-founders-2026',
    title: "We Research 4,305 Investors. 51.6% Look Like Dead Ends for Founders Right Now",
    author: 'Apparent Research',
    date: 'May 31, 2026',
    readTime: '9 min read',
    excerpt:
      "A big investor database is only useful if it helps you eliminate bad targets quickly. Right now, more than half the profiles we track do not look worth a founder's first-pass time.",
    dek: 'We are not calling firms dead because they stopped existing. We are calling them dead ends because the public profile no longer shows a clean reason for a founder to spend a week pitching them.',
    image: '/blog-images/dead-ends.jpg',
    imageAlt: 'Founders and operators listening closely during a business workshop.',
  },
  {
    slug: 'which-funds-actually-move-fast-on-pre-seed',
    title: 'The $25M Question: Which Funds Actually Move Fast on Pre-Seed?',
    author: 'Apparent Editorial',
    date: 'May 30, 2026',
    readTime: '7 min read',
    excerpt: 'Every firm says it moves quickly. Very few founders stop to ask what actually predicts speed before they enter the process.',
    dek: 'We are not interested in made-up response-time leaderboards. We care about the observable signals that tell you whether a fund is structurally capable of making a fast pre-seed decision.',
    image: '/blog-images/move-fast.jpg',
    imageAlt: 'Presenter speaking to a room of founders and investors during an early-stage session.',
  },
  {
    slug: 'who-actually-buys-yc-deals',
    title: "YC Demo Day Fatigue Is Real. Here's Who Actually Buys the Backfill",
    author: 'Apparent Research',
    date: 'May 29, 2026',
    readTime: '8 min read',
    excerpt: 'Demo Day still creates heat. It just does not create equal conviction across the market.',
    dek: 'In our dataset, at least 52 investor profiles reference Y Combinator in visible portfolio history. That is enough to prove a simple point: some firms reliably buy into the YC stream, and others mostly watch from the sidelines.',
    image: '/blog-images/yc-demo-day.jpg',
    imageAlt: 'Audience watching a startup-style presentation in a modern conference room.',
  },
  {
    slug: 'founder-salary-vs-founder-fundraise',
    title: 'Founder Salary vs. Founder Fundraise: The Numbers Nobody Wants to Talk About',
    author: 'Apparent Editorial',
    date: 'May 28, 2026',
    readTime: '7 min read',
    excerpt: 'Founders still treat salary like a moral issue when it is really a financing design issue. Investors do too.',
    dek: 'The real question is not whether a founder should pay themselves. The real question is whether compensation, burn, and fundraising narrative still align once the company is judged as a business instead of a sacrifice story.',
    image: '/blog-images/founder-salary.jpg',
    imageAlt: 'Laptop displaying financial graphs and performance metrics for runway planning.',
  },
  {
    slug: 'the-vc-map-founders-keep-sending',
    title: 'The VC Map That Founders Keep Sending to Each Other',
    author: 'Apparent Editorial',
    date: 'May 27, 2026',
    readTime: '6 min read',
    excerpt:
      'Every fundraising market eventually produces a private map founders pass around to save each other time. Apparent exists because those maps were never good enough.',
    dek: 'The product started from a simple question: what funds actually invest in this kind of company right now. Everything useful in venture research gets better once that question has a real answer instead of a guessed one.',
    image: '/blog-images/vc-map.jpg',
    imageAlt: 'Laptop showing a world map on screen, representing investor landscape mapping.',
  },
];

export const findBlogArticle = (slug) => blogArticles.find((article) => article.slug === slug);
