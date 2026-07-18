import {
  cityCoordinates,
  cityGeoCoordinates,
  defaultFounderProfile,
  defaultInvestorCriteria,
  generalFeedDefaults,
  seedBuilderNodes,
  seedMeetups,
} from '@/lib/app-defaults';
import type {
  AppUser,
  AgentProfilePatch,
  AgentMemory,
  AgentChatHistoryMessage,
  AgentChatThread,
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
  Notification,
  PublicFounderProfile,
  PublicProfileResult,
  PublicProjectDetail,
  ProductLaunch,
  SourcedStartup,
  SourcedDossier,
  TermReview,
  VCContact,
  UserMessage,
  UserSettings,
  VcInterestEntry,
  VcOutreachEntry,
  VcOutreachStage,
  VcOutreachTemplate,
} from '@/lib/apparent-types';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

const settingsDefault: UserSettings = {
  dailyDigestEnabled: true,
  slackAlertsEnabled: true,
  agentAutonomy: 'manual',
};

const coerceAutonomy = (value: unknown): UserSettings['agentAutonomy'] =>
  value === 'auto_onplatform' || value === 'autonomous' ? value : 'manual';

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

// ---------- Timed cache (stale-while-revalidate) ----------
// Each entry is { data, ts } where ts is Date.now() at write time.
// readCache returns null on miss, parse error, or missing fields.
const readCache = <T>(key: string): { data: T; ts: number } | null => {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { data: T; ts: number };
    return parsed?.data !== undefined && typeof parsed.ts === 'number' ? parsed : null;
  } catch {
    return null;
  }
};

const writeCache = (key: string, data: unknown): void => {
  try {
    window.localStorage.setItem(key, JSON.stringify({ data, ts: Date.now() }));
  } catch {
    // localStorage quota exceeded — silently ignore
  }
};

export const readPublicProductLaunches = () =>
  readLocal<ProductLaunch[]>(PUBLIC_LAUNCHES_STORAGE_KEY, []);

/** Returns empty string for data:/blob: URLs — safe to write to Supabase or localStorage. */
const safeUrl = (url: string | undefined): string =>
  url && !url.startsWith('data:') && !url.startsWith('blob:') ? url : '';

/** Strip ephemeral data:/blob: URLs before persisting to localStorage to avoid quota errors. */
const stripEphemeralUrls = (launch: ProductLaunch): ProductLaunch => {
  const mediaFields = ['logoUrl', 'bannerUrl', 'demoVideoUrl', 'pitchVideoUrl', 'pitchDeckUrl'] as const;
  let stripped = { ...launch };
  for (const field of mediaFields) {
    const val = stripped[field];
    if (typeof val === 'string' && (val.startsWith('data:') || val.startsWith('blob:'))) {
      stripped = { ...stripped, [field]: '' };
    }
  }
  return stripped;
};

const publishLocalLaunch = (launch: ProductLaunch) => {
  const current = readPublicProductLaunches();
  writeLocal(PUBLIC_LAUNCHES_STORAGE_KEY, [
    stripEphemeralUrls(launch),
    ...current.filter((item) => item.id !== launch.id),
  ]);
};

// ---------- Thesis/sector matching engine ----------
// The old matcher did naive case-insensitive substring checks on >2-char
// tokens, so "AI infra" never matched "machine learning tooling", and short
// tokens produced false hits. This version is concept-aware (synonyms map to a
// shared canonical concept), word-boundary safe, and proportional (a partial
// thesis overlap scores less than a full one).

// Canonical concept → every surface form that should resolve to it. Multi-word
// forms are matched as whole phrases; single tokens as whole words.
const CONCEPT_SYNONYMS: Record<string, string[]> = {
  ai: ['ai', 'a i', 'artificial intelligence', 'machine learning', 'ml', 'deep learning', 'llm', 'llms', 'genai', 'generative ai', 'foundation model', 'foundation models', 'neural', 'nlp', 'computer vision'],
  agents: ['agent', 'agents', 'agentic', 'autonomous agents', 'ai agents', 'copilot', 'copilots'],
  devtools: ['devtools', 'developer tools', 'dev tools', 'developer experience', 'developer platform', 'tooling', 'sdk', 'cli', 'api platform', 'apis'],
  infra: ['infra', 'infrastructure', 'cloud', 'devops', 'observability', 'kubernetes', 'serverless', 'data infrastructure', 'compute', 'networking'],
  data: ['data', 'analytics', 'database', 'data engineering', 'etl', 'warehouse', 'data warehouse', 'business intelligence', 'data platform'],
  fintech: ['fintech', 'finance', 'financial', 'payments', 'banking', 'lending', 'insurance', 'insurtech', 'wealth', 'trading', 'accounting', 'treasury'],
  security: ['security', 'cybersecurity', 'infosec', 'cyber', 'appsec', 'privacy', 'compliance', 'soc2', 'identity', 'authentication', 'encryption'],
  health: ['health', 'healthcare', 'healthtech', 'medtech', 'biotech', 'bio', 'medical', 'clinical', 'digital health', 'life sciences', 'pharma', 'diagnostics'],
  saas: ['saas', 'b2b', 'enterprise', 'enterprise software', 'business software', 'vertical saas'],
  consumer: ['consumer', 'b2c', 'social', 'marketplace', 'marketplaces', 'mobile app', 'd2c', 'dtc', 'creator', 'creators'],
  commerce: ['commerce', 'ecommerce', 'e commerce', 'retail', 'shopping', 'payments commerce'],
  crypto: ['crypto', 'web3', 'blockchain', 'defi', 'onchain', 'on chain', 'nft', 'wallet', 'stablecoin'],
  climate: ['climate', 'climatetech', 'cleantech', 'clean energy', 'energy', 'sustainability', 'carbon', 'solar', 'battery'],
  productivity: ['productivity', 'workflow', 'workflows', 'collaboration', 'no code', 'nocode', 'low code', 'automation'],
  hardware: ['hardware', 'robotics', 'iot', 'devices', 'semiconductor', 'chips', 'drones', 'sensors'],
  education: ['education', 'edtech', 'learning', 'e learning', 'upskilling'],
  legal: ['legal', 'legaltech', 'legal ops', 'contracts', 'governance'],
  hr: ['hr', 'hrtech', 'recruiting', 'talent', 'people ops', 'hiring', 'workforce'],
  sales: ['sales', 'crm', 'gtm', 'go to market', 'revenue', 'salestech', 'pipeline'],
  marketing: ['marketing', 'martech', 'growth', 'advertising', 'adtech', 'seo', 'social media'],
  logistics: ['logistics', 'supply chain', 'freight', 'shipping', 'fleet', 'delivery'],
  gaming: ['gaming', 'games', 'game', 'esports', 'gamedev'],
};

// Words too generic to carry sector signal on their own — excluded from the
// literal-keyword overlap so they don't inflate fit.
const MATCH_STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'that', 'this', 'our', 'your', 'are', 'from', 'into', 'out',
  'who', 'what', 'how', 'using', 'use', 'used', 'build', 'building', 'builds', 'builder',
  'builders', 'founder', 'founders', 'startup', 'startups', 'company', 'companies', 'team',
  'teams', 'early', 'stage', 'tech', 'technology', 'platform', 'tool', 'tools', 'app', 'apps',
  'product', 'products', 'software', 'solution', 'solutions', 'focused', 'focus', 'first', 'new',
  'based', 'making', 'make', 'help', 'helps', 'helping', 'better', 'best', 'next', 'generation',
]);

// Map a free-text blob to the set of canonical concepts it mentions.
const conceptsIn = (text: string): Set<string> => {
  const normalized = ` ${text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ')} `;
  const found = new Set<string>();
  for (const [concept, forms] of Object.entries(CONCEPT_SYNONYMS)) {
    for (const form of forms) {
      if (normalized.includes(` ${form} `)) {
        found.add(concept);
        break;
      }
    }
  }
  return found;
};

// Significant literal tokens (length > 2, not a stopword). Captures niche
// keywords the synonym map doesn't know about (e.g. a specific protocol name).
const keywordsIn = (text: string): Set<string> => {
  const tokens = text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 2 && !MATCH_STOPWORDS.has(token));
  return new Set(tokens);
};

const intersectionSize = (a: Set<string>, b: Set<string>): number => {
  let count = 0;
  a.forEach((value) => {
    if (b.has(value)) count += 1;
  });
  return count;
};

/**
 * Proportional 0..1 relevance of `criteria` text against a `haystack`, plus a
 * boolean "did anything match at all". Canonical concepts weigh ~1.5x literal
 * keywords. The score saturates so a thesis with many matched concepts can't
 * dominate — it's normalized against what the criteria asked for.
 */
const relevanceScore = (criteria: string, haystack: string): { score: number; matched: boolean } => {
  if (!criteria.trim()) return { score: 0, matched: false };

  const criteriaConcepts = conceptsIn(criteria);
  const haystackConcepts = conceptsIn(haystack);
  const conceptHits = intersectionSize(criteriaConcepts, haystackConcepts);

  const criteriaWords = keywordsIn(criteria);
  const haystackWords = keywordsIn(haystack);
  const wordHits = intersectionSize(criteriaWords, haystackWords);

  // What a "full" match would look like for this criteria string. Cap the
  // keyword contribution so a long thesis paragraph doesn't make every match
  // look weak.
  const expected = Math.max(1, criteriaConcepts.size * 1.5 + Math.min(criteriaWords.size, 5));
  const hits = conceptHits * 1.5 + wordHits;
  const score = Math.min(1, hits / expected);

  return { score, matched: conceptHits > 0 || wordHits > 0 };
};

// Normalize funding stage so "Pre-seed" / "pre seed" / "preseed" all compare
// equal, and "Series A" matches "series-a".
const normalizeStage = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');

const stageMatches = (criteriaStage: string, builderStage: string): boolean => {
  const a = normalizeStage(criteriaStage);
  const b = normalizeStage(builderStage);
  if (!a || !b) return false;
  return a.includes(b) || b.includes(a);
};

// Award a base point value scaled by relevance: a match earns at least half the
// base (so a real hit always feels meaningful) and the full base at score 1.
const scaledPoints = (base: number, score: number) => Math.round(base * (0.5 + 0.5 * score));


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
  tractionType: String(row?.traction_type ?? row?.tractionType ?? ''),
  tractionValue: String(row?.traction_value ?? row?.tractionValue ?? ''),
  teamSize: String(row?.team_size ?? row?.teamSize ?? ''),
  priorRaiseAmount: String(row?.prior_raise_amount ?? row?.priorRaiseAmount ?? ''),
  targetCloseDate: String(row?.target_close_date ?? row?.targetCloseDate ?? ''),
});

// 6 fields a founder must fill before VCs see their profile. Picked to be the
// minimum a VC needs to triage a deal: who, what, stage, raising, sector, and
// one concrete traction signal.
export const FOUNDER_REQUIRED_FIELDS = [
  'profileName',
  'headline',
  'stage',
  'fundraisingStatus',
  'category',
] as const;

// Weighted set used to compute the 0-100 completeness score. Required fields
// weigh more, so the score tracks "is this profile decision-grade for a VC."
const FOUNDER_COMPLETENESS_WEIGHTS: Record<string, number> = {
  profileName: 10,
  headline: 10,
  stage: 10,
  category: 10,
  fundraisingStatus: 8,
  // One traction signal — either the new typed pair or the legacy mrr field counts.
  tractionValue: 10,
  bio: 6,
  currentBuild: 6,
  raisingAmount: 5,
  raisingRound: 4,
  teamSize: 4,
  priorRaiseAmount: 3,
  targetCloseDate: 3,
  website: 3,
  linkedin: 3,
  location: 3,
  github: 2,
};

const FOUNDER_COMPLETENESS_MAX = Object.values(FOUNDER_COMPLETENESS_WEIGHTS).reduce((sum, n) => sum + n, 0);

const filled = (value: unknown) => typeof value === 'string' && value.trim().length > 0;

/** 0-100 weighted completeness score. Used to gate VC visibility + power the sort. */
export const computeFounderCompleteness = (values: Partial<FounderProfileValues>): number => {
  let earned = 0;
  for (const [key, weight] of Object.entries(FOUNDER_COMPLETENESS_WEIGHTS)) {
    if (key === 'tractionValue') {
      // Either the typed traction pair or the legacy mrr satisfies the signal.
      if (filled(values.tractionValue) || filled(values.mrr)) earned += weight;
    } else if (filled((values as Record<string, unknown>)[key])) {
      earned += weight;
    }
  }
  // fundraisingStatus is always populated (defaults to 'not_raising'); only count
  // it as "filled" when the founder actually picked raising/open.
  if (values.fundraisingStatus === 'not_raising' || !values.fundraisingStatus) {
    earned -= FOUNDER_COMPLETENESS_WEIGHTS.fundraisingStatus;
  }
  return Math.max(0, Math.min(100, Math.round((earned / FOUNDER_COMPLETENESS_MAX) * 100)));
};

/** Same scoring as above, but reads the snake_case columns we get from Supabase. */
const completenessFromRow = (row: Record<string, unknown>): number =>
  computeFounderCompleteness({
    profileName: String(row.profile_name ?? ''),
    headline: String(row.headline ?? ''),
    bio: String(row.bio ?? ''),
    currentBuild: String(row.current_build ?? ''),
    category: String(row.category ?? ''),
    stage: String(row.stage ?? ''),
    github: String(row.github ?? ''),
    location: String(row.location ?? ''),
    website: String(row.website ?? ''),
    linkedin: String(row.linkedin ?? ''),
    mrr: String(row.mrr ?? ''),
    fundraisingStatus: String(row.fundraising_status ?? ''),
    raisingRound: String(row.raising_round ?? ''),
    raisingAmount: String(row.raising_amount ?? ''),
    tractionType: String(row.traction_type ?? ''),
    tractionValue: String(row.traction_value ?? ''),
    teamSize: String(row.team_size ?? ''),
    priorRaiseAmount: String(row.prior_raise_amount ?? ''),
    targetCloseDate: String(row.target_close_date ?? ''),
  });

/** Returns the subset of FOUNDER_REQUIRED_FIELDS that are still empty. UI uses this to nudge. */
export const missingRequiredFounderFields = (values: Partial<FounderProfileValues>): string[] => {
  const missing: string[] = [];
  for (const key of FOUNDER_REQUIRED_FIELDS) {
    if (!filled((values as Record<string, unknown>)[key])) missing.push(key);
  }
  if (values.fundraisingStatus === 'not_raising' || !values.fundraisingStatus) {
    missing.push('fundraisingStatus');
  }
  if (!filled(values.tractionValue) && !filled(values.mrr)) missing.push('tractionValue');
  return Array.from(new Set(missing));
};

/** Profile is "VC-grade" once all required fields are filled AND completeness >= 40%. */
export const isFounderProfileVcVisible = (values: Partial<FounderProfileValues>): boolean =>
  missingRequiredFounderFields(values).length === 0 && computeFounderCompleteness(values) >= 40;

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
    githubVerified: row.github_verified === true,
    githubUsername: String(row.github_username ?? ''),
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
  readAt: row.read_at || row.readAt ? String(row.read_at ?? row.readAt) : undefined,
});

const mapNotificationRow = (row: Record<string, unknown>): Notification => ({
  id: String(row.id),
  userId: String(row.user_id ?? row.userId ?? ''),
  type: String(row.type ?? 'info'),
  title: String(row.title ?? ''),
  body: String(row.body ?? ''),
  link: String(row.link ?? ''),
  data:
    row.data && typeof row.data === 'object' && !Array.isArray(row.data)
      ? (row.data as Record<string, unknown>)
      : {},
  readAt: row.read_at || row.readAt ? String(row.read_at ?? row.readAt) : undefined,
  createdAt: String(row.created_at ?? row.createdAt ?? nowIso()),
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
        mrr: String(profile.mrr ?? ''),
        tractionType: String(profile.traction_type ?? ''),
        tractionValue: String(profile.traction_value ?? ''),
        teamSize: String(profile.team_size ?? ''),
        priorRaiseAmount: String(profile.prior_raise_amount ?? ''),
        targetCloseDate: String(profile.target_close_date ?? ''),
        profileCompleteness:
          typeof profile.profile_completeness === 'number'
            ? profile.profile_completeness
            : completenessFromRow(profile as Record<string, unknown>),
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
    mrr: founderProfile.mrr,
    tractionType: founderProfile.tractionType,
    tractionValue: founderProfile.tractionValue,
    teamSize: founderProfile.teamSize,
    priorRaiseAmount: founderProfile.priorRaiseAmount,
    targetCloseDate: founderProfile.targetCloseDate,
    profileCompleteness: computeFounderCompleteness(founderProfile),
  };
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
    // Thesis + sectors are the heart of the match — concept-aware and
    // proportional. A thesis is usually prose, so include sectors in its
    // haystack-side comparison too.
    const thesis = relevanceScore(criteria.thesis, haystack);
    if (thesis.matched) {
      score += scaledPoints(16, thesis.score);
      reasons.push('Thesis match');
    }
    const sectors = relevanceScore(criteria.sectors, haystack);
    if (sectors.matched) {
      score += scaledPoints(12, sectors.score);
      reasons.push('Sector fit');
    }
    if (criteria.stage && stageMatches(criteria.stage, builder.stage)) {
      score += 9;
      reasons.push('Stage fit');
    }
    const geography = relevanceScore(criteria.geography, builder.location);
    if (geography.matched) {
      score += scaledPoints(7, geography.score);
      reasons.push('Geography fit');
    }
    const founderSignals = relevanceScore(criteria.founderSignals, haystack);
    if (founderSignals.matched) {
      score += scaledPoints(10, founderSignals.score);
      reasons.push('Founder signal');
    }
    const passSignals = relevanceScore(criteria.passSignals, haystack);
    if (passSignals.matched) {
      // Penalty scales with how strongly the pass-signal shows up.
      score -= scaledPoints(18, passSignals.score);
      reasons.push('Pass-signal risk');
    }
  } else {
    const profile = values as FounderProfileValues;
    const category = relevanceScore(profile.category, haystack);
    if (category.matched) {
      score += scaledPoints(14, category.score);
      reasons.push('Similar category');
    }
    if (profile.stage && stageMatches(profile.stage, builder.stage)) {
      score += 9;
      reasons.push('Similar stage');
    }
    const nearby = relevanceScore(profile.location, builder.location);
    if (nearby.matched) {
      score += scaledPoints(12, nearby.score);
      reasons.push('Nearby builder');
    }
    const buildOverlap = relevanceScore(profile.currentBuild, haystack);
    if (buildOverlap.matched) {
      score += scaledPoints(8, buildOverlap.score);
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

// ---------- Sourced (web-discovered) signals ----------
// Rows in public.source_signals are "Sourced" leads written by the scheduled
// ingestion job (api/ingest-signals.js): real startups found on the web that
// match the platform's aggregate investor sectors. Unlike Apparent builders
// they are NOT GitHub-verified, so the dashboard renders them distinctly
// (source 'Web', no verified avatar). We score them against the investor's
// thesis with the same weighting as calculateBuilderFit's investor branch so
// ranked order is consistent across both sources.
const scoreSourcedSignal = (criteria: InvestorCriteriaValues, haystack: string, stage: string): number => {
  let score = 44;
  const thesis = relevanceScore(criteria.thesis, haystack);
  if (thesis.matched) score += scaledPoints(16, thesis.score);
  const sectors = relevanceScore(criteria.sectors, haystack);
  if (sectors.matched) score += scaledPoints(12, sectors.score);
  if (criteria.stage && stage && stageMatches(criteria.stage, stage)) score += 9;
  const geography = relevanceScore(criteria.geography, haystack);
  if (geography.matched) score += scaledPoints(7, geography.score);
  const founderSignals = relevanceScore(criteria.founderSignals, haystack);
  if (founderSignals.matched) score += scaledPoints(10, founderSignals.score);
  const passSignals = relevanceScore(criteria.passSignals, haystack);
  if (passSignals.matched) score -= scaledPoints(18, passSignals.score);
  return Math.max(1, Math.min(98, Math.round(score)));
};

const mapSourceSignalRow = (
  row: Record<string, unknown>,
  criteria: InvestorCriteriaValues,
  // Keyed by the stored signal_id, which is the full `sourced:<uuid>` id (see
  // saveSignalStage) so a card the investor dragged keeps its kanban column.
  stageBySignalId: Map<string, InvestorDealStage>,
): InvestorSignal => {
  const rawId = String(row.id ?? '');
  const id = `sourced:${rawId}`;
  const company = String(row.company ?? '');
  const founder = String(row.founder ?? '') || 'Founding team';
  const detail = String(row.detail ?? '');
  const stage = String(row.stage ?? '');
  const location = String(row.location ?? '');
  const sourceUrl = String(row.source_url ?? '');
  const tags = Array.isArray(row.raw_tags) ? (row.raw_tags as unknown[]).map(String).filter(Boolean) : [];
  const freshnessAt = String(row.freshness_at ?? row.created_at ?? '');
  const haystack = [company, founder, detail, stage, location, tags.join(' ')].join(' ');
  return {
    id,
    company,
    founder,
    detail: detail || 'Sourced from the web',
    source: 'Sourced',
    sourceUrl,
    profileUrl: String(row.profile_url ?? '') || sourceUrl,
    relevance: scoreSourcedSignal(criteria, haystack, stage),
    freshness: freshnessAt ? formatFreshness(freshnessAt) : '',
    stage,
    location,
    column: stageBySignalId.get(id) ?? 'New',
    outreach: '',
    sourceType: 'web',
    freshnessAt,
    githubUrl: String(row.github_url ?? ''),
    rawTags: tags,
  };
};

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

  const [{ data: profileRows }, { data: launchRows }, { data: stateRows }] = await Promise.all([
    supabase.from('founder_profiles').select('*').eq('public_profile_enabled', true).order('updated_at', { ascending: false }),
    supabase.from('product_launches').select('*').eq('public_profile_enabled', true).order('updated_at', { ascending: false }),
    supabase.from('builder_discovery_states').select('*').eq('user_id', user.id),
  ]);

  const allLaunches = (launchRows ?? []).map((row) => mapProductLaunchRow(row));
  // Only founders who have public profiles AND at least one published launch.
  const mappedBuilders = mapBuilderProfileRows((profileRows ?? []) as Record<string, unknown>[], allLaunches, user.id)
    .filter((b) => b.launchCount > 0);
  const builderNodes = mappedBuilders
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

/**
 * Full sourced-startup record for the investor-facing /sourced/:id detail page.
 * Richer than loadSourceSignal (which backs the founder claim landing) — pulls
 * every column the editorial template surfaces.
 */
export const loadSourceSignalDetail = async (
  signalId: string,
): Promise<SourcedStartup | null> => {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    // select('*') (not an explicit column list) so this read keeps working
    // before the dossier/dossier_at migration is applied — those columns are
    // simply absent until then, leaving dossier null. Avoids a deploy-vs-migration
    // window where naming a missing column would 500 the whole page.
    const { data, error } = await supabase
      .from('source_signals')
      .select('*')
      .eq('id', signalId)
      .maybeSingle();
    if (error || !data) return null;
    return {
      id: String(data.id ?? signalId),
      company: String(data.company ?? ''),
      founder: String(data.founder ?? ''),
      detail: String(data.detail ?? ''),
      sourceType: String(data.source_type ?? ''),
      sourceUrl: String(data.source_url ?? ''),
      profileUrl: String(data.profile_url ?? ''),
      stage: String(data.stage ?? ''),
      location: String(data.location ?? ''),
      githubUrl: String(data.github_url ?? ''),
      tags: Array.isArray(data.raw_tags) ? data.raw_tags.map(String) : [],
      freshnessAt: String(data.freshness_at ?? ''),
      dossier: (data.dossier as SourcedDossier | null) ?? null,
      dossierAt: String(data.dossier_at ?? ''),
    };
  } catch {
    return null;
  }
};

/**
 * Trigger (or fetch the cached) agent deep dive for a sourced startup. POSTs to
 * /api/sourced-enrich with the caller's Supabase JWT — the server researches the
 * company through the Apparent runtime and Orthogonal tools, caches the dossier on the row, and returns it.
 * On-demand: only called when an investor clicks "Generate deep dive".
 */
export const enrichSourcedStartup = async (
  signalId: string,
  force = false,
): Promise<{ ok: boolean; dossier: SourcedDossier | null; error?: string }> => {
  if (!isSupabaseConfigured || !supabase) return { ok: false, dossier: null, error: 'Sign-in required.' };
  const { data } = await supabase.auth.getSession();
  const jwt = data.session?.access_token;
  if (!jwt) return { ok: false, dossier: null, error: 'Your session expired — sign in again.' };
  try {
    const res = await fetch('/api/sourced-enrich', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${jwt}` },
      body: JSON.stringify({ signalId, force }),
    });
    const body = (await res.json().catch(() => ({}))) as { ok?: boolean; dossier?: SourcedDossier; error?: string };
    if (res.ok && body.ok && body.dossier) return { ok: true, dossier: body.dossier };
    return { ok: false, dossier: null, error: body.error || `Deep dive failed (${res.status})` };
  } catch (error) {
    return { ok: false, dossier: null, error: error instanceof Error ? error.message : 'Network error.' };
  }
};

/**
 * Daily deal flow for the investor "Daily" tab, sourced from the durable
 * source_signals table rather than the R2 digest. Each item carries
 * projectPath → /sourced/<uuid> so cards open the in-app sourced profile
 * instead of linking out to the original listing. Ordered by freshness.
 * Returns [] when unconfigured/empty so the caller can fall back to the legacy
 * R2 feed.
 */
export const loadDailyDigestSourced = async (limit = 200): Promise<ProductLaunch[]> => {
  if (!isSupabaseConfigured || !supabase) return [];
  try {
    const { data, error } = await supabase
      .from('source_signals')
      .select('id, company, founder, detail, source_type, source_url, profile_url, stage, location, github_url, raw_tags, freshness_at')
      .order('freshness_at', { ascending: false })
      .limit(limit);
    if (error || !Array.isArray(data)) return [];
    return data
      .map((row): ProductLaunch => {
        const id = String(row.id ?? '');
        const tags = Array.isArray(row.raw_tags) ? (row.raw_tags as unknown[]).map(String).filter(Boolean) : [];
        const sourceUrl = String(row.source_url ?? '');
        const homepage = String(row.profile_url ?? '') || sourceUrl;
        const detail = String(row.detail ?? '');
        return {
          id,
          ownerId: '',
          name: String(row.company ?? ''),
          tagline: detail,
          intro: detail,
          category: tags[0] ?? '',
          stage: String(row.stage ?? ''),
          location: String(row.location ?? ''),
          launchUrl: homepage,
          proofUrl: sourceUrl,
          logoUrl: '',
          founderSignals: tags,
          metrics: '',
          updatedAt: String(row.freshness_at ?? ''),
          origin: 'external',
          source: 'Sourced',
          sourceUrl,
          projectPath: id ? `/sourced/${id}` : undefined,
        };
      })
      .filter((launch) => launch.name && launch.projectPath);
  } catch {
    return [];
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
    // Incoming DMs: refresh so a new message + unread badge appears live.
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'user_messages', filter: `recipient_id=eq.${user.id}` },
      onChange,
    )
    // Personal notifications (e.g. "a matched founder just launched").
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
      onChange,
    )
    .subscribe();

  return () => {
    void supabaseClient.removeChannel(channel);
  };
};

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const PUB_LAUNCHES_CACHE_KEY = 'apparent:pub-launches-v1';

export const loadPublicProductLaunches = async (
  onCached?: (launches: ProductLaunch[]) => void,
): Promise<ProductLaunch[]> => {
  if (!isSupabaseConfigured || !supabase) {
    return [];
  }

  // Serve stale cache immediately before the network round-trip.
  const cached = readCache<ProductLaunch[]>(PUB_LAUNCHES_CACHE_KEY);
  if (cached && onCached) onCached(cached.data);

  const { data, error } = await supabase
    .from('product_launches')
    .select('*')
    .eq('public_profile_enabled', true)
    .order('updated_at', { ascending: false });

  if (error) {
    return cached?.data ?? [];
  }

  const launches = (data ?? []).map((row) => mapProductLaunchRow(row));
  writeCache(PUB_LAUNCHES_CACHE_KEY, launches);
  return launches;
};

export const loadFounderVCContacts = async (
  onCached?: (contacts: VCContact[]) => void,
): Promise<VCContact[]> => {
  const loadSeedContacts = async () => {
    const { vcContactSeed } = await import('@/data/vc-contact-seed');
    return vcContactSeed;
  };

  // Identity key for dedup. Partner email is the strongest unique handle when
  // present; otherwise fall back to investor name + website. Lower-cased and
  // trimmed so casing/whitespace differences don't create false duplicates.
  const contactKey = (contact: VCContact): string => {
    const email = (contact.partnerEmail || '').toLowerCase().trim();
    if (email) return `email:${email}`;
    const name = (contact.investorName || '').toLowerCase().trim();
    const website = (contact.website || '').toLowerCase().trim().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');
    return `nw:${name}|${website}`;
  };

  const unionWithSeed = (contacts: VCContact[]): VCContact[] => {
    const merged = new Map<string, VCContact>();
    for (const contact of contacts) merged.set(contactKey(contact), contact);
    for (const contact of seedContacts) {
      const key = contactKey(contact);
      if (!merged.has(key)) merged.set(key, contact);
    }
    return Array.from(merged.values());
  };

  // Always start with the bundled seed so the logged-in dashboard sees the
  // same baseline coverage as the logged-out /heat-map page. The seed is
  // bundled at build time and ships with the app, so this is free.
  const seedContacts = await loadSeedContacts();

  if (!isSupabaseConfigured || !supabase) {
    return seedContacts;
  }

  // 10K-row pagination is expensive — cache for 1 hour.
  const VC_CACHE_KEY = 'apparent:vc-contacts-v2';
  const VC_CACHE_TTL_MS = 60 * 60 * 1000;
  const vcCached = readCache<VCContact[]>(VC_CACHE_KEY);
  if (vcCached && Date.now() - vcCached.ts < VC_CACHE_TTL_MS) {
    // Fresh cache — call onCached and return immediately, no network call.
    const cachedWithSeed = unionWithSeed(vcCached.data);
    if (onCached) onCached(cachedWithSeed);
    return cachedWithSeed;
  }
  // Stale/empty cache — show seed or stale data immediately while fetching.
  if (onCached) onCached(vcCached ? unionWithSeed(vcCached.data) : seedContacts);

  const rows: Record<string, unknown>[] = [];
  const pageSize = 1000;
  const maxRows = 10000;

  for (let from = 0; from < maxRows; from += pageSize) {
    const to = Math.min(from + pageSize - 1, maxRows - 1);
    const { data, error } = await supabase
      .from('vc_contacts')
      .select('*')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .order('number_of_investments', { ascending: false })
      .range(from, to);

    if (error) {
      // DB error (e.g. RLS denial for anon) — just hand back the seed.
      return seedContacts;
    }

    const page = (data ?? []) as Record<string, unknown>[];
    rows.push(...page);

    if (page.length < pageSize) {
      break;
    }
  }

  if (rows.length === 0) {
    return seedContacts;
  }

  // Union DB rows with the seed. DB rows win on conflict because they're
  // fresher (admin can update vc_contacts post-deploy without re-shipping
  // the bundle), but every seed contact the DB doesn't have still appears.
  // Result: the logged-in dashboard sees >= the logged-out /heat-map count.
  const result = unionWithSeed(rows.map((row) => mapVCContactRow(row)));
  writeCache(VC_CACHE_KEY, result);
  return result;
};

/**
 * Pull every investor who signed up on Apparent and made their criteria
 * publicly visible. Used by the founder's "Investor Matches" view to mix
 * real Apparent investors into the ranking alongside the bundled VC list.
 */
export interface ApparentInvestorRow {
  userId: string;
  username: string;
  displayName: string;
  thesis: string;
  sectors: string;
  stage: string;
  checkSize: string;
  geography: string;
  founderSignals: string;
  portfolioExamples: string;
}

export const loadApparentInvestors = async (): Promise<ApparentInvestorRow[]> => {
  if (!isSupabaseConfigured || !supabase) return [];

  try {
    const { data: profileRows, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username, display_name')
      .eq('role', 'investor');
    if (profilesError || !profileRows?.length) return [];

    const ids = profileRows.map((row) => String(row.id));
    const { data: criteriaRows } = await supabase
      .from('investor_criteria')
      .select('*')
      .in('user_id', ids)
      .eq('public_profile_enabled', true);

    const criteriaByUser = new Map(
      (criteriaRows ?? []).map((row) => [String(row.user_id), row as Record<string, unknown>]),
    );

    return profileRows
      .filter((row) => criteriaByUser.has(String(row.id)))
      .map((row) => {
        const id = String(row.id);
        const criteria = criteriaByUser.get(id)!;
        const displayName =
          String(row.display_name ?? '').trim() ||
          String(row.username ?? '') ||
          'Investor on Apparent';
        return {
          userId: id,
          username: String(row.username ?? ''),
          displayName,
          thesis: String(criteria.thesis ?? ''),
          sectors: String(criteria.sectors ?? ''),
          stage: String(criteria.stage ?? ''),
          checkSize: String(criteria.check_size ?? ''),
          geography: String(criteria.geography ?? ''),
          founderSignals: String(criteria.founder_signals ?? ''),
          portfolioExamples: String(criteria.portfolio_examples ?? ''),
        };
      });
  } catch {
    return [];
  }
};

/**
 * Batch-load display info for the owners of a set of launches so the
 * For You feed can show real founder names + canonical @-handle profile
 * links instead of the placeholder "Founder on Apparent" label.
 */
export type LaunchAuthor = {
  name: string;
  username: string;
  photoUrl: string;
  githubVerified: boolean;
};

export const loadLaunchAuthors = async (
  ownerIds: string[],
): Promise<Record<string, LaunchAuthor>> => {
  const result: Record<string, LaunchAuthor> = {};
  if (!ownerIds.length || !isSupabaseConfigured || !supabase) return result;

  const uniqueIds = Array.from(new Set(ownerIds.filter((id) => id && isUuid(id))));
  if (!uniqueIds.length) return result;

  try {
    const [{ data: profileRows }, { data: founderRows }] = await Promise.all([
      supabase.from('profiles').select('id, username, display_name').in('id', uniqueIds),
      supabase
        .from('founder_profiles')
        .select('user_id, profile_name, profile_photo_url, github_verified')
        .in('user_id', uniqueIds),
    ]);

    const founderById = new Map(
      (founderRows ?? []).map((row) => [String(row.user_id), row]),
    );

    (profileRows ?? []).forEach((row) => {
      const id = String(row.id);
      const fp = founderById.get(id);
      const founderName = fp ? String(fp.profile_name ?? '').trim() : '';
      const fallbackName =
        String(row.display_name ?? '').trim() || String(row.username ?? '') || 'Founder on Apparent';
      result[id] = {
        name: founderName || fallbackName,
        username: String(row.username ?? ''),
        photoUrl: fp ? String(fp.profile_photo_url ?? '') : '',
        githubVerified: fp?.github_verified === true,
      };
    });
  } catch {
    /* Non-fatal — caller will fall back to the placeholder label. */
  }

  return result;
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
    return { kind: 'not_found' };
  }

  try {
  // 1. Resolve username → user_id + role.
  //    First try username match; if the handle looks like a UUID try id match too.
  let { data: profileRow } = await supabase
    .from('profiles')
    .select('id, role, display_name, username')
    .ilike('username', username)
    .maybeSingle();

  if (!profileRow && isUuid(username)) {
    const { data: uuidRow } = await supabase
      .from('profiles')
      .select('id, role, display_name, username')
      .eq('id', username)
      .maybeSingle();
    profileRow = uuidRow;
  }

  if (!profileRow) {
    return { kind: 'not_found' };
  }

  const userId = String(profileRow.id);
  const role = String(profileRow.role);
  const canonicalUsername = String(profileRow.username ?? username);
  const displayName =
    String(profileRow.display_name ?? '').trim() ||
    String(profileRow.username ?? '');

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
    return { kind: 'not_found' };
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
  const notifications = readLocal<Notification[]>(storageKey(user, 'notifications'), []);
  const feedActions = readLocal<Record<string, Partial<FeedItem>>>(storageKey(user, 'feed-actions'), {});

  if (role === 'investor') {
    const criteria = readLocal<InvestorCriteriaValues>(storageKey(user, 'criteria'), defaultInvestorCriteria);
    const intakeValues = toIntakeRecord(criteria);
    // Legacy scraped `source_signals` and sample outreach drafts removed.
    // Deal flow now comes purely from real Apparent builders the investor adds.
    const signalRows: InvestorSignal[] = [];

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
      notifications,
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
    signalRows: [],
    settings,
    productLaunches,
    meetups,
    networkClusters: buildNetworkClusters([], meetups, founderProfile.location),
    builderNodes: builderNetwork.builderNodes,
    builderClusters: buildBuilderMapClusters(builderNetwork.builderNodes, meetups),
    builderDiscoveryStates: builderNetwork.builderDiscoveryStates,
    termReviews,
    messages,
    notifications,
    feedItems: buildFeedItems(role, profileSaved, [], meetups, productLaunches, feedActions),
    savedInvestorMatchNames: [],
    launchEngagement: {},
    founderInterest: { saveCount: 0, recentSaverNames: [] },
  };
};

export const loadDashboardData = async (
  user: AppUser,
  role: DashboardRole,
  labelByKey: Record<string, string>,
  onCachedData?: (data: DashboardData) => void,
  onOverviewReady?: (partial: DashboardData) => void,
): Promise<DashboardData> => {
  if (!isSupabaseConfigured || !supabase || user.isDev) {
    return loadLocalDashboard(user, role, labelByKey);
  }

  // Synchronously serve the last snapshot before the first network await so
  // callers can render stale data immediately (no spinner on re-visits).
  const snapshotKey = storageKey(user, 'dash-v1');
  if (onCachedData) {
    const snap = readCache<DashboardData>(snapshotKey);
    if (snap) onCachedData(snap.data);
  }

  // Two-phase load: critical-for-Overview queries fire first so the user sees
  // a populated page ASAP. Deferred queries (Messages, For You feed engagement,
  // sidebar interest counter) start as soon as critical lands but don't block
  // the Overview render.
  const isInvestor = role === 'investor';

  // ---------- Phase 1: critical (Overview content) — 9 queries ----------
  const deferredPromise = (async () => {
    // Fire deferred queries in parallel with the critical batch — they just
    // can't block the first render. This array starts evaluating immediately.
    return Promise.all([
      supabase!
        .from('user_messages')
        .select('*')
        .or(`owner_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order('updated_at', { ascending: false }),
      supabase!.from('feed_item_actions').select('*').eq('user_id', user.id),
      supabase!.from('launch_upvotes').select('launch_id').eq('user_id', user.id),
      supabase!.from('launch_comments').select('launch_id, body').order('created_at', { ascending: false }),
      isInvestor
        ? supabase!.from('investor_signal_states').select('*').eq('investor_id', user.id)
        : Promise.resolve({ data: [] }),
      !isInvestor
        ? supabase!.rpc('founder_interest_summary').then(
            (r) => r,
            () => ({ data: null }),
          )
        : Promise.resolve({ data: null }),
      supabase!
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)
        .then(
          (r) => r,
          () => ({ data: [] }),
        ),
    ]);
  })();

  const [
    { data: settingsRow },
    { data: productLaunchRows },
    { data: meetupRows },
    { data: meetupRsvpRows },
    { data: termRows },
    { data: allProfileRows },
    { data: allLaunchRows },
    { data: builderStateRows },
    { data: criteriaRow },
    { data: founderRow },
    { data: sourceSignalRows },
    { data: signalStateRows },
  ] = await Promise.all([
    supabase.from('user_settings').select('*').eq('user_id', user.id).maybeSingle(),
    supabase.from('product_launches').select('*').eq('owner_id', user.id).order('updated_at', { ascending: false }),
    supabase.from('meetups').select('*').order('starts_at', { ascending: true }),
    supabase.from('meetup_rsvps').select('*'),
    supabase.from('term_reviews').select('*').eq('user_id', user.id).order('updated_at', { ascending: false }),
    supabase.from('founder_profiles').select('*').eq('public_profile_enabled', true).order('updated_at', { ascending: false }),
    supabase.from('product_launches').select('*').eq('public_profile_enabled', true).order('updated_at', { ascending: false }),
    supabase.from('builder_discovery_states').select('*').eq('user_id', user.id),
    isInvestor
      ? supabase.from('investor_criteria').select('*').eq('user_id', user.id).maybeSingle()
      : Promise.resolve({ data: null }),
    !isInvestor
      ? supabase.from('founder_profiles').select('*').eq('user_id', user.id).maybeSingle()
      : Promise.resolve({ data: null }),
    // Sourced deal flow (web-discovered leads) + the investor's saved kanban
    // stages for them. Investor-only; the ingestion job (api/ingest-signals.js)
    // keeps source_signals fresh, deduped by (source_type, source_url).
    isInvestor
      ? supabase.from('source_signals').select('*').order('freshness_at', { ascending: false }).limit(200)
      : Promise.resolve({ data: [] }),
    isInvestor
      ? supabase.from('investor_signal_states').select('signal_id, stage').eq('investor_id', user.id)
      : Promise.resolve({ data: [] }),
  ]);

  const settings: UserSettings = {
    dailyDigestEnabled: settingsRow?.daily_digest_enabled ?? true,
    slackAlertsEnabled: settingsRow?.slack_alerts_enabled ?? true,
    agentAutonomy: coerceAutonomy(settingsRow?.agent_autonomy),
  };
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

  // Builder network — was previously a separate Promise.all in loadBuilderNetwork.
  // Now built from the rows fetched in the critical batch above. The fit
  // score depends on `values`, so we compute that per-role below.
  const allLaunchesForNetwork = (allLaunchRows ?? []).map((row) => mapProductLaunchRow(row));
  // Only founders with a published profile AND at least one live launch appear on the radar.
  const mappedBuildersRaw = mapBuilderProfileRows(
    (allProfileRows ?? []) as Record<string, unknown>[],
    allLaunchesForNetwork,
    user.id,
  ).filter((b) => b.launchCount > 0);
  const builderDiscoveryStates = (builderStateRows ?? []).map((row) => mapBuilderDiscoveryRow(row));

  // Derives the deferred-data-dependent fields. Called twice — once with empty
  // arrays so onOverviewReady can fire immediately, once with real deferred
  // data after it resolves.
  type DeferredData = {
    messageRows: Record<string, unknown>[] | null;
    feedActionRows: Record<string, unknown>[] | null;
    userUpvoteRows: Record<string, unknown>[] | null;
    commentRows: Record<string, unknown>[] | null;
    investorStateRows: Record<string, unknown>[] | null;
    interestRpcResult: { data: unknown } | null;
    notificationRows: Record<string, unknown>[] | null;
  };

  const deriveDeferred = (d: DeferredData) => {
    const messages = (d.messageRows ?? []).map((row) => mapMessageRow(row));
    const notifications = (d.notificationRows ?? []).map((row) => mapNotificationRow(row));
    const userUpvotedIds = new Set((d.userUpvoteRows ?? []).map((row) => String(row.launch_id)));
    const commentsByLaunch = (d.commentRows ?? []).reduce<Record<string, string[]>>((acc, row) => {
      const lid = String(row.launch_id);
      if (!acc[lid]) acc[lid] = [];
      acc[lid].push(String(row.body));
      return acc;
    }, {});
    const launchEngagement: Record<string, LaunchEngagementEntry> = {};
    for (const launch of productLaunches) {
      launchEngagement[launch.id] = {
        upvoted: userUpvotedIds.has(launch.id),
        upvotes: launch.upvoteCount ?? 0,
        comments: commentsByLaunch[launch.id] ?? [],
      };
    }
    const savedInvestorMatchNames = (d.feedActionRows ?? [])
      .filter((row) => String(row.item_id).startsWith('inv-match:') && Boolean(row.saved))
      .map((row) => String(row.item_id).slice('inv-match:'.length));
    const feedActions = (d.feedActionRows ?? []).reduce<Record<string, Partial<FeedItem>>>(
      (actions, row) => {
        actions[String(row.item_id)] = {
          saved: Boolean(row.saved),
          reposted: Boolean(row.reposted),
          reply: String(row.reply ?? ''),
        };
        return actions;
      },
      {},
    );
    let founderInterest = { saveCount: 0, recentSaverNames: [] as string[] };
    const interestRows = (d.interestRpcResult as { data: unknown } | null)?.data;
    const interestRow = Array.isArray(interestRows) ? interestRows[0] : interestRows;
    if (interestRow && typeof interestRow === 'object') {
      const row = interestRow as Record<string, unknown>;
      founderInterest = {
        saveCount: Number(row.save_count ?? 0),
        recentSaverNames: Array.isArray(row.recent_saver_names)
          ? (row.recent_saver_names as unknown[]).filter(Boolean).map(String)
          : [],
      };
    }
    return { messages, notifications, launchEngagement, savedInvestorMatchNames, feedActions, founderInterest };
  };

  // Empty defaults so we can build the Overview-ready snapshot before the
  // deferred batch resolves.
  const emptyDeferred = deriveDeferred({
    messageRows: null,
    feedActionRows: null,
    userUpvoteRows: null,
    commentRows: null,
    investorStateRows: null,
    interestRpcResult: null,
    notificationRows: null,
  });

  if (role === 'investor') {
    // Deal flow is two sources, merged: (1) "Sourced" web-discovered leads from
    // public.source_signals, kept fresh + deduped by the scheduled ingestion
    // job (api/ingest-signals.js); (2) real Apparent builders the investor has
    // added (via mergeBuilderDealFlowSignals below). Sourced rows are ranked
    // against the investor's thesis and carry their saved kanban stage.
    const criteria = mapCriteriaRow(criteriaRow as Record<string, unknown> | null);
    const intakeValues = toIntakeRecord(criteria);
    const stageBySignalId = new Map<string, InvestorDealStage>(
      (signalStateRows ?? [])
        .map((row) => [String((row as Record<string, unknown>).signal_id ?? ''), String((row as Record<string, unknown>).stage ?? '') as InvestorDealStage] as const)
        .filter(([signalId, stage]) => signalId && stage),
    );
    const signalRows: InvestorSignal[] = (sourceSignalRows ?? [])
      .map((row) => mapSourceSignalRow(row as Record<string, unknown>, criteria, stageBySignalId))
      .sort((a, b) => b.relevance - a.relevance);

    const profileSaved = completedLabels(intakeValues, labelByKey).length > 0;
    const builderNodes = mappedBuildersRaw
      .map((builder) => calculateBuilderFit(builder, role, criteria))
      .sort((a, b) => b.fitScore - a.fitScore);
    const builderNetwork = {
      builderNodes,
      builderClusters: buildBuilderMapClusters(builderNodes, seedMeetups),
      builderDiscoveryStates,
    };
    const signalRowsWithBuilders = mergeBuilderDealFlowSignals(
      signalRows,
      builderNetwork.builderNodes,
      builderNetwork.builderDiscoveryStates,
      criteria,
    );
    const effectiveMeetups = meetups.length ? meetups : seedMeetups;

    const buildInvestor = (d: ReturnType<typeof deriveDeferred>): DashboardData => ({
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
      messages: d.messages,
      notifications: d.notifications,
      feedItems: buildFeedItems(role, profileSaved, signalRowsWithBuilders, effectiveMeetups, productLaunches, d.feedActions),
      savedInvestorMatchNames: d.savedInvestorMatchNames,
      launchEngagement: d.launchEngagement,
      founderInterest: { saveCount: 0, recentSaverNames: [] },
    });

    // Render Overview immediately with empty deferred data.
    if (onOverviewReady) onOverviewReady(buildInvestor(emptyDeferred));

    // Wait for the deferred batch (already in flight since critical started).
    const [
      { data: messageRows },
      { data: feedActionRows },
      { data: userUpvoteRows },
      { data: commentRows },
      // investorStateRows kept for future signal sources — not used today.
      _investorStateRowsRes,
      _interestRpcRes,
      { data: notificationRows },
    ] = await deferredPromise;

    const realDeferred = deriveDeferred({
      messageRows: (messageRows ?? []) as Record<string, unknown>[],
      feedActionRows: (feedActionRows ?? []) as Record<string, unknown>[],
      userUpvoteRows: (userUpvoteRows ?? []) as Record<string, unknown>[],
      commentRows: (commentRows ?? []) as Record<string, unknown>[],
      investorStateRows: null,
      interestRpcResult: null,
      notificationRows: (notificationRows ?? []) as Record<string, unknown>[],
    });
    void _investorStateRowsRes;
    void _interestRpcRes;

    const investorResult = buildInvestor(realDeferred);
    writeCache(snapshotKey, investorResult);
    return investorResult;
  }

  const founderProfile = mapFounderRow(founderRow as Record<string, unknown> | null);
  const intakeValues = toIntakeRecord(founderProfile);
  const profileSaved = completedLabels(intakeValues, labelByKey).length > 0;
  const builderNodes = mappedBuildersRaw
    .map((builder) => calculateBuilderFit(builder, role, founderProfile))
    .sort((a, b) => b.fitScore - a.fitScore);
  const builderNetwork = {
    builderNodes,
    builderClusters: buildBuilderMapClusters(builderNodes, seedMeetups),
    builderDiscoveryStates,
  };
  const effectiveMeetups = meetups.length ? meetups : seedMeetups;

  const buildFounder = (d: ReturnType<typeof deriveDeferred>): DashboardData => ({
    intakeValues,
    completedLabels: completedLabels(intakeValues, labelByKey),
    profileSaved,
    signalRows: [],
    settings,
    productLaunches,
    meetups: effectiveMeetups,
    networkClusters: buildNetworkClusters([], effectiveMeetups, founderProfile.location),
    builderNodes: builderNetwork.builderNodes,
    builderClusters: buildBuilderMapClusters(builderNetwork.builderNodes, effectiveMeetups),
    builderDiscoveryStates: builderNetwork.builderDiscoveryStates,
    termReviews,
    messages: d.messages,
    notifications: d.notifications,
    feedItems: buildFeedItems(role, profileSaved, [], effectiveMeetups, productLaunches, d.feedActions),
    savedInvestorMatchNames: d.savedInvestorMatchNames,
    launchEngagement: d.launchEngagement,
    founderInterest: d.founderInterest,
  });

  // Render Overview immediately with empty deferred data.
  if (onOverviewReady) onOverviewReady(buildFounder(emptyDeferred));

  // Wait for the deferred batch (already in flight since critical started).
  const [
    { data: messageRows },
    { data: feedActionRows },
    { data: userUpvoteRows },
    { data: commentRows },
    _investorStateRowsRes,
    interestRpcResult,
    { data: notificationRows },
  ] = await deferredPromise;

  const realDeferred = deriveDeferred({
    messageRows: (messageRows ?? []) as Record<string, unknown>[],
    feedActionRows: (feedActionRows ?? []) as Record<string, unknown>[],
    userUpvoteRows: (userUpvoteRows ?? []) as Record<string, unknown>[],
    commentRows: (commentRows ?? []) as Record<string, unknown>[],
    investorStateRows: null,
    interestRpcResult: interestRpcResult as { data: unknown } | null,
    notificationRows: (notificationRows ?? []) as Record<string, unknown>[],
  });
  void _investorStateRowsRes;

  const founderResult = buildFounder(realDeferred);
  writeCache(snapshotKey, founderResult);
  return founderResult;
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
    profile_photo_url: safeUrl(values.profilePhotoUrl),
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
    traction_type: values.tractionType ?? '',
    traction_value: values.tractionValue ?? '',
    team_size: values.teamSize ?? '',
    prior_raise_amount: values.priorRaiseAmount ?? '',
    // Postgres `date` columns reject empty strings — coerce to null when blank.
    target_close_date: values.targetCloseDate?.trim() ? values.targetCloseDate : null,
    profile_completeness: computeFounderCompleteness(values as Partial<FounderProfileValues>),
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
    agent_autonomy: settings.agentAutonomy,
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
      logo_url: safeUrl(nextLaunch.logoUrl),
      banner_url: safeUrl(nextLaunch.bannerUrl),
      demo_video_url: safeUrl(nextLaunch.demoVideoUrl),
      pitch_video_url: safeUrl(nextLaunch.pitchVideoUrl),
      pitch_deck_url: safeUrl(nextLaunch.pitchDeckUrl),
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

export const deleteProductLaunch = async (
  user: AppUser,
  launchId: string,
  assetUrls: string[] = [],
): Promise<void> => {
  // Remove from localStorage regardless (handles dev mode and cache).
  const key = storageKey(user, 'product-launches');
  const current = readLocal<ProductLaunch[]>(key, []);
  writeLocal(key, current.filter((l) => l.id !== launchId));

  // Remove from public launches cache too.
  try {
    const pubRaw = window.localStorage.getItem(PUB_LAUNCHES_CACHE_KEY);
    if (pubRaw) {
      const pub = JSON.parse(pubRaw) as { data: ProductLaunch[]; ts: number };
      if (pub?.data) {
        pub.data = pub.data.filter((l) => l.id !== launchId);
        window.localStorage.setItem(PUB_LAUNCHES_CACHE_KEY, JSON.stringify(pub));
      }
    }
  } catch { /* non-fatal */ }

  if (!isSupabaseConfigured || !supabase || user.isDev) return;

  // Delete team members first (FK constraint).
  await supabase.from('launch_team_members').delete().eq('launch_id', launchId).eq('owner_id', user.id);

  const { error } = await supabase
    .from('product_launches')
    .delete()
    .eq('id', launchId)
    .eq('owner_id', user.id); // RLS guard: only owner can delete

  if (error) throw error;

  // Best-effort R2 asset cleanup — only HTTPS URLs (skips dev data: fallbacks).
  const r2Urls = assetUrls.filter((u) => u.startsWith('https://'));
  if (r2Urls.length > 0) {
    try {
      await fetch('/api/upload/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls: r2Urls }),
      });
    } catch { /* non-fatal */ }
  }
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

/**
 * Mark every unread incoming message from `counterpartyId` as read. Called when
 * the recipient opens a conversation. Returns the number of messages flipped.
 * No-ops gracefully when offline / pre-migration so the inbox never breaks.
 */
export const markThreadRead = async (user: AppUser, counterpartyId: string): Promise<number> => {
  if (!counterpartyId) return 0;

  if (!isSupabaseConfigured || !supabase || user.isDev) {
    const current = readLocal<UserMessage[]>(storageKey(user, 'messages'), []);
    let flipped = 0;
    const next = current.map((message) => {
      const incoming = message.recipientId === user.id && message.ownerId === counterpartyId;
      if (incoming && !message.readAt) {
        flipped += 1;
        return { ...message, readAt: nowIso() };
      }
      return message;
    });
    if (flipped > 0) writeLocal(storageKey(user, 'messages'), next);
    return flipped;
  }

  if (!isUuid(counterpartyId)) return 0;

  try {
    const { data, error } = await supabase.rpc('mark_thread_read', { p_counterparty: counterpartyId });
    if (error) return 0;
    return Number(data ?? 0);
  } catch {
    return 0;
  }
};

// ---------- Notifications ----------

export const loadNotifications = async (user: AppUser): Promise<Notification[]> => {
  if (!isSupabaseConfigured || !supabase || user.isDev) {
    return readLocal<Notification[]>(storageKey(user, 'notifications'), []);
  }
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error || !data) return [];
    return data.map((row) => mapNotificationRow(row as Record<string, unknown>));
  } catch {
    return [];
  }
};

export const markNotificationRead = async (user: AppUser, notificationId: string): Promise<void> => {
  if (!isSupabaseConfigured || !supabase || user.isDev) {
    const current = readLocal<Notification[]>(storageKey(user, 'notifications'), []);
    writeLocal(
      storageKey(user, 'notifications'),
      current.map((n) => (n.id === notificationId ? { ...n, readAt: n.readAt ?? nowIso() } : n)),
    );
    return;
  }
  try {
    await supabase.from('notifications').update({ read_at: nowIso() }).eq('id', notificationId).eq('user_id', user.id);
  } catch {
    /* non-fatal */
  }
};

export const markAllNotificationsRead = async (user: AppUser): Promise<void> => {
  if (!isSupabaseConfigured || !supabase || user.isDev) {
    const current = readLocal<Notification[]>(storageKey(user, 'notifications'), []);
    writeLocal(
      storageKey(user, 'notifications'),
      current.map((n) => ({ ...n, readAt: n.readAt ?? nowIso() })),
    );
    return;
  }
  try {
    await supabase
      .from('notifications')
      .update({ read_at: nowIso() })
      .eq('user_id', user.id)
      .is('read_at', null);
  } catch {
    /* non-fatal */
  }
};

/**
 * Push "first dibs" notifications to thesis-matched investors for a just-published
 * launch. Returns the number of investors notified so the founder gets immediate
 * "N matched investors notified" feedback. No-ops gracefully offline.
 */
export const notifyInvestorsOfLaunch = async (user: AppUser, launchId: string): Promise<number> => {
  if (!isSupabaseConfigured || !supabase || user.isDev || !isUuid(launchId)) return 0;
  try {
    const { data, error } = await supabase.rpc('notify_investors_of_launch', { p_launch_id: launchId });
    if (error) return 0;
    return Number(data ?? 0);
  } catch {
    return 0;
  }
};

/**
 * Claim a pending `npx apparent` build (by code) into the current founder's
 * profile/dossier. Returns true when the build was merged in. RLS-safe (runs as
 * the authenticated founder via the claim_cli_build SECURITY DEFINER RPC).
 */
export const claimCliBuild = async (
  user: AppUser,
  code: string,
): Promise<{ ok: boolean; commits?: number; languages?: string; project?: string; error?: string }> => {
  if (!isSupabaseConfigured || !supabase || user.isDev || !code) {
    return { ok: false, error: 'unavailable' };
  }
  try {
    const { data, error } = await supabase.rpc('claim_cli_build', { p_code: code });
    if (error) return { ok: false, error: error.message };
    const result = (data ?? {}) as { ok?: boolean; commits?: number; languages?: string; project?: string; error?: string };
    return { ok: Boolean(result.ok), commits: result.commits, languages: result.languages, project: result.project, error: result.error };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'claim_failed' };
  }
};

/**
 * Founder amplification: push the current founder to every on-platform investor
 * whose thesis they match (deduped per investor). Returns how many were notified.
 */
export const notifyInvestorsOfFounder = async (user: AppUser): Promise<number> => {
  if (!isSupabaseConfigured || !supabase || user.isDev) return 0;
  try {
    const { data, error } = await supabase.rpc('notify_investors_of_founder');
    if (error) return 0;
    return Number(data ?? 0);
  } catch {
    return 0;
  }
};

export const saveAgentProfilePatchMemory = async (
  user: AppUser,
  patch: AgentProfilePatch,
  appliedFields: string[],
): Promise<void> => {
  const applied = new Set(appliedFields);
  const selectedFields = patch.fields.filter((field) => applied.has(field.field));
  if (selectedFields.length === 0) return;

  if (!isSupabaseConfigured || !supabase || user.isDev) {
    const memoryKey = storageKey(user, 'agent-memories');
    const current = readLocal<Record<string, unknown>[]>(memoryKey, []);
    const rows = selectedFields.map((field) => ({
      role: patch.role,
      scope: 'profile',
      key: field.field,
      value: field.newValue,
      sourceUrl: field.sourceUrl ?? '',
      confidence: field.confidence ?? 'medium',
      updatedAt: nowIso(),
    }));
    writeLocal(memoryKey, [...rows, ...current].slice(0, 200));
    return;
  }

  const sourceRows = [
    ...patch.sourceUrls.map((sourceUrl) => ({
      user_id: user.id,
      role: patch.role,
      source_type: 'url',
      source_url: sourceUrl,
      status: 'used',
      note: patch.summary,
    })),
    ...(patch.unavailableSources ?? []).map((sourceUrl) => ({
      user_id: user.id,
      role: patch.role,
      source_type: 'url',
      source_url: sourceUrl,
      status: 'unavailable',
      note: 'The agent could not read this source directly.',
    })),
  ];

  const memoryRows = selectedFields.map((field) => ({
    user_id: user.id,
    role: patch.role,
    scope: 'profile',
    key: field.field,
    value: field.newValue,
    source_url: field.sourceUrl ?? '',
    confidence: field.confidence ?? 'medium',
    updated_at: nowIso(),
  }));

  try {
    if (sourceRows.length > 0) {
      await supabase.from('agent_source_records').insert(sourceRows);
    }
    await supabase
      .from('agent_memories')
      .upsert(memoryRows, { onConflict: 'user_id,role,scope,key' });
  } catch {
    // Memory is trust/provenance metadata; profile save success should not be
    // rolled back if the migration is not deployed yet.
  }
};

export const loadAgentMemories = async (
  user: AppUser,
  role: DashboardRole,
): Promise<AgentMemory[]> => {
  if (!isSupabaseConfigured || !supabase || user.isDev) {
    return readLocal<AgentMemory[]>(storageKey(user, 'agent-memories'), []).filter((memory) => memory.role === role);
  }

  try {
    const { data, error } = await supabase
      .from('agent_memories')
      .select('id,role,scope,key,value,source_url,confidence,updated_at')
      .eq('user_id', user.id)
      .eq('role', role)
      .order('updated_at', { ascending: false })
      .limit(40);
    if (error || !data) return [];
    return data.map((row) => ({
      id: String(row.id ?? ''),
      role: role,
      scope: String(row.scope ?? 'profile') as AgentMemory['scope'],
      key: String(row.key ?? ''),
      value: String(row.value ?? ''),
      sourceUrl: String(row.source_url ?? ''),
      confidence: (row.confidence === 'low' || row.confidence === 'high' ? row.confidence : 'medium') as AgentMemory['confidence'],
      updatedAt: String(row.updated_at ?? ''),
    }));
  } catch {
    return [];
  }
};

const compactMemoryValue = (value: string, max = 900): string => {
  const normalized = value.replace(/\s+/g, ' ').trim();
  return normalized.length <= max ? normalized : `${normalized.slice(0, max - 3)}...`;
};

export const saveAgentConversationMemory = async (
  user: AppUser,
  role: DashboardRole,
  userMessage: string,
  assistantReply: string,
): Promise<AgentMemory | null> => {
  const value = compactMemoryValue(`User asked: ${userMessage}\nAgent replied: ${assistantReply}`);
  if (!value) return null;

  const memory: AgentMemory = {
    role,
    scope: 'conversation_summary',
    key: `chat:${Date.now()}`,
    value,
    confidence: 'medium',
    updatedAt: nowIso(),
  };

  if (!isSupabaseConfigured || !supabase || user.isDev) {
    const memoryKey = storageKey(user, 'agent-memories');
    const current = readLocal<AgentMemory[]>(memoryKey, []);
    writeLocal(memoryKey, [memory, ...current].slice(0, 200));
    return memory;
  }

  try {
    const { data, error } = await supabase
      .from('agent_memories')
      .insert({
        user_id: user.id,
        role,
        scope: memory.scope,
        key: memory.key,
        value: memory.value,
        confidence: memory.confidence,
        updated_at: memory.updatedAt,
      })
      .select('id')
      .single();
    if (error) return null;
    return { ...memory, id: String(data?.id ?? '') };
  } catch {
    return null;
  }
};

export const saveAgentActionMemory = async (
  user: AppUser,
  role: DashboardRole,
  key: string,
  value: string,
): Promise<AgentMemory | null> => {
  const memory: AgentMemory = {
    role,
    scope: 'action',
    key: `${key}:${Date.now()}`,
    value: compactMemoryValue(value, 500),
    confidence: 'high',
    updatedAt: nowIso(),
  };
  if (!memory.value) return null;

  if (!isSupabaseConfigured || !supabase || user.isDev) {
    const memoryKey = storageKey(user, 'agent-memories');
    const current = readLocal<AgentMemory[]>(memoryKey, []);
    writeLocal(memoryKey, [memory, ...current].slice(0, 200));
    return memory;
  }

  try {
    const { data, error } = await supabase
      .from('agent_memories')
      .insert({
        user_id: user.id,
        role,
        scope: memory.scope,
        key: memory.key,
        value: memory.value,
        confidence: memory.confidence,
        updated_at: memory.updatedAt,
      })
      .select('id')
      .single();
    if (error) return null;
    return { ...memory, id: String(data?.id ?? '') };
  } catch {
    return null;
  }
};

const legacyAgentChatStorageKey = (user: AppUser, role: DashboardRole) =>
  storageKey(user, role === 'investor' ? 'agent-chat-history' : 'founder-agent-chat-history');

const agentThreadStorageKey = (user: AppUser, role: DashboardRole) =>
  storageKey(user, `${role}-agent-threads`);

const agentThreadMessagesStorageKey = (user: AppUser, role: DashboardRole, threadId: string) =>
  storageKey(user, `${role}-agent-thread:${threadId}`);

const agentThreadTitle = (value: string) => {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (!normalized) return 'New conversation';
  return normalized.length > 72 ? `${normalized.slice(0, 69).trimEnd()}...` : normalized;
};

export const loadAgentChatThreads = async (
  user: AppUser,
  role: DashboardRole,
): Promise<AgentChatThread[]> => {
  if (!isSupabaseConfigured || !supabase || user.isDev) {
    const threadKey = agentThreadStorageKey(user, role);
    const stored = readLocal<AgentChatThread[]>(threadKey, []);
    if (stored.length > 0) return stored.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

    const legacyMessages = readLocal<AgentChatHistoryMessage[]>(legacyAgentChatStorageKey(user, role), []);
    if (legacyMessages.length === 0) return [];

    const stampedAt = legacyMessages.at(-1)?.createdAt || new Date().toISOString();
    const firstPrompt = legacyMessages.find((message) => message.role === 'user')?.content || 'Previous conversation';
    const migrated: AgentChatThread = {
      id: localId('agent-thread'),
      role,
      title: agentThreadTitle(firstPrompt),
      createdAt: legacyMessages[0]?.createdAt || stampedAt,
      updatedAt: stampedAt,
    };
    writeLocal(threadKey, [migrated]);
    writeLocal(agentThreadMessagesStorageKey(user, role, migrated.id), legacyMessages);
    window.localStorage.removeItem(legacyAgentChatStorageKey(user, role));
    return [migrated];
  }

  try {
    const { data, error } = await supabase
      .from('agent_chat_threads')
      .select('id,role,title,created_at,updated_at')
      .eq('user_id', user.id)
      .eq('role', role)
      .order('updated_at', { ascending: false });
    if (error || !data) return [];
    return data.map((row) => ({
      id: String(row.id),
      role: row.role === 'investor' ? 'investor' : 'founder',
      title: String(row.title || 'New conversation'),
      createdAt: String(row.created_at || ''),
      updatedAt: String(row.updated_at || ''),
    }));
  } catch {
    return [];
  }
};

export const createAgentChatThread = async (
  user: AppUser,
  role: DashboardRole,
  title: string,
): Promise<AgentChatThread> => {
  const stampedAt = new Date().toISOString();
  const nextTitle = agentThreadTitle(title);

  if (!isSupabaseConfigured || !supabase || user.isDev) {
    const thread: AgentChatThread = {
      id: localId('agent-thread'),
      role,
      title: nextTitle,
      createdAt: stampedAt,
      updatedAt: stampedAt,
    };
    const key = agentThreadStorageKey(user, role);
    writeLocal(key, [thread, ...readLocal<AgentChatThread[]>(key, [])]);
    return thread;
  }

  const { data, error } = await supabase
    .from('agent_chat_threads')
    .insert({ user_id: user.id, role, title: nextTitle })
    .select('id,role,title,created_at,updated_at')
    .single();
  if (error || !data) throw new Error(error?.message || 'Unable to create an agent conversation.');
  return {
    id: String(data.id),
    role: data.role === 'investor' ? 'investor' : 'founder',
    title: String(data.title || nextTitle),
    createdAt: String(data.created_at || stampedAt),
    updatedAt: String(data.updated_at || stampedAt),
  };
};

export const loadAgentChatMessages = async (
  user: AppUser,
  role: DashboardRole,
  threadId: string,
): Promise<AgentChatHistoryMessage[]> => {
  if (!isSupabaseConfigured || !supabase || user.isDev) {
    return readLocal<AgentChatHistoryMessage[]>(agentThreadMessagesStorageKey(user, role, threadId), []);
  }

  try {
    const { data, error } = await supabase
      .from('agent_chat_messages')
      .select('id,message_role,content,payload,created_at')
      .eq('user_id', user.id)
      .eq('role', role)
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true })
      .limit(80);
    if (error || !data) return [];
    return data.map((row) => ({
      id: String(row.id ?? ''),
      role: row.message_role === 'assistant' ? 'assistant' : 'user',
      content: String(row.content ?? ''),
      payload: row.payload && typeof row.payload === 'object' && !Array.isArray(row.payload)
        ? (row.payload as Record<string, unknown>)
        : {},
      createdAt: String(row.created_at ?? ''),
    }));
  } catch {
    return [];
  }
};

export const saveAgentChatMessages = async (
  user: AppUser,
  role: DashboardRole,
  threadId: string,
  messages: AgentChatHistoryMessage[],
): Promise<void> => {
  const trimmed = messages
    .filter((message) => (message.role === 'user' || message.role === 'assistant') && message.content.trim())
    .slice(-80);

  if (!isSupabaseConfigured || !supabase || user.isDev) {
    writeLocal(agentThreadMessagesStorageKey(user, role, threadId), trimmed);
    const key = agentThreadStorageKey(user, role);
    const stampedAt = new Date().toISOString();
    writeLocal(key, readLocal<AgentChatThread[]>(key, []).map((thread) => (
      thread.id === threadId ? { ...thread, updatedAt: stampedAt } : thread
    )).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
    return;
  }

  try {
    await supabase.from('agent_chat_messages').delete().eq('user_id', user.id).eq('role', role).eq('thread_id', threadId);
    if (trimmed.length === 0) return;
    await supabase.from('agent_chat_messages').insert(
      trimmed.map((message, index) => ({
        user_id: user.id,
        role,
        thread_id: threadId,
        message_role: message.role,
        content: message.content,
        payload: message.payload ?? {},
        created_at: message.createdAt || new Date(Date.now() + index).toISOString(),
      })),
    );
    await supabase.from('agent_chat_threads').update({ updated_at: new Date().toISOString() }).eq('id', threadId).eq('user_id', user.id);
  } catch {
    // Transcript persistence should never break the live agent interaction.
  }
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

// ── VC outreach (mailto compose + kanban) ──────────────────────────────────

/**
 * Stable per-VC identity key. Prefers the partner email; falls back to a
 * `name|website` slug so seed-only entries (without email in DB) still dedupe.
 * Matches the dedup logic in loadFounderVCContacts.
 */
export const vcContactKey = (vc: {
  partnerEmail?: string;
  investorName?: string;
  website?: string;
}): string => {
  const email = (vc.partnerEmail || '').toLowerCase().trim();
  if (email) return `email:${email}`;
  const name = (vc.investorName || '').toLowerCase().trim();
  const website = (vc.website || '')
    .toLowerCase()
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/$/, '');
  return `nw:${name}|${website}`;
};

const mapOutreachRow = (row: Record<string, unknown>): VcOutreachEntry => ({
  id: String(row.id ?? ''),
  userId: String(row.user_id ?? row.userId ?? ''),
  vcContactKey: String(row.vc_contact_key ?? row.vcContactKey ?? ''),
  vcContactId: row.vc_contact_id ? String(row.vc_contact_id) : '',
  toEmail: String(row.to_email ?? row.toEmail ?? ''),
  toName: String(row.to_name ?? row.toName ?? ''),
  investorName: String(row.investor_name ?? row.investorName ?? ''),
  partnerName: String(row.partner_name ?? row.partnerName ?? ''),
  subject: String(row.subject ?? ''),
  body: String(row.body ?? ''),
  stage: (['Drafted', 'Sent', 'Replied', 'Meeting', 'Passed'].includes(String(row.stage))
    ? String(row.stage)
    : 'Drafted') as VcOutreachStage,
  sentAt: String(row.sent_at ?? row.sentAt ?? ''),
  notes: String(row.notes ?? ''),
  updatedAt: String(row.updated_at ?? row.updatedAt ?? nowIso()),
});

const mapTemplateRow = (row: Record<string, unknown>): VcOutreachTemplate => ({
  id: String(row.id ?? ''),
  userId: String(row.user_id ?? row.userId ?? ''),
  name: String(row.name ?? 'Untitled template'),
  subject: String(row.subject ?? ''),
  body: String(row.body ?? ''),
  isDefault: Boolean(row.is_default ?? row.isDefault ?? false),
  updatedAt: String(row.updated_at ?? row.updatedAt ?? nowIso()),
});

/** Optional outreach examples for the Heat Map compose dialog. */
export interface OutreachInspiration {
  id: string;
  /** Short label shown on the tab/pill. */
  label: string;
  /** One-line note on when this style works. */
  note: string;
  subject: string;
  body: string;
}

export const OUTREACH_INSPIRATION_EXAMPLES: OutreachInspiration[] = [];

/**
 * Pre-baked subject lines — five short patterns the founder can swap into the
 * subject input as starting points. Variables stay literal until they're
 * applied (the dialog substitutes them at click time).
 */
export const PREBAKED_SUBJECT_LINES = [
  'Quick note re: {{vc_firm}} thesis fit',
  'Building {{my_company}} — would value your perspective',
  '{{my_company}}: {{traction}}',
  'For {{vc_partner}}: short intro from a builder',
  '{{vc_firm}} × {{my_company}} — 60 seconds',
] as const;

/** Replace {{variable}} tokens with the founder's supplied context. */
export const renderOutreachTemplate = (
  source: string,
  vars: Record<string, string>,
): string =>
  source.replace(/\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g, (_, key) => {
    const value = vars[key];
    return value === undefined || value === '' ? `{{${key}}}` : value;
  });

export const loadVcOutreachLog = async (
  user: AppUser,
): Promise<VcOutreachEntry[]> => {
  if (!isSupabaseConfigured || !supabase || user.isDev) {
    return readLocal<VcOutreachEntry[]>(storageKey(user, 'vc-outreach-log'), []);
  }
  try {
    const { data, error } = await supabase
      .from('vc_outreach_log')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });
    if (error || !data) return [];
    return data.map((row) => mapOutreachRow(row as Record<string, unknown>));
  } catch {
    return [];
  }
};

/**
 * Upsert by (user_id, vc_contact_key). Marking a VC as "Sent" overwrites the
 * stage + bumps sent_at; later kanban moves only touch stage.
 */
export const saveVcOutreach = async (
  user: AppUser,
  patch: {
    vcContactKey: string;
    vcContactId?: string;
    toEmail: string;
    toName?: string;
    investorName?: string;
    partnerName?: string;
    subject?: string;
    body?: string;
    stage?: VcOutreachStage;
    sentAt?: string;
    notes?: string;
  },
): Promise<VcOutreachEntry> => {
  const stage = patch.stage ?? 'Drafted';
  const sentAt = patch.sentAt ?? (stage === 'Sent' ? nowIso() : '');
  const draft: VcOutreachEntry = {
    id: localId('outreach'),
    userId: user.id,
    vcContactKey: patch.vcContactKey,
    vcContactId: patch.vcContactId ?? '',
    toEmail: patch.toEmail,
    toName: patch.toName ?? '',
    investorName: patch.investorName ?? '',
    partnerName: patch.partnerName ?? '',
    subject: patch.subject ?? '',
    body: patch.body ?? '',
    stage,
    sentAt,
    notes: patch.notes ?? '',
    updatedAt: nowIso(),
  };

  if (!isSupabaseConfigured || !supabase || user.isDev) {
    const current = readLocal<VcOutreachEntry[]>(storageKey(user, 'vc-outreach-log'), []);
    const existing = current.find((entry) => entry.vcContactKey === draft.vcContactKey);
    const merged: VcOutreachEntry = existing
      ? {
          ...existing,
          ...draft,
          id: existing.id,
          // Preserve original sentAt unless the new stage is Sent and there was none.
          sentAt: draft.stage === 'Sent' && !existing.sentAt ? sentAt : existing.sentAt || sentAt,
        }
      : draft;
    writeLocal(
      storageKey(user, 'vc-outreach-log'),
      [merged, ...current.filter((entry) => entry.vcContactKey !== merged.vcContactKey)],
    );
    return merged;
  }

  const payload: Record<string, unknown> = {
    user_id: user.id,
    vc_contact_key: draft.vcContactKey,
    vc_contact_id: draft.vcContactId || null,
    to_email: draft.toEmail,
    to_name: draft.toName,
    investor_name: draft.investorName,
    partner_name: draft.partnerName,
    subject: draft.subject,
    body: draft.body,
    stage: draft.stage,
    notes: draft.notes,
  };
  if (draft.sentAt) payload.sent_at = draft.sentAt;

  const { data, error } = await supabase
    .from('vc_outreach_log')
    .upsert(payload, { onConflict: 'user_id,vc_contact_key' })
    .select('*')
    .single();

  if (error || !data) throw error ?? new Error('Unable to save outreach.');
  return mapOutreachRow(data as Record<string, unknown>);
};

/** Move an existing entry between kanban columns. */
export const setVcOutreachStage = async (
  user: AppUser,
  vcContactKey: string,
  stage: VcOutreachStage,
): Promise<VcOutreachEntry | null> => {
  if (!isSupabaseConfigured || !supabase || user.isDev) {
    const current = readLocal<VcOutreachEntry[]>(storageKey(user, 'vc-outreach-log'), []);
    const existing = current.find((entry) => entry.vcContactKey === vcContactKey);
    if (!existing) return null;
    const updated: VcOutreachEntry = {
      ...existing,
      stage,
      sentAt: stage === 'Sent' && !existing.sentAt ? nowIso() : existing.sentAt,
      updatedAt: nowIso(),
    };
    writeLocal(
      storageKey(user, 'vc-outreach-log'),
      [updated, ...current.filter((entry) => entry.vcContactKey !== vcContactKey)],
    );
    return updated;
  }
  try {
    const payload: Record<string, unknown> = { stage };
    if (stage === 'Sent') payload.sent_at = nowIso();
    const { data, error } = await supabase
      .from('vc_outreach_log')
      .update(payload)
      .eq('user_id', user.id)
      .eq('vc_contact_key', vcContactKey)
      .select('*')
      .single();
    if (error || !data) return null;
    return mapOutreachRow(data as Record<string, unknown>);
  } catch {
    return null;
  }
};

export const deleteVcOutreach = async (
  user: AppUser,
  vcContactKey: string,
): Promise<void> => {
  if (!isSupabaseConfigured || !supabase || user.isDev) {
    const current = readLocal<VcOutreachEntry[]>(storageKey(user, 'vc-outreach-log'), []);
    writeLocal(
      storageKey(user, 'vc-outreach-log'),
      current.filter((entry) => entry.vcContactKey !== vcContactKey),
    );
    return;
  }
  try {
    await supabase
      .from('vc_outreach_log')
      .delete()
      .eq('user_id', user.id)
      .eq('vc_contact_key', vcContactKey);
  } catch {
    /* non-fatal */
  }
};

export const loadOutreachTemplates = async (
  user: AppUser,
): Promise<VcOutreachTemplate[]> => {
  if (!isSupabaseConfigured || !supabase || user.isDev) {
    return readLocal<VcOutreachTemplate[]>(storageKey(user, 'vc-outreach-templates'), []);
  }
  try {
    const { data, error } = await supabase
      .from('vc_outreach_templates')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });
    if (error || !data) return [];
    return data.map((row) => mapTemplateRow(row as Record<string, unknown>));
  } catch {
    return [];
  }
};

export const saveOutreachTemplate = async (
  user: AppUser,
  template: {
    id?: string;
    name: string;
    subject: string;
    body: string;
    isDefault?: boolean;
  },
): Promise<VcOutreachTemplate> => {
  const draft: VcOutreachTemplate = {
    id: template.id || localId('tpl'),
    userId: user.id,
    name: template.name,
    subject: template.subject,
    body: template.body,
    isDefault: Boolean(template.isDefault),
    updatedAt: nowIso(),
  };

  if (!isSupabaseConfigured || !supabase || user.isDev) {
    const current = readLocal<VcOutreachTemplate[]>(
      storageKey(user, 'vc-outreach-templates'),
      [],
    );
    writeLocal(
      storageKey(user, 'vc-outreach-templates'),
      [draft, ...current.filter((tpl) => tpl.id !== draft.id)],
    );
    return draft;
  }

  const payload: Record<string, unknown> = {
    user_id: user.id,
    name: draft.name,
    subject: draft.subject,
    body: draft.body,
    is_default: draft.isDefault,
  };
  if (template.id) payload.id = template.id;

  const { data, error } = await supabase
    .from('vc_outreach_templates')
    .upsert(payload)
    .select('*')
    .single();

  if (error || !data) throw error ?? new Error('Unable to save template.');
  return mapTemplateRow(data as Record<string, unknown>);
};

export const deleteOutreachTemplate = async (
  user: AppUser,
  templateId: string,
): Promise<void> => {
  if (!isSupabaseConfigured || !supabase || user.isDev) {
    const current = readLocal<VcOutreachTemplate[]>(
      storageKey(user, 'vc-outreach-templates'),
      [],
    );
    writeLocal(
      storageKey(user, 'vc-outreach-templates'),
      current.filter((tpl) => tpl.id !== templateId),
    );
    return;
  }
  try {
    await supabase
      .from('vc_outreach_templates')
      .delete()
      .eq('user_id', user.id)
      .eq('id', templateId);
  } catch {
    /* non-fatal */
  }
};
