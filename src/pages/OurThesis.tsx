import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowUpRight,
  Bell,
  FileText,
  MapPin,
  MessageSquare,
  MoveRight,
  Radar,
  Route,
  Search,
  Sparkles,
  Target,
} from 'lucide-react';
import { BuilderRadarMap } from '../components/BuilderRadarMap';
import { EditorialNavbar } from '../components/EditorialNavbar';
import type { BuilderMapCluster, BuilderNode } from '../lib/apparent-types';

const serifDisplay = {
  fontFamily: 'Georgia, "Times New Roman", serif',
};

const marketRows = [
  ['01', 'Founder proof', 'Products, GitHub, press, traction, launches, location, and capital goals become one searchable profile.'],
  ['02', 'Investor taste', 'Thesis, sector, stage, geography, check size, founder signals, and pass signals become reusable sourcing criteria.'],
  ['03', 'Local momentum', 'Builder Radar shows Apparent builders around any city, venue, neighborhood, or current location.'],
  ['04', 'Relationship context', 'Messages, meetups, terms, outreach, and deal flow stay connected to the proof that started the conversation.'],
];

const signalRows = [
  { company: 'Anysphere', founder: 'Michael Truell', fit: '96%', detail: 'Cursor turned AI coding into a daily workflow for engineering teams.', source: 'AI devtools' },
  { company: 'Perplexity', founder: 'Aravind Srinivas', fit: '91%', detail: 'Answer engine growth with a strong consumer and research workflow wedge.', source: 'AI search' },
  { company: 'Mistral AI', founder: 'Arthur Mensch', fit: '88%', detail: 'Open-weight model strategy and European AI infrastructure momentum.', source: 'AI models' },
];

const proofSignals = [
  ['GitHub proof', 'Recent commits, repositories, collaborators, and technical depth.'],
  ['Launch history', 'Past products, current builds, customer signals, and public proof.'],
  ['Place and timing', 'Where builders are active and what changed most recently.'],
];

const productSurfaces = [
  {
    title: 'Builder Radar',
    icon: Radar,
    text: 'A real discovery map for finding Apparent builders around any place of interest.',
  },
  {
    title: 'Signal inbox',
    icon: Search,
    text: 'A ranked stream of founder and company proof sorted by fit, freshness, and source quality.',
  },
  {
    title: 'Direct messages',
    icon: MessageSquare,
    text: 'Founder and investor notes stay attached to profiles, meetups, terms, and sourcing context.',
  },
  {
    title: 'Terms review',
    icon: FileText,
    text: 'Deal notes and plain-language term context stay readable before legal work gets heavy.',
  },
];

const workflowItems = [
  {
    title: 'Builders make proof profiles',
    text: 'The founder side starts with work: products, GitHub, launch history, traction, press, location, and capital goals.',
  },
  {
    title: 'Investors declare taste',
    text: 'The VC side turns thesis, stage, geography, check size, pass signals, and founder taste into a private sourcing desk.',
  },
  {
    title: 'Apparent creates motion',
    text: 'The product turns proof and taste into Builder Radar, ranked inboxes, outreach drafts, deal flow, DMs, meetups, and terms.',
  },
];

const dealFlowPreview = [
  {
    stage: 'New',
    count: '3',
    items: [
      ['Anysphere', '96%', 'AI devtools · San Francisco'],
      ['Lovable', '82%', 'AI app builder · Stockholm'],
    ],
  },
  {
    stage: 'Meeting',
    count: '2',
    items: [
      ['Perplexity', '91%', 'AI search · San Francisco'],
      ['Mistral AI', '88%', 'AI models · Paris'],
    ],
  },
  {
    stage: 'Diligence',
    count: '1',
    items: [
      ['Harvey', '87%', 'AI legal · San Francisco'],
      ['Ramp', '84%', 'Fintech · New York'],
    ],
  },
];

const cityCoordinates: Record<string, { latitude: number; longitude: number }> = {
  'San Francisco': { latitude: 37.7749, longitude: -122.4194 },
  'New York': { latitude: 40.7128, longitude: -74.006 },
  Paris: { latitude: 48.8566, longitude: 2.3522 },
  London: { latitude: 51.5074, longitude: -0.1278 },
  Stockholm: { latitude: 59.3293, longitude: 18.0686 },
  Toronto: { latitude: 43.6532, longitude: -79.3832 },
};

const startupLocationOffset = (index: number) => {
  const offsets = [
    [0.05, -0.06],
    [-0.045, 0.055],
    [0.035, 0.04],
    [-0.025, -0.035],
  ];
  return offsets[index % offsets.length];
};

const makeStartupNode = (
  startup: Omit<BuilderNode, 'id' | 'founderId' | 'displayLabel' | 'latitude' | 'longitude' | 'proofLinks' | 'latestActivity' | 'latestActivityLabel' | 'profileUrl' | 'githubUrl' | 'pressUrl' | 'launchUrl' | 'rawTags'> & {
    website: string;
    tags: string[];
  },
  index: number,
): BuilderNode => {
  const baseCoordinates = cityCoordinates[startup.location];
  const [latOffset, lngOffset] = startupLocationOffset(index);

  return {
    ...startup,
    id: `public-startup-${startup.company.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    founderId: `public-founder-${startup.founderName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    displayLabel: startup.company,
    latitude: baseCoordinates.latitude + latOffset,
    longitude: baseCoordinates.longitude + lngOffset,
    proofLinks: [{ label: 'Website', url: startup.website, type: 'profile' }],
    latestActivity: new Date(Date.now() - (index + 1) * 24 * 60 * 60 * 1000).toISOString(),
    latestActivityLabel: 'Public company signal',
    profileUrl: startup.website,
    githubUrl: '',
    pressUrl: '',
    launchUrl: startup.website,
    rawTags: startup.tags,
  };
};

const landingStartupNodes: BuilderNode[] = [
  makeStartupNode({
    founderName: 'Michael Truell',
    company: 'Anysphere',
    buildSummary: 'AI-native coding workspace behind Cursor, built for software teams working with code agents.',
    category: 'AI devtools',
    stage: 'Growth',
    location: 'San Francisco',
    traction: 'Widely adopted AI coding workflow.',
    launchCount: 1,
    fitScore: 96,
    matchReasons: ['AI devtools', 'Developer workflow', 'Product velocity'],
    website: 'https://www.cursor.com/',
    tags: ['ai', 'developer-tools', 'coding'],
  }, 0),
  makeStartupNode({
    founderName: 'Aravind Srinivas',
    company: 'Perplexity',
    buildSummary: 'AI answer engine with search, research, and knowledge workflows for consumers and teams.',
    category: 'AI search',
    stage: 'Growth',
    location: 'San Francisco',
    traction: 'Fast-growing AI search product.',
    launchCount: 1,
    fitScore: 91,
    matchReasons: ['AI search', 'Consumer workflow', 'High-frequency usage'],
    website: 'https://www.perplexity.ai/',
    tags: ['ai', 'search', 'consumer'],
  }, 1),
  makeStartupNode({
    founderName: 'Winston Weinberg',
    company: 'Harvey',
    buildSummary: 'AI platform for legal and professional services work, focused on high-context knowledge workflows.',
    category: 'AI legal',
    stage: 'Growth',
    location: 'San Francisco',
    traction: 'Enterprise legal workflow adoption.',
    launchCount: 1,
    fitScore: 87,
    matchReasons: ['Vertical AI', 'Legal workflow', 'Enterprise pull'],
    website: 'https://www.harvey.ai/',
    tags: ['ai', 'legal', 'enterprise'],
  }, 2),
  makeStartupNode({
    founderName: 'Eric Glyman',
    company: 'Ramp',
    buildSummary: 'Finance automation platform for cards, spend management, procurement, bill pay, and accounting workflows.',
    category: 'Fintech',
    stage: 'Growth',
    location: 'New York',
    traction: 'Large finance operations platform.',
    launchCount: 1,
    fitScore: 84,
    matchReasons: ['Fintech', 'Workflow automation', 'Business spend'],
    website: 'https://ramp.com/',
    tags: ['fintech', 'finance', 'automation'],
  }, 3),
  makeStartupNode({
    founderName: 'Cristobal Valenzuela',
    company: 'Runway',
    buildSummary: 'Generative media platform for video, creative tooling, and model-powered production workflows.',
    category: 'Generative media',
    stage: 'Growth',
    location: 'New York',
    traction: 'Creator and studio workflow pull.',
    launchCount: 1,
    fitScore: 83,
    matchReasons: ['Generative video', 'Creative workflow', 'AI media'],
    website: 'https://runwayml.com/',
    tags: ['ai', 'video', 'media'],
  }, 4),
  makeStartupNode({
    founderName: 'Clement Delangue',
    company: 'Hugging Face',
    buildSummary: 'Open AI platform for models, datasets, spaces, and machine learning collaboration.',
    category: 'AI infrastructure',
    stage: 'Growth',
    location: 'New York',
    traction: 'Large model and developer ecosystem.',
    launchCount: 1,
    fitScore: 90,
    matchReasons: ['AI infrastructure', 'Developer community', 'Model ecosystem'],
    website: 'https://huggingface.co/',
    tags: ['ai', 'models', 'developer-community'],
  }, 5),
  makeStartupNode({
    founderName: 'Arthur Mensch',
    company: 'Mistral AI',
    buildSummary: 'Frontier AI lab building open and commercial model products from Paris.',
    category: 'AI models',
    stage: 'Growth',
    location: 'Paris',
    traction: 'European AI infrastructure momentum.',
    launchCount: 1,
    fitScore: 88,
    matchReasons: ['AI models', 'Open-weight strategy', 'European AI'],
    website: 'https://mistral.ai/',
    tags: ['ai', 'models', 'infrastructure'],
  }, 6),
  makeStartupNode({
    founderName: 'Mati Staniszewski',
    company: 'ElevenLabs',
    buildSummary: 'AI audio platform for voice generation, dubbing, and speech workflows.',
    category: 'AI audio',
    stage: 'Growth',
    location: 'London',
    traction: 'Broad creator and enterprise voice usage.',
    launchCount: 1,
    fitScore: 85,
    matchReasons: ['AI audio', 'Creator workflow', 'Enterprise media'],
    website: 'https://elevenlabs.io/',
    tags: ['ai', 'audio', 'voice'],
  }, 7),
  makeStartupNode({
    founderName: 'Anton Osika',
    company: 'Lovable',
    buildSummary: 'AI app builder for turning prompts into full-stack software prototypes and shipped products.',
    category: 'AI app builder',
    stage: 'Growth',
    location: 'Stockholm',
    traction: 'Strong builder and prototype velocity.',
    launchCount: 1,
    fitScore: 82,
    matchReasons: ['AI app builder', 'Builder workflow', 'Product velocity'],
    website: 'https://lovable.dev/',
    tags: ['ai', 'apps', 'builders'],
  }, 8),
  makeStartupNode({
    founderName: 'Aidan Gomez',
    company: 'Cohere',
    buildSummary: 'Enterprise AI platform for language models, retrieval, agents, and secure business workflows.',
    category: 'Enterprise AI',
    stage: 'Growth',
    location: 'Toronto',
    traction: 'Enterprise model platform traction.',
    launchCount: 1,
    fitScore: 81,
    matchReasons: ['Enterprise AI', 'Model platform', 'Secure deployments'],
    website: 'https://cohere.com/',
    tags: ['ai', 'enterprise', 'models'],
  }, 9),
];

const buildLandingClusters = (builders: BuilderNode[]): BuilderMapCluster[] => {
  const clusters = new Map<string, BuilderMapCluster>();

  builders.forEach((builder) => {
    const existing = clusters.get(builder.location);
    const baseCoordinates = cityCoordinates[builder.location] ?? {
      latitude: builder.latitude,
      longitude: builder.longitude,
    };
    const cluster =
      existing ??
      {
        city: builder.location,
        latitude: baseCoordinates.latitude,
        longitude: baseCoordinates.longitude,
        builderCount: 0,
        categoryMix: [],
        stageMix: [],
        latestActivity: builder.latestActivity,
        latestActivityLabel: 'Public startup examples',
        fitScore: 0,
        builderIds: [],
        meetups: 0,
      };

    cluster.builderCount += 1;
    cluster.builderIds.push(builder.id);
    cluster.categoryMix = Array.from(new Set([...cluster.categoryMix, builder.category])).slice(0, 4);
    cluster.stageMix = Array.from(new Set([...cluster.stageMix, builder.stage])).slice(0, 4);
    cluster.fitScore = Math.round(((cluster.fitScore * (cluster.builderCount - 1)) + builder.fitScore) / cluster.builderCount);
    clusters.set(builder.location, cluster);
  });

  return Array.from(clusters.values()).sort((a, b) => b.builderCount - a.builderCount);
};

export const OurThesis = () => {
  const navigate = useNavigate();
  const landingClusters = useMemo(() => buildLandingClusters(landingStartupNodes), []);
  const [selectedLandingCity, setSelectedLandingCity] = useState('San Francisco');
  const [selectedLandingBuilderId, setSelectedLandingBuilderId] = useState(landingStartupNodes[0].id);
  const [visibleLandingBuilderIds, setVisibleLandingBuilderIds] = useState<string[]>([]);

  const selectedLandingBuilders = useMemo(() => {
    const bySelectedCity = landingStartupNodes.filter((builder) => builder.location === selectedLandingCity);

    if (bySelectedCity.length > 0) {
      return bySelectedCity;
    }

    if (visibleLandingBuilderIds.length > 0) {
      const visibleSet = new Set(visibleLandingBuilderIds);
      return landingStartupNodes.filter((builder) => visibleSet.has(builder.id));
    }

    return landingStartupNodes.slice(0, 4);
  }, [selectedLandingCity, visibleLandingBuilderIds]);

  const selectedLandingBuilder =
    landingStartupNodes.find((builder) => builder.id === selectedLandingBuilderId) ?? selectedLandingBuilders[0] ?? landingStartupNodes[0];

  const handleSelectLandingCity = (city: string) => {
    setSelectedLandingCity(city);
    const firstBuilder = landingStartupNodes.find((builder) => builder.location === city);

    if (firstBuilder) {
      setSelectedLandingBuilderId(firstBuilder.id);
    }
  };

  const handleSelectLandingBuilder = (builderId: string) => {
    const builder = landingStartupNodes.find((candidate) => candidate.id === builderId);

    if (!builder) return;

    setSelectedLandingBuilderId(builder.id);
    setSelectedLandingCity(builder.location);
  };

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#fbfaf7] text-black">
      <EditorialNavbar />

      <section className="mx-auto max-w-[92rem] px-5 pb-16 pt-14 sm:px-8 md:pt-20">
        <div className="grid gap-10 lg:grid-cols-[1fr_24rem] lg:items-end">
          <h1
            className="max-w-[70rem] text-[2.65rem] font-normal leading-[0.92] tracking-[-0.055em] sm:text-[4.6rem] sm:leading-[0.9] md:text-[5.4rem] lg:text-[6.1rem] xl:text-[6.7rem]"
            style={serifDisplay}
          >
            Find the <span className="block sm:inline">builders</span>
            <br />
            before <span className="block sm:inline">everyone else.</span>
          </h1>

          <div className="hidden bg-white/65 px-6 py-6 lg:block">
            <div className="flex items-center justify-between pb-4">
              <p className="text-sm font-semibold text-[#42520d]">Live market pulse</p>
              <Sparkles className="h-4 w-4 text-[#02A070]" />
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-5">
              {[
                ['312', 'builders mapped'],
                ['86%', 'avg thesis fit'],
                ['42', 'new launches'],
                ['18', 'meetups live'],
              ].map(([value, label]) => (
                <div key={label} className="py-1">
                  <p className="text-3xl font-normal tracking-[-0.04em]" style={serifDisplay}>
                    {value}
                  </p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-black/45">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <p className="max-w-3xl text-lg leading-8 text-black/65 md:text-xl">
            Founders show real proof of what they've built. Investors find builders who match what they're looking for.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => navigate('/login?role=founder')}
              className="w-full rounded-full bg-[#dcefc7] px-6 py-3 text-sm font-semibold text-black hover:bg-[#cce8ae] sm:w-auto"
            >
              Create founder profile
            </button>
            <button
              type="button"
              onClick={() => navigate('/login?role=investor')}
              className="w-full rounded-full bg-[#42520d] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#34420a] sm:w-auto"
            >
              Create investor profile <ArrowUpRight className="ml-1 inline h-3.5 w-3.5 align-[-2px]" />
            </button>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-[92rem] gap-8 border-t border-black/10 px-5 py-14 sm:px-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-stretch">
        <div className="py-4 lg:py-8">
          <p className="mb-12 text-sm font-semibold text-[#42520d]">The Apparent thesis</p>
          <h2 className="text-5xl font-normal leading-none tracking-[-0.045em] md:text-7xl" style={serifDisplay}>
            Discovery should start with evidence.
          </h2>
          <p className="mt-8 max-w-2xl text-base leading-8 text-black/60">
            Warm intros are a weak database. Apparent makes the useful parts visible: what builders shipped, what investors want, where momentum is forming, and what should happen next.
          </p>
          <div className="mt-10 grid gap-5">
            {marketRows.map(([number, title, text]) => (
              <div key={number} className="grid gap-4 sm:grid-cols-[3rem_1fr]">
                <span className="text-sm font-semibold text-black/45">{number}</span>
                <p className="text-sm leading-6 text-black/65">
                  <span className="font-semibold text-black">{title}:</span> {text}
                </p>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => navigate('/about')}
            className="mt-10 rounded-full bg-[#dcefc7] px-6 py-3 text-sm font-semibold text-black transition-colors hover:bg-[#cce8ae]"
          >
            Why Apparent exists
          </button>
        </div>

        <div className="overflow-hidden rounded-[32px] bg-white/80 shadow-[0_18px_60px_rgba(0,0,0,0.06)]">
          <div className="flex flex-wrap gap-2 bg-[#fbfaf7]/92 px-5 py-4 backdrop-blur">
            {landingClusters.map((cluster) => (
              <button
                key={cluster.city}
                type="button"
                onClick={() => handleSelectLandingCity(cluster.city)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                  selectedLandingCity === cluster.city
                    ? 'bg-black text-white'
                    : 'bg-white/80 text-black/60 hover:bg-[#f4f1eb]'
                }`}
              >
                {cluster.city} {cluster.builderCount}
              </button>
            ))}
          </div>

          <BuilderRadarMap
            clusters={landingClusters}
            builders={landingStartupNodes}
            selectedCity={selectedLandingCity}
            selectedBuilderId={selectedLandingBuilder.id}
            role="investor"
            interestPin={null}
            radiusMiles={100}
            onSelectCity={handleSelectLandingCity}
            onSelectBuilder={handleSelectLandingBuilder}
            onViewportBuildersChange={setVisibleLandingBuilderIds}
            badgeLabel="Real startup examples"
            className="h-[460px] min-h-[460px] rounded-none"
          />

          <div className="grid bg-[#fbfaf7] lg:grid-cols-[1fr_18rem]">
            <div>
              <div className="flex items-center justify-between px-5 py-4">
                <p className="text-sm font-semibold">
                  {selectedLandingCity} startups
                </p>
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#42520d]">
                  {visibleLandingBuilderIds.length || landingStartupNodes.length} visible
                </span>
              </div>
              <div className="max-h-[250px] overflow-auto px-2 pb-2">
                {selectedLandingBuilders.map((builder) => (
                  <button
                    key={builder.id}
                    type="button"
                    onClick={() => handleSelectLandingBuilder(builder.id)}
                    className={`grid w-full gap-3 rounded-[20px] px-4 py-4 text-left transition-colors sm:grid-cols-[1fr_auto] ${
                      selectedLandingBuilder.id === builder.id ? 'bg-white' : 'hover:bg-white/70'
                    }`}
                  >
                    <span>
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{builder.company}</span>
                        <span className="rounded-full bg-[#dcefc7] px-2 py-0.5 text-xs font-semibold text-black">{builder.fitScore}%</span>
                      </span>
                      <span className="mt-2 block text-sm leading-6 text-black/55">{builder.buildSummary}</span>
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-[0.14em] text-black/45">
                      {builder.category}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <aside className="p-5">
              <div className="mb-5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#42520d]">
                <MapPin className="h-3.5 w-3.5 text-[#02A070]" />
                Selected
              </div>
              <h3 className="text-3xl font-normal leading-none tracking-[-0.04em]" style={serifDisplay}>
                {selectedLandingBuilder.company}
              </h3>
              <p className="mt-3 text-sm font-semibold">{selectedLandingBuilder.founderName}</p>
              <p className="mt-3 text-sm leading-6 text-black/55">{selectedLandingBuilder.traction}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {selectedLandingBuilder.matchReasons.slice(0, 3).map((reason) => (
                  <span key={reason} className="rounded-full bg-white/80 px-2.5 py-1 text-xs text-black/60">
                    {reason}
                  </span>
                ))}
              </div>
              <a
                href={selectedLandingBuilder.profileUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-6 inline-flex rounded-full bg-[#42520d] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#34420a]"
              >
                Open startup <ArrowUpRight className="ml-1.5 h-4 w-4" />
              </a>
            </aside>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[92rem] border-t border-black/10 px-5 py-16 sm:px-8">
        <div className="pt-2">
          <p className="mb-12 text-sm font-semibold text-[#42520d]">What gets connected</p>
          <h2 className="max-w-4xl text-5xl font-normal leading-none tracking-[-0.045em] md:text-7xl" style={serifDisplay}>
            The network is only useful when the context travels.
          </h2>
          <div className="mt-24 grid gap-10 md:grid-cols-4">
            {productSurfaces.map((surface) => (
              <article key={surface.title} className="pt-1">
                <surface.icon className="mb-8 h-5 w-5 text-black" />
                <h3 className="text-xl font-normal tracking-[-0.025em]" style={serifDisplay}>
                  {surface.title}
                </h3>
                <p className="mt-5 text-sm leading-6 text-black/55">{surface.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="signals" className="mx-auto max-w-[92rem] border-t border-black/10 px-5 py-16 sm:px-8">
        <div className="grid overflow-hidden rounded-[32px] bg-white/80 shadow-[0_18px_60px_rgba(0,0,0,0.06)] lg:grid-cols-[0.82fr_1.18fr]">
          <div className="p-6 sm:p-8">
            <Target className="mb-10 h-6 w-6 text-[#02A070]" />
            <h2 className="max-w-xl text-5xl font-normal leading-none tracking-[-0.045em] md:text-7xl" style={serifDisplay}>
              Signals become sourceable.
            </h2>
            <p className="mt-6 max-w-lg text-base leading-7 text-black/60">
              Investors see ranked proof. Founders see who matches their build. Everyone gets direct paths into profiles, DMs, meetups, and next steps.
            </p>
            <div className="mt-10 grid gap-5">
              {proofSignals.map(([label, value]) => (
                <div key={label} className="grid gap-2 sm:grid-cols-[8rem_1fr]">
                  <p className="text-sm font-semibold">{label}</p>
                  <p className="text-sm leading-6 text-black/55">{value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#fbfaf7]">
            <div className="flex items-center justify-between px-6 py-5 sm:px-8">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Search className="h-4 w-4 text-[#02A070]" />
                Ranked signal inbox
              </div>
              <span className="rounded-full bg-[#dcefc7] px-3 py-1 text-xs font-semibold text-black">Avg fit 90%</span>
            </div>
            {signalRows.map((row) => (
              <div key={row.company} className="grid gap-4 px-6 py-6 sm:grid-cols-[1fr_auto] sm:items-center sm:px-8">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xl font-semibold">{row.company}</h3>
                    <span className="text-sm text-black/45">by {row.founder}</span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-black/60">{row.detail}</p>
                  <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#42520d]">{row.source}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-[#dcefc7] px-3 py-1.5 text-sm font-semibold text-black">{row.fit}</span>
                  <button type="button" className="rounded-full bg-white/80 px-3 py-1.5 text-sm font-semibold hover:bg-white">
                    Open
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-[92rem] gap-8 border-t border-black/10 px-5 py-16 sm:px-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
        <div className="overflow-hidden rounded-[32px] bg-white/80 shadow-[0_18px_60px_rgba(0,0,0,0.06)] lg:rounded-r-none">
          <div className="flex items-start justify-between gap-4 px-6 py-6 sm:px-8">
            <div>
              <p className="text-sm font-semibold">Deal-flow board</p>
              <p className="mt-1 text-sm text-black/45">Saved builders move with their source, proof, and outreach context attached.</p>
            </div>
            <Route className="mt-1 h-5 w-5 shrink-0 text-[#42520d]" />
          </div>

          <div className="grid gap-3 px-6 pb-3 sm:grid-cols-3 sm:px-8">
            {dealFlowPreview.map((column) => (
              <div key={column.stage} className="rounded-[22px] bg-[#fbfaf7] px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-black/45">{column.stage}</p>
                <p className="mt-2 text-4xl font-normal leading-none tracking-[-0.045em]" style={serifDisplay}>
                  {column.count}
                </p>
              </div>
            ))}
          </div>

          <div className="grid gap-4 p-4 lg:grid-cols-3">
            {dealFlowPreview.map((column) => (
              <div key={column.stage} className="rounded-[26px] bg-[#fbfaf7] p-4">
                <div className="mb-4 flex items-center justify-between px-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#42520d]">{column.stage}</span>
                  <span className="rounded-full bg-[#dcefc7] px-2.5 py-1 text-xs font-semibold text-black">{column.count}</span>
                </div>
                <div className="space-y-3">
                  {column.items.map(([company, fit, note], index) => (
                    <div
                      key={company}
                      className={`bg-white/75 p-4 transition-colors hover:bg-white ${
                        index === 0 ? 'rounded-[20px]' : 'rounded-[16px]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="font-semibold tracking-[-0.02em]">{company}</h3>
                        <span className="rounded-full bg-[#dcefc7] px-2 py-0.5 text-xs font-semibold text-black">{fit}</span>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-black/55">{note}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="grid bg-[#fbfaf7] text-xs font-semibold uppercase tracking-[0.16em] text-[#42520d] sm:grid-cols-[1fr_auto]">
            <div className="px-6 py-4 sm:px-8">Source signal to first meeting</div>
            <div className="px-6 py-4 sm:px-8">Context follows the card</div>
          </div>
        </div>

        <div className="bg-[#fbfaf7] px-0 py-10 lg:px-14 lg:py-16">
          <blockquote className="max-w-3xl text-4xl font-normal leading-tight tracking-[-0.04em] md:text-5xl" style={serifDisplay}>
            The best early companies are visible before they are famous. Apparent is designed for that exact window.
          </blockquote>
          <div className="mt-12 grid gap-6">
            {[
              ['For founders', 'Your shipped work becomes the discovery surface.'],
              ['For investors', 'Your thesis becomes a repeatable sourcing system.'],
              ['For the network', 'Place, proof, message, meetup, and terms stay connected.'],
            ].map(([title, text]) => (
              <div key={title}>
                <h3 className="text-base font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-black/55">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how-to" className="mx-auto max-w-[92rem] border-t border-black/10 px-5 py-16 sm:px-8">
        <div className="py-2">
          <div className="mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <h2 className="max-w-4xl text-5xl font-normal leading-none tracking-[-0.045em] md:text-8xl" style={serifDisplay}>
              A network that starts with proof.
            </h2>
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="inline-flex w-fit items-center gap-3 rounded-full bg-black px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#42520d]"
            >
              Enter Apparent <MoveRight className="h-4 w-4" />
            </button>
          </div>
          <div className="grid gap-10 lg:grid-cols-3">
            {workflowItems.map((item, index) => (
              <div key={item.title} className="py-3 lg:px-7 lg:first:pl-0">
                <p className="mb-8 text-sm font-semibold text-black/45">0{index + 1}</p>
                <h3 className="text-xl font-semibold">{item.title}</h3>
                <p className="mt-3 max-w-sm text-sm leading-6 text-black/60">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[92rem] border-t border-black/10 px-5 py-20 sm:px-8">
        <div className="py-10 text-center">
          <Bell className="mx-auto mb-10 h-6 w-6 text-[#02A070]" />
          <h2 className="mx-auto max-w-4xl text-5xl font-normal leading-none tracking-[-0.045em] md:text-7xl" style={serifDisplay}>
            Join before the obvious round.
          </h2>
          <p className="mx-auto mt-8 max-w-2xl text-base leading-8 text-black/55">
            Create the profile, declare the thesis, and let Apparent turn builder proof into discovery.
          </p>
          <div className="mx-auto mt-10 flex max-w-3xl flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => navigate('/login?role=founder')}
              className="flex-1 rounded-full bg-[#dcefc7] px-6 py-3 text-sm font-semibold text-black hover:bg-[#cce8ae]"
            >
              Create founder profile
            </button>
            <button
              type="button"
              onClick={() => navigate('/login?role=investor')}
              className="flex-1 rounded-full bg-[#42520d] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#34420a]"
            >
              Create investor profile <ArrowUpRight className="ml-1 inline h-3.5 w-3.5 align-[-2px]" />
            </button>
          </div>
        </div>
      </section>
    </main>
  );
};
