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
  // Fundraising intent (the opt-in layer scrapers can't have). Stored as strings
  // for form consistency: fundraisingStatus ∈ 'raising' | 'open' | 'not_raising';
  // openToContact ∈ 'true' | 'false'.
  fundraisingStatus: string;
  raisingRound: string;
  raisingAmount: string;
  raisingAsk: string;
  openToContact: string;
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

export interface UserSettings {
  dailyDigestEnabled: boolean;
  slackAlertsEnabled: boolean;
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
  feedItems: FeedItem[];
  /** Names of investor matches the current founder has bookmarked. */
  savedInvestorMatchNames: string[];
  /** Per-launch upvote + comment state for the current user. */
  launchEngagement: Record<string, LaunchEngagementEntry>;
  /** For founders: how many investors are tracking them (the come-back loop). */
  founderInterest: { saveCount: number; recentSaverNames: string[] };
}
