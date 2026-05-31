import {
  cityCoordinates,
  cityGeoCoordinates,
  defaultFounderProfile,
  defaultInvestorCriteria,
  generalFeedDefaults,
  seedBuilderNodes,
  seedInvestorSignals,
  seedMeetups,
} from '@/lib/app-defaults';
import type {
  AppUser,
  BuilderDiscoveryState,
  BuilderMapCluster,
  BuilderNode,
  BuilderProofLink,
  DashboardData,
  DashboardRole,
  FeedItem,
  FounderProfileValues,
  InvestorCriteriaValues,
  InvestorDealStage,
  InvestorSignal,
  LaunchEngagementEntry,
  LaunchTeamMember,
  Meetup,
  NetworkCluster,
  PublicFounderProfile,
  PublicProfileResult,
  PublicProjectDetail,
  ProductLaunch,
  TermReview,
  VCContact,
  UserMessage,
  UserSettings,
  VcInterestEntry,
} from '@/lib/apparent-types';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { getStaticFounderProfile } from '@/lib/static-founder-profiles';

const settingsDefault: UserSettings = {
  dailyDigestEnabled: true,
  slackAlertsEnabled: true,
};

const PUBLIC_LAUNCHES_STORAGE_KEY = 'apparent:public-product-launches';

const storageKey = (user: AppUser, suffix: string) => `apparent:${user.id}:${suffix}`;

const readLocal = <T,>(key: string, fallback: T): T => {
  const raw = window.localStorage.getItem(key);
  if (!raw) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(fallback)
      ? ((Array.isArray(parsed) ? parsed : fallback) as T)
      : ({ ...fallback, ...parsed } as T);
  } catch {
    window.localStorage.removeItem(key);
    return fallback;
  }
};

const writeLocal = (key: string, value: unknown) => {
  window.localStorage.setItem(key, JSON.stringify(value));
};

export const readPublicProductLaunches = () =>
  readLocal<ProductLaunch[]>(PUBLIC_LAUNCHES_STORAGE_KEY, []);

const publishLocalLaunch = (launch: ProductLaunch) => {
  const current = readPublicProductLaunches();
  writeLocal(PUBLIC_LAUNCHES_STORAGE_KEY, [
    launch,
    ...current.filter((item) => item.id !== launch.id),
  ]);
};

const toTextTokens = (value: string) =>
  value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 2);

const textIncludesAny = (source: string, tokens: string[]) => {
  const normalizedSource = source.toLowerCase();
  return tokens.some((token) => normalizedSource.includes(token));
};

const sourceWeight = (sourceType: string) => {
  const lower = sourceType.toLowerCase();
  if (lower.includes('github')) return 14;
  if (lower.includes('launch')) return 12;
  if (lower.includes('customer')) return 10;
  if (lower.includes('hn')) return 8;
  return 5;
};

const freshnessWeight = (freshnessAt: string) => {
  const ageMs = Date.now() - new Date(freshnessAt).getTime();
  const ageHours = ageMs / (1000 * 60 * 60);
  if (Number.isNaN(ageHours) || ageHours < 0) return 8;
  if (ageHours <= 2) return 16;
  if (ageHours <= 24) return 12;
  if (ageHours <= 72) return 8;
  return 4;
};

const formatFreshness = (freshnessAt: string) => {
  const ageMs = Date.now() - new Date(freshnessAt).getTime();
  const minutes = Math.max(1, Math.round(ageMs / (1000 * 60)));

  if (minutes < 60) {
    return `${minutes} min ago`;
  }

  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.round(hours / 24);
  return days === 1 ? 'Yesterday' : `${days}d ago`;
};

const generateOutreachDraft = (signal: InvestorSignal, criteria: InvestorCriteriaValues) => {
  const thesis = criteria.thesis.trim() || 'our current investment thesis';
  const founderSignals = criteria.founderSignals.trim() || 'public proof, freshness, and founder-market fit';

  return `${signal.founder}, ${signal.company} stood out because of ${signal.source.toLowerCase()} and the way it maps to ${thesis}. We pay close attention to ${founderSignals}. Open to comparing notes this week?`;
};

const calculateRelevance = (signal: InvestorSignal, criteria: InvestorCriteriaValues) => {
  const haystack = [
    signal.company,
    signal.founder,
    signal.detail,
    signal.source,
    signal.stage,
    signal.location,
    signal.rawTags.join(' '),
  ].join(' ');

  let score = 42;
  if (textIncludesAny(haystack, toTextTokens(criteria.thesis))) score += 14;
  if (textIncludesAny(haystack, toTextTokens(criteria.sectors))) score += 12;
  if (criteria.stage && signal.stage.toLowerCase().includes(criteria.stage.toLowerCase())) score += 8;
  if (textIncludesAny(signal.location, toTextTokens(criteria.geography))) score += 6;
  if (textIncludesAny(haystack, toTextTokens(criteria.founderSignals))) score += 10;
  if (textIncludesAny(haystack, toTextTokens(criteria.portfolioExamples))) score += 5;

  score += sourceWeight(signal.sourceType);
  score += freshnessWeight(signal.freshnessAt);

  if (criteria.passSignals && textIncludesAny(haystack, toTextTokens(criteria.passSignals))) {
    score -= 18;
  }

  return Math.max(1, Math.min(99, score));
};

const mapSourceRow = (row: Record<string, unknown>): InvestorSignal => ({
  id: String(row.id),
  company: String(row.company ?? ''),
  founder: String(row.founder ?? ''),
  detail: String(row.detail ?? ''),
  source: String(row.source_type ?? ''),
  sourceUrl: String(row.source_url ?? '#'),
  profileUrl: String(row.profile_url ?? '#'),
  relevance: 1,
  freshness: formatFreshness(String(row.freshness_at ?? new Date().toISOString())),
  stage: String(row.stage ?? ''),
  location: String(row.location ?? ''),
  column: 'New',
  outreach: '',
  sourceType: String(row.source_type ?? ''),
  freshnessAt: String(row.freshness_at ?? new Date().toISOString()),
  githubUrl: String(row.github_url ?? ''),
  rawTags: Array.isArray(row.raw_tags) ? (row.raw_tags as string[]) : [],
});

const mapCriteriaRow = (row: Record<string, unknown> | null): InvestorCriteriaValues => ({
  ...defaultInvestorCriteria,
  thesis: String(row?.thesis ?? ''),
  sectors: String(row?.sectors ?? ''),
  stage: String(row?.stage ?? ''),
  checkSize: String(row?.check_size ?? ''),
  geography: String(row?.geography ?? ''),
  founderSignals: String(row?.founder_signals ?? ''),
  passSignals: String(row?.pass_signals ?? ''),
  portfolioExamples: String(row?.portfolio_examples ?? ''),
  publicProfileEnabled: String(row?.public_profile_enabled === true ? 'true' : 'false'),
  publicFields: JSON.stringify(
    Array.isArray(row?.public_fields) ? row.public_fields : ['thesis', 'sectors', 'stage', 'geography'],
  ),
  shareable: (row?.shareable ?? true) === false ? 'false' : 'true',
});

const mapFounderRow = (row: Record<string, unknown> | null): FounderProfileValues => ({
  ...defaultFounderProfile,
  profileName: String(row?.profile_name ?? row?.profileName ?? ''),
  headline: String(row?.headline ?? ''),
  bio: String(row?.bio ?? ''),
  profilePhotoUrl: String(row?.profile_photo_url ?? row?.profilePhotoUrl ?? ''),
  currentBuild: String(row?.current_build ?? ''),
  category: String(row?.category ?? ''),
  stage: String(row?.stage ?? ''),
  github: String(row?.github ?? ''),
  traction: String(row?.traction ?? ''),
  mrr: String(row?.mrr ?? ''),
  lookingFor: String(row?.looking_for ?? ''),
  location: String(row?.location ?? ''),
  press: String(row?.press ?? ''),
  website: String(row?.website ?? ''),
  linkedin: String(row?.linkedin ?? ''),
  xProfile: String(row?.x_profile ?? row?.xProfile ?? ''),
  pastProducts: String(row?.past_products ?? row?.pastProducts ?? ''),
  fundraisingStatus: String(row?.fundraising_status ?? row?.fundraisingStatus ?? 'not_raising'),
  raisingRound: String(row?.raising_round ?? row?.raisingRound ?? ''),
  raisingAmount: String(row?.raising_amount ?? row?.raisingAmount ?? ''),
  raisingAsk: String(row?.raising_ask ?? row?.raisingAsk ?? ''),
  openToContact: (row?.open_to_contact ?? row?.openToContact ?? true) === false ? 'false' : 'true',
  shareable: (row?.shareable ?? true) === false ? 'false' : 'true',
});

const completedLabels = (values: Record<string, string>, labelByKey: Record<string, string>) =>
  Object.entries(values)
    .filter(([, value]) => value.trim())
    .map(([key]) => labelByKey[key] ?? key);

const toIntakeRecord = (values: InvestorCriteriaValues | FounderProfileValues): Record<string, string> => ({
  ...values,
});

const localId = (prefix: string) =>
  `${prefix}-${typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Date.now()}`;

const nowIso = () => new Date().toISOString();

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72);

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(
    new Date(value),
  );

const toStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).filter(Boolean);
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map((item) => String(item)).filter(Boolean) : value.split(',').map((item) => item.trim()).filter(Boolean);
    } catch {
      return value.split(',').map((item) => item.trim()).filter(Boolean);
    }
  }

  return [];
};

const mapProductLaunchRow = (row: Record<string, unknown>): ProductLaunch => ({
  id: String(row.id),
  ownerId: String(row.owner_id ?? row.ownerId ?? ''),
  slug: String(row.slug ?? ''),
  name: String(row.name ?? ''),
  tagline: String(row.tagline ?? ''),
  intro: String(row.intro ?? ''),
  category: String(row.category ?? ''),
  stage: String(row.stage ?? ''),
  location: String(row.location ?? ''),
  launchUrl: String(row.launch_url ?? row.launchUrl ?? ''),
  proofUrl: String(row.proof_url ?? row.proofUrl ?? ''),
  logoUrl: String(row.logo_url ?? row.logoUrl ?? ''),
  bannerUrl: String(row.banner_url ?? row.bannerUrl ?? ''),
  demoVideoUrl: String(row.demo_video_url ?? row.demoVideoUrl ?? ''),
  pitchVideoUrl: String(row.pitch_video_url ?? row.pitchVideoUrl ?? ''),
  pitchDeckUrl: String(row.pitch_deck_url ?? row.pitchDeckUrl ?? ''),
  pitchBookNote: String(row.pitch_book_note ?? row.pitchBookNote ?? ''),
  pitchVisibility: (row.pitch_visibility ?? row.pitchVisibility) === 'investors' ? 'investors' : 'public',
  founderSignals: toStringArray(row.founder_signals ?? row.founderSignals),
  teamSummary: String(row.team_summary ?? row.teamSummary ?? ''),
  customerSummary: String(row.customer_summary ?? row.customerSummary ?? ''),
  techStack: String(row.tech_stack ?? row.techStack ?? ''),
  fundingStatus: String(row.funding_status ?? row.fundingStatus ?? ''),
  lookingFor: String(row.looking_for ?? row.lookingFor ?? ''),
  publicProfileEnabled: Boolean(row.public_profile_enabled ?? row.publicProfileEnabled ?? true),
  metrics: String(row.metrics ?? ''),
  upvoteCount: Number(row.upvote_count ?? row.upvoteCount ?? 0),
  updatedAt: String(row.updated_at ?? row.updatedAt ?? nowIso()),
});

const mapTeamMemberRow = (row: Record<string, unknown>): LaunchTeamMember => ({
  id: String(row.id ?? ''),
  launchId: String(row.launch_id ?? row.launchId ?? ''),
  ownerId: String(row.owner_id ?? row.ownerId ?? ''),
  apparentUserId: String(row.apparent_user_id ?? row.apparentUserId ?? ''),
  name: String(row.name ?? ''),
  role: String(row.role ?? ''),
  bio: String(row.bio ?? ''),
  location: String(row.location ?? ''),
  avatarUrl: String(row.avatar_url ?? row.avatarUrl ?? ''),
  profileUrl: String(row.profile_url ?? row.profileUrl ?? ''),
  linkedinUrl: String(row.linkedin_url ?? row.linkedinUrl ?? ''),
  xProfileUrl: String(row.x_profile_url ?? row.xProfileUrl ?? ''),
  githubUrl: String(row.github_url ?? row.githubUrl ?? ''),
  sortOrder: Number(row.sort_order ?? row.sortOrder ?? 0),
});

const mapVCContactRow = (row: Record<string, unknown>): VCContact => ({
  id: String(row.id ?? ''),
  investorName: String(row.investor_name ?? row.investorName ?? ''),
  fundType: String(row.fund_type ?? row.fundType ?? ''),
  fundStage: String(row.fund_stage ?? row.fundStage ?? ''),
  website: String(row.website ?? ''),
  fundFocusSectors: String(row.fund_focus_sectors ?? row.fundFocusSectors ?? ''),
  partnerName: String(row.partner_name ?? row.partnerName ?? ''),
  partnerEmail: String(row.partner_email ?? row.partnerEmail ?? ''),
  portfolioCompanies: String(row.portfolio_companies ?? row.portfolioCompanies ?? ''),
  location: String(row.location ?? ''),
  normalizedCity: String(row.normalized_city ?? row.normalizedCity ?? ''),
  latitude: row.latitude === null || row.latitude === undefined ? null : Number(row.latitude),
  longitude: row.longitude === null || row.longitude === undefined ? null : Number(row.longitude),
  twitterUrl: String(row.twitter_url ?? row.twitterUrl ?? ''),
  linkedinUrl: String(row.linkedin_url ?? row.linkedinUrl ?? ''),
  facebookUrl: String(row.facebook_url ?? row.facebookUrl ?? ''),
  numberOfInvestments: Number(row.number_of_investments ?? row.numberOfInvestments ?? 0),
  numberOfExits: Number(row.number_of_exits ?? row.numberOfExits ?? 0),
  fundDescription: String(row.fund_description ?? row.fundDescription ?? ''),
  foundingYear: row.founding_year === null || row.founding_year === undefined ? null : Number(row.founding_year),
});

const parseTeamMembersText = (value: string | undefined): LaunchTeamMember[] =>
  (value ?? '')
    .split('\n')
    .map((line, index) => {
      const [name = '', role = '', bio = '', profileUrl = ''] = line
        .split(/\s+[—-]\s+|\s+\|\s+/)
        .map((part) => part.trim());

      return {
        name,
        role,
        bio,
        profileUrl,
        location: '',
        avatarUrl: '',
        linkedinUrl: '',
        xProfileUrl: '',
        githubUrl: '',
        sortOrder: index,
      };
    })
    .filter((member) => member.name);

export const serializeTeamMembers = (members: LaunchTeamMember[] | undefined) =>
  (members ?? [])
    .filter((member) => member.name.trim())
    .map((member) => [member.name, member.role, member.bio, member.profileUrl].filter(Boolean).join(' - '))
    .join('\n');

const mapPublicFounderProfile = (
  row: Record<string, unknown> | null,
  launches: ProductLaunch[],
  username = '',
): PublicFounderProfile | null => {
  if (!row) return null;

  return {
    userId: String(row.user_id ?? ''),
    username: String(row.username ?? username),
    profileName: String(row.profile_name ?? '') || String(row.display_name ?? ''),
    headline: String(row.headline ?? ''),
    bio: String(row.bio ?? ''),
    profilePhotoUrl: String(row.profile_photo_url ?? ''),
    currentBuild: String(row.current_build ?? ''),
    category: String(row.category ?? ''),
    stage: String(row.stage ?? ''),
    github: String(row.github ?? ''),
    traction: String(row.traction ?? ''),
    mrr: String(row.mrr ?? ''),
    lookingFor: String(row.looking_for ?? ''),
    location: String(row.location ?? ''),
    press: String(row.press ?? ''),
    website: String(row.website ?? ''),
    linkedin: String(row.linkedin ?? ''),
    xProfile: String(row.x_profile ?? ''),
    pastProducts: String(row.past_products ?? ''),
    fundraisingStatus: String(row.fundraising_status ?? 'not_raising'),
    raisingRound: String(row.raising_round ?? ''),
    raisingAmount: String(row.raising_amount ?? ''),
    raisingAsk: String(row.raising_ask ?? ''),
    openToContact: row.open_to_contact !== false,
    shareable: row.shareable !== false,
    launches,
  };
};

const mapMeetupRow = (
  row: Record<string, unknown>,
  attendeeCount = 0,
  isJoined = false,
): Meetup => ({
  id: String(row.id),
  hostId: String(row.host_id ?? row.hostId ?? ''),
  hostRole: (row.host_role ?? row.hostRole) === 'founder' ? 'founder' : 'investor',
  title: String(row.title ?? ''),
  audience: String(row.audience ?? ''),
  city: String(row.city ?? ''),
  venue: String(row.venue ?? ''),
  startsAt: String(row.starts_at ?? row.startsAt ?? nowIso()),
  capacity: Number(row.capacity ?? 0),
  description: String(row.description ?? ''),
  attendeeCount,
  isJoined,
});

// Collapse duplicate meetups (same title/city/venue) — seed meetups got
// inserted more than once, so the same event would otherwise list repeatedly.
const dedupeMeetups = (items: Meetup[]): Meetup[] => {
  const seen = new Set<string>();
  return items.filter((meetup) => {
    const key = `${meetup.title}|${meetup.city}|${meetup.venue}`.toLowerCase().trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const mapTermReviewRow = (row: Record<string, unknown>): TermReview => ({
  id: String(row.id),
  ownerId: String(row.user_id ?? row.ownerId ?? ''),
  company: String(row.company ?? ''),
  instrument: String(row.instrument ?? ''),
  amount: String(row.amount ?? ''),
  valuation: String(row.valuation ?? ''),
  proRata: String(row.pro_rata ?? row.proRata ?? ''),
  notes: String(row.notes ?? ''),
  status: String(row.status ?? 'Reviewing'),
  updatedAt: String(row.updated_at ?? row.updatedAt ?? nowIso()),
});

const mapMessageRow = (row: Record<string, unknown>): UserMessage => ({
  id: String(row.id),
  ownerId: String(row.owner_id ?? row.ownerId ?? ''),
  recipient: String(row.recipient ?? ''),
  recipientId: String(row.recipient_id ?? row.recipientId ?? ''),
  senderName: String(row.sender_name ?? row.senderName ?? ''),
  subject: String(row.subject ?? ''),
  body: String(row.body ?? ''),
  status: row.status === 'sent' || row.status === 'replied' ? row.status : 'draft',
  context: String(row.context ?? ''),
  updatedAt: String(row.updated_at ?? row.updatedAt ?? nowIso()),
});

const normalizeCity = (value: string) => {
  const cleanValue = value.trim();
  if (!cleanValue) return 'Remote';
  if (cleanValue.toLowerCase().includes('remote')) return 'Remote';
  if (cleanValue.toLowerCase().includes('brooklyn')) return 'Brooklyn';
  if (cleanValue.toLowerCase().includes('nyc') || cleanValue.toLowerCase().includes('new york')) return 'New York';
  if (cleanValue.toLowerCase().includes('sf') || cleanValue.toLowerCase().includes('san francisco')) return 'San Francisco';
  return cleanValue
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean)[0] ?? 'Remote';
};

const coordinatesForCity = (city: string) => {
  const normalizedCity = normalizeCity(city);
  return cityGeoCoordinates[normalizedCity] ?? cityGeoCoordinates.Remote;
};

const mergeUnique = (values: string[], limit = 4) =>
  Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).slice(0, limit);

const latestIso = (values: string[]) =>
  values
    .filter(Boolean)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? nowIso();

const mapBuilderDiscoveryRow = (row: Record<string, unknown>): BuilderDiscoveryState => ({
  userId: String(row.user_id ?? row.userId ?? ''),
  builderId: String(row.builder_id ?? row.builderId ?? ''),
  saved: Boolean(row.saved),
  hidden: Boolean(row.hidden),
  stage:
    row.stage === 'New' ||
    row.stage === 'Reviewing' ||
    row.stage === 'Reached Out' ||
    row.stage === 'Meeting' ||
    row.stage === 'Watchlist'
      ? row.stage
      : '',
  note: String(row.note ?? ''),
  outreachBody: String(row.outreach_body ?? row.outreachBody ?? ''),
  updatedAt: String(row.updated_at ?? row.updatedAt ?? nowIso()),
});

const defaultBuilderDiscoveryState = (user: AppUser, builderId: string): BuilderDiscoveryState => ({
  userId: user.id,
  builderId,
  saved: false,
  hidden: false,
  stage: '',
  note: '',
  outreachBody: '',
  updatedAt: nowIso(),
});

const mapBuilderProfileRows = (
  profileRows: Record<string, unknown>[],
  launchRows: ProductLaunch[],
  currentUserId: string,
): BuilderNode[] => {
  const launchesByOwner = launchRows.reduce<Record<string, ProductLaunch[]>>((groups, launch) => {
    groups[launch.ownerId] = groups[launch.ownerId] ?? [];
    groups[launch.ownerId].push(launch);
    return groups;
  }, {});

  return profileRows
    .map((profile) => {
      const founderId = String(profile.user_id ?? '');
      const launches = launchesByOwner[founderId] ?? [];
      const latestLaunch = launches[0];
      const category = String(profile.category ?? latestLaunch?.category ?? '');
      const stage = String(profile.stage ?? latestLaunch?.stage ?? '');
      const city = normalizeCity(String(profile.location ?? ''));
      const coords = coordinatesForCity(city);
      const githubUrl = String(profile.github ?? '');
      const pressUrl = String(profile.press ?? latestLaunch?.proofUrl ?? '');
      const launchUrl = latestLaunch?.launchUrl ?? '';
      const proofLinks: BuilderProofLink[] = [
        githubUrl ? { label: 'GitHub', url: githubUrl, type: 'github' } : null,
        launchUrl ? { label: 'Launch', url: launchUrl, type: 'launch' } : null,
        pressUrl ? { label: 'Proof', url: pressUrl, type: 'proof' } : null,
      ].filter(Boolean) as BuilderProofLink[];
      const latestActivity = latestIso([
        String(profile.updated_at ?? ''),
        ...launches.map((launch) => launch.updatedAt),
      ]);
      const company =
        latestLaunch?.name ||
        String(profile.headline ?? '')
          .split(/[.;]/)[0]
          .slice(0, 42)
          .trim() ||
        String(profile.current_build ?? '')
          .split(/[.;]/)[0]
          .slice(0, 42)
          .trim() ||
        'Apparent builder';

      return {
        id: founderId,
        founderId,
        founderName: String(profile.profile_name ?? '') || (company === 'Apparent builder' ? 'Apparent builder' : `${company} builder`),
        company,
        displayLabel: company,
        buildSummary: String(profile.bio ?? profile.headline ?? profile.current_build ?? latestLaunch?.tagline ?? ''),
        category,
        stage,
        location: city,
        latitude: coords.latitude,
        longitude: coords.longitude,
        proofLinks,
        traction: String(profile.traction ?? latestLaunch?.metrics ?? ''),
        launchCount: launches.length,
        latestActivity,
        latestActivityLabel: formatFreshness(latestActivity),
        fitScore: 50,
        matchReasons: [],
        profileUrl: `/profile/${founderId}`,
        githubUrl,
        pressUrl,
        launchUrl,
        rawTags: mergeUnique([category, stage, String(profile.looking_for ?? ''), ...launches.map((launch) => launch.category)], 8),
        isCurrentUser: founderId === currentUserId,
        origin: 'apparent' as const,
        fundraisingStatus: (['raising', 'open'].includes(String(profile.fundraising_status))
          ? String(profile.fundraising_status)
          : 'not_raising') as 'raising' | 'open' | 'not_raising',
        raisingRound: String(profile.raising_round ?? ''),
        raisingAmount: String(profile.raising_amount ?? ''),
        openToContact: profile.open_to_contact !== false,
      };
    })
    .filter((builder) =>
      [builder.buildSummary, builder.category, builder.stage, builder.location, builder.githubUrl, builder.pressUrl, builder.company].some(
        (value) => value.trim(),
      ),
    );
};

const localFounderBuilderNode = (
  user: AppUser,
  founderProfile: FounderProfileValues,
  launches: ProductLaunch[],
): BuilderNode | null => {
  const hasProfile = Object.values(founderProfile).some((value) => value.trim()) || launches.length > 0;
  if (!hasProfile) return null;

  const latestLaunch = launches[0];
  const city = normalizeCity(founderProfile.location);
  const coords = coordinatesForCity(city);
  const company =
    latestLaunch?.name ||
    founderProfile.headline
      .split(/[.;]/)[0]
      .slice(0, 42)
      .trim() ||
    founderProfile.currentBuild
      .split(/[.;]/)[0]
      .slice(0, 42)
      .trim() ||
    'Your builder profile';
  const latestActivity = latestIso([latestLaunch?.updatedAt ?? nowIso()]);
  const proofLinks: BuilderProofLink[] = [
    founderProfile.github ? { label: 'GitHub', url: founderProfile.github, type: 'github' } : null,
    latestLaunch?.launchUrl ? { label: 'Launch', url: latestLaunch.launchUrl, type: 'launch' } : null,
    founderProfile.press ? { label: 'Proof', url: founderProfile.press, type: 'proof' } : null,
  ].filter(Boolean) as BuilderProofLink[];

  return {
    id: user.id,
    founderId: user.id,
    founderName: founderProfile.profileName || user.email || 'You',
    company,
    displayLabel: `${company} (you)`,
    buildSummary: founderProfile.bio || founderProfile.headline || founderProfile.currentBuild || latestLaunch?.tagline || 'Founder profile on Apparent.',
    category: founderProfile.category || latestLaunch?.category || '',
    stage: founderProfile.stage || latestLaunch?.stage || '',
    location: city,
    latitude: coords.latitude,
    longitude: coords.longitude,
    proofLinks,
    traction: founderProfile.traction || latestLaunch?.metrics || '',
    launchCount: launches.length,
    latestActivity,
    latestActivityLabel: formatFreshness(latestActivity),
    fitScore: 70,
    matchReasons: ['Your Apparent profile'],
    profileUrl: `/dashboard/founder`,
    githubUrl: founderProfile.github,
    pressUrl: founderProfile.press,
    launchUrl: latestLaunch?.launchUrl ?? '',
    rawTags: mergeUnique([founderProfile.category, founderProfile.stage, founderProfile.lookingFor], 8),
    isCurrentUser: true,
    origin: 'apparent' as const,
    fundraisingStatus: (founderProfile.fundraisingStatus === 'raising' || founderProfile.fundraisingStatus === 'open' ? founderProfile.fundraisingStatus : 'not_raising') as 'raising' | 'open' | 'not_raising',
    raisingRound: founderProfile.raisingRound,
    raisingAmount: founderProfile.raisingAmount,
    openToContact: founderProfile.openToContact !== 'false',
  };
};

// ── Ingested public signals → Builder Radar nodes ───────────────────────────────
// Turns rows from public.source_signals (YC / GitHub / Product Hunt / Hacker News)
// into builders that plot on the radar alongside real Apparent users.

const githubHandle = (url: string): string => {
  const match = url.match(/github\.com\/([^/?#]+)/i);
  return match ? match[1].toLowerCase() : '';
};

const isKnownRadarCity = (city: string) =>
  Object.prototype.hasOwnProperty.call(cityGeoCoordinates, city) && city !== 'Remote';

const signalToBuilderNode = (row: Record<string, unknown>, index: number): BuilderNode | null => {
  const company = String(row.company ?? '').trim();
  const founder = String(row.founder ?? '').trim();
  const sourceType = String(row.source_type ?? 'Ingested signal');
  const sourceUrl = String(row.source_url ?? '');
  const profileUrl = String(row.profile_url ?? '');
  const githubUrl = String(row.github_url ?? '');
  const detail = String(row.detail ?? '');
  const stage = String(row.stage ?? '');
  const city = normalizeCity(String(row.location ?? ''));

  // Only plot ingested builders we can place on the curated city map. Locationless
  // signals (e.g. most GitHub repos) still flow into the investor signal feed.
  if (!company || !isKnownRadarCity(city)) return null;

  const coords = cityGeoCoordinates[city];
  const latestActivity = String(row.freshness_at ?? row.created_at ?? nowIso());
  const tags = Array.isArray(row.raw_tags) ? (row.raw_tags as string[]) : [];
  const proofLinks: BuilderProofLink[] = [
    githubUrl ? { label: 'GitHub', url: githubUrl, type: 'github' } : null,
    sourceUrl ? { label: sourceType, url: sourceUrl, type: 'launch' } : null,
    profileUrl && profileUrl !== sourceUrl ? { label: 'Profile', url: profileUrl, type: 'profile' } : null,
  ].filter(Boolean) as BuilderProofLink[];

  return {
    id: `signal:${String(row.id)}`,
    founderId: `signal:${String(row.id)}`,
    founderName: founder || company,
    company,
    displayLabel: company,
    buildSummary: detail || `${company} surfaced from ${sourceType}.`,
    category: tags[0] ?? '',
    stage,
    location: city,
    // Jitter so multiple signals in one city don't stack on the exact point.
    latitude: coords.latitude + Math.sin((index + 1) * 1.7) * 0.06,
    longitude: coords.longitude + Math.cos((index + 1) * 1.3) * 0.06,
    proofLinks,
    traction: '',
    launchCount: 0,
    latestActivity,
    latestActivityLabel: formatFreshness(latestActivity),
    fitScore: 50,
    matchReasons: [],
    profileUrl: sourceUrl || profileUrl || githubUrl || '#',
    githubUrl,
    pressUrl: sourceUrl,
    launchUrl: sourceUrl,
    rawTags: mergeUnique([...tags, stage, sourceType], 8),
    origin: 'ingested',
    sourceLabel: sourceType,
  };
};

/** Build identity keys (company name, github handle) for dedup against ingested signals. */
const builderIdentityKeys = (builder: BuilderNode): string[] => {
  const keys: string[] = [];
  if (builder.company) keys.push(builder.company.toLowerCase().trim());
  const gh = githubHandle(builder.githubUrl);
  if (gh) keys.push(`gh:${gh}`);
  return keys;
};

/** Drop ingested nodes that collide with a native Apparent builder or an earlier ingested one. */
const dedupeIngestedNodes = (ingested: BuilderNode[], nativeNodes: BuilderNode[]): BuilderNode[] => {
  const seen = new Set<string>();
  nativeNodes.forEach((node) => builderIdentityKeys(node).forEach((key) => seen.add(key)));

  return ingested.filter((node) => {
    const keys = builderIdentityKeys(node);
    if (keys.some((key) => seen.has(key))) return false;
    keys.forEach((key) => seen.add(key));
    return true;
  });
};

const calculateBuilderFit = (
  builder: BuilderNode,
  role: DashboardRole,
  values: InvestorCriteriaValues | FounderProfileValues,
) => {
  const haystack = [
    builder.company,
    builder.founderName,
    builder.buildSummary,
    builder.category,
    builder.stage,
    builder.location,
    builder.traction,
    builder.rawTags.join(' '),
  ].join(' ');

  const reasons: string[] = [];
  let score = 44;

  if (role === 'investor') {
    const criteria = values as InvestorCriteriaValues;
    if (textIncludesAny(haystack, toTextTokens(criteria.thesis))) {
      score += 14;
      reasons.push('Thesis match');
    }
    if (textIncludesAny(haystack, toTextTokens(criteria.sectors))) {
      score += 12;
      reasons.push('Sector fit');
    }
    if (criteria.stage && builder.stage.toLowerCase().includes(criteria.stage.toLowerCase())) {
      score += 9;
      reasons.push('Stage fit');
    }
    if (textIncludesAny(builder.location, toTextTokens(criteria.geography))) {
      score += 7;
      reasons.push('Geography fit');
    }
    if (textIncludesAny(haystack, toTextTokens(criteria.founderSignals))) {
      score += 10;
      reasons.push('Founder signal');
    }
    if (criteria.passSignals && textIncludesAny(haystack, toTextTokens(criteria.passSignals))) {
      score -= 18;
      reasons.push('Pass-signal risk');
    }
  } else {
    const profile = values as FounderProfileValues;
    if (textIncludesAny(haystack, toTextTokens(profile.category))) {
      score += 14;
      reasons.push('Similar category');
    }
    if (profile.stage && builder.stage.toLowerCase().includes(profile.stage.toLowerCase())) {
      score += 9;
      reasons.push('Similar stage');
    }
    if (textIncludesAny(builder.location, toTextTokens(profile.location))) {
      score += 12;
      reasons.push('Nearby builder');
    }
    if (textIncludesAny(haystack, toTextTokens(profile.currentBuild))) {
      score += 8;
      reasons.push('Build overlap');
    }
  }

  if (builder.githubUrl) {
    score += 7;
    reasons.push('GitHub proof');
  }
  if (builder.launchCount > 0) {
    score += 6;
    reasons.push('Launch proof');
  }
  if (builder.traction) {
    score += 8;
    reasons.push('Traction signal');
  }
  score += Math.min(10, freshnessWeight(builder.latestActivity));

  return {
    ...builder,
    fitScore: Math.max(1, Math.min(99, Math.round(score))),
    matchReasons: mergeUnique([...reasons, ...builder.matchReasons], 5),
    latestActivityLabel: formatFreshness(builder.latestActivity),
  };
};

export const buildBuilderMapClusters = (
  builders: BuilderNode[],
  meetups: Meetup[],
): BuilderMapCluster[] => {
  const clusters = new Map<string, BuilderMapCluster>();

  const ensureCluster = (city: string) => {
    const normalizedCity = normalizeCity(city);
    const coords = coordinatesForCity(normalizedCity);
    const existing = clusters.get(normalizedCity);
    if (existing) return existing;

    const cluster: BuilderMapCluster = {
      city: normalizedCity,
      latitude: coords.latitude,
      longitude: coords.longitude,
      builderCount: 0,
      categoryMix: [],
      stageMix: [],
      latestActivity: '',
      latestActivityLabel: '',
      fitScore: 0,
      builderIds: [],
      meetups: 0,
    };
    clusters.set(normalizedCity, cluster);
    return cluster;
  };

  builders.forEach((builder) => {
    const cluster = ensureCluster(builder.location);
    cluster.builderCount += 1;
    cluster.builderIds.push(builder.id);
    cluster.categoryMix = mergeUnique([...cluster.categoryMix, builder.category], 4);
    cluster.stageMix = mergeUnique([...cluster.stageMix, builder.stage], 4);
    cluster.latestActivity = latestIso([cluster.latestActivity, builder.latestActivity]);
    cluster.latestActivityLabel = formatFreshness(cluster.latestActivity);
    cluster.fitScore = Math.round(
      ((cluster.fitScore * (cluster.builderCount - 1)) + builder.fitScore) / cluster.builderCount,
    );
  });

  meetups.forEach((meetup) => {
    const cluster = ensureCluster(meetup.city);
    cluster.meetups += 1;
    cluster.latestActivity = latestIso([cluster.latestActivity, meetup.startsAt]);
    cluster.latestActivityLabel = formatDate(cluster.latestActivity);
  });

  return Array.from(clusters.values())
    .filter((cluster) => cluster.builderCount > 0 || cluster.meetups > 0)
    .sort((a, b) => b.builderCount + b.meetups - (a.builderCount + a.meetups));
};

const generateBuilderOutreachDraft = (builder: BuilderNode, criteria: InvestorCriteriaValues) => {
  const thesis = criteria.thesis.trim() || 'our current thesis';
  const proof = builder.matchReasons.slice(0, 2).join(' and ') || builder.category || 'your public builder signal';
  return `${builder.founderName}, ${builder.company} stood out on Apparent because of ${proof}. It maps to ${thesis}, and I would like to learn more about what is pulling hardest right now. Open to a quick conversation this week?`;
};

const builderToInvestorSignal = (
  builder: BuilderNode,
  state: BuilderDiscoveryState,
  criteria: InvestorCriteriaValues,
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
  column: state.stage || 'New',
  outreach: state.outreachBody || generateBuilderOutreachDraft(builder, criteria),
  sourceType: 'Apparent builder',
  freshnessAt: builder.latestActivity,
  githubUrl: builder.githubUrl,
  rawTags: builder.rawTags,
});

const mergeBuilderDealFlowSignals = (
  signalRows: InvestorSignal[],
  builders: BuilderNode[],
  discoveryStates: BuilderDiscoveryState[],
  criteria: InvestorCriteriaValues,
) => {
  const stateByBuilder = new Map(discoveryStates.map((state) => [state.builderId, state]));
  const builderSignals = builders
    .filter((builder) => {
      const state = stateByBuilder.get(builder.id);
      return state?.stage && !state.hidden;
    })
    .map((builder) => builderToInvestorSignal(builder, stateByBuilder.get(builder.id)!, criteria));

  return [...signalRows.filter((signal) => !signal.id?.startsWith('builder:')), ...builderSignals];
};

const buildNetworkClusters = (
  signalRows: InvestorSignal[],
  meetups: Meetup[],
  userLocation?: string,
): NetworkCluster[] => {
  const clusters = new Map<string, NetworkCluster>();

  const ensureCluster = (city: string) => {
    const cleanCity = city.trim() || 'Remote';
    const coords = cityCoordinates[cleanCity] ?? cityCoordinates.Remote;
    const existing = clusters.get(cleanCity);
    if (existing) return existing;

    const cluster: NetworkCluster = {
      city: cleanCity,
      builders: 0,
      investors: 0,
      meetups: 0,
      signals: 0,
      x: coords.x,
      y: coords.y,
      tags: [],
      latest: '',
    };
    clusters.set(cleanCity, cluster);
    return cluster;
  };

  signalRows.forEach((signal) => {
    const cluster = ensureCluster(signal.location);
    cluster.builders += 1;
    cluster.signals += 1;
    cluster.tags = Array.from(new Set([...cluster.tags, signal.stage, signal.source].filter(Boolean))).slice(0, 4);
    cluster.latest = signal.freshness;
  });

  meetups.forEach((meetup) => {
    const cluster = ensureCluster(meetup.city);
    cluster.meetups += 1;
    cluster.investors += meetup.hostRole === 'investor' ? 1 : 0;
    cluster.builders += meetup.hostRole === 'founder' ? 1 : 0;
    cluster.tags = Array.from(new Set([...cluster.tags, meetup.audience].filter(Boolean))).slice(0, 4);
    cluster.latest = formatDate(meetup.startsAt);
  });

  if (userLocation) {
    const cluster = ensureCluster(userLocation);
    cluster.builders += 1;
    cluster.tags = Array.from(new Set(['Your location', ...cluster.tags])).slice(0, 4);
  }

  return Array.from(clusters.values()).sort((a, b) => b.builders + b.investors + b.meetups - (a.builders + a.investors + a.meetups));
};

const applyFeedActions = (items: FeedItem[], actions: Record<string, Partial<FeedItem>>) =>
  items.map((item) => ({
    ...item,
    saved: Boolean(actions[item.id]?.saved ?? item.saved),
    reposted: Boolean(actions[item.id]?.reposted ?? item.reposted),
    reply: String(actions[item.id]?.reply ?? item.reply),
  }));

const buildFeedItems = (
  role: DashboardRole,
  profileSaved: boolean,
  signalRows: InvestorSignal[],
  meetups: Meetup[],
  launches: ProductLaunch[],
  actions: Record<string, Partial<FeedItem>>,
): FeedItem[] => {
  const personalized: FeedItem[] = profileSaved
    ? role === 'investor'
      ? signalRows.slice(0, 3).map((signal) => ({
          id: `signal-${signal.id}`,
          title: `${signal.founder} is building ${signal.company}`,
          detail: `${signal.detail} Ranked ${signal.relevance}% against your saved thesis.`,
          tag: 'Builder match',
          source: 'For you',
          actor: 'Apparent Match',
          meta: signal.freshness,
          saved: false,
          reposted: false,
          reply: '',
        }))
      : launches.slice(0, 2).map((launch) => ({
          id: `launch-${launch.id}`,
          title: `${launch.name} is ready for investor discovery`,
          detail: `${launch.tagline || launch.metrics || 'Add proof and launch context so thesis-fit investors can evaluate it faster.'}`,
          tag: 'Launch proof',
          source: 'For you',
          actor: 'Profile Coach',
          meta: 'now',
          saved: false,
          reposted: false,
          reply: '',
        }))
    : [];

  const meetupItems = meetups.slice(0, 2).map((meetup) => ({
    id: `meetup-${meetup.id}`,
    title: meetup.title,
    detail: `${meetup.city} at ${meetup.venue}. ${meetup.description}`,
    tag: 'Meetup',
    source: 'Front page',
    actor: 'Builder Rooms',
    meta: formatDate(meetup.startsAt),
    saved: false,
    reposted: false,
    reply: '',
  }));

  return applyFeedActions([...personalized, ...meetupItems, ...generalFeedDefaults], actions);
};

export const loadBuilderNetwork = async (
  user: AppUser,
  role: DashboardRole,
  values: InvestorCriteriaValues | FounderProfileValues,
  localLaunches: ProductLaunch[] = [],
): Promise<{
  builderNodes: BuilderNode[];
  builderClusters: BuilderMapCluster[];
  builderDiscoveryStates: BuilderDiscoveryState[];
}> => {
  if (!isSupabaseConfigured || !supabase || user.isDev) {
    const localStatesByBuilder = readLocal<Record<string, BuilderDiscoveryState>>(
      storageKey(user, 'builder-discovery'),
      {},
    );
    const ownBuilder =
      role === 'founder'
        ? localFounderBuilderNode(user, values as FounderProfileValues, localLaunches)
        : null;
    const baseBuilders = [
      ...seedBuilderNodes,
      ...(ownBuilder ? [ownBuilder] : []),
    ];
    const builderNodes = baseBuilders
      .map((builder) => calculateBuilderFit(builder, role, values))
      .sort((a, b) => b.fitScore - a.fitScore);
    const builderDiscoveryStates = Object.values(localStatesByBuilder);

    return {
      builderNodes,
      builderClusters: buildBuilderMapClusters(builderNodes, seedMeetups),
      builderDiscoveryStates,
    };
  }

  const [{ data: profileRows }, { data: launchRows }, { data: stateRows }, { data: signalRows }] = await Promise.all([
    supabase.from('founder_profiles').select('*').order('updated_at', { ascending: false }),
    supabase.from('product_launches').select('*').order('updated_at', { ascending: false }),
    supabase.from('builder_discovery_states').select('*').eq('user_id', user.id),
    supabase.from('source_signals').select('*').order('freshness_at', { ascending: false }).limit(1000),
  ]);

  const allLaunches = (launchRows ?? []).map((row) => mapProductLaunchRow(row));
  const mappedBuilders = mapBuilderProfileRows((profileRows ?? []) as Record<string, unknown>[], allLaunches, user.id);
  const nativeBuilders = mappedBuilders.length ? mappedBuilders : seedBuilderNodes;

  // Merge ingested public-signal builders (YC / GitHub / Product Hunt / Hacker News)
  // onto the radar, deduped against the native Apparent builders.
  const ingestedBuilders = dedupeIngestedNodes(
    ((signalRows ?? []) as Record<string, unknown>[])
      .map((row, index) => signalToBuilderNode(row, index))
      .filter((node): node is BuilderNode => node !== null),
    nativeBuilders,
  );

  const builderNodes = [...nativeBuilders, ...ingestedBuilders]
    .map((builder) => calculateBuilderFit(builder, role, values))
    .sort((a, b) => b.fitScore - a.fitScore);
  const builderDiscoveryStates = (stateRows ?? []).map((row) => mapBuilderDiscoveryRow(row));

  return {
    builderNodes,
    builderClusters: buildBuilderMapClusters(builderNodes, seedMeetups),
    builderDiscoveryStates,
  };
};

export const saveBuilderDiscoveryState = async (
  user: AppUser,
  builderId: string,
  patch: Partial<Pick<BuilderDiscoveryState, 'saved' | 'hidden' | 'stage' | 'note' | 'outreachBody'>>,
): Promise<BuilderDiscoveryState> => {
  if (!isSupabaseConfigured || !supabase || user.isDev) {
    const current = readLocal<Record<string, BuilderDiscoveryState>>(storageKey(user, 'builder-discovery'), {});
    const nextState: BuilderDiscoveryState = {
      ...defaultBuilderDiscoveryState(user, builderId),
      ...current[builderId],
      ...patch,
      updatedAt: nowIso(),
    };
    writeLocal(storageKey(user, 'builder-discovery'), {
      ...current,
      [builderId]: nextState,
    });
    return nextState;
  }

  const payload: Record<string, unknown> = {
    user_id: user.id,
    builder_id: builderId,
  };

  if ('saved' in patch) payload.saved = patch.saved;
  if ('hidden' in patch) payload.hidden = patch.hidden;
  if ('stage' in patch) payload.stage = patch.stage || null;
  if ('note' in patch) payload.note = patch.note;
  if ('outreachBody' in patch) payload.outreach_body = patch.outreachBody;

  const { data, error } = await supabase
    .from('builder_discovery_states')
    .upsert(payload)
    .select('*')
    .single();

  if (error) throw error;
  return mapBuilderDiscoveryRow(data);
};

/**
 * Record a VC's interest in a builder (Discover swipe deck).
 * Gracefully no-ops if the vc_interest table isn't deployed yet, so the deck
 * keeps working before the migration is applied.
 */
export const saveVcInterest = async (
  user: AppUser,
  builder: { id: string; founderId?: string; founderName?: string; company?: string },
  kind: 'like' | 'superlike',
): Promise<void> => {
  const investorName = user.username || user.email.split('@')[0];
  const builderUserId = builder.founderId && isUuid(builder.founderId) ? builder.founderId : null;

  if (!isSupabaseConfigured || !supabase || user.isDev) {
    const key = storageKey(user, 'vc-interest');
    const current = readLocal<Record<string, { kind: string; at: string }>>(key, {});
    current[builder.id] = { kind, at: nowIso() };
    writeLocal(key, current);
    return;
  }

  try {
    await supabase.from('vc_interest').upsert(
      {
        investor_id: user.id,
        investor_name: investorName,
        builder_id: builder.id,
        builder_user_id: builderUserId,
        builder_name: builder.founderName || builder.company || '',
        kind,
        updated_at: nowIso(),
      },
      { onConflict: 'investor_id,builder_id' },
    );
  } catch {
    /* table not deployed yet — non-fatal */
  }
};

/** Load the VCs who have expressed interest in the current founder. */
export const loadFounderInterest = async (user: AppUser): Promise<VcInterestEntry[]> => {
  if (!isSupabaseConfigured || !supabase || user.isDev) return [];
  try {
    const { data, error } = await supabase
      .from('vc_interest')
      .select('*')
      .eq('builder_user_id', user.id)
      .order('created_at', { ascending: false });
    if (error || !data) return [];
    return data.map((row) => ({
      id: String(row.id),
      investorId: String(row.investor_id),
      investorName: String(row.investor_name ?? ''),
      builderId: String(row.builder_id),
      builderUserId: row.builder_user_id ? String(row.builder_user_id) : undefined,
      builderName: String(row.builder_name ?? ''),
      kind: row.kind === 'superlike' ? 'superlike' : 'like',
      createdAt: String(row.created_at ?? ''),
    }));
  } catch {
    return [];
  }
};

/** Public, PII-free count of investor interest in a builder (for claim landing). */
export const loadBuilderInterestSummary = async (
  builderId: string,
): Promise<{ likes: number; superlikes: number }> => {
  if (!isSupabaseConfigured || !supabase) return { likes: 0, superlikes: 0 };
  try {
    const { data, error } = await supabase.rpc('builder_interest_summary', { p_builder_id: builderId });
    const row = Array.isArray(data) ? data[0] : data;
    if (error || !row) return { likes: 0, superlikes: 0 };
    return { likes: Number(row.likes ?? 0), superlikes: Number(row.superlikes ?? 0) };
  } catch {
    return { likes: 0, superlikes: 0 };
  }
};

/** On claim, attach any interest expressed in the ingested builder to this user. */
export const claimBuilderInterest = async (user: AppUser, builderId: string): Promise<void> => {
  if (!isSupabaseConfigured || !supabase || user.isDev) return;
  try {
    await supabase.rpc('claim_builder_interest', { p_builder_id: builderId });
  } catch {
    /* rpc not deployed yet — non-fatal */
  }
};

/**
 * The investor's own liked builders who aren't on Apparent yet (ingested,
 * unclaimed) — so they can send each a /claim invite link. RLS-safe.
 */
export const loadInvitableBuilders = async (
  user: AppUser,
): Promise<{ signalId: string; builderName: string; kind: 'like' | 'superlike' }[]> => {
  if (!isSupabaseConfigured || !supabase || user.isDev) return [];
  try {
    const { data, error } = await supabase
      .from('vc_interest')
      .select('builder_id, builder_name, kind')
      .eq('investor_id', user.id)
      .is('builder_user_id', null)
      .order('created_at', { ascending: false });
    if (error || !data) return [];
    return data
      .filter((row) => String(row.builder_id).startsWith('signal:'))
      .map((row) => ({
        signalId: String(row.builder_id).replace(/^signal:/, ''),
        builderName: String(row.builder_name ?? ''),
        kind: row.kind === 'superlike' ? 'superlike' : 'like',
      }));
  } catch {
    return [];
  }
};

/** Look up a single ingested signal by id (anon-readable) for the claim landing. */
export const loadSourceSignal = async (
  signalId: string,
): Promise<{ company: string; founder: string; detail: string; sourceType: string; location: string } | null> => {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    const { data, error } = await supabase
      .from('source_signals')
      .select('company, founder, detail, source_type, location')
      .eq('id', signalId)
      .maybeSingle();
    if (error || !data) return null;
    return {
      company: String(data.company ?? ''),
      founder: String(data.founder ?? ''),
      detail: String(data.detail ?? ''),
      sourceType: String(data.source_type ?? ''),
      location: String(data.location ?? ''),
    };
  } catch {
    return null;
  }
};

export const subscribeBuilderNetwork = (
  user: AppUser,
  onChange: () => void,
) => {
  const supabaseClient = supabase;

  if (!isSupabaseConfigured || !supabaseClient || user.isDev) {
    return () => undefined;
  }

  const channel = supabaseClient
    .channel(`builder-network-${user.id}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'founder_profiles' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'product_launches' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'meetups' }, onChange)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'builder_discovery_states', filter: `user_id=eq.${user.id}` },
      onChange,
    )
    .subscribe();

  return () => {
    void supabaseClient.removeChannel(channel);
  };
};

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

export const loadPublicProductLaunches = async (): Promise<ProductLaunch[]> => {
  if (!isSupabaseConfigured || !supabase) {
    return readPublicProductLaunches();
  }

  const { data, error } = await supabase
    .from('product_launches')
    .select('*')
    .eq('public_profile_enabled', true)
    .order('updated_at', { ascending: false });

  if (error) {
    return readPublicProductLaunches();
  }

  return (data ?? []).map((row) => mapProductLaunchRow(row));
};

export const loadFounderVCContacts = async (): Promise<VCContact[]> => {
  const loadSeedContacts = async () => {
    const { vcContactSeed } = await import('@/data/vc-contact-seed');
    return vcContactSeed;
  };

  if (!isSupabaseConfigured || !supabase) {
    return loadSeedContacts();
  }

  const { data, error } = await supabase
    .from('vc_contacts')
    .select('*')
    .not('latitude', 'is', null)
    .not('longitude', 'is', null)
    .order('number_of_investments', { ascending: false })
    .limit(2500);

  // On error OR empty (e.g. logged-out visitors blocked by RLS on the public
  // /heat-map), fall back to the bundled VC seed so the map is never sparse.
  if (error || !data || data.length === 0) {
    return loadSeedContacts();
  }

  return data.map((row) => mapVCContactRow(row));
};

export const loadPublicProjectDetail = async (projectId: string): Promise<PublicProjectDetail | null> => {
  if (!isSupabaseConfigured || !supabase) {
    const localLaunch = readPublicProductLaunches().find((launch) => launch.id === projectId || launch.slug === projectId);
    return localLaunch
      ? {
          launch: localLaunch,
          founder: null,
          teamMembers: localLaunch.teamMembers ?? [],
        }
      : null;
  }

  const slugResult = await supabase
    .from('product_launches')
    .select('*')
    .eq('slug', projectId)
    .eq('public_profile_enabled', true)
    .maybeSingle();

  const launchResult =
    slugResult.data || !isUuid(projectId)
      ? slugResult
      : await supabase
          .from('product_launches')
          .select('*')
          .eq('id', projectId)
          .eq('public_profile_enabled', true)
          .maybeSingle();

  if (launchResult.error || !launchResult.data) {
    return null;
  }

  const launch = mapProductLaunchRow(launchResult.data);
  const [{ data: founderRow }, { data: teamRows }, { data: founderLaunchRows }] = await Promise.all([
    supabase
      .from('founder_profiles')
      .select('*')
      .eq('user_id', launch.ownerId)
      .eq('public_profile_enabled', true)
      .maybeSingle(),
    supabase
      .from('launch_team_members')
      .select('*')
      .eq('launch_id', launch.id)
      .order('sort_order', { ascending: true }),
    supabase
      .from('product_launches')
      .select('*')
      .eq('owner_id', launch.ownerId)
      .eq('public_profile_enabled', true)
      .order('updated_at', { ascending: false }),
  ]);
  const teamMembers = (teamRows ?? []).map((row) => mapTeamMemberRow(row));

  return {
    launch: { ...launch, teamMembers },
    founder: mapPublicFounderProfile(founderRow as Record<string, unknown> | null, (founderLaunchRows ?? []).map((row) => mapProductLaunchRow(row))),
    teamMembers,
  };
};

export const loadPublicFounderProfile = async (profileId: string): Promise<PublicFounderProfile | null> => {
  if (!isSupabaseConfigured || !supabase || !isUuid(profileId)) {
    return null;
  }

  const [{ data: founderRow, error }, { data: launchRows }] = await Promise.all([
    supabase
      .from('founder_profiles')
      .select('*')
      .eq('user_id', profileId)
      .eq('public_profile_enabled', true)
      .maybeSingle(),
    supabase
      .from('product_launches')
      .select('*')
      .eq('owner_id', profileId)
      .eq('public_profile_enabled', true)
      .order('updated_at', { ascending: false }),
  ]);

  if (error || !founderRow) {
    return null;
  }

  return mapPublicFounderProfile(
    founderRow as Record<string, unknown>,
    (launchRows ?? []).map((row) => mapProductLaunchRow(row)),
  );
};

/**
 * Load a public profile by @-handle (username).
 * Returns a discriminated union so the UI can render the right layout.
 * For investors whose public_profile_enabled = false, returns `restricted: true`
 * (the investor row will be null for anon visitors because of RLS).
 */
export const loadPublicProfile = async (username: string): Promise<PublicProfileResult> => {
  if (!isSupabaseConfigured || !supabase) {
    // No DB — serve curated static profiles as the sole source.
    return getStaticFounderProfile(username) ?? { kind: 'not_found' };
  }

  try {
  // 1. Resolve username → user_id + role.
  //    First try username match; if the handle looks like a UUID try id match too.
  let { data: profileRow } = await supabase
    .from('profiles')
    .select('id, role, display_name, email, username')
    .ilike('username', username)
    .maybeSingle();

  if (!profileRow && isUuid(username)) {
    const { data: uuidRow } = await supabase
      .from('profiles')
      .select('id, role, display_name, email, username')
      .eq('id', username)
      .maybeSingle();
    profileRow = uuidRow;
  }

  if (!profileRow) {
    // Not in Supabase — fall back to curated static profiles.
    return getStaticFounderProfile(username) ?? { kind: 'not_found' };
  }

  const userId = String(profileRow.id);
  const role = String(profileRow.role);
  const canonicalUsername = String(profileRow.username ?? username);
  const displayName =
    String(profileRow.display_name ?? '').trim() ||
    String(profileRow.email ?? '').split('@')[0];

  // 2a. Investor branch
  if (role === 'investor') {
    const { data: criteriaRow } = await supabase
      .from('investor_criteria')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    // null means: row exists but RLS blocked access (anon + not publicly visible)
    if (!criteriaRow) {
      return {
        kind: 'investor',
        profile: {
          userId,
          username: canonicalUsername,
          displayName,
          profilePhotoUrl: '',
          thesis: '',
          sectors: '',
          stage: '',
          checkSize: '',
          geography: '',
          portfolioExamples: '',
          founderSignals: '',
          publicFields: [],
          restricted: true,
          shareable: true,
        },
      };
    }

    const isPublic = Boolean(criteriaRow.public_profile_enabled);
    const publicFields: string[] = Array.isArray(criteriaRow.public_fields)
      ? (criteriaRow.public_fields as string[])
      : ['thesis', 'sectors', 'stage', 'geography'];

    const vis = (key: string, dbKey = key) =>
      publicFields.includes(key) ? String(criteriaRow[dbKey] ?? '') : '';

    return {
      kind: 'investor',
      profile: {
        userId,
        username: canonicalUsername,
        displayName,
        profilePhotoUrl: '',
        thesis: vis('thesis'),
        sectors: vis('sectors'),
        stage: vis('stage'),
        checkSize: vis('checkSize', 'check_size'),
        geography: vis('geography'),
        portfolioExamples: vis('portfolioExamples', 'portfolio_examples'),
        founderSignals: vis('founderSignals', 'founder_signals'),
        publicFields,
        restricted: !isPublic,
        shareable: criteriaRow.shareable !== false,
      },
    };
  }

  // 2b. Founder branch
  const [{ data: founderRow }, { data: launchRows }] = await Promise.all([
    supabase
      .from('founder_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('product_launches')
      .select('*')
      .eq('owner_id', userId)
      .eq('public_profile_enabled', true)
      .order('updated_at', { ascending: false }),
  ]);

  const launches = (launchRows ?? []).map((row) => mapProductLaunchRow(row));
  const profile = mapPublicFounderProfile(
    founderRow ? { ...(founderRow as Record<string, unknown>), display_name: displayName } : { user_id: userId, display_name: displayName },
    launches,
    canonicalUsername,
  );

  return {
    kind: 'founder',
    profile: profile ?? {
      userId,
      username: canonicalUsername,
      profileName: displayName,
      headline: '',
      bio: '',
      profilePhotoUrl: '',
      currentBuild: '',
      category: '',
      stage: '',
      github: '',
      traction: '',
      lookingFor: '',
      location: '',
      press: '',
      website: '',
      linkedin: '',
      xProfile: '',
      pastProducts: '',
      launches,
    },
  };
  } catch {
    return getStaticFounderProfile(username) ?? { kind: 'not_found' };
  }
};

const loadLocalDashboard = async (user: AppUser, role: DashboardRole, labelByKey: Record<string, string>): Promise<DashboardData> => {
  const settings = readLocal<UserSettings>(storageKey(user, 'settings'), settingsDefault);
  const productLaunches = readLocal<ProductLaunch[]>(storageKey(user, 'product-launches'), []);
  const userMeetups = readLocal<Meetup[]>(storageKey(user, 'meetups'), []);
  const meetupRsvps = readLocal<Record<string, boolean>>(storageKey(user, 'meetup-rsvps'), {});
  const meetups = dedupeMeetups(
    [...userMeetups, ...seedMeetups].map((meetup) => ({
      ...meetup,
      attendeeCount: meetup.attendeeCount + (meetupRsvps[meetup.id] && !meetup.isJoined ? 1 : 0),
      isJoined: Boolean(meetupRsvps[meetup.id] ?? meetup.isJoined),
    })),
  );
  const termReviews = readLocal<TermReview[]>(storageKey(user, 'term-reviews'), []);
  const messages = readLocal<UserMessage[]>(storageKey(user, 'messages'), []);
  const feedActions = readLocal<Record<string, Partial<FeedItem>>>(storageKey(user, 'feed-actions'), {});

  if (role === 'investor') {
    const criteria = readLocal<InvestorCriteriaValues>(storageKey(user, 'criteria'), defaultInvestorCriteria);
    const intakeValues = toIntakeRecord(criteria);
    const stateBySignal = readLocal<Record<string, InvestorDealStage>>(storageKey(user, 'signal-stages'), {});
    const draftsBySignal = readLocal<Record<string, string>>(storageKey(user, 'drafts'), {});
    const signalRows = seedInvestorSignals.map((signal) => {
      const merged = {
        ...signal,
        column: stateBySignal[signal.id] ?? signal.column,
      };
      const relevance = calculateRelevance(merged, criteria);
      return {
        ...merged,
        relevance,
        freshness: formatFreshness(merged.freshnessAt),
        outreach: draftsBySignal[signal.id] ?? generateOutreachDraft({ ...merged, relevance }, criteria),
      };
    });

    const profileSaved = completedLabels(intakeValues, labelByKey).length > 0;
    const builderNetwork = await loadBuilderNetwork(user, role, criteria, productLaunches);
    const signalRowsWithBuilders = mergeBuilderDealFlowSignals(
      signalRows,
      builderNetwork.builderNodes,
      builderNetwork.builderDiscoveryStates,
      criteria,
    );

    return {
      intakeValues,
      completedLabels: completedLabels(intakeValues, labelByKey),
      profileSaved,
      signalRows: signalRowsWithBuilders,
      settings,
      productLaunches,
      meetups,
      networkClusters: buildNetworkClusters(signalRowsWithBuilders, meetups, criteria.geography),
      builderNodes: builderNetwork.builderNodes,
      builderClusters: buildBuilderMapClusters(builderNetwork.builderNodes, meetups),
      builderDiscoveryStates: builderNetwork.builderDiscoveryStates,
      termReviews,
      messages,
      feedItems: buildFeedItems(role, profileSaved, signalRowsWithBuilders, meetups, productLaunches, feedActions),
      savedInvestorMatchNames: [],
      launchEngagement: {},
      founderInterest: { saveCount: 0, recentSaverNames: [] },
    };
  }

  const founderProfile = readLocal<FounderProfileValues>(storageKey(user, 'founder-profile'), defaultFounderProfile);
  const intakeValues = toIntakeRecord(founderProfile);
  const profileSaved = completedLabels(intakeValues, labelByKey).length > 0;
  const builderNetwork = await loadBuilderNetwork(user, role, founderProfile, productLaunches);
  return {
    intakeValues,
    completedLabels: completedLabels(intakeValues, labelByKey),
    profileSaved,
    signalRows: seedInvestorSignals,
    settings,
    productLaunches,
    meetups,
    networkClusters: buildNetworkClusters(seedInvestorSignals, meetups, founderProfile.location),
    builderNodes: builderNetwork.builderNodes,
    builderClusters: buildBuilderMapClusters(builderNetwork.builderNodes, meetups),
    builderDiscoveryStates: builderNetwork.builderDiscoveryStates,
    termReviews,
    messages,
    feedItems: buildFeedItems(role, profileSaved, seedInvestorSignals, meetups, productLaunches, feedActions),
    savedInvestorMatchNames: [],
    launchEngagement: {},
    founderInterest: { saveCount: 0, recentSaverNames: [] },
  };
};

export const loadDashboardData = async (
  user: AppUser,
  role: DashboardRole,
  labelByKey: Record<string, string>,
): Promise<DashboardData> => {
  if (!isSupabaseConfigured || !supabase || user.isDev) {
    return loadLocalDashboard(user, role, labelByKey);
  }

  const { data: settingsRow } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();
  const settings: UserSettings = {
    dailyDigestEnabled: settingsRow?.daily_digest_enabled ?? true,
    slackAlertsEnabled: settingsRow?.slack_alerts_enabled ?? true,
  };
  const [
    { data: productLaunchRows },
    { data: meetupRows },
    { data: meetupRsvpRows },
    { data: termRows },
    { data: messageRows },
    { data: feedActionRows },
    { data: userUpvoteRows },
    { data: commentRows },
  ] = await Promise.all([
    supabase.from('product_launches').select('*').eq('owner_id', user.id).order('updated_at', { ascending: false }),
    supabase.from('meetups').select('*').order('starts_at', { ascending: true }),
    supabase.from('meetup_rsvps').select('*'),
    supabase.from('term_reviews').select('*').eq('user_id', user.id).order('updated_at', { ascending: false }),
    supabase
      .from('user_messages')
      .select('*')
      .or(`owner_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order('updated_at', { ascending: false }),
    supabase.from('feed_item_actions').select('*').eq('user_id', user.id),
    supabase.from('launch_upvotes').select('launch_id').eq('user_id', user.id),
    supabase.from('launch_comments').select('launch_id, body').order('created_at', { ascending: false }),
  ]);
  const rsvpCounts = new Map<string, number>();
  const joinedMeetups = new Set<string>();
  (meetupRsvpRows ?? []).forEach((row) => {
    const meetupId = String(row.meetup_id);
    rsvpCounts.set(meetupId, (rsvpCounts.get(meetupId) ?? 0) + 1);
    if (String(row.user_id) === user.id) {
      joinedMeetups.add(meetupId);
    }
  });
  const productLaunches = (productLaunchRows ?? []).map((row) => mapProductLaunchRow(row));
  const meetups = dedupeMeetups(
    ((meetupRows?.length ? meetupRows : []) as Record<string, unknown>[]).map((row) =>
      mapMeetupRow(row, rsvpCounts.get(String(row.id)) ?? Number(row.attendee_count ?? 0), joinedMeetups.has(String(row.id))),
    ),
  );
  const termReviews = (termRows ?? []).map((row) => mapTermReviewRow(row));
  const messages = (messageRows ?? []).map((row) => mapMessageRow(row));

  // Which launches has this user upvoted?
  const userUpvotedIds = new Set((userUpvoteRows ?? []).map((row) => String(row.launch_id)));

  // Group comments by launch_id
  const commentsByLaunch = (commentRows ?? []).reduce<Record<string, string[]>>((acc, row) => {
    const lid = String(row.launch_id);
    if (!acc[lid]) acc[lid] = [];
    acc[lid].push(String(row.body));
    return acc;
  }, {});

  // Build engagement map for every known real launch
  const launchEngagement: Record<string, LaunchEngagementEntry> = {};
  for (const launch of productLaunches) {
    launchEngagement[launch.id] = {
      upvoted: userUpvotedIds.has(launch.id),
      upvotes: launch.upvoteCount ?? 0,
      comments: commentsByLaunch[launch.id] ?? [],
    };
  }

  // Saved investor match names (stored as feed_item_actions with "inv-match:" prefix)
  const savedInvestorMatchNames = (feedActionRows ?? [])
    .filter((row) => String(row.item_id).startsWith('inv-match:') && Boolean(row.saved))
    .map((row) => String(row.item_id).slice('inv-match:'.length));

  const feedActions = (feedActionRows ?? []).reduce<Record<string, Partial<FeedItem>>>((actions, row) => {
    actions[String(row.item_id)] = {
      saved: Boolean(row.saved),
      reposted: Boolean(row.reposted),
      reply: String(row.reply ?? ''),
    };
    return actions;
  }, {});

  if (role === 'investor') {
    const [{ data: criteriaRow }, { data: sourceRows }, { data: stateRows }, { data: draftRows }] = await Promise.all([
      supabase.from('investor_criteria').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('source_signals').select('*').order('freshness_at', { ascending: false }),
      supabase.from('investor_signal_states').select('*').eq('investor_id', user.id),
      supabase.from('outreach_drafts').select('*').eq('investor_id', user.id),
    ]);

    const criteria = mapCriteriaRow(criteriaRow as Record<string, unknown> | null);
    const intakeValues = toIntakeRecord(criteria);
    const stateBySignal = new Map(
      (stateRows ?? []).map((row) => [String(row.signal_id), String(row.stage) as InvestorDealStage]),
    );
    const draftBySignal = new Map((draftRows ?? []).map((row) => [String(row.signal_id), String(row.body)]));
    const mappedSourceRows = (sourceRows?.length ? sourceRows : []).map((row) => mapSourceRow(row));
    const baseSignals = mappedSourceRows.length ? mappedSourceRows : seedInvestorSignals;
    const signalRows = baseSignals.map((signal) => {
      const withState = {
        ...signal,
        column: stateBySignal.get(signal.id) ?? signal.column,
      };
      const relevance = calculateRelevance(withState, criteria);
      return {
        ...withState,
        relevance,
        freshness: formatFreshness(withState.freshnessAt),
        outreach: draftBySignal.get(signal.id) ?? generateOutreachDraft({ ...withState, relevance }, criteria),
      };
    });

    const profileSaved = completedLabels(intakeValues, labelByKey).length > 0;
    const builderNetwork = await loadBuilderNetwork(user, role, criteria, productLaunches);
    const signalRowsWithBuilders = mergeBuilderDealFlowSignals(
      signalRows,
      builderNetwork.builderNodes,
      builderNetwork.builderDiscoveryStates,
      criteria,
    );
    const effectiveMeetups = meetups.length ? meetups : seedMeetups;

    return {
      intakeValues,
      completedLabels: completedLabels(intakeValues, labelByKey),
      profileSaved,
      signalRows: signalRowsWithBuilders,
      settings,
      productLaunches,
      meetups: effectiveMeetups,
      networkClusters: buildNetworkClusters(signalRowsWithBuilders, effectiveMeetups, criteria.geography),
      builderNodes: builderNetwork.builderNodes,
      builderClusters: buildBuilderMapClusters(builderNetwork.builderNodes, effectiveMeetups),
      builderDiscoveryStates: builderNetwork.builderDiscoveryStates,
      termReviews,
      messages,
      feedItems: buildFeedItems(role, profileSaved, signalRowsWithBuilders, effectiveMeetups, productLaunches, feedActions),
      savedInvestorMatchNames,
      launchEngagement,
      founderInterest: { saveCount: 0, recentSaverNames: [] },
    };
  }

  const { data: founderRow } = await supabase
    .from('founder_profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();
  const founderProfile = mapFounderRow(founderRow as Record<string, unknown> | null);
  const intakeValues = toIntakeRecord(founderProfile);
  const profileSaved = completedLabels(intakeValues, labelByKey).length > 0;
  const builderNetwork = await loadBuilderNetwork(user, role, founderProfile, productLaunches);
  const effectiveMeetups = meetups.length ? meetups : seedMeetups;

  // Come-back loop: how many investors are tracking this founder.
  let founderInterest = { saveCount: 0, recentSaverNames: [] as string[] };
  try {
    const { data: interestRows } = await supabase.rpc('founder_interest_summary');
    const row = Array.isArray(interestRows) ? interestRows[0] : interestRows;
    if (row) {
      founderInterest = {
        saveCount: Number(row.save_count ?? 0),
        recentSaverNames: Array.isArray(row.recent_saver_names) ? row.recent_saver_names.filter(Boolean) : [],
      };
    }
  } catch {
    // RPC missing / not authorized — leave default.
  }

  return {
    intakeValues,
    completedLabels: completedLabels(intakeValues, labelByKey),
    profileSaved,
    signalRows: seedInvestorSignals,
    settings,
    productLaunches,
    meetups: effectiveMeetups,
    networkClusters: buildNetworkClusters(seedInvestorSignals, effectiveMeetups, founderProfile.location),
    builderNodes: builderNetwork.builderNodes,
    builderClusters: buildBuilderMapClusters(builderNetwork.builderNodes, effectiveMeetups),
    builderDiscoveryStates: builderNetwork.builderDiscoveryStates,
    termReviews,
    messages,
    feedItems: buildFeedItems(role, profileSaved, seedInvestorSignals, effectiveMeetups, productLaunches, feedActions),
    savedInvestorMatchNames,
    launchEngagement,
    founderInterest,
  };
};

export const saveIntakeValues = async (
  user: AppUser,
  role: DashboardRole,
  values: Record<string, string>,
) => {
  if (!isSupabaseConfigured || !supabase || user.isDev) {
    writeLocal(
      storageKey(user, role === 'investor' ? 'criteria' : 'founder-profile'),
      values,
    );
    return;
  }

  if (role === 'investor') {
    const safePublicFields = (() => {
      try {
        const parsed = JSON.parse(values.publicFields ?? '[]');
        return Array.isArray(parsed) ? parsed : ['thesis', 'sectors', 'stage', 'geography'];
      } catch {
        return ['thesis', 'sectors', 'stage', 'geography'];
      }
    })();

    const { error } = await supabase.from('investor_criteria').upsert({
      user_id: user.id,
      thesis: values.thesis ?? '',
      sectors: values.sectors ?? '',
      stage: values.stage ?? '',
      check_size: values.checkSize ?? '',
      geography: values.geography ?? '',
      founder_signals: values.founderSignals ?? '',
      pass_signals: values.passSignals ?? '',
      portfolio_examples: values.portfolioExamples ?? '',
      public_profile_enabled: values.publicProfileEnabled === 'true',
      public_fields: safePublicFields,
      shareable: values.shareable !== 'false',
    });

    if (error) throw error;
    return;
  }

  const founderProfilePayload = {
    user_id: user.id,
    profile_name: values.profileName ?? '',
    headline: values.headline ?? '',
    bio: values.bio ?? '',
    profile_photo_url: values.profilePhotoUrl ?? '',
    current_build: values.currentBuild ?? '',
    category: values.category ?? '',
    stage: values.stage ?? '',
    github: values.github ?? '',
    traction: values.traction ?? '',
    mrr: values.mrr ?? '',
    looking_for: values.lookingFor ?? '',
    location: values.location ?? '',
    press: values.press ?? '',
    website: values.website ?? '',
    linkedin: values.linkedin ?? '',
    x_profile: values.xProfile ?? '',
    past_products: values.pastProducts ?? '',
    fundraising_status: values.fundraisingStatus || 'not_raising',
    raising_round: values.raisingRound ?? '',
    raising_amount: values.raisingAmount ?? '',
    raising_ask: values.raisingAsk ?? '',
    open_to_contact: values.openToContact !== 'false',
    shareable: values.shareable !== 'false',
    raising_updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('founder_profiles').upsert(founderProfilePayload);

  if (error) throw error;
};

export const saveSignalStage = async (user: AppUser, signalId: string, stage: InvestorDealStage) => {
  if (!isSupabaseConfigured || !supabase || user.isDev || signalId.startsWith('seed-')) {
    const current = readLocal<Record<string, InvestorDealStage>>(storageKey(user, 'signal-stages'), {});
    writeLocal(storageKey(user, 'signal-stages'), { ...current, [signalId]: stage });
    return;
  }

  const { error } = await supabase.from('investor_signal_states').upsert({
    investor_id: user.id,
    signal_id: signalId,
    stage,
    saved: true,
    hidden: false,
  });

  if (error) throw error;
};

export const saveSettings = async (user: AppUser, settings: UserSettings) => {
  if (!isSupabaseConfigured || !supabase || user.isDev) {
    writeLocal(storageKey(user, 'settings'), settings);
    return;
  }

  const { error } = await supabase.from('user_settings').upsert({
    user_id: user.id,
    daily_digest_enabled: settings.dailyDigestEnabled,
    slack_alerts_enabled: settings.slackAlertsEnabled,
  });

  if (error) throw error;
};

export const saveOutreachDraft = async (user: AppUser, signalId: string, body: string) => {
  if (signalId.startsWith('builder:')) {
    await saveBuilderDiscoveryState(user, signalId.replace(/^builder:/, ''), {
      saved: true,
      outreachBody: body,
    });
    return;
  }

  if (!isSupabaseConfigured || !supabase || user.isDev || signalId.startsWith('seed-')) {
    const current = readLocal<Record<string, string>>(storageKey(user, 'drafts'), {});
    writeLocal(storageKey(user, 'drafts'), { ...current, [signalId]: body });
    return;
  }

  const { error } = await supabase.from('outreach_drafts').upsert({
    investor_id: user.id,
    signal_id: signalId,
    body,
  });

  if (error) throw error;
};

type ProductLaunchDraft = Omit<ProductLaunch, 'id' | 'ownerId' | 'updatedAt'> &
  Partial<Pick<ProductLaunch, 'id'>> & {
    teamMembersText?: string;
  };

export const saveProductLaunch = async (
  user: AppUser,
  launch: ProductLaunchDraft,
): Promise<ProductLaunch> => {
  const id = launch.id ?? (isSupabaseConfigured && supabase && !user.isDev ? crypto.randomUUID() : localId('launch'));
  const slug = launch.slug || `${slugify(launch.name) || 'project'}-${id.slice(0, 8)}`;
  const teamMembers = launch.teamMembers ?? parseTeamMembersText(launch.teamMembersText);
  const nextLaunch: ProductLaunch = {
    id,
    ownerId: user.id,
    slug,
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
    customerSummary: launch.customerSummary ?? '',
    techStack: launch.techStack ?? '',
    fundingStatus: launch.fundingStatus ?? '',
    lookingFor: launch.lookingFor ?? '',
    publicProfileEnabled: launch.publicProfileEnabled ?? true,
    teamMembers,
    metrics: launch.metrics,
    updatedAt: nowIso(),
  };

  if (!isSupabaseConfigured || !supabase || user.isDev || nextLaunch.id.startsWith('launch-')) {
    const current = readLocal<ProductLaunch[]>(storageKey(user, 'product-launches'), []);
    writeLocal(storageKey(user, 'product-launches'), [
      nextLaunch,
      ...current.filter((item) => item.id !== nextLaunch.id),
    ]);
    publishLocalLaunch(nextLaunch);
    return nextLaunch;
  }

  const { data, error } = await supabase
    .from('product_launches')
    .upsert({
      id: nextLaunch.id,
      owner_id: user.id,
      slug: nextLaunch.slug,
      name: nextLaunch.name,
      tagline: nextLaunch.tagline,
      intro: nextLaunch.intro,
      category: nextLaunch.category,
      stage: nextLaunch.stage,
      location: nextLaunch.location,
      launch_url: nextLaunch.launchUrl,
      proof_url: nextLaunch.proofUrl,
      logo_url: nextLaunch.logoUrl,
      banner_url: nextLaunch.bannerUrl,
      demo_video_url: nextLaunch.demoVideoUrl,
      pitch_video_url: nextLaunch.pitchVideoUrl,
      pitch_deck_url: nextLaunch.pitchDeckUrl,
      pitch_book_note: nextLaunch.pitchBookNote,
      pitch_visibility: nextLaunch.pitchVisibility,
      founder_signals: nextLaunch.founderSignals,
      team_summary: nextLaunch.teamSummary,
      customer_summary: nextLaunch.customerSummary,
      tech_stack: nextLaunch.techStack,
      funding_status: nextLaunch.fundingStatus,
      looking_for: nextLaunch.lookingFor,
      public_profile_enabled: nextLaunch.publicProfileEnabled,
      metrics: nextLaunch.metrics,
    })
    .select('*')
    .single();

  if (error) throw error;

  await supabase.from('launch_team_members').delete().eq('launch_id', nextLaunch.id).eq('owner_id', user.id);

  if (teamMembers.length > 0) {
    const { error: teamError } = await supabase.from('launch_team_members').insert(
      teamMembers.map((member, index) => ({
        launch_id: nextLaunch.id,
        owner_id: user.id,
        apparent_user_id: member.apparentUserId || null,
        name: member.name,
        role: member.role,
        bio: member.bio,
        location: member.location,
        avatar_url: member.avatarUrl,
        profile_url: member.profileUrl,
        linkedin_url: member.linkedinUrl,
        x_profile_url: member.xProfileUrl,
        github_url: member.githubUrl,
        sort_order: member.sortOrder ?? index,
      })),
    );

    if (teamError) throw teamError;
  }

  const savedLaunch = {
    ...mapProductLaunchRow(data),
    teamMembers,
  };
  publishLocalLaunch(savedLaunch);
  return savedLaunch;
};

export const saveMeetup = async (
  user: AppUser,
  role: DashboardRole,
  meetup: Omit<Meetup, 'id' | 'hostId' | 'hostRole' | 'attendeeCount' | 'isJoined'> & Partial<Pick<Meetup, 'id'>>,
): Promise<Meetup> => {
  const id = meetup.id ?? (isSupabaseConfigured && supabase && !user.isDev ? crypto.randomUUID() : localId('meetup'));
  const nextMeetup: Meetup = {
    id,
    hostId: user.id,
    hostRole: role,
    title: meetup.title,
    audience: meetup.audience,
    city: meetup.city,
    venue: meetup.venue,
    startsAt: meetup.startsAt,
    capacity: meetup.capacity,
    description: meetup.description,
    attendeeCount: 1,
    isJoined: true,
  };

  if (!isSupabaseConfigured || !supabase || user.isDev || nextMeetup.id.startsWith('meetup-')) {
    const current = readLocal<Meetup[]>(storageKey(user, 'meetups'), []);
    writeLocal(storageKey(user, 'meetups'), [
      nextMeetup,
      ...current.filter((item) => item.id !== nextMeetup.id),
    ]);
    const rsvps = readLocal<Record<string, boolean>>(storageKey(user, 'meetup-rsvps'), {});
    writeLocal(storageKey(user, 'meetup-rsvps'), { ...rsvps, [nextMeetup.id]: true });
    return nextMeetup;
  }

  const { data, error } = await supabase
    .from('meetups')
    .upsert({
      id: nextMeetup.id,
      host_id: user.id,
      host_role: role,
      title: nextMeetup.title,
      audience: nextMeetup.audience,
      city: nextMeetup.city,
      venue: nextMeetup.venue,
      starts_at: nextMeetup.startsAt,
      capacity: nextMeetup.capacity,
      description: nextMeetup.description,
    })
    .select('*')
    .single();

  if (error) throw error;

  await supabase.from('meetup_rsvps').upsert({
    meetup_id: String(data.id),
    user_id: user.id,
    status: 'attending',
  });

  return mapMeetupRow(data, 1, true);
};

export const toggleMeetupRsvp = async (user: AppUser, meetupId: string, isJoined: boolean) => {
  if (!isSupabaseConfigured || !supabase || user.isDev || meetupId.startsWith('seed-')) {
    const rsvps = readLocal<Record<string, boolean>>(storageKey(user, 'meetup-rsvps'), {});
    writeLocal(storageKey(user, 'meetup-rsvps'), { ...rsvps, [meetupId]: isJoined });
    return;
  }

  if (isJoined) {
    const { error } = await supabase.from('meetup_rsvps').upsert({
      meetup_id: meetupId,
      user_id: user.id,
      status: 'attending',
    });
    if (error) throw error;
    return;
  }

  const { error } = await supabase
    .from('meetup_rsvps')
    .delete()
    .eq('meetup_id', meetupId)
    .eq('user_id', user.id);
  if (error) throw error;
};

export const saveTermReview = async (
  user: AppUser,
  review: Omit<TermReview, 'id' | 'ownerId' | 'updatedAt'> & Partial<Pick<TermReview, 'id'>>,
): Promise<TermReview> => {
  const id = review.id ?? (isSupabaseConfigured && supabase && !user.isDev ? crypto.randomUUID() : localId('term'));
  const nextReview: TermReview = {
    id,
    ownerId: user.id,
    company: review.company,
    instrument: review.instrument,
    amount: review.amount,
    valuation: review.valuation,
    proRata: review.proRata,
    notes: review.notes,
    status: review.status,
    updatedAt: nowIso(),
  };

  if (!isSupabaseConfigured || !supabase || user.isDev || nextReview.id.startsWith('term-')) {
    const current = readLocal<TermReview[]>(storageKey(user, 'term-reviews'), []);
    writeLocal(storageKey(user, 'term-reviews'), [
      nextReview,
      ...current.filter((item) => item.id !== nextReview.id),
    ]);
    return nextReview;
  }

  const { data, error } = await supabase
    .from('term_reviews')
    .upsert({
      id: nextReview.id,
      user_id: user.id,
      company: nextReview.company,
      instrument: nextReview.instrument,
      amount: nextReview.amount,
      valuation: nextReview.valuation,
      pro_rata: nextReview.proRata,
      notes: nextReview.notes,
      status: nextReview.status,
    })
    .select('*')
    .single();

  if (error) throw error;
  return mapTermReviewRow(data);
};

export const saveMessage = async (
  user: AppUser,
  message: Omit<UserMessage, 'id' | 'ownerId' | 'updatedAt'> & Partial<Pick<UserMessage, 'id'>>,
): Promise<UserMessage> => {
  const id = message.id ?? (isSupabaseConfigured && supabase && !user.isDev ? crypto.randomUUID() : localId('message'));
  // Only address to a real member (uuid) so delivery works; otherwise it stays
  // a sender-side note (e.g. messaging a curated profile that isn't on Apparent).
  const recipientId = message.recipientId && isUuid(message.recipientId) ? message.recipientId : '';
  const nextMessage: UserMessage = {
    id,
    ownerId: user.id,
    recipient: message.recipient,
    recipientId,
    senderName: message.senderName ?? '',
    subject: message.subject,
    body: message.body,
    status: message.status,
    context: message.context,
    updatedAt: nowIso(),
  };

  if (!isSupabaseConfigured || !supabase || user.isDev || nextMessage.id.startsWith('message-')) {
    const current = readLocal<UserMessage[]>(storageKey(user, 'messages'), []);
    writeLocal(storageKey(user, 'messages'), [
      nextMessage,
      ...current.filter((item) => item.id !== nextMessage.id),
    ]);
    return nextMessage;
  }

  const { data, error } = await supabase
    .from('user_messages')
    .upsert({
      id: nextMessage.id,
      owner_id: user.id,
      recipient: nextMessage.recipient,
      recipient_id: recipientId || null,
      sender_name: nextMessage.senderName,
      subject: nextMessage.subject,
      body: nextMessage.body,
      status: nextMessage.status,
      context: nextMessage.context,
    })
    .select('*')
    .single();

  if (error) throw error;
  return mapMessageRow(data);
};

export const saveFeedAction = async (
  user: AppUser,
  itemId: string,
  action: Partial<Pick<FeedItem, 'saved' | 'reposted' | 'reply'>>,
) => {
  if (!isSupabaseConfigured || !supabase || user.isDev) {
    const current = readLocal<Record<string, Partial<FeedItem>>>(storageKey(user, 'feed-actions'), {});
    writeLocal(storageKey(user, 'feed-actions'), {
      ...current,
      [itemId]: {
        ...current[itemId],
        ...action,
      },
    });
    return;
  }

  const { error } = await supabase.from('feed_item_actions').upsert({
    user_id: user.id,
    item_id: itemId,
    saved: action.saved,
    reposted: action.reposted,
    reply: action.reply,
  });

  if (error) throw error;
};

/**
 * Toggle an upvote on a launch.
 * `currentlyUpvoted` is the CURRENT state before this action — pass `true` to remove the upvote.
 * Uses the `launch_upvotes` table; the DB trigger maintains `product_launches.upvote_count`.
 * Falls back to no-op for dev sessions (state is managed optimistically in the component).
 */
export const toggleLaunchUpvote = async (
  user: AppUser,
  launchId: string,
  currentlyUpvoted: boolean,
): Promise<void> => {
  if (!isSupabaseConfigured || !supabase || user.isDev) {
    return;
  }

  if (currentlyUpvoted) {
    const { error } = await supabase
      .from('launch_upvotes')
      .delete()
      .eq('user_id', user.id)
      .eq('launch_id', launchId);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('launch_upvotes')
      .upsert({ user_id: user.id, launch_id: launchId });
    if (error) throw error;
  }
};

/**
 * Persist a comment on a launch.
 * Returns the comment body that was saved.
 */
export const saveLaunchComment = async (
  user: AppUser,
  launchId: string,
  body: string,
): Promise<string> => {
  if (!isSupabaseConfigured || !supabase || user.isDev) {
    return body; // dev: optimistic only
  }

  const { error } = await supabase
    .from('launch_comments')
    .insert({ user_id: user.id, launch_id: launchId, body });
  if (error) throw error;
  return body;
};

/**
 * Save / un-save an investor match name for a founder.
 * Reuses `feed_item_actions` with an "inv-match:" prefix so no extra table is needed.
 */
export const saveInvestorMatchBookmark = async (
  user: AppUser,
  matchName: string,
  saved: boolean,
): Promise<void> => {
  return saveFeedAction(user, `inv-match:${matchName}`, { saved, reposted: false, reply: '' });
};
