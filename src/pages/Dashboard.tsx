import {
  ArrowUpRight,
  Bell,
  Bookmark,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  FileText,
  Flame,
  Image,
  LocateFixed,
  ListFilter,
  MessageCircle,
  MessageSquare,
  MapPin,
  Paperclip,
  Phone,
  Plus,
  Repeat2,
  Rocket,
  Search,
  Smile,
  SquarePen,
  Star,
  Target,
  Users,
  Video,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ActionSearchBar, type Action } from '@/components/ui/action-search-bar';
import { BuilderRadarMap } from '@/components/BuilderRadarMap';
import { SessionNavBar } from '@/components/ui/sidebar';
import { Switch } from '@/components/ui/switch';
import { HeatMap } from '@/pages/HeatMap';
import { GitHubIcon } from '@/components/GitHubIcon';
import { LogoIcon } from '@/components/LogoIcon';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import type {
  AppUser,
  BuilderDiscoveryState,
  BuilderMapCluster,
  BuilderNode,
  FeedItem,
  Meetup,
  NetworkInterestPin,
  NetworkMapFilters,
  ProductLaunch,
  TermReview,
  UserMessage,
  UserSettings,
} from '@/lib/apparent-types';
import {
  buildBuilderMapClusters,
  loadDashboardData,
  saveBuilderDiscoveryState,
  saveFeedAction,
  saveInvestorMatchBookmark,
  saveIntakeValues,
  saveLaunchComment,
  saveMeetup,
  saveMessage,
  saveOutreachDraft,
  saveProductLaunch,
  saveSettings,
  saveSignalStage,
  saveTermReview,
  subscribeBuilderNetwork,
  toggleLaunchUpvote,
  toggleMeetupRsvp,
} from '@/lib/dashboard-service';
import { cityGeoCoordinates } from '@/lib/app-defaults';

type DashboardRole = 'founder' | 'investor';
type ActionMode = 'profile' | 'launch' | 'thesis' | 'meetup';
type FieldKind = 'input' | 'textarea' | 'select';
type ViewMode = 'overview' | 'profile' | 'products' | 'matches' | 'messages' | 'deals' | 'terms' | 'knowledge' | 'feedback' | 'for-you' | 'vc-heatmap';
type InvestorDealStage = 'New' | 'Reviewing' | 'Reached Out' | 'Meeting' | 'Watchlist';

interface DashboardProps {
  role: DashboardRole;
  user: AppUser;
}

interface MatchItem {
  name: string;
  detail: string;
  score: string;
  signal: string;
  location: string;
  nextStep: string;
  thesis?: string;
  checkSize?: string;
  stageFocus?: string;
  sectors?: string[];
  why?: string[];
  portfolio?: string[];
  warmPath?: string;
  responseWindow?: string;
}

interface IntakeField {
  key: string;
  label: string;
  placeholder: string;
  kind: FieldKind;
  options?: string[];
}

interface InvestorSignal {
  id?: string;
  company: string;
  founder: string;
  detail: string;
  source: string;
  sourceUrl: string;
  profileUrl: string;
  relevance: number;
  freshness: string;
  stage: string;
  location: string;
  column: InvestorDealStage;
  outreach: string;
  sourceType?: string;
  freshnessAt?: string;
  githubUrl?: string;
  rawTags?: string[];
}

interface PlaceSuggestion extends NetworkInterestPin {
  id: string;
  detail: string;
  source: 'Apparent' | 'OpenStreetMap';
  matchScore: number;
}

interface DashboardLaunchRow {
  id: string;
  name: string;
  founder: string;
  tagline: string;
  description: string;
  category: string;
  location: string;
  stage: string;
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
  projectPath?: string;
  founderProfilePath?: string;
  proof: string[];
  investors: string[];
}

type WeightedKnownPlaceSuggestion = PlaceSuggestion & { source: 'Apparent'; networkWeight: number };
type MessageStatusFilter = 'all' | UserMessage['status'];
type FeedbackType = 'Bug report' | 'Feature request' | 'Workflow confusion' | 'General feedback';

interface MessageThread {
  id: string;
  recipient: string;
  latest: UserMessage;
  messages: UserMessage[];
}

const investorStageOptions = ['Pre-seed', 'Seed', 'Series A', 'Series B', 'Series C+', 'Growth'];
const founderStageOptions = ['Idea', 'Prototype', 'MVP', 'Launched', 'Revenue', 'Scaling'];
const networkStageOptions = [
  'Idea',
  'Prototype',
  'MVP',
  'Launched',
  'Revenue',
  'Scaling',
  'Bootstrapped',
  ...investorStageOptions,
];

const investorIntakeFields: IntakeField[] = [
  { key: 'thesis', label: 'Investment thesis', placeholder: 'Developer infrastructure tools with clear usage pull from technical teams.', kind: 'textarea' },
  { key: 'sectors', label: 'Sectors', placeholder: 'AI infra, devtools, workflow automation', kind: 'input' },
  { key: 'stage', label: 'Preferred stage', placeholder: 'Select stage', kind: 'select', options: investorStageOptions },
  { key: 'checkSize', label: 'Typical check size', placeholder: '$250k - $1.5M', kind: 'input' },
  { key: 'geography', label: 'Geography', placeholder: 'SF, NYC, remote-first teams', kind: 'input' },
  { key: 'founderSignals', label: 'Founder signals you care about', placeholder: 'Shipping velocity, technical depth, sharp taste, customer obsession.', kind: 'textarea' },
  { key: 'passSignals', label: 'Fast pass signals', placeholder: 'No clear user pull, weak technical founder-market fit, unclear wedge.', kind: 'textarea' },
  { key: 'portfolioExamples', label: 'Companies that match your taste', placeholder: 'Linear, Supabase, Vercel, Cursor', kind: 'input' },
];

const founderIntakeFields: IntakeField[] = [
  { key: 'profileName', label: 'Name', placeholder: 'Your name', kind: 'input' },
  { key: 'headline', label: 'Headline', placeholder: 'Founder building AI tools for engineering teams.', kind: 'input' },
  { key: 'bio', label: 'Bio', placeholder: 'A short founder bio: what you care about, where you have built, and what kind of people you want to meet.', kind: 'textarea' },
  { key: 'currentBuild', label: 'What are you building or exploring?', placeholder: 'A GitHub-native analytics layer for engineering leaders.', kind: 'textarea' },
  { key: 'category', label: 'Primary interests', placeholder: 'Devtools, AI infra, SaaS, marketplace', kind: 'input' },
  { key: 'stage', label: 'Current stage', placeholder: 'Select stage', kind: 'select', options: founderStageOptions },
  { key: 'lookingFor', label: 'Who do you want to meet?', placeholder: 'Founders, investors, operators, design partners, collaborators.', kind: 'textarea' },
  { key: 'location', label: 'Location', placeholder: 'Brooklyn / remote', kind: 'input' },
  { key: 'website', label: 'Website', placeholder: 'https://yourname.com', kind: 'input' },
  { key: 'github', label: 'GitHub', placeholder: 'https://github.com/...', kind: 'input' },
  { key: 'linkedin', label: 'LinkedIn', placeholder: 'https://linkedin.com/in/...', kind: 'input' },
  { key: 'xProfile', label: 'X / Twitter', placeholder: 'https://x.com/...', kind: 'input' },
  { key: 'press', label: 'Other profile link', placeholder: 'Portfolio, writing, press, or personal page', kind: 'input' },
  { key: 'pastProducts', label: 'Past products', placeholder: 'List past products or projects, one per line.', kind: 'textarea' },
];

const dashboardLaunchFilters = ['Today', 'Trending', 'AI', 'Devtools', 'Fintech', 'Data', 'Infra', 'Productivity', 'Audio', 'Security', 'Open Source', 'Climate', 'Health', 'Nearby'];
const founderSignalOptions = [
  'Women-led',
  'LGBTQ+ founder(s)',
  'Black founder(s)',
  'Latino/a founder(s)',
  'Immigrant founder(s)',
  'First-time founder',
  'Solo founder',
  'Technical founder',
  'University spinout',
  'Veteran founder',
];
const investorFounderSignalFilters = ['Women-led', 'LGBTQ+ founder(s)', 'Underrepresented founders', 'Immigrant founder(s)', 'First-time founder', 'Solo founder', 'Technical founder'];
const underrepresentedFounderSignals = ['Women-led', 'LGBTQ+ founder(s)', 'Black founder(s)', 'Latino/a founder(s)', 'Immigrant founder(s)', 'Veteran founder'];

const seedDashboardLaunches: DashboardLaunchRow[] = [
  {
    id: 'cursor',
    name: 'Cursor',
    founder: 'Michael Truell',
    tagline: 'AI-native coding workspace for software teams.',
    description: 'Cursor turns codebases, prompts, and engineering workflows into one daily AI development surface for builders and teams.',
    category: 'AI devtools',
    location: 'San Francisco',
    stage: 'Growth',
    fit: 96,
    saves: 428,
    comments: 38,
    momentum: 'Developer workflow pull',
    website: 'https://www.cursor.com/',
    proof: ['Fast adoption among engineers', 'High-frequency workflow', 'Clear technical wedge'],
    investors: ['AI infra', 'Developer tools', 'Product-led growth'],
  },
  {
    id: 'perplexity',
    name: 'Perplexity',
    founder: 'Aravind Srinivas',
    tagline: 'Answer engine for search, research, and knowledge work.',
    description: 'Perplexity makes research feel conversational while keeping citations, context, and follow-up exploration close to the answer.',
    category: 'AI search',
    location: 'San Francisco',
    stage: 'Growth',
    fit: 91,
    saves: 391,
    comments: 44,
    momentum: 'Consumer research habit',
    website: 'https://www.perplexity.ai/',
    proof: ['Consumer frequency', 'Research workflow wedge', 'Strong brand pull'],
    investors: ['Consumer AI', 'Search', 'Knowledge workflows'],
  },
  {
    id: 'mistral',
    name: 'Mistral AI',
    founder: 'Arthur Mensch',
    tagline: 'Frontier AI lab building open and commercial models.',
    description: 'Mistral is building model infrastructure from Europe with an open-weight strategy and commercial deployment path.',
    category: 'AI models',
    location: 'Paris',
    stage: 'Growth',
    fit: 88,
    saves: 312,
    comments: 29,
    momentum: 'European AI infrastructure',
    website: 'https://mistral.ai/',
    proof: ['Open-weight strategy', 'Model ecosystem', 'Infrastructure demand'],
    investors: ['AI models', 'Infrastructure', 'Europe'],
  },
  {
    id: 'harvey',
    name: 'Harvey',
    founder: 'Winston Weinberg',
    tagline: 'AI workflows for legal and professional services.',
    description: 'Harvey brings AI into high-context legal work where accuracy, privacy, and institutional knowledge matter.',
    category: 'AI legal',
    location: 'San Francisco',
    stage: 'Growth',
    fit: 87,
    saves: 286,
    comments: 21,
    momentum: 'Enterprise legal adoption',
    website: 'https://www.harvey.ai/',
    proof: ['Vertical AI wedge', 'Enterprise pull', 'High-value workflow'],
    investors: ['Vertical AI', 'Enterprise', 'Legal tech'],
  },
  {
    id: 'ramp',
    name: 'Ramp',
    founder: 'Eric Glyman',
    tagline: 'Finance automation for cards, spend, procurement, and accounting.',
    description: 'Ramp gives finance teams one operating surface for spend control, automation, procurement, payments, and accounting context.',
    category: 'Fintech',
    location: 'New York',
    stage: 'Growth',
    fit: 84,
    saves: 241,
    comments: 17,
    momentum: 'Finance ops expansion',
    website: 'https://ramp.com/',
    proof: ['Large operational surface', 'Clear buyer pain', 'Workflow automation'],
    investors: ['Fintech', 'B2B SaaS', 'Finance ops'],
  },
  {
    id: 'lovable',
    name: 'Lovable',
    founder: 'Anton Osika',
    tagline: 'AI app builder for turning prompts into shipped products.',
    description: 'Lovable helps builders create, revise, and ship full-stack app prototypes from natural language prompts.',
    category: 'AI app builder',
    location: 'Stockholm',
    stage: 'Seed',
    fit: 82,
    saves: 219,
    comments: 25,
    momentum: 'Prototype velocity',
    website: 'https://lovable.dev/',
    proof: ['Builder workflow', 'Fast product loops', 'Community pull'],
    investors: ['AI apps', 'Prosumer', 'Developer workflows'],
  },
  {
    id: 'neon',
    name: 'Neon',
    founder: 'Nikita Shamgunov',
    tagline: 'Serverless Postgres for modern product teams.',
    description: 'Neon separates storage and compute so teams can branch databases, scale workloads, and ship Postgres-backed products faster.',
    category: 'Data infra',
    location: 'San Francisco',
    stage: 'Growth',
    fit: 81,
    saves: 203,
    comments: 18,
    momentum: 'Database branching pull',
    website: 'https://neon.tech/',
    proof: ['Serverless Postgres adoption', 'Developer workflow fit', 'Clear infra wedge'],
    investors: ['Data', 'Infrastructure', 'Developer tools'],
  },
  {
    id: 'modal',
    name: 'Modal',
    founder: 'Erik Bernhardsson',
    tagline: 'Cloud compute for AI, data, and batch workloads.',
    description: 'Modal gives teams a fast way to run Python jobs, GPUs, scheduled tasks, and inference workloads without managing infrastructure.',
    category: 'AI infra',
    location: 'New York',
    stage: 'Seed',
    fit: 80,
    saves: 197,
    comments: 16,
    momentum: 'GPU workflow demand',
    website: 'https://modal.com/',
    proof: ['AI workload pull', 'Developer-first platform', 'Usage-driven infrastructure'],
    investors: ['AI infra', 'Cloud', 'Developer tools'],
  },
  {
    id: 'linear',
    name: 'Linear',
    founder: 'Karri Saarinen',
    tagline: 'Issue tracking and product planning for high-velocity teams.',
    description: 'Linear turns product planning, engineering execution, and team rituals into one fast operating surface.',
    category: 'Productivity',
    location: 'San Francisco',
    stage: 'Growth',
    fit: 78,
    saves: 184,
    comments: 22,
    momentum: 'Product team operating system',
    website: 'https://linear.app/',
    proof: ['High-frequency workflow', 'Strong product taste', 'Team expansion signal'],
    investors: ['Productivity', 'SaaS', 'Workflow'],
  },
  {
    id: 'elevenlabs',
    name: 'ElevenLabs',
    founder: 'Mati Staniszewski',
    tagline: 'AI audio generation for voices, agents, and media workflows.',
    description: 'ElevenLabs gives creators and teams voice generation, dubbing, and audio AI tools for production-grade workflows.',
    category: 'AI audio',
    location: 'London',
    stage: 'Growth',
    fit: 77,
    saves: 176,
    comments: 20,
    momentum: 'Audio AI adoption',
    website: 'https://elevenlabs.io/',
    proof: ['Creator workflow pull', 'Enterprise media usage', 'Clear AI application layer'],
    investors: ['AI audio', 'Creator tools', 'Media'],
  },
];

const founderMatches: MatchItem[] = [
  {
    name: 'Northstar Ventures',
    detail: 'AI infra, developer tools, seed',
    score: '94%',
    signal: 'Thesis fit',
    location: 'San Francisco',
    nextStep: 'Send founder profile',
    thesis: 'Backs technical founders turning developer pain into durable workflow infrastructure.',
    checkSize: '$250k - $1.5M',
    stageFocus: 'Pre-seed to Seed',
    sectors: ['AI infra', 'Devtools', 'Open-source'],
    why: ['Your category maps to their devtools thesis', 'Public proof links shorten diligence', 'Seed-stage capital request fits their entry point'],
    portfolio: ['Buildbase', 'Vectorlane', 'Traceflow'],
    warmPath: 'Founder profile first, then short technical call',
    responseWindow: 'Reviewing 6 new builders this week',
  },
  {
    name: 'Signal Ridge',
    detail: 'Technical founders, product-led SaaS',
    score: '89%',
    signal: 'Warm signal',
    location: 'New York',
    nextStep: 'Request intro window',
    thesis: 'Looks for founder-led SaaS with narrow wedges, visible user pull, and strong product taste.',
    checkSize: '$100k - $750k',
    stageFocus: 'MVP to Seed',
    sectors: ['Product-led SaaS', 'Workflow automation', 'Vertical tools'],
    why: ['Your traction notes suggest early pull', 'Founder-led product motion fits their taste', 'Your location/proximity creates an easy meetup path'],
    portfolio: ['MosaicOps', 'Runway Desk', 'PilotLayer'],
    warmPath: 'Ask for launch review or office-hours slot',
    responseWindow: 'Office hours open next Friday',
  },
  {
    name: 'Convex Capital',
    detail: 'Vertical software and automation',
    score: '86%',
    signal: 'Nearby',
    location: 'Austin',
    nextStep: 'Invite to launch review',
    thesis: 'Invests in vertical software where automation creates obvious operational leverage.',
    checkSize: '$150k - $1M',
    stageFocus: 'Prototype to Seed',
    sectors: ['Vertical software', 'Automation', 'AI SaaS'],
    why: ['Your build notes mention workflow automation', 'They like precise ICPs and customer proof', 'Nearby builder density increases their attention'],
    portfolio: ['FieldPilot', 'OpsForge', 'ClauseKit'],
    warmPath: 'Share one customer story and product demo',
    responseWindow: 'Actively sourcing Austin and remote teams',
  },
];

const investorSignals: InvestorSignal[] = [
  {
    company: 'KernelTrace',
    founder: 'Maya Chen',
    detail: 'GitHub-native analytics for engineering leaders. New repository activity, two design partners, and repeat weekly usage.',
    source: 'GitHub + launch post',
    sourceUrl: '#github-kerneltrace',
    profileUrl: '#profile-maya-chen',
    relevance: 96,
    freshness: '18 min ago',
    stage: 'Seed',
    location: 'Brooklyn',
    column: 'New',
    outreach: 'Maya, saw KernelTrace showing repeat usage from eng leads. Your GitHub proof lines up with our devtools thesis. Open to a quick chat this week?',
  },
  {
    company: 'AgentDock',
    founder: 'Arjun Patel',
    detail: 'Open-source agent deployment control plane with launch traction from infra-heavy teams and strong technical documentation.',
    source: 'Product launch + docs',
    sourceUrl: '#launch-agentdock',
    profileUrl: '#profile-arjun-patel',
    relevance: 91,
    freshness: '41 min ago',
    stage: 'Pre-seed',
    location: 'San Francisco',
    column: 'Reviewing',
    outreach: 'Arjun, AgentDock hits a few things we look for: hard technical wedge, public proof, and infra buyer pull. Worth comparing notes?',
  },
  {
    company: 'HelpLoop AI',
    founder: 'Nora Ellis',
    detail: 'AI support automation with a public customer case study and visible hiring signal around implementation engineering.',
    source: 'Customer story',
    sourceUrl: '#story-helploop',
    profileUrl: '#profile-nora-ellis',
    relevance: 88,
    freshness: '2h ago',
    stage: 'Seed',
    location: 'Seattle',
    column: 'Reached Out',
    outreach: 'Nora, the customer proof around HelpLoop stood out. We spend a lot of time on applied AI workflows and would like to learn more.',
  },
  {
    company: 'SchemaPilot',
    founder: 'Elena Morris',
    detail: 'Database migration assistant showing fresh Hacker News attention, CLI usage, and a sharp wedge for platform teams.',
    source: 'HN + package installs',
    sourceUrl: '#hn-schemapilot',
    profileUrl: '#profile-elena-morris',
    relevance: 84,
    freshness: 'Today',
    stage: 'Pre-seed',
    location: 'Remote',
    column: 'Meeting',
    outreach: 'Elena, SchemaPilot is exactly the kind of boring-but-urgent infra workflow we like. Would be useful to hear what teams are pulling hardest.',
  },
  {
    company: 'Briefwise',
    founder: 'Samir Rao',
    detail: 'Workflow automation for legal ops with a fast-moving founder, early pilots, and narrow ICP clarity.',
    source: 'Founder profile',
    sourceUrl: '#profile-briefwise-source',
    profileUrl: '#profile-samir-rao',
    relevance: 79,
    freshness: 'Yesterday',
    stage: 'Seed',
    location: 'Austin',
    column: 'Watchlist',
    outreach: 'Samir, Briefwise has a focused wedge and the pilot motion is interesting. We are tracking legal ops workflows and would like to stay close.',
  },
];

const investorDigestItems = [
  '5 new builder signals ranked above 75% relevance',
  '2 fresh devtools launches with GitHub proof',
  '1 founder moved from source inbox to meeting',
  'Slack alert ready for SF infra founders this week',
];

const investorDealStages: InvestorDealStage[] = ['New', 'Reviewing', 'Reached Out', 'Meeting', 'Watchlist'];

const buildInitialIntake = (fields: IntakeField[]) =>
  fields.reduce<Record<string, string>>((values, field) => {
    values[field.key] = '';
    return values;
  }, {});

const scrollToSection = (id: string) => {
  const target = document.getElementById(id);
  target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

const viewFromHash = (hash: string): ViewMode => {
  if (hash === '#profile') {
    return 'profile';
  }

  if (hash === '#products' || hash === '#launches') {
    return 'products';
  }

  if (hash === '#matches') {
    return 'matches';
  }

  if (hash === '#messages') {
    return 'messages';
  }

  if (hash === '#deals') {
    return 'deals';
  }

  if (hash === '#terms') {
    return 'terms';
  }

  if (hash === '#knowledge') {
    return 'knowledge';
  }

  if (hash === '#feedback') {
    return 'feedback';
  }

  if (hash === '#for-you') {
    return 'for-you';
  }

  return 'overview';
};

const viewFromLocation = (pathname: string, hash: string): ViewMode => {
  if (pathname.endsWith('/vc-heatmap')) {
    return 'vc-heatmap';
  }

  if (pathname.endsWith('/products')) {
    return 'products';
  }

  return viewFromHash(hash);
};

const viewFromSectionId = (id: string): ViewMode => {
  if (id === 'profile') {
    return 'profile';
  }

  if (id === 'products' || id === 'launches') {
    return 'products';
  }

  if (id === 'matches') {
    return 'matches';
  }

  if (id === 'messages') {
    return 'messages';
  }

  if (id === 'deals') {
    return 'deals';
  }

  if (id === 'terms') {
    return 'terms';
  }

  if (id === 'knowledge') {
    return 'knowledge';
  }

  if (id === 'feedback') {
    return 'feedback';
  }

  if (id === 'for-you') {
    return 'for-you';
  }

  if (id === 'vc-heatmap') {
    return 'vc-heatmap';
  }

  return 'overview';
};

const sectionIdFromView = (view: ViewMode) => {
  if (view === 'vc-heatmap') {
    return 'vc-heatmap';
  }

  if (view === 'for-you') {
    return 'for-you';
  }

  if (view === 'profile') {
    return 'profile';
  }

  if (view === 'products') {
    return 'products';
  }

  if (view === 'matches') {
    return 'matches';
  }

  if (view === 'messages') {
    return 'messages';
  }

  if (view === 'deals') {
    return 'deals';
  }

  if (view === 'terms') {
    return 'terms';
  }

  if (view === 'knowledge') {
    return 'knowledge';
  }

  if (view === 'feedback') {
    return 'feedback';
  }

  return 'overview';
};

const toDatetimeLocalValue = (value: string) => {
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

const defaultStartsAt = () => toDatetimeLocalValue(new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString());

const emptyLaunchDraft = () => ({
  name: '',
  tagline: '',
  intro: '',
  category: '',
  stage: 'Launched',
  location: '',
  launchUrl: '',
  proofUrl: '',
  logoUrl: '',
  bannerUrl: '',
  demoVideoUrl: '',
  pitchVideoUrl: '',
  pitchDeckUrl: '',
  pitchBookNote: '',
  pitchVisibility: 'public' as 'public' | 'investors',
  founderSignals: [] as string[],
  teamSummary: '',
  teamMembersText: '',
  customerSummary: '',
  techStack: '',
  fundingStatus: '',
  lookingFor: '',
  metrics: '',
});

const emptyMeetupDraft = () => ({
  title: '',
  audience: '',
  city: '',
  venue: '',
  startsAt: defaultStartsAt(),
  capacity: 25,
  description: '',
});

const emptyTermDraft = () => ({
  company: '',
  instrument: 'SAFE',
  amount: '',
  valuation: '',
  proRata: '',
  notes: '',
  status: 'Reviewing',
});

const emptyMessageDraft = () => ({
  recipient: '',
  subject: '',
  body: '',
  status: 'draft' as const,
  context: '',
});

const emptyFeedbackDraft = () => ({
  type: 'Feature request' as FeedbackType,
  subject: '',
  body: '',
});

const defaultNetworkFilters = (): NetworkMapFilters => ({
  city: '',
  category: '',
  stage: '',
  freshness: 'any',
  matchOnly: false,
  radiusMiles: 50,
  pin: null,
});

const toRadians = (value: number) => (value * Math.PI) / 180;

const distanceMiles = (
  start: Pick<NetworkInterestPin, 'latitude' | 'longitude'>,
  end: Pick<NetworkInterestPin, 'latitude' | 'longitude'>,
) => {
  const earthRadiusMiles = 3958.8;
  const deltaLatitude = toRadians(end.latitude - start.latitude);
  const deltaLongitude = toRadians(end.longitude - start.longitude);
  const startLatitude = toRadians(start.latitude);
  const endLatitude = toRadians(end.latitude);
  const haversine =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(startLatitude) * Math.cos(endLatitude) * Math.sin(deltaLongitude / 2) ** 2;

  return 2 * earthRadiusMiles * Math.asin(Math.sqrt(haversine));
};

const dashboardLaunchDomain = (url: string) => {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return 'apparent.dev';
  }
};

const productLaunchToDashboardRow = (
  launch: ProductLaunch,
  index: number,
  ownerLabel = 'Founder on Apparent',
): DashboardLaunchRow => ({
  id: `workspace-${launch.id}`,
  name: launch.name,
  founder: ownerLabel,
  tagline: launch.tagline || 'New product launched into Apparent.',
  description: launch.intro || launch.metrics || launch.tagline || 'This founder has launched a new product for investor and builder discovery.',
  category: launch.category || 'Builder product',
  location: launch.location || 'Apparent',
  stage: launch.stage || 'Launched',
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
  founderSignals: launch.founderSignals ?? [],
  proof: [launch.metrics, launch.proofUrl ? 'Proof link attached' : '', launch.pitchDeckUrl ? 'Pitch deck attached' : '', launch.stage].filter(
    (item): item is string => Boolean(item),
  ),
  investors: [launch.category || 'Builder proof', launch.stage || 'Fresh launch', 'Founder profile'],
});

const matchKnownPlace = (query: string): NetworkInterestPin | null => {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return null;

  const match = Object.entries(cityGeoCoordinates).find(([city]) => {
    const normalizedCity = city.toLowerCase();
    return normalizedCity === normalizedQuery || normalizedCity.includes(normalizedQuery) || normalizedQuery.includes(normalizedCity);
  });

  if (!match) return null;

  const [label, coordinates] = match;
  return {
    label,
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
  };
};

const formatCount = (count: number, singular: string, plural: string) => (count === 1 ? `1 ${singular}` : `${count} ${plural}`);

const getInitials = (value: string) => {
  const initials = value
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return initials || 'AP';
};

const formatMessageTime = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'now';
  }

  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

const normalizePlaceText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const getPlaceMatchScore = (label: string, query: string) => {
  const normalizedLabel = normalizePlaceText(label);
  const normalizedQuery = normalizePlaceText(query);
  if (!normalizedQuery) return -1;

  const labelTokens = normalizedLabel.split(/[\s,.-]+/).filter(Boolean);
  if (normalizedLabel === normalizedQuery) return 120;
  if (normalizedLabel.startsWith(normalizedQuery)) return 100;
  if (labelTokens.some((token) => token.startsWith(normalizedQuery))) return 85;
  if (normalizedQuery.length >= 3 && normalizedLabel.includes(normalizedQuery)) return 55;

  return -1;
};

const allowedRemotePlaceTypes = new Set([
  'city',
  'town',
  'village',
  'hamlet',
  'suburb',
  'neighbourhood',
  'quarter',
  'city_district',
  'municipality',
  'borough',
  'locality',
  'county',
  'state',
  'region',
  'place',
]);

const placeTypeLabel = (value?: string) => {
  if (!value) return 'Place';
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

const buildKnownPlaceSuggestions = (
  query: string,
  builders: BuilderNode[],
  meetups: Meetup[],
): PlaceSuggestion[] => {
  const queryValue = query.trim();
  if (!queryValue) return [];

  return Object.entries(cityGeoCoordinates)
    .map(([label, coordinates]): WeightedKnownPlaceSuggestion | null => {
      const matchScore = getPlaceMatchScore(label, queryValue);
      if (matchScore < 0) return null;

      const builderCount = builders.filter((builder) => builder.location === label).length;
      const meetupCount = meetups.filter((meetup) => meetup.city === label).length;
      const detailParts = [
        builderCount ? formatCount(builderCount, 'builder', 'builders') : '',
        meetupCount ? formatCount(meetupCount, 'meetup', 'meetups') : '',
      ].filter(Boolean);

      return {
        id: `known-${label}`,
        label,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        detail: detailParts.join(' · ') || 'Known place',
        source: 'Apparent' as const,
        matchScore,
        networkWeight: builderCount * 2 + meetupCount,
      };
    })
    .filter((suggestion): suggestion is WeightedKnownPlaceSuggestion => Boolean(suggestion))
    .sort((a, b) => {
      return b.matchScore - a.matchScore || b.networkWeight - a.networkWeight || a.label.localeCompare(b.label);
    })
    .slice(0, 5)
    .map(({ networkWeight: _networkWeight, ...suggestion }) => suggestion);
};

export const Dashboard = ({ role, user }: DashboardProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const isInvestor = role === 'investor';
  const dashboardBasePath = isInvestor ? '/dashboard/investor' : '/dashboard/founder';
  const intakeFields = useMemo(() => (isInvestor ? investorIntakeFields : founderIntakeFields), [isInvestor]);
  const [activeView, setActiveView] = useState<ViewMode>(() =>
    viewFromLocation(window.location.pathname, window.location.hash),
  );
  const [query, setQuery] = useState('');
  const [intakeValues, setIntakeValues] = useState(() => buildInitialIntake(intakeFields));
  const [profileSaved, setProfileSaved] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<MatchItem | null>(null);
  const [savedInvestorMatchNames, setSavedInvestorMatchNames] = useState<string[]>([]);
  const [actionMode, setActionMode] = useState<ActionMode | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [signalRows, setSignalRows] = useState(investorSignals);
  const [slackAlertsEnabled, setSlackAlertsEnabled] = useState(true);
  const [dailyDigestEnabled, setDailyDigestEnabled] = useState(true);
  const [draggedSignalCompany, setDraggedSignalCompany] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<InvestorDealStage | null>(null);
  const [pointerDrag, setPointerDrag] = useState<{ company: string; label: string; x: number; y: number } | null>(null);
  const [isDashboardLoading, setIsDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState('');
  const [isSavingWorkspace, setIsSavingWorkspace] = useState(false);
  const [savingDraftId, setSavingDraftId] = useState<string | null>(null);
  const [productLaunches, setProductLaunches] = useState<ProductLaunch[]>([]);
  const [meetups, setMeetups] = useState<Meetup[]>([]);
  const [builderNodes, setBuilderNodes] = useState<BuilderNode[]>([]);
  const [, setBuilderClusters] = useState<BuilderMapCluster[]>([]);
  const [builderDiscoveryStates, setBuilderDiscoveryStates] = useState<BuilderDiscoveryState[]>([]);
  const [networkFilters, setNetworkFilters] = useState<NetworkMapFilters>(() => defaultNetworkFilters());
  const [placeOfInterest, setPlaceOfInterest] = useState('');
  const [placeSuggestions, setPlaceSuggestions] = useState<PlaceSuggestion[]>([]);
  const [isPlaceInputFocused, setIsPlaceInputFocused] = useState(false);
  const [isSuggestingPlaces, setIsSuggestingPlaces] = useState(false);
  const [activePlaceSuggestionIndex, setActivePlaceSuggestionIndex] = useState(0);
  const [placeLookupError, setPlaceLookupError] = useState('');
  const [isLocatingUser, setIsLocatingUser] = useState(false);
  const [termReviews, setTermReviews] = useState<TermReview[]>([]);
  const [messages, setMessages] = useState<UserMessage[]>([]);
  const [feedRows, setFeedRows] = useState<FeedItem[]>([]);
  const [selectedClusterCity, setSelectedClusterCity] = useState('');
  const [selectedBuilderId, setSelectedBuilderId] = useState('');
  const [mapViewportBuilderIds, setMapViewportBuilderIds] = useState<string[] | null>(null);
  const [isLaunchFormOpen, setIsLaunchFormOpen] = useState(false);
  const [isMeetupFormOpen, setIsMeetupFormOpen] = useState(false);
  const [isTermFormOpen, setIsTermFormOpen] = useState(false);
  const [isMessageFormOpen, setIsMessageFormOpen] = useState(false);
  const [selectedMessageThreadId, setSelectedMessageThreadId] = useState('');
  const [messageSearch, setMessageSearch] = useState('');
  const [messageStatusFilter, setMessageStatusFilter] = useState<MessageStatusFilter>('all');
  const [launchDraft, setLaunchDraft] = useState(emptyLaunchDraft);
  const [selectedLaunchId, setSelectedLaunchId] = useState('');
  const [launchCommentDrafts, setLaunchCommentDrafts] = useState<Record<string, string>>({});
  const [launchEngagement, setLaunchEngagement] = useState<
    Record<string, { upvoted: boolean; upvotes: number; comments: string[] }>
  >({});
  const [meetupDraft, setMeetupDraft] = useState(emptyMeetupDraft);
  const [termDraft, setTermDraft] = useState(emptyTermDraft);
  const [messageDraft, setMessageDraft] = useState(emptyMessageDraft);
  const [feedbackDraft, setFeedbackDraft] = useState(emptyFeedbackDraft);
  const [isOnboarding, setIsOnboarding] = useState(() =>
    Boolean((location.state as { onboarding?: boolean } | null)?.onboarding),
  );
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [dashboardLaunchFilter, setDashboardLaunchFilter] = useState('Today');
  const [selectedForYouLaunchId, setSelectedForYouLaunchId] = useState(seedDashboardLaunches[0].id);
  const dashboardFilterScrollRef = useRef<HTMLDivElement | null>(null);
  const [savingWorkflow, setSavingWorkflow] = useState<string | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasLoadedRef = useRef(false);
  const [activity, setActivity] = useState<string[]>([
    isInvestor ? 'Investor intake started' : 'Founder proof intake started',
    'For You is showing the front page feed',
  ]);

  const labelByKey = useMemo(
    () =>
      intakeFields.reduce<Record<string, string>>((labels, field) => {
        labels[field.key] = field.label;
        return labels;
      }, {}),
    [intakeFields],
  );

  useLayoutEffect(() => {
    setActiveView(viewFromLocation(location.pathname, location.hash));
  }, [location.hash, location.pathname]);

  const accentSurface = isInvestor ? 'bg-[#42520d]' : 'bg-[#dcefc7]';
  const accentForeground = isInvestor ? 'text-white' : 'text-black';
  const accentSwitchForeground = isInvestor ? 'text-white fill-white' : 'text-black fill-black';
  const accentIconForeground = isInvestor ? 'text-white/90' : 'text-black/75';
  const dmSurface = isInvestor ? 'bg-[#f7f3e4]' : 'bg-[#f2faec]';
  const dmSelectedSurface = isInvestor ? 'bg-[#f3edd7]' : 'bg-[#edf8e5]';
  const dmSoftSurface = isInvestor ? 'bg-[#faf7eb]' : 'bg-[#f8fdf4]';
  const dmAccentBorder = isInvestor ? 'border-[#42520d]/25' : 'border-[#02A070]/25';
  const dmFocusBorder = isInvestor ? 'focus:border-[#42520d]/60' : 'focus:border-[#02A070]/50';
  const dmBubbleMeta = isInvestor ? 'bg-white/15 text-white/75' : 'bg-white/70 text-black/60';
  const feedItems = feedRows;
  const completedFieldCount = intakeFields.filter((field) => intakeValues[field.key].trim()).length;
  const profileStrength = Math.round((completedFieldCount / intakeFields.length) * 100);
  const averageSignalScore = Math.round(
    signalRows.length ? signalRows.reduce((sum, signal) => sum + signal.relevance, 0) / signalRows.length : 0,
  );
  const savedInvestorMatchSet = useMemo(() => new Set(savedInvestorMatchNames), [savedInvestorMatchNames]);
  const matches = useMemo<MatchItem[]>(() => {
    if (isInvestor) {
      return signalRows.map((signal) => ({
        name: signal.founder,
        detail: `${signal.company} - ${signal.detail}`,
        score: `${signal.relevance}%`,
        signal: signal.source,
        location: signal.location,
        nextStep: 'Use outreach draft',
      }));
    }

    const category = intakeValues.category || productLaunches[0]?.category || 'builder proof';
    return founderMatches.map((match, index) => ({
      ...match,
      detail: `${match.detail} - aligned with ${category}`,
      score: `${Math.min(96, 78 + profileStrength / 5 + index * 2).toFixed(0)}%`,
    }));
  }, [intakeValues.category, isInvestor, productLaunches, profileStrength, signalRows]);
  const selectedLiveLaunch = productLaunches.find((launch) => launch.id === selectedLaunchId) ?? productLaunches[0];
  const launchChecklist = [
    { label: 'Product name', done: Boolean(launchDraft.name.trim()) },
    { label: 'One-line tagline', done: Boolean(launchDraft.tagline.trim()) },
    { label: 'Category', done: Boolean(launchDraft.category.trim()) },
    { label: 'Public link', done: Boolean(launchDraft.launchUrl.trim()) },
    { label: 'Logo', done: Boolean(launchDraft.logoUrl.trim()) },
    { label: 'Banner image', done: Boolean(launchDraft.bannerUrl.trim()) },
    { label: 'Intro or demo', done: Boolean(launchDraft.intro.trim() || launchDraft.demoVideoUrl.trim()) },
    { label: 'Pitch Book', done: Boolean(launchDraft.pitchVideoUrl.trim() || launchDraft.pitchDeckUrl.trim()) },
    { label: 'Proof or traction', done: Boolean(launchDraft.proofUrl.trim() || launchDraft.metrics.trim()) },
  ];
  const launchCompletion = Math.round(
    (launchChecklist.filter((item) => item.done).length / launchChecklist.length) * 100,
  );
  const getLaunchEngagement = (launch: ProductLaunch) =>
    launchEngagement[launch.id] ?? {
      upvoted: false,
      // Real DB launches get upvoteCount from the DB; seed/decorative ones fall back to a stable fake count
      upvotes: launch.upvoteCount ?? Math.max(12, launch.name.length * 7 + launch.category.length * 3),
      comments: ['This is now visible to Apparent founders and investors.'],
    };
  const dashboardLaunchRows = useMemo(
    () => [
      ...productLaunches.map((launch, index) =>
        productLaunchToDashboardRow(launch, index, launch.ownerId === user.id ? 'Your profile' : 'Founder on Apparent'),
      ),
      ...seedDashboardLaunches,
    ],
    [productLaunches, user.id],
  );
  const availableDashboardLaunchFilters = isInvestor
    ? [...dashboardLaunchFilters, ...investorFounderSignalFilters]
    : dashboardLaunchFilters;
  const visibleDashboardLaunches = useMemo(() => {
    if (dashboardLaunchFilter === 'Today') {
      return dashboardLaunchRows;
    }

    if (dashboardLaunchFilter === 'Trending') {
      return [...dashboardLaunchRows].sort((a, b) => b.saves + b.comments - (a.saves + a.comments));
    }

    if (dashboardLaunchFilter === 'Nearby') {
      return dashboardLaunchRows.filter((launch) => ['San Francisco', 'New York', 'Apparent'].includes(launch.location));
    }

    if (dashboardLaunchFilter === 'Underrepresented founders') {
      return dashboardLaunchRows.filter((launch) =>
        (launch.founderSignals ?? []).some((signal) => underrepresentedFounderSignals.includes(signal)),
      );
    }

    if (investorFounderSignalFilters.includes(dashboardLaunchFilter)) {
      return dashboardLaunchRows.filter((launch) => (launch.founderSignals ?? []).includes(dashboardLaunchFilter));
    }

    return dashboardLaunchRows.filter((launch) =>
      launch.category.toLowerCase().includes(dashboardLaunchFilter.toLowerCase()),
    );
  }, [dashboardLaunchFilter, dashboardLaunchRows]);
  const selectedForYouLaunch =
    dashboardLaunchRows.find((launch) => launch.id === selectedForYouLaunchId) ?? dashboardLaunchRows[0];
  const topDashboardLaunch = dashboardLaunchRows[0];

  // savedInvestorMatchNames is now persisted to Supabase via saveInvestorMatchBookmark.
  // No localStorage write effect needed.

  const messageThreads = useMemo<MessageThread[]>(() => {
    const threads = new Map<string, MessageThread>();

    messages.forEach((message) => {
      const recipient = message.recipient.trim() || 'Unknown contact';
      const id = recipient.toLowerCase();
      const currentThread = threads.get(id);

      if (!currentThread) {
        threads.set(id, {
          id,
          recipient,
          latest: message,
          messages: [message],
        });
        return;
      }

      currentThread.messages.push(message);
      if (new Date(message.updatedAt).getTime() > new Date(currentThread.latest.updatedAt).getTime()) {
        currentThread.latest = message;
      }
    });

    return [...threads.values()]
      .map((thread) => ({
        ...thread,
        messages: thread.messages.sort(
          (a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime(),
        ),
      }))
      .sort((a, b) => new Date(b.latest.updatedAt).getTime() - new Date(a.latest.updatedAt).getTime());
  }, [messages]);

  const filteredMessageThreads = useMemo(() => {
    const normalizedQuery = messageSearch.trim().toLowerCase();

    return messageThreads.filter((thread) => {
      const statusMatches = messageStatusFilter === 'all' || thread.messages.some((message) => message.status === messageStatusFilter);

      if (!statusMatches) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return [thread.recipient, thread.latest.subject, thread.latest.body].some((value) =>
        value.toLowerCase().includes(normalizedQuery),
      );
    });
  }, [messageSearch, messageStatusFilter, messageThreads]);

  const activeMessageThread = isMessageFormOpen
    ? null
    : messageThreads.find((thread) => thread.id === selectedMessageThreadId) ?? messageThreads[0] ?? null;
  const activeThreadMessages = activeMessageThread?.messages ?? [];

  useEffect(() => {
    let isCancelled = false;
    let hasLoaded = false;

    const applyDashboardData = (showLoading: boolean) => {
      if (showLoading) {
        setIsDashboardLoading(true);
      }
      setDashboardError('');

      loadDashboardData(user, role, labelByKey)
      .then((data) => {
        if (isCancelled) {
          return;
        }

        setIntakeValues(data.intakeValues);
        hasLoadedRef.current = true;
        setProfileSaved(data.profileSaved);
        setSignalRows(data.signalRows);
        setDailyDigestEnabled(data.settings.dailyDigestEnabled);
        setSlackAlertsEnabled(data.settings.slackAlertsEnabled);
        setProductLaunches(data.productLaunches);
        setSelectedLaunchId((current) => current || data.productLaunches[0]?.id || '');
        setMeetups(data.meetups);
        setBuilderNodes(data.builderNodes);
        setBuilderClusters(data.builderClusters);
        setBuilderDiscoveryStates(data.builderDiscoveryStates);
        setTermReviews(data.termReviews);
        setMessages(data.messages);
        setFeedRows(data.feedItems);
        setSavedInvestorMatchNames(data.savedInvestorMatchNames);
        setLaunchEngagement(data.launchEngagement);
        setSelectedClusterCity((current) =>
          data.builderClusters.some((cluster) => cluster.city === current)
            ? current
            : '',
        );
        setSelectedBuilderId((current) =>
          data.builderNodes.some((builder) => builder.id === current)
            ? current
            : data.builderNodes[0]?.id ?? '',
        );
        const requestedView = viewFromLocation(window.location.pathname, window.location.hash);
        if (requestedView === 'overview' && !window.location.hash) {
          setActiveView(data.profileSaved ? 'for-you' : 'overview');
        } else {
          setActiveView(requestedView);
        }
        setActivity([
          data.profileSaved
            ? isInvestor
              ? 'Investor criteria loaded'
              : 'Founder profile loaded'
            : isInvestor
              ? 'Investor intake started'
              : 'Founder profile started',
          data.profileSaved ? 'For You includes personalized feed items' : 'For You is showing the front page feed',
        ]);
        hasLoaded = true;
      })
      .catch((error) => {
        if (isCancelled) {
          return;
        }

        setDashboardError(error instanceof Error ? error.message : 'Unable to load workspace data.');
      })
      .finally(() => {
        if (!isCancelled) {
          setIsDashboardLoading(false);
        }
      });
    };

    applyDashboardData(true);
    const unsubscribe = subscribeBuilderNetwork(user, () => {
      if (hasLoaded) {
        applyDashboardData(false);
      }
    });

    return () => {
      isCancelled = true;
      unsubscribe();
    };
  }, [isInvestor, labelByKey, role, user]);

  const filteredMatches = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return matches;
    }

    return matches.filter((match) =>
      [match.name, match.detail, match.signal, match.location].some((value) =>
        value.toLowerCase().includes(normalizedQuery),
      ),
    );
  }, [matches, query]);

  const filteredFeed = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return feedItems;
    }

    return feedItems.filter((item) =>
      [item.title, item.detail, item.tag, item.source].some((value) =>
        value.toLowerCase().includes(normalizedQuery),
      ),
    );
  }, [feedItems, query]);

  const filteredInvestorSignals = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return signalRows;
    }

    return signalRows.filter((signal) =>
      [signal.company, signal.founder, signal.detail, signal.source, signal.location, signal.stage].some((value) =>
        value.toLowerCase().includes(normalizedQuery),
      ),
    );
  }, [query, signalRows]);

  const investorPipeline = useMemo(
    () =>
      investorDealStages.map((stage) => ({
        stage,
        items: signalRows.filter((signal) => signal.column === stage),
      })),
    [signalRows],
  );
  const builderDiscoveryById = useMemo(
    () => new Map(builderDiscoveryStates.map((state) => [state.builderId, state])),
    [builderDiscoveryStates],
  );
  const builderCategories = useMemo(
    () => Array.from(new Set(builderNodes.map((builder) => builder.category).filter(Boolean))).sort(),
    [builderNodes],
  );
  const builderStages = useMemo(
    () => [
      ...networkStageOptions,
      ...Array.from(
        new Set(builderNodes.map((builder) => builder.stage).filter((stage) => stage && !networkStageOptions.includes(stage))),
      ).sort(),
    ],
    [builderNodes],
  );

  useEffect(() => {
    const queryValue = placeOfInterest.trim();
    const knownSuggestions = buildKnownPlaceSuggestions(queryValue, builderNodes, meetups);

    if (queryValue.length < 4) {
      setPlaceSuggestions(knownSuggestions);
      setIsSuggestingPlaces(false);
      return;
    }

    if (knownSuggestions.length > 0 && queryValue.length <= 4) {
      setPlaceSuggestions(knownSuggestions);
      setIsSuggestingPlaces(false);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setIsSuggestingPlaces(true);

      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&dedupe=1&limit=8&q=${encodeURIComponent(queryValue)}`,
          { signal: controller.signal },
        );

        if (!response.ok) {
          setPlaceSuggestions(knownSuggestions);
          return;
        }

        const remoteResults = (await response.json()) as Array<{
          display_name?: string;
          lat?: string;
          lon?: string;
          name?: string;
          class?: string;
          type?: string;
          addresstype?: string;
        }>;
        const remoteSuggestions = remoteResults
          .map((result, index): PlaceSuggestion | null => {
            const latitude = Number(result.lat);
            const longitude = Number(result.lon);
            if (!result.display_name || Number.isNaN(latitude) || Number.isNaN(longitude)) {
              return null;
            }

            const placeType = result.addresstype || result.type || result.class;
            if (placeType && !allowedRemotePlaceTypes.has(placeType)) {
              return null;
            }

            const label = result.name || result.display_name.split(',').slice(0, 2).join(', ');
            const matchScore = getPlaceMatchScore(label, queryValue);
            if (matchScore < 0) {
              return null;
            }

            return {
              id: `osm-${latitude}-${longitude}-${index}`,
              label,
              detail: placeTypeLabel(placeType),
              source: 'OpenStreetMap',
              latitude,
              longitude,
              matchScore,
            };
          })
          .filter((suggestion): suggestion is PlaceSuggestion => Boolean(suggestion));

        const seen = new Set<string>();
        setPlaceSuggestions(
          [...knownSuggestions, ...remoteSuggestions]
            .filter((suggestion) => {
              const key = suggestion.label.toLowerCase();
              if (seen.has(key)) return false;
              seen.add(key);
              return true;
            })
            .sort((a, b) => {
              const sourceWeight = Number(b.source === 'Apparent') - Number(a.source === 'Apparent');
              return sourceWeight || b.matchScore - a.matchScore || a.label.localeCompare(b.label);
            })
            .slice(0, 6),
        );
      } catch (error) {
        if (!controller.signal.aborted) {
          setPlaceSuggestions(knownSuggestions);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsSuggestingPlaces(false);
        }
      }
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [builderNodes, meetups, placeOfInterest]);

  useEffect(() => {
    setActivePlaceSuggestionIndex(placeSuggestions.length ? 0 : -1);
  }, [placeSuggestions]);

  const filteredBuilderNodes = useMemo(() => {
    const maxAgeByFreshness: Record<NetworkMapFilters['freshness'], number> = {
      any: Number.POSITIVE_INFINITY,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
    };

    return builderNodes
      .filter((builder) => !builderDiscoveryById.get(builder.id)?.hidden)
      .filter((builder) => {
        if (networkFilters.city && builder.location !== networkFilters.city) return false;
        if (networkFilters.category && builder.category !== networkFilters.category) return false;
        if (networkFilters.stage && builder.stage !== networkFilters.stage) return false;
        if (networkFilters.matchOnly && builder.fitScore < 75) return false;

        const ageMs = Date.now() - new Date(builder.latestActivity).getTime();
        if (ageMs > maxAgeByFreshness[networkFilters.freshness]) return false;

        return true;
      })
      .sort((a, b) => {
        if (networkFilters.pin) {
          return distanceMiles(networkFilters.pin, a) - distanceMiles(networkFilters.pin, b);
        }

        return b.fitScore - a.fitScore;
      });
  }, [builderDiscoveryById, builderNodes, networkFilters]);
  const radarClusters = useMemo(
    () => buildBuilderMapClusters(filteredBuilderNodes, meetups),
    [filteredBuilderNodes, meetups],
  );
  const selectedNetworkCluster = useMemo(
    () => {
      if (!selectedClusterCity) return undefined;
      const cluster = radarClusters.find((item) => item.city === selectedClusterCity);
      return cluster
        ? {
            ...cluster,
            builders: cluster.builderCount,
            tags: [...cluster.categoryMix, ...cluster.stageMix],
          }
        : undefined;
    },
    [radarClusters, selectedClusterCity],
  );
  const selectedClusterBuilders = useMemo(
    () => {
      if (selectedNetworkCluster) {
        return filteredBuilderNodes.filter((builder) => selectedNetworkCluster.builderIds.includes(builder.id));
      }

      if (mapViewportBuilderIds) {
        const visibleIds = new Set(mapViewportBuilderIds);
        return filteredBuilderNodes.filter((builder) => visibleIds.has(builder.id));
      }

      if (networkFilters.pin) {
        return filteredBuilderNodes.filter((builder) => distanceMiles(networkFilters.pin!, builder) <= networkFilters.radiusMiles);
      }

      return filteredBuilderNodes;
    },
    [filteredBuilderNodes, mapViewportBuilderIds, networkFilters.pin, networkFilters.radiusMiles, selectedNetworkCluster],
  );
  const selectedClusterSignals = useMemo(
    () => selectedClusterBuilders.map((builder) => ({ company: builder.company, stage: builder.stage })),
    [selectedClusterBuilders],
  );
  const selectedBuilder = useMemo(
    () => {
      if (selectedClusterBuilders.length === 0 && (mapViewportBuilderIds || networkFilters.pin || selectedNetworkCluster)) {
        return undefined;
      }

      return (
        selectedClusterBuilders.find((builder) => builder.id === selectedBuilderId) ??
        selectedClusterBuilders[0] ??
        filteredBuilderNodes.find((builder) => builder.id === selectedBuilderId) ??
        filteredBuilderNodes[0]
      );
    },
    [filteredBuilderNodes, mapViewportBuilderIds, networkFilters.pin, selectedBuilderId, selectedClusterBuilders, selectedNetworkCluster],
  );
  const selectedClusterMeetups = useMemo(
    () => {
      if (selectedNetworkCluster) {
        return meetups.filter((meetup) => meetup.city === selectedNetworkCluster.city);
      }

      if (mapViewportBuilderIds) {
        const visibleLocations = new Set(selectedClusterBuilders.map((builder) => builder.location));
        return meetups.filter((meetup) => visibleLocations.has(meetup.city));
      }

      if (networkFilters.pin) {
        return meetups.filter((meetup) => {
          const meetupPin = matchKnownPlace(meetup.city);
          return meetupPin ? distanceMiles(networkFilters.pin!, meetupPin) <= networkFilters.radiusMiles : false;
        });
      }

      return [];
    },
    [mapViewportBuilderIds, meetups, networkFilters.pin, networkFilters.radiusMiles, selectedClusterBuilders, selectedNetworkCluster],
  );

  useEffect(() => {
    if (selectedClusterCity && !radarClusters.some((cluster) => cluster.city === selectedClusterCity)) {
      setSelectedClusterCity('');
      return;
    }

    if (selectedNetworkCluster && networkFilters.city && selectedNetworkCluster.city !== networkFilters.city) {
      setSelectedClusterCity(networkFilters.city);
    }
  }, [networkFilters.city, radarClusters, selectedClusterCity, selectedNetworkCluster]);

  const dashboardSearchActions = useMemo<Action[]>(() => {
    const sharedActions: Action[] = [
      {
        id: 'view-for-you',
        label: 'Open For You feed',
        icon: <Users className="h-4 w-4 text-gray-700" />,
        description: 'Front page and personalized updates',
        short: 'Feed',
        end: 'View',
      },
      {
        id: 'query-ai',
        label: 'Search AI infra',
        icon: <Search className="h-4 w-4 text-gray-700" />,
        description: 'Filter current workspace for AI infrastructure',
        short: 'AI',
        end: 'Search',
      },
      {
        id: 'open-meetups',
        label: 'Open meetups',
        icon: <Calendar className="h-4 w-4 text-gray-700" />,
        description: 'Create, RSVP, and review founder rooms',
        short: 'Events',
        end: 'Workspace',
      },
      {
        id: 'open-map',
        label: 'Open network map',
        icon: <MapPin className="h-4 w-4 text-gray-700" />,
        description: 'Explore builder and meetup city clusters',
        short: 'Map',
        end: 'Workspace',
      },
      {
        id: 'open-terms',
        label: 'Open terms review',
        icon: <FileText className="h-4 w-4 text-gray-700" />,
        description: 'Track deal terms and review notes',
        short: 'Terms',
        end: 'Workspace',
      },
      {
        id: 'open-messages',
        label: 'Open messages',
        icon: <MessageCircle className="h-4 w-4 text-gray-700" />,
        description: 'Compose and manage persisted outreach',
        short: 'Inbox',
        end: 'Workspace',
      },
    ];

    if (isInvestor) {
      return [
        {
          id: 'open-criteria',
          label: 'Open your thesis',
          icon: <Target className="h-4 w-4 text-green-700" />,
          description: 'Thesis, stage, geography, and founder taste',
          short: 'Thesis',
          end: 'Page',
        },
        {
          id: 'open-signals',
          label: 'Open Signal inbox',
          icon: <Search className="h-4 w-4 text-green-700" />,
          description: 'Ranked public founder and company signals',
          short: 'Signals',
          end: 'Inbox',
        },
        {
          id: 'open-deals',
          label: 'Open Deal-flow Kanban',
          icon: <FileText className="h-4 w-4 text-green-700" />,
          description: 'Move sourced companies through the pipeline',
          short: 'Kanban',
          end: 'CRM',
        },
        {
          id: 'open-digest',
          label: 'Review Daily digest',
          icon: <Calendar className="h-4 w-4 text-green-700" />,
          description: 'Fresh source signals and team summary',
          short: 'Digest',
          end: 'Alerts',
        },
        {
          id: 'query-devtools',
          label: 'Search devtools founders',
          icon: <Target className="h-4 w-4 text-green-700" />,
          description: 'Filter signals for developer tools',
          short: 'Devtools',
          end: 'Search',
        },
        ...sharedActions,
      ];
    }

    return [
      {
        id: 'open-profile',
        label: 'Open your profile',
        icon: <GitHubIcon className="h-4 w-4" />,
        description: 'Founder bio, links, products, and network goals',
        short: 'Profile',
        end: 'Page',
      },
      {
        id: 'open-launches',
        label: 'Open product launcher',
        icon: <Rocket className="h-4 w-4 text-[#02A070]" />,
        description: 'Publish a product into Apparent',
        short: 'Products',
        end: 'Launch',
      },
      {
        id: 'open-deal-room',
        label: 'Open deal room',
        icon: <FileText className="h-4 w-4 text-[#02A070]" />,
        description: 'Investor conversations and terms',
        short: 'Deals',
        end: 'Workspace',
      },
      {
        id: 'query-investors',
        label: 'Search investors',
        icon: <Search className="h-4 w-4 text-[#02A070]" />,
        description: 'Filter for investor matches and capital notes',
        short: 'Investors',
        end: 'Search',
      },
      ...sharedActions,
    ];
  }, [isInvestor]);

  const addActivity = (item: string) => {
    setActivity((current) => [item, ...current].slice(0, 6));
  };

  const handleLaunchAssetUpload = (
    field: 'logoUrl' | 'bannerUrl' | 'demoVideoUrl' | 'pitchVideoUrl' | 'pitchDeckUrl',
    file: File | undefined,
  ) => {
    if (!file) {
      return;
    }

    if (file.type.startsWith('video/')) {
      setLaunchDraft((current) => ({ ...current, [field]: URL.createObjectURL(file) }));
      addActivity(`Added launch media: ${file.name}`);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setLaunchDraft((current) => ({ ...current, [field]: String(reader.result ?? '') }));
      addActivity(`Added launch media: ${file.name}`);
    };
    reader.readAsDataURL(file);
  };

  const handleProfileAssetUpload = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const url = String(reader.result ?? '');
      // Update state — the debounce will also fire, but we save immediately
      // here too because photo uploads are discrete user actions
      setIntakeValues((current) => {
        const next = { ...current, profilePhotoUrl: url };
        // Kick off an immediate save with the merged values
        setAutoSaveStatus('saving');
        saveIntakeValues(user, role, next)
          .then(() => {
            setProfileSaved(true);
            setAutoSaveStatus('saved');
            setTimeout(() => setAutoSaveStatus('idle'), 2000);
          })
          .catch(() => {
            setAutoSaveStatus('error');
            setTimeout(() => setAutoSaveStatus('idle'), 3000);
          });
        return next;
      });
      addActivity(`Updated profile image: ${file.name}`);
    };
    reader.readAsDataURL(file);
  };

  const toggleLaunchFounderSignal = (signal: string) => {
    setLaunchDraft((current) => {
      const currentSignals = current.founderSignals ?? [];
      return {
        ...current,
        founderSignals: currentSignals.includes(signal)
          ? currentSignals.filter((item) => item !== signal)
          : [...currentSignals, signal],
      };
    });
  };

  const handleResetLaunchDraft = () => {
    const hasDraftContent = Object.values(launchDraft).some((value) => String(value).trim());

    if (hasDraftContent && !window.confirm('Reset this product launch draft? Your current details and media will be cleared.')) {
      return;
    }

    setLaunchDraft(emptyLaunchDraft());
  };

  const getBuilderState = (builder: BuilderNode): BuilderDiscoveryState => ({
    userId: user.id,
    builderId: builder.id,
    saved: false,
    hidden: false,
    stage: '',
    note: '',
    outreachBody: '',
    updatedAt: new Date().toISOString(),
    ...builderDiscoveryById.get(builder.id),
  });

  const mergeBuilderState = (state: BuilderDiscoveryState) => {
    setBuilderDiscoveryStates((current) => [
      state,
      ...current.filter((item) => item.builderId !== state.builderId),
    ]);
  };

  const buildBuilderOutreachDraft = (builder: BuilderNode) => {
    const thesis = intakeValues.thesis?.trim() || 'our current thesis';
    const proof = builder.matchReasons.slice(0, 2).join(' and ') || builder.category || 'your Apparent profile';

    return `${builder.founderName}, ${builder.company} stood out on Apparent because of ${proof}. It maps to ${thesis}. Open to a quick conversation this week?`;
  };

  const builderSignalFromNode = (
    builder: BuilderNode,
    state: BuilderDiscoveryState,
    stage: InvestorDealStage,
  ): InvestorSignal => ({
    id: `builder:${builder.id}`,
    company: builder.company,
    founder: builder.founderName,
    detail: builder.buildSummary || builder.traction || 'Apparent builder profile',
    source: 'Apparent builder',
    sourceUrl: builder.proofLinks[0]?.url ?? builder.profileUrl,
    profileUrl: builder.profileUrl,
    relevance: builder.fitScore,
    freshness: builder.latestActivityLabel,
    stage: builder.stage,
    location: builder.location,
    column: stage,
    outreach: state.outreachBody || buildBuilderOutreachDraft(builder),
    sourceType: 'Apparent builder',
    freshnessAt: builder.latestActivity,
    githubUrl: builder.githubUrl,
    rawTags: builder.rawTags,
  });

  const persistBuilderState = async (
    builder: BuilderNode,
    patch: Partial<Pick<BuilderDiscoveryState, 'saved' | 'hidden' | 'stage' | 'note' | 'outreachBody'>>,
    activityItem: string,
  ) => {
    const optimisticState: BuilderDiscoveryState = {
      ...getBuilderState(builder),
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    mergeBuilderState(optimisticState);
    setDashboardError('');

    try {
      const savedState = await saveBuilderDiscoveryState(user, builder.id, patch);
      mergeBuilderState(savedState);
      addActivity(activityItem);
      return savedState;
    } catch (error) {
      setDashboardError(error instanceof Error ? error.message : 'Unable to save builder state.');
      addActivity(`Could not update ${builder.company}`);
      throw error;
    }
  };

  const handleSelectBuilderCity = (city: string) => {
    setSelectedClusterCity(city);
    setMapViewportBuilderIds(null);
  };

  const handleSelectBuilderFromMap = (builderId: string) => {
    setSelectedBuilderId(builderId);
    setSelectedClusterCity('');
  };

  const handleViewportBuildersChange = (builderIds: string[]) => {
    setMapViewportBuilderIds((current) => {
      if (current && current.length === builderIds.length && current.every((id, index) => id === builderIds[index])) {
        return current;
      }

      return builderIds;
    });
    setSelectedClusterCity('');
  };

  const applyPlacePin = (pin: NetworkInterestPin) => {
    setNetworkFilters((current) => ({
      ...current,
      city: '',
      pin,
    }));
    setSelectedClusterCity('');
    setSelectedBuilderId('');
    setMapViewportBuilderIds(null);
    setPlaceSuggestions([]);
    setIsPlaceInputFocused(false);
    addActivity(`Dropped radar pin: ${pin.label}`);
  };

  const handleSelectPlaceSuggestion = (suggestion: PlaceSuggestion) => {
    setPlaceOfInterest(suggestion.label);
    setPlaceLookupError('');
    applyPlacePin(suggestion);
  };

  const handleDropPlacePin = async () => {
    const queryValue = placeOfInterest.trim();

    if (!queryValue) {
      setPlaceLookupError('Enter a place before dropping a pin.');
      return;
    }

    setPlaceLookupError('');

    try {
      const knownPlace = matchKnownPlace(queryValue);
      let nextPin = knownPlace;

      if (!nextPin) {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(queryValue)}`,
        );

        if (response.ok) {
          const results = (await response.json()) as Array<{
            display_name?: string;
            lat?: string;
            lon?: string;
          }>;
          const result = results[0];

          if (result?.lat && result.lon) {
            nextPin = {
              label: result.display_name?.split(',').slice(0, 2).join(', ') || queryValue,
              latitude: Number(result.lat),
              longitude: Number(result.lon),
            };
          }
        }
      }

      if (!nextPin || Number.isNaN(nextPin.latitude) || Number.isNaN(nextPin.longitude)) {
        setPlaceLookupError('Could not place that pin. Try a city, venue, or neighborhood.');
        return;
      }

      setPlaceOfInterest(nextPin.label);
      applyPlacePin(nextPin);
    } catch {
      setPlaceLookupError('Could not place that pin. Check the place name and try again.');
    }
  };

  const handleLocateProjectsAroundMe = () => {
    if (!navigator.geolocation) {
      setPlaceLookupError('Your browser does not support location lookup. Search a city, venue, or neighborhood instead.');
      return;
    }

    setIsLocatingUser(true);
    setPlaceLookupError('');
    setPlaceSuggestions([]);
    setIsPlaceInputFocused(false);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextPin: NetworkInterestPin = {
          label: 'Your location',
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };

        setPlaceOfInterest('Your location');
        applyPlacePin(nextPin);
        setIsLocatingUser(false);
      },
      (error) => {
        const message =
          error.code === error.PERMISSION_DENIED
            ? 'Location permission was blocked. Search a city, venue, or neighborhood instead.'
            : error.code === error.TIMEOUT
              ? 'Location lookup timed out. Try again or search a place manually.'
              : 'Could not locate you right now. Search a city, venue, or neighborhood instead.';

        setPlaceLookupError(message);
        setIsLocatingUser(false);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 60_000,
        timeout: 10_000,
      },
    );
  };

  const handlePlaceInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' && placeSuggestions.length) {
      event.preventDefault();
      setActivePlaceSuggestionIndex((current) => (current + 1) % placeSuggestions.length);
      return;
    }

    if (event.key === 'ArrowUp' && placeSuggestions.length) {
      event.preventDefault();
      setActivePlaceSuggestionIndex((current) => (current <= 0 ? placeSuggestions.length - 1 : current - 1));
      return;
    }

    if (event.key === 'Escape') {
      setIsPlaceInputFocused(false);
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      if (placeSuggestions[activePlaceSuggestionIndex]) {
        handleSelectPlaceSuggestion(placeSuggestions[activePlaceSuggestionIndex]);
        return;
      }

      void handleDropPlacePin();
    }
  };

  const handleClearNetworkFilters = () => {
    setNetworkFilters(defaultNetworkFilters());
    setPlaceOfInterest('');
    setPlaceLookupError('');
    setIsLocatingUser(false);
    setSelectedClusterCity('');
    setMapViewportBuilderIds(null);
  };

  const handleSaveBuilder = async (builder: BuilderNode) => {
    const state = getBuilderState(builder);
    await persistBuilderState(
      builder,
      { saved: !state.saved, hidden: false },
      `${state.saved ? 'Unsaved' : 'Saved'} builder: ${builder.company}`,
    );
  };

  const handleHideBuilder = async (builder: BuilderNode) => {
    await persistBuilderState(builder, { hidden: true, saved: false }, `Hidden builder: ${builder.company}`);
  };

  const handleAddBuilderToDealFlow = async (builder: BuilderNode) => {
    const savedState = await persistBuilderState(
      builder,
      { saved: true, hidden: false, stage: 'New', outreachBody: getBuilderState(builder).outreachBody || buildBuilderOutreachDraft(builder) },
      `Added ${builder.company} to deal-flow`,
    );
    const nextSignal = builderSignalFromNode(builder, savedState, 'New');
    setSignalRows((current) => [
      nextSignal,
      ...current.filter((signal) => signal.id !== nextSignal.id),
    ]);
  };

  const handleBuilderDraftChange = (builder: BuilderNode, body: string) => {
    mergeBuilderState({
      ...getBuilderState(builder),
      saved: true,
      outreachBody: body,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleSaveBuilderDraft = async (builder: BuilderNode) => {
    const state = getBuilderState(builder);
    const body = state.outreachBody || buildBuilderOutreachDraft(builder);
    await persistBuilderState(builder, { saved: true, outreachBody: body }, `Saved radar draft for ${builder.company}`);
  };

  const handleDraftBuilderOutreach = async (builder: BuilderNode) => {
    const body = getBuilderState(builder).outreachBody || buildBuilderOutreachDraft(builder);
    mergeBuilderState({ ...getBuilderState(builder), saved: true, outreachBody: body, updatedAt: new Date().toISOString() });
    await persistBuilderState(builder, { saved: true, outreachBody: body }, `Drafted outreach for ${builder.company}`);
  };

  const handleMessageBuilder = async (builder: BuilderNode) => {
    const body = `Hey ${builder.founderName}, I found ${builder.company} on Apparent. ${builder.buildSummary} Would be useful to compare notes.`;
    setSavingWorkflow('message');
    setDashboardError('');

    try {
      const savedMessage = await saveMessage(user, {
        recipient: builder.founderName,
        subject: `Apparent: ${builder.company}`,
        body,
        status: 'draft',
        context: `builder:${builder.id}`,
      });
      setMessages((current) => [savedMessage, ...current.filter((message) => message.id !== savedMessage.id)]);
      await persistBuilderState(builder, { saved: true, note: 'Message draft created' }, `Message draft created for ${builder.company}`);
    } catch (error) {
      setDashboardError(error instanceof Error ? error.message : 'Unable to create message draft.');
    } finally {
      setSavingWorkflow(null);
    }
  };

  const buildFounderInvestorMessage = (match: MatchItem) => {
    const build = intakeValues.currentBuild || productLaunches[0]?.tagline || 'what I am building';
    const proof = productLaunches[0]?.metrics || productLaunches[0]?.tagline || intakeValues.bio || 'the context in my Apparent profile';
    const ask = intakeValues.lookingFor || 'investors who understand the market and can help sharpen the next round';

    return `Hi ${match.name}, I found your thesis on Apparent and it looks relevant to ${build}. Current context: ${proof}. I am looking for ${ask}. Would it be useful if I sent over my Apparent profile for a quick read?`;
  };

  const handleToggleInvestorMatchSave = (match: MatchItem) => {
    const isSaved = savedInvestorMatchSet.has(match.name);
    const nextSaved = !isSaved;
    setSavedInvestorMatchNames((current) =>
      isSaved ? current.filter((name) => name !== match.name) : [match.name, ...current.filter((name) => name !== match.name)],
    );
    addActivity(`${isSaved ? 'Removed' : 'Saved'} investor match: ${match.name}`);
    saveInvestorMatchBookmark(user, match.name, nextSaved).catch(() => {
      // revert optimistic update on failure
      setSavedInvestorMatchNames((current) =>
        isSaved ? [match.name, ...current] : current.filter((name) => name !== match.name),
      );
    });
  };

  const handleMessageInvestorMatch = async (match: MatchItem) => {
    setSavingWorkflow('message');
    setDashboardError('');

    try {
      const savedMessage = await saveMessage(user, {
        recipient: match.name,
        subject: `Apparent founder profile: ${intakeValues.category || productLaunches[0]?.category || 'founder fit'}`,
        body: buildFounderInvestorMessage(match),
        status: 'draft',
        context: `investor-match:${match.name}`,
      });
      setMessages((current) => [savedMessage, ...current.filter((message) => message.id !== savedMessage.id)]);
      setSavedInvestorMatchNames((current) => [match.name, ...current.filter((name) => name !== match.name)]);
      saveInvestorMatchBookmark(user, match.name, true).catch(() => { /* non-critical */ });
      setSelectedMessageThreadId(savedMessage.recipient.toLowerCase());
      setIsMessageFormOpen(false);
      addActivity(`Drafted investor note: ${match.name}`);
      setActiveView('messages');
      navigate(`${dashboardBasePath}#messages`);
    } catch (error) {
      setDashboardError(error instanceof Error ? error.message : 'Unable to create investor message draft.');
    } finally {
      setSavingWorkflow(null);
    }
  };

  const handlePrepProofForMatch = (match: MatchItem) => {
    addActivity(`Preparing founder profile for ${match.name}`);
    setActiveView('profile');
    navigate(`${dashboardBasePath}#profile`);
    window.setTimeout(() => scrollToSection('profile'), 50);
  };

  // Debounced auto-save: fires 1.5 s after the last field change
  useEffect(() => {
    if (!hasLoadedRef.current) return; // don't fire during initial data load
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(async () => {
      setAutoSaveStatus('saving');
      try {
        await saveIntakeValues(user, role, intakeValues);
        setProfileSaved(true);
        setAutoSaveStatus('saved');
        setTimeout(() => setAutoSaveStatus('idle'), 2000);
      } catch {
        setAutoSaveStatus('error');
        setTimeout(() => setAutoSaveStatus('idle'), 3000);
      }
    }, 1500);
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intakeValues]);

  const handleIntakeChange = (key: string, value: string) => {
    setIntakeValues((current) => ({ ...current, [key]: value }));
    setProfileSaved(false);
  };

  const handleOnboardingComplete = async () => {
    setIsOnboarding(false);
    try {
      await saveIntakeValues(user, role, intakeValues);
      setProfileSaved(true);
    } catch {
      // non-fatal — user can save profile manually later
    }
  };

  const handleSaveProfile = async () => {
    setIsSavingWorkspace(true);
    setDashboardError('');

    try {
      await saveIntakeValues(user, role, intakeValues);
      setProfileSaved(true);
      setAutoSaveStatus('saved');
      setTimeout(() => setAutoSaveStatus('idle'), 2000);
      addActivity(isInvestor ? 'Investor thesis saved. For You personalized.' : 'Founder profile saved. For You personalized.');
    } catch (error) {
      setDashboardError(error instanceof Error ? error.message : 'Unable to save workspace.');
      addActivity('Workspace save failed');
    } finally {
      setIsSavingWorkspace(false);
    }
  };

  const handleActionSubmit = () => {
    if (!actionMode) {
      return;
    }

    const labelByMode: Record<ActionMode, string> = {
      profile: isInvestor ? 'Investor profile updated' : 'Founder profile updated',
      launch: 'Product launch added',
      thesis: 'Investment thesis published',
      meetup: 'Meetup draft created',
    };

    addActivity(labelByMode[actionMode]);
    setActionMode(null);
  };

  const openInvestorSignal = (signal: InvestorSignal) => {
    setSelectedMatch({
      name: `${signal.company} - ${signal.founder}`,
      detail: signal.detail,
      score: `${signal.relevance}%`,
      signal: signal.source,
      location: signal.location,
      nextStep: 'Use outreach draft',
    });
    addActivity(`Opened source signal: ${signal.company}`);
  };

  const signalStorageId = (signal: InvestorSignal) => signal.id ?? signal.company;

  const moveInvestorSignal = async (signalId: string, column: InvestorDealStage) => {
    const signal = signalRows.find((item) => signalStorageId(item) === signalId);

    if (!signal || signal.column === column) {
      return;
    }

    setSignalRows((current) =>
      current.map((item) => (signalStorageId(item) === signalId ? { ...item, column } : item)),
    );
    addActivity(`${signal.company} moved to ${column}`);

    try {
      const storageId = signalStorageId(signal);
      if (storageId.startsWith('builder:')) {
        const builderId = storageId.replace(/^builder:/, '');
        const savedState = await saveBuilderDiscoveryState(user, builderId, {
          saved: true,
          stage: column,
          outreachBody: signal.outreach,
        });
        mergeBuilderState(savedState);
      } else {
        await saveSignalStage(user, storageId, column);
      }
    } catch (error) {
      setSignalRows((current) =>
        current.map((item) => (signalStorageId(item) === signalId ? { ...item, column: signal.column } : item)),
      );
      setDashboardError(error instanceof Error ? error.message : 'Unable to save deal-flow stage.');
      addActivity(`Could not save ${signal.company} stage`);
    }
  };

  const getInvestorStageFromPoint = (x: number, y: number) => {
    const element = document.elementFromPoint(x, y);
    const stageElement = element?.closest('[data-kanban-stage]') as HTMLElement | null;
    const stage = stageElement?.dataset.kanbanStage as InvestorDealStage | undefined;

    return stage && investorDealStages.includes(stage) ? stage : null;
  };

  const handleInvestorSignalDragStart = (event: DragEvent<HTMLDivElement>, signalId: string) => {
    setDraggedSignalCompany(signalId);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', signalId);
  };

  const handleInvestorSignalDragOver = (event: DragEvent<HTMLDivElement>, stage: InvestorDealStage) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setDragOverStage(stage);
  };

  const handleInvestorSignalDrop = (event: DragEvent<HTMLDivElement>, stage: InvestorDealStage) => {
    event.preventDefault();
    const signalId = event.dataTransfer.getData('text/plain') || draggedSignalCompany;

    if (signalId) {
      moveInvestorSignal(signalId, stage);
    }

    setDraggedSignalCompany(null);
    setDragOverStage(null);
  };

  const clearInvestorSignalDrag = () => {
    setDraggedSignalCompany(null);
    setDragOverStage(null);
    setPointerDrag(null);
  };

  const handleInvestorSignalPointerDragStart = (
    event: ReactPointerEvent<HTMLButtonElement>,
    signal: InvestorSignal,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    const signalId = signalStorageId(signal);
    setDraggedSignalCompany(signalId);
    setPointerDrag({
      company: signalId,
      label: `${signal.company} - ${signal.founder}`,
      x: event.clientX,
      y: event.clientY,
    });

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const stage = getInvestorStageFromPoint(moveEvent.clientX, moveEvent.clientY);
      setDragOverStage(stage);
      setPointerDrag((current) =>
        current
          ? {
              ...current,
              x: moveEvent.clientX,
              y: moveEvent.clientY,
            }
          : current,
      );
    };

    const handlePointerUp = (upEvent: PointerEvent) => {
      const stage = getInvestorStageFromPoint(upEvent.clientX, upEvent.clientY);

      if (stage) {
        moveInvestorSignal(signalId, stage);
      }

      clearInvestorSignalDrag();
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
      document.removeEventListener('pointercancel', handlePointerCancel);
    };

    const handlePointerCancel = () => {
      clearInvestorSignalDrag();
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
      document.removeEventListener('pointercancel', handlePointerCancel);
    };

    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
    document.addEventListener('pointercancel', handlePointerCancel);
  };

  const persistSettings = async (settings: UserSettings, activityItem: string) => {
    setDailyDigestEnabled(settings.dailyDigestEnabled);
    setSlackAlertsEnabled(settings.slackAlertsEnabled);
    setDashboardError('');
    addActivity(activityItem);

    try {
      await saveSettings(user, settings);
    } catch (error) {
      setDashboardError(error instanceof Error ? error.message : 'Unable to save settings.');
      addActivity('Settings save failed');
    }
  };

  const toggleDailyDigest = () => {
    const nextValue = !dailyDigestEnabled;
    void persistSettings(
      { dailyDigestEnabled: nextValue, slackAlertsEnabled },
      `Daily digest ${nextValue ? 'enabled' : 'paused'}`,
    );
  };

  const handleOutreachDraftChange = (signal: InvestorSignal, body: string) => {
    const id = signalStorageId(signal);
    setSignalRows((current) =>
      current.map((item) => (signalStorageId(item) === id ? { ...item, outreach: body } : item)),
    );
  };

  const handleSaveOutreachDraft = async (signal: InvestorSignal) => {
    const id = signalStorageId(signal);

    setSavingDraftId(id);
    setDashboardError('');

    try {
      await saveOutreachDraft(user, id, signal.outreach);
      addActivity(`Saved outreach draft for ${signal.founder}`);
    } catch (error) {
      setDashboardError(error instanceof Error ? error.message : 'Unable to save outreach draft.');
      addActivity(`Could not save outreach draft for ${signal.founder}`);
    } finally {
      setSavingDraftId(null);
    }
  };

  const updateClusterFromMeetup = (meetup: Meetup) => {
    const nextMeetups = [meetup, ...meetups.filter((item) => item.id !== meetup.id)];
    setBuilderClusters(buildBuilderMapClusters(builderNodes, nextMeetups));
    setSelectedClusterCity(meetup.city);
  };

  const handleSaveProductLaunch = async () => {
    if (!launchDraft.name.trim()) {
      setDashboardError('Product name is required.');
      return;
    }

    setSavingWorkflow('launch');
    setDashboardError('');

    try {
      const savedLaunch = await saveProductLaunch(user, launchDraft);
      setProductLaunches((current) => [savedLaunch, ...current.filter((launch) => launch.id !== savedLaunch.id)]);
      setSelectedLaunchId(savedLaunch.id);
      setFeedRows((current) => [
        {
          id: `launch-${savedLaunch.id}`,
          title: `${savedLaunch.name} is live`,
          detail: savedLaunch.tagline || savedLaunch.metrics || 'New founder launch added to Apparent.',
          tag: 'Launch proof',
          source: 'For you',
          actor: 'Profile Coach',
          meta: 'now',
          saved: false,
          reposted: false,
          reply: '',
        },
        ...current,
      ]);
      setLaunchDraft(emptyLaunchDraft());
      setIsLaunchFormOpen(false);
      addActivity(`Launched ${savedLaunch.name} into Apparent`);
    } catch (error) {
      setDashboardError(error instanceof Error ? error.message : 'Unable to save product launch.');
    } finally {
      setSavingWorkflow(null);
    }
  };

  const handleToggleLaunchUpvote = (launch: ProductLaunch) => {
    const current = getLaunchEngagement(launch);
    const wasUpvoted = current.upvoted;
    const next = {
      ...current,
      upvoted: !wasUpvoted,
      upvotes: current.upvotes + (wasUpvoted ? -1 : 1),
    };
    // Optimistic update
    setLaunchEngagement((items) => ({ ...items, [launch.id]: next }));
    addActivity(`${next.upvoted ? 'Upvoted' : 'Removed upvote'}: ${launch.name}`);
    // Persist to Supabase (fire-and-forget with optimistic revert on error)
    toggleLaunchUpvote(user, launch.id, wasUpvoted).catch(() => {
      setLaunchEngagement((items) => ({ ...items, [launch.id]: current }));
    });
  };

  const handlePostLaunchComment = (launch: ProductLaunch) => {
    const draft = launchCommentDrafts[launch.id]?.trim();
    if (!draft) {
      return;
    }

    const current = getLaunchEngagement(launch);
    // Optimistic update
    setLaunchEngagement((items) => ({
      ...items,
      [launch.id]: {
        ...current,
        comments: [draft, ...current.comments],
      },
    }));
    setLaunchCommentDrafts((items) => ({ ...items, [launch.id]: '' }));
    addActivity(`Commented on ${launch.name}`);
    // Persist (fire-and-forget; comment stays in UI even if save fails)
    saveLaunchComment(user, launch.id, draft).catch(() => { /* non-critical */ });
  };

  const handleOpenFounderProfileFromLaunch = () => {
    setActiveView('profile');
    navigate('/dashboard/founder#profile');
    window.setTimeout(() => scrollToSection('profile'), 50);
    addActivity('Opened founder profile from launch');
  };

  const handleForYouPrimaryAction = (launch: DashboardLaunchRow) => {
    if (isInvestor) {
      setQuery(launch.name);
      setActiveView('deals');
      navigate('/dashboard/investor#deals');
      addActivity(`Saved ${launch.name} to investor deal flow`);
      return;
    }

    setActiveView('products');
    navigate('/dashboard/founder/products');
    addActivity(`Opened product launcher from ${launch.name}`);
  };

  const scrollDashboardFilters = (direction: -1 | 1) => {
    dashboardFilterScrollRef.current?.scrollBy({
      left: direction * 140,
      behavior: 'smooth',
    });
  };

  const handleSaveMeetup = async () => {
    if (!meetupDraft.title.trim()) {
      setDashboardError('Meetup title is required.');
      return;
    }

    setSavingWorkflow('meetup');
    setDashboardError('');

    try {
      const savedMeetup = await saveMeetup(user, role, {
        ...meetupDraft,
        startsAt: new Date(meetupDraft.startsAt).toISOString(),
      });
      setMeetups((current) => [savedMeetup, ...current.filter((meetup) => meetup.id !== savedMeetup.id)]);
      updateClusterFromMeetup(savedMeetup);
      setMeetupDraft(emptyMeetupDraft());
      setIsMeetupFormOpen(false);
      addActivity(`Meetup saved: ${savedMeetup.title}`);
    } catch (error) {
      setDashboardError(error instanceof Error ? error.message : 'Unable to save meetup.');
    } finally {
      setSavingWorkflow(null);
    }
  };

  const handleToggleMeetupRsvp = async (meetup: Meetup) => {
    const nextJoined = !meetup.isJoined;
    setMeetups((current) =>
      current.map((item) =>
        item.id === meetup.id
          ? {
              ...item,
              isJoined: nextJoined,
              attendeeCount: Math.max(0, item.attendeeCount + (nextJoined ? 1 : -1)),
            }
          : item,
      ),
    );

    try {
      await toggleMeetupRsvp(user, meetup.id, nextJoined);
      addActivity(`${nextJoined ? 'Joined' : 'Left'} meetup: ${meetup.title}`);
    } catch (error) {
      setDashboardError(error instanceof Error ? error.message : 'Unable to update RSVP.');
    }
  };

  const handleSaveTermReview = async () => {
    if (!termDraft.company.trim()) {
      setDashboardError('Company is required for terms review.');
      return;
    }

    setSavingWorkflow('term');
    setDashboardError('');

    try {
      const savedReview = await saveTermReview(user, termDraft);
      setTermReviews((current) => [savedReview, ...current.filter((review) => review.id !== savedReview.id)]);
      setTermDraft(emptyTermDraft());
      setIsTermFormOpen(false);
      addActivity(`Terms review saved: ${savedReview.company}`);
    } catch (error) {
      setDashboardError(error instanceof Error ? error.message : 'Unable to save terms review.');
    } finally {
      setSavingWorkflow(null);
    }
  };

  const handleSaveFeedback = async () => {
    if (!feedbackDraft.subject.trim() || !feedbackDraft.body.trim()) {
      setDashboardError('Feedback needs a subject and details.');
      return;
    }

    setSavingWorkflow('feedback');
    setDashboardError('');

    try {
      const savedFeedback = await saveMessage(user, {
        recipient: 'Apparent product team',
        subject: `${feedbackDraft.type}: ${feedbackDraft.subject}`,
        body: feedbackDraft.body,
        status: 'sent',
        context: `feedback:${role}`,
      });
      setMessages((current) => [savedFeedback, ...current.filter((message) => message.id !== savedFeedback.id)]);
      setFeedbackDraft(emptyFeedbackDraft());
      addActivity(`Feedback sent: ${savedFeedback.subject}`);
    } catch (error) {
      setDashboardError(error instanceof Error ? error.message : 'Unable to send feedback.');
    } finally {
      setSavingWorkflow(null);
    }
  };

  const handleStartNewMessage = () => {
    setSelectedMessageThreadId('');
    setMessageDraft(emptyMessageDraft());
    setIsMessageFormOpen(true);
  };

  const handleSelectMessageThread = (thread: MessageThread) => {
    setSelectedMessageThreadId(thread.id);
    setIsMessageFormOpen(false);
    setMessageDraft({
      recipient: thread.recipient,
      subject: thread.latest.subject,
      body: '',
      status: 'draft',
      context: thread.latest.context,
    });
  };

  const handleCycleMessageFilter = () => {
    const filterOrder: MessageStatusFilter[] = ['all', 'draft', 'sent', 'replied'];
    const currentIndex = filterOrder.indexOf(messageStatusFilter);
    setMessageStatusFilter(filterOrder[(currentIndex + 1) % filterOrder.length]);
  };

  const handleSaveMessage = async (status: UserMessage['status']) => {
    const recipient = messageDraft.recipient.trim() || activeMessageThread?.recipient.trim() || '';
    const subject = messageDraft.subject.trim() || activeMessageThread?.latest.subject || (isInvestor ? 'Investor follow-up' : 'Founder follow-up');
    const body = messageDraft.body.trim();
    const context = messageDraft.context || activeMessageThread?.latest.context || '';

    if (!recipient) {
      setDashboardError('Recipient is required.');
      return;
    }

    if (!body) {
      setDashboardError('Message body is required.');
      return;
    }

    setSavingWorkflow('message');
    setDashboardError('');

    try {
      const savedMessage = await saveMessage(user, {
        recipient,
        subject,
        body,
        context,
        status,
      });
      setMessages((current) => [savedMessage, ...current.filter((message) => message.id !== savedMessage.id)]);
      setMessageDraft({
        recipient: savedMessage.recipient,
        subject: savedMessage.subject,
        body: '',
        status: 'draft',
        context: savedMessage.context,
      });
      setSelectedMessageThreadId(savedMessage.recipient.toLowerCase());
      setIsMessageFormOpen(false);
      addActivity(`${status === 'sent' ? 'Sent' : 'Saved'} message to ${savedMessage.recipient}`);
    } catch (error) {
      setDashboardError(error instanceof Error ? error.message : 'Unable to save message.');
    } finally {
      setSavingWorkflow(null);
    }
  };

  const handleMessageSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    handleSaveMessage('sent');
  };

  const handleFeedToggle = async (item: FeedItem, key: 'saved' | 'reposted') => {
    const nextItem = { ...item, [key]: !item[key] };
    setFeedRows((current) => current.map((feedItem) => (feedItem.id === item.id ? nextItem : feedItem)));

    try {
      await saveFeedAction(user, item.id, {
        saved: nextItem.saved,
        reposted: nextItem.reposted,
        reply: nextItem.reply,
      });
      addActivity(`${key === 'saved' ? 'Saved' : 'Reposted'}: ${item.title}`);
    } catch (error) {
      setDashboardError(error instanceof Error ? error.message : 'Unable to save feed action.');
    }
  };

  const handleFeedReply = async (item: FeedItem) => {
    const replyBody = `Draft reply to ${item.actor}: ${item.title}`;
    setFeedRows((current) =>
      current.map((feedItem) => (feedItem.id === item.id ? { ...feedItem, reply: replyBody } : feedItem)),
    );

    try {
      await saveMessage(user, {
        recipient: item.actor,
        subject: `Re: ${item.title}`,
        body: replyBody,
        status: 'draft',
        context: item.id,
      });
      await saveFeedAction(user, item.id, {
        saved: item.saved,
        reposted: item.reposted,
        reply: replyBody,
      });
      setMessages((current) => [
        {
          id: `message-${item.id}`,
          ownerId: user.id,
          recipient: item.actor,
          subject: `Re: ${item.title}`,
          body: replyBody,
          status: 'draft',
          context: item.id,
          updatedAt: new Date().toISOString(),
        },
        ...current,
      ]);
      addActivity(`Reply draft created: ${item.title}`);
    } catch (error) {
      setDashboardError(error instanceof Error ? error.message : 'Unable to create reply draft.');
    }
  };

  const handleDashboardSearchAction = (action: Action) => {
    const openWorkspaceSection = (id: string) => {
      setActiveView(viewFromSectionId(id));
      navigate(`${dashboardBasePath}#${id}`);
      window.setTimeout(() => scrollToSection(id), 50);
    };

    const actionMap: Record<string, () => void> = {
      'open-criteria': () => openWorkspaceSection('profile'),
      'open-signals': () => openWorkspaceSection('matches'),
      'open-deals': () => openWorkspaceSection('deals'),
      'open-digest': () => openWorkspaceSection('digest'),
      'open-profile': () => openWorkspaceSection('profile'),
      'open-launches': () => {
        setActiveView('products');
        navigate('/dashboard/founder/products');
        window.setTimeout(() => scrollToSection('products'), 50);
      },
      'open-deal-room': () => openWorkspaceSection('deals'),
      'open-meetups': () => openWorkspaceSection('meetups'),
      'open-map': () => openWorkspaceSection('map'),
      'open-terms': () => openWorkspaceSection('terms'),
      'open-messages': () => openWorkspaceSection('messages'),
      'view-for-you': () => {
        setActiveView('for-you');
        navigate(`${dashboardBasePath}#for-you`);
        window.setTimeout(() => scrollToSection('for-you'), 50);
      },
      'query-ai': () => setQuery('AI infra'),
      'query-devtools': () => {
        setActiveView('matches');
        navigate(`${dashboardBasePath}#matches`);
        setQuery('devtools');
        window.setTimeout(() => scrollToSection('matches'), 50);
      },
      'query-investors': () => {
        setActiveView('matches');
        navigate(`${dashboardBasePath}#matches`);
        setQuery('investor');
        window.setTimeout(() => scrollToSection('matches'), 50);
      },
    };

    actionMap[action.id]?.();
    addActivity(`Search action: ${action.label}`);
  };

  const handleDashboardViewChange = (value: string) => {
    const nextView = value as ViewMode;
    setActiveView(nextView);
    const sectionId = sectionIdFromView(nextView);
    if (nextView === 'products') {
      navigate('/dashboard/founder/products');
    } else if (nextView === 'vc-heatmap') {
      navigate('/dashboard/founder/vc-heatmap');
    } else {
      navigate(`${dashboardBasePath}#${sectionId}`);
    }
    window.setTimeout(() => scrollToSection(sectionId), 50);
  };

  const renderProfilePage = () => {
    const pastProducts = (intakeValues.pastProducts ?? '')
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean);
    const profileName = intakeValues.profileName || user.email || 'Founder on Apparent';
    const profileHeadline = intakeValues.headline || 'Founder profile on Apparent';

    return (
      <motion.div
        key="profile-main"
        initial={{ opacity: 0, y: 10, filter: 'blur(2px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        exit={{ opacity: 0, y: -8, filter: 'blur(2px)' }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
      >
        <div id="profile" className="mx-auto max-w-[1292px] scroll-mt-24 space-y-6">
          {isInvestor ? (
            <>
              {/* Header — mirrors founder avatar/name card exactly */}
              <section className="border-y border-black/10 bg-white">
                <div className="px-5 py-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-[24px] bg-[#42520d] text-2xl font-semibold text-white shadow-sm">
                        {getInitials(user.email.split('@')[0].replace(/[._-]+/g, ' '))}
                      </div>
                      <div className="pb-1">
                        <h2 className="text-2xl font-semibold tracking-[-0.03em]">
                          {user.email.split('@')[0].replace(/[._-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                        </h2>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">Investor profile on Apparent</p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Thesis fields — same divide-y card as founder "Your Profile" */}
              <section className="border-y border-black/10 bg-white">
                <div className="flex flex-col gap-3 border-b border-black/10 px-5 py-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="text-sm font-semibold">Your Thesis</h3>
                    <p className="mt-1 text-xs text-gray-500">Capture the thesis, stage, geography, and founder signals that shape your sourcing and rank your deal flow.</p>
                  </div>
                  <span className="rounded-full bg-[#f4f1eb] px-3 py-1.5 text-xs text-gray-600">{completedFieldCount}/{intakeFields.length} complete</span>
                </div>
                <div className="divide-y divide-black/10">
                  {investorIntakeFields.map((field) => (
                    <label key={field.key} className="grid gap-3 px-5 py-4 transition-colors hover:bg-[#fbf8f3] md:grid-cols-[260px_1fr]">
                      <div>
                        <p className="text-sm font-medium">{field.label}</p>
                        <p className="mt-1 text-xs text-gray-400">{intakeValues[field.key]?.trim() ? 'Captured' : 'Optional'}</p>
                      </div>
                      {field.kind === 'textarea' ? (
                        <textarea value={intakeValues[field.key] ?? ''} onChange={(event) => handleIntakeChange(field.key, event.target.value)} placeholder={field.placeholder} className="min-h-20 w-full resize-none border-0 bg-transparent text-sm leading-relaxed outline-none placeholder:text-gray-400" />
                      ) : field.kind === 'select' ? (
                        <select value={intakeValues[field.key] ?? ''} onChange={(event) => handleIntakeChange(field.key, event.target.value)} className="h-8 w-full border-0 bg-transparent text-sm outline-none">
                          <option value="">{field.placeholder}</option>
                          {field.options?.map((option) => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      ) : (
                        <input value={intakeValues[field.key] ?? ''} onChange={(event) => handleIntakeChange(field.key, event.target.value)} placeholder={field.placeholder} className="h-8 w-full border-0 bg-transparent text-sm outline-none placeholder:text-gray-400" />
                      )}
                    </label>
                  ))}
                </div>
                <div className="flex flex-col gap-3 border-t border-black/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-xs text-gray-400">
                    {autoSaveStatus === 'saving' && 'Auto-saving…'}
                    {autoSaveStatus === 'saved' && '✓ Saved'}
                    {autoSaveStatus === 'error' && 'Auto-save failed — use the button'}
                  </span>
                  <button className={`rounded-full ${accentSurface} px-5 py-2.5 text-sm font-medium ${accentForeground} transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60`} onClick={handleSaveProfile} disabled={isSavingWorkspace}>
                    {isSavingWorkspace ? 'Saving...' : 'Save thesis'}
                  </button>
                </div>
              </section>

              {/* Bottom grid — mirrors founder "Products + Past products" layout */}
              <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
                <div className="border-y border-black/10 bg-white">
                  <div className="flex items-center justify-between border-b border-black/10 px-5 py-4">
                    <div>
                      <h3 className="text-sm font-semibold">Top ranked signals</h3>
                      <p className="mt-1 text-xs text-gray-500">Your highest-scoring deals based on your current thesis. Goes up as you refine your criteria above.</p>
                    </div>
                    <button type="button" className={`rounded-full ${accentSurface} px-3 py-1.5 text-xs font-semibold ${accentForeground}`} onClick={() => handleDashboardViewChange('deals')}>
                      View all
                    </button>
                  </div>
                  <div className="divide-y divide-black/10">
                    {signalRows.slice(0, 5).map((signal) => (
                      <article key={signal.id} className="px-5 py-4">
                        <div className="flex items-start gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[14px] bg-[#f7f3e4] text-xs font-semibold text-[#42520d]">
                            {signal.company.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-semibold">{signal.company}</p>
                              <span className="shrink-0 rounded-full bg-[#f4f1eb] px-2 py-0.5 text-xs text-gray-600">{signal.relevance}</span>
                            </div>
                            <p className="mt-1 line-clamp-2 text-sm leading-5 text-gray-500">{signal.detail}</p>
                            <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-400">
                              <span>{signal.source}</span>
                              <span>·</span>
                              <span>{signal.freshness}</span>
                            </div>
                          </div>
                        </div>
                      </article>
                    ))}
                    {signalRows.length === 0 && (
                      <div className="px-5 py-10 text-sm leading-6 text-gray-500">No signals yet. Save your thesis above to start seeing ranked deal flow.</div>
                    )}
                  </div>
                </div>

                <aside className="border-y border-black/10 bg-white">
                  <div className="border-b border-black/10 px-5 py-4">
                    <h3 className="text-sm font-semibold">Portfolio calibration</h3>
                    <p className="mt-1 text-xs text-gray-500">Companies from your taste list, used to calibrate signal ranking.</p>
                  </div>
                  <div className="divide-y divide-black/10">
                    {(intakeValues.portfolioExamples ?? '').split(',').map((s) => s.trim()).filter(Boolean).map((company) => (
                      <div key={company} className="px-5 py-3 text-sm text-gray-700">{company}</div>
                    ))}
                    {!(intakeValues.portfolioExamples ?? '').trim() && (
                      <div className="px-5 py-8 text-sm leading-6 text-gray-500">Add portfolio examples in your thesis to calibrate your signal ranking.</div>
                    )}
                  </div>
                </aside>
              </section>
            </>
          ) : (
            <>
              <section className="border-y border-black/10 bg-white">
                <div className="px-5 py-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-[24px] bg-[#dcefc7] text-2xl font-semibold text-black shadow-sm">
                        {intakeValues.profilePhotoUrl ? (
                          <img src={intakeValues.profilePhotoUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          getInitials(profileName)
                        )}
                      </div>
                      <div className="pb-1">
                        <h2 className="text-2xl font-semibold tracking-[-0.03em]">{profileName}</h2>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">{profileHeadline}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <label className="cursor-pointer rounded-full border border-black/10 px-3 py-1.5 text-xs font-semibold hover:bg-[#fbf8f3]">
                        <input type="file" accept="image/*" className="hidden" onChange={(event) => handleProfileAssetUpload(event.target.files?.[0])} />
                        Upload photo
                      </label>
                    </div>
                  </div>
                  <div className="mt-5">
                    <input value={intakeValues.profilePhotoUrl ?? ''} onChange={(event) => handleIntakeChange('profilePhotoUrl', event.target.value)} placeholder="Profile photo URL" className="h-9 border border-black/10 bg-white px-3 text-sm outline-none placeholder:text-gray-400 focus:border-black/30" />
                  </div>
                </div>
              </section>

              <section className="border-y border-black/10 bg-white">
                <div className="flex flex-col gap-3 border-b border-black/10 px-5 py-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="text-sm font-semibold">Your Profile</h3>
                    <p className="mt-1 text-xs text-gray-500">Build your founder presence for people you want to meet. Product traction belongs on individual launches.</p>
                  </div>
                  <span className="rounded-full bg-[#f4f1eb] px-3 py-1.5 text-xs text-gray-600">{completedFieldCount}/{intakeFields.length} complete</span>
                </div>
                <div className="divide-y divide-black/10">
                  {founderIntakeFields.map((field) => (
                    <label key={field.key} className="grid gap-3 px-5 py-4 transition-colors hover:bg-[#fbf8f3] md:grid-cols-[260px_1fr]">
                      <div>
                        <p className="text-sm font-medium">{field.label}</p>
                        <p className="mt-1 text-xs text-gray-400">{intakeValues[field.key]?.trim() ? 'Captured' : 'Optional'}</p>
                      </div>
                      {field.kind === 'textarea' ? (
                        <textarea value={intakeValues[field.key] ?? ''} onChange={(event) => handleIntakeChange(field.key, event.target.value)} placeholder={field.placeholder} className="min-h-20 w-full resize-none border-0 bg-transparent text-sm leading-relaxed outline-none placeholder:text-gray-400" />
                      ) : field.kind === 'select' ? (
                        <select value={intakeValues[field.key] ?? ''} onChange={(event) => handleIntakeChange(field.key, event.target.value)} className="h-8 w-full border-0 bg-transparent text-sm outline-none">
                          <option value="">{field.placeholder}</option>
                          {field.options?.map((option) => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      ) : (
                        <input value={intakeValues[field.key] ?? ''} onChange={(event) => handleIntakeChange(field.key, event.target.value)} placeholder={field.placeholder} className="h-8 w-full border-0 bg-transparent text-sm outline-none placeholder:text-gray-400" />
                      )}
                    </label>
                  ))}
                </div>
                <div className="flex flex-col gap-3 border-t border-black/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-end">
                  <button className={`rounded-full ${accentSurface} px-5 py-2.5 text-sm font-medium ${accentForeground} transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60`} onClick={handleSaveProfile} disabled={isSavingWorkspace}>
                    {isSavingWorkspace ? 'Saving...' : 'Save profile'}
                  </button>
                </div>
              </section>

              <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
                <div className="border-y border-black/10 bg-white">
                  <div className="flex items-center justify-between border-b border-black/10 px-5 py-4">
                    <div>
                      <h3 className="text-sm font-semibold">Products launched on Apparent</h3>
                      <p className="mt-1 text-xs text-gray-500">Anything you launch from Products appears here automatically.</p>
                    </div>
                    <button type="button" className={`rounded-full ${accentSurface} px-3 py-1.5 text-xs font-semibold ${accentForeground}`} onClick={() => handleDashboardViewChange('products')}>
                      Add product
                    </button>
                  </div>
                  <div className="divide-y divide-black/10">
                    {productLaunches.map((launch) => (
                      <article key={launch.id} className="px-5 py-4">
                        <div className="flex items-start gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[14px] bg-[#fbfaf7]">
                            {launch.logoUrl ? <img src={launch.logoUrl} alt="" className="h-full w-full object-cover" /> : <LogoIcon className="h-5 w-5 text-black" />}
                          </div>
                          <div>
                            <p className="text-sm font-semibold">{launch.name}</p>
                            <p className="mt-1 text-sm leading-6 text-gray-600">{launch.tagline}</p>
                            <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500">
                              <span>{launch.category || 'Product'}</span>
                              <span>-</span>
                              <span>{launch.stage || 'Launched'}</span>
                            </div>
                          </div>
                        </div>
                      </article>
                    ))}
                    {productLaunches.length === 0 && (
                      <div className="px-5 py-10 text-sm leading-6 text-gray-500">No Apparent launches yet. You can still use your profile to meet founders, investors, and collaborators.</div>
                    )}
                  </div>
                </div>

                <aside className="border-y border-black/10 bg-white">
                  <div className="border-b border-black/10 px-5 py-4">
                    <h3 className="text-sm font-semibold">Past products</h3>
                    <p className="mt-1 text-xs text-gray-500">Projects you list on your profile, even if they were not launched here.</p>
                  </div>
                  <div className="divide-y divide-black/10">
                    {pastProducts.map((product) => (
                      <div key={product} className="px-5 py-3 text-sm text-gray-700">{product}</div>
                    ))}
                    {pastProducts.length === 0 && (
                      <div className="px-5 py-8 text-sm leading-6 text-gray-500">Add past products in your profile details to show your build history.</div>
                    )}
                  </div>
                </aside>
              </section>
            </>
          )}
        </div>
      </motion.div>
    );
  };

  const renderProductsPage = () => {
    const liveLaunch = selectedLiveLaunch;
    const liveEngagement = liveLaunch ? getLaunchEngagement(liveLaunch) : null;

    return (
      <motion.div
        key="products-main"
        initial={{ opacity: 0, y: 10, filter: 'blur(2px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        exit={{ opacity: 0, y: -8, filter: 'blur(2px)' }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
      >
        <div id="products" className="mx-auto max-w-[1292px] scroll-mt-24 space-y-6">
          <section className="border-y border-black/10 bg-white">
            <div className="flex flex-col gap-4 px-5 py-5 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-3">
                <span className={`mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${accentSurface} ${accentForeground}`}>
                  <Rocket className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em]">Launch into Apparent</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
                    Add the product, proof, and traction investors need to evaluate the launch. Once it is live, the launch can be discovered, upvoted, commented on, and connected back to your founder profile.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="rounded-full bg-[#f4f1eb] px-3 py-1.5 font-medium text-gray-600">
                  {productLaunches.length} live
                </span>
                <span className="rounded-full bg-[#dcefc7] px-3 py-1.5 font-semibold text-black">
                  {launchCompletion}% ready
                </span>
              </div>
            </div>
          </section>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <section className="border-y border-black/10 bg-white">
              <div className="flex items-center justify-between border-b border-black/10 px-5 py-4">
                <div>
                  <h3 className="text-sm font-semibold">Launch details</h3>
                  <p className="mt-1 text-xs text-gray-500">This is the public submission investors and founders will browse.</p>
                </div>
                <button
                  type="button"
                  className="rounded-full border border-black/10 px-3 py-1.5 text-xs font-semibold hover:bg-[#fbf8f3]"
                  onClick={handleResetLaunchDraft}
                >
                  Reset
                </button>
              </div>

              <div className="divide-y divide-black/10">
                <label className="grid gap-3 px-5 py-4 md:grid-cols-[220px_1fr]">
                  <span>
                    <span className="block text-sm font-medium">Product name</span>
                    <span className="mt-1 block text-xs text-gray-400">What people will click first.</span>
                  </span>
                  <input
                    className="h-9 w-full border-0 bg-transparent text-sm outline-none placeholder:text-gray-400"
                    placeholder="KernelTrace"
                    value={launchDraft.name}
                    onChange={(event) => setLaunchDraft((current) => ({ ...current, name: event.target.value }))}
                  />
                </label>

                <label className="grid gap-3 px-5 py-4 md:grid-cols-[220px_1fr]">
                  <span>
                    <span className="block text-sm font-medium">Tagline</span>
                    <span className="mt-1 block text-xs text-gray-400">Plain English, one sentence.</span>
                  </span>
                  <input
                    className="h-9 w-full border-0 bg-transparent text-sm outline-none placeholder:text-gray-400"
                    placeholder="GitHub-native analytics for engineering leaders."
                    value={launchDraft.tagline}
                    onChange={(event) => setLaunchDraft((current) => ({ ...current, tagline: event.target.value }))}
                  />
                </label>

                <div className="grid gap-3 px-5 py-4 md:grid-cols-[220px_1fr]">
                  <div>
                    <p className="text-sm font-medium">Category and stage</p>
                    <p className="mt-1 text-xs text-gray-400">Used for matching and discovery filters.</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input
                      className="h-9 w-full border-0 bg-transparent text-sm outline-none placeholder:text-gray-400"
                      placeholder="AI devtools"
                      value={launchDraft.category}
                      onChange={(event) => setLaunchDraft((current) => ({ ...current, category: event.target.value }))}
                    />
                    <select
                      className="h-9 w-full border-0 bg-transparent text-sm outline-none"
                      value={launchDraft.stage}
                      onChange={(event) => setLaunchDraft((current) => ({ ...current, stage: event.target.value }))}
                    >
                      {founderStageOptions.map((stage) => (
                        <option key={stage} value={stage}>
                          {stage}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <label className="grid gap-3 px-5 py-4 md:grid-cols-[220px_1fr]">
                  <span>
                    <span className="block text-sm font-medium">Company location</span>
                    <span className="mt-1 block text-xs text-gray-400">Shown on the public project profile.</span>
                  </span>
                  <input
                    className="h-9 w-full border-0 bg-transparent text-sm outline-none placeholder:text-gray-400"
                    placeholder={intakeValues.location || 'San Francisco, Remote, New York'}
                    value={launchDraft.location}
                    onChange={(event) => setLaunchDraft((current) => ({ ...current, location: event.target.value }))}
                  />
                </label>

                <div className="grid gap-3 px-5 py-4 md:grid-cols-[220px_1fr]">
                  <div>
                    <p className="text-sm font-medium">Links</p>
                    <p className="mt-1 text-xs text-gray-400">Product URL plus one proof source.</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input
                      className="h-9 w-full border-0 bg-transparent text-sm outline-none placeholder:text-gray-400"
                      placeholder="https://yourproduct.com"
                      value={launchDraft.launchUrl}
                      onChange={(event) => setLaunchDraft((current) => ({ ...current, launchUrl: event.target.value }))}
                    />
                    <input
                      className="h-9 w-full border-0 bg-transparent text-sm outline-none placeholder:text-gray-400"
                      placeholder="GitHub, demo, customer story"
                      value={launchDraft.proofUrl}
                      onChange={(event) => setLaunchDraft((current) => ({ ...current, proofUrl: event.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid gap-3 px-5 py-4 md:grid-cols-[220px_1fr]">
                  <div>
                    <p className="text-sm font-medium">Brand assets</p>
                    <p className="mt-1 text-xs text-gray-400">Logo and banner for the launch page.</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="group cursor-pointer rounded-[14px] bg-[#fbfaf7] p-3 transition-colors hover:bg-[#f4f1eb]">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(event) => handleLaunchAssetUpload('logoUrl', event.target.files?.[0])}
                      />
                      <span className="flex items-center gap-3">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white">
                          {launchDraft.logoUrl ? (
                            <img src={launchDraft.logoUrl} alt="" className="h-8 w-8 rounded-lg object-cover" />
                          ) : (
                            <Image className="h-5 w-5 text-gray-500" />
                          )}
                        </span>
                        <span>
                          <span className="block text-sm font-semibold">Upload logo</span>
                          <span className="mt-1 block text-xs text-gray-400">Square mark</span>
                        </span>
                      </span>
                    </label>
                    <label className="group cursor-pointer rounded-[14px] bg-[#fbfaf7] p-3 transition-colors hover:bg-[#f4f1eb]">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(event) => handleLaunchAssetUpload('bannerUrl', event.target.files?.[0])}
                      />
                      <span className="flex items-center gap-3">
                        <span className="flex h-11 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white">
                          {launchDraft.bannerUrl ? (
                            <img src={launchDraft.bannerUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <Image className="h-5 w-5 text-gray-500" />
                          )}
                        </span>
                        <span>
                          <span className="block text-sm font-semibold">Upload banner</span>
                          <span className="mt-1 block text-xs text-gray-400">Wide image</span>
                        </span>
                      </span>
                    </label>
                    <input
                      className="h-9 w-full border-0 bg-transparent text-sm outline-none placeholder:text-gray-400"
                      placeholder="Logo image URL"
                      value={launchDraft.logoUrl}
                      onChange={(event) => setLaunchDraft((current) => ({ ...current, logoUrl: event.target.value }))}
                    />
                    <input
                      className="h-9 w-full border-0 bg-transparent text-sm outline-none placeholder:text-gray-400"
                      placeholder="Banner image URL"
                      value={launchDraft.bannerUrl}
                      onChange={(event) => setLaunchDraft((current) => ({ ...current, bannerUrl: event.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid gap-3 px-5 py-4 md:grid-cols-[220px_1fr]">
                  <div>
                    <p className="text-sm font-medium">Intro and demo</p>
                    <p className="mt-1 text-xs text-gray-400">What shipped and how the product works.</p>
                  </div>
                  <div className="grid gap-3">
                    <textarea
                      className="min-h-24 w-full resize-none border-0 bg-transparent text-sm leading-relaxed outline-none placeholder:text-gray-400"
                      placeholder="What did you build, who is it for, and why does it matter now?"
                      value={launchDraft.intro}
                      onChange={(event) => setLaunchDraft((current) => ({ ...current, intro: event.target.value }))}
                    />
                    <label className="flex cursor-pointer items-center gap-3 rounded-[14px] bg-[#fbfaf7] p-3 transition-colors hover:bg-[#f4f1eb]">
                      <input
                        type="file"
                        accept="video/*"
                        className="hidden"
                        onChange={(event) => handleLaunchAssetUpload('demoVideoUrl', event.target.files?.[0])}
                      />
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white">
                        <Video className="h-5 w-5 text-gray-500" />
                      </span>
                      <span>
                        <span className="block text-sm font-semibold">Upload demo video</span>
                        <span className="mt-1 block text-xs text-gray-400">Product walkthrough</span>
                      </span>
                    </label>
                    <input
                      className="h-9 w-full border-0 bg-transparent text-sm outline-none placeholder:text-gray-400"
                      placeholder="Demo video URL"
                      value={launchDraft.demoVideoUrl}
                      onChange={(event) => setLaunchDraft((current) => ({ ...current, demoVideoUrl: event.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid gap-3 px-5 py-4 md:grid-cols-[220px_1fr]">
                  <div>
                    <p className="text-sm font-medium">Team</p>
                    <p className="mt-1 text-xs text-gray-400">One member per line: name - role - bio - Apparent profile URL.</p>
                  </div>
                  <div className="grid gap-3">
                    <textarea
                      className="min-h-20 w-full resize-none border-0 bg-transparent text-sm leading-relaxed outline-none placeholder:text-gray-400"
                      placeholder="Maya Chen - Founder & CEO - Built infra tooling at scale - /profile/user-id"
                      value={launchDraft.teamMembersText}
                      onChange={(event) => setLaunchDraft((current) => ({ ...current, teamMembersText: event.target.value }))}
                    />
                    <textarea
                      className="min-h-20 w-full resize-none border-0 bg-transparent text-sm leading-relaxed outline-none placeholder:text-gray-400"
                      placeholder="Team summary: who is building this, why this team, notable background."
                      value={launchDraft.teamSummary}
                      onChange={(event) => setLaunchDraft((current) => ({ ...current, teamSummary: event.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid gap-3 px-5 py-4 md:grid-cols-[220px_1fr]">
                  <div>
                    <p className="text-sm font-medium">Company profile details</p>
                    <p className="mt-1 text-xs text-gray-400">Public context for the full project page.</p>
                  </div>
                  <div className="grid gap-3">
                    <textarea
                      className="min-h-20 w-full resize-none border-0 bg-transparent text-sm leading-relaxed outline-none placeholder:text-gray-400"
                      placeholder="Customer pull, usage, revenue, pilots, waitlist, or deployment context."
                      value={launchDraft.customerSummary}
                      onChange={(event) => setLaunchDraft((current) => ({ ...current, customerSummary: event.target.value }))}
                    />
                    <input
                      className="h-9 w-full border-0 bg-transparent text-sm outline-none placeholder:text-gray-400"
                      placeholder="Tech stack: React, Postgres, agents, evals, Python"
                      value={launchDraft.techStack}
                      onChange={(event) => setLaunchDraft((current) => ({ ...current, techStack: event.target.value }))}
                    />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <input
                        className="h-9 w-full border-0 bg-transparent text-sm outline-none placeholder:text-gray-400"
                        placeholder="Funding status"
                        value={launchDraft.fundingStatus}
                        onChange={(event) => setLaunchDraft((current) => ({ ...current, fundingStatus: event.target.value }))}
                      />
                      <input
                        className="h-9 w-full border-0 bg-transparent text-sm outline-none placeholder:text-gray-400"
                        placeholder="Looking for"
                        value={launchDraft.lookingFor}
                        onChange={(event) => setLaunchDraft((current) => ({ ...current, lookingFor: event.target.value }))}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 px-5 py-4 md:grid-cols-[220px_1fr]">
                  <div>
                    <p className="text-sm font-medium">Pitch Book</p>
                    <p className="mt-1 text-xs text-gray-400">Optional investor material attached to this launch.</p>
                  </div>
                  <div className="grid gap-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <label className="flex cursor-pointer items-center gap-3 rounded-[14px] bg-[#fbfaf7] p-3 transition-colors hover:bg-[#f4f1eb]">
                          <input
                            type="file"
                            accept="video/*"
                            className="hidden"
                            onChange={(event) => handleLaunchAssetUpload('pitchVideoUrl', event.target.files?.[0])}
                          />
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white">
                            <Video className="h-5 w-5 text-gray-500" />
                          </span>
                          <span>
                            <span className="block text-sm font-semibold">30-second pitch</span>
                            <span className="mt-1 block text-xs text-gray-400">Founder video</span>
                          </span>
                        </label>
                        <input
                          className="h-9 w-full border-0 bg-transparent text-sm outline-none placeholder:text-gray-400"
                          placeholder="30-second pitch video URL"
                          value={launchDraft.pitchVideoUrl}
                          onChange={(event) => setLaunchDraft((current) => ({ ...current, pitchVideoUrl: event.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="flex cursor-pointer items-center gap-3 rounded-[14px] bg-[#fbfaf7] p-3 transition-colors hover:bg-[#f4f1eb]">
                          <input
                            type="file"
                            accept=".pdf,.ppt,.pptx,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                            className="hidden"
                            onChange={(event) => handleLaunchAssetUpload('pitchDeckUrl', event.target.files?.[0])}
                          />
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white">
                            <FileText className="h-5 w-5 text-gray-500" />
                          </span>
                          <span>
                            <span className="block text-sm font-semibold">Pitch deck</span>
                            <span className="mt-1 block text-xs text-gray-400">PDF or deck file</span>
                          </span>
                        </label>
                        <input
                          className="h-9 w-full border-0 bg-transparent text-sm outline-none placeholder:text-gray-400"
                          placeholder="Pitch deck URL"
                          value={launchDraft.pitchDeckUrl}
                          onChange={(event) => setLaunchDraft((current) => ({ ...current, pitchDeckUrl: event.target.value }))}
                        />
                      </div>
                    </div>
                    <textarea
                      className="min-h-20 w-full resize-none border-0 bg-transparent text-sm leading-relaxed outline-none placeholder:text-gray-400"
                      placeholder="Short investor note: why now, who is pulling, and what kind of help or capital would be useful."
                      value={launchDraft.pitchBookNote}
                      onChange={(event) => setLaunchDraft((current) => ({ ...current, pitchBookNote: event.target.value }))}
                    />
                    <div className="flex flex-wrap gap-2">
                      {(['public', 'investors'] as const).map((visibility) => (
                        <button
                          key={visibility}
                          type="button"
                          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                            launchDraft.pitchVisibility === visibility ? `${accentSurface} ${accentForeground}` : 'bg-[#fbfaf7] text-black/60 hover:bg-[#f4f1eb]'
                          }`}
                          onClick={() => setLaunchDraft((current) => ({ ...current, pitchVisibility: visibility }))}
                        >
                          {visibility === 'public' ? 'Public launch' : 'Investors only'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 px-5 py-4 md:grid-cols-[220px_1fr]">
                  <div>
                    <p className="text-sm font-medium">Founder background signals</p>
                    <p className="mt-1 text-xs text-gray-400">Optional, self-selected, and used for investor discovery filters.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {founderSignalOptions.map((signal) => {
                      const isSelected = launchDraft.founderSignals.includes(signal);

                      return (
                        <button
                          key={signal}
                          type="button"
                          className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                            isSelected ? `${accentSurface} border-transparent ${accentForeground}` : 'border-black/10 text-black/60 hover:bg-[#fbfaf7]'
                          }`}
                          onClick={() => toggleLaunchFounderSignal(signal)}
                        >
                          {signal}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <label className="grid gap-3 px-5 py-4 md:grid-cols-[220px_1fr]">
                  <span>
                    <span className="block text-sm font-medium">Proof and traction</span>
                    <span className="mt-1 block text-xs text-gray-400">Customers, revenue, usage, stars, waitlist, pilots.</span>
                  </span>
                  <textarea
                    className="min-h-24 w-full resize-none border-0 bg-transparent text-sm leading-relaxed outline-none placeholder:text-gray-400"
                    placeholder="Two design partners, 1,200 weekly runs, 340 GitHub stars."
                    value={launchDraft.metrics}
                    onChange={(event) => setLaunchDraft((current) => ({ ...current, metrics: event.target.value }))}
                  />
                </label>
              </div>

              <div className="flex flex-col gap-3 border-t border-black/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs leading-5 text-gray-500">
                  Launching here makes the product eligible for the Apparent front page, investor discovery, comments, and founder profile traffic.
                </p>
                <button
                  type="button"
                  className={`inline-flex items-center justify-center gap-2 rounded-full ${accentSurface} px-5 py-2.5 text-sm font-semibold ${accentForeground} transition-colors hover:bg-[#cfe8b8] disabled:cursor-not-allowed disabled:opacity-60`}
                  onClick={handleSaveProductLaunch}
                  disabled={savingWorkflow === 'launch'}
                >
                  <LogoIcon className="h-4 w-4 shrink-0 text-current" />
                  {savingWorkflow === 'launch' ? 'Launching...' : 'Launch on Apparent'}
                </button>
              </div>
            </section>

            <aside className="space-y-6">
              <section className="border-y border-black/10 bg-white">
                <div className="border-b border-black/10 px-5 py-4">
                  <h3 className="text-sm font-semibold">Public preview</h3>
                  <p className="mt-1 text-xs text-gray-500">How the launch card starts to feel in discovery.</p>
                </div>
                <div className="px-5 py-5">
                  <div className="mb-4 aspect-[16/7] overflow-hidden rounded-[18px] bg-[#fbfaf7]">
                    {launchDraft.bannerUrl ? (
                      <img src={launchDraft.bannerUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs font-semibold uppercase tracking-[0.14em] text-gray-300">
                        Banner
                      </div>
                    )}
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-[#fbfaf7]">
                      {launchDraft.logoUrl ? (
                        <img src={launchDraft.logoUrl} alt="" className="h-8 w-8 rounded-lg object-cover" />
                      ) : (
                        <LogoIcon className="h-6 w-6 text-black" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-lg font-semibold tracking-[-0.02em]">
                          {launchDraft.name || 'Your product'}
                        </p>
                        <span className="rounded-full bg-[#dcefc7] px-2.5 py-0.5 text-xs font-semibold text-black">
                          {launchDraft.stage}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-gray-600">
                        {launchDraft.tagline || 'A clear one-line product pitch will appear here.'}
                      </p>
                      {launchDraft.intro && (
                        <p className="mt-2 text-xs leading-5 text-gray-500">{launchDraft.intro}</p>
                      )}
                      <p className="mt-3 text-xs font-semibold text-gray-400">
                        {launchDraft.category || 'Category'} - {intakeValues.location || 'Location'} - by your profile
                      </p>
                    </div>
                  </div>
                  {(launchDraft.demoVideoUrl || launchDraft.pitchVideoUrl) && (
                    <div className="mt-5 grid gap-3">
                      {launchDraft.demoVideoUrl && (
                        <video className="aspect-video w-full rounded-[16px] bg-black object-cover" src={launchDraft.demoVideoUrl} controls />
                      )}
                      {launchDraft.pitchVideoUrl && (
                        <video className="aspect-video w-full rounded-[16px] bg-black object-cover" src={launchDraft.pitchVideoUrl} controls />
                      )}
                    </div>
                  )}
                  {(launchDraft.pitchDeckUrl || launchDraft.pitchBookNote || launchDraft.founderSignals.length > 0) && (
                    <div className="mt-5 rounded-[16px] bg-[#fbfaf7] p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-black/40">Pitch Book</p>
                        <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-black/55">
                          {launchDraft.pitchVisibility === 'investors' ? 'Investors only' : 'Public'}
                        </span>
                      </div>
                      {launchDraft.pitchBookNote && (
                        <p className="mt-3 text-xs leading-5 text-gray-500">{launchDraft.pitchBookNote}</p>
                      )}
                      {launchDraft.pitchDeckUrl && (
                        <a
                          href={launchDraft.pitchDeckUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#02A070]"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          Open pitch deck
                        </a>
                      )}
                      {launchDraft.founderSignals.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {launchDraft.founderSignals.map((signal) => (
                            <span key={signal} className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-black/55">
                              {signal}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  <div className="mt-5 flex items-center gap-4 text-sm font-semibold text-black/60">
                    <span className="inline-flex items-center gap-1.5">
                      <ChevronUp className="h-4 w-4 text-[#02A070]" />
                      0
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-black/45">
                      <MessageSquare className="h-4 w-4" />
                      0
                    </span>
                    <span className="ml-auto rounded-full bg-[#f4f1eb] px-3.5 py-2 text-xs font-semibold text-black/70">
                      View
                    </span>
                  </div>
                </div>
              </section>

              <section className="border-y border-black/10 bg-white">
                <div className="border-b border-black/10 px-5 py-4">
                  <h3 className="text-sm font-semibold">Launch readiness</h3>
                </div>
                <div className="divide-y divide-black/10">
                  {launchChecklist.map((item) => (
                    <div key={item.label} className="flex items-center justify-between px-5 py-3 text-sm">
                      <span className={item.done ? 'text-black' : 'text-gray-500'}>{item.label}</span>
                      <span className={`h-2.5 w-2.5 rounded-full ${item.done ? 'bg-[#dcefc7]' : 'bg-black/15'}`} />
                    </div>
                  ))}
                </div>
              </section>
            </aside>
          </div>

          <section className="border-y border-black/10 bg-white">
            <div className="flex flex-col gap-2 border-b border-black/10 px-5 py-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-sm font-semibold">Live launches</h3>
                <p className="mt-1 text-xs text-gray-500">This is the interaction surface investors and other founders will use.</p>
              </div>
              {liveLaunch && (
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#02A070]"
                  onClick={() => setSelectedLaunchId(liveLaunch.id)}
                >
                  Latest selected <ArrowUpRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="divide-y divide-black/10">
              {productLaunches.map((launch) => {
                const engagement = getLaunchEngagement(launch);
                const isSelectedLaunch = launch.id === liveLaunch?.id;

                return (
                  <article
                    key={launch.id}
                    className={`px-5 py-5 transition-colors ${isSelectedLaunch ? 'bg-[#fbfaf7]' : 'bg-white'}`}
                  >
                    <div className="grid gap-4 lg:grid-cols-[1fr_280px] lg:items-start">
                      <button
                        type="button"
                        className="text-left"
                        onClick={() => setSelectedLaunchId(launch.id)}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[14px] bg-white">
                            {launch.logoUrl ? (
                              <img src={launch.logoUrl} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <LogoIcon className="h-6 w-6 text-black" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-lg font-semibold tracking-[-0.02em]">{launch.name}</p>
                              <span className="rounded-full bg-[#dcefc7] px-2.5 py-0.5 text-xs font-semibold text-black">Live</span>
                              {(launch.pitchVideoUrl || launch.pitchDeckUrl) && (
                                <span className="rounded-full bg-[#f4f1eb] px-2.5 py-0.5 text-xs font-semibold text-black/60">Pitch Book</span>
                              )}
                              <span className="text-xs font-semibold text-gray-400">{launch.category}</span>
                            </div>
                            <p className="mt-2 text-sm leading-6 text-gray-600">{launch.tagline}</p>
                            {launch.intro && <p className="mt-1 text-xs leading-5 text-gray-500">{launch.intro}</p>}
                          </div>
                        </div>
                        <p className="mt-2 text-xs leading-5 text-gray-500">{launch.metrics || 'No traction proof added yet.'}</p>
                      </button>

                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                              engagement.upvoted ? 'bg-[#dcefc7] text-black' : 'bg-[#f4f1eb] text-black/70 hover:bg-[#ebe5da]'
                            }`}
                            onClick={() => handleToggleLaunchUpvote(launch)}
                          >
                            <ChevronUp className="h-3.5 w-3.5" />
                            {engagement.upvotes}
                          </button>
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f4f1eb] px-3 py-1.5 text-xs font-semibold text-black/55">
                            <MessageSquare className="h-3.5 w-3.5" />
                            {engagement.comments.length}
                          </span>
                          <button
                            type="button"
                            className="rounded-full border border-black/10 px-3 py-1.5 text-xs font-semibold hover:bg-white"
                            onClick={handleOpenFounderProfileFromLaunch}
                          >
                            Founder profile
                          </button>
                        </div>

                        <div className="flex gap-2">
                          <input
                            className="h-9 min-w-0 flex-1 border border-black/10 bg-white px-3 text-xs outline-none placeholder:text-gray-400"
                            placeholder="Comment on this launch"
                            value={launchCommentDrafts[launch.id] ?? ''}
                            onChange={(event) =>
                              setLaunchCommentDrafts((items) => ({ ...items, [launch.id]: event.target.value }))
                            }
                          />
                          <button
                            type="button"
                            className="rounded-full bg-black px-3 text-xs font-semibold text-white disabled:opacity-40"
                            onClick={() => handlePostLaunchComment(launch)}
                            disabled={!launchCommentDrafts[launch.id]?.trim()}
                          >
                            Post
                          </button>
                        </div>

                        <p className="text-xs leading-5 text-gray-500">{engagement.comments[0]}</p>
                      </div>
                    </div>
                  </article>
                );
              })}

              {productLaunches.length === 0 && (
                <div className="px-5 py-10 text-sm leading-6 text-gray-500">
                  No launches yet. Fill out the launch details above and publish your first product into Apparent.
                </div>
              )}
            </div>
          </section>

          {liveLaunch && liveEngagement && (
            <section className="overflow-hidden border-y border-black/10 bg-white">
              {liveLaunch.bannerUrl && (
                <div className="aspect-[5/1] min-h-32 bg-[#fbfaf7]">
                  <img src={liveLaunch.bannerUrl} alt="" className="h-full w-full object-cover" />
                </div>
              )}
              <div className="px-5 py-5">
              <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[14px] bg-[#fbfaf7]">
                    {liveLaunch.logoUrl ? (
                      <img src={liveLaunch.logoUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <LogoIcon className="h-6 w-6 text-black" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">Selected launch</p>
                    <h3 className="mt-1 text-xl font-semibold tracking-[-0.02em]">{liveLaunch.name}</h3>
                    <p className="mt-2 text-sm leading-6 text-gray-600">{liveLaunch.tagline}</p>
                    {liveLaunch.intro && <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">{liveLaunch.intro}</p>}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {liveLaunch.launchUrl && (
                    <a
                      className="inline-flex items-center gap-1.5 rounded-full bg-[#dcefc7] px-4 py-2 text-sm font-semibold text-black"
                      href={liveLaunch.launchUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open product <ArrowUpRight className="h-4 w-4" />
                    </a>
                  )}
                  {liveLaunch.proofUrl && (
                    <a
                      className="inline-flex items-center gap-1.5 rounded-full border border-black/10 px-4 py-2 text-sm font-semibold hover:bg-[#fbf8f3]"
                      href={liveLaunch.proofUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View proof <ArrowUpRight className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </div>
              {(liveLaunch.demoVideoUrl || liveLaunch.pitchVideoUrl) && (
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  {liveLaunch.demoVideoUrl && (
                    <video className="aspect-video w-full rounded-[18px] bg-black object-cover" src={liveLaunch.demoVideoUrl} controls />
                  )}
                  {liveLaunch.pitchVideoUrl && (
                    <video className="aspect-video w-full rounded-[18px] bg-black object-cover" src={liveLaunch.pitchVideoUrl} controls />
                  )}
                </div>
              )}
              {(liveLaunch.pitchDeckUrl || liveLaunch.pitchBookNote || (liveLaunch.founderSignals ?? []).length > 0) && (
                <div className="mt-5 rounded-[18px] bg-[#fbfaf7] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-semibold">Pitch Book</p>
                    <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-black/55">
                      {liveLaunch.pitchVisibility === 'investors' ? 'Investors only' : 'Public'}
                    </span>
                  </div>
                  {liveLaunch.pitchBookNote && (
                    <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600">{liveLaunch.pitchBookNote}</p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {liveLaunch.pitchDeckUrl && (
                      <a
                        href={liveLaunch.pitchDeckUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-[#02A070]"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        Pitch deck
                      </a>
                    )}
                    {(liveLaunch.founderSignals ?? []).map((signal) => (
                      <span key={signal} className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-black/55">
                        {signal}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              </div>
            </section>
          )}
        </div>
      </motion.div>
    );
  };

  const renderLaunchesSection = () => (
    <section id="launches" className="scroll-mt-24 border-y border-black/10 bg-white">
      <div className="flex items-center justify-between border-b border-black/10 px-5 py-3">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-500" />
          <h3 className="text-sm font-semibold">Recent product launches</h3>
        </div>
        <button
          className="rounded-md border border-black/10 p-1.5 hover:bg-[#fbf8f3]"
          onClick={() => {
            setActiveView('products');
            navigate('/dashboard/founder/products');
          }}
          aria-label="Open product launcher"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {isLaunchFormOpen && (
        <div className="grid gap-3 border-b border-black/10 px-5 py-4 md:grid-cols-2">
          <input className="h-9 border border-black/10 px-3 text-sm outline-none" placeholder="Product name" value={launchDraft.name} onChange={(event) => setLaunchDraft((current) => ({ ...current, name: event.target.value }))} />
          <input className="h-9 border border-black/10 px-3 text-sm outline-none" placeholder="Category" value={launchDraft.category} onChange={(event) => setLaunchDraft((current) => ({ ...current, category: event.target.value }))} />
          <input className="h-9 border border-black/10 px-3 text-sm outline-none" placeholder="Launch URL" value={launchDraft.launchUrl} onChange={(event) => setLaunchDraft((current) => ({ ...current, launchUrl: event.target.value }))} />
          <input className="h-9 border border-black/10 px-3 text-sm outline-none" placeholder="Proof URL" value={launchDraft.proofUrl} onChange={(event) => setLaunchDraft((current) => ({ ...current, proofUrl: event.target.value }))} />
          <textarea className="min-h-20 border border-black/10 px-3 py-2 text-sm outline-none md:col-span-2" placeholder="Short tagline" value={launchDraft.tagline} onChange={(event) => setLaunchDraft((current) => ({ ...current, tagline: event.target.value }))} />
          <textarea className="min-h-20 border border-black/10 px-3 py-2 text-sm outline-none md:col-span-2" placeholder="Metrics, traction, GitHub stars, customers, revenue" value={launchDraft.metrics} onChange={(event) => setLaunchDraft((current) => ({ ...current, metrics: event.target.value }))} />
          <button className={`rounded-full ${accentSurface} px-5 py-2 text-sm font-medium ${accentForeground} disabled:opacity-60`} onClick={handleSaveProductLaunch} disabled={savingWorkflow === 'launch'}>
            {savingWorkflow === 'launch' ? 'Saving...' : 'Save launch'}
          </button>
        </div>
      )}

      <div className="divide-y divide-black/10">
        {productLaunches.map((launch) => (
          <article key={launch.id} className="px-5 py-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold">{launch.name}</p>
                  <span className={`rounded-full ${accentSurface} px-2 py-0.5 text-xs font-medium ${accentForeground}`}>{launch.stage}</span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">{launch.tagline}</p>
                <p className="mt-2 text-xs leading-relaxed text-gray-500">{launch.metrics}</p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                {launch.launchUrl && <a className="rounded-full border border-black/10 px-3 py-1.5 text-xs font-medium hover:bg-[#fbf8f3]" href={launch.launchUrl}>Launch</a>}
                {launch.proofUrl && <a className="rounded-full border border-black/10 px-3 py-1.5 text-xs font-medium hover:bg-[#fbf8f3]" href={launch.proofUrl}>Proof</a>}
              </div>
            </div>
          </article>
        ))}
        {productLaunches.length === 0 && (
          <div className="px-5 py-8 text-sm text-gray-500">Add your first shipped product so Apparent can turn it into investor-readable proof.</div>
        )}
      </div>
    </section>
  );

  const renderMeetupsSection = () => (
    <section id="meetups" className="scroll-mt-24 border-y border-black/10 bg-white py-4">
      <div className="flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-500" />
          <h3 className="text-sm font-semibold">Meetups</h3>
        </div>
        <button className="rounded-md border border-black/10 p-1.5 hover:bg-[#fbf8f3]" onClick={() => setIsMeetupFormOpen((current) => !current)} aria-label="Create meetup">
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {isMeetupFormOpen && (
        <div className="mt-4 grid gap-3 border-t border-black/10 px-4 pt-4">
          <input className="h-9 border border-black/10 px-3 text-sm outline-none" placeholder="Meetup title" value={meetupDraft.title} onChange={(event) => setMeetupDraft((current) => ({ ...current, title: event.target.value }))} />
          <input className="h-9 border border-black/10 px-3 text-sm outline-none" placeholder="Audience" value={meetupDraft.audience} onChange={(event) => setMeetupDraft((current) => ({ ...current, audience: event.target.value }))} />
          <div className="grid gap-3 sm:grid-cols-2">
            <input className="h-9 border border-black/10 px-3 text-sm outline-none" placeholder="City" value={meetupDraft.city} onChange={(event) => setMeetupDraft((current) => ({ ...current, city: event.target.value }))} />
            <input className="h-9 border border-black/10 px-3 text-sm outline-none" placeholder="Venue" value={meetupDraft.venue} onChange={(event) => setMeetupDraft((current) => ({ ...current, venue: event.target.value }))} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <input className="h-9 border border-black/10 px-3 text-sm outline-none" type="datetime-local" value={meetupDraft.startsAt} onChange={(event) => setMeetupDraft((current) => ({ ...current, startsAt: event.target.value }))} />
            <input className="h-9 border border-black/10 px-3 text-sm outline-none" type="number" min={1} value={meetupDraft.capacity} onChange={(event) => setMeetupDraft((current) => ({ ...current, capacity: Number(event.target.value) }))} />
          </div>
          <textarea className="min-h-20 border border-black/10 px-3 py-2 text-sm outline-none" placeholder="Description" value={meetupDraft.description} onChange={(event) => setMeetupDraft((current) => ({ ...current, description: event.target.value }))} />
          <button className={`rounded-full ${accentSurface} px-5 py-2 text-sm font-medium ${accentForeground} disabled:opacity-60`} onClick={handleSaveMeetup} disabled={savingWorkflow === 'meetup'}>
            {savingWorkflow === 'meetup' ? 'Saving...' : 'Save meetup'}
          </button>
        </div>
      )}

      <div className="mt-3 divide-y divide-black/10">
        {meetups.map((meetup) => (
          <article key={meetup.id} className="px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium">{meetup.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-gray-500">{meetup.city} · {meetup.venue} · {toDatetimeLocalValue(meetup.startsAt).replace('T', ' ')}</p>
                <p className="mt-2 text-xs leading-relaxed text-gray-600">{meetup.description}</p>
              </div>
              <button className="shrink-0 rounded-full border border-black/10 px-3 py-1.5 text-xs font-medium hover:bg-[#fbf8f3]" onClick={() => handleToggleMeetupRsvp(meetup)}>
                {meetup.isJoined ? 'Joined' : 'RSVP'}
              </button>
            </div>
            <p className="mt-2 text-xs text-gray-400">{meetup.attendeeCount}/{meetup.capacity} attending</p>
          </article>
        ))}
      </div>
    </section>
  );

  const renderNetworkMapSection = () => {
    const selectedState = selectedBuilder ? getBuilderState(selectedBuilder) : null;
    const shouldShowPlaceSuggestions =
      isPlaceInputFocused &&
      (placeSuggestions.length > 0 || isSuggestingPlaces || placeOfInterest.trim().length >= 2);
    const mapContextTitle = selectedNetworkCluster?.city ?? 'Current map view';
    const mapContextTags = selectedNetworkCluster?.tags ?? Array.from(
      new Set(selectedClusterBuilders.flatMap((builder) => [builder.category, builder.stage]).filter(Boolean)),
    ).slice(0, 6);

    return (
    <section id="map" className="scroll-mt-24 border-y border-black/10 bg-white py-4">
      <div className="flex items-center gap-2 px-4">
        <MapPin className="h-4 w-4 text-gray-500" />
        <div>
          <h3 className="text-sm font-semibold">Builder Radar</h3>
          <p className="mt-0.5 text-xs text-gray-500">
            {isInvestor ? 'Apparent builders by proof, location, stage, and fit.' : 'Nearby and similar Apparent founders.'}
          </p>
        </div>
      </div>
      <div className="relative z-30 mt-4 flex flex-wrap items-center gap-2 px-4">
        <div className="flex min-w-[min(100%,20rem)] flex-[2_1_28rem] gap-2 max-sm:flex-col">
          <div className="relative min-w-0 flex-1">
            <LocateFixed className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              className="h-9 w-full border border-black/10 bg-white pl-9 pr-3 text-sm outline-none placeholder:text-gray-400 focus:border-black/30"
              placeholder="Search city, venue, or neighborhood"
              value={placeOfInterest}
              onChange={(event) => {
                setPlaceOfInterest(event.target.value);
                setPlaceLookupError('');
                setIsPlaceInputFocused(true);
              }}
              onFocus={() => setIsPlaceInputFocused(true)}
              onBlur={() => window.setTimeout(() => setIsPlaceInputFocused(false), 120)}
              onKeyDown={handlePlaceInputKeyDown}
            />
            {shouldShowPlaceSuggestions && (
              <div className="absolute left-0 right-0 top-full z-[1000] mt-2 overflow-hidden border border-black/10 bg-white shadow-xl">
                {placeSuggestions.map((suggestion, index) => (
                  <button
                    key={suggestion.id}
                    type="button"
                    className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                      index === activePlaceSuggestionIndex ? 'bg-[#fbf8f3]' : 'hover:bg-[#fbf8f3]'
                    }`}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      handleSelectPlaceSuggestion(suggestion);
                    }}
                  >
                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${accentSurface} ${accentForeground}`}>
                      <MapPin className="h-3.5 w-3.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-gray-900">{suggestion.label}</span>
                      <span className="block truncate text-xs text-gray-500">
                        {suggestion.detail} · {suggestion.source}
                      </span>
                    </span>
                    <span className="text-[11px] font-medium text-gray-400">Drop</span>
                  </button>
                ))}
                {isSuggestingPlaces && (
                  <div className="border-t border-black/10 px-3 py-2 text-xs text-gray-500">Searching places...</div>
                )}
                {!isSuggestingPlaces && placeSuggestions.length === 0 && placeOfInterest.trim().length >= 2 && (
                  <div className="px-3 py-2 text-xs text-gray-500">
                    {placeOfInterest.trim().length < 4
                      ? 'Keep typing for city suggestions.'
                      : 'No suggestions found. Press Enter to drop this place.'}
                  </div>
                )}
              </div>
            )}
          </div>
          <select
            className="h-9 w-24 shrink-0 border border-black/10 bg-white px-2 text-xs outline-none focus:border-black/30"
            value={networkFilters.radiusMiles}
            onChange={(event) =>
              setNetworkFilters((current) => ({
                ...current,
                radiusMiles: Number(event.target.value),
              }))
            }
            aria-label="Radar radius"
          >
            <option value={25}>25 mi</option>
            <option value={50}>50 mi</option>
            <option value={100}>100 mi</option>
            <option value={250}>250 mi</option>
          </select>
        </div>
        <select
          className="h-9 min-w-[9rem] flex-1 basis-36 border border-black/10 bg-white px-3 text-sm outline-none focus:border-black/30 sm:max-w-48"
          value={networkFilters.category}
          onChange={(event) => setNetworkFilters((current) => ({ ...current, category: event.target.value }))}
        >
          <option value="">All categories</option>
          {builderCategories.map((category) => (
            <option key={category} value={category}>{category}</option>
          ))}
        </select>
        <select
          className="h-9 min-w-[7.5rem] flex-1 basis-32 border border-black/10 bg-white px-3 text-sm outline-none focus:border-black/30 sm:max-w-36"
          value={networkFilters.stage}
          onChange={(event) => setNetworkFilters((current) => ({ ...current, stage: event.target.value }))}
        >
          <option value="">All stages</option>
          {builderStages.map((stage) => (
            <option key={stage} value={stage}>{stage}</option>
          ))}
        </select>
        <select
          className="h-9 min-w-[7.5rem] flex-1 basis-32 border border-black/10 bg-white px-3 text-sm outline-none focus:border-black/30 sm:max-w-36"
          value={networkFilters.freshness}
          onChange={(event) =>
            setNetworkFilters((current) => ({
              ...current,
              freshness: event.target.value as NetworkMapFilters['freshness'],
            }))
          }
        >
          <option value="any">Any time</option>
          <option value="24h">Last 24h</option>
          <option value="7d">Last 7d</option>
          <option value="30d">Last 30d</option>
        </select>
        <div className="flex flex-1 basis-[22rem] flex-wrap gap-2 sm:flex-none">
          <button
            type="button"
            className={`h-9 flex-1 whitespace-nowrap rounded-full border px-3 text-xs font-medium transition-colors sm:flex-none ${
              networkFilters.matchOnly
                ? `border-transparent ${accentSurface} ${accentForeground}`
                : 'border-black/10 text-gray-600 hover:bg-[#fbf8f3]'
            }`}
            onClick={() => setNetworkFilters((current) => ({ ...current, matchOnly: !current.matchOnly }))}
          >
            Match only
          </button>
          <button
            type="button"
            className="h-9 flex-1 whitespace-nowrap rounded-full border border-black/10 px-3 text-xs font-medium text-gray-600 hover:bg-[#fbf8f3] sm:flex-none"
            onClick={handleClearNetworkFilters}
          >
            Reset
          </button>
          <button
            type="button"
            className={`h-9 flex-1 whitespace-nowrap rounded-full border border-transparent ${accentSurface} px-3 text-xs font-semibold ${accentForeground} shadow-sm shadow-black/10 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none`}
            onClick={handleLocateProjectsAroundMe}
            disabled={isLocatingUser}
          >
            <LocateFixed className={`mr-1.5 inline h-3.5 w-3.5 align-[-2px] ${accentIconForeground}`} />
            {isLocatingUser ? 'Locating...' : 'Locate projects around me'}
          </button>
        </div>
      </div>
      {(networkFilters.pin || placeLookupError) && (
        <div className="mx-4 mt-3 flex flex-col gap-2 border-y border-black/10 bg-[#fbf8f3] px-4 py-3 text-xs text-gray-600 sm:flex-row sm:items-center sm:justify-between">
          <span>
            {placeLookupError ||
              `Pin dropped at ${networkFilters.pin?.label}. Showing builders in the current map view. Pan or zoom to explore.`}
          </span>
          {networkFilters.pin && (
            <button
              type="button"
              className="shrink-0 rounded-full border border-black/10 bg-white px-3 py-1.5 font-medium text-gray-700 hover:bg-[#f4f1eb]"
              onClick={() => {
                setNetworkFilters((current) => ({ ...current, pin: null, city: '' }));
                setPlaceOfInterest('');
                setPlaceLookupError('');
              }}
            >
              Clear pin
            </button>
          )}
        </div>
      )}
      <BuilderRadarMap
        clusters={radarClusters}
        builders={filteredBuilderNodes}
        selectedCity={selectedNetworkCluster?.city ?? ''}
        selectedBuilderId={selectedBuilder?.id ?? ''}
        role={role}
        interestPin={networkFilters.pin}
        radiusMiles={networkFilters.radiusMiles}
        onSelectCity={handleSelectBuilderCity}
        onSelectBuilder={handleSelectBuilderFromMap}
        onViewportBuildersChange={handleViewportBuildersChange}
        className="mx-4 mt-4 h-96 rounded-md"
      />
      {(selectedClusterBuilders.length > 0 || selectedClusterMeetups.length > 0) && (
        <div className="px-4 pt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">{mapContextTitle}</p>
            <span className="text-xs text-gray-500">{selectedClusterBuilders.length} builders · {selectedClusterMeetups.length} meetups</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {mapContextTags.map((tag) => (
              <span key={tag} className="rounded-full bg-[#f4f1eb] px-2 py-1 text-[11px] text-gray-600">{tag}</span>
            ))}
          </div>
          <div className="mt-3 divide-y divide-black/10 border-t border-black/10">
            {[...selectedClusterSignals.slice(0, 2).map((signal) => `${signal.company} · ${signal.stage}`), ...selectedClusterMeetups.slice(0, 2).map((meetup) => `${meetup.title} · ${meetup.venue}`)].map((item) => (
              <button key={item} className="w-full py-2 text-left text-xs text-gray-600 hover:text-black" onClick={() => addActivity(`Opened map item: ${item}`)}>{item}</button>
            ))}
          </div>
        </div>
      )}
      {selectedBuilder && (
        <div className="mx-4 mt-4 border-t border-black/10 pt-4">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="divide-y divide-black/10 border-y border-black/10">
              {selectedClusterBuilders.map((builder) => {
                const state = getBuilderState(builder);
                return (
                  <button
                    key={builder.id}
                    className={`w-full px-4 py-3 text-left transition-colors hover:bg-[#fbf8f3] ${
                      selectedBuilder.id === builder.id ? 'bg-[#fbf8f3]' : ''
                    }`}
                    onClick={() => setSelectedBuilderId(builder.id)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold">{builder.displayLabel}</p>
                          <span className={`rounded-full ${accentSurface} px-2 py-0.5 text-xs font-medium ${accentForeground}`}>
                            {builder.fitScore}%
                          </span>
                          {state.saved && <span className="rounded-full bg-[#f4f1eb] px-2 py-0.5 text-xs text-gray-600">saved</span>}
                        </div>
                        <p className="mt-2 text-sm leading-relaxed text-gray-600">{builder.buildSummary}</p>
                        <p className="mt-2 text-xs text-gray-500">{builder.category || 'Builder'} | {builder.stage || 'Stage n/a'} | {builder.location} | {builder.latestActivityLabel}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
              {selectedClusterBuilders.length === 0 && (
                <p className="px-4 py-5 text-sm text-gray-500">No builders in this location after filters.</p>
              )}
            </div>

            <aside className="border-y border-black/10 px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    {selectedBuilder.isCurrentUser ? 'Your builder node' : 'Builder detail'}
                  </p>
                  <h4 className="mt-1 text-base font-semibold">{selectedBuilder.company}</h4>
                  <p className="mt-1 text-xs text-gray-500">{selectedBuilder.founderName} | {selectedBuilder.location}</p>
                </div>
                <span className={`rounded-full ${accentSurface} px-2.5 py-1 text-xs font-medium ${accentForeground}`}>
                  {selectedBuilder.fitScore}%
                </span>
              </div>
              {selectedBuilder.traction && (
                <p className="mt-3 text-xs leading-relaxed text-gray-500">{selectedBuilder.traction}</p>
              )}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {selectedBuilder.matchReasons.map((reason) => (
                  <span key={reason} className="rounded-full bg-[#f4f1eb] px-2 py-1 text-[11px] text-gray-600">{reason}</span>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {selectedBuilder.proofLinks.map((link) => (
                  <a
                    key={`${link.type}-${link.url}`}
                    href={link.url}
                    className="rounded-full border border-black/10 px-3 py-1.5 text-xs font-medium hover:bg-[#fbf8f3]"
                    onClick={() => addActivity(`Opened ${link.label}: ${selectedBuilder.company}`)}
                  >
                    {link.label}
                  </a>
                ))}
                <a
                  href={selectedBuilder.profileUrl}
                  className="rounded-full border border-black/10 px-3 py-1.5 text-xs font-medium hover:bg-[#fbf8f3]"
                  onClick={() => addActivity(`Opened profile: ${selectedBuilder.company}`)}
                >
                  Profile
                </a>
              </div>

              {isInvestor && (
                <div className="mt-4">
                  <textarea
                    value={selectedState?.outreachBody || buildBuilderOutreachDraft(selectedBuilder)}
                    onChange={(event) => handleBuilderDraftChange(selectedBuilder, event.target.value)}
                    className="min-h-24 w-full resize-none border border-black/10 px-3 py-2 text-xs leading-relaxed text-gray-600 outline-none placeholder:text-gray-400 focus:border-black/30"
                    placeholder="Outreach draft"
                  />
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button className="rounded-full border border-black/10 px-3 py-1.5 text-xs font-medium hover:bg-[#fbf8f3]" onClick={() => handleSaveBuilder(selectedBuilder)}>
                      {selectedState?.saved ? 'Saved' : 'Save builder'}
                    </button>
                    <button className={`rounded-full ${accentSurface} px-3 py-1.5 text-xs font-medium ${accentForeground}`} onClick={() => handleAddBuilderToDealFlow(selectedBuilder)}>
                      Add to deal-flow
                    </button>
                    <button className="rounded-full border border-black/10 px-3 py-1.5 text-xs font-medium hover:bg-[#fbf8f3]" onClick={() => handleDraftBuilderOutreach(selectedBuilder)}>
                      Draft outreach
                    </button>
                    <button className="rounded-full border border-black/10 px-3 py-1.5 text-xs font-medium hover:bg-[#fbf8f3]" onClick={() => handleSaveBuilderDraft(selectedBuilder)}>
                      Save draft
                    </button>
                    <button className="rounded-full border border-black/10 px-3 py-1.5 text-xs font-medium hover:bg-[#fbf8f3]" onClick={() => handleHideBuilder(selectedBuilder)}>
                      Hide
                    </button>
                  </div>
                </div>
              )}

              {!isInvestor && !selectedBuilder.isCurrentUser && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <button className="rounded-full border border-black/10 px-3 py-1.5 text-xs font-medium hover:bg-[#fbf8f3]" onClick={() => handleSaveBuilder(selectedBuilder)}>
                    {selectedState?.saved ? 'Saved peer' : 'Save peer'}
                  </button>
                  <button className={`rounded-full ${accentSurface} px-3 py-1.5 text-xs font-medium ${accentForeground}`} onClick={() => handleMessageBuilder(selectedBuilder)}>
                    Message builder
                  </button>
                  <button
                    className="rounded-full border border-black/10 px-3 py-1.5 text-xs font-medium hover:bg-[#fbf8f3]"
                    onClick={() => {
                      setSelectedClusterCity(selectedBuilder.location);
                      scrollToSection('meetups');
                    }}
                  >
                    Nearby meetups
                  </button>
                </div>
              )}
            </aside>
          </div>
        </div>
      )}
    </section>
    );
  };

  const renderInvestorDealFlowSection = () => (
    <section id="deals" className="scroll-mt-24 border-y border-black/10 bg-white">
      <div className="flex items-center justify-between border-b border-black/10 px-5 py-3">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-gray-500" />
          <h3 className="text-sm font-semibold">Deal-flow Kanban</h3>
        </div>
        <span className="text-xs text-gray-500">{signalRows.length} active companies</span>
      </div>
      <div className="grid divide-y divide-black/10 lg:grid-cols-5 lg:divide-x lg:divide-y-0">
        {investorPipeline.map((column) => (
          <div
            key={column.stage}
            data-kanban-stage={column.stage}
            className={`min-h-56 transition-colors ${
              dragOverStage === column.stage ? 'bg-green-50/70' : ''
            }`}
            onDragOver={(event) => handleInvestorSignalDragOver(event, column.stage)}
            onDragLeave={() => setDragOverStage((current) => (current === column.stage ? null : current))}
            onDrop={(event) => handleInvestorSignalDrop(event, column.stage)}
          >
            <div className="flex items-center justify-between border-b border-black/10 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{column.stage}</p>
              <span className="text-xs text-gray-400">{column.items.length}</span>
            </div>
            <div className="min-h-44 space-y-3 p-3">
              {column.items.map((signal) => (
                <div
                  key={signalStorageId(signal)}
                  draggable
                  onDragStart={(event) => handleInvestorSignalDragStart(event, signalStorageId(signal))}
                  onDragEnd={clearInvestorSignalDrag}
                  className={`rounded-md border border-black/10 bg-white p-3 shadow-sm shadow-black/[0.03] transition-all ${
                    draggedSignalCompany === signalStorageId(signal)
                      ? 'scale-[0.98] cursor-grabbing opacity-50'
                      : 'cursor-grab hover:-translate-y-0.5 hover:border-black/20 hover:shadow-md hover:shadow-black/[0.06]'
                  }`}
                >
                  <button className="w-full text-left" onClick={() => openInvestorSignal(signal)}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{signal.company}</p>
                        <p className="mt-1 truncate text-xs text-gray-500">{signal.founder}</p>
                      </div>
                      <span className={`shrink-0 rounded-full ${accentSurface} px-2 py-0.5 text-[11px] font-medium ${accentForeground}`}>
                        {signal.relevance}%
                      </span>
                    </div>
                    <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-gray-600">{signal.detail}</p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <span className="rounded-full bg-[#f4f1eb] px-2 py-1 text-[11px] text-gray-600">
                        {signal.stage}
                      </span>
                      <span className="rounded-full bg-[#f4f1eb] px-2 py-1 text-[11px] text-gray-600">
                        {signal.freshness}
                      </span>
                    </div>
                  </button>
                  <button
                    type="button"
                    className="mt-3 flex w-full cursor-grab items-center justify-center rounded-md border border-dashed border-black/10 py-1.5 text-[11px] font-medium uppercase tracking-wide text-gray-400 hover:border-black/20 hover:text-black active:cursor-grabbing"
                    onPointerDown={(event) => handleInvestorSignalPointerDragStart(event, signal)}
                  >
                    Drag to move
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );

  const renderTermsReviewSection = () => (
    <section id="terms" className="scroll-mt-24 border-y border-black/10 bg-white py-4">
      <div className="flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-gray-500" />
          <h3 className="text-sm font-semibold">Terms review</h3>
        </div>
        <button className="rounded-md border border-black/10 p-1.5 hover:bg-[#fbf8f3]" onClick={() => setIsTermFormOpen((current) => !current)} aria-label="Add terms review">
          <Plus className="h-4 w-4" />
        </button>
      </div>
      {isTermFormOpen && (
        <div className="mt-4 grid gap-3 border-t border-black/10 px-4 pt-4">
          <input className="h-9 border border-black/10 px-3 text-sm outline-none" placeholder="Company" value={termDraft.company} onChange={(event) => setTermDraft((current) => ({ ...current, company: event.target.value }))} />
          <div className="grid gap-3 sm:grid-cols-2">
            <input className="h-9 border border-black/10 px-3 text-sm outline-none" placeholder="Instrument" value={termDraft.instrument} onChange={(event) => setTermDraft((current) => ({ ...current, instrument: event.target.value }))} />
            <input className="h-9 border border-black/10 px-3 text-sm outline-none" placeholder="Amount" value={termDraft.amount} onChange={(event) => setTermDraft((current) => ({ ...current, amount: event.target.value }))} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <input className="h-9 border border-black/10 px-3 text-sm outline-none" placeholder="Valuation cap / price" value={termDraft.valuation} onChange={(event) => setTermDraft((current) => ({ ...current, valuation: event.target.value }))} />
            <input className="h-9 border border-black/10 px-3 text-sm outline-none" placeholder="Pro rata / major rights" value={termDraft.proRata} onChange={(event) => setTermDraft((current) => ({ ...current, proRata: event.target.value }))} />
          </div>
          <textarea className="min-h-20 border border-black/10 px-3 py-2 text-sm outline-none" placeholder="Notes, concerns, follow-up asks" value={termDraft.notes} onChange={(event) => setTermDraft((current) => ({ ...current, notes: event.target.value }))} />
          <button className={`rounded-full ${accentSurface} px-5 py-2 text-sm font-medium ${accentForeground} disabled:opacity-60`} onClick={handleSaveTermReview} disabled={savingWorkflow === 'term'}>
            {savingWorkflow === 'term' ? 'Saving...' : 'Save terms'}
          </button>
        </div>
      )}
      <div className="mt-3 divide-y divide-black/10">
        {termReviews.map((review) => (
          <article key={review.id} className="px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium">{review.company}</p>
                <p className="mt-1 text-xs text-gray-500">{review.instrument} · {review.amount} · {review.valuation}</p>
                <p className="mt-2 text-xs leading-relaxed text-gray-600">{review.notes}</p>
              </div>
              <span className={`shrink-0 rounded-full ${accentSurface} px-2 py-1 text-xs font-medium ${accentForeground}`}>{review.status}</span>
            </div>
          </article>
        ))}
        {termReviews.length === 0 && <p className="px-4 py-4 text-xs leading-relaxed text-gray-500">Add a term sheet or deal note to track instrument, amount, rights, and review status.</p>}
      </div>
    </section>
  );

  const renderDealsPage = () => (
    <motion.div
      key="deals-main"
      initial={{ opacity: 0, y: 10, filter: 'blur(2px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      exit={{ opacity: 0, y: -8, filter: 'blur(2px)' }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
    >
      <div id="deals" className="mx-auto max-w-[1292px] scroll-mt-24 space-y-6">
        <section className="border-y border-black/10 bg-white px-5 py-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-[-0.03em]">
                {isInvestor ? 'Deal Flow' : 'Deal Terms'}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
                {isInvestor
                  ? 'Track sourced companies as they move from discovery to review, outreach, meetings, and watchlist.'
                  : 'Track investor offers, SAFE notes, valuation caps, rights, and decision notes in one fundraising workspace.'}
              </p>
            </div>
            <button
              type="button"
              className={`rounded-full ${accentSurface} px-4 py-2 text-sm font-semibold ${accentForeground}`}
              onClick={() => {
                setIsTermFormOpen(true);
                setActiveView('terms');
                navigate(`${dashboardBasePath}#terms`);
              }}
            >
              {isInvestor ? 'Add term note' : 'Add investor terms'}
            </button>
          </div>
        </section>

        {isInvestor ? (
          <>
            {renderInvestorDealFlowSection()}
            <div className="grid gap-6 xl:grid-cols-3">
              {signalRows.slice(0, 3).map((signal) => (
                <section key={signalStorageId(signal)} className="border-y border-black/10 bg-white py-4">
                  <div className="flex items-center gap-2 px-4">
                    <MessageCircle className="h-4 w-4 text-gray-500" />
                    <h3 className="text-sm font-semibold">Outreach draft</h3>
                  </div>
                  <p className="px-4 pt-2 text-xs font-medium text-gray-500">{signal.company} - {signal.founder}</p>
                  <div className="px-4 pt-3">
                    <textarea
                      value={signal.outreach}
                      onChange={(event) => handleOutreachDraftChange(signal, event.target.value)}
                      className="min-h-28 w-full resize-none border-0 bg-transparent text-xs leading-relaxed text-gray-600 outline-none placeholder:text-gray-400"
                      placeholder="Draft outreach note"
                    />
                  </div>
                  <button
                    className="mx-4 mt-4 rounded-full border border-black/10 px-4 py-2 text-sm font-medium hover:bg-[#fbf8f3] disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={() => handleSaveOutreachDraft(signal)}
                    disabled={savingDraftId === signalStorageId(signal)}
                  >
                    {savingDraftId === signalStorageId(signal) ? 'Saving...' : 'Save draft'}
                  </button>
                </section>
              ))}
            </div>
          </>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
            {renderTermsReviewSection()}
            <aside className="space-y-6">
              <section className="border-y border-black/10 bg-white p-5">
                <h3 className="text-sm font-semibold">Round snapshot</h3>
                <div className="mt-4 grid gap-3">
                  {[
                    ['Active term notes', termReviews.length || 0],
                    ['Current stage', intakeValues.stage || 'Not set'],
                    ['Capital ask', intakeValues.lookingFor || 'Not set'],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-[14px] bg-[#fbfaf7] p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">{label}</p>
                      <p className="mt-2 text-sm font-semibold">{value}</p>
                    </div>
                  ))}
                </div>
              </section>
              <section className="border-y border-black/10 bg-white p-5">
                <h3 className="text-sm font-semibold">Founder checklist</h3>
                <div className="mt-4 space-y-3 text-sm text-gray-600">
                  {['Compare valuation cap against dilution', 'Check pro rata and information rights', 'Capture investor decision deadline'].map((item) => (
                    <div key={item} className="flex items-start gap-2">
                      <span className={`mt-1.5 h-2 w-2 rounded-full ${accentSurface}`} />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </section>
            </aside>
          </div>
        )}
      </div>
    </motion.div>
  );

  const renderTermsPage = () => (
    <motion.div
      key="terms-main"
      initial={{ opacity: 0, y: 10, filter: 'blur(2px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      exit={{ opacity: 0, y: -8, filter: 'blur(2px)' }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
    >
      <div className="mx-auto max-w-[1292px] space-y-6">
        <section className="border-y border-black/10 bg-white px-5 py-5">
          <h2 className="text-2xl font-semibold tracking-[-0.03em]">Terms Review</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
            Capture the terms that need review: instrument, amount, valuation, rights, concerns, and follow-up asks.
          </p>
        </section>
        {renderTermsReviewSection()}
      </div>
    </motion.div>
  );

  const renderKnowledgePage = () => {
    const items = isInvestor
      ? [
          ['Thesis notes', 'Keep reusable investment criteria and market patterns close to sourcing.'],
          ['Diligence checklist', 'Review founder proof, market pull, technical wedge, and terms before moving forward.'],
          ['Outreach playbook', 'Turn saved builders into concise, context-rich first messages.'],
          ['Market maps', 'Organize categories, competitors, and gaps around the builders you are tracking.'],
        ]
      : [
          ['Launch checklist', 'Prepare product assets, intro copy, proof links, demo video, and pitch video.'],
          ['Investor update template', 'Summarize shipped product, usage proof, asks, and next milestones.'],
          ['Fundraising prep', 'Track targets, terms, objections, and proof that should be visible on your profile.'],
          ['Founder profile guide', 'Keep bio, links, products, and location current for discovery.'],
        ];

    return (
      <motion.div
        key="knowledge-main"
        initial={{ opacity: 0, y: 10, filter: 'blur(2px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        exit={{ opacity: 0, y: -8, filter: 'blur(2px)' }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
      >
        <section id="knowledge" className="mx-auto max-w-[1292px] scroll-mt-24 border-y border-black/10 bg-white">
          <div className="border-b border-black/10 px-5 py-5">
            <h2 className="text-2xl font-semibold tracking-[-0.03em]">Knowledge Base</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
              {isInvestor
                ? 'Reference notes and operating checklists for sourcing, diligence, and follow-up.'
                : 'Practical launch, profile, fundraising, and investor-update material for founders.'}
            </p>
          </div>
          <div className="grid divide-y divide-black/10 md:grid-cols-2 md:divide-x md:divide-y-0">
            {items.map(([title, text]) => (
              <article key={title} className="p-5">
                <p className="text-sm font-semibold">{title}</p>
                <p className="mt-3 text-sm leading-6 text-gray-600">{text}</p>
              </article>
            ))}
          </div>
          <div className="flex flex-wrap gap-3 border-t border-black/10 px-5 py-4">
            <button className="rounded-full border border-black/10 px-4 py-2 text-sm font-semibold hover:bg-[#fbf8f3]" onClick={() => handleDashboardViewChange(isInvestor ? 'matches' : 'products')}>
              {isInvestor ? 'Open builder discovery' : 'Open product launcher'}
            </button>
            <button className="rounded-full border border-black/10 px-4 py-2 text-sm font-semibold hover:bg-[#fbf8f3]" onClick={() => handleDashboardViewChange('terms')}>
              Open terms review
            </button>
          </div>
        </section>
      </motion.div>
    );
  };

  const renderFeedbackPage = () => (
    <motion.div
      key="feedback-main"
      initial={{ opacity: 0, y: 10, filter: 'blur(2px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      exit={{ opacity: 0, y: -8, filter: 'blur(2px)' }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
    >
      <section id="feedback" className="mx-auto max-w-[1292px] scroll-mt-24 border-y border-black/10 bg-white">
        <div className="border-b border-black/10 px-5 py-5">
          <h2 className="text-2xl font-semibold tracking-[-0.03em]">Feedback</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
            Send the Apparent team a bug report, feature request, confusing workflow, or general product note.
          </p>
        </div>
        <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="divide-y divide-black/10">
            <label className="grid gap-3 px-5 py-4 md:grid-cols-[220px_1fr]">
              <span className="text-sm font-medium">Type</span>
              <select
                className="h-9 border-0 bg-transparent text-sm outline-none"
                value={feedbackDraft.type}
                onChange={(event) => setFeedbackDraft((current) => ({ ...current, type: event.target.value as FeedbackType }))}
              >
                {['Feature request', 'Bug report', 'Workflow confusion', 'General feedback'].map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-3 px-5 py-4 md:grid-cols-[220px_1fr]">
              <span className="text-sm font-medium">Subject</span>
              <input
                className="h-9 border-0 bg-transparent text-sm outline-none placeholder:text-gray-400"
                placeholder="What should we look at?"
                value={feedbackDraft.subject}
                onChange={(event) => setFeedbackDraft((current) => ({ ...current, subject: event.target.value }))}
              />
            </label>
            <label className="grid gap-3 px-5 py-4 md:grid-cols-[220px_1fr]">
              <span className="text-sm font-medium">Details</span>
              <textarea
                className="min-h-40 resize-none border-0 bg-transparent text-sm leading-relaxed outline-none placeholder:text-gray-400"
                placeholder="Tell us what happened, what you expected, and where you were in the product."
                value={feedbackDraft.body}
                onChange={(event) => setFeedbackDraft((current) => ({ ...current, body: event.target.value }))}
              />
            </label>
            <div className="flex justify-end px-5 py-4">
              <button
                className={`rounded-full ${accentSurface} px-5 py-2.5 text-sm font-semibold ${accentForeground} disabled:opacity-60`}
                onClick={handleSaveFeedback}
                disabled={savingWorkflow === 'feedback'}
              >
                {savingWorkflow === 'feedback' ? 'Sending...' : 'Send feedback'}
              </button>
            </div>
          </div>
          <aside className="border-t border-black/10 p-5 lg:border-l lg:border-t-0">
            <h3 className="text-sm font-semibold">Recent feedback</h3>
            <div className="mt-4 space-y-3">
              {messages.filter((message) => message.context === `feedback:${role}`).slice(0, 4).map((message) => (
                <article key={message.id} className="rounded-[14px] bg-[#fbfaf7] p-3">
                  <p className="text-sm font-semibold">{message.subject}</p>
                  <p className="mt-2 line-clamp-3 text-xs leading-5 text-gray-500">{message.body}</p>
                </article>
              ))}
              {messages.filter((message) => message.context === `feedback:${role}`).length === 0 && (
                <p className="text-sm leading-6 text-gray-500">Feedback you send from this workspace will appear here.</p>
              )}
            </div>
          </aside>
        </div>
      </section>
    </motion.div>
  );

  const renderForYouLaunchPage = () => {
    const selectedDomain = dashboardLaunchDomain(selectedForYouLaunch.website);

    return (
      <motion.div
        key="for-you-main"
        initial={{ opacity: 0, y: 10, filter: 'blur(2px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        exit={{ opacity: 0, y: -8, filter: 'blur(2px)' }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
      >
        <section id="for-you" className="scroll-mt-24">
          <div className="mx-auto max-w-[1292px]">
            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
              <section className="border-y border-black/10 bg-white">
                <div className="grid gap-3 border-b border-black/10 px-5 py-4 md:grid-cols-[minmax(12rem,16rem)_minmax(0,1fr)] md:items-center">
                  <div className="min-w-0">
                    <p className="text-base font-semibold text-black">Today&apos;s launches</p>
                  </div>
                  <div className="flex min-w-0 max-w-full items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => scrollDashboardFilters(-1)}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#fbfaf7] text-black/60 transition-colors hover:bg-[#f4f1eb] hover:text-black"
                      aria-label="Scroll filters left"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </button>
                    <div ref={dashboardFilterScrollRef} className="launch-filter-scroll flex min-w-0 flex-1 gap-1.5 overflow-x-auto px-1 pb-1">
                      {availableDashboardLaunchFilters.map((filter) => (
                        <button
                          key={filter}
                          type="button"
                          onClick={() => setDashboardLaunchFilter(filter)}
                          className={`shrink-0 rounded-full px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                            dashboardLaunchFilter === filter ? 'bg-black text-white' : 'bg-[#fbfaf7] text-black/60 hover:bg-[#f4f1eb]'
                          }`}
                        >
                          {filter}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => scrollDashboardFilters(1)}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#fbfaf7] text-black/60 transition-colors hover:bg-[#f4f1eb] hover:text-black"
                      aria-label="Scroll filters right"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="divide-y divide-black/10">
                  {visibleDashboardLaunches.map((launch, index) => {
                    const isSelected = selectedForYouLaunch.id === launch.id;
                    const domain = dashboardLaunchDomain(launch.website);

                    return (
                      <button
                        key={launch.id}
                        type="button"
                        onClick={() => setSelectedForYouLaunchId(launch.id)}
                        className={`group grid w-full gap-4 px-5 py-4 text-left transition-colors hover:bg-[#fbf8f3] md:grid-cols-[3.25rem_1fr_auto] md:items-center ${
                          isSelected ? 'bg-[#fbfaf7]' : 'bg-white'
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
                            <h3 className="text-xl font-semibold tracking-[-0.02em]">{launch.name}</h3>
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
                            {(launch.founderSignals ?? []).slice(0, 2).map((signal) => (
                              <span key={signal} className="rounded-full bg-[#f4f1eb] px-2 py-0.5 text-black/50">
                                {signal}
                              </span>
                            ))}
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
                  {visibleDashboardLaunches.length === 0 && (
                    <div className="px-5 py-10 text-sm leading-6 text-gray-500">
                      No launches match this filter yet. Founder background filters only use opt-in signals founders attach to launches.
                    </div>
                  )}
                </div>
              </section>

              <aside className="lg:sticky lg:top-6 lg:self-start">
                <div className="mb-6 rounded-[20px] border border-black bg-white p-4 shadow-[0_10px_34px_rgba(0,0,0,0.045)]">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-[#42520d]">Top launch</p>
                    <Flame className="launch-flame h-4 w-4 text-[#f97316]" />
                  </div>
                  <div className="mt-4 flex items-center gap-3">
                    <img
                      src={topDashboardLaunch.logoUrl || `https://www.google.com/s2/favicons?domain=${dashboardLaunchDomain(topDashboardLaunch.website)}&sz=128`}
                      alt=""
                      className="h-12 w-12 rounded-[16px] bg-[#fbfaf7] object-contain p-2"
                    />
                    <div>
                      <h3 className="text-xl font-semibold tracking-[-0.02em]">{topDashboardLaunch.name}</h3>
                      <p className="mt-1 text-sm text-black/55">{topDashboardLaunch.momentum}</p>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                    {[
                      [topDashboardLaunch.fit, 'fit'],
                      [topDashboardLaunch.saves, 'saves'],
                      [topDashboardLaunch.comments, 'notes'],
                    ].map(([value, label]) => (
                      <div key={label} className="rounded-[14px] bg-[#fbfaf7] px-3 py-2.5">
                        <p className="text-base font-semibold tracking-[-0.02em]">{value}</p>
                        <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-black/40">{label}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-y border-black/10 bg-white p-5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-[#42520d]">Selected project</p>
                    <Bookmark className="h-5 w-5 text-black/50" />
                  </div>
                  {selectedForYouLaunch.bannerUrl && (
                    <div className="mt-5 aspect-[16/7] overflow-hidden rounded-[18px] bg-[#fbfaf7]">
                      <img src={selectedForYouLaunch.bannerUrl} alt="" className="h-full w-full object-cover" />
                    </div>
                  )}
                  <div className="mt-5 flex items-center gap-3">
                    <Link to={selectedForYouLaunch.projectPath ?? `/projects/${selectedForYouLaunch.id}`} aria-label={`Open ${selectedForYouLaunch.name} project profile`}>
                      <img
                        src={selectedForYouLaunch.logoUrl || `https://www.google.com/s2/favicons?domain=${selectedDomain}&sz=128`}
                        alt=""
                        className="h-12 w-12 rounded-[16px] bg-[#fbfaf7] object-contain p-2 transition-opacity hover:opacity-75"
                      />
                    </Link>
                    <div>
                      <Link
                        to={selectedForYouLaunch.projectPath ?? `/projects/${selectedForYouLaunch.id}`}
                        className="text-xl font-semibold tracking-[-0.02em] transition-colors hover:text-[#42520d]"
                      >
                        {selectedForYouLaunch.name}
                      </Link>
                      <p className="mt-2 text-sm font-semibold text-black/55">by {selectedForYouLaunch.founder}</p>
                    </div>
                  </div>
                  <p className="mt-5 text-sm leading-7 text-black/60">{selectedForYouLaunch.description}</p>
                  {(selectedForYouLaunch.demoVideoUrl || selectedForYouLaunch.pitchVideoUrl) && (
                    <div className="mt-5 grid gap-3">
                      {selectedForYouLaunch.demoVideoUrl && (
                        <video className="aspect-video w-full rounded-[16px] bg-black object-cover" src={selectedForYouLaunch.demoVideoUrl} controls />
                      )}
                      {selectedForYouLaunch.pitchVideoUrl && (
                        <video className="aspect-video w-full rounded-[16px] bg-black object-cover" src={selectedForYouLaunch.pitchVideoUrl} controls />
                      )}
                    </div>
                  )}
                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-[16px] bg-[#fbfaf7] p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-black/40">Location</p>
                      <p className="mt-2 text-sm font-semibold">{selectedForYouLaunch.location}</p>
                    </div>
                    <div className="rounded-[16px] bg-[#fbfaf7] p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-black/40">Momentum</p>
                      <p className="mt-2 text-sm font-semibold">{selectedForYouLaunch.momentum}</p>
                    </div>
                  </div>
                  <div className="mt-5">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#42520d]">Proof signals</p>
                    <div className="grid gap-2">
                      {selectedForYouLaunch.proof.map((signal) => (
                        <div key={signal} className="flex items-start gap-2 text-sm leading-6 text-black/60">
                          <Star className="mt-1 h-3.5 w-3.5 shrink-0 text-[#42520d]" />
                          <span>{signal}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {selectedForYouLaunch.investors.map((investor) => (
                      <span key={investor} className="rounded-full bg-[#dcefc7] px-3 py-1.5 text-xs font-semibold text-black">
                        {investor}
                      </span>
                    ))}
                  </div>
                  {(selectedForYouLaunch.pitchDeckUrl || selectedForYouLaunch.pitchBookNote || (selectedForYouLaunch.founderSignals ?? []).length > 0) && (
                    <div className="mt-5 rounded-[16px] bg-[#fbfaf7] p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#42520d]">Pitch Book</p>
                        <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-black/55">
                          {selectedForYouLaunch.pitchVisibility === 'investors' ? 'Investors only' : 'Public'}
                        </span>
                      </div>
                      {selectedForYouLaunch.pitchBookNote && (
                        <p className="mt-3 text-sm leading-6 text-black/60">{selectedForYouLaunch.pitchBookNote}</p>
                      )}
                      <div className="mt-3 flex flex-wrap gap-2">
                        {selectedForYouLaunch.pitchDeckUrl && (
                          <a
                            href={selectedForYouLaunch.pitchDeckUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-[#42520d]"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            Pitch deck
                          </a>
                        )}
                        {(selectedForYouLaunch.founderSignals ?? []).map((signal) => (
                          <span key={signal} className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-black/55">
                            {signal}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="mt-6 grid gap-3">
                    <Link
                      to={selectedForYouLaunch.projectPath ?? `/projects/${selectedForYouLaunch.id}`}
                      className="inline-flex items-center justify-center rounded-full bg-[#42520d] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#34420a]"
                    >
                      Open project <ArrowUpRight className="ml-2 h-4 w-4" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleForYouPrimaryAction(selectedForYouLaunch)}
                      className={`rounded-full ${accentSurface} px-5 py-3 text-sm font-semibold ${accentForeground} transition-colors hover:opacity-90`}
                    >
                      {isInvestor ? 'Save to deal flow' : 'Launch your product'}
                    </button>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </section>
      </motion.div>
    );
  };

  const renderInvestorSignalInboxSection = (sectionId = 'matches') => (
    <section id={sectionId} className="scroll-mt-24 border-y border-black/10 bg-white">
      <div className="flex flex-col gap-3 border-b border-black/10 px-5 py-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-gray-500" />
          <h3 className="text-sm font-semibold">Signal inbox</h3>
        </div>
        <span className="text-xs text-gray-500">
          {query ? `${filteredInvestorSignals.length} filtered` : `Avg relevance ${averageSignalScore}%`}
        </span>
      </div>
      <div className="divide-y divide-black/10">
        {filteredInvestorSignals.map((signal) => (
          <article key={signalStorageId(signal)} className="px-5 py-4 transition-colors hover:bg-[#fbf8f3]">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
              <button className="min-w-0 text-left" onClick={() => openInvestorSignal(signal)}>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold">{signal.company}</p>
                  <span className="text-xs text-gray-400">by {signal.founder}</span>
                  <span className={`rounded-full ${accentSurface} px-2 py-0.5 text-xs font-medium ${accentForeground}`}>
                    {signal.relevance}%
                  </span>
                  <span className="rounded-full border border-black/10 px-2 py-0.5 text-xs text-gray-600">
                    {signal.column}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">{signal.detail}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                  <span>{signal.source}</span>
                  <span>{signal.freshness}</span>
                  <span>{signal.stage}</span>
                  <span>{signal.location}</span>
                </div>
              </button>
              <div className="flex shrink-0 flex-wrap items-start gap-2 lg:justify-end">
                <a
                  href={signal.profileUrl}
                  className="rounded-full border border-black/10 px-3 py-1.5 text-xs font-medium hover:bg-white"
                  onClick={() => addActivity(`Opened Apparent profile: ${signal.founder}`)}
                >
                  Profile
                </a>
                <a
                  href={signal.sourceUrl}
                  className="rounded-full border border-black/10 px-3 py-1.5 text-xs font-medium hover:bg-white"
                  onClick={() => addActivity(`Opened source link: ${signal.company}`)}
                >
                  Source
                </a>
                <button
                  type="button"
                  className="rounded-full border border-black/10 px-3 py-1.5 text-xs font-medium hover:bg-white disabled:opacity-50"
                  onClick={() => void moveInvestorSignal(signalStorageId(signal), 'Reviewing')}
                  disabled={signal.column === 'Reviewing'}
                >
                  Review
                </button>
                <button
                  type="button"
                  className={`rounded-full ${accentSurface} px-3 py-1.5 text-xs font-medium ${accentForeground}`}
                  onClick={() => openInvestorSignal(signal)}
                >
                  Draft
                </button>
              </div>
            </div>
          </article>
        ))}
        {filteredInvestorSignals.length === 0 && (
          <div className="px-5 py-8 text-sm text-gray-500">No source signals match this search.</div>
        )}
      </div>
    </section>
  );

  const renderMessagesSection = () => (
    <section id="messages" className="h-full min-h-0 w-full scroll-mt-24 overflow-hidden border-y border-black/10 bg-white">
      <div className="grid h-full min-h-0 lg:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="flex min-h-0 flex-col border-b border-black/10 bg-white lg:border-b-0 lg:border-r">
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-black/10 px-4">
            <div>
              <p className="text-sm font-semibold">Messages</p>
              <p className="text-xs text-gray-500">{formatCount(messageThreads.length, 'thread', 'threads')}</p>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="rounded-md border border-black/10 p-2 text-gray-500 transition-colors hover:bg-[#fbf8f3] hover:text-black"
                onClick={handleStartNewMessage}
                aria-label="New message"
                title="New message"
              >
                <SquarePen className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="rounded-md border border-black/10 p-2 text-gray-500 transition-colors hover:bg-[#fbf8f3] hover:text-black"
                onClick={handleCycleMessageFilter}
                aria-label="Filter messages"
                title={`Filter: ${messageStatusFilter}`}
              >
                <ListFilter className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="border-b border-black/10 p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={messageSearch}
                onChange={(event) => setMessageSearch(event.target.value)}
                className={`h-9 w-full border border-black/10 bg-white pl-9 pr-3 text-sm outline-none placeholder:text-gray-400 ${dmFocusBorder}`}
                placeholder="Search conversations"
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
              <span>{messageStatusFilter === 'all' ? 'All conversations' : `${messageStatusFilter} only`}</span>
              {messageStatusFilter !== 'all' && (
                <button type="button" className="font-medium text-black" onClick={() => setMessageStatusFilter('all')}>
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {filteredMessageThreads.map((thread) => {
              const isActive = activeMessageThread?.id === thread.id;
              return (
                <button
                  key={thread.id}
                  type="button"
                  className={`w-full border-b border-black/10 px-4 py-3 text-left transition-colors ${
                    isActive ? dmSelectedSurface : 'hover:bg-[#fbf8f3]'
                  }`}
                  onClick={() => handleSelectMessageThread(thread)}
                >
                  <div className="flex gap-3">
                    <Avatar className="size-10 rounded-md">
                      <AvatarFallback className={`rounded-md text-xs font-semibold ${accentSurface} ${accentForeground}`}>
                        {getInitials(thread.recipient)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate text-sm font-semibold">{thread.recipient}</p>
                        <span className="shrink-0 text-[11px] text-gray-400">{formatMessageTime(thread.latest.updatedAt)}</span>
                      </div>
                      <p className="mt-1 truncate text-xs font-medium text-gray-500">{thread.latest.subject || 'Apparent message'}</p>
                      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-gray-500">{thread.latest.body}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] ${dmSoftSurface} text-gray-600`}>{thread.latest.status}</span>
                        <span className="text-[11px] text-gray-400">{formatCount(thread.messages.length, 'message', 'messages')}</span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}

            {filteredMessageThreads.length === 0 && (
              <div className="px-4 py-10 text-center">
                <MessageCircle className="mx-auto h-6 w-6 text-gray-300" />
                <p className="mt-3 text-sm font-medium">{messageThreads.length ? 'No conversations match' : 'No conversations yet'}</p>
                <p className="mt-1 text-xs leading-relaxed text-gray-500">Start with a founder, investor, or meetup contact.</p>
                <button
                  type="button"
                  className={`mt-4 rounded-full ${accentSurface} px-4 py-2 text-sm font-medium ${accentForeground} transition-opacity hover:opacity-90`}
                  onClick={handleStartNewMessage}
                >
                  New message
                </button>
              </div>
            )}
          </div>
        </aside>

        <div className="flex min-h-0 flex-col">
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-black/10 bg-white px-4">
            <div className="flex min-w-0 items-center gap-3">
              <Avatar className="size-11 rounded-md">
                <AvatarFallback className={`rounded-md text-xs font-semibold ${accentSurface} ${accentForeground}`}>
                  {getInitials(activeMessageThread?.recipient ?? messageDraft.recipient)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {activeMessageThread?.recipient || messageDraft.recipient || 'New conversation'}
                </p>
                <p className="mt-1 truncate text-xs text-gray-500">
                  {activeMessageThread
                    ? activeMessageThread.latest.subject || 'Apparent message'
                    : 'Compose a direct Apparent note'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-gray-500">
              <button type="button" className="rounded-md p-2 transition-colors hover:bg-[#fbf8f3] hover:text-black" aria-label="Video call">
                <Video className="h-4 w-4" />
              </button>
              <button type="button" className="rounded-md p-2 transition-colors hover:bg-[#fbf8f3] hover:text-black" aria-label="Phone call">
                <Phone className="h-4 w-4" />
              </button>
              <button type="button" className="rounded-md p-2 transition-colors hover:bg-[#fbf8f3] hover:text-black" aria-label="Search conversation">
                <Search className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className={`flex min-h-0 flex-1 flex-col overflow-y-auto ${dmSurface} px-4 py-5`}>
            {!activeMessageThread && (
              <div className={`mx-auto mt-4 w-full max-w-3xl border ${dmAccentBorder} bg-white px-5 py-5 shadow-sm shadow-black/[0.03]`}>
                <p className="text-sm font-semibold">Start a new conversation</p>
                <p className="mt-1 text-xs leading-relaxed text-gray-500">
                  Draft a founder note, investor follow-up, or meetup reply. It will persist in your Apparent inbox.
                </p>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <input
                    className={`h-9 border border-black/10 bg-white px-3 text-sm outline-none placeholder:text-gray-400 ${dmFocusBorder}`}
                    placeholder="Recipient"
                    value={messageDraft.recipient}
                    onChange={(event) => setMessageDraft((current) => ({ ...current, recipient: event.target.value }))}
                  />
                  <input
                    className={`h-9 border border-black/10 bg-white px-3 text-sm outline-none placeholder:text-gray-400 ${dmFocusBorder}`}
                    placeholder="Subject"
                    value={messageDraft.subject}
                    onChange={(event) => setMessageDraft((current) => ({ ...current, subject: event.target.value }))}
                  />
                </div>
              </div>
            )}

            {activeMessageThread && (
              <div className="mx-auto mt-auto flex w-full max-w-4xl flex-col gap-3">
                {activeThreadMessages.map((message) => (
                  <div key={message.id} className="flex justify-end">
                    <div className={`max-w-[82%] rounded-[22px] rounded-br-md border ${dmAccentBorder} ${accentSurface} px-4 py-3 ${accentForeground} shadow-sm shadow-black/[0.05] md:max-w-[72%]`}>
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <p className={`truncate text-xs font-semibold ${isInvestor ? 'text-white/75' : 'text-black/55'}`}>{message.subject || 'Apparent message'}</p>
                        <span className={`shrink-0 text-[11px] ${isInvestor ? 'text-white/60' : 'text-black/45'}`}>{formatMessageTime(message.updatedAt)}</span>
                      </div>
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.body}</p>
                      <div className="mt-3 flex justify-end">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] ${dmBubbleMeta}`}>{message.status}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <form className="shrink-0 border-t border-black/10 bg-white" onSubmit={handleMessageSubmit}>
            <div className="flex items-center gap-2 px-3 py-3">
              <button type="button" className="rounded-md p-2 text-gray-500 transition-colors hover:bg-[#fbf8f3] hover:text-black" aria-label="Emoji">
                <Smile className="h-4 w-4" />
              </button>
              <button type="button" className="rounded-md p-2 text-gray-500 transition-colors hover:bg-[#fbf8f3] hover:text-black" aria-label="Attach">
                <Paperclip className="h-4 w-4" />
              </button>
              <input
                className={`h-10 min-w-0 flex-1 border border-black/10 bg-white px-3 text-sm outline-none placeholder:text-gray-400 ${dmFocusBorder}`}
                placeholder={activeMessageThread ? `Message ${activeMessageThread.recipient}` : 'Type a message'}
                value={messageDraft.body}
                onChange={(event) => setMessageDraft((current) => ({ ...current, body: event.target.value }))}
              />
              <button
                type="button"
                className="hidden rounded-full border border-black/10 px-4 py-2 text-sm font-medium hover:bg-[#fbf8f3] disabled:cursor-not-allowed disabled:opacity-60 sm:inline-flex"
                onClick={() => handleSaveMessage('draft')}
                disabled={savingWorkflow === 'message'}
              >
                Draft
              </button>
              <button
                type="submit"
                className={`inline-flex items-center gap-2 rounded-full ${accentSurface} px-4 py-2 text-sm font-medium ${accentForeground} transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60`}
                disabled={savingWorkflow === 'message'}
              >
                <LogoIcon className="h-4 w-4" />
                {savingWorkflow === 'message' ? 'Sending...' : 'Send'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );

  const renderMessagesPage = () => (
    <motion.div
      key="messages-main"
      className="flex min-h-0 flex-1"
      initial={{ opacity: 0, y: 10, filter: 'blur(2px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      exit={{ opacity: 0, y: -8, filter: 'blur(2px)' }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
    >
      <div className="mx-auto flex min-h-0 w-full max-w-[1292px] flex-1">
        {renderMessagesSection()}
      </div>
    </motion.div>
  );

  const renderInvestorBuilderDiscoveryPage = () => {
    const savedBuilderCount = builderDiscoveryStates.filter((state) => state.saved && !state.hidden).length;
    const hiddenBuilderCount = builderDiscoveryStates.filter((state) => state.hidden).length;
    const freshSignalCount = signalRows.filter((signal) =>
      ['18 min ago', '41 min ago', '2h ago', 'Today'].some((freshness) => signal.freshness.includes(freshness)),
    ).length;
    const topBuilders = filteredBuilderNodes.slice(0, 3);

    return (
      <motion.div
        key="investor-discovery-main"
        initial={{ opacity: 0, y: 10, filter: 'blur(2px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        exit={{ opacity: 0, y: -8, filter: 'blur(2px)' }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
      >
        <div id="matches" className="mx-auto max-w-[1292px] scroll-mt-24 space-y-6">
          <section className="border-y border-black/10 bg-white">
            <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_360px]">
              <div className="px-5 py-5">
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${accentSurface}`} />
                  <p className="text-sm font-semibold">Builder Discovery</p>
                </div>
                <p className="mt-3 max-w-3xl text-sm leading-relaxed text-gray-600">
                  A private sourcing workspace for finding Apparent builders by public proof, freshness, location, stage, and thesis fit.
                </p>
                <div className="mt-4 grid gap-2 sm:grid-cols-4">
                  <div className="border-y border-black/10 px-3 py-3">
                    <p className="text-xs text-gray-500">Ranked builders</p>
                    <p className="mt-1 text-2xl font-semibold">{filteredBuilderNodes.length}</p>
                  </div>
                  <div className="border-y border-black/10 px-3 py-3">
                    <p className="text-xs text-gray-500">Signal inbox</p>
                    <p className="mt-1 text-2xl font-semibold">{filteredInvestorSignals.length}</p>
                  </div>
                  <div className="border-y border-black/10 px-3 py-3">
                    <p className="text-xs text-gray-500">Saved</p>
                    <p className="mt-1 text-2xl font-semibold">{savedBuilderCount}</p>
                  </div>
                  <div className="border-y border-black/10 px-3 py-3">
                    <p className="text-xs text-gray-500">Fresh</p>
                    <p className="mt-1 text-2xl font-semibold">{freshSignalCount}</p>
                  </div>
                </div>
              </div>
              <aside className="border-t border-black/10 px-5 py-5 lg:border-l lg:border-t-0">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Discovery state</p>
                <div className="mt-3 divide-y divide-black/10 border-y border-black/10">
                  <div className="flex items-center justify-between py-2 text-sm">
                    <span className="text-gray-600">Avg relevance</span>
                    <span className="font-semibold">{averageSignalScore}%</span>
                  </div>
                  <div className="flex items-center justify-between py-2 text-sm">
                    <span className="text-gray-600">Hidden builders</span>
                    <span className="font-semibold">{hiddenBuilderCount}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 text-sm">
                    <span className="text-gray-600">Review queue</span>
                    <span className="font-semibold">{investorPipeline.find((column) => column.stage === 'Reviewing')?.items.length ?? 0}</span>
                  </div>
                </div>
                <button
                  type="button"
                  className={`mt-4 w-full rounded-full ${accentSurface} px-4 py-2 text-sm font-medium ${accentForeground}`}
                  onClick={() => {
                    setActiveView('profile');
                    navigate(`${dashboardBasePath}#profile`);
                  }}
                >
                  Tune thesis
                </button>
              </aside>
            </div>
          </section>

          {renderNetworkMapSection()}

          <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-6">
              {renderInvestorSignalInboxSection('signal-inbox')}
            </div>
            <aside className="space-y-6">
              <section className="border-y border-black/10 bg-white py-4">
                <p className="px-4 text-xs font-medium uppercase tracking-wide text-gray-500">Highest-fit builders</p>
                <div className="mt-3 divide-y divide-black/10">
                  {topBuilders.map((builder) => {
                    const state = getBuilderState(builder);

                    return (
                      <button
                        key={builder.id}
                        type="button"
                        className="w-full px-4 py-3 text-left transition-colors hover:bg-[#fbf8f3]"
                        onClick={() => {
                          setSelectedBuilderId(builder.id);
                          setSelectedClusterCity(builder.location);
                          window.setTimeout(() => scrollToSection('map'), 50);
                        }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">{builder.company}</p>
                            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-gray-500">{builder.buildSummary}</p>
                          </div>
                          <span className={`rounded-full ${accentSurface} px-2 py-1 text-xs font-medium ${accentForeground}`}>
                            {builder.fitScore}%
                          </span>
                        </div>
                        <div className="mt-2 flex items-center gap-2 text-[11px] text-gray-500">
                          <span>{builder.stage}</span>
                          <span>{builder.location}</span>
                          {state.saved && <span className="font-medium text-black">saved</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="border-y border-black/10 bg-white py-4">
                <p className="px-4 text-xs font-medium uppercase tracking-wide text-gray-500">Fast actions</p>
                <div className="mt-3 space-y-2 px-4">
                  <button
                    type="button"
                    className="w-full rounded-full border border-black/10 px-4 py-2 text-sm font-medium hover:bg-[#fbf8f3]"
                    onClick={() => {
                      setQuery('devtools');
                      scrollToSection('signal-inbox');
                    }}
                  >
                    Filter devtools
                  </button>
                  <button
                    type="button"
                    className="w-full rounded-full border border-black/10 px-4 py-2 text-sm font-medium hover:bg-[#fbf8f3]"
                    onClick={() => {
                      setNetworkFilters((current) => ({ ...current, matchOnly: true }));
                      scrollToSection('map');
                    }}
                  >
                    Show only high-fit builders
                  </button>
                  <button
                    type="button"
                    className={`w-full rounded-full ${accentSurface} px-4 py-2 text-sm font-medium ${accentForeground}`}
                    onClick={() => {
                      setActiveView('overview');
                      navigate(`${dashboardBasePath}#deals`);
                      window.setTimeout(() => scrollToSection('deals'), 50);
                    }}
                  >
                    Open deal-flow Kanban
                  </button>
                </div>
              </section>
            </aside>
          </section>
        </div>
      </motion.div>
    );
  };

  const renderFounderMatchesPage = () => {
    const savedMatches = matches.filter((match) => savedInvestorMatchSet.has(match.name));
    const topMatch = filteredMatches[0] ?? matches[0];

    return (
      <motion.div
        key="founder-matches-main"
        initial={{ opacity: 0, y: 10, filter: 'blur(2px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        exit={{ opacity: 0, y: -8, filter: 'blur(2px)' }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
      >
        <div id="matches" className="mx-auto max-w-[1292px] scroll-mt-24 space-y-6">
          <section className="border-y border-black/10 bg-white">
            <div className="grid gap-0 md:grid-cols-[minmax(0,1fr)_320px]">
              <div className="px-5 py-5">
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${accentSurface}`} />
                  <p className="text-sm font-semibold">Investor Matches</p>
                </div>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-gray-600">
                  Ranked investors based on your profile, category, stage, location, launches, and who you want to meet.
                </p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs text-gray-500">
                  <span className="rounded-full bg-[#f4f1eb] px-3 py-1.5">{profileStrength}% profile strength</span>
                  <span className="rounded-full bg-[#f4f1eb] px-3 py-1.5">{matches.length} investors ranked</span>
                  <span className="rounded-full bg-[#f4f1eb] px-3 py-1.5">{savedInvestorMatchNames.length} saved</span>
                </div>
              </div>
              <div className="border-t border-black/10 px-5 py-5 md:border-l md:border-t-0">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Best current path</p>
                <p className="mt-2 text-sm font-semibold">{topMatch?.name ?? 'Complete your profile'}</p>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">
                  {topMatch?.warmPath ?? 'Add your bio, links, location, and product history to unlock sharper routing.'}
                </p>
              </div>
            </div>
          </section>

          <section className="border-y border-black/10 bg-white">
            <div className="flex flex-col gap-3 border-b border-black/10 px-5 py-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-gray-500" />
                <h3 className="text-sm font-semibold">Thesis-fit investors</h3>
              </div>
              <span className="text-xs text-gray-500">
                {query ? `${filteredMatches.length} filtered` : `${matches.length} ranked by fit`}
              </span>
            </div>

            <div className="divide-y divide-black/10">
              {filteredMatches.map((match) => {
                const isSaved = savedInvestorMatchSet.has(match.name);

                return (
                  <article key={match.name} className="px-5 py-5 transition-colors hover:bg-[#fbf8f3]">
                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_180px_220px]">
                      <button className="min-w-0 text-left" onClick={() => setSelectedMatch(match)}>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-base font-semibold">{match.name}</p>
                          <span className={`rounded-full ${accentSurface} px-2.5 py-1 text-xs font-medium ${accentForeground}`}>
                            {match.score}
                          </span>
                          <span className="rounded-full border border-black/10 px-2.5 py-1 text-xs text-gray-600">{match.signal}</span>
                        </div>
                        <p className="mt-2 text-sm leading-relaxed text-gray-600">{match.thesis ?? match.detail}</p>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500">
                          {(match.sectors ?? []).map((sector) => (
                            <span key={sector} className="rounded-full bg-[#f4f1eb] px-2.5 py-1">
                              {sector}
                            </span>
                          ))}
                        </div>
                      </button>

                      <div className="space-y-3 text-sm">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-gray-500">Check</p>
                          <p className="mt-1 font-medium">{match.checkSize}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wide text-gray-500">Stage</p>
                          <p className="mt-1 font-medium">{match.stageFocus}</p>
                        </div>
                        <div className="flex items-center gap-1.5 text-gray-600">
                          <MapPin className="h-3.5 w-3.5" />
                          <span>{match.location}</span>
                        </div>
                      </div>

                      <div className="flex flex-col justify-between gap-3">
                        <div className="space-y-2 text-xs text-gray-600">
                          {(match.why ?? []).slice(0, 2).map((reason) => (
                            <div key={reason} className="flex gap-2">
                              <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${accentSurface}`} />
                              <span>{reason}</span>
                            </div>
                          ))}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                              isSaved ? `${accentSurface} border-transparent ${accentForeground}` : 'border-black/10 hover:bg-white'
                            }`}
                            onClick={() => handleToggleInvestorMatchSave(match)}
                          >
                            {isSaved ? 'Saved' : 'Save'}
                          </button>
                          <button
                            type="button"
                            className="rounded-full border border-black/10 px-3 py-1.5 text-xs font-medium hover:bg-white"
                            onClick={() => setSelectedMatch(match)}
                          >
                            View thesis
                          </button>
                          <button
                            type="button"
                            className={`rounded-full ${accentSurface} px-3 py-1.5 text-xs font-medium ${accentForeground} disabled:opacity-60`}
                            onClick={() => handleMessageInvestorMatch(match)}
                            disabled={savingWorkflow === 'message'}
                          >
                            Message
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}

              {filteredMatches.length === 0 && (
                <div className="px-5 py-8 text-sm text-gray-500">No investors match this search yet.</div>
              )}
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="border-y border-black/10 bg-white">
              <div className="flex items-center gap-2 border-b border-black/10 px-5 py-3">
                <Target className="h-4 w-4 text-gray-500" />
                <h3 className="text-sm font-semibold">Proof gaps to improve matches</h3>
              </div>
              <div className="divide-y divide-black/10">
                {founderIntakeFields.slice(0, 5).map((field) => {
                  const isComplete = Boolean(intakeValues[field.key]?.trim());

                  return (
                    <div key={field.key} className="flex items-center justify-between gap-4 px-5 py-3">
                      <div>
                        <p className="text-sm font-medium">{field.label}</p>
                        <p className="mt-1 text-xs text-gray-500">{isComplete ? 'Captured for matching' : field.placeholder}</p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${isComplete ? `${accentSurface} ${accentForeground}` : 'bg-[#f4f1eb] text-gray-500'}`}>
                        {isComplete ? 'ready' : 'missing'}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="border-t border-black/10 px-5 py-4">
                <button
                  type="button"
                  className={`rounded-full ${accentSurface} px-4 py-2 text-sm font-medium ${accentForeground}`}
                  onClick={() => topMatch && handlePrepProofForMatch(topMatch)}
                >
                  Prep profile
                </button>
              </div>
            </div>

            <div className="border-y border-black/10 bg-white">
              <div className="flex items-center gap-2 border-b border-black/10 px-5 py-3">
                <Bookmark className="h-4 w-4 text-gray-500" />
                <h3 className="text-sm font-semibold">Saved investors</h3>
              </div>
              <div className="divide-y divide-black/10">
                {savedMatches.map((match) => (
                  <button
                    key={match.name}
                    type="button"
                    className="w-full px-5 py-3 text-left transition-colors hover:bg-[#fbf8f3]"
                    onClick={() => setSelectedMatch(match)}
                  >
                    <p className="text-sm font-medium">{match.name}</p>
                    <p className="mt-1 text-xs text-gray-500">{match.responseWindow}</p>
                  </button>
                ))}
                {savedMatches.length === 0 && (
                  <div className="px-5 py-8 text-sm text-gray-500">Save investors to build your outreach shortlist.</div>
                )}
              </div>
            </div>
          </section>
        </div>
      </motion.div>
    );
  };

  const isMessagesView = activeView === 'messages';
  const isVCHeatMapView = activeView === 'vc-heatmap';

  const onboardingSteps = isInvestor
    ? [
        {
          title: 'Define your thesis',
          subtitle: 'What kind of founders and companies do you back? This powers your signal ranking.',
          fields: [
            { key: 'thesis', label: 'Investment thesis', placeholder: 'Developer infrastructure tools with clear usage pull from technical teams.', kind: 'textarea' as FieldKind },
            { key: 'sectors', label: 'Sectors', placeholder: 'AI infra, devtools, workflow automation', kind: 'input' as FieldKind },
          ],
        },
        {
          title: 'Your investment focus',
          subtitle: "A bit more detail so we can match you to the right builders.",
          fields: [
            { key: 'stage', label: 'Preferred stage', placeholder: 'Select stage', kind: 'select' as FieldKind, options: investorStageOptions },
            { key: 'checkSize', label: 'Typical check size', placeholder: '$250k – $1.5M', kind: 'input' as FieldKind },
            { key: 'geography', label: 'Geography', placeholder: 'SF, NYC, remote-first', kind: 'input' as FieldKind },
          ],
        },
      ]
    : [
        {
          title: "Tell us who you are",
          subtitle: 'This is what investors and founders see when they find your profile.',
          fields: [
            { key: 'profileName', label: 'Your name', placeholder: 'Your name', kind: 'input' as FieldKind },
            { key: 'headline', label: 'Headline', placeholder: 'Founder building AI tools for engineering teams.', kind: 'input' as FieldKind },
            { key: 'bio', label: 'Bio', placeholder: 'A short founder bio: what you care about, where you have built, and who you want to meet.', kind: 'textarea' as FieldKind },
          ],
        },
        {
          title: "What are you building?",
          subtitle: 'Help investors and co-builders understand your current focus.',
          fields: [
            { key: 'currentBuild', label: "What you're building", placeholder: 'A GitHub-native analytics layer for engineering leaders.', kind: 'textarea' as FieldKind },
            { key: 'category', label: 'Category', placeholder: 'Devtools, AI infra, SaaS', kind: 'input' as FieldKind },
            { key: 'stage', label: 'Current stage', placeholder: 'Select stage', kind: 'select' as FieldKind, options: founderStageOptions },
            { key: 'location', label: 'Location', placeholder: 'Brooklyn / remote', kind: 'input' as FieldKind },
          ],
        },
      ];

  const currentOnboardingStep = onboardingSteps[onboardingStep];
  const isLastOnboardingStep = onboardingStep === onboardingSteps.length - 1;

  if (isOnboarding && currentOnboardingStep) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fbf8f3] px-4">
        <div className="w-full max-w-lg">
          <div className="mb-8 flex items-center gap-2">
            <LogoIcon className="h-6 w-6 text-black" />
            <img src="/apparent-wordmark.png" alt="Apparent" className="h-6 w-auto object-contain" />
          </div>

          <div className="mb-6 flex items-center gap-2">
            {onboardingSteps.map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors ${i <= onboardingStep ? (isInvestor ? 'bg-green-700' : 'bg-[#02A070]') : 'bg-black/10'}`}
              />
            ))}
          </div>

          <p className="mb-1 text-sm text-black/40">
            Step {onboardingStep + 1} of {onboardingSteps.length}
          </p>
          <h1 className="mb-1 text-2xl font-semibold tracking-tight">{currentOnboardingStep.title}</h1>
          <p className="mb-8 text-sm leading-relaxed text-black/55">{currentOnboardingStep.subtitle}</p>

          <div className="flex flex-col gap-4">
            {currentOnboardingStep.fields.map((field) => (
              <div key={field.key} className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-black/70">{field.label}</label>
                {field.kind === 'textarea' ? (
                  <textarea
                    rows={3}
                    placeholder={field.placeholder}
                    value={intakeValues[field.key] ?? ''}
                    onChange={(e) => handleIntakeChange(field.key, e.target.value)}
                    className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm leading-relaxed text-black placeholder:text-black/25 focus:border-black/30 focus:outline-none"
                  />
                ) : field.kind === 'select' && field.options ? (
                  <select
                    value={intakeValues[field.key] ?? ''}
                    onChange={(e) => handleIntakeChange(field.key, e.target.value)}
                    className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-black focus:border-black/30 focus:outline-none"
                  >
                    <option value="">{field.placeholder}</option>
                    {field.options.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder={field.placeholder}
                    value={intakeValues[field.key] ?? ''}
                    onChange={(e) => handleIntakeChange(field.key, e.target.value)}
                    className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-black placeholder:text-black/25 focus:border-black/30 focus:outline-none"
                  />
                )}
              </div>
            ))}
          </div>

          <div className="mt-8 flex items-center justify-between">
            {onboardingStep > 0 ? (
              <button
                type="button"
                onClick={() => setOnboardingStep((s) => s - 1)}
                className="text-sm text-black/40 hover:text-black/70"
              >
                ← Back
              </button>
            ) : (
              <span />
            )}
            <button
              type="button"
              onClick={isLastOnboardingStep ? handleOnboardingComplete : () => setOnboardingStep((s) => s + 1)}
              className={`rounded-xl px-6 py-3 text-sm font-semibold text-white transition ${isInvestor ? 'bg-green-700 hover:bg-green-800' : 'bg-black hover:bg-black/80'}`}
            >
              {isLastOnboardingStep ? 'Enter your workspace →' : 'Continue →'}
            </button>
          </div>

          <p className="mt-6 text-center text-xs text-black/30">
            You can update any of this later from your profile.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fbf8f3] text-black">
      <SessionNavBar role={role} user={user} />

      <main className="min-h-screen pl-[15rem]">
        <div className={isVCHeatMapView ? 'min-h-screen' : isMessagesView ? 'mx-auto flex h-screen w-full max-w-[1440px] flex-col overflow-hidden px-6 pt-6' : 'mx-auto max-w-[1440px] px-6 py-6'}>
          {!isVCHeatMapView && (
          <header className={`${isMessagesView ? 'mb-0 shrink-0 pb-4' : 'mb-6'} flex flex-col gap-4 md:flex-row md:items-center md:justify-between`}>
            <Switch
              name="dashboard-view"
              value={activeView}
              onValueChange={handleDashboardViewChange}
              size="medium"
              style={{ width: 'min(100%, 360px)' }}
            >
              <Switch.Control
                label={isInvestor ? 'Investor workspace' : 'Founder workspace'}
                value="overview"
                activeClassName={`${accentSurface} ${accentSwitchForeground}`}
              />
              <Switch.Control
                label="For You"
                value="for-you"
                activeClassName={`${accentSurface} ${accentSwitchForeground}`}
              />
            </Switch>

            <div className="flex w-full max-w-4xl items-center gap-3 md:justify-end">
              <ActionSearchBar
                value={query}
                onValueChange={setQuery}
                onActionSelect={handleDashboardSearchAction}
                actions={dashboardSearchActions}
                className="max-w-none"
                label="Search Apparent"
                placeholder={
                    activeView === 'for-you'
                      ? 'Search the front page'
                      : isInvestor
                        ? 'Search signals, founders, deal flow'
                        : 'Search builders, investors, cities'
                }
              />
              <div className="relative">
                <button
                  className="rounded-full border border-black/10 bg-white p-2.5 text-gray-700 transition-colors hover:text-black"
                  onClick={() => setShowNotifications((current) => !current)}
                  aria-label="Toggle notifications"
                >
                  <Bell className="h-4 w-4" />
                </button>
                {showNotifications && (
                  <div className="absolute right-0 top-12 z-30 w-80 rounded-2xl border border-black/10 bg-white p-4 shadow-xl">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="font-semibold">Activity</p>
                      <button onClick={() => setShowNotifications(false)} aria-label="Close notifications">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="space-y-2">
                      {activity.map((item) => (
                        <div key={item} className="rounded-xl bg-gray-50 p-3 text-sm text-gray-700">
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </header>
          )}

          {dashboardError && (
            <div className="mb-4 border-y border-red-200 bg-red-50 px-5 py-3 text-sm text-red-700">
              {dashboardError}
            </div>
          )}

          {isDashboardLoading && (
            <div className="mb-4 border-y border-black/10 bg-white px-5 py-3 text-sm text-gray-500">
              Loading workspace data...
            </div>
          )}

          <AnimatePresence mode="wait" initial={false}>
            {activeView === 'profile' ? (
              renderProfilePage()
            ) : activeView === 'products' ? (
              renderProductsPage()
            ) : activeView === 'matches' ? (
              isInvestor ? renderInvestorBuilderDiscoveryPage() : renderFounderMatchesPage()
            ) : activeView === 'messages' ? (
              renderMessagesPage()
            ) : activeView === 'deals' ? (
              renderDealsPage()
            ) : activeView === 'terms' ? (
              renderTermsPage()
            ) : activeView === 'knowledge' ? (
              renderKnowledgePage()
            ) : activeView === 'feedback' ? (
              renderFeedbackPage()
            ) : activeView === 'vc-heatmap' ? (
              <motion.div
                key="vc-heatmap-main"
                id="vc-heatmap"
                initial={{ opacity: 0, y: 10, filter: 'blur(2px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -8, filter: 'blur(2px)' }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
              >
                <HeatMap includeVCContacts vcOnly />
              </motion.div>
            ) : activeView === 'overview' ? (
              <motion.div
                key="workspace-main"
                initial={{ opacity: 0, y: 10, filter: 'blur(2px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -8, filter: 'blur(2px)' }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
              >
              <div
                id="overview"
                className={`grid scroll-mt-24 items-start gap-8 xl:justify-center ${
                  isInvestor ? 'xl:grid-cols-[minmax(0,960px)_300px]' : 'xl:grid-cols-[minmax(0,960px)]'
                }`}
              >
                <div className="space-y-8">
                {isInvestor && renderNetworkMapSection()}
                </div>

                {isInvestor && (
                  <aside className="space-y-6">
                    <section id="digest" className="scroll-mt-24 border-y border-black/10 bg-white py-4">
                      <div className="flex items-center gap-2 px-4">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <h3 className="text-sm font-semibold">Daily digest</h3>
                      </div>
                      <div className="mt-3 divide-y divide-black/10">
                        {investorDigestItems.map((item) => (
                          <button
                            key={item}
                            className="w-full px-4 py-3 text-left text-xs leading-relaxed text-gray-600 transition-colors hover:bg-[#fbf8f3]"
                            onClick={() => addActivity(`Opened digest item: ${item}`)}
                          >
                            {item}
                          </button>
                        ))}
                      </div>
                      <button
                        className="mx-4 mt-3 w-[calc(100%-2rem)] rounded-full border border-black/10 px-4 py-2 text-sm font-medium hover:bg-[#fbf8f3]"
                        onClick={toggleDailyDigest}
                      >
                        {dailyDigestEnabled ? 'Pause digest' : 'Enable digest'}
                      </button>
                    </section>
                  </aside>
                )}
              </div>
              {!isInvestor && (
                <div className="mx-auto mt-8 max-w-[1292px]">
                  {renderNetworkMapSection()}
                </div>
              )}
              </motion.div>
            ) : activeView === 'for-you' ? (
              renderForYouLaunchPage()
            ) : (
              <motion.div
                key="for-you-main"
                initial={{ opacity: 0, y: 10, filter: 'blur(2px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -8, filter: 'blur(2px)' }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
              >
              <section id="for-you" className="scroll-mt-24">
                <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,960px)_300px] xl:justify-center">
                  <div className="overflow-hidden border-y border-black/10 bg-white">
                    <div className="flex items-center justify-between border-b border-black/10 px-5 py-3">
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span className={`h-2 w-2 rounded-full ${accentSurface}`} />
                        {profileSaved ? 'Personalized + front page' : 'Front page'}
                      </div>
                      <button
                        className="text-sm font-medium text-gray-500 hover:text-black"
                        onClick={() => handleDashboardViewChange('overview')}
                      >
                        tune workspace
                      </button>
                    </div>

                    <div className="divide-y divide-black/10">
                      {filteredFeed.map((item) => (
                        <article key={item.title} className="px-5 py-5 transition-colors hover:bg-[#fbf8f3]">
                          <button
                            className="w-full text-left"
                            onClick={() => addActivity(`Opened feed item: ${item.title}`)}
                          >
                            <div className="flex items-start gap-3">
                              <div
                                className={`mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-xs font-semibold ${
                                  item.source === 'For you' ? `${accentSurface} ${accentForeground}` : 'bg-black text-white'
                                }`}
                              >
                                {item.actor
                                  .split(' ')
                                  .map((word) => word[0])
                                  .join('')
                                  .slice(0, 2)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                  <span className="text-sm font-semibold">{item.actor}</span>
                                  <span className="text-xs text-gray-400">{item.meta}</span>
                                  <span className="text-xs text-gray-400">·</span>
                                  <span className="text-xs text-gray-500">{item.source}</span>
                                </div>
                                <h3 className="mt-2 text-lg font-semibold leading-snug">{item.title}</h3>
                                <p className="mt-2 text-sm leading-relaxed text-gray-600">{item.detail}</p>
                                <div className="mt-3">
                                  <span
                                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                                      item.source === 'For you'
                                        ? `${accentSurface} ${accentForeground}`
                                        : 'bg-gray-100 text-gray-700'
                                    }`}
                                  >
                                    {item.tag}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </button>
                          <div className="ml-12 mt-4 flex max-w-sm items-center justify-between text-gray-400">
                            <button
                              className="flex items-center gap-1.5 text-xs transition-colors hover:text-black"
                              onClick={() => handleFeedReply(item)}
                            >
                              <MessageCircle className="h-4 w-4" />
                              {item.reply ? 'Drafted' : 'Reply'}
                            </button>
                            <button
                              className="flex items-center gap-1.5 text-xs transition-colors hover:text-black"
                              onClick={() => handleFeedToggle(item, 'reposted')}
                            >
                              <Repeat2 className="h-4 w-4" />
                              {item.reposted ? 'Reposted' : 'Repost'}
                            </button>
                            <button
                              className="flex items-center gap-1.5 text-xs transition-colors hover:text-black"
                              onClick={() => handleFeedToggle(item, 'saved')}
                            >
                              <Bookmark className="h-4 w-4" />
                              {item.saved ? 'Saved' : 'Save'}
                            </button>
                          </div>
                        </article>
                      ))}
                      {filteredFeed.length === 0 && (
                        <div className="px-5 py-8 text-sm text-gray-500">No feed items found for this search.</div>
                      )}
                    </div>
                  </div>

                  <aside className="hidden space-y-6 xl:block">
                    <section className="border-y border-black/10 bg-white py-4">
                      <p className="px-4 text-xs font-medium uppercase tracking-wide text-gray-500">Trending signals</p>
                      <div className="mt-3 divide-y divide-black/10">
                        {feedItems.filter((item) => item.source === 'Front page').slice(0, 3).map((item) => (
                          <button
                            key={item.title}
                            className="w-full px-4 py-3 text-left transition-colors hover:bg-[#fbf8f3]"
                            onClick={() => addActivity(`Opened trend: ${item.title}`)}
                          >
                            <p className="text-sm font-medium leading-snug">{item.tag}</p>
                            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-gray-500">{item.title}</p>
                          </button>
                        ))}
                      </div>
                    </section>

                    <section className="border-y border-black/10 bg-white py-4">
                      <p className="px-4 text-xs font-medium uppercase tracking-wide text-gray-500">
                        {isInvestor ? 'Builders to watch' : 'Investors to watch'}
                      </p>
                      <div className="mt-3 divide-y divide-black/10">
                        {filteredMatches.slice(0, 3).map((match) => (
                          <button
                            key={match.name}
                            className="w-full px-4 py-3 text-left transition-colors hover:bg-[#fbf8f3]"
                            onClick={() => {
                              setSelectedMatch(match);
                              addActivity(`Opened ${match.name}`);
                            }}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-medium">{match.name}</p>
                                <p className="mt-1 text-xs text-gray-500">{match.signal}</p>
                              </div>
                              <span className={`rounded-full ${accentSurface} px-2 py-1 text-xs font-medium ${accentForeground}`}>
                                {match.score}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                      {!profileSaved && (
                        <button
                          className="mx-4 mt-3 rounded-full border border-black/10 px-4 py-2 text-sm font-medium hover:bg-[#fbf8f3]"
                          onClick={() => handleDashboardViewChange('overview')}
                        >
                          Personalize feed
                        </button>
                      )}
                    </section>
                  </aside>
                </div>
              </section>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence initial={false}>
            {activeView === 'overview' && (
              <motion.div
                key="workspace-extra"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
              >
                {isInvestor ? (
                  <>
                    <div className="mx-auto mt-8 max-w-[1292px]">
                      {renderInvestorDealFlowSection()}
                    </div>

                    <div className="mx-auto mt-8 grid max-w-[1292px] gap-8 xl:grid-cols-3">
                      {signalRows.slice(0, 3).map((signal) => (
                        <section key={signalStorageId(signal)} className="scroll-mt-24 border-y border-black/10 bg-white py-4">
                          <div className="flex items-center gap-2 px-4">
                            <MessageCircle className="h-4 w-4 text-gray-500" />
                            <h3 className="text-sm font-semibold">Outreach draft</h3>
                          </div>
                          <p className="px-4 pt-2 text-xs font-medium text-gray-500">{signal.company} - {signal.founder}</p>
                          <div className="px-4 pt-3">
                            <textarea
                              value={signal.outreach}
                              onChange={(event) => handleOutreachDraftChange(signal, event.target.value)}
                              className="min-h-28 w-full resize-none border-0 bg-transparent text-xs leading-relaxed text-gray-600 outline-none placeholder:text-gray-400"
                              placeholder="Draft outreach note"
                            />
                          </div>
                          <button
                            className="mx-4 mt-4 rounded-full border border-black/10 px-4 py-2 text-sm font-medium hover:bg-[#fbf8f3] disabled:cursor-not-allowed disabled:opacity-60"
                            onClick={() => handleSaveOutreachDraft(signal)}
                            disabled={savingDraftId === signalStorageId(signal)}
                          >
                            {savingDraftId === signalStorageId(signal) ? 'Saving...' : 'Save draft'}
                          </button>
                        </section>
                      ))}
                    </div>

                    <div className="mx-auto mt-8 grid max-w-[1292px] gap-8 xl:grid-cols-2">
                      {renderMeetupsSection()}
                      {renderTermsReviewSection()}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="mx-auto mt-8 grid max-w-[1292px] gap-8 xl:grid-cols-[minmax(0,1fr)_300px]">
                      {renderLaunchesSection()}

                      <aside className="space-y-6">
                        {renderTermsReviewSection()}
                      </aside>
                    </div>

                    <div className="mx-auto mt-8 max-w-[1292px]">
                      {renderMeetupsSection()}
                    </div>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {pointerDrag && (
        <div
          className={`pointer-events-none fixed z-[60] rounded-md ${accentSurface} px-3 py-2 text-xs font-medium ${accentForeground} shadow-xl`}
          style={{ left: pointerDrag.x + 12, top: pointerDrag.y + 12 }}
        >
          {pointerDrag.label}
        </div>
      )}

      {(selectedMatch || actionMode) && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-end bg-black/20 p-4"
          onClick={() => {
            setSelectedMatch(null);
            setActionMode(null);
          }}
        >
          <aside
            className="w-full max-w-md rounded-3xl border border-black/10 bg-white p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  {selectedMatch ? 'Match detail' : 'Quick action'}
                </p>
                <h3 className="mt-1 text-2xl font-semibold">
                  {selectedMatch?.name ??
                    (actionMode === 'profile'
                      ? isInvestor
                        ? 'Update thesis note'
                        : 'Update proof note'
                      : actionMode === 'meetup'
                        ? 'Create meetup'
                        : actionMode === 'thesis'
                          ? 'Draft thesis note'
                          : 'Add product')}
                </h3>
              </div>
              <button
                className="rounded-full border border-black/10 p-2 hover:bg-gray-50"
                onClick={() => {
                  setSelectedMatch(null);
                  setActionMode(null);
                }}
                aria-label="Close panel"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {selectedMatch ? (
              <div className="space-y-4">
                <p className="text-sm leading-relaxed text-gray-600">{selectedMatch.detail}</p>
                {selectedMatch.thesis && (
                  <div className="rounded-2xl bg-gray-50 p-4">
                    <p className="text-xs text-gray-500">Thesis</p>
                    <p className="mt-1 text-sm leading-relaxed text-gray-700">{selectedMatch.thesis}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-gray-50 p-4">
                    <p className="text-xs text-gray-500">Fit score</p>
                    <p className="mt-1 text-2xl font-semibold">{selectedMatch.score}</p>
                  </div>
                  <div className="rounded-2xl bg-gray-50 p-4">
                    <p className="text-xs text-gray-500">Location</p>
                    <p className="mt-1 text-sm font-medium">{selectedMatch.location}</p>
                  </div>
                </div>
                <div className="rounded-2xl bg-gray-50 p-4">
                  <p className="text-xs text-gray-500">Recommended next step</p>
                  <p className="mt-1 text-sm font-medium">{selectedMatch.nextStep}</p>
                </div>
                {selectedMatch.why && (
                  <div className="space-y-2">
                    {selectedMatch.why.map((reason) => (
                      <div key={reason} className="flex gap-2 text-sm text-gray-600">
                        <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${accentSurface}`} />
                        <span>{reason}</span>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  className={`w-full rounded-full ${accentSurface} px-5 py-3 text-sm font-medium ${accentForeground}`}
                  onClick={() => {
                    if (!isInvestor && selectedMatch.nextStep.toLowerCase().includes('proof')) {
                      handlePrepProofForMatch(selectedMatch);
                      setSelectedMatch(null);
                      return;
                    }

                    addActivity(`${selectedMatch.nextStep}: ${selectedMatch.name}`);
                    setSelectedMatch(null);
                  }}
                >
                  {selectedMatch.nextStep}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <label className="block">
                  <span className="text-sm font-medium">
                    {actionMode === 'meetup'
                      ? 'Meetup title'
                      : actionMode === 'thesis'
                        ? 'Thesis headline'
                        : actionMode === 'launch'
                          ? 'Product name'
                          : isInvestor
                            ? 'Thesis note'
                            : 'Proof note'}
                  </span>
                  <input
                    className="mt-2 h-10 w-full rounded-xl border border-black/10 px-3 text-sm outline-none focus:border-black"
                    placeholder={isInvestor ? 'Developer tools at seed' : 'GitHub-native analytics'}
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium">Notes</span>
                  <textarea
                    className="mt-2 min-h-28 w-full rounded-xl border border-black/10 px-3 py-2 text-sm outline-none focus:border-black"
                    placeholder="Add the context we should use later when this becomes connected to real data."
                  />
                </label>
                <button
                  className={`w-full rounded-full ${accentSurface} px-5 py-3 text-sm font-medium ${accentForeground}`}
                  onClick={handleActionSubmit}
                >
                  Save test action
                </button>
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
};
