import type {
  BuilderNode,
  FeedItem,
  FounderProfileValues,
  InvestorCriteriaValues,
  InvestorDealStage,
  Meetup,
  NetworkCluster,
} from '@/lib/apparent-types';

export const investorDealStages: InvestorDealStage[] = ['New', 'Reviewing', 'Reached Out', 'Meeting', 'Watchlist'];

export const defaultInvestorCriteria: InvestorCriteriaValues = {
  thesis: '',
  sectors: '',
  stage: '',
  checkSize: '',
  geography: '',
  founderSignals: '',
  passSignals: '',
  portfolioExamples: '',
  publicProfileEnabled: 'false',
  publicFields: JSON.stringify(['thesis', 'sectors', 'stage', 'geography']),
  shareable: 'true',
};

export const defaultFounderProfile: FounderProfileValues = {
  profileName: '',
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
  mrr: '',
  fundraisingStatus: 'not_raising',
  raisingRound: '',
  raisingAmount: '',
  raisingAsk: '',
  openToContact: 'true',
  shareable: 'true',
};


export const seedMeetups: Meetup[] = [
];

export const cityCoordinates: Record<string, Pick<NetworkCluster, 'x' | 'y'>> = {
  'San Francisco': { x: 18, y: 54 },
  Brooklyn: { x: 72, y: 45 },
  'New York': { x: 75, y: 43 },
  Seattle: { x: 22, y: 25 },
  Austin: { x: 54, y: 70 },
  Remote: { x: 48, y: 42 },
};

export const cityGeoCoordinates: Record<string, { latitude: number; longitude: number }> = {
  'San Francisco': { latitude: 37.7749, longitude: -122.4194 },
  Brooklyn: { latitude: 40.6782, longitude: -73.9442 },
  'New York': { latitude: 40.7128, longitude: -74.006 },
  Seattle: { latitude: 47.6062, longitude: -122.3321 },
  Austin: { latitude: 30.2672, longitude: -97.7431 },
  Boston: { latitude: 42.3601, longitude: -71.0589 },
  Chicago: { latitude: 41.8781, longitude: -87.6298 },
  'Los Angeles': { latitude: 34.0522, longitude: -118.2437 },
  Miami: { latitude: 25.7617, longitude: -80.1918 },
  Denver: { latitude: 39.7392, longitude: -104.9903 },
  Atlanta: { latitude: 33.749, longitude: -84.388 },
  Toronto: { latitude: 43.6532, longitude: -79.3832 },
  London: { latitude: 51.5072, longitude: -0.1276 },
  Paris: { latitude: 48.8566, longitude: 2.3522 },
  Berlin: { latitude: 52.52, longitude: 13.405 },
  Amsterdam: { latitude: 52.3676, longitude: 4.9041 },
  Stockholm: { latitude: 59.3293, longitude: 18.0686 },
  Singapore: { latitude: 1.3521, longitude: 103.8198 },
  Bengaluru: { latitude: 12.9716, longitude: 77.5946 },
  Mumbai: { latitude: 19.076, longitude: 72.8777 },
  Delhi: { latitude: 28.6139, longitude: 77.209 },
  Hyderabad: { latitude: 17.385, longitude: 78.4867 },
  Pune: { latitude: 18.5204, longitude: 73.8567 },
  'Tel Aviv': { latitude: 32.0853, longitude: 34.7818 },
  Dubai: { latitude: 25.2048, longitude: 55.2708 },
  Remote: { latitude: 39.8283, longitude: -98.5795 },
};

export const seedBuilderNodes: BuilderNode[] = [
];

export const generalFeedDefaults: FeedItem[] = [
];
