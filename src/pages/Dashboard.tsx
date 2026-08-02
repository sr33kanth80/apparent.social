import {
  ArrowUpRight,
  Bell,
  Bookmark,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronsUpDown,
  FileText,
  Flame,
  Globe,
  Image,
  LayoutGrid,
  LocateFixed,
  ListFilter,
  Rows3,
  MessageCircle,
  MessageSquare,
  MapPin,
  Paperclip,
  Plus,
  Repeat2,
  RefreshCw,
  Rocket,
  Search,
  Send,
  Smile,
  SquarePen,
  Star,
  Sunrise,
  Target,
  Trash2,
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
  type ReactNode,
} from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { BuilderRadarMap } from '@/components/BuilderRadarMap';
import { SessionNavBar } from '@/components/ui/sidebar';
import { HeatMap } from '@/pages/HeatMap';
import { LogoIcon } from '@/components/LogoIcon';
import { GithubVerifyCard } from '@/components/GithubVerifyCard';
import { InvestorAgentChat } from '@/components/InvestorAgentChat';
import { FounderAgentChat } from '@/components/FounderAgentChat';
import { FounderDossierCard } from '@/components/FounderDossierCard';
import { PENDING_CLAIM_KEY } from '@/pages/ClaimBuild';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import type {
  AgentAutonomy,
  AgentMemory,
  AgentChatHistoryMessage,
  AgentChatThread,
  AgentProfilePatch,
  AppUser,
  BuilderDiscoveryState,
  BuilderMapCluster,
  BuilderNode,
  DashboardData,
  FeedItem,
  FounderProfileValues,
  Meetup,
  NetworkInterestPin,
  NetworkMapFilters,
  Notification,
  ProductLaunch,
  TermReview,
  UserMessage,
  UserSettings,
  VcInterestEntry,
  VCContact,
  VcOutreachEntry,
  VcOutreachStage,
} from '@/lib/apparent-types';
import type { ApparentInvestorRow, LaunchAuthor } from '@/lib/dashboard-service';
import { stagePosition } from '@/lib/fut-card';
import { useAgentAuthHeaders } from '@/lib/agent-auth';
import { VerifiedAvatar } from '@/components/VerifiedAvatar';
import { uploadFile } from '@/lib/upload';
import {
  buildBuilderMapClusters,
  loadApparentInvestors,
  loadDashboardData,
  loadFounderInterest,
  loadAgentMemories,
  loadAgentChatThreads,
  loadAgentChatMessages,
  loadFounderVCContacts,
  loadLaunchAuthors,
  loadPublicProductLaunches,
  loadVcOutreachLog,
  setVcOutreachStage,
  deleteVcOutreach,
  saveBuilderDiscoveryState,
  saveAgentConversationMemory,
  saveAgentActionMemory,
  createAgentChatThread,
  deleteAgentChatThread,
  saveAgentChatMessages,
  saveFeedAction,
  saveInvestorMatchBookmark,
  saveIntakeValues,
  saveAgentProfilePatchMemory,
  saveLaunchComment,
  saveMeetup,
  saveMessage,
  markThreadRead,
  markAllNotificationsRead,
  notifyInvestorsOfLaunch,
  notifyInvestorsOfFounder,
  claimCliBuild,
  deleteProductLaunch,
  saveProductLaunch,
  saveSettings,
  saveSignalStage,
  saveTermReview,
  loadDailyDigestSourced,
  triggerManualSourcing,
  subscribeBuilderNetwork,
  toggleLaunchUpvote,
  toggleMeetupRsvp,
  computeFounderCompleteness,
  missingRequiredFounderFields,
} from '@/lib/dashboard-service';
import { loadDailyDigest, loadExternalLaunches } from '@/lib/external-feed';
import { cityGeoCoordinates } from '@/lib/app-defaults';
import { signOut } from '@/lib/auth-service';

type DashboardRole = 'founder' | 'investor';
type ActionMode = 'profile' | 'launch' | 'thesis' | 'meetup';
type FieldKind = 'input' | 'textarea' | 'select';
type ViewMode = 'overview' | 'agent' | 'profile' | 'products' | 'matches' | 'messages' | 'deals' | 'terms' | 'knowledge' | 'feedback' | 'settings' | 'for-you' | 'vc-heatmap' | 'outreach' | 'daily';
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
  founderPhotoUrl?: string;
  founderGithubVerified?: boolean;
  proof: string[];
  investors: string[];
  /** 'apparent' (real platform founder) or 'external' (scraped feed). */
  origin?: 'apparent' | 'external';
  /** For external rows: source label, e.g. "Product Hunt". */
  source?: string;
  /** For external rows: link to the original listing. */
  sourceUrl?: string;
}

type WeightedKnownPlaceSuggestion = PlaceSuggestion & { source: 'Apparent'; networkWeight: number };
type MessageStatusFilter = 'all' | UserMessage['status'];
type FeedbackType = 'Bug report' | 'Feature request' | 'Workflow confusion' | 'General feedback';

interface MessageThread {
  id: string;
  recipient: string;
  counterpartyId?: string;
  latest: UserMessage;
  messages: UserMessage[];
  /** Unread incoming messages in this thread (recipient hasn't opened them). */
  unreadCount: number;
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

const teamSizeOptions = ['1', '2', '3-5', '6-10', '11+'];

const founderIntakeFields: IntakeField[] = [
  { key: 'profileName', label: 'Name', placeholder: 'Your name', kind: 'input' },
  { key: 'headline', label: 'Headline', placeholder: 'Founder building AI tools for engineering teams.', kind: 'input' },
  { key: 'bio', label: 'Bio', placeholder: 'A short founder bio: what you care about, where you have built, and what kind of people you want to meet.', kind: 'textarea' },
  { key: 'currentBuild', label: 'What are you building or exploring?', placeholder: 'A GitHub-native analytics layer for engineering leaders.', kind: 'textarea' },
  { key: 'category', label: 'Primary interests', placeholder: 'Devtools, AI infra, SaaS, marketplace', kind: 'input' },
  { key: 'stage', label: 'Current stage', placeholder: 'Select stage', kind: 'select', options: founderStageOptions },
  { key: 'teamSize', label: 'Team size', placeholder: 'Including co-founders', kind: 'select', options: teamSizeOptions },
  { key: 'lookingFor', label: 'Who do you want to meet?', placeholder: 'Founders, investors, operators, design partners, collaborators.', kind: 'textarea' },
  { key: 'location', label: 'Location', placeholder: 'Brooklyn / remote', kind: 'input' },
  { key: 'website', label: 'Website', placeholder: 'https://yourname.com', kind: 'input' },
  { key: 'github', label: 'GitHub', placeholder: 'https://github.com/...', kind: 'input' },
  { key: 'linkedin', label: 'LinkedIn', placeholder: 'https://linkedin.com/in/...', kind: 'input' },
  { key: 'xProfile', label: 'X / Twitter', placeholder: 'https://x.com/...', kind: 'input' },
  { key: 'press', label: 'Other profile link', placeholder: 'Portfolio, writing, press, or personal page', kind: 'input' },
  { key: 'pastProducts', label: 'Past products', placeholder: 'List past products or projects, one per line.', kind: 'textarea' },
];

// Typed traction picker — VCs sort by the type, so we capture a discrete
// category alongside the founder's chosen metric instead of one freeform string.
type TractionTypeOption = { value: string; label: string; placeholder: string };
const tractionTypeOptions: TractionTypeOption[] = [
  { value: 'mrr', label: 'Revenue (MRR / ARR)', placeholder: '$24K MRR · +22% MoM' },
  { value: 'users', label: 'Users (DAU / WAU / signups)', placeholder: '12K WAU · 3.4K signups last month' },
  { value: 'gmv', label: 'GMV / transactions', placeholder: '$180K GMV last month' },
  { value: 'loi', label: 'LOIs / pilots', placeholder: '3 signed LOIs, 2 paid pilots' },
  { value: 'prototype', label: 'Working prototype', placeholder: 'Live demo at demo.acme.com' },
  { value: 'pmf', label: 'PMF signal', placeholder: 'Sean Ellis score 42%, retention 38% W4' },
];

// Founder profile sidebar sections — groups the 15 intake fields into 5
// focused panels so the user isn't staring at one mega-form.
type ProfileSectionKey = 'about' | 'links' | 'traction' | 'raising' | 'visibility';
const profileSections: { key: ProfileSectionKey; label: string; description: string; fieldKeys: string[] }[] = [
  {
    key: 'about',
    label: 'About',
    description: 'Who you are and what you build.',
    fieldKeys: ['profileName', 'headline', 'bio', 'currentBuild', 'category', 'stage', 'teamSize', 'location'],
  },
  {
    key: 'links',
    label: 'Links',
    description: 'Where investors can verify and follow you.',
    fieldKeys: ['website', 'github', 'linkedin', 'xProfile', 'press'],
  },
  {
    key: 'traction',
    label: 'Traction & History',
    description: 'The signal VCs sort by — pick the metric that best represents where you are.',
    fieldKeys: ['lookingFor', 'pastProducts'],
  },
];

// Founder products wizard — multi-step launch flow for new products only.
// Editing an existing launch keeps the all-sections-visible layout.
type WizardStep = { key: string; label: string; description: string };
const launchWizardSteps: WizardStep[] = [
  { key: 'basics', label: 'Basics', description: 'Name, tagline, category, links.' },
  { key: 'brand', label: 'Brand', description: 'Logo and banner image.' },
  { key: 'story', label: 'Story', description: 'Intro and demo video.' },
  { key: 'team', label: 'Team', description: 'Who is building this.' },
  { key: 'pitchbook', label: 'Pitch Book', description: 'Optional investor materials.' },
  { key: 'traction', label: 'Traction', description: 'Proof and metrics.' },
  { key: 'review', label: 'Review', description: 'Preview and publish.' },
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

// Teaching empty state: explains what a surface is for + offers the next action,
// so first-timers learn by doing instead of staring at a blank panel.
const EmptyState = ({
  icon,
  title,
  body,
  ctaLabel,
  onCta,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  ctaLabel?: string;
  onCta?: () => void;
}) => (
  <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
    <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-[#f4f1eb] text-ink">{icon}</div>
    <p className="text-sm font-semibold">{title}</p>
    <p className="mt-1 max-w-sm text-xs leading-relaxed text-gray-500">{body}</p>
    {ctaLabel && onCta && (
      <button
        type="button"
        onClick={onCta}
        className="mt-4 rounded-full bg-charcoal px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90"
      >
        {ctaLabel}
      </button>
    )}
  </div>
);

// All dashboard sections that have a canonical URL path. Order matters only
// for documentation — the lookup is O(1).
const PATH_TO_VIEW: Record<string, ViewMode> = {
  agent: 'agent',
  profile: 'profile',
  products: 'products',
  launches: 'products', // legacy
  matches: 'matches',
  messages: 'messages',
  deals: 'deals',
  terms: 'terms',
  knowledge: 'knowledge',
  feedback: 'feedback',
  settings: 'settings',
  'for-you': 'for-you',
  outreach: 'outreach',
  'vc-heatmap': 'vc-heatmap',
  daily: 'daily',
};

/**
 * Resolve the active dashboard view from the current URL. Path-based first
 * (the canonical model), with one fallback to the legacy `#section` hash so
 * old bookmarks keep working until they get redirected on mount.
 */
const viewFromLocation = (pathname: string, hash: string): ViewMode => {
  // Extract the trailing segment after the role prefix (/dashboard/{role}/X).
  const match = pathname.match(/\/dashboard\/(?:founder|investor)\/([^/?#]+)/);
  const segment = match?.[1] ?? '';
  if (segment && PATH_TO_VIEW[segment]) {
    return PATH_TO_VIEW[segment];
  }

  // Backward-compat: derive from `#section` when the path is the root.
  const hashSegment = hash.replace(/^#/, '');
  if (hashSegment && PATH_TO_VIEW[hashSegment]) {
    return PATH_TO_VIEW[hashSegment];
  }

  return 'overview';
};

const sectionIdFromView = (view: ViewMode) => {
  if (view === 'agent') {
    return 'agent';
  }

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

  if (view === 'settings') {
    return 'settings';
  }

  if (view === 'outreach') {
    return 'outreach';
  }

  if (view === 'daily') {
    return 'daily';
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
  id: '' as string | undefined,
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
  raisingOnly: false,
  radiusMiles: 50,
  pin: null,
  minCompleteness: 40,
  raisingAmountMin: '',
});

// Parses a freeform raising amount like "$1.5M", "500K", "$250k - $1.5M" into a
// USD number. Returns 0 when nothing usable is found, so it can be compared
// directly against a min-floor in VC filters.
const parseRaisingAmount = (raw: string | undefined): number => {
  if (!raw) return 0;
  const match = raw.replace(/,/g, '').match(/\$?\s*(\d+(?:\.\d+)?)\s*([kKmMbB])?/);
  if (!match) return 0;
  const value = parseFloat(match[1]);
  if (Number.isNaN(value)) return 0;
  const unit = (match[2] || '').toLowerCase();
  const multiplier = unit === 'b' ? 1_000_000_000 : unit === 'm' ? 1_000_000 : unit === 'k' ? 1_000 : 1;
  return value * multiplier;
};

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
    return 'apparent.social';
  }
};

const productLaunchToDashboardRow = (
  launch: ProductLaunch,
  index: number,
  ownerLabel = 'Founder on Apparent',
  ownerUsername = '',
  ownerPhotoUrl = '',
  ownerGithubVerified = false,
): DashboardLaunchRow => {
  const isExternal = launch.origin === 'external';
  return {
  id: `workspace-${launch.id}`,
  name: launch.name,
  founder: isExternal ? `via ${launch.source || 'External'}` : ownerLabel,
  tagline: launch.tagline || 'New product launched into Apparent.',
  description: launch.intro || launch.metrics || launch.tagline || 'This founder has launched a new product for investor and builder discovery.',
  category: launch.category || 'Builder product',
  location: launch.location || (isExternal ? 'Web' : 'Apparent'),
  stage: launch.stage || 'Launched',
  fit: Math.max(72, 94 - index * 3),
  saves: Math.max(18, launch.name.length * 5),
  comments: Math.max(3, launch.category.length || 3),
  momentum: launch.metrics || 'Fresh founder launch',
  website: launch.launchUrl || launch.proofUrl || launch.sourceUrl || 'https://apparent.social/',
  // External launches have no Apparent project page or founder profile — the
  // card links straight out to the original listing instead.
  projectPath: isExternal ? undefined : `/projects/${launch.slug || launch.id}`,
  // Prefer the canonical /@username route so the link lands on the public
  // profile that knows about the founder's display name + handle.
  founderProfilePath: isExternal
    ? undefined
    : ownerUsername
      ? `/@${ownerUsername}`
      : `/profile/${launch.ownerId}`,
  founderPhotoUrl: ownerPhotoUrl,
  founderGithubVerified: ownerGithubVerified,
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
  origin: launch.origin ?? 'apparent',
  source: launch.source,
  sourceUrl: launch.sourceUrl,
  };
};

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

// Compact relative time ("just now", "5m ago", "3h ago", "2d ago") for the
// notifications feed. Falls back to empty string on an unparseable timestamp.
const formatRelativeTime = (iso: string): string => {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diffMs = Date.now() - then;
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'yesterday' : `${days}d ago`;
};

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
  const [signalRows, setSignalRows] = useState<InvestorSignal[]>([]);
  const [slackAlertsEnabled, setSlackAlertsEnabled] = useState(true);
  const [dailyDigestEnabled, setDailyDigestEnabled] = useState(true);
  const [agentAutonomy, setAgentAutonomy] = useState<AgentAutonomy>('manual');
  const [agentMemories, setAgentMemories] = useState<AgentMemory[]>([]);
  const [agentChatThreads, setAgentChatThreads] = useState<AgentChatThread[]>([]);
  const [agentThreadsLoaded, setAgentThreadsLoaded] = useState(false);
  const [activeAgentThreadId, setActiveAgentThreadId] = useState<string | null>(null);
  const activeAgentThreadIdRef = useRef<string | null>(null);
  const [agentChatMessages, setAgentChatMessages] = useState<AgentChatHistoryMessage[]>([]);
  const [agentChatLoaded, setAgentChatLoaded] = useState(false);
  const requestedAgentThreadId = new URLSearchParams(location.search).get('thread');
  const selectedAgentThreadId = requestedAgentThreadId
    && agentChatThreads.some((thread) => thread.id === requestedAgentThreadId)
    ? requestedAgentThreadId
    : null;
  const [draggedSignalCompany, setDraggedSignalCompany] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<InvestorDealStage | null>(null);
  const [pointerDrag, setPointerDrag] = useState<{ company: string; label: string; x: number; y: number } | null>(null);
  const [isDashboardLoading, setIsDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState('');
  const [productLaunches, setProductLaunches] = useState<ProductLaunch[]>([]);
  const [publicLaunches, setPublicLaunches] = useState<ProductLaunch[]>([]);
  // External launches ingested from the R2 scraper feed (Product Hunt, YC, etc).
  const [externalLaunches, setExternalLaunches] = useState<ProductLaunch[]>([]);
  // Curated daily VC deal flow (refreshed by the scraper at 07:00 PST). Powers
  // the investor "Daily" tab. Investor-only.
  const [dailyDigest, setDailyDigest] = useState<ProductLaunch[]>([]);
  // Daily-tab filter state.
  const [dailyFilters, setDailyFilters] = useState<{ query: string; sector: string; stage: string; location: string }>({
    query: '',
    sector: '',
    stage: '',
    location: '',
  });
  // 'cards' = curated hero grid (default); 'table' = power-user triage view.
  // Persisted so a returning investor lands in the mode they last chose.
  const [dailyView, setDailyView] = useState<'cards' | 'table'>(() => {
    if (typeof window === 'undefined') return 'cards';
    return (localStorage.getItem('apparent.dailyView') as 'cards' | 'table') || 'cards';
  });
  const [dailySort, setDailySort] = useState<{ key: 'name' | 'category' | 'stage' | 'location' | 'source'; dir: 'asc' | 'desc' }>({ key: 'name', dir: 'asc' });
  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem('apparent.dailyView', dailyView);
  }, [dailyView]);
  // Manual-refresh state for the Daily tab button. `status` is transient UI
  // feedback; it clears itself a few seconds after each result.
  const [dailyRefreshing, setDailyRefreshing] = useState(false);
  const [dailyRefreshMsg, setDailyRefreshMsg] = useState<string>('');
  // Bridges Kinde-supplied access tokens to service functions that need to
  // authenticate against our own API routes. Supabase-session fallback is
  // handled inside the hook.
  const getAgentAuthHeaders = useAgentAuthHeaders();
  const [launchAuthors, setLaunchAuthors] = useState<Record<string, LaunchAuthor>>({});
  // VC list + Apparent investor list, both used to build the founder's
  // dynamic "Investor Matches" view. Loaded once per session.
  const [vcContactsForMatches, setVcContactsForMatches] = useState<VCContact[]>([]);
  const [apparentInvestors, setApparentInvestors] = useState<ApparentInvestorRow[]>([]);
  // Founder's outreach kanban entries. Each row links to one VC by vcContactKey.
  const [outreachEntries, setOutreachEntries] = useState<VcOutreachEntry[]>([]);
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
  const [notifications, setNotifications] = useState<Notification[]>([]);
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
  // Founder profile sidebar — which section is currently open.
  const [profileSection, setProfileSection] = useState<'about' | 'links' | 'traction' | 'raising' | 'visibility' | 'thesis' | 'criteria' | 'portfolio'>(isInvestor ? 'thesis' : 'about');
  // Founder products page mode + wizard step.
  // Modes: 'list' (grid view), 'wizard' (new launch flow), 'edit' (full edit form).
  const [productsMode, setProductsMode] = useState<'list' | 'wizard' | 'edit'>('list');
  const [wizardStep, setWizardStep] = useState(0);
  const [launchCommentDrafts, setLaunchCommentDrafts] = useState<Record<string, string>>({});
  const [launchEngagement, setLaunchEngagement] = useState<
    Record<string, { upvoted: boolean; upvotes: number; comments: string[] }>
  >({});
  const [founderInterest, setFounderInterest] = useState<{ saveCount: number; recentSaverNames: string[] }>({
    saveCount: 0,
    recentSaverNames: [],
  });
  // VCs who liked/superliked this founder via the Discover deck (founder side).
  const [vcInterest, setVcInterest] = useState<VcInterestEntry[]>([]);
  const onboardingKey = `apparent:${user.id}:onboarding-dismissed`;
  const [onboardingDismissed, setOnboardingDismissed] = useState<boolean>(() => {
    try {
      return window.localStorage.getItem(onboardingKey) === '1';
    } catch {
      return false;
    }
  });
  const dismissOnboarding = () => {
    setOnboardingDismissed(true);
    try {
      window.localStorage.setItem(onboardingKey, '1');
    } catch {
      /* ignore */
    }
  };
  const [meetupDraft, setMeetupDraft] = useState(emptyMeetupDraft);
  const [termDraft, setTermDraft] = useState(emptyTermDraft);
  const [messageDraft, setMessageDraft] = useState(emptyMessageDraft);
  const [feedbackDraft, setFeedbackDraft] = useState(emptyFeedbackDraft);
  const [isOnboarding, setIsOnboarding] = useState(() =>
    Boolean((location.state as { onboarding?: boolean } | null)?.onboarding),
  );
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [dashboardLaunchFilter, setDashboardLaunchFilter] = useState('Today');
  const [selectedForYouLaunchId, setSelectedForYouLaunchId] = useState('');
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

  // For You is a founder-only feed. Investors landing on
  // /dashboard/investor/for-you (stale bookmark, old email link) get redirected
  // to overview so they don't see a feed that duplicates `daily`.
  useEffect(() => {
    if (!isInvestor) return;
    if (activeView !== 'for-you') return;
    navigate(`${dashboardBasePath}/overview`, { replace: true });
  }, [activeView, dashboardBasePath, isInvestor, navigate]);

  // Backward-compat: redirect legacy `#section` URLs to the canonical
  // `/section` path so old bookmarks, emails, and shared screenshots keep
  // working. Runs once per location change; the redirect uses `replace` so
  // the hash URL never lands in browser history.
  useEffect(() => {
    if (!location.hash) return;
    const hashSegment = location.hash.replace(/^#/, '');
    if (!hashSegment || !PATH_TO_VIEW[hashSegment]) return;
    const canonical = hashSegment === 'overview' ? dashboardBasePath : `${dashboardBasePath}/${hashSegment}`;
    // Only redirect when the path itself doesn't already match the hash —
    // otherwise we'd loop on every render.
    if (location.pathname !== canonical) {
      navigate(canonical, { replace: true });
    }
  }, [dashboardBasePath, location.hash, location.pathname, navigate]);

  const accentSurface = isInvestor ? 'bg-[#003f2e]' : 'bg-[#039861]';
  const accentForeground = 'text-white';
  const accentIconForeground = 'text-white/90';
  const dmSurface = isInvestor ? 'bg-[#f7f3e4]' : 'bg-[#effbf4]';
  const dmSelectedSurface = isInvestor ? 'bg-[#f3edd7]' : 'bg-[#e2f7ec]';
  const dmSoftSurface = isInvestor ? 'bg-[#faf7eb]' : 'bg-[#f3fcf7]';
  const dmAccentBorder = isInvestor ? 'border-ink/25' : 'border-[#37d28b]/25';
  const dmFocusBorder = isInvestor ? 'focus:border-ink/60' : 'focus:border-[#37d28b]/50';
  const dmBubbleMeta = isInvestor ? 'bg-white/15 text-white/75' : 'bg-white/70 text-black/60';
  const feedItems = feedRows;
  const completedFieldCount = intakeFields.filter((field) => intakeValues[field.key].trim()).length;
  // Founders see two scores: legacy "fields filled" + the weighted VC-grade
  // completeness used to gate visibility in investor views.
  const profileStrength = isInvestor
    ? Math.round((completedFieldCount / intakeFields.length) * 100)
    : computeFounderCompleteness(intakeValues as Partial<FounderProfileValues>);
  const founderMissingRequired = isInvestor
    ? []
    : missingRequiredFounderFields(intakeValues as Partial<FounderProfileValues>);
  const founderVcReady = !isInvestor && founderMissingRequired.length === 0 && profileStrength >= 40;
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

    // Founder side: rank VCs from the bundled list + active Apparent investors
    // against the founder's launches + profile. Built dynamically each render.

    // Build the founder's interest signature from their launches + profile.
    const tokenize = (value: string): string[] =>
      value
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((token) => token.length > 2);
    const founderSignal = [
      intakeValues.category,
      intakeValues.currentBuild,
      intakeValues.lookingFor,
      intakeValues.headline,
      ...productLaunches.flatMap((launch) => [launch.category, launch.tagline, launch.intro, launch.metrics]),
    ]
      .filter(Boolean)
      .join(' ');
    const founderTokens = new Set(tokenize(founderSignal));
    const founderStageLower = (intakeValues.stage || productLaunches[0]?.stage || '').toLowerCase();
    const founderLocationLower = (intakeValues.location || productLaunches[0]?.location || '').toLowerCase();

    const overlapScore = (haystack: string, weight: number): number => {
      if (!founderTokens.size) return 0;
      const haystackLower = haystack.toLowerCase();
      let hits = 0;
      for (const token of founderTokens) {
        if (haystackLower.includes(token)) {
          hits += 1;
          if (hits >= 5) break;
        }
      }
      return hits * weight;
    };

    const splitCSV = (value: string): string[] =>
      value
        .split(/[,;]/)
        .map((part) => part.trim())
        .filter(Boolean)
        .slice(0, 6);

    // Real Apparent investors get a baseline bonus + direct DM path.
    const apparentMatches: MatchItem[] = apparentInvestors.map((inv) => {
      const why: string[] = [];
      let score = 55;
      const sectorBonus = overlapScore(inv.sectors, 8);
      if (sectorBonus > 0) {
        score += Math.min(sectorBonus, 20);
        why.push('Sector overlap with your launches');
      }
      const thesisBonus = overlapScore(inv.thesis, 6);
      if (thesisBonus > 0) {
        score += Math.min(thesisBonus, 16);
        why.push('Thesis maps to what you are building');
      }
      if (founderStageLower && inv.stage.toLowerCase().includes(founderStageLower)) {
        score += 10;
        why.push(`Stage focus matches "${inv.stage}"`);
      }
      if (founderLocationLower && inv.geography.toLowerCase().includes(founderLocationLower)) {
        score += 8;
        why.push('Geography overlaps your location');
      }
      why.push('Active on Apparent — message in-app');
      return {
        name: inv.displayName,
        detail: inv.thesis ? inv.thesis.slice(0, 140) : `${inv.sectors || 'Apparent investor'} · ${inv.stage || 'multi-stage'}`,
        score: `${Math.min(99, Math.round(score))}%`,
        signal: 'On Apparent',
        location: inv.geography || 'Apparent',
        nextStep: 'DM via Apparent',
        thesis: inv.thesis,
        checkSize: inv.checkSize || 'Not disclosed',
        stageFocus: inv.stage || 'Flexible',
        sectors: splitCSV(inv.sectors),
        portfolio: splitCSV(inv.portfolioExamples),
        why: why.slice(0, 3),
        warmPath: inv.username ? `Open @${inv.username} and send a DM` : 'Open profile and send a DM',
        responseWindow: 'Active on Apparent',
      };
    });

    // Bundled VC list (vc_contacts + seed). Scored against the same founder signature.
    const vcMatches: MatchItem[] = vcContactsForMatches.map((vc) => {
      const why: string[] = [];
      let score = 38;
      const sectorBonus = overlapScore(vc.fundFocusSectors, 7);
      if (sectorBonus > 0) {
        score += Math.min(sectorBonus, 22);
        why.push(`Invests in ${splitCSV(vc.fundFocusSectors).slice(0, 2).join(', ')}`);
      }
      const portfolioBonus = overlapScore(vc.portfolioCompanies, 4);
      if (portfolioBonus > 0) {
        score += Math.min(portfolioBonus, 10);
        why.push('Has portfolio companies adjacent to your space');
      }
      if (founderStageLower && vc.fundStage.toLowerCase().includes(founderStageLower)) {
        score += 12;
        why.push(`Backs ${vc.fundStage}`);
      }
      if (founderLocationLower && vc.normalizedCity.toLowerCase().includes(founderLocationLower)) {
        score += 7;
        why.push(`Based in ${vc.normalizedCity}`);
      }
      // Activity bonus — funds with more recent investments are more likely to deploy.
      if (vc.numberOfInvestments > 100) score += 6;
      else if (vc.numberOfInvestments > 30) score += 3;
      if (vc.numberOfExits > 5) score += 2;

      const detailParts = [vc.fundFocusSectors, vc.fundStage].filter(Boolean);
      return {
        name: vc.investorName,
        detail: detailParts.length ? detailParts.join(' · ').slice(0, 160) : `${vc.fundType || 'Venture fund'}`,
        score: `${Math.min(98, Math.round(score))}%`,
        signal: vc.partnerEmail ? 'Email public' : 'Thesis fit',
        location: vc.location || vc.normalizedCity || 'Remote',
        nextStep: vc.partnerEmail ? `Email ${vc.partnerName || 'partner'}` : 'Visit fund website',
        thesis: vc.fundDescription || `${vc.investorName} backs ${splitCSV(vc.fundFocusSectors).slice(0, 3).join(', ') || 'early-stage companies'}.`,
        checkSize: vc.fundStage || 'Multi-stage',
        stageFocus: vc.fundStage || 'Flexible',
        sectors: splitCSV(vc.fundFocusSectors),
        portfolio: splitCSV(vc.portfolioCompanies),
        why: why.slice(0, 3),
        warmPath: vc.partnerEmail
          ? `Cold email ${vc.partnerName || 'partner'} at ${vc.partnerEmail}`
          : vc.website
            ? `Submit via ${vc.website}`
            : 'Find a warm intro via LinkedIn',
        responseWindow: `${vc.numberOfInvestments || 0} investments · ${vc.numberOfExits || 0} exits`,
      };
    });

    // Apparent investors win on tiebreak when scores are equal — they're
    // contactable in-app, which is a stronger next step than cold email.
    return [...apparentMatches, ...vcMatches]
      .sort((a, b) => Number.parseInt(b.score, 10) - Number.parseInt(a.score, 10))
      .slice(0, 80);
  }, [
    apparentInvestors,
    intakeValues.category,
    intakeValues.currentBuild,
    intakeValues.headline,
    intakeValues.location,
    intakeValues.lookingFor,
    intakeValues.stage,
    isInvestor,
    productLaunches,
    signalRows,
    vcContactsForMatches,
  ]);
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
  void launchCompletion;
  const getLaunchEngagement = (launch: ProductLaunch) =>
    launchEngagement[launch.id] ?? {
      upvoted: false,
      upvotes: launch.upvoteCount ?? 0,
      comments: [],
    };
  const dashboardLaunchRows = useMemo(() => {
    // Merge the current user's own launches with all public Apparent launches,
    // then append external (scraped) launches. Apparent-native launches lead so
    // real platform founders always rank above scraped discovery content.
    // Dedupe by id so the user's own launches don't appear twice.
    const seen = new Set<string>();
    const merged: ProductLaunch[] = [];
    for (const launch of [...productLaunches, ...publicLaunches, ...externalLaunches]) {
      if (seen.has(launch.id)) continue;
      seen.add(launch.id);
      merged.push(launch);
    }
    return merged.map((launch, index) => {
      const isOwn = launch.ownerId === user.id;
      const author = launchAuthors[launch.ownerId];
      const ownerLabel = isOwn
        ? user.username
          ? `You (@${user.username})`
          : 'Your profile'
        : author?.name || 'Founder on Apparent';
      const ownerUsername = isOwn ? user.username ?? '' : author?.username ?? '';
      const ownerPhotoUrl = isOwn ? '' : (author?.photoUrl ?? '');
      const ownerGithubVerified = isOwn ? false : (author?.githubVerified ?? false);
      return productLaunchToDashboardRow(launch, index, ownerLabel, ownerUsername, ownerPhotoUrl, ownerGithubVerified);
    });
  }, [productLaunches, publicLaunches, externalLaunches, launchAuthors, user.id, user.username]);
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
      // Incoming = addressed to me by someone else; outgoing = composed by me.
      const isIncoming = Boolean(message.recipientId && message.recipientId === user.id && message.ownerId !== user.id);
      const counterpartyName = (isIncoming
        ? message.senderName || 'Someone on Apparent'
        : message.recipient || 'Unknown contact'
      ).trim();
      const counterpartyId = isIncoming ? message.ownerId : message.recipientId || '';
      const id = counterpartyId || counterpartyName.toLowerCase();
      // Unread = an incoming message the recipient (me) hasn't opened yet.
      const isUnread = isIncoming && !message.readAt;
      const currentThread = threads.get(id);

      if (!currentThread) {
        threads.set(id, {
          id,
          recipient: counterpartyName,
          counterpartyId: counterpartyId || undefined,
          latest: message,
          messages: [message],
          unreadCount: isUnread ? 1 : 0,
        });
        return;
      }

      currentThread.messages.push(message);
      if (isUnread) currentThread.unreadCount += 1;
      if (!currentThread.counterpartyId && counterpartyId) currentThread.counterpartyId = counterpartyId;
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
  }, [messages, user.id]);

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
  const totalUnreadMessages = useMemo(
    () => messageThreads.reduce((sum, thread) => sum + thread.unreadCount, 0),
    [messageThreads],
  );
  const unreadNotificationCount = useMemo(
    () => notifications.filter((notification) => !notification.readAt).length,
    [notifications],
  );

  // Opening the bell marks everything read (optimistic + persisted).
  const handleToggleNotifications = () => {
    setShowNotifications((current) => {
      const next = !current;
      if (next && notifications.some((notification) => !notification.readAt)) {
        const stampedAt = new Date().toISOString();
        setNotifications((items) => items.map((item) => (item.readAt ? item : { ...item, readAt: stampedAt })));
        void markAllNotificationsRead(user);
      }
      return next;
    });
  };

  // When a thread with unread incoming messages becomes active, mark it read:
  // optimistically stamp readAt locally, then persist via RPC.
  useEffect(() => {
    const thread = activeMessageThread;
    if (!thread || thread.unreadCount === 0) return;
    const counterpartyId = thread.counterpartyId;
    if (!counterpartyId) return;

    const stampedAt = new Date().toISOString();
    setMessages((current) =>
      current.map((message) =>
        message.recipientId === user.id && message.ownerId === counterpartyId && !message.readAt
          ? { ...message, readAt: stampedAt }
          : message,
      ),
    );
    void markThreadRead(user, counterpartyId);
  }, [activeMessageThread, user]);

  useEffect(() => {
    let isCancelled = false;
    let hasLoaded = false;

    // Extracted so cached data and fresh data go through the same setter calls.
    const applyData = (data: DashboardData) => {
      if (isCancelled) return;
      setIntakeValues(data.intakeValues);
      hasLoadedRef.current = true;
      setProfileSaved(data.profileSaved);
      setSignalRows(data.signalRows);
      setDailyDigestEnabled(data.settings.dailyDigestEnabled);
      setSlackAlertsEnabled(data.settings.slackAlertsEnabled);
      setAgentAutonomy(data.settings.agentAutonomy);
      setProductLaunches(data.productLaunches);
      setSelectedLaunchId((current) => current || data.productLaunches[0]?.id || '');
      setMeetups(data.meetups);
      setBuilderNodes(data.builderNodes);
      setBuilderClusters(data.builderClusters);
      setBuilderDiscoveryStates(data.builderDiscoveryStates);
      setTermReviews(data.termReviews);
      setMessages(data.messages);
      setNotifications(data.notifications);
      setFeedRows(data.feedItems);
      setSavedInvestorMatchNames(data.savedInvestorMatchNames);
      setLaunchEngagement(data.launchEngagement);
      setFounderInterest(data.founderInterest);
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
      setActiveView(viewFromLocation(window.location.pathname, window.location.hash));
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
    };

    const applyDashboardData = (showLoading: boolean) => {
      if (showLoading) setIsDashboardLoading(true);
      setDashboardError('');

      loadDashboardData(
        user,
        role,
        labelByKey,
        (cached) => {
          // Cache hit — render stale data instantly, skip the spinner.
          applyData(cached);
          if (!isCancelled) setIsDashboardLoading(false);
        },
        (partial) => {
          // Overview-critical batch landed — render the page now even though
          // Messages / For You feed engagement / interest counter haven't
          // arrived yet. Spinner clears immediately.
          applyData(partial);
          if (!isCancelled) setIsDashboardLoading(false);
        },
      )
      .then((fresh) => {
        applyData(fresh);
        hasLoaded = true;
      })
      .catch((error) => {
        if (!isCancelled) {
          setDashboardError(error instanceof Error ? error.message : 'Unable to load workspace data.');
        }
      })
      .finally(() => {
        if (!isCancelled) setIsDashboardLoading(false);
      });
    };

    applyDashboardData(true);
    const unsubscribe = subscribeBuilderNetwork(user, () => {
      if (hasLoaded) {
        applyDashboardData(false);
        // Keep the public launches feed in sync with real-time changes (inserts,
        // updates, and deletes from any founder). No onCached arg so we never
        // flash stale data that still contains the deleted launch.
        loadPublicProductLaunches().then((launches) => {
          if (!isCancelled) setPublicLaunches(launches);
        }).catch(() => { /* non-fatal */ });
      }
    });

    return () => {
      isCancelled = true;
      unsubscribe();
    };
  }, [isInvestor, labelByKey, role, user]);

  useEffect(() => {
    let cancelled = false;
    setAgentThreadsLoaded(false);
    Promise.all([loadAgentMemories(user, role), loadAgentChatThreads(user, role)])
      .then(([memoryRows, threadRows]) => {
        if (!cancelled) {
          setAgentMemories(memoryRows);
          setAgentChatThreads(threadRows);
          setAgentThreadsLoaded(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAgentMemories([]);
          setAgentChatThreads([]);
          setAgentThreadsLoaded(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [role, user]);

  useEffect(() => {
    if (!agentThreadsLoaded) return;
    activeAgentThreadIdRef.current = selectedAgentThreadId;
    setActiveAgentThreadId(selectedAgentThreadId);
    if (!selectedAgentThreadId) {
      setAgentChatMessages([]);
      setAgentChatLoaded(true);
      return;
    }

    let cancelled = false;
    setAgentChatLoaded(false);
    loadAgentChatMessages(user, role, selectedAgentThreadId)
      .then((messages) => {
        if (!cancelled) {
          setAgentChatMessages(messages);
          setAgentChatLoaded(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAgentChatMessages([]);
          setAgentChatLoaded(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [agentThreadsLoaded, role, selectedAgentThreadId, user]);

  // Founder side: load the VCs who liked/superliked this founder (Discover deck).
  useEffect(() => {
    if (isInvestor) return;
    let cancelled = false;
    loadFounderInterest(user)
      .then((rows) => {
        if (!cancelled) setVcInterest(rows);
      })
      .catch(() => {
        /* table may not be deployed yet */
      });
    return () => {
      cancelled = true;
    };
  }, [isInvestor, user]);

  // Load all public Apparent product launches so the "For You" feed shows
  // real launches from across the platform (not a static seed list).
  useEffect(() => {
    let cancelled = false;
    loadPublicProductLaunches((cached) => {
      // Render cached feed instantly while fresh data loads in background.
      if (!cancelled) setPublicLaunches(cached);
    })
      .then(async (launches) => {
        if (cancelled) return;
        setPublicLaunches(launches);
        // Batch-load real founder names + handles so the inline "Launched by"
        // card in For You shows the actual person instead of "Founder on Apparent".
        const ownerIds = launches.map((launch) => launch.ownerId).filter(Boolean);
        if (!ownerIds.length) return;
        try {
          const authors = await loadLaunchAuthors(ownerIds);
          if (!cancelled) setLaunchAuthors(authors);
        } catch {
          /* non-fatal */
        }
      })
      .catch(() => {
        if (!cancelled) setPublicLaunches([]);
      });
    return () => {
      cancelled = true;
    };
  }, [user.id]);

  // Load external (scraped) launches from the R2 feed (via the /api/feeds
  // proxy) and merge them into "For You" alongside real Apparent launches.
  // No-op when the feed isn't configured or unreachable — degrades to
  // Apparent-only content.
  useEffect(() => {
    let cancelled = false;
    loadExternalLaunches((cached) => {
      if (!cancelled) setExternalLaunches(cached);
    })
      .then((launches) => {
        if (!cancelled) setExternalLaunches(launches);
      })
      .catch(() => {
        if (!cancelled) setExternalLaunches([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Investor side: load the "Daily" tab deal flow. Primary source is the durable
  // source_signals table (each item routable → /sourced/:id, so cards open the
  // in-app profile). Falls back to the legacy R2 digest (refreshed 07:00 PST)
  // only when the table is empty, so the tab is never emptier than before.
  // ponytail: drop the R2 fallback once source_signals coverage is confirmed in prod.
  useEffect(() => {
    if (!isInvestor) return;
    let cancelled = false;
    const fallbackToR2 = () => {
      loadDailyDigest((cached) => {
        if (!cancelled && cached.length) setDailyDigest(cached);
      })
        .then((launches) => {
          if (!cancelled) setDailyDigest(launches);
        })
        .catch(() => {
          if (!cancelled) setDailyDigest([]);
        });
    };
    loadDailyDigestSourced()
      .then((sourced) => {
        if (cancelled) return;
        if (sourced.length) setDailyDigest(sourced);
        else fallbackToR2();
      })
      .catch(() => {
        if (!cancelled) fallbackToR2();
      });
    return () => {
      cancelled = true;
    };
  }, [isInvestor]);

  // Founder side: load the full VC list + active Apparent investors once so the
  // "Investor Matches" tab can rank them against the founder's launches and
  // profile in-memory. Skipped for investor accounts (they see deal-flow).
  useEffect(() => {
    if (isInvestor) return;
    let cancelled = false;
    Promise.all([loadFounderVCContacts(), loadApparentInvestors()])
      .then(([vcs, investors]) => {
        if (cancelled) return;
        setVcContactsForMatches(vcs);
        setApparentInvestors(investors);
      })
      .catch(() => {
        if (!cancelled) {
          setVcContactsForMatches([]);
          setApparentInvestors([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isInvestor, user.id]);

  // Founder side: outreach kanban entries. Updated locally when the heat-map
  // compose dialog saves a row; reloaded here on mount so the view is hydrated
  // when the founder first opens the tab.
  useEffect(() => {
    if (isInvestor) return;
    let cancelled = false;
    loadVcOutreachLog(user)
      .then((rows) => {
        if (!cancelled) setOutreachEntries(rows);
      })
      .catch(() => {
        if (!cancelled) setOutreachEntries([]);
      });
    return () => {
      cancelled = true;
    };
  }, [isInvestor, user]);

  const handleMessageInterestedVc = async (entry: VcInterestEntry) => {
    try {
      const savedMessage = await saveMessage(user, {
        recipient: entry.investorName || 'Investor',
        recipientId: entry.investorId,
        senderName: user.username || user.email.split('@')[0],
        subject: 'Thanks for your interest',
        body: `Hi ${entry.investorName || 'there'} — thanks for the interest in what I'm building. I'd be glad to share more. Want to set up a quick call?`,
        status: 'sent',
        context: `interest:${entry.investorId}`,
      });
      setMessages((current) => [savedMessage, ...current.filter((message) => message.id !== savedMessage.id)]);
      setSelectedMessageThreadId(savedMessage.recipientId || savedMessage.recipient.toLowerCase());
      setActiveView('messages');
    } catch {
      setDashboardError('Unable to open a message with that investor.');
    }
  };

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

    // VCs only see real Apparent founders whose profile clears the bar. Ingested
    // scraper signals stay visible because they're our cold-start fallback and
    // never have a "profile completeness" of their own.
    const minCompleteness = isInvestor ? networkFilters.minCompleteness ?? 40 : 0;
    const raisingAmountFloor = parseRaisingAmount(networkFilters.raisingAmountMin);

    return builderNodes
      .filter((builder) => !builderDiscoveryById.get(builder.id)?.hidden)
      .filter((builder) => {
        if (networkFilters.city && builder.location !== networkFilters.city) return false;
        if (networkFilters.category && builder.category !== networkFilters.category) return false;
        if (networkFilters.stage && builder.stage !== networkFilters.stage) return false;
        if (networkFilters.matchOnly && builder.fitScore < 75) return false;
        // "Raising now" = real Apparent founders who declared raising/open intent.
        // This is the signal a pure scraper (Harmonic/Specter) structurally can't have.
        if (
          networkFilters.raisingOnly &&
          !(builder.origin === 'apparent' && (builder.fundraisingStatus === 'raising' || builder.fundraisingStatus === 'open'))
        ) {
          return false;
        }

        // VC view: hide low-completeness Apparent founders. Ingested signals
        // bypass this — they have no profile to score.
        if (builder.origin === 'apparent' && isInvestor) {
          const score = builder.profileCompleteness ?? 0;
          if (score < minCompleteness) return false;
        }

        if (raisingAmountFloor > 0) {
          const amount = parseRaisingAmount(builder.raisingAmount);
          if (amount < raisingAmountFloor) return false;
        }

        const ageMs = Date.now() - new Date(builder.latestActivity).getTime();
        if (ageMs > maxAgeByFreshness[networkFilters.freshness]) return false;

        return true;
      })
      .sort((a, b) => {
        if (networkFilters.pin) {
          return distanceMiles(networkFilters.pin, a) - distanceMiles(networkFilters.pin, b);
        }

        // VCs default-sort by completeness desc so the highest-signal founders
        // float to the top; everyone else keeps the fit-score sort.
        if (isInvestor) {
          const completenessDelta = (b.profileCompleteness ?? 0) - (a.profileCompleteness ?? 0);
          if (completenessDelta !== 0) return completenessDelta;
        }

        return b.fitScore - a.fitScore;
      });
  }, [builderDiscoveryById, builderNodes, isInvestor, networkFilters]);
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

  const addActivity = (item: string) => {
    setActivity((current) => [item, ...current].slice(0, 6));
  };

  const handleLaunchAssetUpload = async (
    field: 'logoUrl' | 'bannerUrl' | 'demoVideoUrl' | 'pitchVideoUrl' | 'pitchDeckUrl',
    file: File | undefined,
  ) => {
    if (!file) return;

    const folder =
      field === 'logoUrl' ? 'logos' :
      field === 'bannerUrl' ? 'banners' :
      field === 'demoVideoUrl' || field === 'pitchVideoUrl' ? 'videos' : 'decks';

    try {
      const url = await uploadFile(file, folder);
      setLaunchDraft((current) => {
        const next = { ...current, [field]: url };

        // Only auto-save if this launch already exists in Supabase (has a real
        // id). New drafts must wait for the explicit "Launch on Apparent" click —
        // auto-saving here would create duplicate/premature live launches.
        if (next.id) {
          setAutoSaveStatus('saving');
          saveProductLaunch(user, next)
            .then((saved) => {
              setProductLaunches((launches) => [saved, ...launches.filter((l) => l.id !== saved.id)]);
              setAutoSaveStatus('saved');
              setTimeout(() => setAutoSaveStatus('idle'), 2000);
            })
            .catch(() => {
              setAutoSaveStatus('error');
              setTimeout(() => setAutoSaveStatus('idle'), 3000);
            });
        }

        return next;
      });
      addActivity(`Added launch media: ${file.name}`);
    } catch {
      addActivity(`Upload failed for ${file.name} — please try again`);
    }
  };

  const handleProfileAssetUpload = async (file: File | undefined) => {
    if (!file) return;

    try {
      setAutoSaveStatus('saving');
      const url = await uploadFile(file, 'photos');
      setIntakeValues((current) => {
        const next = { ...current, profilePhotoUrl: url };
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
    } catch {
      setAutoSaveStatus('error');
      setTimeout(() => setAutoSaveStatus('idle'), 3000);
    }
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
      navigate(`${dashboardBasePath}/messages`);
    } catch (error) {
      setDashboardError(error instanceof Error ? error.message : 'Unable to create investor message draft.');
    } finally {
      setSavingWorkflow(null);
    }
  };

  const handlePrepProofForMatch = (match: MatchItem) => {
    addActivity(`Preparing founder profile for ${match.name}`);
    setActiveView('profile');
    navigate(`${dashboardBasePath}/profile`);
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


  const handleToggleShareable = async () => {
    const next = intakeValues.shareable === 'false' ? 'true' : 'false';
    const nextValues = { ...intakeValues, shareable: next };
    setIntakeValues(nextValues);
    setDashboardError('');
    try {
      await saveIntakeValues(user, role, nextValues);
      addActivity(`Profile share button ${next === 'true' ? 'enabled' : 'disabled'}`);
    } catch (error) {
      setIntakeValues((current) => ({ ...current, shareable: next === 'true' ? 'false' : 'true' }));
      setDashboardError(error instanceof Error ? error.message : 'Unable to update sharing.');
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
    setAgentAutonomy(settings.agentAutonomy);
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
      { dailyDigestEnabled: nextValue, slackAlertsEnabled, agentAutonomy },
      `Daily digest ${nextValue ? 'enabled' : 'paused'}`,
    );
  };

  const toggleSlackAlerts = () => {
    const nextValue = !slackAlertsEnabled;
    void persistSettings(
      { dailyDigestEnabled, slackAlertsEnabled: nextValue, agentAutonomy },
      `Slack alerts ${nextValue ? 'enabled' : 'paused'}`,
    );
  };

  const autonomyLabel: Record<AgentAutonomy, string> = {
    manual: 'Draft & approve',
    auto_onplatform: 'Auto-DM matches',
    autonomous: 'Fully autonomous',
  };

  const handleAgentAutonomyChange = (next: AgentAutonomy) => {
    if (next === agentAutonomy) return;
    void persistSettings(
      { dailyDigestEnabled, slackAlertsEnabled, agentAutonomy: next },
      `Agent mode set to “${autonomyLabel[next]}”`,
    );
  };

  // Founder ids this investor has already messaged — the agent avoids re-proposing
  // them, and the send guardrail blocks a second contact.
  const contactedFounderIds = useMemo(
    () =>
      Array.from(
        new Set(
          messages
            .filter((message) => message.ownerId === user.id && message.recipientId)
            .map((message) => message.recipientId as string),
        ),
      ),
    [messages, user.id],
  );

  const contactedInvestorIds = useMemo(
    () =>
      Array.from(
        new Set(
          messages
            .filter((message) => message.ownerId === user.id && message.recipientId && message.context === 'founder-intro')
            .map((message) => message.recipientId as string),
        ),
      ),
    [messages, user.id],
  );

  const handleApplyAgentProfilePatch = async (
    patch: AgentProfilePatch,
    fields: string[],
  ): Promise<{ ok: boolean; reason?: string }> => {
    if (patch.role !== role) {
      return { ok: false, reason: 'This draft is for a different workspace role.' };
    }

    const requested = new Set(fields);
    const applicable = patch.fields.filter(
      (field) => requested.has(field.field) && Object.prototype.hasOwnProperty.call(intakeValues, field.field),
    );
    if (applicable.length === 0) return { ok: false, reason: 'No supported fields selected.' };

    const nextValues: Record<string, string> = { ...intakeValues };
    applicable.forEach((field) => {
      nextValues[field.field] = field.newValue;
    });

    try {
      await saveIntakeValues(user, role, nextValues);
      setIntakeValues(nextValues);
      setProfileSaved(true);
      await saveAgentProfilePatchMemory(user, patch, applicable.map((field) => field.field));
      const stampedAt = new Date().toISOString();
      setAgentMemories((current) => [
        ...applicable.map((field) => ({
          role,
          scope: 'profile' as const,
          key: field.field,
          value: field.newValue,
          sourceUrl: field.sourceUrl,
          confidence: field.confidence ?? 'medium',
          updatedAt: stampedAt,
        })),
        ...current.filter((memory) => !applicable.some((field) => memory.scope === 'profile' && memory.key === field.field)),
      ].slice(0, 40));
      addActivity(`Agent applied ${formatCount(applicable.length, 'profile field', 'profile fields')}`);
      return { ok: true };
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Unable to apply profile update.';
      setDashboardError(reason);
      return { ok: false, reason };
    }
  };

  const handleRememberAgentConversation = async (
    userMessage: string,
    assistantReply: string,
    threadId: string,
  ): Promise<void> => {
    const memory = await saveAgentConversationMemory(user, role, userMessage, assistantReply, threadId);
    if (!memory) return;
    setAgentMemories((current) => [memory, ...current].slice(0, 40));
  };

  const handlePersistAgentChat = async (
    nextMessages: AgentChatHistoryMessage[],
    suggestedTitle = 'New conversation',
    targetThreadId: string | null = activeAgentThreadId,
  ): Promise<string> => {
    let threadId = targetThreadId;
    let createdThread = false;
    if (!threadId) {
      const thread = await createAgentChatThread(user, role, suggestedTitle);
      threadId = thread.id;
      createdThread = true;
      activeAgentThreadIdRef.current = thread.id;
      setActiveAgentThreadId(thread.id);
      setAgentChatThreads((current) => [thread, ...current.filter((item) => item.id !== thread.id)]);
    }

    if (activeAgentThreadIdRef.current === threadId) {
      setAgentChatMessages(nextMessages);
    }
    await saveAgentChatMessages(user, role, threadId, nextMessages);
    const stampedAt = new Date().toISOString();
    setAgentChatThreads((current) => current.map((thread) => (
      thread.id === threadId ? { ...thread, updatedAt: stampedAt } : thread
    )).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));

    if (createdThread && !new URLSearchParams(window.location.search).get('thread')) {
      navigate(`${dashboardBasePath}/agent?thread=${encodeURIComponent(threadId)}`, { replace: true });
    }
    return threadId;
  };

  const handleStartNewAgentConversation = (): void => {
    activeAgentThreadIdRef.current = null;
    setActiveAgentThreadId(null);
    setAgentChatMessages([]);
    setAgentChatLoaded(true);
    navigate(`${dashboardBasePath}/agent`);
  };

  const handleDeleteAgentConversation = async (thread: AgentChatThread): Promise<void> => {
    setDashboardError('');
    try {
      await deleteAgentChatThread(user, role, thread.id);
      setAgentChatThreads((current) => current.filter((item) => item.id !== thread.id));
      setAgentMemories((current) => current.filter((memory) => memory.threadId !== thread.id));

      if (activeAgentThreadIdRef.current === thread.id || selectedAgentThreadId === thread.id) {
        activeAgentThreadIdRef.current = null;
        setActiveAgentThreadId(null);
        setAgentChatMessages([]);
        setAgentChatLoaded(true);
        navigate(`${dashboardBasePath}/agent`, { replace: true });
      }
    } catch (error) {
      setDashboardError(error instanceof Error ? error.message : 'Unable to delete the conversation.');
      throw error;
    }
  };

  const rememberAgentAction = async (key: string, value: string): Promise<void> => {
    const memory = await saveAgentActionMemory(user, role, key, value);
    if (!memory) return;
    setAgentMemories((current) => [memory, ...current].slice(0, 40));
  };

  // Auto-advance a founder's deal-flow stage from agent activity. Only moves
  // forward through '' → New → Reached Out → Reviewing; never overrides a manual
  // 'Meeting' or 'Watchlist'.
  const STAGE_AUTO_RANK: Record<string, number> = { '': 0, New: 1, 'Reached Out': 2, Reviewing: 3 };
  const applyDealStage = async (founderId: string, desired: 'Reached Out' | 'Reviewing') => {
    const existing = builderDiscoveryById.get(founderId);
    const current = existing?.stage ?? '';
    if (current === 'Meeting' || current === 'Watchlist') return;
    if ((STAGE_AUTO_RANK[desired] ?? 0) <= (STAGE_AUTO_RANK[current] ?? 0)) return;
    const base: BuilderDiscoveryState =
      existing ?? {
        userId: user.id,
        builderId: founderId,
        saved: false,
        hidden: false,
        stage: '',
        note: '',
        outreachBody: '',
        updatedAt: new Date().toISOString(),
      };
    mergeBuilderState({ ...base, saved: true, stage: desired, updatedAt: new Date().toISOString() });
    try {
      const saved = await saveBuilderDiscoveryState(user, founderId, { saved: true, stage: desired });
      mergeBuilderState(saved);
    } catch {
      /* non-fatal — reconciliation retries on next load */
    }
  };

  // Guardrail-enforced send used by the agent's outreach proposals. Runs as the
  // authenticated investor (RLS-safe) via the existing messaging rails.
  const AGENT_DAILY_DM_CAP = 25;
  const handleAgentOutreach = async (proposal: {
    founderId: string;
    founderName: string;
    subject: string;
    body: string;
  }): Promise<{ ok: boolean; reason?: string }> => {
    if (!proposal.founderId || !proposal.body.trim()) {
      return { ok: false, reason: 'Incomplete draft' };
    }

    // Guardrail: respect the founder's contact preference.
    const builder = builderNodes.find((node) => node.id === proposal.founderId);
    if (builder && builder.openToContact === false) {
      return { ok: false, reason: 'Not open to contact' };
    }

    // Guardrail: never contact the same founder twice.
    if (contactedFounderIds.includes(proposal.founderId)) {
      return { ok: false, reason: 'Already contacted' };
    }

    // Guardrail: per-day auto-send cap.
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const sentToday = messages.filter(
      (message) =>
        message.context === 'agent-outreach' &&
        message.ownerId === user.id &&
        new Date(message.updatedAt).getTime() >= startOfDay.getTime(),
    ).length;
    if (sentToday >= AGENT_DAILY_DM_CAP) {
      return { ok: false, reason: 'Daily limit reached' };
    }

    try {
      const savedMessage = await saveMessage(user, {
        recipient: proposal.founderName || 'Founder',
        recipientId: proposal.founderId,
        senderName: user.username || user.email.split('@')[0],
        subject: proposal.subject,
        body: proposal.body,
        status: 'sent',
        context: 'agent-outreach',
      });
      setMessages((current) => [savedMessage, ...current.filter((message) => message.id !== savedMessage.id)]);
      addActivity(`Agent reached out to ${proposal.founderName || 'a founder'}`);
      void rememberAgentAction('outreach', `Sent agent outreach to ${proposal.founderName || proposal.founderId}: ${proposal.subject || 'No subject'}`);
      void applyDealStage(proposal.founderId, 'Reached Out');
      return { ok: true };
    } catch (error) {
      return { ok: false, reason: error instanceof Error ? error.message : 'Send failed' };
    }
  };

  // ---------- Founder agent (F1): intros to on-platform investors + amplify ----------

  const founderAgentContext = useMemo(
    () => ({
      name: intakeValues.profileName ?? '',
      profileName: intakeValues.profileName ?? '',
      headline: intakeValues.headline ?? '',
      bio: intakeValues.bio ?? '',
      currentBuild: intakeValues.currentBuild ?? '',
      category: intakeValues.category ?? '',
      stage: intakeValues.stage ?? '',
      location: intakeValues.location ?? '',
      traction: intakeValues.traction || intakeValues.tractionValue || intakeValues.mrr || '',
      lookingFor: intakeValues.lookingFor ?? '',
      website: intakeValues.website ?? '',
      github: intakeValues.github ?? '',
      linkedin: intakeValues.linkedin ?? '',
      xProfile: intakeValues.xProfile ?? '',
      pastProducts: intakeValues.pastProducts ?? '',
      tractionType: intakeValues.tractionType ?? '',
      tractionValue: intakeValues.tractionValue ?? '',
      teamSize: intakeValues.teamSize ?? '',
      priorRaiseAmount: intakeValues.priorRaiseAmount ?? '',
      targetCloseDate: intakeValues.targetCloseDate ?? '',
      fundraisingStatus: intakeValues.fundraisingStatus ?? '',
      raisingRound: intakeValues.raisingRound ?? '',
      raisingAmount: intakeValues.raisingAmount ?? '',
      raisingAsk: intakeValues.raisingAsk ?? '',
      openToContact: intakeValues.openToContact ?? '',
    }),
    [intakeValues],
  );

  // Founder → on-platform investor intro DM (RLS-safe; reuses the messaging rails).
  const handleFounderIntro = async (proposal: {
    investorId: string;
    investorName: string;
    subject: string;
    body: string;
  }): Promise<{ ok: boolean; reason?: string }> => {
    if (!proposal.investorId || !proposal.body.trim()) return { ok: false, reason: 'Incomplete draft' };
    if (contactedInvestorIds.includes(proposal.investorId)) return { ok: false, reason: 'Already messaged' };

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const sentToday = messages.filter(
      (message) =>
        message.context === 'founder-intro' &&
        message.ownerId === user.id &&
        new Date(message.updatedAt).getTime() >= startOfDay.getTime(),
    ).length;
    if (sentToday >= AGENT_DAILY_DM_CAP) return { ok: false, reason: 'Daily limit reached' };

    try {
      const savedMessage = await saveMessage(user, {
        recipient: proposal.investorName || 'Investor',
        recipientId: proposal.investorId,
        senderName: founderAgentContext.name || user.username || user.email.split('@')[0],
        subject: proposal.subject,
        body: proposal.body,
        status: 'sent',
        context: 'founder-intro',
      });
      setMessages((current) => [savedMessage, ...current.filter((message) => message.id !== savedMessage.id)]);
      addActivity(`Sent an intro to ${proposal.investorName || 'an investor'}`);
      void rememberAgentAction('founder_intro', `Sent founder intro to ${proposal.investorName || proposal.investorId}: ${proposal.subject || 'No subject'}`);
      return { ok: true };
    } catch (error) {
      return { ok: false, reason: error instanceof Error ? error.message : 'Send failed' };
    }
  };

  const handleFounderAmplify = async (): Promise<number> => {
    const count = await notifyInvestorsOfFounder(user);
    if (count > 0) addActivity(`Amplified to ${formatCount(count, 'matched investor', 'matched investors')}`);
    if (count > 0) void rememberAgentAction('amplify', `Amplified founder profile to ${formatCount(count, 'matched investor', 'matched investors')}.`);
    return count;
  };

  // Finish a pending `npx apparent` claim that was started before sign-in, so it
  // completes wherever the user lands after auth.
  const claimSweptRef = useRef(false);
  useEffect(() => {
    if (claimSweptRef.current || user.isDev) return;
    let code = '';
    try {
      code = window.localStorage.getItem(PENDING_CLAIM_KEY) || '';
    } catch {
      code = '';
    }
    if (!code) return;
    claimSweptRef.current = true;
    void (async () => {
      const result = await claimCliBuild(user, code);
      try {
        window.localStorage.removeItem(PENDING_CLAIM_KEY);
      } catch {
        /* ignore */
      }
      if (result.ok) addActivity('Imported your npx apparent build into your profile');
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- Phase 3: autonomous follow-ups + reply-aware deal flow ----------

  const FOLLOWUP_DELAY_MS = 3 * 24 * 60 * 60 * 1000; // nudge once after 3 quiet days
  const followupSweptRef = useRef(false);

  // In fully-autonomous mode, nudge un-replied agent outreach once after a delay.
  const runAutonomousFollowups = async () => {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const now = Date.now();

    type Track = { lastOut: number; lastIn: number; followups: number; name: string };
    const byFounder = new Map<string, Track>();

    for (const message of messages) {
      if (
        message.ownerId === user.id &&
        message.recipientId &&
        (message.context === 'agent-outreach' || message.context === 'agent-followup')
      ) {
        const track = byFounder.get(message.recipientId) ?? { lastOut: 0, lastIn: 0, followups: 0, name: '' };
        track.lastOut = Math.max(track.lastOut, new Date(message.updatedAt).getTime());
        if (message.context === 'agent-followup') track.followups += 1;
        if (!track.name) track.name = message.recipient;
        byFounder.set(message.recipientId, track);
      }
    }
    for (const message of messages) {
      if (message.recipientId === user.id && message.ownerId && byFounder.has(message.ownerId)) {
        const track = byFounder.get(message.ownerId)!;
        track.lastIn = Math.max(track.lastIn, new Date(message.updatedAt).getTime());
      }
    }

    let sentToday = messages.filter(
      (message) =>
        (message.context === 'agent-outreach' || message.context === 'agent-followup') &&
        message.ownerId === user.id &&
        new Date(message.updatedAt).getTime() >= startOfDay.getTime(),
    ).length;

    for (const [founderId, track] of byFounder) {
      if (track.lastIn > track.lastOut) continue; // they replied — leave it
      if (track.followups >= 1) continue; // already nudged once
      if (now - track.lastOut < FOLLOWUP_DELAY_MS) continue; // not stale yet
      if (sentToday >= AGENT_DAILY_DM_CAP) break;

      const builder = builderNodes.find((node) => node.id === founderId);
      if (builder && builder.openToContact === false) continue;

      const displayName = builder?.founderName || track.name || 'there';
      const company = builder?.company || '';
      const body = `Following up on my earlier note${company ? ` about ${company}` : ''} — still keen to learn more about what you're building. Open to a quick chat this week?`;

      try {
        // eslint-disable-next-line no-await-in-loop
        const saved = await saveMessage(user, {
          recipient: track.name || displayName,
          recipientId: founderId,
          senderName: user.username || user.email.split('@')[0],
          subject: 'Following up',
          body,
          status: 'sent',
          context: 'agent-followup',
        });
        setMessages((current) => [saved, ...current.filter((message) => message.id !== saved.id)]);
        addActivity(`Agent followed up with ${displayName}`);
        void rememberAgentAction('followup', `Sent one follow-up to ${displayName}.`);
        sentToday += 1;
      } catch {
        /* non-fatal */
      }
    }
  };

  // Reply-aware deal flow: reflect outreach + replies on the kanban automatically.
  useEffect(() => {
    if (!isInvestor) return;
    const lastOut = new Map<string, number>();
    const lastIn = new Map<string, number>();
    for (const message of messages) {
      const t = new Date(message.updatedAt).getTime();
      if (message.ownerId === user.id && message.recipientId) {
        if (t > (lastOut.get(message.recipientId) ?? 0)) lastOut.set(message.recipientId, t);
      } else if (message.recipientId === user.id && message.ownerId && message.ownerId !== user.id) {
        if (t > (lastIn.get(message.ownerId) ?? 0)) lastIn.set(message.ownerId, t);
      }
    }
    void (async () => {
      for (const [founderId, outT] of lastOut) {
        const inT = lastIn.get(founderId);
        // eslint-disable-next-line no-await-in-loop
        await applyDealStage(founderId, inT && inT > outT ? 'Reviewing' : 'Reached Out');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, isInvestor, user.id]);

  // Fully-autonomous follow-up sweep — runs once per session after data loads.
  useEffect(() => {
    if (!isInvestor || agentAutonomy !== 'autonomous' || !hasLoadedRef.current || followupSweptRef.current) return;
    followupSweptRef.current = true;
    void runAutonomousFollowups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInvestor, agentAutonomy, messages]);

  const handleSignOut = async () => {
    try {
      await signOut();
    } finally {
      navigate('/login');
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

      // First dibs: push the launch to thesis-matched on-platform investors so
      // they see it before the founder falls back to cold heat-map outreach.
      if (savedLaunch.publicProfileEnabled) {
        void notifyInvestorsOfLaunch(user, savedLaunch.id).then((count) => {
          if (count > 0) {
            addActivity(
              `${formatCount(count, 'matched investor', 'matched investors')} notified — they have first dibs on ${savedLaunch.name}`,
            );
          }
        });
      }
    } catch (error) {
      setDashboardError(error instanceof Error ? error.message : 'Unable to save product launch.');
    } finally {
      setSavingWorkflow(null);
    }
  };

  const handleDeleteProductLaunch = async (launch: ProductLaunch) => {
    if (!window.confirm(`Delete "${launch.name}"? This cannot be undone.`)) return;
    try {
      const assetUrls = [
        launch.logoUrl,
        launch.bannerUrl,
        launch.demoVideoUrl,
        launch.pitchVideoUrl,
        launch.pitchDeckUrl,
      ].filter(Boolean) as string[];
      await deleteProductLaunch(user, launch.id, assetUrls);
      setProductLaunches((current) => current.filter((l) => l.id !== launch.id));
      setPublicLaunches((current) => current.filter((l) => l.id !== launch.id));
      // If the deleted launch was selected, fall back to the next one.
      setSelectedLaunchId((current) =>
        current === launch.id
          ? productLaunches.find((l) => l.id !== launch.id)?.id ?? ''
          : current,
      );
      addActivity(`Deleted launch: ${launch.name}`);
    } catch {
      setDashboardError('Unable to delete launch. Please try again.');
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
    navigate('/dashboard/founder/profile');
    window.setTimeout(() => scrollToSection('profile'), 50);
    addActivity('Opened founder profile from launch');
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


  const handleSaveMessage = async (status: UserMessage['status']) => {
    const recipient = messageDraft.recipient.trim() || activeMessageThread?.recipient.trim() || '';
    const recipientId = activeMessageThread?.counterpartyId || '';
    const senderName = (intakeValues.profileName || '').trim() || user.username || user.email.split('@')[0];
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
        recipientId,
        senderName,
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
      setSelectedMessageThreadId(activeMessageThread?.id ?? (savedMessage.recipientId || savedMessage.recipient.toLowerCase()));
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

  const handleDashboardViewChange = (value: string) => {
    const nextView = value as ViewMode;
    setActiveView(nextView);
    const sectionId = sectionIdFromView(nextView);
    if (nextView === 'products') {
      navigate('/dashboard/founder/products');
    } else if (nextView === 'vc-heatmap') {
      navigate('/dashboard/founder/vc-heatmap');
    } else {
      navigate(`${dashboardBasePath}/${sectionId}`);
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
              {/* HERO — avatar, name, public-profile link, progress badge */}
              <section className="rounded-[20px] border border-black/10 bg-white shadow-[0_10px_34px_rgba(0,0,0,0.04)]">
                <div className="px-5 py-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-[24px] bg-charcoal text-2xl font-semibold text-white shadow-sm">
                        {getInitials(user.email.split('@')[0].replace(/[._-]+/g, ' '))}
                      </div>
                      <div className="pb-1">
                        <h2 className="text-2xl font-normal tracking-[-0.03em] font-serif">
                          {user.email.split('@')[0].replace(/[._-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                        </h2>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">Investor profile on Apparent</p>
                        <a
                          href={`/@${user.username ?? user.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-flex items-center gap-1 rounded-full bg-[#f4f1eb] px-3 py-1 text-xs font-medium text-gray-600 transition hover:bg-charcoal hover:text-white"
                        >
                          <ArrowUpRight className="h-3 w-3" />
                          @{user.username ?? user.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '')} · View public profile
                        </a>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-[#f4f1eb] px-3 py-1.5 text-xs font-medium text-gray-600">
                        {completedFieldCount}/{intakeFields.length} complete
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              {/* MAIN LAYOUT — sidebar nav + section content + right rail */}
              <section className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)_320px]">
                {/* Sidebar nav */}
                <aside className="space-y-1 self-start rounded-[20px] border border-black/10 bg-white p-3 shadow-[0_10px_34px_rgba(0,0,0,0.04)] lg:sticky lg:top-6">
                  {([
                    { key: 'thesis', label: 'Thesis' },
                    { key: 'criteria', label: 'Criteria' },
                    { key: 'portfolio', label: 'Portfolio' },
                    { key: 'visibility', label: 'Visibility' },
                  ] as const).map((s) => {
                    const isActive = profileSection === s.key;
                    return (
                      <button
                        key={s.key}
                        type="button"
                        onClick={() => setProfileSection(s.key)}
                        className={`w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                          isActive ? `${accentSurface} ${accentForeground}` : 'text-gray-600 hover:bg-[#f6f3f1]'
                        }`}
                      >
                        {s.label}
                      </button>
                    );
                  })}
                  <div className="mt-3 border-t border-black/5 pt-3 px-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">Auto-save</p>
                    <p className="mt-1 text-xs text-gray-500">
                      {autoSaveStatus === 'saving' && 'Saving…'}
                      {autoSaveStatus === 'saved' && '✓ All changes saved'}
                      {autoSaveStatus === 'error' && 'Save failed — try again'}
                      {autoSaveStatus === 'idle' && 'Changes save automatically'}
                    </p>
                  </div>
                </aside>

                {/* Section content */}
                <div className="space-y-6">
                  {/* THESIS — investment narrative, founder signals, pass signals */}
                  {profileSection === 'thesis' && (
                    <section className="rounded-[20px] border border-black/10 bg-white shadow-[0_10px_34px_rgba(0,0,0,0.04)]">
                      <div className="border-b border-black/10 px-5 py-4">
                        <h3 className="text-sm font-semibold">Thesis</h3>
                        <p className="mt-1 text-xs text-gray-500">Your investment narrative and the founder signals that shape your sourcing.</p>
                      </div>
                      <div className="divide-y divide-black/10">
                        {['thesis', 'founderSignals', 'passSignals'].map((key) => {
                          const field = investorIntakeFields.find((f) => f.key === key);
                          if (!field) return null;
                          return (
                            <label key={field.key} className="grid gap-3 px-5 py-4 transition-colors hover:bg-[#f6f3f1] md:grid-cols-[220px_1fr]">
                              <div>
                                <p className="text-sm font-medium">{field.label}</p>
                                <p className="mt-1 text-xs text-gray-400">{intakeValues[field.key]?.trim() ? 'Captured' : 'Optional'}</p>
                              </div>
                              <textarea value={intakeValues[field.key] ?? ''} onChange={(event) => handleIntakeChange(field.key, event.target.value)} placeholder={field.placeholder} className="min-h-20 w-full resize-none border-0 bg-transparent text-sm leading-relaxed outline-none placeholder:text-gray-400" />
                            </label>
                          );
                        })}
                      </div>
                    </section>
                  )}

                  {/* CRITERIA — stage, sectors, check size, geography */}
                  {profileSection === 'criteria' && (
                    <section className="rounded-[20px] border border-black/10 bg-white shadow-[0_10px_34px_rgba(0,0,0,0.04)]">
                      <div className="border-b border-black/10 px-5 py-4">
                        <h3 className="text-sm font-semibold">Criteria</h3>
                        <p className="mt-1 text-xs text-gray-500">Stage, sectors, geography, and check size that define your deal parameters.</p>
                      </div>
                      <div className="divide-y divide-black/10">
                        {['sectors', 'stage', 'checkSize', 'geography'].map((key) => {
                          const field = investorIntakeFields.find((f) => f.key === key);
                          if (!field) return null;
                          return (
                            <label key={field.key} className="grid gap-3 px-5 py-4 transition-colors hover:bg-[#f6f3f1] md:grid-cols-[220px_1fr]">
                              <div>
                                <p className="text-sm font-medium">{field.label}</p>
                                <p className="mt-1 text-xs text-gray-400">{intakeValues[field.key]?.trim() ? 'Captured' : 'Optional'}</p>
                              </div>
                              {field.kind === 'select' ? (
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
                          );
                        })}
                      </div>
                    </section>
                  )}

                  {/* PORTFOLIO — companies that calibrate signal ranking */}
                  {profileSection === 'portfolio' && (
                    <section className="rounded-[20px] border border-black/10 bg-white shadow-[0_10px_34px_rgba(0,0,0,0.04)]">
                      <div className="border-b border-black/10 px-5 py-4">
                        <h3 className="text-sm font-semibold">Portfolio</h3>
                        <p className="mt-1 text-xs text-gray-500">Companies that match your taste — used to calibrate deal-flow signal ranking.</p>
                      </div>
                      <div className="divide-y divide-black/10">
                        {(() => {
                          const field = investorIntakeFields.find((f) => f.key === 'portfolioExamples');
                          if (!field) return null;
                          return (
                            <label className="grid gap-3 px-5 py-4 transition-colors hover:bg-[#f6f3f1] md:grid-cols-[220px_1fr]">
                              <div>
                                <p className="text-sm font-medium">{field.label}</p>
                                <p className="mt-1 text-xs text-gray-400">{intakeValues[field.key]?.trim() ? 'Captured' : 'Optional'}</p>
                              </div>
                              <input value={intakeValues[field.key] ?? ''} onChange={(event) => handleIntakeChange(field.key, event.target.value)} placeholder={field.placeholder} className="h-8 w-full border-0 bg-transparent text-sm outline-none placeholder:text-gray-400" />
                            </label>
                          );
                        })()}
                      </div>
                    </section>
                  )}

                  {/* VISIBILITY — public profile toggle + field-level checkboxes */}
                  {profileSection === 'visibility' && (
                    <section className="rounded-[20px] border border-black/10 bg-white shadow-[0_10px_34px_rgba(0,0,0,0.04)]">
                      <div className="border-b border-black/10 px-5 py-4">
                        <h3 className="text-sm font-semibold">Public profile</h3>
                        <p className="mt-1 text-xs text-gray-500">
                          Control what&apos;s visible on your public page at{' '}
                          <a
                            href={`/@${user.username ?? user.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '')}`}
                            target="_blank"
                            rel="noreferrer"
                            className="font-medium text-ink underline underline-offset-2"
                          >
                            /@{user.username ?? user.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '')}
                          </a>
                        </p>
                      </div>
                      <div className="space-y-3 px-5 py-4">
                        <label className="flex items-center justify-between gap-3 rounded-xl bg-[#f6f3f1] px-4 py-3">
                          <span className="text-sm">
                            <span className="font-medium">
                              {intakeValues.publicProfileEnabled === 'true' ? 'Public profile on' : 'Private (platform only)'}
                            </span>
                            <span className="mt-0.5 block text-xs text-gray-500">
                              {intakeValues.publicProfileEnabled === 'true'
                                ? 'Visible to the internet. Only checked fields shown.'
                                : 'Visible only to signed-in Apparent members.'}
                            </span>
                          </span>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={intakeValues.publicProfileEnabled === 'true'}
                            onClick={() => handleIntakeChange('publicProfileEnabled', intakeValues.publicProfileEnabled === 'true' ? 'false' : 'true')}
                            className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${intakeValues.publicProfileEnabled === 'true' ? 'bg-charcoal' : 'bg-gray-200'}`}
                          >
                            <span className={`inline-block h-3.5 w-3.5 translate-x-0.5 rounded-full bg-white shadow transition-transform ${intakeValues.publicProfileEnabled === 'true' ? 'translate-x-[1.125rem]' : ''}`} />
                          </button>
                        </label>
                      </div>
                      <div className="grid gap-1 border-t border-black/10 px-5 py-4 sm:grid-cols-2">
                        {[
                          { key: 'thesis', label: 'Investment thesis' },
                          { key: 'sectors', label: 'Sectors' },
                          { key: 'stage', label: 'Preferred stage' },
                          { key: 'geography', label: 'Geography' },
                          { key: 'checkSize', label: 'Check size' },
                          { key: 'portfolioExamples', label: 'Portfolio companies' },
                          { key: 'founderSignals', label: 'What you back' },
                        ].map(({ key, label }) => {
                          const currentFields: string[] = (() => {
                            try { return JSON.parse(intakeValues.publicFields ?? '[]'); } catch { return []; }
                          })();
                          const isChecked = currentFields.includes(key);
                          const toggleField = () => {
                            const next = isChecked ? currentFields.filter((f) => f !== key) : [...currentFields, key];
                            handleIntakeChange('publicFields', JSON.stringify(next));
                          };
                          return (
                            <label key={key} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm transition hover:bg-[#f6f3f1]">
                              <input type="checkbox" checked={isChecked} onChange={toggleField} className="h-3.5 w-3.5 rounded accent-ink" />
                              <span className="text-gray-700">{label}</span>
                            </label>
                          );
                        })}
                      </div>
                      <div className="border-t border-black/10 px-5 py-3">
                        <p className="text-xs text-gray-400">
                          {intakeValues.publicProfileEnabled === 'true'
                            ? 'Your profile is visible to the internet. Only checked fields are shown to non-members.'
                            : 'Your profile is only visible to signed-in Apparent members — no public indexing.'}
                        </p>
                      </div>
                    </section>
                  )}
                </div>

                {/* Right rail — top signals + portfolio calibration */}
                <aside className="space-y-6 self-start lg:sticky lg:top-6">
                  <section className="rounded-[20px] border border-black/10 bg-white shadow-[0_10px_34px_rgba(0,0,0,0.04)]">
                    <div className="flex items-center justify-between border-b border-black/10 px-5 py-4">
                      <div>
                        <h3 className="text-sm font-semibold">Top ranked signals</h3>
                        <p className="mt-1 text-xs text-gray-500">Highest-scoring deals based on your thesis.</p>
                      </div>
                      <button type="button" className={`rounded-full ${accentSurface} px-3 py-1.5 text-xs font-semibold ${accentForeground}`} onClick={() => handleDashboardViewChange('deals')}>
                        View all
                      </button>
                    </div>
                    <div className="divide-y divide-black/10">
                      {signalRows.slice(0, 5).map((signal) => (
                        <article key={signal.id} className="px-5 py-4">
                          <div className="flex items-start gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[14px] bg-[#f7f3e4] text-xs font-semibold text-ink">
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
                        <div className="px-5 py-10 text-sm leading-6 text-gray-500">No signals yet. Fill in your thesis to start seeing ranked deal flow.</div>
                      )}
                    </div>
                  </section>

                  <section className="rounded-[20px] border border-black/10 bg-white shadow-[0_10px_34px_rgba(0,0,0,0.04)]">
                    <div className="border-b border-black/10 px-5 py-4">
                      <h3 className="text-sm font-semibold">Portfolio calibration</h3>
                      <p className="mt-1 text-xs text-gray-500">Companies from your taste list.</p>
                    </div>
                    <div className="divide-y divide-black/10">
                      {(intakeValues.portfolioExamples ?? '').split(',').map((s) => s.trim()).filter(Boolean).map((company) => (
                        <div key={company} className="px-5 py-3 text-sm text-gray-700">{company}</div>
                      ))}
                      {!(intakeValues.portfolioExamples ?? '').trim() && (
                        <div className="px-5 py-8 text-sm leading-6 text-gray-500">Add companies under Portfolio to calibrate signal ranking.</div>
                      )}
                    </div>
                  </section>
                </aside>
              </section>
            </>
          ) : (
            <>
              {/* HERO — avatar, name, headline, public-profile link, photo upload */}
              <section className="rounded-[20px] border border-black/10 bg-white shadow-[0_10px_34px_rgba(0,0,0,0.04)]">
                <div className="px-5 py-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-[24px] bg-lavender text-2xl font-semibold text-black shadow-sm">
                        {intakeValues.profilePhotoUrl ? (
                          <img src={intakeValues.profilePhotoUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          getInitials(profileName)
                        )}
                      </div>
                      <div className="pb-1">
                        <h2 className="text-2xl font-normal tracking-[-0.03em] font-serif">{profileName}</h2>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">{profileHeadline}</p>
                        <a
                          href={`/@${user.username ?? user.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-flex items-center gap-1 rounded-full bg-[#f4f1eb] px-3 py-1 text-xs font-medium text-gray-600 transition hover:bg-lavender hover:text-black"
                        >
                          <ArrowUpRight className="h-3 w-3" />
                          @{user.username ?? user.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '')} · View public profile
                        </a>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-[#f4f1eb] px-3 py-1.5 text-xs font-medium text-gray-600">
                        {completedFieldCount}/{intakeFields.length} complete
                      </span>
                      {!isInvestor && (
                        <span
                          className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                            founderVcReady
                              ? 'bg-lavender text-ink'
                              : 'bg-[#fde7c7] text-[#7a3d00]'
                          }`}
                          title={
                            founderVcReady
                              ? 'Your profile meets every VC-visibility requirement.'
                              : `Fill these to appear in investor searches: ${founderMissingRequired.join(', ')}`
                          }
                        >
                          {founderVcReady ? `${profileStrength}% · VC-ready` : `${profileStrength}% · ${founderMissingRequired.length} required field${founderMissingRequired.length === 1 ? '' : 's'} missing`}
                        </span>
                      )}
                      <label className="cursor-pointer rounded-full border border-black/10 px-3 py-1.5 text-xs font-semibold hover:bg-[#f6f3f1]">
                        <input type="file" accept="image/*" className="hidden" onChange={(event) => handleProfileAssetUpload(event.target.files?.[0])} />
                        Upload photo
                      </label>
                    </div>
                  </div>
                </div>
              </section>

              {/* MAIN LAYOUT — sidebar nav (left) + section content (right) + right rail */}
              <section className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)_320px]">
                {/* Sidebar nav */}
                <aside className="space-y-1 self-start rounded-[20px] border border-black/10 bg-white p-3 shadow-[0_10px_34px_rgba(0,0,0,0.04)] lg:sticky lg:top-6">
                  {[
                    ...profileSections.map((s) => ({ key: s.key as ProfileSectionKey, label: s.label })),
                    { key: 'raising' as ProfileSectionKey, label: 'Raising' },
                    { key: 'visibility' as ProfileSectionKey, label: 'Visibility & Trust' },
                  ].map((s) => {
                    const isActive = profileSection === s.key;
                    return (
                      <button
                        key={s.key}
                        type="button"
                        onClick={() => setProfileSection(s.key)}
                        className={`w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                          isActive ? `${accentSurface} ${accentForeground}` : 'text-gray-600 hover:bg-[#f6f3f1]'
                        }`}
                      >
                        {s.label}
                      </button>
                    );
                  })}
                  <div className="mt-3 border-t border-black/5 pt-3 px-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">Auto-save</p>
                    <p className="mt-1 text-xs text-gray-500">
                      {autoSaveStatus === 'saving' && 'Saving…'}
                      {autoSaveStatus === 'saved' && '✓ All changes saved'}
                      {autoSaveStatus === 'error' && 'Save failed — try again'}
                      {autoSaveStatus === 'idle' && 'Changes save automatically'}
                    </p>
                  </div>
                </aside>

                {/* Section content */}
                <div className="space-y-6">
                  {/* About / Links / Traction sections — driven by profileSections data */}
                  {profileSections.map((section) => {
                    if (section.key !== profileSection) return null;
                    const fields = section.fieldKeys
                      .map((k) => founderIntakeFields.find((f) => f.key === k))
                      .filter((f): f is IntakeField => Boolean(f));
                    return (
                      <section key={section.key} className="rounded-[20px] border border-black/10 bg-white shadow-[0_10px_34px_rgba(0,0,0,0.04)]">
                        <div className="border-b border-black/10 px-5 py-4">
                          <h3 className="text-sm font-semibold">{section.label}</h3>
                          <p className="mt-1 text-xs text-gray-500">{section.description}</p>
                        </div>
                        <div className="divide-y divide-black/10">
                          {section.key === 'traction' && (
                            <div className="space-y-3 px-5 py-4">
                              <div className="flex flex-wrap gap-2">
                                {tractionTypeOptions.map((option) => {
                                  const active = (intakeValues.tractionType ?? '') === option.value;
                                  return (
                                    <button
                                      key={option.value}
                                      type="button"
                                      onClick={() => handleIntakeChange('tractionType', active ? '' : option.value)}
                                      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${active ? 'bg-charcoal text-white' : 'bg-[#f4f1eb] text-gray-600 hover:bg-lavender'}`}
                                    >
                                      {option.label}
                                    </button>
                                  );
                                })}
                              </div>
                              <label className="grid gap-1">
                                <span className="text-xs font-medium text-gray-500">Traction value</span>
                                <input
                                  value={intakeValues.tractionValue ?? ''}
                                  onChange={(event) => handleIntakeChange('tractionValue', event.target.value)}
                                  placeholder={
                                    tractionTypeOptions.find((o) => o.value === intakeValues.tractionType)?.placeholder
                                    || 'Pick a type above, then drop in your metric.'
                                  }
                                  className="h-9 border border-black/10 bg-white px-3 text-sm outline-none placeholder:text-gray-400 focus:border-black/30"
                                />
                                <span className="text-[11px] text-gray-400">
                                  This is the single signal investors will sort by — keep it specific (revenue, users, LOIs, prototype link, PMF metric).
                                </span>
                              </label>
                            </div>
                          )}
                          {fields.map((field) => (
                            <label key={field.key} className="grid gap-3 px-5 py-4 transition-colors hover:bg-[#f6f3f1] md:grid-cols-[220px_1fr]">
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
                      </section>
                    );
                  })}

                  {/* RAISING section */}
                  {profileSection === 'raising' && (
                    <section className="rounded-[20px] border border-black/10 bg-white shadow-[0_10px_34px_rgba(0,0,0,0.04)]">
                      <div className="border-b border-black/10 px-5 py-4">
                        <h3 className="text-sm font-semibold">Fundraising status</h3>
                        <p className="mt-1 text-xs text-gray-500">Tell thesis-fit investors whether you&apos;re raising — this is what surfaces you in their &ldquo;Raising now&rdquo; view.</p>
                      </div>
                      <div className="space-y-4 px-5 py-4">
                        <div className="flex flex-wrap gap-2">
                          {([['raising', 'Raising now'], ['open', 'Open to intros'], ['not_raising', 'Not raising']] as const).map(([value, label]) => {
                            const active = (intakeValues.fundraisingStatus ?? 'not_raising') === value;
                            return (
                              <button
                                key={value}
                                type="button"
                                onClick={() => handleIntakeChange('fundraisingStatus', value)}
                                className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors ${active ? 'bg-charcoal text-white' : 'bg-[#f4f1eb] text-gray-600 hover:bg-lavender'}`}
                              >
                                {label}
                              </button>
                            );
                          })}
                        </div>
                        {(intakeValues.fundraisingStatus === 'raising' || intakeValues.fundraisingStatus === 'open') && (
                          <div className="grid gap-3 sm:grid-cols-2">
                            <label className="grid gap-1">
                              <span className="text-xs font-medium text-gray-500">Round</span>
                              <input value={intakeValues.raisingRound ?? ''} onChange={(event) => handleIntakeChange('raisingRound', event.target.value)} placeholder="Pre-seed / Seed / Series A" className="h-9 border border-black/10 bg-white px-3 text-sm outline-none placeholder:text-gray-400 focus:border-black/30" />
                            </label>
                            <label className="grid gap-1">
                              <span className="text-xs font-medium text-gray-500">Amount</span>
                              <input value={intakeValues.raisingAmount ?? ''} onChange={(event) => handleIntakeChange('raisingAmount', event.target.value)} placeholder="$1.5M" className="h-9 border border-black/10 bg-white px-3 text-sm outline-none placeholder:text-gray-400 focus:border-black/30" />
                            </label>
                            <label className="grid gap-1 sm:col-span-2">
                              <span className="text-xs font-medium text-gray-500">What you&apos;re looking for</span>
                              <textarea value={intakeValues.raisingAsk ?? ''} onChange={(event) => handleIntakeChange('raisingAsk', event.target.value)} placeholder="A lead for our pre-seed; investors who understand devtools GTM." className="min-h-16 resize-none border border-black/10 bg-white px-3 py-2 text-sm outline-none placeholder:text-gray-400 focus:border-black/30" />
                            </label>
                            <label className="grid gap-1">
                              <span className="text-xs font-medium text-gray-500">Total raised before this round</span>
                              <input value={intakeValues.priorRaiseAmount ?? ''} onChange={(event) => handleIntakeChange('priorRaiseAmount', event.target.value)} placeholder="$500K pre-seed (or 'None')" className="h-9 border border-black/10 bg-white px-3 text-sm outline-none placeholder:text-gray-400 focus:border-black/30" />
                            </label>
                            <label className="grid gap-1">
                              <span className="text-xs font-medium text-gray-500">Target close date</span>
                              <input type="date" value={intakeValues.targetCloseDate ?? ''} onChange={(event) => handleIntakeChange('targetCloseDate', event.target.value)} className="h-9 border border-black/10 bg-white px-3 text-sm outline-none placeholder:text-gray-400 focus:border-black/30" />
                            </label>
                          </div>
                        )}
                        <label className="flex items-center justify-between gap-3 rounded-xl bg-[#f6f3f1] px-4 py-3">
                          <span className="text-sm">
                            <span className="font-medium">Open to investor contact</span>
                            <span className="mt-0.5 block text-xs text-gray-500">Let thesis-fit investors reach out to you directly through Apparent.</span>
                          </span>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={(intakeValues.openToContact ?? 'true') !== 'false'}
                            onClick={() => handleIntakeChange('openToContact', (intakeValues.openToContact ?? 'true') !== 'false' ? 'false' : 'true')}
                            className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${(intakeValues.openToContact ?? 'true') !== 'false' ? 'bg-charcoal' : 'bg-gray-200'}`}
                          >
                            <span className={`inline-block h-3.5 w-3.5 translate-x-0.5 rounded-full bg-white shadow transition-transform ${(intakeValues.openToContact ?? 'true') !== 'false' ? 'translate-x-[1.125rem]' : ''}`} />
                          </button>
                        </label>
                      </div>
                    </section>
                  )}

                  {/* VISIBILITY & TRUST section */}
                  {profileSection === 'visibility' && (
                    <>
                      <section className="rounded-[20px] border border-black/10 bg-white shadow-[0_10px_34px_rgba(0,0,0,0.04)]">
                        <div className="border-b border-black/10 px-5 py-4">
                          <h3 className="text-sm font-semibold">Public profile</h3>
                          <p className="mt-1 text-xs text-gray-500">
                            Control what&apos;s visible on{' '}
                            <a
                              href={`/@${user.username ?? user.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="font-medium text-ink underline underline-offset-2"
                            >
                              /@{user.username ?? user.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '')}
                            </a>
                          </p>
                        </div>
                        <div className="space-y-3 px-5 py-4">
                          <label className="flex items-center justify-between gap-3 rounded-xl bg-[#f6f3f1] px-4 py-3">
                            <span className="text-sm">
                              <span className="font-medium">
                                {intakeValues.publicProfileEnabled === 'true' ? 'Public profile on' : 'Private (platform only)'}
                              </span>
                              <span className="mt-0.5 block text-xs text-gray-500">
                                {intakeValues.publicProfileEnabled === 'true'
                                  ? 'Visible to the internet. Only checked fields shown.'
                                  : 'Visible only to signed-in Apparent members.'}
                              </span>
                            </span>
                            <button
                              type="button"
                              role="switch"
                              aria-checked={intakeValues.publicProfileEnabled === 'true'}
                              onClick={() => handleIntakeChange('publicProfileEnabled', intakeValues.publicProfileEnabled === 'true' ? 'false' : 'true')}
                              className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${intakeValues.publicProfileEnabled === 'true' ? 'bg-charcoal' : 'bg-gray-200'}`}
                            >
                              <span className={`inline-block h-3.5 w-3.5 translate-x-0.5 rounded-full bg-white shadow transition-transform ${intakeValues.publicProfileEnabled === 'true' ? 'translate-x-[1.125rem]' : ''}`} />
                            </button>
                          </label>
                        </div>
                      </section>

                      <section className="grid gap-6">
                        <GithubVerifyCard user={user} github={intakeValues.github ?? ''} />
                      </section>
                    </>
                  )}
                </div>

                {/* Right rail — investor interest preview */}
                <aside className="space-y-6 self-start lg:sticky lg:top-6">
                  <section className="rounded-[20px] border border-black/10 bg-white shadow-[0_10px_34px_rgba(0,0,0,0.04)]">
                    <div className="flex items-center justify-between gap-3 px-5 py-4">
                      <h3 className="text-sm font-semibold">Investor interest</h3>
                      <span className="shrink-0 rounded-full bg-lavender px-3 py-1 text-xs font-semibold text-ink">
                        {founderInterest.saveCount} tracking
                      </span>
                    </div>
                    <div className="space-y-3 px-5 pb-5">
                      {founderInterest.saveCount > 0 ? (
                        <p className="text-xs leading-5 text-gray-600">
                          {founderInterest.saveCount} investor{founderInterest.saveCount === 1 ? '' : 's'} saved your profile
                          {founderInterest.recentSaverNames.length > 0 && (
                            <> — including {founderInterest.recentSaverNames.slice(0, 3).join(', ')}</>
                          )}.
                        </p>
                      ) : vcInterest.length === 0 ? (
                        <p className="text-xs leading-5 text-gray-500">
                          No investors tracking you yet. Set status to{' '}
                          <span className="font-medium text-ink">Raising now</span> to surface.
                        </p>
                      ) : null}
                      {vcInterest.length > 0 && (
                        <div className="space-y-2 border-t border-black/5 pt-3">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink">
                            Who liked you
                          </p>
                          {vcInterest.slice(0, 4).map((entry) => (
                            <div key={entry.id} className="flex items-center gap-2 rounded-xl bg-[#fbfaf7] px-2.5 py-2">
                              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-charcoal text-[10px] font-semibold text-white">
                                {(entry.investorName || 'VC').slice(0, 2).toUpperCase()}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-medium">{entry.investorName || 'An investor'}</p>
                                <p className="text-[10px] text-gray-500">
                                  {entry.kind === 'superlike' ? 'Wants to talk' : 'Liked'}
                                </p>
                              </div>
                              {entry.kind === 'like' && (
                                <button
                                  type="button"
                                  onClick={() => handleMessageInterestedVc(entry)}
                                  className="shrink-0 rounded-full bg-charcoal px-2.5 py-1 text-[10px] font-semibold text-white hover:opacity-90"
                                >
                                  Message
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </section>

                  <section className="rounded-[20px] border border-black/10 bg-white shadow-[0_10px_34px_rgba(0,0,0,0.04)]">
                    <div className="border-b border-black/10 px-5 py-3">
                      <h3 className="text-sm font-semibold">Past products</h3>
                    </div>
                    <div className="divide-y divide-black/10">
                      {pastProducts.slice(0, 5).map((product) => (
                        <div key={product} className="px-5 py-2.5 text-xs text-gray-700">{product}</div>
                      ))}
                      {pastProducts.length === 0 && (
                        <div className="px-5 py-5 text-xs leading-5 text-gray-500">Add past products under Traction & History.</div>
                      )}
                    </div>
                  </section>
                </aside>
              </section>
            </>
          )}
        </div>
      </motion.div>
    );
  };

  // Start a fresh new-launch wizard: reset draft, mode=wizard, step=0.
  const startNewLaunch = () => {
    setLaunchDraft(emptyLaunchDraft());
    setWizardStep(0);
    setProductsMode('wizard');
  };

  // Open the all-sections edit form for an existing launch.
  const startEditLaunch = (launch: ProductLaunch) => {
    setLaunchDraft({
      id: launch.id,
      name: launch.name,
      tagline: launch.tagline,
      intro: launch.intro ?? '',
      category: launch.category,
      stage: launch.stage,
      location: launch.location ?? '',
      launchUrl: launch.launchUrl,
      proofUrl: launch.proofUrl,
      logoUrl: launch.logoUrl ?? '',
      bannerUrl: launch.bannerUrl ?? '',
      demoVideoUrl: launch.demoVideoUrl ?? '',
      pitchVideoUrl: launch.pitchVideoUrl ?? '',
      pitchDeckUrl: launch.pitchDeckUrl ?? '',
      pitchBookNote: launch.pitchBookNote ?? '',
      pitchVisibility: launch.pitchVisibility ?? 'public',
      founderSignals: launch.founderSignals ?? [],
      teamSummary: launch.teamSummary ?? '',
      teamMembersText: (launch.teamMembers ?? []).map((m) => `${m.name} - ${m.role} - ${m.bio} - ${m.profileUrl ?? ''}`).join('\n'),
      customerSummary: launch.customerSummary ?? '',
      techStack: launch.techStack ?? '',
      fundingStatus: launch.fundingStatus ?? '',
      lookingFor: launch.lookingFor ?? '',
      metrics: launch.metrics ?? '',
    });
    setProductsMode('edit');
  };

  const exitLaunchForm = () => {
    setProductsMode('list');
    setLaunchDraft(emptyLaunchDraft());
    setWizardStep(0);
  };

  const renderProductsPage = () => {
    const liveLaunch = selectedLiveLaunch;
    const liveEngagement = liveLaunch ? getLaunchEngagement(liveLaunch) : null;
    void liveLaunch; void liveEngagement;

    return (
      <motion.div
        key="products-main"
        initial={{ opacity: 0, y: 10, filter: 'blur(2px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        exit={{ opacity: 0, y: -8, filter: 'blur(2px)' }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
      >
        <div id="products" className="mx-auto max-w-[1292px] scroll-mt-24 space-y-6">
          {/* HERO — adapts label/CTA based on mode */}
          <section className="rounded-[20px] border border-black/10 bg-white shadow-[0_10px_34px_rgba(0,0,0,0.04)]">
            <div className="flex flex-col gap-4 px-5 py-5 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-3">
                <span className={`mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${accentSurface} ${accentForeground}`}>
                  <Rocket className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="mt-1 text-2xl font-normal tracking-[-0.03em] font-serif">
                    {productsMode === 'list'
                      ? 'Your launches'
                      : productsMode === 'wizard'
                        ? `New launch — ${launchWizardSteps[wizardStep].label}`
                        : `Editing ${launchDraft.name || 'launch'}`}
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
                    {productsMode === 'list'
                      ? 'Manage products you have launched on Apparent. Edit details, replace media, or delete a launch.'
                      : productsMode === 'wizard'
                        ? launchWizardSteps[wizardStep].description
                        : 'All sections visible. Changes save when you click Save.'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                {productsMode === 'list' ? (
                  <>
                    <span className="rounded-full bg-[#f4f1eb] px-3 py-1.5 font-medium text-gray-600">
                      {productLaunches.length} live
                    </span>
                    <button
                      type="button"
                      onClick={startNewLaunch}
                      className={`inline-flex items-center gap-1.5 rounded-full ${accentSurface} px-4 py-2 text-sm font-semibold ${accentForeground} transition-opacity hover:opacity-90`}
                    >
                      <Plus className="h-4 w-4" /> New launch
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={exitLaunchForm}
                    className="inline-flex items-center gap-1.5 rounded-full border border-black/10 px-4 py-2 text-sm font-semibold hover:bg-[#f6f3f1]"
                  >
                    <ChevronLeft className="h-4 w-4" /> Back to launches
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* GRID VIEW — default landing for the Products page */}
          {productsMode === 'list' && (
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* New launch tile — first card */}
              <button
                type="button"
                onClick={startNewLaunch}
                className="flex h-full min-h-[220px] flex-col items-center justify-center gap-3 rounded-[20px] border-2 border-dashed border-black/15 bg-white p-6 text-center transition-colors hover:border-ink/40 hover:bg-[#f6f3f1]"
              >
                <span className={`flex h-12 w-12 items-center justify-center rounded-full ${accentSurface} ${accentForeground}`}>
                  <Plus className="h-6 w-6" />
                </span>
                <span className="text-sm font-semibold">Launch a new product</span>
                <span className="text-xs text-gray-500">7-step guided flow</span>
              </button>

              {productLaunches.map((launch) => {
                const engagement = getLaunchEngagement(launch);
                return (
                  <article key={launch.id} className="flex flex-col overflow-hidden rounded-[20px] border border-black/10 bg-white shadow-[0_10px_34px_rgba(0,0,0,0.04)]">
                    {/* Banner / fallback */}
                    <div className="aspect-[16/8] bg-[#fbfaf7]">
                      {launch.bannerUrl ? (
                        <img src={launch.bannerUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs font-semibold uppercase tracking-[0.12em] text-gray-300">
                          No banner
                        </div>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col gap-3 p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[12px] bg-[#fbfaf7]">
                          {launch.logoUrl ? (
                            <img src={launch.logoUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <LogoIcon className="h-5 w-5 text-black" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <p className="truncate text-base font-semibold tracking-[-0.01em]">{launch.name}</p>
                            <span className="rounded-full bg-lavender px-2 py-0.5 text-[10px] font-semibold text-black">Live</span>
                          </div>
                          <p className="mt-1 line-clamp-2 text-xs leading-5 text-gray-600">{launch.tagline}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-gray-500">
                        <span>{launch.category || 'Product'}</span>
                        <span>·</span>
                        <span>{launch.stage || 'Launched'}</span>
                        <span className="ml-auto inline-flex items-center gap-1">
                          <ChevronUp className="h-3 w-3" />
                          {engagement.upvotes}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          {engagement.comments.length}
                        </span>
                      </div>
                      <div className="mt-auto flex gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => startEditLaunch(launch)}
                          className={`flex-1 rounded-full ${accentSurface} px-3 py-2 text-xs font-semibold ${accentForeground} transition-opacity hover:opacity-90`}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteProductLaunch(launch)}
                          className="inline-flex items-center gap-1 rounded-full border border-red-200 px-3 py-2 text-xs font-semibold text-red-500 hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}

              {productLaunches.length === 0 && (
                <div className="col-span-full rounded-[20px] border border-black/10 bg-white p-10 text-center shadow-[0_10px_34px_rgba(0,0,0,0.04)]">
                  <Rocket className="mx-auto h-8 w-8 text-ink" />
                  <h3 className="mt-3 text-base font-semibold">Launch your first product</h3>
                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-600">
                    Publishing a product puts you on Builder Radar and in front of thesis-fit investors. The wizard walks you through it.
                  </p>
                  <button
                    type="button"
                    onClick={startNewLaunch}
                    className={`mt-4 inline-flex items-center gap-1.5 rounded-full ${accentSurface} px-4 py-2 text-sm font-semibold ${accentForeground}`}
                  >
                    <Plus className="h-4 w-4" /> Start launch wizard
                  </button>
                </div>
              )}
            </section>
          )}

          {/* WIZARD VIEW — progress dots + step content */}
          {productsMode === 'wizard' && (
            <section className="rounded-[20px] border border-black/10 bg-white shadow-[0_10px_34px_rgba(0,0,0,0.04)]">
              {/* Progress bar */}
              <div className="border-b border-black/10 px-5 py-4">
                <div className="flex items-center gap-2">
                  {launchWizardSteps.map((step, idx) => {
                    const isDone = idx < wizardStep;
                    const isActive = idx === wizardStep;
                    return (
                      <div key={step.key} className="flex flex-1 items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setWizardStep(idx)}
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                            isDone ? 'bg-charcoal text-white' : isActive ? `${accentSurface} ${accentForeground}` : 'bg-[#f4f1eb] text-gray-500'
                          }`}
                          title={step.label}
                        >
                          {isDone ? <Check className="h-3.5 w-3.5" /> : idx + 1}
                        </button>
                        {idx < launchWizardSteps.length - 1 && (
                          <div className={`h-px flex-1 ${idx < wizardStep ? 'bg-charcoal' : 'bg-black/10'}`} />
                        )}
                      </div>
                    );
                  })}
                </div>
                <p className="mt-3 text-xs text-gray-500">
                  Step {wizardStep + 1} of {launchWizardSteps.length} — {launchWizardSteps[wizardStep].label}
                </p>
              </div>

              {/* Step content */}
              <div className="px-5 py-5 space-y-5">
                {/* STEP 0: BASICS */}
                {wizardStep === 0 && (
                  <div className="grid gap-4">
                    <label className="grid gap-1">
                      <span className="text-sm font-medium">Product name</span>
                      <input className="h-10 rounded-lg border border-black/10 bg-white px-3 text-sm outline-none focus:border-black/30" placeholder="Product name" value={launchDraft.name} onChange={(e) => setLaunchDraft((c) => ({ ...c, name: e.target.value }))} />
                    </label>
                    <label className="grid gap-1">
                      <span className="text-sm font-medium">Tagline</span>
                      <input className="h-10 rounded-lg border border-black/10 bg-white px-3 text-sm outline-none focus:border-black/30" placeholder="One-line product pitch." value={launchDraft.tagline} onChange={(e) => setLaunchDraft((c) => ({ ...c, tagline: e.target.value }))} />
                    </label>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="grid gap-1">
                        <span className="text-sm font-medium">Category</span>
                        <input className="h-10 rounded-lg border border-black/10 bg-white px-3 text-sm outline-none focus:border-black/30" placeholder="Category" value={launchDraft.category} onChange={(e) => setLaunchDraft((c) => ({ ...c, category: e.target.value }))} />
                      </label>
                      <label className="grid gap-1">
                        <span className="text-sm font-medium">Stage</span>
                        <select className="h-10 rounded-lg border border-black/10 bg-white px-3 text-sm outline-none focus:border-black/30" value={launchDraft.stage} onChange={(e) => setLaunchDraft((c) => ({ ...c, stage: e.target.value }))}>
                          {founderStageOptions.map((s) => (<option key={s} value={s}>{s}</option>))}
                        </select>
                      </label>
                    </div>
                    <label className="grid gap-1">
                      <span className="text-sm font-medium">Location</span>
                      <input className="h-10 rounded-lg border border-black/10 bg-white px-3 text-sm outline-none focus:border-black/30" placeholder={intakeValues.location || 'San Francisco, Remote, New York'} value={launchDraft.location} onChange={(e) => setLaunchDraft((c) => ({ ...c, location: e.target.value }))} />
                    </label>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="grid gap-1">
                        <span className="text-sm font-medium">Product URL</span>
                        <input className="h-10 rounded-lg border border-black/10 bg-white px-3 text-sm outline-none focus:border-black/30" placeholder="https://yourproduct.com" value={launchDraft.launchUrl} onChange={(e) => setLaunchDraft((c) => ({ ...c, launchUrl: e.target.value }))} />
                      </label>
                      <label className="grid gap-1">
                        <span className="text-sm font-medium">Proof URL</span>
                        <input className="h-10 rounded-lg border border-black/10 bg-white px-3 text-sm outline-none focus:border-black/30" placeholder="GitHub, demo, customer story" value={launchDraft.proofUrl} onChange={(e) => setLaunchDraft((c) => ({ ...c, proofUrl: e.target.value }))} />
                      </label>
                    </div>
                  </div>
                )}

                {/* STEP 1: BRAND */}
                {wizardStep === 1 && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="cursor-pointer rounded-[14px] border border-dashed border-black/15 p-4 transition-colors hover:bg-[#f6f3f1]">
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleLaunchAssetUpload('logoUrl', e.target.files?.[0])} />
                      <div className="flex h-24 w-24 mx-auto items-center justify-center overflow-hidden rounded-xl bg-[#fbfaf7]">
                        {launchDraft.logoUrl ? <img src={launchDraft.logoUrl} alt="" className="h-full w-full object-cover" /> : <Image className="h-8 w-8 text-gray-400" />}
                      </div>
                      <p className="mt-3 text-center text-sm font-semibold">Upload logo</p>
                      <p className="mt-1 text-center text-xs text-gray-500">Square mark, 512×512+</p>
                    </label>
                    <label className="cursor-pointer rounded-[14px] border border-dashed border-black/15 p-4 transition-colors hover:bg-[#f6f3f1]">
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleLaunchAssetUpload('bannerUrl', e.target.files?.[0])} />
                      <div className="aspect-[16/8] overflow-hidden rounded-xl bg-[#fbfaf7]">
                        {launchDraft.bannerUrl ? <img src={launchDraft.bannerUrl} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center"><Image className="h-8 w-8 text-gray-400" /></div>}
                      </div>
                      <p className="mt-3 text-center text-sm font-semibold">Upload banner</p>
                      <p className="mt-1 text-center text-xs text-gray-500">Wide image, 1600×800+</p>
                    </label>
                  </div>
                )}

                {/* STEP 2: STORY */}
                {wizardStep === 2 && (
                  <div className="grid gap-4">
                    <label className="grid gap-1">
                      <span className="text-sm font-medium">Intro</span>
                      <textarea className="min-h-32 rounded-lg border border-black/10 bg-white px-3 py-2 text-sm leading-relaxed outline-none focus:border-black/30" placeholder="What did you build, who is it for, and why does it matter now?" value={launchDraft.intro} onChange={(e) => setLaunchDraft((c) => ({ ...c, intro: e.target.value }))} />
                    </label>
                    <label className="flex cursor-pointer items-center gap-3 rounded-[14px] border border-dashed border-black/15 p-4 transition-colors hover:bg-[#f6f3f1]">
                      <input type="file" accept="video/*" className="hidden" onChange={(e) => handleLaunchAssetUpload('demoVideoUrl', e.target.files?.[0])} />
                      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#fbfaf7]"><Video className="h-6 w-6 text-gray-500" /></span>
                      <div>
                        <p className="text-sm font-semibold">{launchDraft.demoVideoUrl ? 'Replace demo video' : 'Upload demo video'}</p>
                        <p className="text-xs text-gray-500">Product walkthrough, 1-2 min</p>
                      </div>
                    </label>
                  </div>
                )}

                {/* STEP 3: TEAM */}
                {wizardStep === 3 && (
                  <div className="grid gap-4">
                    <label className="grid gap-1">
                      <span className="text-sm font-medium">Team members</span>
                      <span className="text-xs text-gray-500">One per line: name - role - bio - Apparent profile URL</span>
                      <textarea className="min-h-28 rounded-lg border border-black/10 bg-white px-3 py-2 text-sm leading-relaxed outline-none focus:border-black/30" placeholder="Founder name - Role - Short bio - /profile/username" value={launchDraft.teamMembersText} onChange={(e) => setLaunchDraft((c) => ({ ...c, teamMembersText: e.target.value }))} />
                    </label>
                    <label className="grid gap-1">
                      <span className="text-sm font-medium">Team summary</span>
                      <textarea className="min-h-20 rounded-lg border border-black/10 bg-white px-3 py-2 text-sm leading-relaxed outline-none focus:border-black/30" placeholder="Who is building this, why this team, notable background." value={launchDraft.teamSummary} onChange={(e) => setLaunchDraft((c) => ({ ...c, teamSummary: e.target.value }))} />
                    </label>
                    <label className="grid gap-1">
                      <span className="text-sm font-medium">Customer summary</span>
                      <textarea className="min-h-20 rounded-lg border border-black/10 bg-white px-3 py-2 text-sm leading-relaxed outline-none focus:border-black/30" placeholder="Customer pull, usage, revenue, pilots, waitlist, or deployment context." value={launchDraft.customerSummary} onChange={(e) => setLaunchDraft((c) => ({ ...c, customerSummary: e.target.value }))} />
                    </label>
                    <label className="grid gap-1">
                      <span className="text-sm font-medium">Tech stack</span>
                      <input className="h-10 rounded-lg border border-black/10 bg-white px-3 text-sm outline-none focus:border-black/30" placeholder="React, Postgres, agents, evals, Python" value={launchDraft.techStack} onChange={(e) => setLaunchDraft((c) => ({ ...c, techStack: e.target.value }))} />
                    </label>
                  </div>
                )}

                {/* STEP 4: PITCH BOOK */}
                {wizardStep === 4 && (
                  <div className="grid gap-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="cursor-pointer rounded-[14px] border border-dashed border-black/15 p-4 transition-colors hover:bg-[#f6f3f1]">
                        <input type="file" accept="video/*" className="hidden" onChange={(e) => handleLaunchAssetUpload('pitchVideoUrl', e.target.files?.[0])} />
                        <div className="flex items-center gap-3">
                          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#fbfaf7]"><Video className="h-6 w-6 text-gray-500" /></span>
                          <div>
                            <p className="text-sm font-semibold">{launchDraft.pitchVideoUrl ? 'Replace pitch video' : '30-second pitch'}</p>
                            <p className="text-xs text-gray-500">Founder talking-head</p>
                          </div>
                        </div>
                      </label>
                      <label className="cursor-pointer rounded-[14px] border border-dashed border-black/15 p-4 transition-colors hover:bg-[#f6f3f1]">
                        <input type="file" accept=".pdf,.ppt,.pptx,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation" className="hidden" onChange={(e) => handleLaunchAssetUpload('pitchDeckUrl', e.target.files?.[0])} />
                        <div className="flex items-center gap-3">
                          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#fbfaf7]"><FileText className="h-6 w-6 text-gray-500" /></span>
                          <div>
                            <p className="text-sm font-semibold">{launchDraft.pitchDeckUrl ? 'Replace pitch deck' : 'Pitch deck'}</p>
                            <p className="text-xs text-gray-500">PDF or PPT</p>
                          </div>
                        </div>
                      </label>
                    </div>
                    <label className="grid gap-1">
                      <span className="text-sm font-medium">Investor note</span>
                      <textarea className="min-h-24 rounded-lg border border-black/10 bg-white px-3 py-2 text-sm leading-relaxed outline-none focus:border-black/30" placeholder="Why now, who is pulling, and what kind of help or capital would be useful." value={launchDraft.pitchBookNote} onChange={(e) => setLaunchDraft((c) => ({ ...c, pitchBookNote: e.target.value }))} />
                    </label>
                    <div className="grid gap-2">
                      <span className="text-sm font-medium">Pitch Book visibility</span>
                      <div className="flex flex-wrap gap-2">
                        {(['public', 'investors'] as const).map((v) => (
                          <button key={v} type="button" onClick={() => setLaunchDraft((c) => ({ ...c, pitchVisibility: v }))} className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${launchDraft.pitchVisibility === v ? `${accentSurface} ${accentForeground}` : 'bg-[#fbfaf7] text-black/60 hover:bg-[#f4f1eb]'}`}>
                            {v === 'public' ? 'Public' : 'Investors only'}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <span className="text-sm font-medium">Founder background signals</span>
                      <p className="text-xs text-gray-500">Optional, self-selected, used for investor discovery filters.</p>
                      <div className="flex flex-wrap gap-2">
                        {founderSignalOptions.map((s) => {
                          const isSelected = launchDraft.founderSignals.includes(s);
                          return (
                            <button key={s} type="button" onClick={() => toggleLaunchFounderSignal(s)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${isSelected ? `${accentSurface} border-transparent ${accentForeground}` : 'border-black/10 text-black/60 hover:bg-[#fbfaf7]'}`}>
                              {s}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 5: TRACTION */}
                {wizardStep === 5 && (
                  <div className="grid gap-4">
                    <label className="grid gap-1">
                      <span className="text-sm font-medium">Metrics & traction</span>
                      <textarea className="min-h-32 rounded-lg border border-black/10 bg-white px-3 py-2 text-sm leading-relaxed outline-none focus:border-black/30" placeholder="Customer pull, usage, revenue, pilots, stars, or other proof." value={launchDraft.metrics} onChange={(e) => setLaunchDraft((c) => ({ ...c, metrics: e.target.value }))} />
                    </label>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="grid gap-1">
                        <span className="text-sm font-medium">Funding status</span>
                        <input className="h-10 rounded-lg border border-black/10 bg-white px-3 text-sm outline-none focus:border-black/30" placeholder="Pre-seed closing" value={launchDraft.fundingStatus} onChange={(e) => setLaunchDraft((c) => ({ ...c, fundingStatus: e.target.value }))} />
                      </label>
                      <label className="grid gap-1">
                        <span className="text-sm font-medium">Looking for</span>
                        <input className="h-10 rounded-lg border border-black/10 bg-white px-3 text-sm outline-none focus:border-black/30" placeholder="Design partners in fintech" value={launchDraft.lookingFor} onChange={(e) => setLaunchDraft((c) => ({ ...c, lookingFor: e.target.value }))} />
                      </label>
                    </div>
                  </div>
                )}

                {/* STEP 6: REVIEW */}
                {wizardStep === 6 && (
                  <div className="grid gap-4">
                    <div className="rounded-[16px] border border-black/10 bg-[#fbfaf7] p-5">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Preview</p>
                      <div className="mt-3 flex items-start gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[12px] bg-white">
                          {launchDraft.logoUrl ? <img src={launchDraft.logoUrl} alt="" className="h-full w-full object-cover" /> : <LogoIcon className="h-5 w-5 text-black" />}
                        </div>
                        <div>
                          <p className="text-lg font-semibold">{launchDraft.name || 'Your product'}</p>
                          <p className="mt-1 text-sm text-gray-600">{launchDraft.tagline || 'Your tagline'}</p>
                          <p className="mt-1 text-xs text-gray-500">{launchDraft.category} · {launchDraft.stage} · {launchDraft.location}</p>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-[12px] border border-black/10 bg-[#f6f3f1] px-4 py-3 text-xs leading-5 text-gray-600">
                      Launching here makes the product eligible for the Apparent front page, investor discovery, comments, and founder profile traffic.
                    </div>
                  </div>
                )}
              </div>

              {/* Wizard nav buttons */}
              <div className="flex flex-col gap-3 border-t border-black/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={() => setWizardStep((s) => Math.max(0, s - 1))}
                  disabled={wizardStep === 0}
                  className="inline-flex items-center gap-1.5 rounded-full border border-black/10 px-4 py-2 text-sm font-semibold disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" /> Back
                </button>
                {wizardStep < launchWizardSteps.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => setWizardStep((s) => Math.min(launchWizardSteps.length - 1, s + 1))}
                    disabled={wizardStep === 0 && !launchDraft.name.trim()}
                    className={`inline-flex items-center gap-1.5 rounded-full ${accentSurface} px-5 py-2 text-sm font-semibold ${accentForeground} disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    Continue <ChevronRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={async () => {
                      await handleSaveProductLaunch();
                      setProductsMode('list');
                      setWizardStep(0);
                    }}
                    disabled={savingWorkflow === 'launch' || !launchDraft.name.trim()}
                    className={`inline-flex items-center gap-1.5 rounded-full ${accentSurface} px-5 py-2 text-sm font-semibold ${accentForeground} disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    <LogoIcon className="h-4 w-4" />
                    {savingWorkflow === 'launch' ? 'Launching…' : 'Launch on Apparent'}
                  </button>
                )}
              </div>
            </section>
          )}

          {/* EDIT MODE — existing all-sections form (retained as-is below) */}
          {productsMode === 'edit' && (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <section className="rounded-[20px] border border-black/10 bg-white shadow-[0_10px_34px_rgba(0,0,0,0.04)]">
              <div className="flex items-center justify-between border-b border-black/10 px-5 py-4">
                <div>
                  <h3 className="text-sm font-semibold">Launch details</h3>
                  <p className="mt-1 text-xs text-gray-500">This is the public submission investors and founders will browse.</p>
                </div>
                <button
                  type="button"
                  className="rounded-full border border-black/10 px-3 py-1.5 text-xs font-semibold hover:bg-[#f6f3f1]"
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
                    placeholder="Product name"
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
                    placeholder="One-line product pitch."
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
                      placeholder="Category"
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
                      placeholder="Founder name - Role - Short bio - /profile/username"
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
                    placeholder="Customer pull, usage, revenue, pilots, stars, or other proof."
                    value={launchDraft.metrics}
                    onChange={(event) => setLaunchDraft((current) => ({ ...current, metrics: event.target.value }))}
                  />
                </label>
              </div>

              <div className="flex flex-col gap-3 border-t border-black/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs leading-5 text-gray-500">
                  All sections visible. Changes save when you click below.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={exitLaunchForm}
                    className="rounded-full border border-black/10 px-4 py-2 text-sm font-semibold hover:bg-[#f6f3f1]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className={`inline-flex items-center justify-center gap-2 rounded-full ${accentSurface} px-5 py-2.5 text-sm font-semibold ${accentForeground} transition-colors hover:bg-[#bfcef2] disabled:cursor-not-allowed disabled:opacity-60`}
                    onClick={async () => {
                      await handleSaveProductLaunch();
                      setProductsMode('list');
                    }}
                    disabled={savingWorkflow === 'launch'}
                  >
                    <Check className="h-4 w-4" />
                    {savingWorkflow === 'launch' ? 'Saving…' : 'Save changes'}
                  </button>
                </div>
              </div>
            </section>

            <aside className="space-y-6">
              <section className="rounded-[20px] border border-black/10 bg-white shadow-[0_10px_34px_rgba(0,0,0,0.04)]">
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
                        <span className="rounded-full bg-lavender px-2.5 py-0.5 text-xs font-semibold text-black">
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
                          className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#37d28b]"
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
                      <ChevronUp className="h-4 w-4 text-[#37d28b]" />
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

              <section className="rounded-[20px] border border-black/10 bg-white shadow-[0_10px_34px_rgba(0,0,0,0.04)]">
                <div className="border-b border-black/10 px-5 py-4">
                  <h3 className="text-sm font-semibold">Launch readiness</h3>
                </div>
                <div className="divide-y divide-black/10">
                  {launchChecklist.map((item) => (
                    <div key={item.label} className="flex items-center justify-between px-5 py-3 text-sm">
                      <span className={item.done ? 'text-black' : 'text-gray-500'}>{item.label}</span>
                      <span className={`h-2.5 w-2.5 rounded-full ${item.done ? 'bg-lavender' : 'bg-black/15'}`} />
                    </div>
                  ))}
                </div>
              </section>
            </aside>
          </div>
          )} {/* end productsMode === 'edit' wrapper */}

          {/* Live launches list — kept available in list mode for inline engagement
              (upvotes, comments). The card grid above is for browsing/managing;
              this section is the social-engagement surface. */}
          {productsMode === 'list' && productLaunches.length > 0 && (
          <section className="rounded-[20px] border border-black/10 bg-white shadow-[0_10px_34px_rgba(0,0,0,0.04)]">
            <div className="flex flex-col gap-2 border-b border-black/10 px-5 py-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-sm font-semibold">Engagement</h3>
                <p className="mt-1 text-xs text-gray-500">Upvotes and comments on your live launches.</p>
              </div>
              {liveLaunch && (
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#37d28b]"
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
                              <span className="rounded-full bg-lavender px-2.5 py-0.5 text-xs font-semibold text-black">Live</span>
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
                              engagement.upvoted ? 'bg-lavender text-black' : 'bg-[#f4f1eb] text-black/70 hover:bg-[#ebe5da]'
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
                          <button
                            type="button"
                            className="inline-flex items-center gap-1.5 rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-500 transition-colors hover:bg-red-50"
                            onClick={() => handleDeleteProductLaunch(launch)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
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

            </div>
          </section>
          )} {/* end productsMode === 'list' engagement wrapper */}

          {productsMode === 'list' && liveLaunch && liveEngagement && (
            <section className="overflow-hidden rounded-[20px] border border-black/10 bg-white shadow-[0_10px_34px_rgba(0,0,0,0.04)]">
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
                      className="inline-flex items-center gap-1.5 rounded-full bg-lavender px-4 py-2 text-sm font-semibold text-black"
                      href={liveLaunch.launchUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open product <ArrowUpRight className="h-4 w-4" />
                    </a>
                  )}
                  {liveLaunch.proofUrl && (
                    <a
                      className="inline-flex items-center gap-1.5 rounded-full border border-black/10 px-4 py-2 text-sm font-semibold hover:bg-[#f6f3f1]"
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
                        className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-[#37d28b]"
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
    <section id="launches" className="scroll-mt-24 rounded-[20px] border border-black/10 bg-white shadow-[0_10px_34px_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-between border-b border-black/10 px-5 py-3">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-500" />
          <h3 className="text-sm font-semibold">Recent product launches</h3>
        </div>
        <button
          className="rounded-xl border border-black/10 p-1.5 hover:bg-[#f6f3f1]"
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
                {launch.launchUrl && <a className="rounded-full border border-black/10 px-3 py-1.5 text-xs font-medium hover:bg-[#f6f3f1]" href={launch.launchUrl}>Launch</a>}
                {launch.proofUrl && <a className="rounded-full border border-black/10 px-3 py-1.5 text-xs font-medium hover:bg-[#f6f3f1]" href={launch.proofUrl}>Proof</a>}
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
    <section id="meetups" className="scroll-mt-24 rounded-[20px] border border-black/10 bg-white shadow-[0_10px_34px_rgba(0,0,0,0.04)] py-4">
      <div className="flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-500" />
          <h3 className="text-sm font-semibold">Meetups</h3>
        </div>
        <button className="rounded-xl border border-black/10 p-1.5 hover:bg-[#f6f3f1]" onClick={() => setIsMeetupFormOpen((current) => !current)} aria-label="Create meetup">
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
              <button className="shrink-0 rounded-full border border-black/10 px-3 py-1.5 text-xs font-medium hover:bg-[#f6f3f1]" onClick={() => handleToggleMeetupRsvp(meetup)}>
                {meetup.isJoined ? 'Joined' : 'RSVP'}
              </button>
            </div>
            <p className="mt-2 text-xs text-gray-400">{meetup.attendeeCount}/{meetup.capacity} attending</p>
          </article>
        ))}
      </div>
    </section>
  );

  const renderOnboardingChecklist = () => {
    if (onboardingDismissed) return null;

    const steps = isInvestor
      ? [
          {
            label: 'Set your investment thesis',
            hint: 'Sectors, stage, and what you back — this ranks every founder you see.',
            done: Boolean((intakeValues.thesis ?? '').trim() || (intakeValues.sectors ?? '').trim()),
            cta: 'Set thesis',
            onClick: () => setActiveView('profile'),
          },
          {
            label: 'Find founders who are raising now',
            hint: 'Open Builder Discovery and hit “Raising now” to see contactable, thesis-fit founders.',
            done: builderDiscoveryStates.some((state) => state.saved),
            cta: 'Open Builder Discovery',
            onClick: () => handleDashboardViewChange('matches'),
          },
          {
            label: 'Move one into your deal flow',
            hint: 'Save a founder, draft outreach, and track them from discovery to meeting.',
            done: builderDiscoveryStates.some((state) => Boolean(state.stage)) || messages.length > 0,
            cta: 'View deal flow',
            onClick: () => setActiveView('deals'),
          },
        ]
      : [
          {
            label: 'Complete your founder profile',
            hint: 'Name, headline, and bio — this is what investors see first.',
            done: Boolean((intakeValues.profileName ?? '').trim() && (intakeValues.headline ?? '').trim() && (intakeValues.bio ?? '').trim()),
            cta: 'Edit profile',
            onClick: () => setActiveView('profile'),
          },
          {
            label: 'Set your fundraising status',
            hint: '“Raising now” is what surfaces you to thesis-fit investors.',
            done: intakeValues.fundraisingStatus === 'raising' || intakeValues.fundraisingStatus === 'open',
            cta: 'Set status',
            onClick: () => setActiveView('profile'),
          },
          {
            label: 'Launch your first product',
            hint: 'Add proof and traction so investors can evaluate you fast.',
            done: productLaunches.length > 0,
            cta: 'Launch product',
            onClick: () => setActiveView('products'),
          },
        ];

    const doneCount = steps.filter((step) => step.done).length;
    if (doneCount === steps.length) return null; // fully activated — get out of the way

    return (
      <div className="mx-auto mb-8 max-w-[1292px]">
      <section className="rounded-[20px] border border-black/10 bg-white shadow-[0_10px_34px_rgba(0,0,0,0.04)]">
        <div className="flex items-start justify-between gap-3 px-5 py-4">
          <div>
            <h3 className="text-sm font-semibold">{isInvestor ? 'Get started sourcing' : 'Get discovered on Apparent'}</h3>
            <p className="mt-1 text-xs text-gray-500">
              {doneCount} of {steps.length} done · finish these to {isInvestor ? 'see contactable, thesis-fit founders' : 'get in front of thesis-fit investors'}.
            </p>
          </div>
          <button
            onClick={dismissOnboarding}
            className="shrink-0 rounded-full p-1.5 text-gray-400 transition-colors hover:bg-[#f6f3f1] hover:text-black"
            aria-label="Dismiss getting-started checklist"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-5">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#f4f1eb]">
            <div className="h-full rounded-full bg-charcoal transition-all" style={{ width: `${(doneCount / steps.length) * 100}%` }} />
          </div>
        </div>
        <div className="mt-3 divide-y divide-black/10">
          {steps.map((step, index) => (
            <div key={step.label} className="flex items-center gap-3 px-5 py-3">
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                  step.done ? 'bg-charcoal text-white' : 'border border-black/15 text-gray-400'
                }`}
              >
                {step.done ? <Check className="h-3.5 w-3.5" /> : index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-medium ${step.done ? 'text-gray-400 line-through' : ''}`}>{step.label}</p>
                {!step.done && <p className="mt-0.5 text-xs leading-relaxed text-gray-500">{step.hint}</p>}
              </div>
              {!step.done && (
                <button
                  onClick={step.onClick}
                  className="shrink-0 rounded-full bg-charcoal px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
                >
                  {step.cta}
                </button>
              )}
            </div>
          ))}
        </div>
        {!isInvestor && (
          <div className="px-5 py-3">
            <button
              onClick={() => setActiveView('vc-heatmap')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-ink hover:underline"
            >
              Explore 1,800 thesis-fit VCs on the Heat Map <ArrowUpRight className="h-3 w-3" />
            </button>
          </div>
        )}
      </section>
      </div>
    );
  };

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
    <section id="map" className="scroll-mt-24 rounded-[20px] border border-black/10 bg-white shadow-[0_10px_34px_rgba(0,0,0,0.04)] py-4">
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
                      index === activePlaceSuggestionIndex ? 'bg-[#f6f3f1]' : 'hover:bg-[#f6f3f1]'
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
                : 'border-black/10 text-gray-600 hover:bg-[#f6f3f1]'
            }`}
            onClick={() => setNetworkFilters((current) => ({ ...current, matchOnly: !current.matchOnly }))}
          >
            Match only
          </button>
          <button
            type="button"
            className={`h-9 flex-1 whitespace-nowrap rounded-full border px-3 text-xs font-medium transition-colors sm:flex-none ${
              networkFilters.raisingOnly
                ? 'border-transparent bg-charcoal text-white'
                : 'border-black/10 text-gray-600 hover:bg-[#f6f3f1]'
            }`}
            onClick={() => setNetworkFilters((current) => ({ ...current, raisingOnly: !current.raisingOnly }))}
            title="Show only real Apparent founders who declared they're raising"
          >
            Raising now
          </button>
          {isInvestor && (
            <>
              <select
                value={networkFilters.raisingAmountMin ?? ''}
                onChange={(event) => setNetworkFilters((current) => ({ ...current, raisingAmountMin: event.target.value }))}
                className="h-9 flex-1 whitespace-nowrap rounded-full border border-black/10 bg-white px-3 text-xs font-medium text-gray-600 outline-none transition-colors hover:bg-[#f6f3f1] sm:flex-none"
                title="Filter founders by minimum round size"
              >
                <option value="">Any round size</option>
                <option value="$250K">≥ $250K</option>
                <option value="$500K">≥ $500K</option>
                <option value="$1M">≥ $1M</option>
                <option value="$2M">≥ $2M</option>
                <option value="$5M">≥ $5M</option>
              </select>
              <select
                value={String(networkFilters.minCompleteness ?? 40)}
                onChange={(event) => setNetworkFilters((current) => ({ ...current, minCompleteness: Number(event.target.value) || 0 }))}
                className="h-9 flex-1 whitespace-nowrap rounded-full border border-black/10 bg-white px-3 text-xs font-medium text-gray-600 outline-none transition-colors hover:bg-[#f6f3f1] sm:flex-none"
                title="Hide founders whose profiles fall below this completeness score"
              >
                <option value="0">All profiles</option>
                <option value="40">40%+ complete</option>
                <option value="60">60%+ complete</option>
                <option value="80">80%+ complete</option>
              </select>
            </>
          )}
          <button
            type="button"
            className="h-9 flex-1 whitespace-nowrap rounded-full border border-black/10 px-3 text-xs font-medium text-gray-600 hover:bg-[#f6f3f1] sm:flex-none"
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
        <div className="mx-4 mt-3 flex flex-col gap-2 border-y border-black/10 bg-[#f6f3f1] px-4 py-3 text-xs text-gray-600 sm:flex-row sm:items-center sm:justify-between">
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
        className="mx-4 mt-4 h-96 rounded-xl"
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
            <div className="max-h-[30rem] overflow-y-auto divide-y divide-black/10 border-y border-black/10">
              {selectedClusterBuilders.map((builder) => {
                const state = getBuilderState(builder);
                return (
                  <button
                    key={builder.id}
                    className={`w-full px-4 py-3 text-left transition-colors hover:bg-[#f6f3f1] ${
                      selectedBuilder.id === builder.id ? 'bg-[#f6f3f1]' : ''
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
                          {(builder.fundraisingStatus === 'raising' || builder.fundraisingStatus === 'open') && (
                            <span className="rounded-full bg-charcoal px-2 py-0.5 text-xs font-semibold text-white">
                              {builder.fundraisingStatus === 'raising' ? `Raising${builder.raisingRound ? ` · ${builder.raisingRound}` : ''}` : 'Open to intros'}
                            </span>
                          )}
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
                    {selectedBuilder.isCurrentUser ? 'Your builder node' : 'Builder on Apparent'}
                  </p>
                  <h4 className="mt-1 text-base font-semibold">{selectedBuilder.company}</h4>
                  <p className="mt-1 text-xs text-gray-500">{selectedBuilder.founderName} | {selectedBuilder.location}</p>
                  {(selectedBuilder.fundraisingStatus === 'raising' || selectedBuilder.fundraisingStatus === 'open') && (
                    <p className="mt-2 inline-flex items-center gap-1 rounded-lg bg-charcoal px-2.5 py-1.5 text-[11px] font-semibold leading-relaxed text-white">
                      {selectedBuilder.fundraisingStatus === 'raising'
                        ? `Raising${selectedBuilder.raisingRound ? ` ${selectedBuilder.raisingRound}` : ''}${selectedBuilder.raisingAmount ? ` · ${selectedBuilder.raisingAmount}` : ''}`
                        : 'Open to investor intros'}
                      {selectedBuilder.openToContact ? ' · open to contact' : ''}
                    </p>
                  )}
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
                    className="rounded-full border border-black/10 px-3 py-1.5 text-xs font-medium hover:bg-[#f6f3f1]"
                    onClick={() => addActivity(`Opened ${link.label}: ${selectedBuilder.company}`)}
                  >
                    {link.label}
                  </a>
                ))}
                <a
                  href={selectedBuilder.profileUrl}
                  className="rounded-full border border-black/10 px-3 py-1.5 text-xs font-medium hover:bg-[#f6f3f1]"
                  onClick={() => addActivity(`Opened profile: ${selectedBuilder.company}`)}
                >
                  Profile
                </a>
              </div>

              {isInvestor && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <button className="rounded-full border border-black/10 px-3 py-1.5 text-xs font-medium hover:bg-[#f6f3f1]" onClick={() => handleSaveBuilder(selectedBuilder)}>
                    {selectedState?.saved ? 'Saved' : 'Save builder'}
                  </button>
                  <button className={`rounded-full ${accentSurface} px-3 py-1.5 text-xs font-medium ${accentForeground}`} onClick={() => handleAddBuilderToDealFlow(selectedBuilder)}>
                    Add to deal-flow
                  </button>
                  <button
                    className="rounded-full border border-black/10 px-3 py-1.5 text-xs font-medium hover:bg-[#f6f3f1] disabled:opacity-50"
                    disabled={savingWorkflow === 'message'}
                    onClick={() => handleMessageBuilder(selectedBuilder)}
                  >
                    {savingWorkflow === 'message' ? 'Sending…' : 'Send DM'}
                  </button>
                  <button className="rounded-full border border-black/10 px-3 py-1.5 text-xs font-medium hover:bg-[#f6f3f1]" onClick={() => handleHideBuilder(selectedBuilder)}>
                    Hide
                  </button>
                </div>
              )}

              {!isInvestor && !selectedBuilder.isCurrentUser && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <button className="rounded-full border border-black/10 px-3 py-1.5 text-xs font-medium hover:bg-[#f6f3f1]" onClick={() => handleSaveBuilder(selectedBuilder)}>
                    {selectedState?.saved ? 'Saved peer' : 'Save peer'}
                  </button>
                  <button className={`rounded-full ${accentSurface} px-3 py-1.5 text-xs font-medium ${accentForeground}`} onClick={() => handleMessageBuilder(selectedBuilder)}>
                    Message builder
                  </button>
                  <button
                    className="rounded-full border border-black/10 px-3 py-1.5 text-xs font-medium hover:bg-[#f6f3f1]"
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

  // ── Founder cold-outreach kanban ─────────────────────────────────────────
  const OUTREACH_STAGES: VcOutreachStage[] = ['Drafted', 'Sent', 'Replied', 'Meeting', 'Passed'];

  const outreachByStage = useMemo(() => {
    const grouped: Record<VcOutreachStage, VcOutreachEntry[]> = {
      Drafted: [],
      Sent: [],
      Replied: [],
      Meeting: [],
      Passed: [],
    };
    outreachEntries.forEach((entry) => grouped[entry.stage].push(entry));
    // Within a column, fresher activity floats to the top.
    (Object.keys(grouped) as VcOutreachStage[]).forEach((stage) => {
      grouped[stage].sort((a, b) => (b.updatedAt > a.updatedAt ? 1 : -1));
    });
    return grouped;
  }, [outreachEntries]);

  const moveOutreachStage = async (entry: VcOutreachEntry, stage: VcOutreachStage) => {
    // Optimistic update — revert if persist fails.
    const prev = entry.stage;
    setOutreachEntries((current) =>
      current.map((row) => (row.vcContactKey === entry.vcContactKey ? { ...row, stage } : row)),
    );
    try {
      const updated = await setVcOutreachStage(user, entry.vcContactKey, stage);
      if (updated) {
        setOutreachEntries((current) =>
          current.map((row) => (row.vcContactKey === updated.vcContactKey ? updated : row)),
        );
      }
    } catch {
      setOutreachEntries((current) =>
        current.map((row) => (row.vcContactKey === entry.vcContactKey ? { ...row, stage: prev } : row)),
      );
      setDashboardError('Could not update outreach stage.');
    }
  };

  const removeOutreach = async (entry: VcOutreachEntry) => {
    setOutreachEntries((current) => current.filter((row) => row.vcContactKey !== entry.vcContactKey));
    try {
      await deleteVcOutreach(user, entry.vcContactKey);
    } catch {
      /* keep UI in sync with optimistic removal even if DB call fails */
    }
  };

  const daysAgo = (iso: string): number | null => {
    if (!iso) return null;
    const ms = Date.now() - new Date(iso).getTime();
    if (Number.isNaN(ms) || ms < 0) return null;
    return Math.floor(ms / (1000 * 60 * 60 * 24));
  };

  const renderFounderOutreachKanban = () => (
    <motion.div
      key="outreach-main"
      initial={{ opacity: 0, y: 10, filter: 'blur(2px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      exit={{ opacity: 0, y: -8, filter: 'blur(2px)' }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
    >
      <div id="outreach" className="mx-auto max-w-[1292px] scroll-mt-24 space-y-6">
        <section className="rounded-[20px] border border-black/10 bg-white shadow-[0_10px_34px_rgba(0,0,0,0.04)] px-5 py-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="font-serif text-2xl font-normal tracking-[-0.03em]">Cold Outreach</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
                Every VC you compose to from the heat map lands here. Move them across the board as the conversation moves: Drafted → Sent → Replied → Meeting → Passed.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-gray-500">
              <span className="rounded-full bg-[#f4f1eb] px-3 py-1.5">{outreachEntries.length} total</span>
              <span className="rounded-full bg-lavender px-3 py-1.5 text-black">
                {outreachByStage.Sent.length + outreachByStage.Replied.length + outreachByStage.Meeting.length} active
              </span>
            </div>
          </div>
        </section>

        {outreachEntries.length === 0 ? (
          <section className="rounded-[20px] border border-black/10 bg-white p-10 text-center shadow-[0_10px_34px_rgba(0,0,0,0.04)]">
            <Send className="mx-auto h-8 w-8 text-black/25" />
            <h3 className="mt-4 text-xl font-semibold tracking-[-0.02em]">No outreach yet</h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-black/55">
              Open the VC heat map, click a VC with a public partner email, and use the Compose button. Every send shows up here as a kanban card.
            </p>
            <button
              type="button"
              onClick={() => {
                setActiveView('vc-heatmap');
                navigate(`${dashboardBasePath}/vc-heatmap`);
              }}
              className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white hover:bg-black/85"
            >
              Open VC heatmap <ArrowUpRight className="h-4 w-4" />
            </button>
          </section>
        ) : (
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {OUTREACH_STAGES.map((stage) => {
              const rows = outreachByStage[stage];
              return (
                <div key={stage} className="rounded-[16px] border border-black/10 bg-white p-3 shadow-[0_6px_20px_rgba(0,0,0,0.03)]">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-black/55">{stage}</p>
                    <span className="rounded-full bg-[#fbfaf7] px-2 py-0.5 text-[11px] font-semibold text-black/55">
                      {rows.length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {rows.map((entry) => {
                      const updated = daysAgo(entry.updatedAt);
                      const sent = daysAgo(entry.sentAt);
                      return (
                        <article
                          key={entry.id || entry.vcContactKey}
                          className="rounded-[12px] border border-black/10 bg-[#fbfaf7] p-3 transition-colors hover:bg-white"
                        >
                          <p className="truncate text-sm font-semibold text-black">
                            {entry.investorName || entry.toEmail}
                          </p>
                          {entry.partnerName && (
                            <p className="mt-0.5 truncate text-xs text-black/55">{entry.partnerName}</p>
                          )}
                          <p className="mt-1 truncate font-mono text-[11px] text-black/45">{entry.toEmail}</p>
                          {entry.subject && (
                            <p className="mt-2 line-clamp-2 text-xs leading-5 text-black/65">{entry.subject}</p>
                          )}
                          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-black/45">
                            {sent !== null && <span>Sent {sent === 0 ? 'today' : `${sent}d ago`}</span>}
                            {updated !== null && sent === null && (
                              <span>Updated {updated === 0 ? 'today' : `${updated}d ago`}</span>
                            )}
                          </div>
                          <div className="mt-3 flex flex-wrap items-center gap-1.5">
                            <select
                              value={entry.stage}
                              onChange={(event) => void moveOutreachStage(entry, event.target.value as VcOutreachStage)}
                              className="rounded-full border border-black/10 bg-white px-2 py-1 text-[11px] font-semibold text-black/70 outline-none focus:border-ink"
                              aria-label={`Move outreach for ${entry.investorName || entry.toEmail}`}
                            >
                              {OUTREACH_STAGES.map((option) => (
                                <option key={option} value={option}>{option}</option>
                              ))}
                            </select>
                            <a
                              href={`mailto:${entry.toEmail}?subject=${encodeURIComponent(entry.subject || '')}&body=${encodeURIComponent(entry.body || '')}`}
                              className="inline-flex items-center gap-1 rounded-full border border-black/10 bg-white px-2 py-1 text-[11px] font-semibold text-black/70 transition-colors hover:bg-[#fbfaf7]"
                              title="Resend or follow up"
                            >
                              Resend
                            </a>
                            <button
                              type="button"
                              onClick={() => void removeOutreach(entry)}
                              className="ml-auto rounded-full border border-black/10 bg-white p-1 text-black/40 transition-colors hover:bg-red-50 hover:text-red-600"
                              aria-label={`Remove ${entry.investorName || entry.toEmail}`}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        </article>
                      );
                    })}
                    {rows.length === 0 && (
                      <p className="rounded-[10px] bg-[#fbfaf7] px-3 py-4 text-center text-[11px] text-black/35">
                        Empty
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </section>
        )}
      </div>
    </motion.div>
  );

  const renderInvestorDealFlowSection = () => (
    <section id="deals" className="scroll-mt-24 rounded-[20px] border border-black/10 bg-white shadow-[0_10px_34px_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-between border-b border-black/10 px-5 py-3">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-gray-500" />
          <h3 className="text-sm font-semibold">Deal-flow Kanban</h3>
        </div>
        <span className="text-xs text-gray-500">{signalRows.length} active companies</span>
      </div>
      {investorPipeline.every((column) => column.items.length === 0) ? (
        <EmptyState
          icon={<FileText className="h-5 w-5" />}
          title="Your deal flow is empty"
          body="Save founders from Builder Discovery — try the “Raising now” filter to find contactable, thesis-fit founders — then drag them across these stages from discovery to meeting."
          ctaLabel="Open Builder Discovery"
          onCta={() => {
            handleDashboardViewChange('matches');
          }}
        />
      ) : (
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
            <div className="min-h-44 max-h-[26rem] space-y-3 overflow-y-auto p-3">
              {column.items.map((signal) => (
                <div
                  key={signalStorageId(signal)}
                  draggable
                  onDragStart={(event) => handleInvestorSignalDragStart(event, signalStorageId(signal))}
                  onDragEnd={clearInvestorSignalDrag}
                  className={`rounded-xl border border-black/10 bg-white p-3 shadow-sm shadow-black/[0.03] transition-all ${
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
                    className="mt-3 flex w-full cursor-grab items-center justify-center rounded-xl border border-dashed border-black/10 py-1.5 text-[11px] font-medium uppercase tracking-wide text-gray-400 hover:border-black/20 hover:text-black active:cursor-grabbing"
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
      )}
    </section>
  );

  const renderInvestorOverviewPage = () => {
    const visibleBuilders = filteredBuilderNodes.filter((builder) => !getBuilderState(builder).hidden);
    const topBuilders = visibleBuilders.slice(0, 5);
    const raisingBuilders = visibleBuilders
      .filter((builder) => builder.fundraisingStatus === 'raising' || builder.fundraisingStatus === 'open' || builder.openToContact)
      .slice(0, 4);
    const freshBuilders = visibleBuilders
      .filter((builder) => /min ago|h ago|today/i.test(builder.latestActivityLabel))
      .slice(0, 4);
    const urgentBuilders = [...raisingBuilders, ...freshBuilders]
      .filter((builder, index, list) => list.findIndex((item) => item.id === builder.id) === index)
      .slice(0, 4);
    const dailyLaunches = dailyDigest.slice(0, 3);
    const savedBuilderCount = builderDiscoveryStates.filter((state) => state.saved && !state.hidden).length;
    const activePipelineCount = investorPipeline.reduce((sum, column) => sum + column.items.length, 0);
    const reviewingCount = investorPipeline.find((column) => column.stage === 'Reviewing')?.items.length ?? 0;
    const meetingCount = investorPipeline.find((column) => column.stage === 'Meeting')?.items.length ?? 0;
    const thesisFields = [
      { label: 'Thesis', done: Boolean((intakeValues.thesis ?? '').trim()) },
      { label: 'Sectors', done: Boolean((intakeValues.sectors ?? '').trim()) },
      { label: 'Stage', done: Boolean((intakeValues.stage ?? '').trim()) },
      { label: 'Geography', done: Boolean((intakeValues.geography ?? '').trim()) },
      { label: 'Founder taste', done: Boolean((intakeValues.founderSignals ?? '').trim()) },
    ];
    const thesisCompleteness = Math.round((thesisFields.filter((field) => field.done).length / thesisFields.length) * 100);
    const actionRows = [
      {
        label: 'Review top matches',
        detail: `${topBuilders.length} builders ranked by fit and freshness`,
        cta: 'Open Builder Discovery',
        onClick: () => handleDashboardViewChange('matches'),
      },
      {
        label: 'Work the review queue',
        detail: `${reviewingCount} companies waiting for a decision`,
        cta: 'Open Deal Flow',
        onClick: () => handleDashboardViewChange('deals'),
      },
      {
        label: thesisCompleteness < 100 ? 'Tighten ranking inputs' : 'Tune thesis weights',
        detail: `${thesisCompleteness}% thesis profile complete`,
        cta: 'Open Thesis',
        onClick: () => handleDashboardViewChange('profile'),
      },
    ];

    return (
      <motion.div
        key="investor-overview-main"
        initial={{ opacity: 0, y: 10, filter: 'blur(2px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        exit={{ opacity: 0, y: -8, filter: 'blur(2px)' }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
      >
        {renderOnboardingChecklist()}
        <div id="overview" className="mx-auto max-w-[1292px] scroll-mt-24 space-y-6">
          <section className="overflow-hidden rounded-[20px] border border-black/10 bg-white shadow-[0_10px_34px_rgba(0,0,0,0.04)]">
            <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_360px]">
              <div className="px-5 py-5 sm:px-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-lavender px-3 py-1.5 text-xs font-semibold text-ink">
                      <Target className="h-3.5 w-3.5" />
                      Morning sourcing desk
                    </div>
                    <h2 className="mt-4 max-w-3xl text-3xl font-normal leading-tight tracking-[-0.035em] font-serif md:text-5xl">
                      The builders most worth your attention today.
                    </h2>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-black/55">
                      Ranked against your thesis, proof signals, freshness, stage, and founder intent so the first decision is what to review next.
                    </p>
                  </div>
                  <div className="grid min-w-[220px] grid-cols-2 gap-2 text-sm">
                    {[
                      ['Top matches', visibleBuilders.length],
                      ['Avg fit', `${averageSignalScore || Math.round(topBuilders.reduce((sum, builder) => sum + builder.fitScore, 0) / Math.max(1, topBuilders.length))}%`],
                      ['Saved', savedBuilderCount],
                      ['In pipeline', activePipelineCount],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-[14px] border border-black/10 bg-[#fbfaf7] px-3 py-3">
                        <p className="text-xl font-semibold tracking-[-0.02em]">{value}</p>
                        <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-black/40">{label}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 divide-y divide-black/10 border-y border-black/10">
                  {topBuilders.map((builder, index) => {
                    const state = getBuilderState(builder);
                    const reasons = builder.matchReasons.length
                      ? builder.matchReasons.slice(0, 3)
                      : [builder.category, builder.stage, builder.latestActivityLabel].filter(Boolean);

                    return (
                      <article key={builder.id} className="grid gap-4 py-4 lg:grid-cols-[minmax(0,1fr)_220px]">
                        <button
                          type="button"
                          className="min-w-0 text-left"
                          onClick={() => {
                            setSelectedBuilderId(builder.id);
                            setSelectedClusterCity(builder.location);
                            handleDashboardViewChange('matches');
                          }}
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-[#f4f1eb] text-xs font-semibold text-ink">
                              {String(index + 1).padStart(2, '0')}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-semibold">{builder.company}</p>
                                <span className="text-xs text-black/40">by {builder.founderName}</span>
                                <span className="rounded-full bg-lavender px-2 py-0.5 text-xs font-semibold text-ink">
                                  {builder.fitScore}% fit
                                </span>
                                {(builder.fundraisingStatus === 'raising' || builder.fundraisingStatus === 'open') && (
                                  <span className="rounded-full border border-ink/20 px-2 py-0.5 text-xs font-medium text-ink">
                                    {builder.fundraisingStatus === 'raising' ? 'Raising now' : 'Open to intros'}
                                  </span>
                                )}
                              </div>
                              <p className="mt-2 line-clamp-2 text-sm leading-6 text-black/60">{builder.buildSummary || builder.traction}</p>
                              <div className="mt-3 flex flex-wrap gap-1.5">
                                {reasons.map((reason) => (
                                  <span key={reason} className="rounded-full bg-[#fbfaf7] px-2.5 py-1 text-[11px] font-medium text-black/55">
                                    {reason}
                                  </span>
                                ))}
                              </div>
                              <div className="mt-3 flex flex-wrap gap-2 text-xs text-black/40">
                                <span>{builder.stage}</span>
                                <span>{builder.location}</span>
                                <span>{builder.latestActivityLabel}</span>
                                {builder.tractionValue && <span>{builder.tractionValue}</span>}
                              </div>
                            </div>
                          </div>
                        </button>
                        <div className="flex flex-wrap items-start gap-2 lg:justify-end">
                          <button
                            type="button"
                            className="rounded-full border border-black/10 px-3 py-1.5 text-xs font-medium hover:bg-[#f6f3f1]"
                            onClick={() => void handleSaveBuilder(builder)}
                          >
                            {state.saved ? 'Saved' : 'Save'}
                          </button>
                          <button
                            type="button"
                            className="rounded-full border border-black/10 px-3 py-1.5 text-xs font-medium hover:bg-[#f6f3f1]"
                            onClick={() => void handleAddBuilderToDealFlow(builder)}
                          >
                            Add to flow
                          </button>
                          <button
                            type="button"
                            className="rounded-full bg-charcoal px-3 py-1.5 text-xs font-semibold text-white hover:bg-ink"
                            onClick={() => void handleMessageBuilder(builder)}
                          >
                            Draft outreach
                          </button>
                        </div>
                      </article>
                    );
                  })}
                  {topBuilders.length === 0 && (
                    <EmptyState
                      icon={<Search className="h-5 w-5" />}
                      title="No ranked builders yet"
                      body="Set your thesis, stage, and sectors so Apparent can rank real founders and public proof against your mandate."
                      ctaLabel="Set your thesis"
                      onCta={() => handleDashboardViewChange('profile')}
                    />
                  )}
                </div>
              </div>

              <aside className="border-t border-black/10 bg-[#fbfaf7] px-5 py-5 xl:border-l xl:border-t-0">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-black/40">Thesis health</p>
                    <p className="mt-2 text-3xl font-semibold tracking-[-0.03em]">{thesisCompleteness}%</p>
                  </div>
                  <button
                    type="button"
                    className="rounded-full border border-black/10 bg-white px-3 py-2 text-xs font-semibold hover:bg-[#f6f3f1]"
                    onClick={() => handleDashboardViewChange('profile')}
                  >
                    Tune
                  </button>
                </div>
                <div className="mt-4 space-y-2">
                  {thesisFields.map((field) => (
                    <div key={field.label} className="flex items-center justify-between rounded-[12px] bg-white px-3 py-2 text-sm">
                      <span className="text-black/65">{field.label}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${field.done ? 'bg-lavender text-ink' : 'bg-[#f4f1eb] text-black/40'}`}>
                        {field.done ? 'Set' : 'Missing'}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-5 rounded-[16px] border border-black/10 bg-white p-4">
                  <p className="text-sm font-semibold">What changed</p>
                  <div className="mt-3 space-y-3">
                    {(urgentBuilders.length ? urgentBuilders : topBuilders.slice(0, 3)).map((builder) => (
                      <button
                        key={builder.id}
                        type="button"
                        className="block w-full text-left"
                        onClick={() => {
                          setSelectedBuilderId(builder.id);
                          handleDashboardViewChange('matches');
                        }}
                      >
                        <p className="text-xs font-semibold text-black/75">{builder.company}</p>
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-black/45">
                          {builder.fundraisingStatus === 'raising'
                            ? `Raising ${builder.raisingAmount || builder.raisingRound || 'now'}`
                            : builder.latestActivityLabel}
                          {' - '}
                          {builder.matchReasons[0] || builder.category}
                        </p>
                      </button>
                    ))}
                    {topBuilders.length === 0 && <p className="text-xs leading-5 text-black/45">Fresh founder activity will appear here after ranking has enough thesis context.</p>}
                  </div>
                </div>
              </aside>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="grid gap-6 lg:grid-cols-2">
              <section className="rounded-[20px] border border-black/10 bg-white p-5 shadow-[0_10px_34px_rgba(0,0,0,0.04)]">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Sunrise className="h-4 w-4 text-gray-500" />
                    <h3 className="text-sm font-semibold">Daily launch radar</h3>
                  </div>
                  <button type="button" className="text-xs font-semibold text-ink" onClick={() => handleDashboardViewChange('daily')}>
                    View daily
                  </button>
                </div>
                <div className="mt-4 divide-y divide-black/10 border-y border-black/10">
                  {dailyLaunches.map((launch) => {
                    const inner = (
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{launch.name}</p>
                          <p className="mt-1 line-clamp-2 text-xs leading-5 text-black/50">{launch.tagline || launch.intro || launch.metrics}</p>
                        </div>
                        <span className="shrink-0 rounded-full bg-[#f4f1eb] px-2 py-1 text-[11px] text-black/50">{launch.stage}</span>
                      </div>
                    );
                    return launch.projectPath ? (
                      <Link key={launch.id} to={launch.projectPath} className="block py-3 hover:bg-[#f6f3f1]">{inner}</Link>
                    ) : (
                      <a key={launch.id} href={launch.sourceUrl || launch.launchUrl || undefined} target="_blank" rel="noreferrer" className="block py-3 hover:bg-[#f6f3f1]">{inner}</a>
                    );
                  })}
                  {dailyLaunches.length === 0 && (
                    <p className="py-6 text-sm leading-6 text-black/50">No daily launch feed yet. Builder Discovery still ranks Apparent-native founders from available proof.</p>
                  )}
                </div>
              </section>

              <section className="rounded-[20px] border border-black/10 bg-white p-5 shadow-[0_10px_34px_rgba(0,0,0,0.04)]">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-gray-500" />
                    <h3 className="text-sm font-semibold">Pipeline snapshot</h3>
                  </div>
                  <button type="button" className="text-xs font-semibold text-ink" onClick={() => handleDashboardViewChange('deals')}>
                    Open board
                  </button>
                </div>
                <div className="mt-4 grid gap-2">
                  {investorPipeline.map((column) => (
                    <button
                      key={column.stage}
                      type="button"
                      className="flex items-center justify-between rounded-[12px] border border-black/10 px-3 py-2 text-left hover:bg-[#f6f3f1]"
                      onClick={() => handleDashboardViewChange('deals')}
                    >
                      <span className="text-sm text-black/65">{column.stage}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${column.items.length ? 'bg-lavender text-ink' : 'bg-[#f4f1eb] text-black/40'}`}>
                        {column.items.length}
                      </span>
                    </button>
                  ))}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="rounded-[14px] bg-[#fbfaf7] px-3 py-3">
                    <p className="text-xl font-semibold">{reviewingCount}</p>
                    <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-black/40">Reviewing</p>
                  </div>
                  <div className="rounded-[14px] bg-[#fbfaf7] px-3 py-3">
                    <p className="text-xl font-semibold">{meetingCount}</p>
                    <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-black/40">Meetings</p>
                  </div>
                </div>
              </section>
            </div>

            <aside className="space-y-6">
              <section className="rounded-[20px] border border-black/10 bg-white p-5 shadow-[0_10px_34px_rgba(0,0,0,0.04)]">
                <h3 className="text-sm font-semibold">Recommended next moves</h3>
                <div className="mt-4 space-y-3">
                  {actionRows.map((action) => (
                    <button
                      key={action.label}
                      type="button"
                      className="block w-full rounded-[14px] border border-black/10 px-3 py-3 text-left transition hover:bg-[#f6f3f1]"
                      onClick={action.onClick}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold">{action.label}</p>
                          <p className="mt-1 text-xs leading-5 text-black/50">{action.detail}</p>
                        </div>
                        <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-black/35" />
                      </div>
                      <p className="mt-3 text-xs font-semibold text-ink">{action.cta}</p>
                    </button>
                  ))}
                </div>
              </section>

              <section className="rounded-[20px] border border-black/10 bg-white p-5 shadow-[0_10px_34px_rgba(0,0,0,0.04)]">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Context to keep warm</h3>
                  <span className="text-xs text-black/40">{termReviews.length + meetups.length} items</span>
                </div>
                <div className="mt-4 grid gap-2">
                  <button type="button" className="rounded-[14px] border border-black/10 px-3 py-3 text-left hover:bg-[#f6f3f1]" onClick={() => handleDashboardViewChange('terms')}>
                    <p className="text-sm font-semibold">{termReviews.length} term notes</p>
                    <p className="mt-1 text-xs text-black/50">Keep valuation, rights, and diligence notes attached to company context.</p>
                  </button>
                  <button type="button" className="rounded-[14px] border border-black/10 px-3 py-3 text-left hover:bg-[#f6f3f1]" onClick={() => scrollToSection('meetups')}>
                    <p className="text-sm font-semibold">{meetups.length} rooms and meetups</p>
                    <p className="mt-1 text-xs text-black/50">Founder rooms can become warm sourcing moments around your thesis.</p>
                  </button>
                </div>
              </section>
            </aside>
          </section>

          <div>
            {renderMeetupsSection()}
          </div>
        </div>
      </motion.div>
    );
  };

  const renderTermsReviewSection = () => (
    <section id="terms" className="scroll-mt-24 rounded-[20px] border border-black/10 bg-white shadow-[0_10px_34px_rgba(0,0,0,0.04)] py-4">
      <div className="flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-gray-500" />
          <h3 className="text-sm font-semibold">Terms review</h3>
        </div>
        <button className="rounded-xl border border-black/10 p-1.5 hover:bg-[#f6f3f1]" onClick={() => setIsTermFormOpen((current) => !current)} aria-label="Add terms review">
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
      <div className="mt-3 max-h-[24rem] overflow-y-auto divide-y divide-black/10">
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
        {termReviews.length === 0 && (
          <EmptyState
            icon={<FileText className="h-5 w-5" />}
            title={isInvestor ? 'Track your deal terms' : 'Track and compare your offers'}
            body={isInvestor
              ? 'Log instrument, amount, valuation cap, pro-rata, and notes for each deal you’re reviewing — all in one place.'
              : 'Capture investor offers — SAFE notes, valuation caps, rights, and decision notes — so your fundraise stays organized.'}
            ctaLabel="Add terms"
            onCta={() => setIsTermFormOpen(true)}
          />
        )}
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
        <section className="rounded-[20px] border border-black/10 bg-white shadow-[0_10px_34px_rgba(0,0,0,0.04)] px-5 py-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-normal tracking-[-0.03em] font-serif">
                {isInvestor ? 'Deal Flow' : 'Your Fundraise Tracker'}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
                {isInvestor
                  ? 'Track sourced companies as they move from discovery to review, outreach, meetings, and watchlist.'
                  : 'Log and compare the investor offers you receive — instrument, valuation cap, amount, pro-rata, and deadlines — all in one place.'}
              </p>
            </div>
            <button
              type="button"
              className={`rounded-full ${accentSurface} px-4 py-2 text-sm font-semibold ${accentForeground}`}
              onClick={() => {
                setIsTermFormOpen(true);
                if (isInvestor) {
                  setActiveView('terms');
                  navigate(`${dashboardBasePath}/terms`);
                }
              }}
            >
              {isInvestor ? 'Add term note' : 'Log an offer'}
            </button>
          </div>
        </section>

        {isInvestor ? (
          renderInvestorDealFlowSection()
        ) : (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
            {renderTermsReviewSection()}
            <aside className="space-y-6">
              <section className="rounded-[20px] border border-black/10 bg-white shadow-[0_10px_34px_rgba(0,0,0,0.04)] p-5">
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
              <section className="rounded-[20px] border border-black/10 bg-white shadow-[0_10px_34px_rgba(0,0,0,0.04)] p-5">
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
        <section className="rounded-[20px] border border-black/10 bg-white shadow-[0_10px_34px_rgba(0,0,0,0.04)] px-5 py-5">
          <h2 className="text-2xl font-normal tracking-[-0.03em] font-serif">Terms Review</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
            Capture the terms that need review: instrument, amount, valuation, rights, concerns, and follow-up asks.
          </p>
        </section>
        {renderTermsReviewSection()}
      </div>
    </motion.div>
  );

  const renderKnowledgePage = () => {
    const steps: { title: string; text: string; cta?: { label: string; view: ViewMode } }[] = isInvestor
      ? [
          {
            title: 'Set your investment thesis',
            text: 'Capture your sectors, stage, geography, check size, and the founder signals you back. This is what ranks every founder Apparent shows you — so it’s the first thing to do.',
            cta: { label: 'Open your thesis', view: 'profile' },
          },
          {
            title: 'Discover builders by what they ship',
            text: 'Builder Discovery surfaces founders ranked against your thesis — real Apparent founders, scored by fit and freshness. Flip on “Raising now” to see contactable, thesis-fit founders who are actively raising.',
            cta: { label: 'Open Builder Discovery', view: 'matches' },
          },
          {
            title: 'Build your deal flow',
            text: 'Save the founders you like, then drag them across your Deal Flow pipeline — Discovery → Reviewing → Reached out → Meeting → Watchlist.',
            cta: { label: 'Open Deal Flow', view: 'deals' },
          },
          {
            title: 'Reach out with context',
            text: 'Apparent drafts a context-rich first message for every saved builder. Tweak it and send a stronger, more personal intro instead of a cold template.',
            cta: { label: 'Open Builder Discovery', view: 'matches' },
          },
          {
            title: 'Track terms',
            text: 'Log term sheets, instruments, valuation caps, pro-rata, and decision notes in Terms Review so nothing slips through the cracks.',
            cta: { label: 'Open Terms Review', view: 'terms' },
          },
        ]
      : [
          {
            title: 'Build your founder profile',
            text: 'Add your name, headline, bio, links, and what you’re building. This is the first thing investors see when they find you — make it count.',
            cta: { label: 'Edit your profile', view: 'profile' },
          },
          {
            title: 'Set your fundraising status',
            text: 'Flip on “Raising now” or “Open to intros” and add your round, amount, and ask. This is what surfaces you to thesis-fit investors — and it’s a signal pure scrapers can’t see.',
            cta: { label: 'Set your status', view: 'profile' },
          },
          {
            title: 'Launch your products',
            text: 'Publish each product with proof, traction, a demo, and a pitch. Launches put you on the Builder Radar and in investors’ discovery feeds.',
            cta: { label: 'Launch a product', view: 'products' },
          },
          {
            title: 'Find your investors',
            text: 'Open the VC Heat Map, filter by stage and sector, or hit “Match my profile” to light up the thesis-fit VCs you can actually pitch — with their contact details.',
            cta: { label: 'Open VC Heat Map', view: 'vc-heatmap' },
          },
          {
            title: 'Track interest & compare offers',
            text: 'See which investors are tracking your profile, and log every offer you receive — instrument, cap, amount, and deadline — in your Fundraise Tracker to compare them side by side.',
            cta: { label: 'Open Fundraise Tracker', view: 'deals' },
          },
        ];

    return (
      <motion.div
        key="knowledge-main"
        initial={{ opacity: 0, y: 10, filter: 'blur(2px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        exit={{ opacity: 0, y: -8, filter: 'blur(2px)' }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
      >
        <div id="knowledge" className="mx-auto max-w-[1292px] scroll-mt-24 space-y-6">
          <section className="rounded-[20px] border border-black/10 bg-white px-5 py-5 shadow-[0_10px_34px_rgba(0,0,0,0.04)]">
            <h2 className="text-2xl font-normal tracking-[-0.03em] font-serif">How to Use Apparent?</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
              {isInvestor
                ? 'Apparent is your founder-sourcing desk: capture your thesis, discover builders by what they ship, and run outreach and deal flow in one place. Here’s the flow.'
                : 'Apparent gets your work in front of thesis-fit investors who are actively hunting. Build your profile, signal that you’re raising, and find the right VCs to pitch. Here’s the flow.'}
            </p>
          </section>

          <section className="divide-y divide-black/10 overflow-hidden rounded-[20px] border border-black/10 bg-white shadow-[0_10px_34px_rgba(0,0,0,0.04)]">
            {steps.map((step, index) => (
              <div key={step.title} className="flex flex-col gap-3 px-5 py-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex gap-4">
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${accentSurface} text-sm font-semibold ${accentForeground}`}>
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-base font-semibold">{step.title}</p>
                    <p className="mt-1.5 max-w-2xl text-sm leading-6 text-gray-600">{step.text}</p>
                  </div>
                </div>
                {step.cta && (
                  <button
                    type="button"
                    onClick={() => handleDashboardViewChange(step.cta!.view)}
                    className="shrink-0 self-start rounded-full border border-black/10 px-4 py-2 text-xs font-semibold hover:bg-[#f6f3f1] sm:ml-4"
                  >
                    {step.cta.label}
                  </button>
                )}
              </div>
            ))}
          </section>

          <section className="rounded-[20px] border border-black/10 bg-[#fbfaf7] px-5 py-4">
            <p className="text-sm text-gray-600">
              Stuck or something feels off?{' '}
              <button type="button" onClick={() => handleDashboardViewChange('feedback')} className="font-semibold text-ink hover:underline">
                Send us feedback
              </button>{' '}
              — we read every note.
            </p>
          </section>
        </div>
      </motion.div>
    );
  };

  const renderSettingsPage = () => {
    const username = user.username ?? user.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
    const toggleClass = (on: boolean) =>
      `relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${on ? 'bg-charcoal' : 'bg-gray-200'}`;
    const knobClass = (on: boolean) =>
      `inline-block h-3.5 w-3.5 translate-x-0.5 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-[1.125rem]' : ''}`;

    return (
      <motion.div
        key="settings-main"
        initial={{ opacity: 0, y: 10, filter: 'blur(2px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        exit={{ opacity: 0, y: -8, filter: 'blur(2px)' }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
      >
        <div id="settings" className="mx-auto max-w-[1292px] scroll-mt-24 space-y-6">
          <section className="rounded-[20px] border border-black/10 bg-white px-5 py-5 shadow-[0_10px_34px_rgba(0,0,0,0.04)]">
            <h2 className="text-2xl font-normal tracking-[-0.03em] font-serif">Settings</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
              Manage your account, notifications, and how Apparent reaches you.
            </p>
          </section>

          {/* Account */}
          <section className="overflow-hidden rounded-[20px] border border-black/10 bg-white shadow-[0_10px_34px_rgba(0,0,0,0.04)]">
            <div className="border-b border-black/10 px-5 py-4">
              <h3 className="text-sm font-semibold">Account</h3>
            </div>
            <div className="divide-y divide-black/10">
              <div className="flex items-center justify-between gap-4 px-5 py-4">
                <div>
                  <p className="text-sm font-medium">Email</p>
                  <p className="mt-0.5 text-xs text-gray-500">{user.email}</p>
                </div>
                <span className="rounded-full bg-[#f4f1eb] px-3 py-1 text-xs font-medium text-gray-500">Sign-in</span>
              </div>
              <div className="flex items-center justify-between gap-4 px-5 py-4">
                <div>
                  <p className="text-sm font-medium">Username</p>
                  <p className="mt-0.5 text-xs text-gray-500">@{username}</p>
                </div>
                <a
                  href={`/@${username}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-full border border-black/10 px-3 py-1.5 text-xs font-semibold hover:bg-[#f6f3f1]"
                >
                  <ArrowUpRight className="h-3.5 w-3.5" /> View public profile
                </a>
              </div>
              <div className="flex items-center justify-between gap-4 px-5 py-4">
                <div>
                  <p className="text-sm font-medium">Workspace</p>
                  <p className="mt-0.5 text-xs text-gray-500">{isInvestor ? 'Investor' : 'Founder'} workspace</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDashboardViewChange('profile')}
                  className="rounded-full border border-black/10 px-3 py-1.5 text-xs font-semibold hover:bg-[#f6f3f1]"
                >
                  {isInvestor ? 'Edit thesis' : 'Edit profile'}
                </button>
              </div>
            </div>
          </section>

          {/* Notifications */}
          <section className="overflow-hidden rounded-[20px] border border-black/10 bg-white shadow-[0_10px_34px_rgba(0,0,0,0.04)]">
            <div className="border-b border-black/10 px-5 py-4">
              <h3 className="text-sm font-semibold">Notifications</h3>
            </div>
            <div className="divide-y divide-black/10">
              <div className="flex items-center justify-between gap-4 px-5 py-4">
                <div>
                  <p className="text-sm font-medium">Daily digest</p>
                  <p className="mt-0.5 max-w-md text-xs text-gray-500">
                    {isInvestor
                      ? 'A daily summary of fresh, thesis-fit founder signals.'
                      : 'A daily summary of investor interest and new matches.'}
                  </p>
                </div>
                <button type="button" role="switch" aria-checked={dailyDigestEnabled} onClick={toggleDailyDigest} className={toggleClass(dailyDigestEnabled)}>
                  <span className={knobClass(dailyDigestEnabled)} />
                </button>
              </div>
              <div className="flex items-center justify-between gap-4 px-5 py-4">
                <div>
                  <p className="text-sm font-medium">Slack alerts</p>
                  <p className="mt-0.5 max-w-md text-xs text-gray-500">Real-time alerts for high-signal activity in your workspace.</p>
                </div>
                <button type="button" role="switch" aria-checked={slackAlertsEnabled} onClick={toggleSlackAlerts} className={toggleClass(slackAlertsEnabled)}>
                  <span className={knobClass(slackAlertsEnabled)} />
                </button>
              </div>
            </div>
          </section>

          {/* Public profile */}
          <section className="overflow-hidden rounded-[20px] border border-black/10 bg-white shadow-[0_10px_34px_rgba(0,0,0,0.04)]">
            <div className="border-b border-black/10 px-5 py-4">
              <h3 className="text-sm font-semibold">Public profile</h3>
            </div>
            <div className="flex items-center justify-between gap-4 px-5 py-4">
              <div>
                <p className="text-sm font-medium">Share button</p>
                <p className="mt-0.5 max-w-md text-xs text-gray-500">
                  Show a &ldquo;Share profile&rdquo; button on your public profile so anyone can copy and share your link. Your profile stays public either way.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={intakeValues.shareable !== 'false'}
                onClick={handleToggleShareable}
                className={toggleClass(intakeValues.shareable !== 'false')}
              >
                <span className={knobClass(intakeValues.shareable !== 'false')} />
              </button>
            </div>
            <div className="border-t border-black/10 px-5 py-4">
              <a
                href={`/@${username}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full bg-charcoal px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90"
              >
                <ArrowUpRight className="h-3.5 w-3.5" /> View &amp; share my profile
              </a>
            </div>
          </section>

          {/* Session */}
          <section className="overflow-hidden rounded-[20px] border border-black/10 bg-white shadow-[0_10px_34px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between gap-4 px-5 py-4">
              <div>
                <p className="text-sm font-medium">Sign out</p>
                <p className="mt-0.5 text-xs text-gray-500">End your session on this device.</p>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100"
              >
                Sign out
              </button>
            </div>
          </section>
        </div>
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
      <section id="feedback" className="mx-auto max-w-[1292px] scroll-mt-24 rounded-[20px] border border-black/10 bg-white shadow-[0_10px_34px_rgba(0,0,0,0.04)]">
        <div className="border-b border-black/10 px-5 py-5">
          <h2 className="text-2xl font-normal tracking-[-0.03em] font-serif">Feedback</h2>
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

  const handleRefreshDailySignals = async () => {
    if (dailyRefreshing) return;
    setDailyRefreshing(true);
    setDailyRefreshMsg('Sourcing fresh startups…');
    const result = await triggerManualSourcing(getAgentAuthHeaders);
    if (result.ok) {
      const fresh = await loadDailyDigestSourced();
      setDailyDigest(fresh);
      const count = result.upserted ?? 0;
      setDailyRefreshMsg(
        result.partial
          ? `Added ${count} startups — the scout stopped early, run again for more.`
          : `Added ${count} fresh startups.`,
      );
    } else if (result.retryInSec) {
      const mins = Math.ceil(result.retryInSec / 60);
      setDailyRefreshMsg(`Cooldown — try again in ~${mins} min.`);
    } else {
      setDailyRefreshMsg(result.error || 'Refresh failed.');
    }
    setDailyRefreshing(false);
    setTimeout(() => setDailyRefreshMsg(''), 6000);
  };

  const renderDailyDigestPage = () => {
    // Distinct filter options derived from whatever the scraper delivered today.
    const uniq = (values: string[]) => Array.from(new Set(values.map((v) => v.trim()).filter(Boolean))).sort();
    // Sector options span every tag a sourced startup carries (founderSignals),
    // not just its primary category — so a multi-sector startup is findable under each.
    const sectorOptions = uniq(dailyDigest.flatMap((l) => [l.category, ...(l.founderSignals ?? [])]));
    const stageOptions = uniq(dailyDigest.map((l) => l.stage));
    const locationOptions = uniq(dailyDigest.map((l) => l.location ?? ''));

    const q = dailyFilters.query.trim().toLowerCase();
    const filtered = dailyDigest.filter((l) => {
      if (dailyFilters.sector && l.category !== dailyFilters.sector && !(l.founderSignals ?? []).includes(dailyFilters.sector)) return false;
      if (dailyFilters.stage && l.stage !== dailyFilters.stage) return false;
      if (dailyFilters.location && (l.location ?? '') !== dailyFilters.location) return false;
      if (q) {
        const hay = `${l.name} ${l.tagline} ${l.intro ?? ''} ${l.category} ${l.location ?? ''} ${l.metrics}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    const hasActiveFilter = Boolean(dailyFilters.query || dailyFilters.sector || dailyFilters.stage || dailyFilters.location);
    const selectCls =
      'h-9 rounded-full border border-black/10 bg-white px-3 text-xs font-semibold text-black/70 outline-none focus:border-black/30';

    return (
      <motion.div
        key="daily-main"
        initial={{ opacity: 0, y: 10, filter: 'blur(2px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        exit={{ opacity: 0, y: -8, filter: 'blur(2px)' }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
      >
        <section id="daily" className="scroll-mt-24">
          <div className="mx-auto max-w-[1292px] space-y-6">
            {/* Header */}
            <div className="rounded-[20px] border border-black/10 bg-white px-6 py-5 shadow-[0_10px_34px_rgba(0,0,0,0.04)]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-lavender">
                    <Sunrise className="h-5 w-5 text-ink" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold tracking-[-0.02em]">Sourced deal flow</h2>
                    <p className="mt-0.5 text-xs text-black/50">Newest first · fresh leads added daily at 7:00 AM PST</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-[#f4f1eb] px-3 py-1.5 text-xs font-semibold text-black/60">
                    {filtered.length} {filtered.length === 1 ? 'startup' : 'startups'}
                  </span>
                  <button
                    type="button"
                    onClick={handleRefreshDailySignals}
                    disabled={dailyRefreshing}
                    title="Source fresh startups now"
                    className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-semibold text-black/70 hover:border-black/25 hover:text-black disabled:opacity-60"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${dailyRefreshing ? 'animate-spin' : ''}`} />
                    {dailyRefreshing ? 'Sourcing…' : 'Refresh'}
                  </button>
                  <div className="inline-flex items-center rounded-full border border-black/10 bg-white p-0.5">
                    <button
                      type="button"
                      onClick={() => setDailyView('cards')}
                      aria-pressed={dailyView === 'cards'}
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${dailyView === 'cards' ? 'bg-charcoal text-white' : 'text-black/55 hover:text-black'}`}
                    >
                      <LayoutGrid className="h-3 w-3" /> Cards
                    </button>
                    <button
                      type="button"
                      onClick={() => setDailyView('table')}
                      aria-pressed={dailyView === 'table'}
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${dailyView === 'table' ? 'bg-charcoal text-white' : 'text-black/55 hover:text-black'}`}
                    >
                      <Rows3 className="h-3 w-3" /> Table
                    </button>
                  </div>
                </div>
              </div>

              {/* Filter bar */}
              {dailyDigest.length > 0 && (
                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-black/10 pt-4">
                  <div className="relative min-w-[12rem] flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-black/30" />
                    <input
                      value={dailyFilters.query}
                      onChange={(e) => setDailyFilters((f) => ({ ...f, query: e.target.value }))}
                      placeholder="Search sourced startups"
                      className="h-9 w-full rounded-full border border-black/10 bg-white pl-9 pr-3 text-xs font-medium outline-none focus:border-black/30"
                    />
                  </div>
                  <select value={dailyFilters.sector} onChange={(e) => setDailyFilters((f) => ({ ...f, sector: e.target.value }))} className={selectCls}>
                    <option value="">All sectors</option>
                    {sectorOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <select value={dailyFilters.stage} onChange={(e) => setDailyFilters((f) => ({ ...f, stage: e.target.value }))} className={selectCls}>
                    <option value="">All stages</option>
                    {stageOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <select value={dailyFilters.location} onChange={(e) => setDailyFilters((f) => ({ ...f, location: e.target.value }))} className={selectCls}>
                    <option value="">All locations</option>
                    {locationOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  {hasActiveFilter && (
                    <button
                      type="button"
                      onClick={() => setDailyFilters({ query: '', sector: '', stage: '', location: '' })}
                      className="inline-flex items-center gap-1 rounded-full px-3 py-2 text-xs font-semibold text-black/50 hover:text-black"
                    >
                      <X className="h-3.5 w-3.5" /> Clear
                    </button>
                  )}
                </div>
              )}
              {dailyRefreshMsg && (
                <p className="mt-3 text-[11px] font-semibold text-black/55">{dailyRefreshMsg}</p>
              )}
            </div>

            {/* List */}
            {dailyDigest.length === 0 ? (
              <div className="rounded-[20px] border border-black/10 bg-white p-10 text-center shadow-[0_10px_34px_rgba(0,0,0,0.04)]">
                <Sunrise className="mx-auto h-8 w-8 text-black/25" />
                <h3 className="mt-4 text-lg font-semibold tracking-[-0.02em]">No deal flow yet today</h3>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-black/55">
                  A fresh, thesis-ranked list of founders and launches lands here every morning at 7:00 AM PST. Check back shortly.
                </p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-[20px] border border-black/10 bg-white p-10 text-center shadow-[0_10px_34px_rgba(0,0,0,0.04)]">
                <ListFilter className="mx-auto h-7 w-7 text-black/25" />
                <p className="mt-3 text-sm font-semibold">No launches match these filters</p>
                <button
                  type="button"
                  onClick={() => setDailyFilters({ query: '', sector: '', stage: '', location: '' })}
                  className="mt-3 text-xs font-semibold text-ink hover:underline"
                >
                  Clear filters
                </button>
              </div>
            ) : dailyView === 'table' ? (
              (() => {
                const sorted = [...filtered].sort((a, b) => {
                  const av = String((a as unknown as Record<string, unknown>)[dailySort.key] ?? '').toLowerCase();
                  const bv = String((b as unknown as Record<string, unknown>)[dailySort.key] ?? '').toLowerCase();
                  if (av === bv) return 0;
                  const cmp = av < bv ? -1 : 1;
                  return dailySort.dir === 'asc' ? cmp : -cmp;
                });
                const toggleSort = (key: typeof dailySort.key) => setDailySort((s) => ({ key, dir: s.key === key && s.dir === 'asc' ? 'desc' : 'asc' }));
                const th = (key: typeof dailySort.key, label: string) => (
                  <th className="whitespace-nowrap px-4 py-2.5 text-left font-semibold text-black/55">
                    <button type="button" onClick={() => toggleSort(key)} className="inline-flex items-center gap-1 hover:text-black">
                      {label} <ChevronsUpDown className="h-3 w-3 opacity-50" />
                    </button>
                  </th>
                );
                return (
                  <div className="overflow-hidden rounded-[18px] border border-black/10 bg-white shadow-[0_8px_24px_rgba(0,0,0,0.04)]">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-[#fbfaf7] text-[11px] uppercase tracking-[0.08em]">
                          <tr>
                            {th('name', 'Startup')}
                            {th('category', 'Sector')}
                            {th('stage', 'Stage')}
                            {th('location', 'Location')}
                            <th className="whitespace-nowrap px-4 py-2.5 text-left font-semibold text-black/55">Metric</th>
                            {th('source', 'Source')}
                            <th className="px-4 py-2.5" />
                          </tr>
                        </thead>
                        <tbody>
                          {sorted.map((launch) => {
                            const domain = dashboardLaunchDomain(launch.launchUrl || launch.sourceUrl || '');
                            const href = launch.sourceUrl || launch.launchUrl || '';
                            const internalTo = launch.projectPath;
                            const rowCls = 'group border-t border-black/[0.06] hover:bg-[#fbfaf7] cursor-pointer';
                            const cells = (
                              <>
                                <td className="px-4 py-3">
                                  {/* Bounded width so the taglines below can truncate: in an
                                      auto-layout table the column otherwise grows to fit the
                                      longest description and blows out the row. */}
                                  <div className="flex w-[20rem] max-w-[20rem] items-center gap-2.5">
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#fbfaf7]">
                                      <img
                                        src={launch.logoUrl || `https://www.google.com/s2/favicons?domain=${domain}&sz=128`}
                                        alt=""
                                        className="h-5 w-5 object-contain"
                                        onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
                                      />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="truncate font-semibold text-black">{launch.name}</div>
                                      {launch.tagline && (
                                        <div className="truncate text-[11px] text-black/50" title={launch.tagline}>
                                          {launch.tagline}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-black/70">
                                  <div className="max-w-[10rem] truncate" title={launch.category}>{launch.category || '—'}</div>
                                </td>
                                <td className="px-4 py-3 text-black/70">
                                  <div className="max-w-[9rem] truncate" title={launch.stage}>{launch.stage || '—'}</div>
                                </td>
                                <td className="px-4 py-3 text-black/70">
                                  <div className="max-w-[10rem] truncate" title={launch.location}>{launch.location || '—'}</div>
                                </td>
                                <td className="px-4 py-3 text-black/70">
                                  <div className="max-w-[12rem] truncate" title={launch.metrics}>{launch.metrics || '—'}</div>
                                </td>
                                <td className="px-4 py-3 text-black/60">
                                  <div className="max-w-[8rem] truncate" title={launch.source}>{launch.source || '—'}</div>
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#f4f1eb] text-black/60 group-hover:bg-charcoal group-hover:text-white">
                                    <ArrowUpRight className="h-3.5 w-3.5" />
                                  </span>
                                </td>
                              </>
                            );
                            return internalTo ? (
                              <tr key={launch.id} className={rowCls} onClick={() => navigate(internalTo)}>{cells}</tr>
                            ) : (
                              <tr key={launch.id} className={rowCls} onClick={() => href && window.open(href, '_blank', 'noopener,noreferrer')}>{cells}</tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()
            ) : (
              // Trading-card grid — each sourced startup as a FUT-style card.
              // Smaller columns than the old list: these are cards, so they
              // want card proportions rather than full-width panels.
              <div className="grid grid-cols-2 gap-5 lg:grid-cols-3 xl:grid-cols-4">
                {filtered.map((launch) => {
                  const domain = dashboardLaunchDomain(launch.launchUrl || launch.sourceUrl || '');
                  const href = launch.sourceUrl || launch.launchUrl || '';
                  // Sourced items carry projectPath → open the in-app /sourced/:id
                  // profile (SPA nav). Legacy R2-fallback items have none → link out.
                  const internalTo = launch.projectPath;
                  const inner = (
                    <>
                      <div className="ap-fut-head">
                        <div className="ap-fut-rating">
                          <span className="ap-fut-pos">{stagePosition(launch.stage)}</span>
                          <span className="ap-fut-crest">
                            {launch.category && <span title={launch.category}>{launch.category}</span>}
                            {launch.location && <span title={launch.location}>{launch.location}</span>}
                          </span>
                        </div>
                        <div className="ap-fut-portrait">
                          <img
                            src={launch.logoUrl || `https://www.google.com/s2/favicons?domain=${domain}&sz=128`}
                            alt=""
                            onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
                          />
                        </div>
                      </div>

                      <div className="ap-fut-name" title={launch.name}>{launch.name}</div>

                      {launch.tagline && <p className="ap-fut-tagline">{launch.tagline}</p>}

                      <div className="ap-fut-foot">
                        <span>{launch.source || 'Sourced'}</span>
                        <span>{internalTo ? 'Profile' : 'Source'} &#8599;</span>
                      </div>
                    </>
                  );
                  return internalTo ? (
                    <Link key={launch.id} to={internalTo} className="ap-fut">{inner}</Link>
                  ) : (
                    <a key={launch.id} href={href || undefined} target={href ? '_blank' : undefined} rel="noreferrer" className="ap-fut">{inner}</a>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </motion.div>
    );
  };

  const renderForYouLaunchPage = () => {
    // No Apparent launches loaded yet (or none exist) — render an empty state
    // instead of crashing on selectedForYouLaunch. The first founder who
    // publishes a launch populates this feed for everyone.
    if (!selectedForYouLaunch) {
      return (
        <motion.div
          key="for-you-empty"
          initial={{ opacity: 0, y: 10, filter: 'blur(2px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: -8, filter: 'blur(2px)' }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
        >
          <section id="for-you" className="scroll-mt-24">
            <div className="mx-auto max-w-[1292px]">
              <div className="rounded-[20px] border border-black/10 bg-white p-10 text-center shadow-[0_10px_34px_rgba(0,0,0,0.04)]">
                <Rocket className="mx-auto h-8 w-8 text-black/30" />
                <h2 className="mt-4 text-xl font-semibold tracking-[-0.02em]">No launches on Apparent yet</h2>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-black/55">
                  When founders publish product launches on Apparent, they will show up here for everyone to discover.
                </p>
                {!isInvestor && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveView('products');
                      navigate(`${dashboardBasePath}/products`);
                    }}
                    className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white hover:bg-black/85"
                  >
                    Publish your first launch <ArrowUpRight className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </section>
        </motion.div>
      );
    }

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
              <section className="rounded-[20px] border border-black/10 bg-white shadow-[0_10px_34px_rgba(0,0,0,0.04)]">
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
                    const isExpanded = selectedForYouLaunchId === launch.id;
                    const domain = dashboardLaunchDomain(launch.website);
                    // External launches have no Apparent project page — open the
                    // original listing (website/source) instead of a dead route.
                    const projectHref =
                      launch.origin === 'external'
                        ? launch.sourceUrl || launch.website
                        : launch.projectPath ?? `/projects/${launch.id}`;

                    return (
                      <div key={launch.id} className={isExpanded ? 'bg-[#fbfaf7]' : 'bg-white'}>
                        {/* Row header — click toggles expansion. Use a button so it
                            stays keyboard-accessible without nesting interactive
                            elements inside it. */}
                        <button
                          type="button"
                          onClick={() => setSelectedForYouLaunchId((current) => (current === launch.id ? '' : launch.id))}
                          aria-expanded={isExpanded}
                          className="group grid w-full gap-4 px-5 py-4 text-left transition-colors hover:bg-[#f6f3f1] md:grid-cols-[3.25rem_1fr_auto] md:items-center"
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
                              <span className="rounded-full bg-lavender px-2.5 py-0.5 text-xs font-semibold text-black">
                                {launch.fit}% thesis fit
                              </span>
                              {launch.origin === 'external' && (
                                <span className="inline-flex items-center gap-1 rounded-full border border-black/10 bg-[#f6f3f1] px-2.5 py-0.5 text-xs font-semibold text-black/55">
                                  <Globe className="h-3 w-3" /> via {launch.source || 'External'}
                                </span>
                              )}
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
                              <ChevronUp className="h-4 w-4 text-ink" />
                              {launch.saves}
                            </span>
                            <span className="inline-flex items-center gap-1.5 text-black/45">
                              <MessageSquare className="h-4 w-4" />
                              {launch.comments}
                            </span>
                            <span className={`ml-auto rounded-full px-3.5 py-2 text-xs font-semibold transition-colors md:ml-0 ${
                              isExpanded ? 'bg-charcoal text-white' : 'bg-[#f4f1eb] text-black/70 group-hover:bg-charcoal group-hover:text-white'
                            }`}>
                              {isExpanded ? 'Hide' : 'View'}
                            </span>
                          </div>
                        </button>

                        {/* Inline expansion: project detail + founder + "Open in new tab".
                            grid-rows animation gives a smooth height transition without
                            measuring the panel. */}
                        <div
                          className={`grid overflow-hidden transition-all duration-300 ease-out ${
                            isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                          }`}
                        >
                          <div className="min-h-0">
                            <div className="border-t border-black/10 px-5 py-5">
                              {launch.bannerUrl && (
                                <div className="mb-5 aspect-[16/7] overflow-hidden rounded-[18px] bg-[#fbfaf7]">
                                  <img src={launch.bannerUrl} alt="" className="h-full w-full object-cover" />
                                </div>
                              )}
                              <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                                <div>
                                  <p className="text-sm leading-7 text-black/65">{launch.description}</p>

                                  {(launch.demoVideoUrl || launch.pitchVideoUrl) && (
                                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                      {launch.demoVideoUrl && (
                                        <video className="aspect-video w-full rounded-[16px] bg-black object-cover" src={launch.demoVideoUrl} controls />
                                      )}
                                      {launch.pitchVideoUrl && (
                                        <video className="aspect-video w-full rounded-[16px] bg-black object-cover" src={launch.pitchVideoUrl} controls />
                                      )}
                                    </div>
                                  )}

                                  <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                                    <div className="rounded-[14px] bg-white p-3 border border-black/5">
                                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-black/40">Location</p>
                                      <p className="mt-1.5 text-sm font-semibold">{launch.location}</p>
                                    </div>
                                    <div className="rounded-[14px] bg-white p-3 border border-black/5">
                                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-black/40">Stage</p>
                                      <p className="mt-1.5 text-sm font-semibold">{launch.stage}</p>
                                    </div>
                                    <div className="rounded-[14px] bg-white p-3 border border-black/5">
                                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-black/40">Category</p>
                                      <p className="mt-1.5 text-sm font-semibold">{launch.category}</p>
                                    </div>
                                    <div className="rounded-[14px] bg-white p-3 border border-black/5">
                                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-black/40">Momentum</p>
                                      <p className="mt-1.5 text-sm font-semibold">{launch.momentum}</p>
                                    </div>
                                  </div>

                                  {launch.proof.length > 0 && (
                                    <div className="mt-5">
                                      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink">Proof signals</p>
                                      <div className="grid gap-1.5">
                                        {launch.proof.map((signal) => (
                                          <div key={signal} className="flex items-start gap-2 text-xs leading-5 text-black/60">
                                            <Star className="mt-0.5 h-3 w-3 shrink-0 text-ink" />
                                            <span>{signal}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Founder card + open-in-new-tab CTA */}
                                <aside className="space-y-4">
                                  <div className="rounded-[16px] border border-black/10 bg-white p-4">
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink">Launched by</p>
                                    {(() => {
                                      // founderProfilePath is either `/@username` or `/profile/<uuid>`.
                                      // Show the @-handle as the secondary line whenever we have one.
                                      const handle = launch.founderProfilePath?.startsWith('/@')
                                        ? launch.founderProfilePath.slice(1)
                                        : '';
                                      const subline = handle || 'View profile';
                                      const avatarInitials = launch.founder
                                        .replace(/^You\s*\(@.*\)$/, 'YOU')
                                        .split(/\s+/)
                                        .slice(0, 2)
                                        .map((part) => part[0] ?? '')
                                        .join('')
                                        .toUpperCase() || 'FO';
                                      const Inner = (
                                        <>
                                          <VerifiedAvatar
                                            src={launch.founderPhotoUrl}
                                            name={launch.founder}
                                            fallbackInitials={avatarInitials}
                                            size="feed"
                                            verified={launch.founderGithubVerified}
                                          />
                                          <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-semibold">{launch.founder}</p>
                                            <p className="mt-0.5 truncate text-xs text-black/50">{subline}</p>
                                          </div>
                                          {launch.founderProfilePath && (
                                            <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-black/30" />
                                          )}
                                        </>
                                      );
                                      return launch.founderProfilePath ? (
                                        <Link
                                          to={launch.founderProfilePath}
                                          className="mt-3 flex items-center gap-3 rounded-[12px] p-2 -mx-2 transition-colors hover:bg-[#f4f1eb]"
                                        >
                                          {Inner}
                                        </Link>
                                      ) : (
                                        <div className="mt-3 flex items-center gap-3">{Inner}</div>
                                      );
                                    })()}
                                  </div>

                                  <div className="grid gap-2">
                                    <a
                                      href={projectHref}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center justify-center gap-1.5 rounded-full bg-charcoal px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-ink"
                                    >
                                      Open project <ArrowUpRight className="h-4 w-4" />
                                    </a>
                                  </div>
                                </aside>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
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
                    <p className="text-sm font-semibold text-ink">Top launch</p>
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

              </aside>
            </div>
          </div>
        </section>
      </motion.div>
    );
  };

  const renderInvestorSignalInboxSection = (sectionId = 'matches') => (
    <section id={sectionId} className="scroll-mt-24 rounded-[20px] border border-black/10 bg-white shadow-[0_10px_34px_rgba(0,0,0,0.04)]">
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
          <article key={signalStorageId(signal)} className="px-5 py-4 transition-colors hover:bg-[#f6f3f1]">
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
          <EmptyState
            icon={<Search className="h-5 w-5" />}
            title="No matching signals"
            body="Set your thesis to rank incoming founder signals, or clear filters to widen the pool. Real Apparent founders show up here ranked by fit and freshness."
            ctaLabel="Set your thesis"
            onCta={() => setActiveView('profile')}
          />
        )}
      </div>
    </section>
  );

  const renderMessagesSection = () => (
    <section id="messages" className="h-full min-h-0 w-full scroll-mt-24 overflow-hidden rounded-[20px] border border-black/10 bg-white shadow-[0_10px_34px_rgba(0,0,0,0.04)]">
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
                className="rounded-xl border border-black/10 p-2 text-gray-500 transition-colors hover:bg-[#f6f3f1] hover:text-black"
                onClick={handleStartNewMessage}
                aria-label="New message"
                title="New message"
              >
                <SquarePen className="h-4 w-4" />
              </button>
              {/* Native dropdown so the user can pick a status directly
                  instead of cycling through options with repeated clicks. */}
              <div className="relative">
                <ListFilter className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <select
                  value={messageStatusFilter}
                  onChange={(event) => setMessageStatusFilter(event.target.value as MessageStatusFilter)}
                  className="h-9 cursor-pointer appearance-none rounded-xl border border-black/10 bg-white pl-8 pr-7 text-xs font-medium text-gray-700 outline-none transition-colors hover:bg-[#f6f3f1] focus:border-ink"
                  aria-label="Filter messages by status"
                >
                  <option value="all">All</option>
                  <option value="draft">Drafts</option>
                  <option value="sent">Sent</option>
                  <option value="replied">Replied</option>
                </select>
                <ChevronUp className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 rotate-180 text-gray-400" />
              </div>
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
                    isActive ? dmSelectedSurface : 'hover:bg-[#f6f3f1]'
                  }`}
                  onClick={() => handleSelectMessageThread(thread)}
                >
                  <div className="flex gap-3">
                    <Avatar className="size-10 rounded-xl">
                      <AvatarFallback className={`rounded-xl text-xs font-semibold ${accentSurface} ${accentForeground}`}>
                        {getInitials(thread.recipient)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`truncate text-sm ${thread.unreadCount > 0 ? 'font-bold text-black' : 'font-semibold'}`}>
                          {thread.recipient}
                        </p>
                        <span className="flex shrink-0 items-center gap-1.5">
                          {thread.unreadCount > 0 && (
                            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-none text-white">
                              {thread.unreadCount > 9 ? '9+' : thread.unreadCount}
                            </span>
                          )}
                          <span className="text-[11px] text-gray-400">{formatMessageTime(thread.latest.updatedAt)}</span>
                        </span>
                      </div>
                      <p className={`mt-1 truncate text-xs ${thread.unreadCount > 0 ? 'font-semibold text-gray-700' : 'font-medium text-gray-500'}`}>{thread.latest.subject || 'Apparent message'}</p>
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
              <Avatar className="size-11 rounded-xl">
                <AvatarFallback className={`rounded-xl text-xs font-semibold ${accentSurface} ${accentForeground}`}>
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
                {activeThreadMessages.map((message) => {
                  const outgoing = message.ownerId === user.id;
                  return (
                    <div key={message.id} className={`flex ${outgoing ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={
                          outgoing
                            ? `max-w-[82%] rounded-[22px] rounded-br-md border ${dmAccentBorder} ${accentSurface} px-4 py-3 ${accentForeground} shadow-sm shadow-black/[0.05] md:max-w-[72%]`
                            : 'max-w-[82%] rounded-[22px] rounded-bl-md border border-black/10 bg-white px-4 py-3 text-black shadow-sm shadow-black/[0.05] md:max-w-[72%]'
                        }
                      >
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <p className={`truncate text-xs font-semibold ${outgoing && isInvestor ? 'text-white/75' : 'text-black/55'}`}>{message.subject || 'Apparent message'}</p>
                          <span className={`shrink-0 text-[11px] ${outgoing && isInvestor ? 'text-white/60' : 'text-black/45'}`}>{formatMessageTime(message.updatedAt)}</span>
                        </div>
                        <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.body}</p>
                        <div className="mt-3 flex justify-end">
                          <span className={`rounded-full px-2 py-0.5 text-[11px] ${outgoing ? dmBubbleMeta : 'bg-[#f4f1eb] text-gray-500'}`}>
                            {outgoing ? message.status : 'received'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <form className="shrink-0 border-t border-black/10 bg-white" onSubmit={handleMessageSubmit}>
            <div className="flex items-center gap-2 px-3 py-3">
              <button type="button" className="rounded-xl p-2 text-gray-500 transition-colors hover:bg-[#f6f3f1] hover:text-black" aria-label="Emoji">
                <Smile className="h-4 w-4" />
              </button>
              <button type="button" className="rounded-xl p-2 text-gray-500 transition-colors hover:bg-[#f6f3f1] hover:text-black" aria-label="Attach">
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
                className="hidden rounded-full border border-black/10 px-4 py-2 text-sm font-medium hover:bg-[#f6f3f1] disabled:cursor-not-allowed disabled:opacity-60 sm:inline-flex"
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
          <section className="rounded-[20px] border border-black/10 bg-white shadow-[0_10px_34px_rgba(0,0,0,0.04)]">
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
                    navigate(`${dashboardBasePath}/profile`);
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
              <section className="rounded-[20px] border border-black/10 bg-white shadow-[0_10px_34px_rgba(0,0,0,0.04)] py-4">
                <p className="px-4 text-xs font-medium uppercase tracking-wide text-gray-500">Highest-fit builders</p>
                <div className="mt-3 divide-y divide-black/10">
                  {topBuilders.map((builder) => {
                    const state = getBuilderState(builder);

                    return (
                      <button
                        key={builder.id}
                        type="button"
                        className="w-full px-4 py-3 text-left transition-colors hover:bg-[#f6f3f1]"
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

              <section className="rounded-[20px] border border-black/10 bg-white shadow-[0_10px_34px_rgba(0,0,0,0.04)] py-4">
                <p className="px-4 text-xs font-medium uppercase tracking-wide text-gray-500">Fast actions</p>
                <div className="mt-3 space-y-2 px-4">
                  <button
                    type="button"
                    className="w-full rounded-full border border-black/10 px-4 py-2 text-sm font-medium hover:bg-[#f6f3f1]"
                    onClick={() => {
                      setQuery('devtools');
                      scrollToSection('signal-inbox');
                    }}
                  >
                    Filter devtools
                  </button>
                  <button
                    type="button"
                    className="w-full rounded-full border border-black/10 px-4 py-2 text-sm font-medium hover:bg-[#f6f3f1]"
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
                      navigate(`${dashboardBasePath}/deals`);
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
          <section className="rounded-[20px] border border-black/10 bg-white shadow-[0_10px_34px_rgba(0,0,0,0.04)]">
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

          <section className="rounded-[20px] border border-black/10 bg-white shadow-[0_10px_34px_rgba(0,0,0,0.04)]">
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
                  <article key={match.name} className="px-5 py-5 transition-colors hover:bg-[#f6f3f1]">
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
                productLaunches.length === 0 ? (
                  <EmptyState
                    icon={<Rocket className="h-5 w-5" />}
                    title="Launch a product to unlock matches"
                    body="Apparent ranks thesis-fit VCs from our 3,000+ investor database plus active investors on Apparent against the launches you publish. Launch your first product to see who fits."
                    ctaLabel="Launch a product"
                    onCta={() => setActiveView('products')}
                  />
                ) : (
                  <EmptyState
                    icon={<Search className="h-5 w-5" />}
                    title="No investor matches yet"
                    body="Loading the investor database and ranking against your launches. If this persists, add a category and stage to your profile so we can score thesis fit."
                    ctaLabel="Complete your profile"
                    onCta={() => setActiveView('profile')}
                  />
                )
              )}
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="rounded-[20px] border border-black/10 bg-white shadow-[0_10px_34px_rgba(0,0,0,0.04)]">
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

            <div className="rounded-[20px] border border-black/10 bg-white shadow-[0_10px_34px_rgba(0,0,0,0.04)]">
              <div className="flex items-center gap-2 border-b border-black/10 px-5 py-3">
                <Bookmark className="h-4 w-4 text-gray-500" />
                <h3 className="text-sm font-semibold">Saved investors</h3>
              </div>
              <div className="divide-y divide-black/10">
                {savedMatches.map((match) => (
                  <button
                    key={match.name}
                    type="button"
                    className="w-full px-5 py-3 text-left transition-colors hover:bg-[#f6f3f1]"
                    onClick={() => setSelectedMatch(match)}
                  >
                    <p className="text-sm font-medium">{match.name}</p>
                    <p className="mt-1 text-xs text-gray-500">{match.responseWindow}</p>
                  </button>
                ))}
                {savedMatches.length === 0 && (
                  <EmptyState
                    icon={<Bookmark className="h-5 w-5" />}
                    title="No saved investors yet"
                    body="Save investors from your matches to build a focused outreach shortlist you can work through."
                  />
                )}
              </div>
            </div>
          </section>
        </div>
      </motion.div>
    );
  };

  const renderAgentPage = () => (
    <motion.div
      key="agent-main"
      id="agent"
      initial={{ opacity: 0, y: 8, filter: 'blur(2px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      exit={{ opacity: 0, y: -8, filter: 'blur(2px)' }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className="h-full min-h-0"
    >
      {isInvestor ? (
        <InvestorAgentChat
          className="h-full min-h-0"
          criteria={intakeValues}
          memories={agentMemories}
          threadId={activeAgentThreadId}
          persistedMessages={agentChatMessages}
          persistedMessagesLoaded={agentChatLoaded}
          contactedFounderIds={contactedFounderIds}
          onApplyProfilePatch={handleApplyAgentProfilePatch}
          onPersistMessages={handlePersistAgentChat}
          onStartNewConversation={handleStartNewAgentConversation}
          onRememberConversation={handleRememberAgentConversation}
          onSendOutreach={handleAgentOutreach}
          pageMode
        />
      ) : (
        <FounderAgentChat
          className="h-full min-h-0"
          founder={founderAgentContext}
          memories={agentMemories}
          threadId={activeAgentThreadId}
          persistedMessages={agentChatMessages}
          persistedMessagesLoaded={agentChatLoaded}
          contactedInvestorIds={contactedInvestorIds}
          onApplyProfilePatch={handleApplyAgentProfilePatch}
          onPersistMessages={handlePersistAgentChat}
          onStartNewConversation={handleStartNewAgentConversation}
          onRememberConversation={handleRememberAgentConversation}
          onSendIntro={handleFounderIntro}
          onAmplify={handleFounderAmplify}
          pageMode
        />
      )}

    </motion.div>
  );

  const isMessagesView = activeView === 'messages';
  const isAgentView = activeView === 'agent';
  const isVCHeatMapView = activeView === 'vc-heatmap';
  // The full header (workspace/For-You toggle + global search + bell) shows on
  // the two top-level feed views — Overview and For You.
  const showWorkspaceHeader = activeView === 'overview' || activeView === 'for-you';

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
      <div className="monad-app flex min-h-screen items-center justify-center bg-parchment px-4">
        <div className="w-full max-w-lg">
          <div className="mb-8 flex items-center gap-2">
            <LogoIcon className="h-6 w-6 text-black" />
            <img src="/apparent-wordmark.png" alt="Apparent" className="h-6 w-auto object-contain" />
          </div>

          <div className="mb-6 flex items-center gap-2">
            {onboardingSteps.map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors ${i <= onboardingStep ? (isInvestor ? 'bg-green-700' : 'bg-[#37d28b]') : 'bg-black/10'}`}
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

  // Notification bell + dropdown — reused across the overview flow header and
  // the floating top-right placement on section pages.
  // Lives in the sidebar footer (next to Settings) — the dashboard has no top
  // bar, so the panel opens sideways out of the rail rather than downward.
  const notificationBell = (
    <div className="relative">
      <button
        className="flex h-8 w-full flex-row items-center rounded-md px-2 py-1.5 text-muted-foreground transition hover:bg-muted hover:text-primary"
        onClick={handleToggleNotifications}
        aria-label="Toggle notifications"
        title="Notifications"
      >
        <span className="relative shrink-0">
          <Bell className="h-4 w-4" />
          {unreadNotificationCount > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-semibold leading-none text-white">
              {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
            </span>
          )}
        </span>
        <span className="ml-2 truncate text-sm font-medium group-data-[collapsed=true]/rail:hidden">Notifications</span>
      </button>
      {showNotifications && (
        <div className="absolute bottom-0 left-full z-50 ml-2 w-80 rounded-2xl border border-black/10 bg-white p-4 shadow-xl">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-semibold">Notifications</p>
            <button onClick={() => setShowNotifications(false)} aria-label="Close notifications">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="max-h-96 space-y-2 overflow-y-auto">
            {notifications.length === 0 && activity.length === 0 && (
              <p className="rounded-xl bg-gray-50 p-3 text-sm text-gray-500">
                You're all caught up. Matches and replies will show up here.
              </p>
            )}
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`rounded-xl border p-3 text-sm ${
                  notification.readAt ? 'border-transparent bg-gray-50 text-gray-700' : 'border-lavender bg-[#eef2fb] text-gray-800'
                }`}
              >
                <p className="font-semibold leading-snug">{notification.title}</p>
                {notification.body && <p className="mt-0.5 text-[13px] text-gray-600">{notification.body}</p>}
                <p className="mt-1 text-[11px] text-gray-400">{formatRelativeTime(notification.createdAt)}</p>
              </div>
            ))}
            {activity.length > 0 && (
              <>
                <p className="px-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">This session</p>
                {activity.map((item) => (
                  <div key={item} className="rounded-xl bg-gray-50 p-3 text-sm text-gray-700">
                    {item}
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="monad-app ed-dashboard min-h-screen text-ink" data-role={role}>
      <SessionNavBar
        role={role}
        user={user}
        activated={profileSaved}
        unreadMessages={totalUnreadMessages}
        agentThreads={agentChatThreads}
        activeAgentThreadId={activeAgentThreadId}
        onStartNewAgentConversation={handleStartNewAgentConversation}
        onDeleteAgentThread={handleDeleteAgentConversation}
        notificationSlot={notificationBell}
      />

      <main className="ed-dashboard-main min-h-screen pl-[16.25rem]">
        <div className={isVCHeatMapView ? 'min-h-screen' : isAgentView ? 'ed-dashboard-frame relative flex h-screen w-full flex-col overflow-hidden bg-[#fdf9f7]' : isMessagesView ? 'ed-dashboard-frame relative mx-auto flex h-screen w-full max-w-[1440px] flex-col overflow-hidden px-6 pt-6' : showWorkspaceHeader ? 'ed-dashboard-frame mx-auto max-w-[1440px] px-6 py-6' : 'ed-dashboard-frame relative mx-auto max-w-[1440px] px-6 pb-6 pt-6'}>
          {/* No top bar on any dashboard view — every section owns its own
              in-context controls, and notifications live in the sidebar rail. */}

          {dashboardError && (
            <div className="mb-4 border-y border-red-200 bg-red-50 px-5 py-3 text-sm text-red-700">
              {dashboardError}
            </div>
          )}

          {isDashboardLoading ? (
            /* Skeleton — shown on first-ever load (no cache). Matches the
               profile/overview card layout so the page feels structured
               rather than blank. Disappears as soon as any data arrives. */
            <div className="mx-auto max-w-[1292px] animate-pulse space-y-6" aria-hidden="true">
              {/* Hero card */}
              <div className="rounded-[20px] border border-black/10 bg-white px-5 py-5 shadow-[0_10px_34px_rgba(0,0,0,0.04)]">
                <div className="flex items-center gap-4">
                  <div className="h-24 w-24 shrink-0 rounded-[24px] bg-gray-200" />
                  <div className="flex-1 space-y-3">
                    <div className="h-7 w-48 rounded-lg bg-gray-200" />
                    <div className="h-4 w-72 rounded bg-gray-200" />
                    <div className="h-6 w-32 rounded-full bg-gray-200" />
                  </div>
                </div>
              </div>

              {/* Two-column grid */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
                {/* Main cards */}
                <div className="space-y-6">
                  <div className="rounded-[20px] border border-black/10 bg-white px-5 py-5 shadow-[0_10px_34px_rgba(0,0,0,0.04)]">
                    <div className="mb-4 h-5 w-40 rounded bg-gray-200" />
                    <div className="space-y-3">
                      <div className="h-9 rounded-lg bg-gray-100" />
                      <div className="h-9 rounded-lg bg-gray-100" />
                      <div className="h-20 rounded-lg bg-gray-100" />
                    </div>
                  </div>
                  <div className="rounded-[20px] border border-black/10 bg-white px-5 py-5 shadow-[0_10px_34px_rgba(0,0,0,0.04)]">
                    <div className="mb-4 h-5 w-48 rounded bg-gray-200" />
                    <div className="grid grid-cols-2 gap-3">
                      <div className="h-9 rounded-lg bg-gray-100" />
                      <div className="h-9 rounded-lg bg-gray-100" />
                      <div className="h-9 rounded-lg bg-gray-100" />
                      <div className="h-9 rounded-lg bg-gray-100" />
                    </div>
                  </div>
                  <div className="rounded-[20px] border border-black/10 bg-white px-5 py-5 shadow-[0_10px_34px_rgba(0,0,0,0.04)]">
                    <div className="mb-4 h-5 w-36 rounded bg-gray-200" />
                    <div className="space-y-3">
                      <div className="h-9 rounded-lg bg-gray-100" />
                      <div className="h-9 rounded-lg bg-gray-100" />
                    </div>
                  </div>
                </div>

                {/* Sidebar cards */}
                <div className="space-y-6">
                  <div className="rounded-[20px] border border-black/10 bg-white px-5 py-5 shadow-[0_10px_34px_rgba(0,0,0,0.04)]">
                    <div className="mb-4 h-5 w-28 rounded bg-gray-200" />
                    <div className="space-y-2">
                      <div className="h-8 rounded-lg bg-gray-100" />
                      <div className="h-8 rounded-lg bg-gray-100" />
                      <div className="h-8 rounded-lg bg-gray-100" />
                      <div className="h-8 rounded-lg bg-gray-100" />
                    </div>
                  </div>
                  <div className="rounded-[20px] border border-black/10 bg-white px-5 py-5 shadow-[0_10px_34px_rgba(0,0,0,0.04)]">
                    <div className="mb-3 h-5 w-32 rounded bg-gray-200" />
                    <div className="h-28 rounded-lg bg-gray-100" />
                  </div>
                  <div className="rounded-[20px] border border-black/10 bg-white px-5 py-5 shadow-[0_10px_34px_rgba(0,0,0,0.04)]">
                    <div className="mb-3 h-5 w-24 rounded bg-gray-200" />
                    <div className="space-y-2">
                      <div className="h-6 w-full rounded bg-gray-100" />
                      <div className="h-6 w-4/5 rounded bg-gray-100" />
                      <div className="h-6 w-3/5 rounded bg-gray-100" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
          <>
          <AnimatePresence mode="wait" initial={false}>
            {activeView === 'agent' ? (
              renderAgentPage()
            ) : activeView === 'profile' ? (
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
            ) : activeView === 'settings' ? (
              renderSettingsPage()
            ) : activeView === 'vc-heatmap' ? (
              <motion.div
                key="vc-heatmap-main"
                id="vc-heatmap"
                initial={{ opacity: 0, y: 10, filter: 'blur(2px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -8, filter: 'blur(2px)' }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
              >
                <HeatMap
                  includeVCContacts
                  vcOnly
                  fullBleed
                  founderStage={intakeValues.stage}
                  founderSectors={intakeValues.category}
                  currentUser={user}
                  founderName={intakeValues.profileName || user.username || user.email.split('@')[0]}
                  founderCompany={productLaunches[0]?.name || intakeValues.currentBuild || ''}
                  founderTraction={productLaunches[0]?.metrics || intakeValues.traction || ''}
                />
              </motion.div>
            ) : activeView === 'overview' ? (
              isInvestor ? (
                renderInvestorOverviewPage()
              ) : (
                <motion.div
                  key="workspace-main"
                  initial={{ opacity: 0, y: 10, filter: 'blur(2px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: -8, filter: 'blur(2px)' }}
                  transition={{ duration: 0.22, ease: 'easeOut' }}
                >
                  {renderOnboardingChecklist()}
                  {!isInvestor && (
                    <div className="mx-auto mt-6 max-w-[1292px] space-y-4">
                      <FounderDossierCard user={user} />
                    </div>
                  )}
                  <div id="overview" className="scroll-mt-24">
                    <div className="mx-auto mt-8 max-w-[1292px]">
                      {renderNetworkMapSection()}
                    </div>
                  </div>
                </motion.div>
              )
            ) : activeView === 'daily' && isInvestor ? (
              renderDailyDigestPage()
            ) : activeView === 'for-you' ? (
              renderForYouLaunchPage()
            ) : activeView === 'outreach' && !isInvestor ? (
              renderFounderOutreachKanban()
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
                  <div className="overflow-hidden rounded-[20px] border border-black/10 bg-white shadow-[0_10px_34px_rgba(0,0,0,0.04)]">
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
                        <article key={item.title} className="px-5 py-5 transition-colors hover:bg-[#f6f3f1]">
                          <button
                            className="w-full text-left"
                            onClick={() => addActivity(`Opened feed item: ${item.title}`)}
                          >
                            <div className="flex items-start gap-3">
                              <div
                                className={`mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-semibold ${
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
                    <section className="rounded-[20px] border border-black/10 bg-white shadow-[0_10px_34px_rgba(0,0,0,0.04)] py-4">
                      <p className="px-4 text-xs font-medium uppercase tracking-wide text-gray-500">Trending signals</p>
                      <div className="mt-3 divide-y divide-black/10">
                        {feedItems.filter((item) => item.source === 'Front page').slice(0, 3).map((item) => (
                          <button
                            key={item.title}
                            className="w-full px-4 py-3 text-left transition-colors hover:bg-[#f6f3f1]"
                            onClick={() => addActivity(`Opened trend: ${item.title}`)}
                          >
                            <p className="text-sm font-medium leading-snug">{item.tag}</p>
                            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-gray-500">{item.title}</p>
                          </button>
                        ))}
                      </div>
                    </section>

                    <section className="rounded-[20px] border border-black/10 bg-white shadow-[0_10px_34px_rgba(0,0,0,0.04)] py-4">
                      <p className="px-4 text-xs font-medium uppercase tracking-wide text-gray-500">
                        {isInvestor ? 'Builders to watch' : 'Investors to watch'}
                      </p>
                      <div className="mt-3 divide-y divide-black/10">
                        {filteredMatches.slice(0, 3).map((match) => (
                          <button
                            key={match.name}
                            className="w-full px-4 py-3 text-left transition-colors hover:bg-[#f6f3f1]"
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
                          className="mx-4 mt-3 rounded-full border border-black/10 px-4 py-2 text-sm font-medium hover:bg-[#f6f3f1]"
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
                  null
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
          </>
          )} {/* end isDashboardLoading ternary */}
        </div>
      </main>

      {pointerDrag && (
        <div
          className={`pointer-events-none fixed z-[60] rounded-xl ${accentSurface} px-3 py-2 text-xs font-medium ${accentForeground} shadow-xl`}
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
                    placeholder={isInvestor ? 'Sector and stage focus' : 'Product or market focus'}
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
