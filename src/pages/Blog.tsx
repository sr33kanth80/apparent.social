import { ArrowLeft, ArrowRight, ExternalLink } from 'lucide-react';
import { useMemo } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import PixelSnow from '@/components/PixelSnow';

type BlogSection = {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
};

type BlogBanner = {
  src: string;
  alt: string;
  sourceLabel: string;
  sourceUrl: string;
};

type BlogArticle = {
  slug: string;
  title: string;
  author: string;
  date: string;
  readTime: string;
  excerpt: string;
  dek: string;
  banner: BlogBanner;
  sections: BlogSection[];
};

const serifDisplay = {
  fontFamily: 'Georgia, "Times New Roman", serif',
};

const fundDirectory: Record<string, string> = {
  '01 Advisors': 'www.01a.com',
  '3Lines': 'www.3lines.vc',
  '4DX Ventures': 'https://www.4dxventures.com',
  '7wire Ventures': 'www.7wireventures.com',
  '8VC': 'www.8vc.com',
  '1517 Fund': 'www.1517fund.com',
  '2048 Ventures': 'https://www.2048.vc',
  'January Ventures': 'www.january.ventures',
  'Operator Partners': 'www.operatorpartners.com',
  'Shrug Capital': 'www.shrug.vc',
  'The Fund': 'https://www.thefund.vc',
  'MaC Venture Capital': 'www.macventurecapital.com',
  'Threshold Ventures': 'www.threshold.vc',
  'LocalGlobe': 'http://www.localglobe.vc',
  'Founder Collective': 'http://foundercollective.com',
  'Initialized Capital': 'www.initialized.com',
  'Innovation Endeavors': 'www.innovationendeavors.com',
  'Jackson Square Ventures': 'www.jsv.com',
  'Javelin Venture Partners': 'www.javelinvp.com',
  'Jazz Venture Partners': 'www.jazzvp.com',
  'Interlace Ventures': 'www.interlacevc.com',
  'Interlock Partners': 'www.interlock.vc',
  'Acrew Capital': 'www.acrewcapital.com',
  'Amino Capital': 'www.aminocapital.com',
  'Abstract': 'https://www.abstract.com/',
  '468 Capital': 'https://www.468cap.com/',
  'Glasswing Ventures': 'www.glasswing.vc',
  'Hyperplane Venture Capital': 'http://hyperplane.vc',
  'BootstrapLabs': 'www.bootstraplabs.com',
  'BBG Ventures': 'www.bbgventures.com',
  'Flourish Ventures': 'www.flourishventures.com',
  'Accel': 'www.accel.com',
  'Altos Ventures': 'www.altos.vc',
  'Bain Capital Ventures': 'www.baincapitalventures.com',
  'Bessemer Venture Partners': 'www.bvp.com',
  'FJ Labs': 'www.fjlabs.com',
  '500 Global': 'www.500.co',
  'Pioneer Square Labs': 'www.psl.com',
  FUSE: 'www.fuse.vc',
  Ascend: 'www.ascend.vc',
  'Graham & Walker': 'www.grahamwalker.com',
  'SeaChange Fund': 'www.seachangeventures.com',
  'Madrona Venture Group': 'www.madrona.com',
  'Voyager Capital': 'www.voyagercapital.com',
  'Flying Fish Partners': 'www.flyingfish.vc',
  'Founders\' Co-op': 'www.founderscoop.com',
  'Tola Capital': 'www.tolacapital.com',
  'Trilogy Equity Partners': 'www.trilogyequity.com',
  'Ignition Partners': 'www.ignitionpartners.com',
  Maveron: 'www.maveron.com',
  Against: 'against.vc',
  'Alliance of Angels': 'www.allianceofangels.com',
  'WRF Capital': 'www.wrfseattle.org',
  'Keiretsu Capital': 'www.keiretsucapital.com',
  'Upfront Ventures': 'www.upfront.com',
  'Vulcan Capital': 'www.vulcan.com',
  'Bezos Expeditions': 'www.bezosexpeditions.com',
  'SaaStr Fund': 'https://www.saastr.ai/fund',
};

const normalizeUrl = (url: string) => (url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`);

const getLogoUrl = (url: string) =>
  `https://www.google.com/s2/favicons?sz=128&domain_url=${encodeURIComponent(normalizeUrl(url))}`;

const getDomainLabel = (url: string) => {
  try {
    return new URL(normalizeUrl(url)).hostname.replace(/^www\./, '');
  } catch {
    return url.replace(/^https?:\/\//, '').replace(/^www\./, '');
  }
};

const getSectionId = (slug: string, heading: string, index: number) =>
  `${slug}-${index}-${heading
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')}`;

const renderBullet = (bullet: string) => {
  const parts = bullet.split(' | ');
  const [title, ...rest] = parts;
  const hasDescription = parts.length >= 3;
  const description = hasDescription ? rest[rest.length - 1] : '';
  const meta = hasDescription ? rest.slice(0, -1) : rest;
  const website = fundDirectory[title];

  if (!website) {
    return (
      <div className="grid gap-3 md:grid-cols-[1.25rem,1fr] md:items-start">
        <span className="mt-1 h-2.5 w-2.5 rounded-full bg-[#c7deb1]" />
        <div>
          <p className="text-lg font-normal leading-tight tracking-[-0.03em] text-black" style={serifDisplay}>
            {title}
          </p>
          {meta.length ? <p className="mt-1 text-sm font-semibold uppercase tracking-[0.12em] text-black/42">{meta.join(' / ')}</p> : null}
          {description ? <p className="mt-2 text-base leading-7 text-black/65">{description}</p> : null}
        </div>
      </div>
    );
  }

  const href = normalizeUrl(website);
  const domainLabel = getDomainLabel(website);

  return (
    <div className="grid gap-4 md:grid-cols-[auto,1fr,auto] md:items-start">
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-[#eef5e2] transition-colors hover:bg-[#e3efd1]"
      >
        <img
          src={getLogoUrl(website)}
          alt={`${title} logo`}
          className="h-8 w-8 rounded-[10px]"
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      </a>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="text-xl font-normal leading-tight tracking-[-0.03em] text-black underline-offset-4 transition-opacity hover:opacity-70"
            style={serifDisplay}
          >
            {title}
          </a>
          {meta.length ? <p className="text-sm font-semibold uppercase tracking-[0.12em] text-black/42">{meta.join(' / ')}</p> : null}
        </div>
        {description ? <p className="mt-2 text-base leading-7 text-black/65">{description}</p> : null}
      </div>
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-2 text-sm font-semibold text-[#0f5f49] underline-offset-4 transition-opacity hover:opacity-70 md:justify-self-end"
      >
        {domainLabel}
        <ExternalLink className="h-4 w-4" />
      </a>
    </div>
  );
};

const renderInsightCard = (bullets: string[]) => (
  <div className="mt-8 overflow-hidden rounded-[28px] border border-[#dcefc7]/18 bg-[#111712] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.18)] sm:p-6">
    <div className="border-b border-white/10 pb-5">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#dcefc7]/70">Seattle fundraising filter</p>
      <p className="mt-2 text-2xl font-normal leading-tight tracking-[-0.035em] text-white" style={serifDisplay}>
        What actually moves the list
      </p>
    </div>
    <div className="grid gap-px overflow-hidden rounded-[18px] bg-white/10 sm:grid-cols-2">
      {bullets.map((bullet, index) => {
        const [title, description = ''] = bullet.split(' | ');

        return (
          <div key={bullet} className="bg-[#111712] p-5">
            <div className="flex items-start gap-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#dcefc7] text-sm font-semibold text-black">
                {index + 1}
              </span>
              <div>
                <h3 className="text-xl font-normal leading-tight tracking-[-0.03em] text-white" style={serifDisplay}>
                  {title}
                </h3>
                <p className="mt-3 text-[0.95rem] leading-7 text-white/64">{description}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

const articles: BlogArticle[] = [
  {
    slug: 'venture-funds-in-seattle-seed-growth-2026',
    title: '21 Seattle and PNW-Relevant Venture Funds Founders Should Know',
    author: 'Apparent Research',
    date: 'June 6, 2026',
    readTime: '10 min read',
    excerpt:
      'Seattle is not a spray-and-pray fundraising market. The strongest investor targets tend to have operator depth, technical taste, and a clear view of enterprise, AI, cloud, or durable consumer behavior.',
    dek: 'A useful Seattle investor list should separate first-check funds from seed firms, multi-stage platforms, angels, and strategic capital. The geography matters, but the better question is whether the investor actually matches the company you are building.',
    banner: {
      src: '/blog-images/vc-map.jpg',
      alt: 'Laptop showing a world map on screen, representing investor landscape mapping.',
      sourceLabel: 'Pexels',
      sourceUrl: 'https://www.pexels.com/photo/a-laptop-with-a-world-map-on-the-screen-7412032/',
    },
    sections: [
      {
        heading: 'Why Seattle lists are different',
        paragraphs: [
          'Seattle has become one of the more technically serious startup markets in the U.S. The city has deep talent from Amazon, Microsoft, Tableau, Concur, Smartsheet, Redfin, Outreach, and a long tail of cloud, AI, marketplace, and enterprise software companies. The capital stack around that talent is real, but it does not behave like a generic coastal VC market.',
          'The best Seattle fundraising lists are narrower than founders expect. They include local seed funds, operator-led first-check investors, angel networks, university and research-aligned capital, and a few outside firms that repeatedly care about Pacific Northwest companies. If you treat all of those names the same, the list gets noisy fast.',
        ],
      },
      {
        heading: 'Pre-seed and first-check investors',
        paragraphs: [
          'These are the names to understand when the company is still early, technical, and forming the first institutional story. Some are traditional funds, some are studio or angel models, and some are better thought of as local first-capital networks.',
        ],
        bullets: [
          'Pioneer Square Labs | Pre-seed and seed | Venture studio plus fund model for founders who want company-building help, not just a small check.',
          'FUSE | Seed and Series A | Operator-led software fund with a strong read on enterprise SaaS, developer tools, and technical founders.',
          'Ascend | Pre-seed | Seattle-area first-check capital for AI-first founders, especially where the company has a sharp software or frontier AI wedge.',
          'Graham & Walker | Pre-seed and seed | Early capital with a visible focus on women and underestimated founders building serious technology companies.',
          'SeaChange Fund | Seed | Pacific Northwest-focused seed capital with a local investor network that can help with early syndication.',
          'Against | Pre-seed and seed | Technical founder fit for developer tools, B2B software, AI, and infrastructure built by operators who know the workflow.',
          'Alliance of Angels | Angel and seed | Useful for founders who need local checks, customer introductions, and a first layer of Seattle credibility.',
        ],
      },
      {
        heading: 'Seed funds with real Seattle pull',
        paragraphs: [
          'This is the core of the local market. These firms are useful when the product has enough shape for institutional diligence and the founder can explain why the company belongs in a technical, enterprise-heavy ecosystem.',
        ],
        bullets: [
          'Madrona Venture Group | Seed to Series B | The anchor Seattle venture firm, especially for applied AI, enterprise software, cloud, dev tools, fintech, and life sciences.',
          'Voyager Capital | Early stage | Strong fit for enterprise software, AI, data platforms, and companies with a defensible technical moat.',
          'Flying Fish Partners | Seed | Focused early-stage AI and machine learning capital for founders building around applied AI, data, and automation.',
          'Founders\' Co-op | Seed | Deep Pacific Northwest network with strong pattern recognition in SaaS, fintech, marketplaces, and founder-led software companies.',
          'Tola Capital | Early stage | Enterprise software and cloud investor with useful go-to-market context once revenue and pipeline start to matter.',
          'Trilogy Equity Partners | Early stage | Long-horizon software and enterprise investor for founders building durable companies rather than category theater.',
          'Ignition Partners | Early stage | Enterprise-first investor with infrastructure, cloud, cybersecurity, and B2B platform depth.',
          'Maveron | Early stage | Consumer, fintech, and marketplace investor for companies where brand, retention, and emotional customer pull matter.',
        ],
      },
      {
        heading: 'Strategic, growth, and later-stage capital',
        paragraphs: [
          'Not every relevant Seattle investor is a classic seed fund. Some names are better used once the company has clearer proof, a deeper technical asset, or a larger financing need. Put them in the right part of the process instead of forcing them into a seed list.',
        ],
        bullets: [
          'WRF Capital | Early stage | Research and commercialization-oriented capital for Washington companies, especially where deep tech or life sciences are involved.',
          'Keiretsu Capital | Angel to growth | Useful network-driven capital for companies that fit private investor syndication and broader angel participation.',
          'Upfront Ventures | Seed to growth | Not a Seattle firm, but relevant for Pacific Northwest founders who need multi-stage software, AI, healthcare, or consumer reach.',
          'Vulcan Capital | Growth | Patient capital for deep technology, AI, aerospace, climate, and other hard problems with large outcome potential.',
          'Bezos Expeditions | Growth and strategic | Mission-aligned personal investment capital, most relevant for space, climate, education, health, and systemic technology bets.',
          'SaaStr Fund | Seed to Series A | Useful for B2B SaaS companies with strong retention, product-led growth, or a clear path to efficient revenue scaling.',
        ],
      },
      {
        heading: 'How to qualify the list',
        paragraphs: [
          'The mistake is treating this as a batch of names to blast. Seattle is a relationship-dense market. The better move is to sort by stage first, then technical fit, then likely partner or network path. A good target list should get smaller after research, not bigger.',
          'Founders should also be honest about maturity. A pre-product AI infrastructure company, a revenue-stage vertical SaaS company, and a growth-stage deep tech company may all belong in Seattle, but they should not be talking to the same investors in the same order.',
        ],
        bullets: [
          'Technical depth wins | Most serious Seattle investors will care about product architecture, customer urgency, and defensibility before the growth story sounds finished.',
          'Enterprise is the center of gravity | Consumer and fintech exist, but B2B software, cloud, infrastructure, AI, and data-heavy workflows carry much of the local market.',
          'Stage discipline matters | A seed fund, angel network, venture studio, and growth investor may all be useful, but not for the same ask.',
          'Warm paths compound | Cold outreach can work, but Seattle rewards founder references, operator introductions, and local credibility more than generic investor spam.',
        ],
      },
      {
        heading: 'Where Apparent fits',
        paragraphs: [
          'Apparent was built for exactly this kind of problem. A founder does not need a longer spreadsheet. They need to know which Seattle and Pacific Northwest-relevant investors match their stage, thesis, portfolio pattern, and likely path to a real meeting.',
          'The map should save you from guessing. Before you send the next investor email, know whether the fund actually invests at your stage, whether the sector overlap is real, and whether there is a plausible person or network path into the firm.',
        ],
      },
    ],
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
    banner: {
      src: '/blog-images/pre-seed-first-checks.jpg',
      alt: 'Founder presenting early-stage fundraising material to investors in a meeting room.',
      sourceLabel: 'Pexels',
      sourceUrl: 'https://www.pexels.com/photo/a-man-doing-business-presentation-11045732/',
    },
    sections: [
      {
        heading: 'Why most pre-seed lists fail',
        paragraphs: [
          'The usual mistake is confusing brand recognition with practical fit. A founder with a two-person team, early customer pull, and a still-forming narrative does not need fifty names on a Notion board. They need a smaller list of investors whose public stage, sector focus, and partner access still make sense for a first check.',
          'That is why we like building the list from the inside out. Start with funds that clearly show pre-seed or seed in their stage, make sure there is a real person attached to the profile, then narrow by thesis. It is less glamorous than chasing the loudest logo, but it produces more actual conversations.',
        ],
      },
      {
        heading: 'The first 13 we would start with',
        paragraphs: [
          'These are the kinds of firms that belong on a real working list, not a fantasy cap table. The point is not that every one of them will fit your company. The point is that each one gives you a concrete reason to include or exclude them quickly.',
        ],
        bullets: [
          '01 Advisors | Pre-Seed to Series A | Broad software, fintech, and AI profile with operator DNA.',
          '3Lines | Pre-Seed to Series A | Strong fit for climate, industrial software, energy, and technical infrastructure.',
          '4DX Ventures | Pre-Seed to Series A | Useful for fintech, frontier infrastructure, and globally minded founders.',
          '7wire Ventures | Pre-Seed to Series A | One of the cleaner early-stage digital health and fintech profiles in the dataset.',
          '8VC | Pre-Seed to Series A | Works when the company sits at infrastructure, SaaS, manufacturing, or climate leverage.',
          '1517 Fund | Pre-Seed to Series A | A real technical-founder signal across hardware, AI, manufacturing, logistics, and climate.',
          '2048 Ventures | Seed to Series B | Broad early-stage appetite with visible exposure to AI, dev tools, SaaS, and climate.',
          'January Ventures | Pre-Seed to Series A | Particularly relevant when the company is replacing the friends-and-family round with a sharper institutional first check.',
          'Operator Partners | Pre-Seed to Series A | Good profile for enterprise, AI, cybersecurity, fintech, and operationally complex businesses.',
          'Shrug Capital | Pre-Seed to Series B | Good for software, creator, commerce, and product-led companies that move fast.',
          'The Fund | Pre-Seed and Seed | Broad thesis but still useful when you need a first-check ecosystem rather than a single famous partner.',
          'MaC Venture Capital | Pre-Seed to Series A | Strong fit for AI, fintech, infra, and category-building founders outside the usual mold.',
          'Threshold Ventures | Pre-Seed to Series A | Compact thesis and cleaner fit for founders who want an AI-aware early-stage process.',
        ],
      },
      {
        heading: 'The next 13 worth knowing',
        paragraphs: [
          'The second half of the list matters because good fundraising is often won in the middle of the market. Founders waste too much time over-optimizing for ten household names while ignoring the firms that are still on-strategy, still responsive, and still capable of leading conviction early.',
        ],
        bullets: [
          'LocalGlobe | Seed and Series A | Strong software, fintech, infrastructure, and cloud orientation.',
          'Founder Collective | Seed | Still one of the better profiles for true early company formation risk.',
          'Initialized Capital | Pre-Seed to Series A | Broad first-check exposure across software, logistics, dev tools, AI, and fintech.',
          'Innovation Endeavors | Pre-Seed to Series D | Best used when the company has a real technical wedge, not just AI varnish.',
          'Jackson Square Ventures | Pre-Seed to Series A | Software-heavy with enough fintech, enterprise, and health overlap to matter.',
          'Javelin Venture Partners | Pre-Seed to Series A | Clean early-stage profile for fintech, healthcare, commerce, and software.',
          'Jazz Venture Partners | Pre-Seed to Series A | Useful for AI, robotics, software, and human-performance-oriented bets.',
          'Interlace Ventures | Pre-Seed to Series A | Worth a look for software, consumer-fintech, and commerce-adjacent businesses.',
          'Interlock Partners | Pre-Seed to Series A | Narrower enterprise and fintech fit, which can make qualification faster.',
          'Acrew Capital | Seed and Series A | Strong for AI, fintech, cybersecurity, and future-of-work software.',
          'Amino Capital | Pre-Seed to Series B | Practical for AI, SaaS, fintech, and data-heavy technical companies.',
          'Abstract | Pre-Seed and Seed | Narrow profile, but useful when the company sits squarely in collaboration or productivity software.',
          '468 Capital | Seed and Series A | Good fit for AI, cloud, data, and global software teams.',
        ],
      },
      {
        heading: 'How to use a list like this',
        paragraphs: [
          'Do not blast this list with the same memo. Split it immediately into three buckets: obvious thesis fit, possible fit, and vanity only. Your goal is not to maximize meetings. It is to maximize high-context meetings where the partner can explain why your company belongs in their portfolio.',
          'The other operational mistake is pitching every firm at the same maturity. Some names here can handle an aggressive story with an unfinished product. Others will only lean in once the founder can show customer urgency, a crisp wedge, and a credible use of capital. That difference matters more than the logo.',
        ],
      },
    ],
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
    banner: {
      src: '/blog-images/investors-by-vertical.jpg',
      alt: 'Team reviewing charts and sector data during an investor strategy meeting.',
      sourceLabel: 'Pexels',
      sourceUrl: 'https://www.pexels.com/photo/people-having-business-meeting-8154789/',
    },
    sections: [
      {
        heading: 'Best for AI and ML infrastructure',
        paragraphs: [
          'AI founders usually over-index on the loudest AI brands and under-index on funds that actually understand infrastructure, dev tools, evaluation, enterprise deployment, and the cost structure behind modern model businesses.',
        ],
        bullets: [
          'Glasswing Ventures | Seed | Enterprise AI, security, data infrastructure, and software-heavy ML deployment.',
          'Hyperplane Venture Capital | Seed to Series B | Narrow AI, fintech, and applied ML profile with clear signal.',
          '468 Capital | Seed and Series A | Good fit for data, cloud, developer workflows, and infrastructure-led AI.',
          'Acrew Capital | Seed and Series A | Strong overlap with AI, data, fintech, and security use cases.',
          'Threshold Ventures | Pre-Seed to Series A | Compact thesis for AI-heavy early-stage companies.',
          'Innovation Endeavors | Pre-Seed onward | Best when the company is genuinely technical, not just AI-labeled.',
        ],
      },
      {
        heading: 'Best for climate and industrial systems',
        paragraphs: [
          'Climate investors are not interchangeable. The best lists separate carbon accounting software from grid, energy, industrial automation, hardware, logistics, and the ugly physical-world problems that require patience.',
        ],
        bullets: [
          '3Lines | Pre-Seed to Series A | Climate, energy, industrial software, manufacturing, and transportation.',
          '8VC | Pre-Seed to Series A | Works for infrastructure, manufacturing, climate systems, and operational tooling.',
          '1517 Fund | Pre-Seed to Series A | Especially relevant for hard technical founders building in the real world.',
          '2048 Ventures | Seed to Series B | Broad early-stage appetite with visible climate and software overlap.',
          'BootstrapLabs | Seed and Series A | Climate plus AI and future-of-work exposure when the company has an automation wedge.',
          'BBG Ventures | Pre-Seed to Series A | Useful where climate intersects consumer, logistics, or supply chains.',
        ],
      },
      {
        heading: 'Best for fintech',
        paragraphs: [
          'Fintech still gets pitched too broadly. Payments, compliance, infrastructure, vertical software, embedded finance, consumer rails, and underwriting are different businesses. The firms that matter usually show that specificity in their existing portfolios.',
        ],
        bullets: [
          '7wire Ventures | Pre-Seed to Series A | Strong digital health plus payments and financial access overlap.',
          '4DX Ventures | Pre-Seed to Series A | Fintech with real international and infrastructure-friendly context.',
          'Flourish Ventures | Pre-Seed to Series A | Deep fintech orientation with clear consumer-financial exposure.',
          'Acrew Capital | Seed and Series A | Strong data, fintech, and software crossover.',
          'Interlock Partners | Pre-Seed to Series A | Enterprise and fintech profile that helps early qualification.',
          'Amino Capital | Pre-Seed to Series B | Good when the company has both software velocity and financial rails underneath it.',
        ],
      },
      {
        heading: 'Best for B2B SaaS and workflow software',
        paragraphs: [
          'This is still the broadest category, which is why founders need more discipline here, not less. The job is to find the firms that understand workflow gravity, team adoption, and painful budget lines, not just generic software enthusiasm.',
        ],
        bullets: [
          'Founder Collective | Seed | Reliable early software profile across B2B and infrastructure.',
          'Jackson Square Ventures | Pre-Seed to Series A | Strong profile for enterprise, SaaS, and product-led software.',
          'Javelin Venture Partners | Pre-Seed to Series A | Good for software businesses with commercial clarity.',
          'Initialized Capital | Pre-Seed to Series A | Works well for early software with technical momentum.',
          'Abstract | Pre-Seed and Seed | Best for collaboration, workflow, and productivity software.',
          'LocalGlobe | Seed and Series A | Strong software, cloud, and infrastructure pattern matching.',
        ],
      },
      {
        heading: 'The point is not the category label',
        paragraphs: [
          'A vertical list should save you time, not become another spreadsheet to admire. If you are doing this right, the output is a tighter sequence: the five investors who clearly fit now, the ten who fit with one more milestone, and the rest who do not deserve time this round.',
          'That is what founders actually need from an investor map. Not more names. Better elimination.',
        ],
      },
    ],
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
    banner: {
      src: '/blog-images/emerging-managers.jpg',
      alt: 'Small team in a bright office discussing a new venture presentation around a table.',
      sourceLabel: 'Pexels',
      sourceUrl: 'https://www.pexels.com/photo/men-in-a-business-meeting-8276677/',
    },
    sections: [
      {
        heading: 'What we mean by emerging manager',
        paragraphs: [
          'There is no clean public field that says first fund, second fund, or sub-$100 million AUM across every venture profile. So we used a more honest operational proxy: firms founded in 2018 or later that still show pre-seed or seed behavior in the public data. That gave us 430 profiles worth separating from the older, larger market.',
          'That matters because founders do not actually need a perfect academic definition. They need a working map of firms that are still proving themselves, still shaping thesis publicly, and still more likely to care about a sharp new relationship.',
        ],
      },
      {
        heading: 'Names that keep earning another look',
        paragraphs: [
          'The right emerging-manager list is not just a bunch of tiny logos. It should include firms whose public stage, sector behavior, and partner accessibility suggest that a founder can build real conviction with them quickly.',
        ],
        bullets: [
          '01 Advisors | Founded 2018 | Operator-first angle across software, fintech, and AI.',
          '4DX Ventures | Founded 2018 | Strong fit for globally ambitious fintech and infrastructure founders.',
          '468 Capital | Founded 2020 | Clean profile for AI, cloud, data, and software-heavy teams.',
          'January Ventures | Founded 2018 | Especially useful for replacing weak friends-and-family networks.',
          '2048 Ventures | Founded 2018 | Broad early-stage thesis with AI, SaaS, climate, and developer tooling overlap.',
          'MaC Venture Capital | Founded 2019 | Strong signal around AI, fintech, infrastructure, and under-networked founders.',
          'Flourish Ventures | Founded 2019 | Good for fintech and software where trust and financial access matter.',
          'Operator Partners | Founded 2020 | Strong operating profile for AI, enterprise, and fintech founders.',
          'Threshold Ventures | Founded 2019 | Clean early-stage AI and healthcare signal.',
          'Acrew Capital | Founded 2019 | Narrower, sharper profile across AI, cybersecurity, data, and fintech.',
        ],
      },
      {
        heading: 'Why they can outperform for a founder',
        paragraphs: [
          'The edge is not that newer firms are always better. The edge is that many of them are still in the part of the market where attention is an asset. They need to see around corners, not just protect a brand. That often makes them better listeners, faster decision-makers, and more willing to back a founder before consensus exists.',
          'For a founder, that can matter more than pedigree. A smaller fund with a live thesis and real internal urgency is often more useful than a famous firm that likes the company but will never take ownership.',
        ],
      },
      {
        heading: 'How to pitch them',
        paragraphs: [
          'Do not treat emerging managers like discounted big funds. They are not smaller versions of the same process. They usually want a cleaner narrative, a sharper wedge, and a more credible reason that this market belongs to you specifically.',
          'That means the best pitch is often less polished and more precise: what changed in the market, why this team sees it clearly, what metric already proves demand, and why the company gets stronger with this exact first check.',
        ],
      },
    ],
  },
  {
    slug: 'how-to-find-warm-intros-to-any-fund',
    title: 'How to Find Warm Intros to Any Fund (Without Knowing Anyone)',
    author: 'Apparent Editorial',
    date: 'June 2, 2026',
    readTime: '8 min read',
    excerpt:
      'Warm intros are not magic. They are just graph problems that most founders never map carefully enough.',
    dek: 'If your network does not reach the partner directly, the answer is not to give up. It is to work backwards through the fund\'s portfolio, co-investors, operators, and former founders until the path becomes obvious.',
    banner: {
      src: '/blog-images/warm-intros.jpg',
      alt: 'Two professionals shaking hands at the end of an introduction.',
      sourceLabel: 'Wikimedia Commons',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:The_Handshake_(32102261902).jpg',
    },
    sections: [
      {
        heading: 'Start with the fund, not the person you know',
        paragraphs: [
          'Most founders do this backwards. They start with their own network, look for anyone remotely connected to venture, and hope the path lands at the right fund. That produces weak intros because the path is based on convenience instead of relevance.',
          'A better process starts with the exact target fund and the exact partner. Once that is clear, the problem becomes tractable. You can inspect portfolio overlap, prior co-investments, sector communities, founders they already back, and operators who move in their orbit.',
        ],
      },
      {
        heading: 'The four warm paths that work most often',
        paragraphs: [
          'Not all intro paths carry equal weight. The strongest ones usually come from people the fund already uses as a proxy for taste, judgment, or operating context.',
        ],
        bullets: [
          'Portfolio founders | Still the strongest path when there is true thesis overlap and mutual respect.',
          'Portfolio operators or early employees | Often underrated, especially when they saw the company formation up close.',
          'Co-investors and angels | Useful when the target fund has a visible pattern of syndicating with the same people.',
          'Adjacent founders in the same market | Strong when the introduction explains why your category is changing, not just that you are impressive.',
        ],
      },
      {
        heading: 'Map the graph before you ask for the intro',
        paragraphs: [
          'The ask should happen after the work, not before it. If you can tell the intermediary exactly why this partner is a fit, what portfolio logic supports the match, and what the founder has already proven, the intro becomes easier to write and more credible to receive.',
          'That is also why a good investor map matters. Founders need to know which firms are reachable cold, which firms are intro-dependent, and which firms only look relevant until you inspect who they actually back.',
        ],
      },
      {
        heading: 'When cold email is the better move',
        paragraphs: [
          'A lot of founders hide behind intro scarcity when the real problem is that the company is not yet crisp enough to pitch. In that situation, a sharp cold note to the right partner is better than a vague warm intro through the wrong person.',
          'Warmth helps. Precision helps more. The founder who can explain why this firm, why this partner, why now, and why this wedge usually gets farther than the founder who simply found someone willing to forward a deck.',
        ],
      },
    ],
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
    banner: {
      src: '/blog-images/ai-fundraising.jpg',
      alt: 'Close-up of code on a laptop screen, representing technical AI and software infrastructure.',
      sourceLabel: 'Wikimedia Commons',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Computer_developer.jpg',
    },
    sections: [
      {
        heading: 'What makes an AI fund useful right now',
        paragraphs: [
          'The best AI investors in this market are not the ones tweeting the most. They are the ones that can tell the difference between a temporary wrapper, a hard infrastructure company, and a software business that becomes dramatically better because of AI.',
          'That distinction matters because founders need more than enthusiasm. They need investors who understand enterprise adoption, evaluation loops, distribution, compliance, and the ugly economics behind serving real customers with models in production.',
        ],
      },
      {
        heading: 'Eight names we would not ignore',
        paragraphs: [
          'These are not obscure for the sake of being obscure. They are useful because the public data still shows AI exposure with enough specificity to build an actual pitch around.',
        ],
        bullets: [
          'Glasswing Ventures | Seed | Enterprise AI, cybersecurity, software, and data-heavy systems.',
          'Hyperplane Venture Capital | Seed to Series B | Applied AI with a practical eye for real business use cases.',
          'BootstrapLabs | Seed and Series A | AI plus future-of-work, healthcare, fintech, and climate crossover.',
          'Acrew Capital | Seed and Series A | Strong profile where AI meets data, security, and operational software.',
          'Amino Capital | Pre-Seed to Series B | Useful for AI founders with strong software and data orientation.',
          '468 Capital | Seed and Series A | Good for AI infrastructure, cloud, collaboration, and developer-heavy products.',
          'Threshold Ventures | Pre-Seed to Series A | Clean early-stage signal when AI is central to the company thesis.',
          'Innovation Endeavors | Pre-Seed onward | Best for deeply technical founders building infrastructure, robotics, or systems-level leverage.',
        ],
      },
      {
        heading: 'How to position an AI company for them',
        paragraphs: [
          'Stop leading with the model choice unless it is the moat. Most serious investors already assume the model stack will evolve. What they need to believe is that the company will keep owning the workflow, the data exhaust, the buying motion, or the operational wedge as the underlying models get cheaper and more capable.',
          'In other words, pitch the compounding asset. If the answer is just better content generation, faster summaries, or generic copilots, the meeting gets weak fast. If the answer is faster underwriting, better enterprise resolution, lower service cost, or a new system of record, the conversation changes.',
        ],
      },
      {
        heading: 'The real edge is not being on someone\'s top-ten list',
        paragraphs: [
          'A lot of great AI fundraises are still won away from the headline brands. The investor who understands your customer pain and can commit early is worth more than the investor who understands the category trend but cannot explain why your company wins.',
          'That is why a narrower AI map beats a louder one. The goal is not to look fundable. It is to meet the investors whose version of AI already matches the business you are actually building.',
        ],
      },
    ],
  },
  {
    slug: 'investors-dead-ends-for-founders-2026',
    title: 'We Research 4,305 Investors. 51.6% Look Like Dead Ends for Founders Right Now',
    author: 'Apparent Research',
    date: 'May 31, 2026',
    readTime: '9 min read',
    excerpt:
      'A big investor database is only useful if it helps you eliminate bad targets quickly. Right now, more than half the profiles we track do not look worth a founder\'s first-pass time.',
    dek: 'We are not calling firms dead because they stopped existing. We are calling them dead ends because the public profile no longer shows a clean reason for a founder to spend a week pitching them.',
    banner: {
      src: '/blog-images/dead-ends.jpg',
      alt: 'Founders and operators listening closely during a business workshop.',
      sourceLabel: 'Pexels',
      sourceUrl: 'https://www.pexels.com/photo/people-in-business-meeting-15141543/',
    },
    sections: [
      {
        heading: 'What we mean by dead end',
        paragraphs: [
          'This is not a dramatic claim about whether a firm is alive, has capital, or is privately active. It is a founder-utility claim. In our pass across 4,305 investor profiles, 2,222 of them did not show enough signal on stage, thesis clarity, or partner accessibility to deserve early fundraising time.',
          'That means the profile may be too broad, too stale, too late-stage, too thesis-shifted, or too hard to qualify from public information. Any one of those can turn a name into a dead end when you are trying to build an efficient process.',
        ],
      },
      {
        heading: 'The four dead-end patterns founders keep pitching anyway',
        paragraphs: [
          'Most wasted outreach falls into the same buckets. Once you see the pattern, your list gets dramatically better.',
        ],
        bullets: [
          'Stage drift | The firm says venture, but the public profile is clearly growth, late-stage, or too broad to trust.',
          'No obvious owner | There is no clear partner path, only a generic brand presence.',
          'Thesis fog | The sector list covers everything, which usually means nothing is qualified yet.',
          'Portfolio mismatch | The founder says AI infra, but the investor\'s visible history reads more like consumer, real estate, or generalist opportunism.',
        ],
      },
      {
        heading: 'What to do instead',
        paragraphs: [
          'Treat investor selection like pipeline management, not branding. A fund should earn its place on the list by proving one of three things quickly: it invests at your stage, it has visible overlap with your category, and it has a reachable person who can plausibly own the deal.',
          'If you cannot answer those three questions in a few minutes, the name should move to the parking lot. Founders lose too much time trying to rescue low-signal investor profiles with optimism.',
        ],
      },
      {
        heading: 'The best databases are really elimination engines',
        paragraphs: [
          'A good fundraising product should not just help you discover more investors. It should help you say no faster. The founder advantage is not exhaustive coverage. It is compounding clarity.',
          'That is the hidden value of an investor map. It lets you spend real time on the handful of firms that can actually matter instead of performing diligence on firms that were never going to be live for your round.',
        ],
      },
    ],
  },
  {
    slug: 'which-funds-actually-move-fast-on-pre-seed',
    title: 'The $25M Question: Which Funds Actually Move Fast on Pre-Seed?',
    author: 'Apparent Editorial',
    date: 'May 30, 2026',
    readTime: '7 min read',
    excerpt:
      'Every firm says it moves quickly. Very few founders stop to ask what actually predicts speed before they enter the process.',
    dek: 'We are not interested in made-up response-time leaderboards. We care about the observable signals that tell you whether a fund is structurally capable of making a fast pre-seed decision.',
    banner: {
      src: '/blog-images/move-fast.jpg',
      alt: 'Presenter speaking to a room of founders and investors during an early-stage session.',
      sourceLabel: 'Pexels',
      sourceUrl: 'https://www.pexels.com/photo/business-meeting-with-presentation-18935245/',
    },
    sections: [
      {
        heading: 'Fast is usually structural, not cultural',
        paragraphs: [
          'Firms like to describe speed as a value. In practice, it is a design choice. The fastest pre-seed funds tend to have a narrow stage, a small number of decision-makers, a clear public thesis, and a partner who can credibly own a first meeting without waiting for seven other people to bless the category.',
          'The slowest funds often look impressive from the outside. They have brand, portfolio depth, and lots of surface area. But that same complexity can make an early company spend three extra weeks in a process that was never truly live.',
        ],
      },
      {
        heading: 'Signals that a fund can actually move',
        paragraphs: [
          'Before you pitch, qualify the process itself. If the public profile already suggests friction, believe it.',
        ],
        bullets: [
          'Narrow early-stage focus rather than all-stage ambiguity.',
          'A visible partner email or partner-level public point of contact.',
          'A portfolio that already shows businesses like yours, not just category adjacency.',
          'A clear first-check identity instead of a follow-on or wait-and-see pattern.',
          'A founder or operator-heavy partnership that can make judgment calls with incomplete data.',
        ],
      },
      {
        heading: 'Who tends to feel faster',
        paragraphs: [
          'In the profiles we keep returning to, smaller and sharper firms usually feel faster than broad prestige shops. That is why names like January Ventures, Operator Partners, Founder Collective, Jackson Square Ventures, Interlock Partners, Acrew Capital, and Threshold Ventures keep showing up on practical pre-seed shortlists.',
          'That does not mean every one of those firms will move in a week. It means they structurally look more likely to do real work early because the public data still shows focus rather than committee sprawl.',
        ],
      },
      {
        heading: 'The founder lever most people ignore',
        paragraphs: [
          'The fastest way to speed up a process is not to chase a faster investor. It is to reduce ambiguity in your own company. A founder who can explain the market shift, the wedge, the evidence of demand, and the use of capital cleanly will make more firms look fast.',
          'Venture speed is often a mirror. The clearer the company, the smaller the gap between interest and decision.',
        ],
      },
    ],
  },
  {
    slug: 'who-actually-buys-yc-deals',
    title: 'YC Demo Day Fatigue Is Real. Here\'s Who Actually Buys the Backfill',
    author: 'Apparent Research',
    date: 'May 29, 2026',
    readTime: '8 min read',
    excerpt:
      'Demo Day still creates heat. It just does not create equal conviction across the market.',
    dek: 'In our dataset, at least 52 investor profiles reference Y Combinator in visible portfolio history. That is enough to prove a simple point: some firms reliably buy into the YC stream, and others mostly watch from the sidelines.',
    banner: {
      src: '/blog-images/yc-demo-day.jpg',
      alt: 'Audience watching a startup-style presentation in a modern conference room.',
      sourceLabel: 'Pexels',
      sourceUrl: 'https://www.pexels.com/photo/presentation-during-meeting-18999560/',
    },
    sections: [
      {
        heading: 'What founders get wrong about YC demand',
        paragraphs: [
          'Founders tend to treat YC as a single fundraising market. It is not. Some firms love the volume, the social proof, and the velocity. Others think the best use of their time is to miss Demo Day entirely and back the same profile later through direct sourcing or quieter backfills.',
          'That distinction matters because the strategy changes. If you are in the batch, you want to know who reliably shows up. If you are not in the batch, you want the firms that still buy the same company shape without the YC wrapper.',
        ],
      },
      {
        heading: 'The names that keep showing YC pattern recognition',
        paragraphs: [
          'Among the profiles that visibly mention YC or Y Combinator in portfolio history, these names stand out as useful pattern-matchers rather than decorative additions to a list.',
        ],
        bullets: [
          'Accel',
          'Acrew Capital',
          'Altos Ventures',
          'Bain Capital Ventures',
          'BBG Ventures',
          'Bessemer Venture Partners',
          'FJ Labs',
          'Founder Collective',
          'Amino Capital',
          '500 Global',
        ],
      },
      {
        heading: 'Why the backfill market matters',
        paragraphs: [
          'A lot of good companies are not the hottest thing during the batch window. Some are too technical, too early on narrative, too weirdly vertical, or simply drowned out by volume. That does not mean the company is weak. It often means the company needs an investor willing to work one level deeper than the social signal.',
          'That is where backfill buyers matter. They are often more useful than the obvious Demo Day tourists because they are underwriting the company, not the event.',
        ],
      },
      {
        heading: 'What to do if you are not in YC',
        paragraphs: [
          'Treat YC overlap as a market taste proxy, not an admission requirement. If a fund repeatedly backs companies with the same shape, intensity, and velocity as top YC businesses, that can still be useful to you even if you never touched the batch.',
          'The real question is not whether the investor likes YC. It is whether they like the founder profile that YC tends to surface. Those are very different things.',
        ],
      },
    ],
  },
  {
    slug: 'founder-salary-vs-founder-fundraise',
    title: 'Founder Salary vs. Founder Fundraise: The Numbers Nobody Wants to Talk About',
    author: 'Apparent Editorial',
    date: 'May 28, 2026',
    readTime: '7 min read',
    excerpt:
      'Founders still treat salary like a moral issue when it is really a financing design issue. Investors do too.',
    dek: 'The real question is not whether a founder should pay themselves. The real question is whether compensation, burn, and fundraising narrative still align once the company is judged as a business instead of a sacrifice story.',
    banner: {
      src: '/blog-images/founder-salary.jpg',
      alt: 'Laptop displaying financial graphs and performance metrics for runway planning.',
      sourceLabel: 'Pexels',
      sourceUrl: 'https://www.pexels.com/photo/a-laptop-showing-graphs-7109316/',
    },
    sections: [
      {
        heading: 'Bad conversations start with guilt',
        paragraphs: [
          'A founder who cannot afford to live is not more committed than one who pays themselves reasonably. The problem begins when the salary story and the capital story stop matching. If the company is telling investors it needs every dollar to extend runway while the burn model signals something else, trust erodes quickly.',
          'Good investors know this. They are not looking for martyrdom. They are looking for coherence.',
        ],
      },
      {
        heading: 'What investors are really underwriting',
        paragraphs: [
          'Most serious firms are asking three questions underneath the salary debate: does the founder understand runway, does the company still have hiring and product discipline, and does compensation fit the stage honestly. That is it.',
          'Reasonable pay inside a credible operating plan is usually fine. What fails is misalignment: founder compensation that reads like a post-Series-A company inside a pre-seed round, or a deck that frames every dollar as existential while the model says otherwise.',
        ],
      },
      {
        heading: 'A better way to talk about it',
        paragraphs: [
          'Founders should explain compensation the same way they explain hiring. Keep it factual. State what the company pays, why it is enough to keep the team focused, and how it fits into the next milestone. The right tone is operational, not apologetic.',
          'The more useful investor conversation is not should you pay yourself at all. It is whether the company is capital-efficient enough that this salary still makes sense inside the milestones you are promising.',
        ],
      },
      {
        heading: 'Why this still affects fundraising speed',
        paragraphs: [
          'Anything that muddies judgment slows a round. If the model feels sloppy, investors worry the rest of the company is sloppy too. If the model feels considered, the conversation stays where it belongs: product, traction, market, and timing.',
          'That is the real link between salary and fundraising. It is not morality. It is whether the numbers make the rest of the business easier to believe.',
        ],
      },
    ],
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
    banner: {
      src: '/blog-images/vc-map.jpg',
      alt: 'Laptop showing a world map on screen, representing investor landscape mapping.',
      sourceLabel: 'Pexels',
      sourceUrl: 'https://www.pexels.com/photo/a-laptop-with-a-world-map-on-the-screen-7412032/',
    },
    sections: [
      {
        heading: 'Why the map had to exist',
        paragraphs: [
          'Founders kept asking the same question in slightly different forms. Who invests in vertical software. Who actually backs AI infrastructure before revenue. Which climate funds can handle real industrial risk. Which fintech firms are still taking first meetings. The answers existed, but they lived in screenshots, stale spreadsheets, old CRM exports, and private founder group chats.',
          'That is not a workable market. Good fundraising requires memory, structure, and elimination. Without those, every founder repeats the same research loop from zero.',
        ],
      },
      {
        heading: 'What a useful investor map should answer',
        paragraphs: [
          'A real product does not just show logos. It should help a founder decide whether a firm belongs in the round at all.',
        ],
        bullets: [
          'Does this fund actually invest at my stage?',
          'Is there clear thesis overlap or am I forcing a fit?',
          'Who is the likely partner owner?',
          'What portfolio evidence says they understand this market?',
          'Is this a firm I can reach cold, or do I need to build a warm path first?',
        ],
      },
      {
        heading: 'Why founders keep forwarding it',
        paragraphs: [
          'Because a good map lowers embarrassment. It stops founders from pitching obviously wrong firms, waiting on dead-end names, and confusing social proof with fit. It also makes founder-to-founder help more useful, because the recommendation starts from shared context rather than memory alone.',
          'That is why the product keeps getting screenshotted. The map is not interesting because it is visual. It is useful because it turns a vague market into a set of decisions you can act on immediately.',
        ],
      },
      {
        heading: 'The point is not the tool. It is the quality of the process.',
        paragraphs: [
          'A founder should come out of research with a smaller, sharper, more defensible list than they had before. If the output is just a prettier version of the same uncertainty, the tool failed.',
          'The reason Apparent exists is simple: investor research should compound. The second founder should not have to rediscover what the first founder already learned the hard way.',
        ],
      },
    ],
  },
];

const postMeta = (article: BlogArticle) => `${article.author} / ${article.date} / ${article.readTime}`;

export const Blog = () => {
  return (
    <main className="relative isolate overflow-x-hidden bg-[#f7f1e7] text-black">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-[linear-gradient(180deg,#f7f1e7_0%,#fbfaf7_48%,#edf5e8_100%)]">
        <PixelSnow
          color="#34412b"
          flakeSize={0.012}
          minFlakeSize={1.15}
          pixelResolution={190}
          speed={0.55}
          density={0.24}
          direction={125}
          brightness={0.78}
          depthFade={9}
          farPlane={22}
          className="opacity-[0.16]"
        />
      </div>

      <section className="relative mx-auto max-w-[92rem] px-5 pb-14 pt-14 text-center sm:px-8 md:pt-20">
        <div className="mx-auto max-w-[54rem]">
          <h1
            className="text-[3.2rem] font-normal leading-[0.9] tracking-[-0.055em] sm:text-[5.5rem] md:text-[6.6rem]"
            style={serifDisplay}
          >
            Latest posts
          </h1>
        </div>
      </section>

      <section className="relative mx-auto max-w-[92rem] border-t border-black/10 px-5 py-16 sm:px-8">
        <div className="mx-auto max-w-[54rem]">
          <div className="grid gap-5">
            {articles.map((article) => (
              <Link
                key={article.slug}
                to={`/blog/${article.slug}`}
                className="rounded-[32px] border border-white/70 bg-white/92 p-6 text-center shadow-[0_18px_60px_rgba(58,72,34,0.08)] backdrop-blur-sm transition-colors hover:bg-white sm:p-8"
              >
                <p className="text-xs font-semibold text-black/45">{postMeta(article)}</p>
                <h2 className="mx-auto mt-3 max-w-4xl text-4xl font-normal leading-[0.96] tracking-[-0.04em] md:text-5xl" style={serifDisplay}>
                  {article.title}
                </h2>
                <p className="mx-auto mt-4 max-w-3xl text-base leading-8 text-black/60">{article.excerpt}</p>
                <div className="mt-6">
                  <span className="inline-flex items-center rounded-full bg-[#dcefc7] px-5 py-2.5 text-sm font-semibold text-black">
                    Read more
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
};

export const BlogPost = () => {
  const navigate = useNavigate();
  const { slug } = useParams();

  const article = useMemo(() => articles.find((entry) => entry.slug === slug), [slug]);
  const articleSections = useMemo(
    () =>
      article
        ? article.sections.map((section, index) => ({
            ...section,
            id: getSectionId(article.slug, section.heading, index),
          }))
        : [],
    [article],
  );

  if (!article) {
    return <Navigate to="/blog" replace />;
  }

  const articleIndex = articles.findIndex((entry) => entry.slug === article.slug);
  const nextArticle = articles[(articleIndex + 1) % articles.length];

  return (
    <main className="overflow-x-hidden bg-[#fbfaf7] text-black">
      <article className="mx-auto max-w-[44rem] px-5 py-20 sm:px-8 md:py-24">
        <button
          type="button"
          onClick={() => navigate('/blog')}
          className="mb-10 inline-flex items-center gap-2 rounded-full bg-[#dcefc7] px-5 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-[#cce8ae]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to blog
        </button>

        <h1 className="text-balance text-5xl font-normal leading-[0.92] tracking-[-0.05em] md:text-6xl" style={serifDisplay}>
          {article.title}
        </h1>

        <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-semibold text-black/45">
          <span>By {article.author}</span>
          <span className="h-4 w-px bg-black/15" />
          <span>{article.date}</span>
          <span className="h-4 w-px bg-black/15" />
          <span>{article.readTime}</span>
        </div>

        <p className="mt-8 text-xl leading-9 text-black/68">{article.dek}</p>

        <div className="mt-12 space-y-12">
          {articleSections.map((section) => (
            <section key={section.id} id={section.id} className="scroll-mt-32">
              <h2 className="text-3xl font-normal leading-tight tracking-[-0.035em] md:text-4xl" style={serifDisplay}>
                {section.heading}
              </h2>
              <div className="mt-4 space-y-5 text-base leading-8 text-black/65">
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
              {section.bullets && section.heading === 'How to qualify the list' ? renderInsightCard(section.bullets) : null}
              {section.bullets && section.heading !== 'How to qualify the list' ? (
                <ul className="mt-6 divide-y divide-black/10 border-y border-black/10">
                  {section.bullets.map((bullet) => (
                    <li key={bullet} className="list-none py-5">
                      {renderBullet(bullet)}
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </div>
      </article>

      <section className="mx-auto max-w-[92rem] border-t border-black/10 px-5 py-20 text-center sm:px-8">
        <h2 className="mx-auto max-w-3xl text-5xl font-normal leading-none tracking-[-0.045em] md:text-7xl" style={serifDisplay}>
          Read the next one.
        </h2>
        <p className="mx-auto mt-8 max-w-3xl text-3xl font-normal leading-[1.02] tracking-[-0.03em] text-black/82 md:text-4xl" style={serifDisplay}>
          {nextArticle.title}
        </p>
        <div className="mt-10">
          <Link
            to={`/blog/${nextArticle.slug}`}
            className="inline-flex items-center rounded-full bg-[#dcefc7] px-8 py-3 text-sm font-semibold text-black transition-colors hover:bg-[#cce8ae]"
          >
            Read next post
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
      </section>
    </main>
  );
};
