import { Link, useNavigate } from 'react-router-dom';
import { ArrowUpRight, Check, MapPin, Radar, Send, Zap } from 'lucide-react';
import { EditorialNavbar } from '../components/EditorialNavbar';
import { HeatMap } from './HeatMap';

const serifDisplay = {
  fontFamily: 'Georgia, "Times New Roman", serif',
};

type FrontPageLaunch = {
  id: string;
  name: string;
  founder: string;
  tagline: string;
  description: string;
  category: string;
  location: string;
  stage: string;
  launched: string;
  fit: number;
  saves: number;
  comments: number;
  momentum: string;
  website: string;
  logoUrl?: string;
  bannerUrl?: string;
  demoVideoUrl?: string;
  pitchVideoUrl?: string;
  pitchDeckUrl?: string;
  pitchBookNote?: string;
  pitchVisibility?: 'public' | 'investors';
  founderSignals?: string[];
  projectPath: string;
  founderProfilePath: string;
  proof: string[];
  investors: string[];
};

export const productLaunches: FrontPageLaunch[] = [
  {
    id: 'cursor',
    name: 'Cursor',
    founder: 'Michael Truell',
    tagline: 'AI-native coding workspace for software teams.',
    description:
      'Cursor turns codebases, prompts, and engineering workflows into one daily AI development surface for individual builders and teams.',
    category: 'AI devtools',
    location: 'San Francisco',
    stage: 'Growth',
    launched: 'Today',
    fit: 96,
    saves: 428,
    comments: 38,
    momentum: 'Developer workflow pull',
    website: 'https://www.cursor.com/',
    projectPath: '/projects/cursor',
    founderProfilePath: '/profile/michael-truell',
    proof: ['Fast adoption among engineers', 'High-frequency workflow', 'Clear technical wedge'],
    investors: ['AI infra', 'Developer tools', 'Product-led growth'],
  },
  {
    id: 'perplexity',
    name: 'Perplexity',
    founder: 'Aravind Srinivas',
    tagline: 'Answer engine for search, research, and knowledge work.',
    description:
      'Perplexity makes research feel conversational while keeping citations, context, and follow-up exploration close to the answer.',
    category: 'AI search',
    location: 'San Francisco',
    stage: 'Growth',
    launched: 'Today',
    fit: 91,
    saves: 391,
    comments: 44,
    momentum: 'Consumer research habit',
    website: 'https://www.perplexity.ai/',
    projectPath: '/projects/perplexity',
    founderProfilePath: '/profile/aravind-srinivas',
    proof: ['Consumer frequency', 'Research workflow wedge', 'Strong brand pull'],
    investors: ['Consumer AI', 'Search', 'Knowledge workflows'],
  },
  {
    id: 'mistral',
    name: 'Mistral AI',
    founder: 'Arthur Mensch',
    tagline: 'Frontier AI lab building open and commercial models.',
    description:
      'Mistral is building model infrastructure from Europe with an open-weight strategy and commercial deployment path.',
    category: 'AI models',
    location: 'Paris',
    stage: 'Growth',
    launched: 'Yesterday',
    fit: 88,
    saves: 312,
    comments: 29,
    momentum: 'European AI infrastructure',
    website: 'https://mistral.ai/',
    projectPath: '/projects/mistral',
    founderProfilePath: '/profile/arthur-mensch',
    proof: ['Open-weight strategy', 'Model ecosystem', 'Infrastructure demand'],
    investors: ['AI models', 'Infrastructure', 'Europe'],
  },
  {
    id: 'harvey',
    name: 'Harvey',
    founder: 'Winston Weinberg',
    tagline: 'AI workflows for legal and professional services.',
    description:
      'Harvey brings AI into high-context legal work where accuracy, privacy, and institutional knowledge matter.',
    category: 'AI legal',
    location: 'San Francisco',
    stage: 'Growth',
    launched: 'Yesterday',
    fit: 87,
    saves: 286,
    comments: 21,
    momentum: 'Enterprise legal adoption',
    website: 'https://www.harvey.ai/',
    projectPath: '/projects/harvey',
    founderProfilePath: '/profile/winston-weinberg',
    proof: ['Vertical AI wedge', 'Enterprise pull', 'High-value workflow'],
    investors: ['Vertical AI', 'Enterprise', 'Legal tech'],
  },
  {
    id: 'ramp',
    name: 'Ramp',
    founder: 'Eric Glyman',
    tagline: 'Finance automation for cards, spend, procurement, and accounting.',
    description:
      'Ramp gives finance teams one operating surface for spend control, automation, procurement, payments, and accounting context.',
    category: 'Fintech',
    location: 'New York',
    stage: 'Growth',
    launched: 'This week',
    fit: 84,
    saves: 241,
    comments: 17,
    momentum: 'Finance ops expansion',
    website: 'https://ramp.com/',
    projectPath: '/projects/ramp',
    founderProfilePath: '/profile/eric-glyman',
    proof: ['Large operational surface', 'Clear buyer pain', 'Workflow automation'],
    investors: ['Fintech', 'B2B SaaS', 'Finance ops'],
  },
  {
    id: 'lovable',
    name: 'Lovable',
    founder: 'Anton Osika',
    tagline: 'AI app builder for turning prompts into shipped products.',
    description:
      'Lovable helps builders create, revise, and ship full-stack app prototypes from natural language prompts.',
    category: 'AI app builder',
    location: 'Stockholm',
    stage: 'Seed',
    launched: 'This week',
    fit: 82,
    saves: 219,
    comments: 25,
    momentum: 'Prototype velocity',
    website: 'https://lovable.dev/',
    projectPath: '/projects/lovable',
    founderProfilePath: '/profile/anton-osika',
    proof: ['Builder workflow', 'Fast product loops', 'Community pull'],
    investors: ['AI apps', 'Prosumer', 'Developer workflows'],
  },
  {
    id: 'neon',
    name: 'Neon',
    founder: 'Nikita Shamgunov',
    tagline: 'Serverless Postgres for modern product teams.',
    description:
      'Neon separates storage and compute so teams can branch databases, scale workloads, and ship Postgres-backed products faster.',
    category: 'Data infra',
    location: 'San Francisco',
    stage: 'Growth',
    launched: 'This week',
    fit: 81,
    saves: 203,
    comments: 18,
    momentum: 'Database branching pull',
    website: 'https://neon.tech/',
    projectPath: '/projects/neon',
    founderProfilePath: '/profile/nikita-shamgunov',
    proof: ['Serverless Postgres adoption', 'Developer workflow fit', 'Clear infra wedge'],
    investors: ['Data', 'Infrastructure', 'Developer tools'],
  },
  {
    id: 'modal',
    name: 'Modal',
    founder: 'Erik Bernhardsson',
    tagline: 'Cloud compute for AI, data, and batch workloads.',
    description:
      'Modal gives teams a fast way to run Python jobs, GPUs, scheduled tasks, and inference workloads without managing infrastructure.',
    category: 'AI infra',
    location: 'New York',
    stage: 'Seed',
    launched: 'This week',
    fit: 80,
    saves: 197,
    comments: 16,
    momentum: 'GPU workflow demand',
    website: 'https://modal.com/',
    projectPath: '/projects/modal',
    founderProfilePath: '/profile/erik-bernhardsson',
    proof: ['AI workload pull', 'Developer-first platform', 'Usage-driven infrastructure'],
    investors: ['AI infra', 'Cloud', 'Developer tools'],
  },
  {
    id: 'linear',
    name: 'Linear',
    founder: 'Karri Saarinen',
    tagline: 'Issue tracking and product planning for high-velocity teams.',
    description:
      'Linear turns product planning, engineering execution, and team rituals into one fast operating surface.',
    category: 'Productivity',
    location: 'San Francisco',
    stage: 'Growth',
    launched: 'This month',
    fit: 78,
    saves: 184,
    comments: 22,
    momentum: 'Product team operating system',
    website: 'https://linear.app/',
    projectPath: '/projects/linear',
    founderProfilePath: '/profile/karri-saarinen',
    proof: ['High-frequency workflow', 'Strong product taste', 'Team expansion signal'],
    investors: ['Productivity', 'SaaS', 'Workflow'],
  },
  {
    id: 'elevenlabs',
    name: 'ElevenLabs',
    founder: 'Mati Staniszewski',
    tagline: 'AI audio generation for voices, agents, and media workflows.',
    description:
      'ElevenLabs gives creators and teams voice generation, dubbing, and audio AI tools for production-grade workflows.',
    category: 'AI audio',
    location: 'London',
    stage: 'Growth',
    launched: 'This month',
    fit: 77,
    saves: 176,
    comments: 20,
    momentum: 'Audio AI adoption',
    website: 'https://elevenlabs.io/',
    projectPath: '/projects/elevenlabs',
    founderProfilePath: '/profile/mati-staniszewski',
    proof: ['Creator workflow pull', 'Enterprise media usage', 'Clear AI application layer'],
    investors: ['AI audio', 'Creator tools', 'Media'],
  },
];

// Recognizable funds for the hero trust pill. Logos come from the favicon
// service already used for launch logos, so they stay reliable (no hotlinking).
const heroInvestors: { name: string; domain: string }[] = [
  { name: 'Y Combinator', domain: 'ycombinator.com' },
  { name: 'Sequoia Capital', domain: 'sequoiacap.com' },
  { name: 'Andreessen Horowitz', domain: 'a16z.com' },
  { name: 'Accel', domain: 'accel.com' },
  { name: 'Antler', domain: 'antler.co' },
];

export const Home = () => {
  const navigate = useNavigate();

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#fbfaf7] text-black">
      <EditorialNavbar />

      {/* HERO — founder-led: state what Apparent is and the wedge in one breath. */}
      <section className="mx-auto max-w-[78rem] px-5 pb-6 pt-10 sm:px-8 md:pt-16">
        <div className="mb-6 flex justify-center">
          <div className="inline-flex items-center gap-2.5 rounded-full border border-black/10 bg-white/80 py-1.5 pl-2 pr-4 text-xs font-semibold text-[#42520d] shadow-[0_4px_14px_rgba(0,0,0,0.05)]">
            <div className="flex items-center">
              {heroInvestors.map((investor, index) => (
                <img
                  key={investor.domain}
                  src={`https://www.google.com/s2/favicons?domain=${investor.domain}&sz=128`}
                  alt={investor.name}
                  title={investor.name}
                  className={`h-7 w-7 rounded-full border-2 border-white bg-white object-contain p-0.5 ${index > 0 ? '-ml-2.5' : ''}`}
                />
              ))}
            </div>
            <span>1,800+ investors mapped</span>
          </div>
        </div>
        <h1
          className="max-w-3xl text-4xl font-normal leading-[1.05] tracking-[-0.04em] md:text-5xl lg:max-w-none lg:whitespace-nowrap lg:text-6xl"
          style={serifDisplay}
        >
          <span className="puzzle-base">Find investors who actually</span><span className="puzzle-piece">fit.</span>
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-black/65 md:text-lg">
          Apparent matches founders and investors by thesis, stage, and sector.
          Founders reach the funds that back what they&apos;re building. Investors meet the
          founders who fit their thesis. Less noise on both sides, better conversations.
        </p>
        <div className="mt-7 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/login?role=founder')}
            className="inline-flex items-center gap-2 rounded-full bg-[#dcefc7] px-6 py-3 text-sm font-semibold text-black transition-colors hover:bg-[#cce8ae]"
          >
            I&apos;m a founder <ArrowUpRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => navigate('/login?role=investor')}
            className="inline-flex items-center gap-2 rounded-full bg-[#42520d] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#34420a]"
          >
            I&apos;m an investor
          </button>
          <Link
            to="/heat-map"
            className="inline-flex items-center gap-1.5 px-2 py-3 text-sm font-semibold text-black/60 transition-colors hover:text-black"
          >
            Explore the VC heatmap <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* HEATMAP MAGNET — the free front door, mirrors OpenVC's investor list but alive. */}
      <section className="mx-auto max-w-[78rem] px-5 pb-12 sm:px-8">
        <div className="mb-4 flex justify-end">
          <Link
            to="/heat-map"
            className="inline-flex items-center gap-1.5 rounded-full border border-black/15 bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-black/5"
          >
            Open the full map <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="relative flex h-[clamp(360px,56vh,560px)] overflow-hidden rounded-[26px] border border-black/10 bg-[#e8e5dc] shadow-[0_18px_60px_rgba(0,0,0,0.08)]">
          <HeatMap includeVCContacts vcOnly fullBleed fillParent lockContacts />
        </div>
      </section>

      {/* WHO IT'S FOR — the section that makes a stranger self-identify in 5 seconds. */}
      <section className="mx-auto max-w-[78rem] border-t border-black/10 px-5 py-12 sm:px-8">
        <h2 className="max-w-2xl text-3xl font-normal leading-tight tracking-[-0.035em] md:text-4xl" style={serifDisplay}>
          One map. Two sides of the table.
        </h2>
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {/* Founders */}
          <div className="flex flex-col rounded-[24px] border border-black/10 bg-white/70 p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#42520d]">For founders</p>
            <h3 className="mt-3 text-2xl font-semibold tracking-[-0.02em]">Reach the investors who fit your raise.</h3>
            <ul className="mt-5 grid gap-3 text-sm leading-6 text-black/65">
              {[
                'Match to funds by thesis, stage, and sector, not a generic list of thousands.',
                'See which investors fit your raise and which are already tracking you.',
                'Flip on “raising now” so the right funds know you’re open, and approach them with context.',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#42520d]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => navigate('/login?role=founder')}
              className="mt-7 inline-flex w-fit items-center gap-2 rounded-full bg-[#42520d] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#34420a]"
            >
              Create founder profile <ArrowUpRight className="h-4 w-4" />
            </button>
          </div>

          {/* Investors */}
          <div className="flex flex-col rounded-[24px] bg-[#1c1c1a] p-7 text-white">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#bcd99a]">For investors</p>
            <h3 className="mt-3 text-2xl font-semibold tracking-[-0.02em]">Meet the founders who fit your thesis.</h3>
            <ul className="mt-5 grid gap-3 text-sm leading-6 text-white/70">
              {[
                'A live map of builders who fit your stage, sector, and geography.',
                'Filter by thesis fit and who’s raising right now, not a static directory.',
                'Approach the founders who actually fit, the moment the signal is fresh.',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#bcd99a]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => navigate('/login?role=investor')}
              className="mt-7 inline-flex w-fit items-center gap-2 rounded-full bg-[#dcefc7] px-5 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-[#cce8ae]"
            >
              Create investor profile <ArrowUpRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      {/* THE WEDGE — fit beats volume, on both sides. */}
      <section className="mx-auto max-w-[78rem] border-t border-black/10 px-5 py-12 sm:px-8">
        <div className="grid gap-8 md:grid-cols-2 md:items-center">
          <div>
            <h2 className="max-w-xl text-3xl font-normal leading-tight tracking-[-0.035em] md:text-4xl" style={serifDisplay}>
              The right match beats a hundred wrong ones.
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-black/60">
              A generic list of thousands wastes everyone&apos;s time. Apparent matches founders
              and investors on thesis, stage, and sector first, so the conversations that happen
              are the ones that should.
            </p>
          </div>
          <div className="grid gap-3">
            <div className="rounded-[18px] border border-black/10 bg-white/50 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-black/35">The old way</p>
              <p className="mt-2 text-sm leading-6 text-black/55">
                Work a list of thousands. Guess at fit. Hope something sticks.
              </p>
            </div>
            <div className="rounded-[18px] border border-[#42520d]/20 bg-[#dcefc7]/40 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#42520d]">On Apparent</p>
              <p className="mt-2 text-sm leading-6 text-black/65">
                Match on thesis and stage. Talk to the few who fit. Skip the rest.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS — the two-sided loop. */}
      <section id="how-to" className="mx-auto max-w-[78rem] border-t border-black/10 px-5 py-10 sm:px-8">
        <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div>
            <h2 className="max-w-xl text-3xl font-normal leading-tight tracking-[-0.035em] md:text-4xl" style={serifDisplay}>
              Show up. Match on fit. Connect.
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { icon: Zap, title: 'Show your work', text: 'Launches, commits, and traction become a profile that proves itself.' },
              { icon: Radar, title: 'Match on fit', text: 'See the investors whose thesis, stage, and sector actually fit your raise.' },
              { icon: Send, title: 'Start the right conversation', text: 'Approach the funds that fit, or signal you’re raising and let them come to you.' },
            ].map((item) => (
              <article key={item.title} className="rounded-[22px] bg-white/70 p-5">
                <item.icon className="mb-5 h-4 w-4 text-[#42520d]" />
                <h3 className="text-base font-semibold tracking-[-0.015em]">
                  {item.title}
                </h3>
                <p className="mt-4 text-sm leading-6 text-black/55">{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[78rem] border-t border-black/10 px-5 py-12 sm:px-8">
        <div className="grid gap-6 rounded-[26px] bg-white/65 p-6 text-left md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <MapPin className="mb-5 h-5 w-5 text-[#42520d]" />
            <h2 className="max-w-2xl text-3xl font-normal leading-tight tracking-[-0.035em] md:text-4xl" style={serifDisplay}>
              Find your fit.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-black/55">
              Founders find the investors who fit their raise. Investors find the founders who fit their thesis. Pick your side and start in under a minute.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row md:flex-col">
            <button
              type="button"
              onClick={() => navigate('/login?role=founder')}
              className="rounded-full bg-[#dcefc7] px-6 py-3 text-sm font-semibold text-black hover:bg-[#cce8ae]"
            >
              Create founder profile
            </button>
            <button
              type="button"
              onClick={() => navigate('/login?role=investor')}
              className="rounded-full bg-[#42520d] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#34420a]"
            >
              Create investor profile <ArrowUpRight className="ml-1 inline h-3.5 w-3.5 align-[-2px]" />
            </button>
          </div>
        </div>
      </section>
    </main>
  );
};
