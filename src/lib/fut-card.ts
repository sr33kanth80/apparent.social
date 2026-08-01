import type { ProductLaunch } from './apparent-types';

// ── Daily digest trading-card model ─────────────────────────────────────────
// Sourced startups render as FUT-style cards, so each needs an overall and six
// stats. Every number is derived from fields actually present on the record —
// nothing random — so a given startup always renders the same card.
//
// These rate the STRENGTH OF THE SIGNAL we hold on a company, not the company.
// A thinly-scraped record scores low because we know little about it, which is
// the honest reading and the one investors should apply.
export const clamp99 = (n: number) => Math.max(1, Math.min(99, Math.round(n)));

// Largest magnitude mentioned in a metrics blurb: "4k MAU / 22% MoM" → 4000.
export const metricMagnitude = (metrics: string): number => {
  let best = 0;
  for (const match of metrics.matchAll(/([\d.]+)\s*([kmb])?/gi)) {
    const value = parseFloat(match[1]);
    if (!Number.isFinite(value)) continue;
    const mult = { k: 1e3, m: 1e6, b: 1e9 }[(match[2] || '').toLowerCase()] ?? 1;
    best = Math.max(best, value * mult);
  }
  return best;
};

// Stage → the card's "position" slot.
const STAGE_POSITION: Array<[RegExp, string]> = [
  [/pre[\s-]?seed/i, 'PRE'],
  [/seed/i, 'SEED'],
  [/series\s*a|^a$/i, 'A'],
  [/series\s*b|^b$/i, 'B'],
  [/series\s*c|growth|late/i, 'GRW'],
  [/idea|concept|build/i, 'IDEA'],
];

export const stagePosition = (stage: string): string => {
  for (const [re, code] of STAGE_POSITION) if (re.test(stage)) return code;
  return stage ? stage.slice(0, 4).toUpperCase() : 'NEW';
};

const TOKEN_STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'that', 'from', 'into', 'their', 'they', 'this',
  'are', 'our', 'who', 'has', 'have', 'not', 'but', 'all', 'any', 'can', 'out',
]);

const meaningfulTokens = (text: string): Set<string> =>
  new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9+]+/)
      .filter((t) => t.length > 2 && !TOKEN_STOPWORDS.has(t)),
  );

export type FutCard = {
  ovr: number;
  position: string;
  stats: Array<{ label: string; value: number }>;
};

// Hover copy for the three-letter stat codes — the abbreviations are only
// readable because FUT trained everyone on the format, so spell them out.
export const FUT_STAT_TITLES: Record<string, string> = {
  TRC: 'Traction — scale of the metrics we can see',
  TEA: 'Team — how much we know about who is building it',
  MKT: 'Market — how clearly the category and tags are defined',
  PRF: 'Proof — verifiable links, decks, and demos attached',
  MOM: 'Momentum — how recently this was sighted',
  FIT: 'Fit — overlap with your thesis, sectors, stage, and geography',
};

export const buildFutCard = (
  launch: ProductLaunch,
  criteria: { thesis?: string; sectors?: string; stage?: string; geography?: string },
): FutCard => {
  const haystack = [
    launch.name, launch.tagline, launch.intro ?? '', launch.category,
    launch.stage, launch.location ?? '', launch.metrics,
    (launch.founderSignals ?? []).join(' '),
  ].join(' ');

  // TRC — traction. Log-scaled so 40k doesn't dwarf 4k on a 99-point axis.
  const magnitude = metricMagnitude(launch.metrics || '');
  const trc = launch.metrics
    ? clamp99(46 + Math.log10(Math.max(magnitude, 1)) * 9)
    : 18;

  // TEA — what we know about the team.
  const teamChars = (launch.teamSummary ?? '').trim().length;
  const tea = clamp99(
    16 + Math.min(46, teamChars / 4) + (launch.teamMembers?.length ?? 0) * 9,
  );

  // MKT — how legible the market is: a category plus tag breadth.
  const mkt = clamp99(
    24 + (launch.category ? 26 : 0) + Math.min(34, (launch.founderSignals?.length ?? 0) * 11),
  );

  // PRF — how much verifiable material is attached.
  const artifacts = [
    launch.launchUrl, launch.proofUrl, launch.sourceUrl,
    launch.pitchDeckUrl, launch.demoVideoUrl, launch.pitchVideoUrl,
  ].filter(Boolean).length;
  const prf = clamp99(20 + artifacts * 13);

  // MOM — freshness of the sighting, plus any upvote pull.
  const ageDays = launch.updatedAt
    ? (Date.now() - new Date(launch.updatedAt).getTime()) / 86_400_000
    : 999;
  const mom = clamp99(
    (Number.isFinite(ageDays) ? Math.max(0, 86 - ageDays * 2.4) : 30) +
      Math.min(13, (launch.upvoteCount ?? 0) * 1.5),
  );

  // FIT — overlap against this investor's own thesis and sectors.
  const wanted = meaningfulTokens(`${criteria.thesis ?? ''} ${criteria.sectors ?? ''}`);
  const found = meaningfulTokens(haystack);
  let hits = 0;
  for (const token of wanted) if (found.has(token)) hits += 1;
  const stageHit = criteria.stage && launch.stage
    ? criteria.stage.toLowerCase().includes(launch.stage.toLowerCase().split(/\s+/)[0])
    : false;
  const geoHit = criteria.geography && launch.location
    ? meaningfulTokens(criteria.geography).has(launch.location.toLowerCase().split(/[,\s]+/)[0])
    : false;
  // No thesis captured yet → don't fake a match, sit at the neutral mark.
  const fit = wanted.size === 0
    ? 50
    : clamp99(34 + Math.min(40, hits * 10) + (stageHit ? 13 : 0) + (geoHit ? 9 : 0));

  const stats = [
    { label: 'TRC', value: trc },
    { label: 'TEA', value: tea },
    { label: 'MKT', value: mkt },
    { label: 'PRF', value: prf },
    { label: 'MOM', value: mom },
    { label: 'FIT', value: fit },
  ];

  // Fit and traction carry the overall — they're what decides a first meeting.
  const ovr = clamp99(
    (fit * 1.5 + trc * 1.35 + prf * 1.05 + mom * 0.95 + mkt * 0.75 + tea * 0.4) / 6,
  );

  return { ovr, position: stagePosition(launch.stage), stats };
};
