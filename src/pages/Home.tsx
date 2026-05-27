import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowUpRight,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  FileText,
  Flame,
  MessageSquare,
  Search,
  Star,
  Target,
  TrendingUp,
} from 'lucide-react';
import { EditorialNavbar } from '../components/EditorialNavbar';
import { loadPublicProductLaunches } from '../lib/dashboard-service';
import type { ProductLaunch as WorkspaceProductLaunch } from '../lib/apparent-types';

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

const filters = ['Today', 'Trending', 'AI', 'Devtools', 'Fintech', 'Data', 'Infra', 'Productivity', 'Audio', 'Security', 'Open Source', 'Climate', 'Health', 'Nearby'];

const getDomain = (url: string) => {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return 'apparent.dev';
  }
};

const workspaceLaunchToFrontPageLaunch = (launch: WorkspaceProductLaunch, index: number): FrontPageLaunch => ({
  id: `workspace-${launch.id}`,
  name: launch.name,
  founder: launch.ownerId === 'dev-founder' ? 'Apparent founder' : 'Founder on Apparent',
  tagline: launch.tagline || 'New product launched into Apparent.',
  description: launch.intro || launch.metrics || launch.tagline || 'This founder has launched a new product for investor and builder discovery.',
  category: launch.category || 'Builder product',
  location: launch.location || 'Apparent',
  stage: launch.stage || 'Launched',
  launched: 'Today',
  fit: Math.max(72, 94 - index * 3),
  saves: Math.max(18, launch.name.length * 5),
  comments: Math.max(3, launch.category.length || 3),
  momentum: launch.metrics || 'Fresh founder launch',
  website: launch.launchUrl || launch.proofUrl || 'https://apparent.dev/',
  projectPath: `/projects/${launch.slug || launch.id}`,
  founderProfilePath: `/profile/${launch.ownerId}`,
  logoUrl: launch.logoUrl,
  bannerUrl: launch.bannerUrl,
  demoVideoUrl: launch.demoVideoUrl,
  pitchVideoUrl: launch.pitchVideoUrl,
  pitchDeckUrl: launch.pitchDeckUrl,
  pitchBookNote: launch.pitchBookNote,
  pitchVisibility: launch.pitchVisibility,
  founderSignals: launch.founderSignals,
  proof: [launch.metrics, launch.proofUrl ? 'Proof link attached' : '', launch.stage].filter(
    (item): item is string => Boolean(item),
  ),
  investors: [launch.category || 'Builder proof', launch.stage || 'Fresh launch', 'Founder profile'],
});

export const Home = () => {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState('Today');
  const [selectedId, setSelectedId] = useState(productLaunches[0].id);
  const [publishedLaunches, setPublishedLaunches] = useState<WorkspaceProductLaunch[]>([]);
  const filterScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let isMounted = true;

    loadPublicProductLaunches().then((launches) => {
      if (isMounted) {
        setPublishedLaunches(launches);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const launchRows = useMemo(
    () => [
      ...publishedLaunches.map((launch, index) => workspaceLaunchToFrontPageLaunch(launch, index)),
      ...productLaunches,
    ],
    [publishedLaunches],
  );

  const visibleLaunches = useMemo(() => {
    if (activeFilter === 'Today') {
      return launchRows;
    }

    if (activeFilter === 'Trending') {
      return [...launchRows].sort((a, b) => b.saves + b.comments - (a.saves + a.comments));
    }

    if (activeFilter === 'Nearby') {
      return launchRows.filter((launch) => ['San Francisco', 'New York', 'Apparent'].includes(launch.location));
    }

    return launchRows.filter((launch) => launch.category.toLowerCase().includes(activeFilter.toLowerCase()));
  }, [activeFilter, launchRows]);

  const selectedLaunch = launchRows.find((launch) => launch.id === selectedId) ?? launchRows[0];
  const selectedDomain = getDomain(selectedLaunch.website);
  const topLaunch = launchRows[0];

  const handleSelectLaunch = (launch: FrontPageLaunch) => {
    setSelectedId(launch.id);
  };

  const scrollFilters = (direction: -1 | 1) => {
    filterScrollRef.current?.scrollBy({
      left: direction * 140,
      behavior: 'smooth',
    });
  };

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#fbfaf7] text-black">
      <EditorialNavbar />

      <section className="mx-auto max-w-[78rem] px-5 pb-5 pt-6 sm:px-8 md:pt-7">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-end">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-3 text-sm font-semibold text-[#42520d]">
              <span className="text-black/35">Updated today</span>
            </div>
            <h1
              className="max-w-2xl text-3xl font-normal leading-tight tracking-[-0.035em] md:text-4xl"
              style={serifDisplay}
            >
              Find builders by what they ship.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-black/65">
              Browse the products, proof, and founder signals investors are paying attention to right now.
            </p>
          </div>

          <aside className="rounded-[20px] border border-black bg-white/75 p-4 shadow-[0_10px_34px_rgba(0,0,0,0.045)]">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-[#42520d]">Top launch</p>
              <Flame className="launch-flame h-4 w-4 text-[#f97316]" />
            </div>
            <div className="mt-4 flex items-center gap-3">
              <img
                src={topLaunch.logoUrl || `https://www.google.com/s2/favicons?domain=${getDomain(topLaunch.website)}&sz=128`}
                alt=""
                className="h-12 w-12 rounded-[16px] bg-[#fbfaf7] object-contain p-2"
              />
              <div>
                <h2 className="text-xl font-semibold tracking-[-0.02em]">
                  {topLaunch.name}
                </h2>
                <p className="mt-1 text-sm text-black/55">{topLaunch.momentum}</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              {[
                [topLaunch.fit, 'fit'],
                [topLaunch.saves, 'saves'],
                [topLaunch.comments, 'notes'],
              ].map(([value, label]) => (
                <div key={label} className="rounded-[14px] bg-[#fbfaf7] px-3 py-2.5">
                  <p className="text-base font-semibold tracking-[-0.02em]">
                    {value}
                  </p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-black/40">{label}</p>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </section>

      <section id="signals" className="mx-auto grid max-w-[78rem] gap-6 border-t border-black/10 px-5 py-6 sm:px-8 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <div>
          <div className="mb-4 grid gap-3 md:grid-cols-[minmax(12rem,16rem)_minmax(0,1fr)] md:items-center">
            <div className="min-w-0">
              <p className="text-base font-semibold text-black">Today&apos;s launches</p>
            </div>
            <div className="flex min-w-0 max-w-full items-center gap-1.5">
              <button
                type="button"
                onClick={() => scrollFilters(-1)}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/85 text-black/60 transition-colors hover:bg-white hover:text-black"
                aria-label="Scroll filters left"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <div ref={filterScrollRef} className="launch-filter-scroll flex min-w-0 flex-1 gap-1.5 overflow-x-auto px-1 pb-1">
                {filters.map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setActiveFilter(filter)}
                    className={`shrink-0 rounded-full px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                      activeFilter === filter ? 'bg-black text-white' : 'bg-white/80 text-black/60 hover:bg-white'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => scrollFilters(1)}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/85 text-black/60 transition-colors hover:bg-white hover:text-black"
                aria-label="Scroll filters right"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="grid gap-3">
            {visibleLaunches.map((launch, index) => {
              const isSelected = selectedLaunch.id === launch.id;
              const domain = getDomain(launch.website);

              return (
                <button
                  key={launch.id}
                  type="button"
                  onClick={() => handleSelectLaunch(launch)}
                  className={`group grid gap-4 rounded-[22px] bg-white/78 p-4 text-left shadow-[0_10px_34px_rgba(0,0,0,0.04)] transition-all hover:-translate-y-0.5 hover:bg-white md:grid-cols-[3.25rem_1fr_auto] md:items-center ${
                    isSelected ? 'ring-2 ring-[#42520d]/20' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 md:block">
                    <div className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-[#fbfaf7]">
                      <img
                        src={launch.logoUrl || `https://www.google.com/s2/favicons?domain=${domain}&sz=128`}
                        alt=""
                        className="h-7 w-7 object-contain"
                      />
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-black/35 md:mt-4 md:block">
                      0{index + 1}
                    </span>
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-semibold tracking-[-0.02em]">
                        {launch.name}
                      </h2>
                      <span className="rounded-full bg-[#dcefc7] px-2.5 py-0.5 text-xs font-semibold text-black">
                        {launch.fit}% thesis fit
                      </span>
                    </div>
                    <p className="mt-1.5 text-sm leading-6 text-black/70">{launch.tagline}</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-black/45">
                      <span>{launch.category}</span>
                      <span>-</span>
                      <span>{launch.location}</span>
                      <span>-</span>
                      <span>{launch.stage}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm font-semibold text-black/60 md:w-44 md:justify-end">
                    <span className="inline-flex items-center gap-1.5">
                      <ChevronUp className="h-4 w-4 text-[#42520d]" />
                      {launch.saves}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-black/45">
                      <MessageSquare className="h-4 w-4" />
                      {launch.comments}
                    </span>
                    <span className="ml-auto rounded-full bg-[#f4f1eb] px-3.5 py-2 text-xs font-semibold text-black/70 transition-colors group-hover:bg-[#42520d] group-hover:text-white md:ml-0">
                      View
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="rounded-[24px] bg-white/80 p-5 shadow-[0_14px_44px_rgba(0,0,0,0.05)]">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-[#42520d]">Selected project</p>
              <Bookmark className="h-5 w-5 text-black/50" />
            </div>
            {selectedLaunch.bannerUrl && (
              <div className="mt-5 aspect-[16/7] overflow-hidden rounded-[18px] bg-[#fbfaf7]">
                <img src={selectedLaunch.bannerUrl} alt="" className="h-full w-full object-cover" />
              </div>
            )}

            <div className="mt-5 flex items-center gap-3">
              <Link to={selectedLaunch.projectPath} aria-label={`Open ${selectedLaunch.name} project profile`}>
                <img
                  src={selectedLaunch.logoUrl || `https://www.google.com/s2/favicons?domain=${selectedDomain}&sz=128`}
                  alt=""
                  className="h-12 w-12 rounded-[16px] bg-[#fbfaf7] object-contain p-2 transition-opacity hover:opacity-75"
                />
              </Link>
              <div>
                <Link to={selectedLaunch.projectPath} className="text-xl font-semibold tracking-[-0.02em] transition-colors hover:text-[#42520d]">
                  {selectedLaunch.name}
                </Link>
                <p className="mt-2 text-sm font-semibold text-black/55">by {selectedLaunch.founder}</p>
              </div>
            </div>

            <p className="mt-5 text-sm leading-7 text-black/60">{selectedLaunch.description}</p>

            {(selectedLaunch.demoVideoUrl || selectedLaunch.pitchVideoUrl) && (
              <div className="mt-5 grid gap-3">
                {selectedLaunch.demoVideoUrl && (
                  <video className="aspect-video w-full rounded-[16px] bg-black object-cover" src={selectedLaunch.demoVideoUrl} controls />
                )}
                {selectedLaunch.pitchVideoUrl && (
                  <video className="aspect-video w-full rounded-[16px] bg-black object-cover" src={selectedLaunch.pitchVideoUrl} controls />
                )}
              </div>
            )}

            {selectedLaunch.pitchVisibility !== 'investors' && (selectedLaunch.pitchDeckUrl || selectedLaunch.pitchBookNote) && (
              <div className="mt-5 rounded-[16px] bg-[#fbfaf7] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#42520d]">Pitch Book</p>
                {selectedLaunch.pitchBookNote && (
                  <p className="mt-3 text-sm leading-6 text-black/60">{selectedLaunch.pitchBookNote}</p>
                )}
                {selectedLaunch.pitchDeckUrl && (
                  <a
                    href={selectedLaunch.pitchDeckUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-[#42520d]"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Pitch deck
                  </a>
                )}
              </div>
            )}

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-[16px] bg-[#fbfaf7] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-black/40">Location</p>
                <p className="mt-2 text-sm font-semibold">{selectedLaunch.location}</p>
              </div>
              <div className="rounded-[16px] bg-[#fbfaf7] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-black/40">Momentum</p>
                <p className="mt-2 text-sm font-semibold">{selectedLaunch.momentum}</p>
              </div>
            </div>

            <div className="mt-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#42520d]">Proof signals</p>
              <div className="grid gap-2">
                {selectedLaunch.proof.map((signal) => (
                  <div key={signal} className="flex items-start gap-2 text-sm leading-6 text-black/60">
                    <Star className="mt-1 h-3.5 w-3.5 shrink-0 text-[#42520d]" />
                    <span>{signal}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {selectedLaunch.investors.map((investor) => (
                <span key={investor} className="rounded-full bg-[#dcefc7] px-3 py-1.5 text-xs font-semibold text-black">
                  {investor}
                </span>
              ))}
            </div>

            <div className="mt-6 grid gap-3">
              <Link
                to={selectedLaunch.projectPath}
                className="inline-flex items-center justify-center rounded-full bg-[#42520d] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#34420a]"
              >
                Open project <ArrowUpRight className="ml-2 h-4 w-4" />
              </Link>
              <button
                type="button"
                onClick={() => navigate('/login?role=investor')}
                className="rounded-full bg-[#dcefc7] px-5 py-3 text-sm font-semibold text-black transition-colors hover:bg-[#cce8ae]"
              >
                Save to investor workspace
              </button>
            </div>
          </div>

          <div className="mt-4 rounded-[22px] bg-[#fbfaf7] p-5">
            <p className="text-sm font-semibold">Why this is here</p>
            <p className="mt-3 text-sm leading-7 text-black/55">
              Apparent ranks products by public proof, launch freshness, founder context, and thesis fit so investors can browse real builder momentum.
            </p>
          </div>
        </aside>
      </section>

      <section id="how-to" className="mx-auto max-w-[78rem] border-t border-black/10 px-5 py-10 sm:px-8">
        <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div>
            <h2 className="max-w-xl text-3xl font-normal leading-tight tracking-[-0.035em] md:text-4xl" style={serifDisplay}>
              Browse first. Decide faster.
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { icon: Search, title: 'Scan launches', text: 'See what shipped, who built it, and why it is moving.' },
              { icon: Target, title: 'Check fit', text: 'Category, stage, location, and thesis signals stay attached.' },
              { icon: TrendingUp, title: 'Take action', text: 'Open, save, message, or move a builder into workflow.' },
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
            <Clock className="mb-5 h-5 w-5 text-[#42520d]" />
            <h2 className="max-w-2xl text-3xl font-normal leading-tight tracking-[-0.035em] md:text-4xl" style={serifDisplay}>
              Put your product where investors browse.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-black/55">
              Create a proof profile, add launches, and let the front page turn builder work into investor discovery.
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
