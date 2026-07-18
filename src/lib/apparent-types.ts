export type DashboardRole = 'founder' | 'investor';
export type InvestorDealStage = 'New' | 'Reviewing' | 'Reached Out' | 'Meeting' | 'Watchlist';

export interface AppUser {
  id: string;
  email: string;
  role: DashboardRole;
  isDev: boolean;
  /** Canonical @-handle derived from email and stored in profiles.username. */
  username?: string;
}

export interface InvestorCriteriaValues {
  thesis: string;
  sectors: string;
  stage: string;
  checkSize: string;
  geography: string;
  founderSignals: string;
  passSignals: string;
  portfolioExamples: string;
  /** Stored as 'true' | 'false' string so it fits Record<string,string> */
  publicProfileEnabled: string;
  /** JSON-stringified string[] of visible field keys */
  publicFields: string;
  /** 'true' | 'false' — show the public "Share profile" button. */
  shareable: string;
}

export interface FounderProfileValues {
  profileName: string;
  headline: string;
  bio: string;
  profilePhotoUrl: string;
  currentBuild: string;
  category: string;
  stage: string;
  github: string;
  traction: string;
  lookingFor: string;
  location: string;
  press: string;
  website: string;
  linkedin: string;
  xProfile: string;
  pastProducts: string;
  /** Legacy headline revenue metric, e.g. "$24K MRR · +22% MoM". Kept for back-compat — new code reads tractionType + tractionValue. */
  mrr: string;
  /** Type of traction signal — picks the shape VCs sort by. One of: 'mrr' | 'users' | 'gmv' | 'prototype' | 'loi' | 'pmf'. Empty = founder hasn't picked yet. */
  tractionType: string;
  /** Value paired with tractionType, e.g. "$24K MRR · +22% MoM", "12K WAU", "3 signed LOIs". */
  tractionValue: string;
  /** Headcount including founders, e.g. "1", "2", "3-5", "6-10", "11+". */
  teamSize: string;
  /** Total raised before this round, e.g. "$500K pre-seed", "None". */
  priorRaiseAmount: string;
  /** ISO date string (YYYY-MM-DD) for the founder's target close date — urgency signal for VCs. */
  targetCloseDate: string;
  // Fundraising intent (the opt-in layer scrapers can't have). Stored as strings
  // for form consistency: fundraisingStatus ∈ 'raising' | 'open' | 'not_raising';
  // openToContact ∈ 'true' | 'false'.
  fundraisingStatus: string;
  raisingRound: string;
  raisingAmount: string;
  raisingAsk: string;
  openToContact: string;
  /** 'true' | 'false' — show the public "Share profile" button. */
  shareable: string;
}

export type IntakeValues = InvestorCriteriaValues | FounderProfileValues;

export interface InvestorSignal {
  id: string;
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
  sourceType: string;
  freshnessAt: string;
  githubUrl: string;
  rawTags: string[];
}

/**
 * How autonomously the investor's agent acts when reaching out to founders.
 * - 'manual'          → agent drafts; investor approves every send
 * - 'auto_onplatform' → agent auto-sends in-app DMs to on-platform founders
 * - 'autonomous'      → auto-sends + (later) auto-follows-up
 * Off-platform outreach is always draft-to-inbox regardless of this setting.
 */
export type AgentAutonomy = 'manual' | 'auto_onplatform' | 'autonomous';

export type AgentProfilePatchField = {
  field: string;
  label?: string;
  oldValue: string;
  newValue: string;
  reason: string;
  sourceUrl?: string;
  confidence?: 'low' | 'medium' | 'high';
};

export type AgentProfilePatch = {
  role: DashboardRole;
  summary: string;
  sourceUrls: string[];
  unavailableSources?: string[];
  fields: AgentProfilePatchField[];
};

export type AgentMemory = {
  id?: string;
  role: DashboardRole;
  scope: 'profile' | 'preference' | 'source' | 'action' | 'conversation_summary';
  key: string;
  value: string;
  sourceUrl?: string;
  confidence?: 'low' | 'medium' | 'high';
  updatedAt?: string;
};

export type AgentChatHistoryMessage = {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  payload?: Record<string, unknown>;
  createdAt?: string;
};

export interface UserSettings {
  dailyDigestEnabled: boolean;
  slackAlertsEnabled: boolean;
  agentAutonomy: AgentAutonomy;
}

export interface ProductLaunch {
  id: string;
  ownerId: string;
  slug?: string;
  name: string;
  tagline: string;
  intro?: string;
  category: string;
  stage: string;
  location?: string;
  launchUrl: string;
  proofUrl: string;
  logoUrl?: string;
  bannerUrl?: string;
  demoVideoUrl?: string;
  pitchVideoUrl?: string;
  pitchDeckUrl?: string;
  pitchBookNote?: string;
  pitchVisibility?: 'public' | 'investors';
  founderSignals?: string[];
  teamSummary?: string;
  customerSummary?: string;
  techStack?: string;
  fundingStatus?: string;
  lookingFor?: string;
  publicProfileEnabled?: boolean;
  teamMembers?: LaunchTeamMember[];
  metrics: string;
  /** Aggregate upvote count from the DB (populated for real launches). */
  upvoteCount?: number;
  updatedAt: string;
  /**
   * Provenance. 'apparent' = launched by a real founder on the platform.
   * 'external' = ingested from a scraper feed (Product Hunt, YC, HN, etc.).
   * Undefined is treated as 'apparent' for backward compatibility.
   */
  origin?: 'apparent' | 'external';
  /** For external launches: human-readable source, e.g. "Product Hunt". */
  source?: string;
  /** For external launches: link back to the original listing. */
  sourceUrl?: string;
  /**
   * Internal in-app route for this item when one exists (e.g. /sourced/:id for
   * agent-sourced startups). When set, feed cards link here instead of out to
   * the original listing.
   */
  projectPath?: string;
}

/**
 * One raw record in an R2-hosted scraper feed file
 * (feeds/external-launches.json, feeds/daily-digest.json). Mirrors what the
 * Perplexity/scraper pipeline writes — intentionally loose so the ingestion
 * side stays simple; loadExternalLaunches() normalizes it into ProductLaunch.
 */
export interface ExternalLaunchRecord {
  id?: string;
  name: string;
  tagline?: string;
  description?: string;
  category?: string;
  stage?: string;
  location?: string;
  url?: string;
  logoUrl?: string;
  bannerUrl?: string;
  metrics?: string;
  mrr?: string;
  /** Where it was scraped from, e.g. "Product Hunt", "YC", "Hacker News". */
  source?: string;
  /** Link to the original listing. */
  sourceUrl?: string;
  /** ISO date the product launched / was discovered. */
  launchedAt?: string;
  founderSignals?: string[];
}

/** Top-level shape of an R2 feed file. */
export interface ExternalLaunchFeed {
  /** ISO timestamp the scraper last refreshed this file. */
  updatedAt?: string;
  launches: ExternalLaunchRecord[];
}

export interface LaunchTeamMember {
  id?: string;
  launchId?: string;
  ownerId?: string;
  apparentUserId?: string;
  name: string;
  role: string;
  bio: string;
  location: string;
  avatarUrl: string;
  profileUrl: string;
  linkedinUrl: string;
  xProfileUrl: string;
  githubUrl: string;
  sortOrder: number;
}

export interface PublicFounderProfile {
  userId: string;
  username: string;
  profileName: string;
  headline: string;
  bio: string;
  profilePhotoUrl: string;
  currentBuild: string;
  category: string;
  stage: string;
  github: string;
  traction: string;
  lookingFor: string;
  location: string;
  press: string;
  website: string;
  linkedin: string;
  xProfile: string;
  pastProducts: string;
  fundraisingStatus?: string;
  raisingRound?: string;
  raisingAmount?: string;
  raisingAsk?: string;
  openToContact?: boolean;
  shareable?: boolean;
  /** Legacy headline revenue metric (kept for back-compat). */
  mrr?: string;
  /** New typed traction signal — one of: 'mrr' | 'users' | 'gmv' | 'prototype' | 'loi' | 'pmf'. */
  tractionType?: string;
  tractionValue?: string;
  teamSize?: string;
  priorRaiseAmount?: string;
  targetCloseDate?: string;
  /** Weighted 0-100 score reflecting how much of the VC-grade profile is filled. */
  profileCompleteness?: number;
  /** Trust layer: GitHub ownership proven via gist-code check. */
  githubVerified?: boolean;
  githubUsername?: string;
  launches: ProductLaunch[];
}

export interface PublicInvestorProfile {
  userId: string;
  username: string;
  displayName: string;
  profilePhotoUrl: string;
  thesis: string;
  sectors: string;
  stage: string;
  checkSize: string;
  geography: string;
  portfolioExamples: string;
  founderSignals: string;
  /** Which fields are visible (respects the investor's per-field toggle). */
  publicFields: string[];
  /** True when the investor hasn't enabled public visibility — logged-out visitors see a gate. */
  restricted: boolean;
  shareable?: boolean;
}

export type PublicProfileResult =
  | { kind: 'founder'; profile: PublicFounderProfile }
  | { kind: 'investor'; profile: PublicInvestorProfile }
  | { kind: 'not_found' };

export interface PublicProjectDetail {
  launch: ProductLaunch;
  founder: PublicFounderProfile | null;
  teamMembers: LaunchTeamMember[];
}

/**
 * A startup Apparent's sourcing agent discovered from public signals (a
 * `source_signals` row), surfaced to investors in the same editorial template
 * as a native launch — but explicitly labeled "Sourced · unverified" (no
 * founder has claimed it, no GitHub verification). `dossier` is the on-demand
 * agent enrichment (Phase 2); null until generated.
 */
export interface SourcedStartup {
  id: string;
  company: string;
  founder: string;
  detail: string;
  sourceType: string;
  sourceUrl: string;
  profileUrl: string;
  stage: string;
  location: string;
  githubUrl: string;
  tags: string[];
  freshnessAt: string;
  dossier: SourcedDossier | null;
  dossierAt: string;
}

/**
 * The on-demand agent deep dive for a sourced startup, built by
 * /api/sourced-enrich via Apparent/Orthogonal research and cached on the source_signals
 * row. Stored in jsonb in this exact (camelCase) shape so the client reads it
 * back without remapping.
 */
export interface SourcedDossier {
  summary: string;
  whatTheyBuild?: string;
  team?: { name: string; role?: string; note?: string }[];
  traction?: string[];
  thesisFit?: string;
  sources?: { label?: string; url: string }[];
  generatedAt?: string;
}

export interface Meetup {
  id: string;
  hostId: string;
  hostRole: DashboardRole;
  title: string;
  audience: string;
  city: string;
  venue: string;
  startsAt: string;
  capacity: number;
  description: string;
  attendeeCount: number;
  isJoined: boolean;
}

export interface NetworkCluster {
  city: string;
  builders: number;
  investors: number;
  meetups: number;
  signals: number;
  x: number;
  y: number;
  tags: string[];
  latest: string;
}

export interface BuilderProofLink {
  label: string;
  url: string;
  type: 'github' | 'launch' | 'press' | 'profile' | 'proof';
}

export interface BuilderNode {
  id: string;
  founderId: string;
  founderName: string;
  company: string;
  displayLabel: string;
  buildSummary: string;
  category: string;
  stage: string;
  location: string;
  latitude: number;
  longitude: number;
  proofLinks: BuilderProofLink[];
  traction: string;
  launchCount: number;
  latestActivity: string;
  latestActivityLabel: string;
  fitScore: number;
  matchReasons: string[];
  profileUrl: string;
  githubUrl: string;
  pressUrl: string;
  launchUrl: string;
  rawTags: string[];
  isCurrentUser?: boolean;
  /** Where this builder came from: a real Apparent user/launch, or an ingested public signal. */
  origin?: 'apparent' | 'ingested';
  /** For ingested builders, the source surface (e.g. "YC Directory", "GitHub Trending", "Product Hunt"). */
  sourceLabel?: string;
  /** Opt-in fundraising intent (real Apparent founders only). */
  fundraisingStatus?: 'raising' | 'open' | 'not_raising';
  raisingRound?: string;
  raisingAmount?: string;
  openToContact?: boolean;
  /** Optional headline revenue/growth metric, e.g. "$24K MRR · +22% MoM". */
  mrr?: string;
  /** New typed traction signal — one of: 'mrr' | 'users' | 'gmv' | 'prototype' | 'loi' | 'pmf'. Empty if founder hasn't picked one. */
  tractionType?: string;
  tractionValue?: string;
  /** Team headcount including founders, e.g. "1", "2", "3-5", "6-10", "11+". */
  teamSize?: string;
  /** Total raised before this round. */
  priorRaiseAmount?: string;
  /** Target close date for the current round (ISO YYYY-MM-DD) — urgency signal for VCs. */
  targetCloseDate?: string;
  /** Weighted 0-100 score of how complete the underlying founder profile is. Drives sort + hide-low logic in VC views. */
  profileCompleteness?: number;
}

export interface BuilderMapCluster {
  city: string;
  latitude: number;
  longitude: number;
  builderCount: number;
  categoryMix: string[];
  stageMix: string[];
  latestActivity: string;
  latestActivityLabel: string;
  fitScore: number;
  builderIds: string[];
  meetups: number;
}

export interface VCContact {
  id: string;
  investorName: string;
  fundType: string;
  fundStage: string;
  website: string;
  fundFocusSectors: string;
  partnerName: string;
  partnerEmail: string;
  portfolioCompanies: string;
  location: string;
  normalizedCity: string;
  latitude: number | null;
  longitude: number | null;
  twitterUrl: string;
  linkedinUrl: string;
  facebookUrl: string;
  numberOfInvestments: number;
  numberOfExits: number;
  fundDescription: string;
  foundingYear: number | null;
}

export type VcOutreachStage = 'Drafted' | 'Sent' | 'Replied' | 'Meeting' | 'Passed';

export interface VcOutreachEntry {
  id: string;
  userId: string;
  /** Stable per-VC key: lower-cased partner email, or "name|website" when missing. */
  vcContactKey: string;
  vcContactId?: string;
  toEmail: string;
  toName: string;
  investorName: string;
  partnerName: string;
  subject: string;
  body: string;
  stage: VcOutreachStage;
  sentAt: string;
  notes: string;
  updatedAt: string;
}

export interface VcOutreachTemplate {
  id: string;
  userId: string;
  name: string;
  subject: string;
  body: string;
  isDefault: boolean;
  updatedAt: string;
}

export interface BuilderDiscoveryState {
  userId: string;
  builderId: string;
  saved: boolean;
  hidden: boolean;
  stage: InvestorDealStage | '';
  note: string;
  outreachBody: string;
  updatedAt: string;
}

export interface NetworkInterestPin {
  label: string;
  latitude: number;
  longitude: number;
}

export interface NetworkMapFilters {
  city: string;
  category: string;
  stage: string;
  freshness: 'any' | '24h' | '7d' | '30d';
  matchOnly: boolean;
  /** Show only real Apparent founders who declared they're raising / open to intros. */
  raisingOnly: boolean;
  radiusMiles: number;
  pin: NetworkInterestPin | null;
  /** Minimum founder profile completeness (0-100). Investors only; default 40. */
  minCompleteness?: number;
  /** Minimum raising amount band, freeform like "$500K" / "$1M" / "$5M". Empty = no floor. */
  raisingAmountMin?: string;
}

export interface TermReview {
  id: string;
  ownerId: string;
  company: string;
  instrument: string;
  amount: string;
  valuation: string;
  proRata: string;
  notes: string;
  status: string;
  updatedAt: string;
}

export interface UserMessage {
  id: string;
  ownerId: string;
  recipient: string;
  /** The recipient's Apparent user id, when they're a real member (enables delivery). */
  recipientId?: string;
  /** The sender's display name, shown to the recipient in their inbox. */
  senderName?: string;
  subject: string;
  body: string;
  status: 'draft' | 'sent' | 'replied';
  context: string;
  updatedAt: string;
  /** When the recipient read this message. Null/undefined = unread (recipient side). */
  readAt?: string;
}

/** A persistent in-app notification (e.g. a thesis-matched founder just launched). */
export interface Notification {
  id: string;
  userId: string;
  /** e.g. 'launch_match' | 'message' | 'info'. */
  type: string;
  title: string;
  body: string;
  /** In-app route to open when clicked. */
  link: string;
  /** Structured payload (launch_id, founder_id, …). */
  data: Record<string, unknown>;
  /** Null/undefined = unread. */
  readAt?: string;
  createdAt: string;
}

/** A VC's interest in a builder, expressed via the Discover swipe deck. */
export interface VcInterestEntry {
  id: string;
  investorId: string;
  investorName: string;
  builderId: string;
  /** The founder's Apparent user id, when they're a claimed member. */
  builderUserId?: string;
  builderName: string;
  kind: 'like' | 'superlike';
  createdAt: string;
}

export interface FeedItem {
  id: string;
  title: string;
  detail: string;
  tag: string;
  source: string;
  actor: string;
  meta: string;
  saved: boolean;
  reposted: boolean;
  reply: string;
}

export interface LaunchEngagementEntry {
  upvoted: boolean;
  upvotes: number;
  comments: string[];
}

export interface DashboardData {
  intakeValues: Record<string, string>;
  completedLabels: string[];
  profileSaved: boolean;
  signalRows: InvestorSignal[];
  settings: UserSettings;
  productLaunches: ProductLaunch[];
  meetups: Meetup[];
  networkClusters: NetworkCluster[];
  builderNodes: BuilderNode[];
  builderClusters: BuilderMapCluster[];
  builderDiscoveryStates: BuilderDiscoveryState[];
  termReviews: TermReview[];
  messages: UserMessage[];
  notifications: Notification[];
  feedItems: FeedItem[];
  /** Names of investor matches the current founder has bookmarked. */
  savedInvestorMatchNames: string[];
  /** Per-launch upvote + comment state for the current user. */
  launchEngagement: Record<string, LaunchEngagementEntry>;
  /** For founders: how many investors are tracking them (the come-back loop). */
  founderInterest: { saveCount: number; recentSaverNames: string[] };
}
