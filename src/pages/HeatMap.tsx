import { useEffect, useId, useMemo, useState } from 'react';
import { ArrowUpRight, Building2, CheckCircle2, ChevronLeft, ChevronRight, Clock, Copy, Flame, Globe2, Layers3, LocateFixed, MailCheck, Send, SlidersHorizontal, Sparkles, Users, X } from 'lucide-react';
import type { GeoJSONSource, MapLayerMouseEvent } from 'maplibre-gl';
import { Link } from 'react-router-dom';
import { Map, useMap } from '@/components/ui/map';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cityGeoCoordinates } from '@/lib/app-defaults';
import {
  OUTREACH_INSPIRATION_EXAMPLES,
  PREBAKED_SUBJECT_LINES,
  loadFounderVCContacts,
  loadOutreachTemplates,
  loadPublicProductLaunches,
  loadVcOutreachLog,
  renderOutreachTemplate,
  saveOutreachTemplate,
  saveVcOutreach,
  vcContactKey,
} from '@/lib/dashboard-service';
import type {
  AppUser,
  ProductLaunch,
  VCContact,
  VcOutreachEntry,
  VcOutreachStage,
  VcOutreachTemplate,
} from '@/lib/apparent-types';

type HeatMapMode = 'all' | 'builders' | 'vcs';

type HeatMapPoint = {
  id: string;
  name: string;
  kind: 'builder' | 'vc';
  source: 'apparent' | 'ecosystem' | 'vc_database';
  city: string;
  latitude: number;
  longitude: number;
  intensity: number;
  label: string;
  profilePath?: string;
  websiteUrl?: string;
  email?: string;
  partnerName?: string;
  fundStage?: string;
  socialLinks?: Array<{ label: string; url: string }>;
  imageUrl: string;
  imageKind?: 'city' | 'logo';
  /** Underlying VC record — used by the compose dialog for variable substitution. */
  vcContact?: VCContact;
};

interface HeatMapProps {
  includeVCContacts?: boolean;
  vcOnly?: boolean;
  /** Fill the available space edge-to-edge (no max-width section or rounded card). */
  fullBleed?: boolean;
  /** With fullBleed: fill the flex parent (flex-1) instead of forcing h-screen.
      Used on the public page so the map fits below the fixed navbar. */
  fillParent?: boolean;
  /** Hide VC partner emails behind a "sign in" gate (for logged-out visitors). */
  lockContacts?: boolean;
  /** Founder's own stage/sectors — powers the "Match my profile" shortcut. */
  founderStage?: string;
  founderSectors?: string;
  /** Founder identity passed in from the dashboard. Enables the compose dialog. */
  currentUser?: AppUser | null;
  founderName?: string;
  founderCompany?: string;
  founderTraction?: string;
}

const HEATMAP_GRADIENT_COLORS = ['#fff7bc', '#fee391', '#fec44f', '#fe9929', '#d7301f'];

const HEATMAP_COLOR_STOPS: [number, string][] = [
  [0.15, HEATMAP_GRADIENT_COLORS[0]],
  [0.35, HEATMAP_GRADIENT_COLORS[1]],
  [0.55, HEATMAP_GRADIENT_COLORS[2]],
  [0.75, HEATMAP_GRADIENT_COLORS[3]],
  [1, HEATMAP_GRADIENT_COLORS[4]],
];

const cityImageByName: Record<string, string> = {
  'San Francisco': 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=600&q=80',
  'New York': 'https://images.unsplash.com/photo-1496588152823-86ff7695e68f?auto=format&fit=crop&w=600&q=80',
  Austin: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=600&q=80',
  Boston: 'https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=600&q=80',
  London: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=600&q=80',
  Paris: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=600&q=80',
  Berlin: 'https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=600&q=80',
  Bengaluru: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=600&q=80',
  Singapore: 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?auto=format&fit=crop&w=600&q=80',
  Remote: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=600&q=80',
};

const offsetByKind = (point: HeatMapPoint): HeatMapPoint => {
  if (point.kind === 'builder') {
    return { ...point, longitude: point.longitude - 0.18, latitude: point.latitude + 0.08 };
  }

  return { ...point, longitude: point.longitude + 0.18, latitude: point.latitude - 0.08 };
};

const launchToPoint = (launch: ProductLaunch, index: number): HeatMapPoint => {
  const city = launch.location && cityGeoCoordinates[launch.location] ? launch.location : 'Remote';
  const coordinates = cityGeoCoordinates[city] ?? cityGeoCoordinates.Remote;

  return {
    id: `apparent-launch-${launch.id}`,
    name: launch.name,
    kind: 'builder',
    source: 'apparent',
    city,
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
    intensity: Math.max(48, 86 - index * 4),
    label: launch.category || launch.stage || 'Founder launch',
    profilePath: `/projects/${launch.slug || launch.id}`,
    imageUrl: launch.bannerUrl || cityImageByName[city] || cityImageByName.Remote,
  };
};

const jitteredCoordinate = (value: number, index: number, phase: number) =>
  value + Math.sin((index + 1) * phase) * 0.08;

const toExternalUrl = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return '';
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
};

const logoUrlFromWebsite = (website: string) => {
  const url = toExternalUrl(website);
  if (!url) return '';

  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
  } catch {
    return '';
  }
};

const vcContactToPoint = (contact: VCContact, index: number): HeatMapPoint | null => {
  if (contact.latitude === null || contact.longitude === null) return null;

  const investmentScore = Math.min(26, Math.round(Math.log10(Math.max(1, contact.numberOfInvestments)) * 14));
  const exitScore = Math.min(14, Math.round(Math.log10(Math.max(1, contact.numberOfExits + 1)) * 8));
  const stageScore = contact.fundStage.toLowerCase().includes('seed') ? 8 : 4;
  const city = contact.normalizedCity || contact.location || 'Unknown';

  return {
    id: `vc-contact-${contact.id}`,
    name: contact.investorName,
    kind: 'vc',
    source: 'vc_database',
    city,
    latitude: jitteredCoordinate(contact.latitude, index, 1.91),
    longitude: jitteredCoordinate(contact.longitude, index, 1.37),
    intensity: Math.max(42, Math.min(98, 48 + investmentScore + exitScore + stageScore)),
    label: contact.fundFocusSectors || contact.fundDescription || contact.fundStage || 'Cold-pitch friendly VC contact',
    websiteUrl: toExternalUrl(contact.website),
    email: contact.partnerEmail,
    partnerName: contact.partnerName,
    fundStage: contact.fundStage,
    socialLinks: [
      contact.linkedinUrl ? { label: 'LinkedIn', url: toExternalUrl(contact.linkedinUrl) } : null,
      contact.twitterUrl ? { label: 'X', url: toExternalUrl(contact.twitterUrl) } : null,
      contact.facebookUrl ? { label: 'Facebook', url: toExternalUrl(contact.facebookUrl) } : null,
    ].filter(Boolean) as Array<{ label: string; url: string }>,
    imageUrl: logoUrlFromWebsite(contact.website),
    imageKind: 'logo',
    vcContact: contact,
  };
};

const buildFeatureCollection = (points: HeatMapPoint[], selectedId?: string) => ({
  type: 'FeatureCollection' as const,
  features: points.map((point) => ({
    type: 'Feature' as const,
    properties: {
      id: point.id,
      mag: point.intensity / 16,
      intensity: point.intensity,
      kind: point.kind,
      source: point.source,
      city: point.city,
      name: point.name,
      label: point.label,
      selected: point.id === selectedId,
    },
    geometry: {
      type: 'Point' as const,
      coordinates: [point.longitude, point.latitude],
    },
  })),
});

function ApparentHeatmapLayers({
  points,
  selectedId,
  onPointSelect,
}: {
  points: HeatMapPoint[];
  selectedId?: string;
  onPointSelect: (point: HeatMapPoint) => void;
}) {
  const { map, isLoaded } = useMap();
  const id = useId().replace(/:/g, '');
  const sourceId = `apparent-heatmap-source-${id}`;
  const heatLayerId = `apparent-heatmap-layer-${id}`;
  const globalPointLayerId = `apparent-heatmap-global-point-layer-${id}`;
  const pointLayerId = `apparent-heatmap-point-layer-${id}`;
  const geoJson = useMemo(() => buildFeatureCollection(points, selectedId), [points, selectedId]);
  const pointById = useMemo(() => new globalThis.Map(points.map((point) => [point.id, point])), [points]);

  useEffect(() => {
    if (!map || !isLoaded) return;

    if (!map.getSource(sourceId)) {
      map.addSource(sourceId, {
        type: 'geojson',
        data: geoJson,
      });
    }

    if (!map.getLayer(heatLayerId)) {
      map.addLayer({
        id: heatLayerId,
        type: 'heatmap',
        source: sourceId,
        maxzoom: 6,
        paint: {
          'heatmap-weight': ['interpolate', ['linear'], ['get', 'mag'], 0, 0, 6, 0.8],
          'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 0.55, 6, 1.25],
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0,
            'rgba(59, 130, 246, 0)',
            ...HEATMAP_COLOR_STOPS.flat(),
          ],
          'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 8, 6, 34],
          'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 4.5, 0.75, 6.5, 0.08],
        },
      });
    }

    if (!map.getLayer(globalPointLayerId)) {
      map.addLayer({
        id: globalPointLayerId,
        type: 'circle',
        source: sourceId,
        maxzoom: 5.25,
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 1, 2.8, 3, 4.2, 5.25, 6.5],
          'circle-color': [
            'interpolate',
            ['linear'],
            ['get', 'mag'],
            1,
            HEATMAP_GRADIENT_COLORS[1],
            2.5,
            HEATMAP_GRADIENT_COLORS[2],
            4,
            HEATMAP_GRADIENT_COLORS[3],
            6,
            HEATMAP_GRADIENT_COLORS[4],
          ],
          'circle-opacity': ['interpolate', ['linear'], ['zoom'], 1, 0.62, 3.5, 0.48, 5.25, 0.12],
          'circle-blur': ['interpolate', ['linear'], ['zoom'], 1, 0.45, 5.25, 0.2],
          'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 1, 0, 4.5, 0.75],
          'circle-stroke-color': 'rgba(255,255,255,0.72)',
        },
      });
    }

    if (!map.getLayer(pointLayerId)) {
      map.addLayer({
        id: pointLayerId,
        type: 'circle',
        source: sourceId,
        minzoom: 4.5,
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['get', 'mag'], 1, 1.8, 6, 5.5],
          'circle-color': [
            'case',
            ['boolean', ['get', 'selected'], false],
            '#22c55e',
            [
              'interpolate',
              ['linear'],
              ['get', 'mag'],
              1,
              HEATMAP_GRADIENT_COLORS[1],
              2.5,
              HEATMAP_GRADIENT_COLORS[2],
              4,
              HEATMAP_GRADIENT_COLORS[3],
              6,
              HEATMAP_GRADIENT_COLORS[4],
            ],
          ],
          'circle-stroke-width': 1,
          'circle-stroke-color': 'rgba(255,255,255,0.8)',
          'circle-opacity': ['interpolate', ['linear'], ['zoom'], 4.5, 0, 6.5, 0.7],
        },
      });
    }

    const handleClick = (event: MapLayerMouseEvent) => {
      const feature = event.features?.[0];
      const pointId = String(feature?.properties?.id ?? '');
      const point = pointById.get(pointId);

      if (point) {
        onPointSelect(point);
      }
    };
    const handleMouseEnter = () => {
      map.getCanvas().style.cursor = 'pointer';
    };
    const handleMouseLeave = () => {
      map.getCanvas().style.cursor = '';
    };

    map.on('click', globalPointLayerId, handleClick);
    map.on('mouseenter', globalPointLayerId, handleMouseEnter);
    map.on('mouseleave', globalPointLayerId, handleMouseLeave);
    map.on('click', pointLayerId, handleClick);
    map.on('mouseenter', pointLayerId, handleMouseEnter);
    map.on('mouseleave', pointLayerId, handleMouseLeave);

    return () => {
      try {
        map.off('click', globalPointLayerId, handleClick);
        map.off('mouseenter', globalPointLayerId, handleMouseEnter);
        map.off('mouseleave', globalPointLayerId, handleMouseLeave);
        map.off('click', pointLayerId, handleClick);
        map.off('mouseenter', pointLayerId, handleMouseEnter);
        map.off('mouseleave', pointLayerId, handleMouseLeave);
        map.getCanvas().style.cursor = '';
        if (map.getLayer(pointLayerId)) map.removeLayer(pointLayerId);
        if (map.getLayer(globalPointLayerId)) map.removeLayer(globalPointLayerId);
        if (map.getLayer(heatLayerId)) map.removeLayer(heatLayerId);
        if (map.getSource(sourceId)) map.removeSource(sourceId);
      } catch {
        // MapLibre may already be tearing down the style.
      }
    };
  }, [map, isLoaded, geoJson, sourceId, heatLayerId, globalPointLayerId, pointLayerId, pointById, onPointSelect]);

  useEffect(() => {
    if (!map || !isLoaded) return;
    const source = map.getSource(sourceId) as GeoJSONSource | undefined;
    source?.setData(geoJson);
  }, [map, isLoaded, sourceId, geoJson]);

  return null;
}

// Anthropic / Claude-themed detail panel: warm cream ground, clay-coral accent,
// serif name, clean key/value rows — shown on the side of the map.
const CLAUDE_CLAY = '#cc785c';

function HeatMapDetailPanel({
  point,
  onClose,
  locked = false,
  outreachEntry,
  canCompose = false,
  onOpenCompose,
}: {
  point: HeatMapPoint;
  onClose: () => void;
  locked?: boolean;
  /** Existing outreach record for this VC (if any) — drives the badge. */
  outreachEntry?: VcOutreachEntry;
  /** True when a logged-in founder is viewing — unlocks the compose flow. */
  canCompose?: boolean;
  onOpenCompose?: () => void;
}) {
  const specRows = [
    ['Signal score', String(point.intensity)],
    ['City', point.city],
    point.partnerName ? ['Partner', point.partnerName] : null,
    point.fundStage ? ['Stage', point.fundStage] : null,
  ].filter(Boolean) as Array<[string, string]>;

  // "Last contacted N days ago" — only shown when the founder has actually
  // sent something. Drafts don't count.
  const lastContactedDaysAgo = (() => {
    const ts = outreachEntry?.sentAt;
    if (!ts) return null;
    const ms = Date.now() - new Date(ts).getTime();
    if (Number.isNaN(ms) || ms < 0) return null;
    return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
  })();

  return (
    <div className="overflow-hidden rounded-[18px] border border-black/10 bg-[#f0eee6] text-[#1f1e1d] shadow-[0_20px_60px_rgba(0,0,0,0.16)]">
      {/* header */}
      <div className="flex items-start justify-between gap-3 border-b border-black/10 px-5 pb-4 pt-5">
        <div className="min-w-0">
          <h3 className="font-serif text-xl font-normal leading-tight tracking-[-0.01em] text-[#1a1a1a]">
            {point.name}
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-full p-1.5 text-black/40 transition-colors hover:bg-black/5 hover:text-black/70"
          aria-label="Close detail panel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div>
        {/* logo */}
        {point.imageUrl && point.imageKind === 'logo' && (
          <div className="flex justify-center border-b border-black/10 py-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-black/10 bg-white">
              <img src={point.imageUrl} alt={`${point.name} logo`} className="h-9 w-9 object-contain" />
            </div>
          </div>
        )}

        {/* key / value rows */}
        <div className="divide-y divide-black/[0.07] px-5">
          {specRows.map(([label, value]) => (
            <div key={label} className="flex items-baseline justify-between gap-3 py-2.5 text-sm">
              <span className="shrink-0 text-black/45">{label}</span>
              <span className="max-w-[62%] truncate text-right font-medium text-[#1a1a1a]">{value}</span>
            </div>
          ))}
        </div>

        {point.label && (
          <div className="max-h-[10rem] overflow-y-auto border-t border-black/10 px-5 py-4">
            <p className="text-sm leading-6 text-black/60">{point.label}</p>
          </div>
        )}

        {point.email &&
          (locked ? (
            <p className="px-5 pt-3 text-sm font-medium text-black/40">Sign in to view email</p>
          ) : (
            <p className="break-all px-5 pt-3 text-sm font-medium" style={{ color: CLAUDE_CLAY }}>
              {point.email}
            </p>
          ))}

        {/* Outreach status badges (founder only). Shows the kanban stage + a
            "last contacted N days ago" counter so the founder doesn't re-spam. */}
        {outreachEntry && (
          <div className="flex flex-wrap items-center gap-1.5 px-5 pt-3">
            <span className="inline-flex items-center gap-1 rounded-full bg-[#42520d] px-2.5 py-1 text-[11px] font-semibold text-white">
              <MailCheck className="h-3 w-3" /> {outreachEntry.stage}
            </span>
            {lastContactedDaysAgo !== null && (
              <span className="inline-flex items-center gap-1 rounded-full border border-black/15 bg-white px-2.5 py-1 text-[11px] font-medium text-black/65">
                <Clock className="h-3 w-3" />
                {lastContactedDaysAgo === 0
                  ? 'Contacted today'
                  : `Last contacted ${lastContactedDaysAgo}d ago`}
              </span>
            )}
          </div>
        )}

        <div className="flex gap-2 px-5 pb-4 pt-3">
          {point.email && locked ? (
            <Link
              to="/login"
              className="flex flex-1 items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: CLAUDE_CLAY }}
            >
              <LocateFixed className="h-3.5 w-3.5" />
              Sign in to email
            </Link>
          ) : point.email && canCompose ? (
            <button
              type="button"
              onClick={onOpenCompose}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: CLAUDE_CLAY }}
            >
              <Send className="h-3.5 w-3.5" />
              Compose email
            </button>
          ) : (
            <a
              href={point.email ? `mailto:${point.email}` : point.websiteUrl || '#'}
              target={point.email ? undefined : '_blank'}
              rel={point.email ? undefined : 'noreferrer'}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: CLAUDE_CLAY }}
            >
              <LocateFixed className="h-3.5 w-3.5" />
              {point.email ? 'Email' : 'Focus'}
            </a>
          )}
          {point.profilePath ? (
            <Link
              to={point.profilePath}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-black/15 text-black/70 transition-colors hover:bg-black/5"
              aria-label={`Open ${point.name}`}
            >
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          ) : point.websiteUrl ? (
            <a
              href={point.websiteUrl}
              target="_blank"
              rel="noreferrer"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-black/15 text-black/70 transition-colors hover:bg-black/5"
              aria-label={`Open ${point.name}`}
            >
              <ArrowUpRight className="h-4 w-4" />
            </a>
          ) : null}
        </div>

        {point.socialLinks && point.socialLinks.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-5 pb-5">
            {point.socialLinks.map((link) => (
              <a
                key={link.url}
                href={link.url}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-black/15 px-3 py-1 text-xs font-medium text-black/60 transition-colors hover:bg-black/5 hover:text-black"
              >
                {link.label}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Founder VC filters ──────────────────────────────────────────────────────
type VcFilters = {
  stages: string[];
  sectors: string[];
  fundTypes: string[];
  contactableOnly: boolean;
  activeOnly: boolean;
};

type FilterOption = { key: string; match: string[] };

const STAGE_OPTIONS: FilterOption[] = [
  { key: 'Pre-Seed', match: ['pre-seed', 'preseed'] },
  { key: 'Seed', match: ['seed'] },
  { key: 'Series A', match: ['series a'] },
  { key: 'Series B+', match: ['series b', 'series c', 'series d'] },
];

const SECTOR_OPTIONS: FilterOption[] = [
  { key: 'AI/ML', match: ['artificial intelligence', 'machine learning', 'ai/ml'] },
  { key: 'FinTech', match: ['fintech'] },
  { key: 'Devtools', match: ['developer tools', 'devtools'] },
  { key: 'SaaS', match: ['saas'] },
  { key: 'Healthcare', match: ['healthcare', 'health', 'biotech', 'medical'] },
  { key: 'Crypto/Web3', match: ['blockchain', 'crypto', 'web3'] },
  { key: 'Consumer', match: ['consumer', 'e-commerce', 'd2c'] },
  { key: 'Climate', match: ['climatetech', 'cleantech', 'climate', 'energy'] },
  { key: 'Enterprise', match: ['enterprise', 'b2b'] },
  { key: 'Data/Infra', match: ['big data', 'analytics', 'infrastructure', 'cloud'] },
];

const FUND_TYPE_OPTIONS: FilterOption[] = [
  { key: 'VC Fund', match: ['venture fund', 'venture capital'] },
  { key: 'Accelerator', match: ['accelerator', 'incubator'] },
  { key: 'Angel', match: ['angel'] },
  { key: 'Micro VC', match: ['micro'] },
  { key: 'Corporate', match: ['corporate'] },
  { key: 'Family Office', match: ['family office'] },
];

const ACTIVE_MIN_INVESTMENTS = 10;

const emptyVcFilters = (): VcFilters => ({
  stages: [],
  sectors: [],
  fundTypes: [],
  contactableOnly: false,
  activeOnly: false,
});

// True if no keys selected (no filter), or the haystack matches any selected option.
const matchesSelection = (haystack: string, options: FilterOption[], selectedKeys: string[]) => {
  if (!selectedKeys.length) return true;
  const lower = haystack.toLowerCase();
  return options
    .filter((option) => selectedKeys.includes(option.key))
    .some((option) => option.match.some((term) => lower.includes(term)));
};

const vcPassesHardFilters = (contact: VCContact, filters: VcFilters): boolean => {
  if (filters.contactableOnly && !(contact.partnerEmail && contact.partnerEmail.trim())) return false;
  if (filters.activeOnly && contact.numberOfInvestments < ACTIVE_MIN_INVESTMENTS) return false;
  if (!matchesSelection(contact.fundStage || '', STAGE_OPTIONS, filters.stages)) return false;
  if (!matchesSelection(contact.fundType || '', FUND_TYPE_OPTIONS, filters.fundTypes)) return false;
  return true;
};

const vcMatchesSectors = (contact: VCContact, sectors: string[]): boolean => {
  if (!sectors.length) return false;
  const lower = (contact.fundFocusSectors || '').toLowerCase();
  return SECTOR_OPTIONS.filter((option) => sectors.includes(option.key)).some((option) =>
    option.match.some((term) => lower.includes(term)),
  );
};

const optionKeysFromText = (text: string, options: FilterOption[]): string[] => {
  const lower = (text || '').toLowerCase();
  return options.filter((option) => option.match.some((term) => lower.includes(term))).map((option) => option.key);
};

export const HeatMap = ({
  includeVCContacts = false,
  vcOnly = false,
  fullBleed = false,
  fillParent = false,
  lockContacts = false,
  founderStage = '',
  founderSectors = '',
  currentUser = null,
  founderName = '',
  founderCompany = '',
  founderTraction = '',
}: HeatMapProps) => {
  const [publishedLaunches, setPublishedLaunches] = useState<ProductLaunch[]>([]);
  const [vcContacts, setVcContacts] = useState<VCContact[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(true);
  const [mode, setMode] = useState<HeatMapMode>('all');
  const [selectedPoint, setSelectedPoint] = useState<HeatMapPoint | null>(null);
  const [infoDismissed, setInfoDismissed] = useState(false);
  const [vcFilters, setVcFilters] = useState<VcFilters>(emptyVcFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [outreachLog, setOutreachLog] = useState<VcOutreachEntry[]>([]);
  const [outreachTemplates, setOutreachTemplates] = useState<VcOutreachTemplate[]>([]);

  // Index by vcContactKey so the detail panel + dialog can answer
  // "last contacted" + "current stage" in O(1). Use a plain object because
  // the `Map` identifier here shadows the JS built-in (the map UI component
  // was imported under the same name).
  const outreachByKey = useMemo(() => {
    const lookup: Record<string, VcOutreachEntry> = {};
    outreachLog.forEach((entry) => {
      lookup[entry.vcContactKey] = entry;
    });
    return lookup;
  }, [outreachLog]);

  const isFounderLoggedIn = Boolean(currentUser && currentUser.role === 'founder');

  const toggleFilterKey = (group: 'stages' | 'sectors' | 'fundTypes', key: string) =>
    setVcFilters((current) => ({
      ...current,
      [group]: current[group].includes(key)
        ? current[group].filter((existing) => existing !== key)
        : [...current[group], key],
    }));

  const matchMyProfile = () => {
    const stages = optionKeysFromText(founderStage, STAGE_OPTIONS);
    const sectors = optionKeysFromText(founderSectors, SECTOR_OPTIONS);
    setVcFilters((current) => ({
      ...current,
      stages: stages.length ? stages : current.stages,
      sectors: sectors.length ? sectors : current.sectors,
    }));
    setFiltersOpen(true);
  };

  const activeFilterCount =
    vcFilters.stages.length +
    vcFilters.sectors.length +
    vcFilters.fundTypes.length +
    (vcFilters.contactableOnly ? 1 : 0) +
    (vcFilters.activeOnly ? 1 : 0);
  const canMatchProfile = Boolean(founderStage.trim() || founderSectors.trim());
  const totalVcContacts = vcContacts.length;

  useEffect(() => {
    let isMounted = true;
    setIsLoadingContacts(true);

    const launchesPromise = loadPublicProductLaunches((cached) => {
      if (isMounted) setPublishedLaunches(cached);
    });

    const contactsPromise = includeVCContacts
      ? loadFounderVCContacts((cached) => {
          if (isMounted) {
            setVcContacts(cached);
            setIsLoadingContacts(false); // seed/stale data is enough to show the map
          }
        })
      : Promise.resolve([]);

    Promise.all([launchesPromise, contactsPromise]).then(([launches, contacts]) => {
      if (isMounted) {
        setPublishedLaunches(launches);
        setVcContacts(contacts);
        setIsLoadingContacts(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [includeVCContacts]);

  // Founder-only: pull this user's outreach log + saved templates so the
  // detail panel can show "Last contacted N days ago" and the compose dialog
  // can offer their saved templates. Non-founders skip the network calls.
  useEffect(() => {
    if (!isFounderLoggedIn || !currentUser) return;
    let cancelled = false;
    Promise.all([loadVcOutreachLog(currentUser), loadOutreachTemplates(currentUser)])
      .then(([log, templates]) => {
        if (cancelled) return;
        setOutreachLog(log);
        setOutreachTemplates(templates);
      })
      .catch(() => {
        if (cancelled) return;
        setOutreachLog([]);
        setOutreachTemplates([]);
      });
    return () => {
      cancelled = true;
    };
  }, [currentUser, isFounderLoggedIn]);

  const heatPoints = useMemo(() => {
    const apparentBuilders: HeatMapPoint[] = publishedLaunches.map((launch, index) => launchToPoint(launch, index));
    const vcContactPoints = vcContacts
      .filter((contact) => vcPassesHardFilters(contact, vcFilters))
      .map((contact, index) => {
        const point = vcContactToPoint(contact, index);
        if (!point) return null;
        // Soft-weight the heat by sector fit: matching VCs glow hotter, the
        // rest cool down (never hidden) so the map reads as a fit map.
        if (vcFilters.sectors.length) {
          point.intensity = vcMatchesSectors(contact, vcFilters.sectors)
            ? Math.min(99, point.intensity + 22)
            : Math.max(28, Math.round(point.intensity * 0.65));
        }
        return point;
      })
      .filter(Boolean) as HeatMapPoint[];

    const points = vcOnly ? vcContactPoints : [...apparentBuilders, ...vcContactPoints];

    return points.map(offsetByKind);
  }, [publishedLaunches, vcContacts, vcOnly, vcFilters]);

  const filteredPoints = useMemo(
    () => heatPoints.filter((point) => mode === 'all' || point.kind === mode.slice(0, -1)),
    [heatPoints, mode],
  );
  const selectedVisiblePoint = selectedPoint && filteredPoints.some((point) => point.id === selectedPoint.id) ? selectedPoint : null;

  // Queue of contactable VCs from the currently visible/filtered set. The
  // compose dialog uses this to let the founder cold-email VC-by-VC without
  // closing + reopening the dialog: send → click Next VC → fresh dialog
  // mounts for the next contactable VC with their saved template pre-filled.
  const composableVcQueue = useMemo(
    () =>
      filteredPoints.filter(
        (point) => point.kind === 'vc' && Boolean(point.email && point.vcContact),
      ),
    [filteredPoints],
  );
  const queueIndex = selectedPoint
    ? composableVcQueue.findIndex((point) => point.id === selectedPoint.id)
    : -1;

  const goToVcAtOffset = (offset: -1 | 1) => {
    if (!composableVcQueue.length) return;
    const start = queueIndex >= 0 ? queueIndex : -1;
    const nextIndex = (start + offset + composableVcQueue.length) % composableVcQueue.length;
    const next = composableVcQueue[nextIndex];
    if (next) {
      setSelectedPoint(next);
      setComposeOpen(true);
    }
  };
  const apparentCount = heatPoints.filter((point) => point.source === 'apparent').length;
  const builderCount = heatPoints.filter((point) => point.kind === 'builder').length;
  const vcCount = heatPoints.filter((point) => point.kind === 'vc').length;
  const vcContactCount = heatPoints.filter((point) => point.source === 'vc_database').length;
  const stats = vcOnly
    ? [
        { value: vcCount, label: 'VCs', icon: Building2 },
        { value: vcContactCount, label: 'contacts', icon: LocateFixed },
      ]
    : [
        { value: builderCount, label: 'builders', icon: Users },
        { value: vcCount, label: 'VCs', icon: Building2 },
        { value: vcContactCount || apparentCount, label: vcContactCount ? 'contacts' : 'on Apparent', icon: LocateFixed },
      ];

  return (
    <main
      className={
        fullBleed
          ? `${fillParent ? 'min-h-0 flex-1' : 'h-screen'} w-full overflow-hidden bg-[#e8e5dc] text-black`
          : 'min-h-screen overflow-x-hidden bg-[#fbfaf7] text-black'
      }
    >
      <section className={fullBleed ? 'h-full w-full' : 'mx-auto max-w-[92rem] px-5 pb-5 pt-5 sm:px-8'}>
        <div className={`relative bg-[#e8e5dc] ${fullBleed ? 'h-full w-full overflow-hidden' : 'h-[calc(100vh-8.5rem)] min-h-[620px] overflow-hidden rounded-[32px] shadow-[0_18px_60px_rgba(0,0,0,0.06)]'}`}>
          <Map
            center={[-74, 38]}
            zoom={2.15}
            projection={{ type: 'globe' }}
            pitch={18}
            minZoom={1.2}
            maxZoom={12}
            theme="light"
          >
            <ApparentHeatmapLayers points={filteredPoints} selectedId={selectedVisiblePoint?.id} onPointSelect={setSelectedPoint} />
          </Map>

          {/* Loading indicator — shown while VC contacts are being fetched */}
          {isLoadingContacts && includeVCContacts && (
            <div className="pointer-events-none absolute bottom-5 left-1/2 z-30 -translate-x-1/2">
              <div className="flex items-center gap-2 rounded-full border border-black/10 bg-white/90 px-3.5 py-2 text-xs font-medium text-black/60 shadow-[0_4px_20px_rgba(0,0,0,0.10)] backdrop-blur">
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-black/20 border-t-black/60" />
                Loading VC data…
              </div>
            </div>
          )}

          {/* Founder VC filters — narrow by stage/type/contactability, heat by sector fit */}
          {vcOnly && (
            <div className="absolute left-1/2 top-4 z-20 flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 flex-col items-center md:top-6">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setFiltersOpen((open) => !open)}
                  className="flex items-center gap-1.5 rounded-full border border-black bg-white/92 px-3 py-1.5 text-xs font-semibold text-black shadow-[0_10px_34px_rgba(0,0,0,0.12)] backdrop-blur transition-colors hover:bg-white"
                >
                  <SlidersHorizontal className="h-3.5 w-3.5 text-[#42520d]" />
                  Filters
                  {activeFilterCount > 0 && (
                    <span className="rounded-full bg-[#42520d] px-1.5 text-[10px] font-bold text-white">{activeFilterCount}</span>
                  )}
                </button>
                {canMatchProfile && (
                  <button
                    type="button"
                    onClick={matchMyProfile}
                    className="rounded-full bg-[#42520d] px-3 py-1.5 text-[11px] font-semibold text-white shadow-[0_10px_34px_rgba(0,0,0,0.12)] transition-opacity hover:opacity-90"
                  >
                    Match my profile
                  </button>
                )}
              </div>

              {filtersOpen && (
                <div className="mt-2 w-full rounded-[16px] bg-white/95 p-3 shadow-[0_14px_44px_rgba(0,0,0,0.16)] backdrop-blur">
                  <div className="space-y-2.5">
                    <div>
                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-black/40">Stage</p>
                      <div className="flex flex-wrap gap-1.5">
                        {STAGE_OPTIONS.map((option) => {
                          const active = vcFilters.stages.includes(option.key);
                          return (
                            <button
                              key={option.key}
                              type="button"
                              onClick={() => toggleFilterKey('stages', option.key)}
                              className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${active ? 'bg-[#42520d] text-white' : 'bg-[#f4f1eb] text-black/60 hover:bg-[#dcefc7]'}`}
                            >
                              {option.key}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-black/40">
                        Sector <span className="font-normal normal-case tracking-normal text-black/35">· heats matches</span>
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {SECTOR_OPTIONS.map((option) => {
                          const active = vcFilters.sectors.includes(option.key);
                          return (
                            <button
                              key={option.key}
                              type="button"
                              onClick={() => toggleFilterKey('sectors', option.key)}
                              className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${active ? 'bg-[#42520d] text-white' : 'bg-[#f4f1eb] text-black/60 hover:bg-[#dcefc7]'}`}
                            >
                              {option.key}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-black/40">Type</p>
                      <div className="flex flex-wrap gap-1.5">
                        {FUND_TYPE_OPTIONS.map((option) => {
                          const active = vcFilters.fundTypes.includes(option.key);
                          return (
                            <button
                              key={option.key}
                              type="button"
                              onClick={() => toggleFilterKey('fundTypes', option.key)}
                              className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${active ? 'bg-[#42520d] text-white' : 'bg-[#f4f1eb] text-black/60 hover:bg-[#dcefc7]'}`}
                            >
                              {option.key}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => setVcFilters((current) => ({ ...current, contactableOnly: !current.contactableOnly }))}
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${vcFilters.contactableOnly ? 'bg-[#42520d] text-white' : 'bg-[#f4f1eb] text-black/60 hover:bg-[#dcefc7]'}`}
                      >
                        Has email
                      </button>
                      <button
                        type="button"
                        onClick={() => setVcFilters((current) => ({ ...current, activeOnly: !current.activeOnly }))}
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${vcFilters.activeOnly ? 'bg-[#42520d] text-white' : 'bg-[#f4f1eb] text-black/60 hover:bg-[#dcefc7]'}`}
                      >
                        Active only
                      </button>
                    </div>
                  </div>

                  <div className="mt-2.5 flex items-center justify-between border-t border-black/10 pt-2">
                    <p className="text-[10px] text-black/45">{vcContactCount} of {totalVcContacts} VCs match</p>
                    {activeFilterCount > 0 && (
                      <button
                        type="button"
                        onClick={() => setVcFilters(emptyVcFilters())}
                        className="text-[10px] font-semibold text-[#42520d] hover:underline"
                      >
                        Reset all
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="absolute left-4 top-4 z-10 flex w-[calc(100%-2rem)] max-w-[19rem] flex-col items-start gap-3 md:left-6 md:top-6">
          <Card className="w-[13.5rem] max-w-full border-0 bg-white/90 shadow-[0_10px_34px_rgba(0,0,0,0.12)] backdrop-blur">
            <CardHeader className="p-3 pb-2">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-xs font-semibold tracking-[-0.01em]">
                  {vcOnly ? 'VCs by density' : 'Builders & VCs by density'}
                </CardTitle>
                <Flame className="h-3.5 w-3.5 shrink-0 text-[#42520d]" />
              </div>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="grid grid-cols-5 gap-1">
                {HEATMAP_GRADIENT_COLORS.map((color) => (
                  <span key={color} className="h-1.5 rounded-full" style={{ backgroundColor: color }} />
                ))}
              </div>
              <div className="flex items-center justify-between pt-1.5 text-[10px] text-black/50">
                <span>Low</span>
                <span>High</span>
              </div>

              <div className={`mt-3 grid gap-1.5 text-center ${vcOnly ? 'grid-cols-2' : 'grid-cols-3'}`}>
                {stats.map(({ value, label, icon: Icon }) => (
                  <div key={label} className="rounded-[10px] bg-[#fbfaf7] px-1.5 py-1.5">
                    <Icon className="mx-auto mb-1 h-3 w-3 text-[#42520d]" />
                    <p className="text-xs font-semibold">{value}</p>
                    <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-black/40">{label}</p>
                  </div>
                ))}
              </div>

              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {(vcOnly
                  ? [['vcs', 'VCs']]
                  : [
                      ['all', 'All'],
                      ['builders', 'Builders'],
                      ['vcs', 'VCs'],
                    ]
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setMode(value as HeatMapMode)}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                      mode === value ? 'bg-[#42520d] text-white' : 'bg-[#fbfaf7] text-black/60 hover:bg-[#dcefc7]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {selectedVisiblePoint && (
            <div className="w-full">
              <HeatMapDetailPanel
                point={selectedVisiblePoint}
                onClose={() => setSelectedPoint(null)}
                locked={lockContacts}
                outreachEntry={
                  selectedVisiblePoint.vcContact
                    ? outreachByKey[vcContactKey(selectedVisiblePoint.vcContact)]
                    : undefined
                }
                canCompose={isFounderLoggedIn && Boolean(selectedVisiblePoint.email && selectedVisiblePoint.vcContact)}
                onOpenCompose={() => setComposeOpen(true)}
              />
            </div>
          )}
          </div>

          <div className="absolute bottom-4 left-4 right-4 z-10 grid gap-2 md:bottom-6 md:left-6 md:right-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            {!infoDismissed ? (
              <div className="relative max-w-md rounded-[14px] bg-white/90 p-3 pr-8 shadow-[0_10px_34px_rgba(0,0,0,0.1)] backdrop-blur">
                <div className="flex items-start gap-2">
                  <Globe2 className="mt-0.5 h-4 w-4 shrink-0 text-[#42520d]" />
                  <div>
                    <h1 className="text-sm font-semibold tracking-[-0.01em]">Heat Map</h1>
                    <p className="mt-1 text-[11px] leading-4 text-black/60">
                      {vcOnly
                        ? 'Live density of cold-pitch-friendly VC contacts and hubs. Zoom in for firm points.'
                        : 'Live density of Apparent builders, launches, VC hubs, and ecosystem signal. Zoom in for city points.'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setInfoDismissed(true)}
                  className="absolute right-2 top-2 rounded-full p-1 text-black/30 transition-colors hover:bg-black/5 hover:text-black/60"
                  aria-label="Dismiss Heat Map info"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <div />
            )}

            <div className="rounded-[14px] bg-[#1a1a1a] p-3 text-white shadow-[0_10px_34px_rgba(0,0,0,0.18)]">
              <div className="flex items-center gap-2">
                <Layers3 className="h-4 w-4 shrink-0 text-[#dcefc7]" />
                <div>
                  <p className="text-xs font-semibold">{filteredPoints.length} visible signals</p>
                  <p className="mt-0.5 text-[10px] text-white/55">Weighted density, not raw count.</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {composeOpen && currentUser && selectedPoint?.vcContact && selectedPoint.email && (
        <ComposeDialog
          // key forces a fresh mount per VC so the dialog's internal subject /
          // body state re-hydrates from the user's saved template against the
          // new VC's variables when they hit Next.
          key={selectedPoint.id}
          user={currentUser}
          vc={selectedPoint.vcContact}
          templates={outreachTemplates}
          existingEntry={outreachByKey[vcContactKey(selectedPoint.vcContact)]}
          founderName={founderName || currentUser.username || currentUser.email.split('@')[0]}
          founderCompany={founderCompany}
          founderTraction={founderTraction}
          queuePosition={
            queueIndex >= 0
              ? { current: queueIndex + 1, total: composableVcQueue.length }
              : undefined
          }
          onClose={() => setComposeOpen(false)}
          onNext={composableVcQueue.length > 1 ? () => goToVcAtOffset(1) : undefined}
          onPrev={composableVcQueue.length > 1 ? () => goToVcAtOffset(-1) : undefined}
          onSaved={(entry) => {
            setOutreachLog((current) => [
              entry,
              ...current.filter((row) => row.vcContactKey !== entry.vcContactKey),
            ]);
          }}
          onTemplatesChange={setOutreachTemplates}
        />
      )}
    </main>
  );
};

// ── Compose dialog ──────────────────────────────────────────────────────────
// Pre-baked subjects + saved templates + variable substitution. Send opens
// the system mail handler (no API). "Mark as sent" logs to vc_outreach_log
// so the kanban and last-contacted counter pick it up.

const OUTREACH_STAGE_OPTIONS: VcOutreachStage[] = ['Drafted', 'Sent', 'Replied', 'Meeting', 'Passed'];

function ComposeDialog({
  user,
  vc,
  templates,
  existingEntry,
  founderName,
  founderCompany,
  founderTraction,
  queuePosition,
  onClose,
  onSaved,
  onNext,
  onPrev,
  onTemplatesChange,
}: {
  user: AppUser;
  vc: VCContact;
  templates: VcOutreachTemplate[];
  existingEntry?: VcOutreachEntry;
  founderName: string;
  founderCompany: string;
  founderTraction: string;
  /** Position of this VC in the contactable queue ("3 of 12"). */
  queuePosition?: { current: number; total: number };
  onClose: () => void;
  onSaved: (entry: VcOutreachEntry) => void;
  /** Advance to the next contactable VC in the heat map's current filter. */
  onNext?: () => void;
  /** Step back to the previous contactable VC. */
  onPrev?: () => void;
  /** Bubble template list mutations back up so the parent can refresh. */
  onTemplatesChange?: (templates: VcOutreachTemplate[]) => void;
}) {
  // Variable substitution applied to whatever the user types or pastes — we
  // never auto-fill the editor, but we still resolve {{vars}} at send time
  // so saved templates stay portable across VCs.
  const vars = useMemo<Record<string, string>>(
    () => ({
      founder_name: founderName,
      my_company: founderCompany || 'my product',
      vc_partner: (vc.partnerName || '').split(/\s+/)[0] || 'there',
      vc_firm: vc.investorName || 'your firm',
      traction: founderTraction || '',
    }),
    [founderName, founderCompany, founderTraction, vc.investorName, vc.partnerName],
  );

  const hasInspirationExamples = OUTREACH_INSPIRATION_EXAMPLES.length > 0;

  // Hydration order (no bundled template fallback anymore):
  // 1. Prior draft for this VC → resume where the founder left off
  // 2. User's saved default template → their own words, applied to this VC
  // 3. Empty → founder writes from scratch, with inspiration examples below
  const defaultTpl = templates.find((tpl) => tpl.isDefault) || templates[0];
  const hasSavedTemplate = Boolean(defaultTpl);
  const initialSubject = existingEntry?.subject
    ? existingEntry.subject
    : defaultTpl
      ? renderOutreachTemplate(defaultTpl.subject, vars)
      : '';
  const initialBody = existingEntry?.body
    ? existingEntry.body
    : defaultTpl
      ? renderOutreachTemplate(defaultTpl.body, vars)
      : '';

  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState(initialBody);
  const [saving, setSaving] = useState<'idle' | 'sent' | 'saving' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [copied, setCopied] = useState(false);
  // Inspiration panel is collapsed on subsequent opens (when the user already
  // has a saved template) and expanded on first use so they see the examples.
  const [inspirationOpen, setInspirationOpen] = useState(!hasSavedTemplate && hasInspirationExamples);
  const [activeExampleId, setActiveExampleId] = useState<string>(
    OUTREACH_INSPIRATION_EXAMPLES[0]?.id ?? '',
  );
  const [savingTemplate, setSavingTemplate] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const activeExample = OUTREACH_INSPIRATION_EXAMPLES.find((ex) => ex.id === activeExampleId)
    ?? OUTREACH_INSPIRATION_EXAMPLES[0];

  // Quick-swap a pre-baked subject line into the input. Never overwrites
  // the body so the founder doesn't lose what they typed.
  const applySubject = (template: string) => {
    setSubject(renderOutreachTemplate(template, vars));
  };

  // Apply a saved user template. Body + subject both swap.
  const applyTemplate = (template: { subject: string; body: string }) => {
    setSubject(renderOutreachTemplate(template.subject, vars));
    setBody(renderOutreachTemplate(template.body, vars));
  };

  // Save the current subject/body as the user's default template so the next
  // compose pre-fills with it. Stored verbatim — variables stay as {{tokens}}
  // so they re-substitute per VC.
  const handleSaveAsDefault = async () => {
    if (!subject.trim() && !body.trim()) {
      setErrorMessage('Write a subject or body first before saving as default.');
      return;
    }
    setSavingTemplate('saving');
    setErrorMessage('');
    try {
      const saved = await saveOutreachTemplate(user, {
        id: defaultTpl?.id,
        name: defaultTpl?.name || 'My cold outreach',
        subject,
        body,
        isDefault: true,
      });
      // Replace the existing default in-place; everything else stays.
      const nextTemplates = [
        saved,
        ...templates.filter((tpl) => tpl.id !== saved.id).map((tpl) => (tpl.isDefault ? { ...tpl, isDefault: false } : tpl)),
      ];
      onTemplatesChange?.(nextTemplates);
      setSavingTemplate('saved');
      window.setTimeout(() => setSavingTemplate('idle'), 1600);
    } catch (err) {
      setSavingTemplate('error');
      setErrorMessage(err instanceof Error ? err.message : 'Unable to save template.');
    }
  };

  // Save → log row + bump kanban stage. Caller passes the stage they want.
  const persist = async (stage: VcOutreachStage) => {
    setSaving('saving');
    setErrorMessage('');
    try {
      const entry = await saveVcOutreach(user, {
        vcContactKey: vcContactKey(vc),
        toEmail: vc.partnerEmail,
        toName: vc.partnerName,
        investorName: vc.investorName,
        partnerName: vc.partnerName,
        subject,
        body,
        stage,
      });
      onSaved(entry);
      setSaving('sent');
    } catch (err) {
      setSaving('error');
      setErrorMessage(err instanceof Error ? err.message : 'Unable to save outreach.');
    }
  };

  const mailtoHref = `mailto:${vc.partnerEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  const canSend = Boolean(subject.trim() || body.trim());
  // Track whether the user has touched the editor on this VC. Used so the
  // Next-VC handler doesn't blast a Drafted row to the log for VCs the
  // founder skipped through without writing anything.
  const isDirty =
    Boolean((subject.trim() || body.trim())) &&
    (subject !== initialSubject || body !== initialBody);

  const handleOpenInMail = () => {
    if (!canSend) return;
    // Persist as Drafted (or keep Sent if already sent) before the mailto
    // handler steals focus, so the kanban reflects the founder's intent.
    if (!existingEntry || existingEntry.stage === 'Drafted') {
      void persist('Drafted');
    }
    window.location.href = mailtoHref;
  };

  const handleMarkSent = () => {
    void persist('Sent');
  };

  // Save-and-advance helpers used by the Next/Prev buttons. Persist as
  // Drafted only if the founder actually typed something on this VC so we
  // don't pollute the kanban with empty drafts from a skim-through.
  const handleAdvance = (direction: -1 | 1) => async () => {
    if (isDirty && (!existingEntry || existingEntry.stage === 'Drafted')) {
      try {
        await persist('Drafted');
      } catch {
        /* non-fatal — advance anyway */
      }
    }
    if (direction === 1 && onNext) onNext();
    else if (direction === -1 && onPrev) onPrev();
  };

  const handleCopyBody = async () => {
    try {
      await navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — non-fatal */
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-3 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="relative w-full max-w-2xl overflow-hidden rounded-[20px] bg-white shadow-[0_24px_60px_rgba(0,0,0,0.32)]"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Compose email to ${vc.investorName}`}
      >
        <div className="flex items-start justify-between gap-3 border-b border-black/10 px-5 py-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#42520d]">
                Compose cold email
              </p>
              {queuePosition && queuePosition.total > 1 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#fbfaf7] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-black/55">
                  VC {queuePosition.current} of {queuePosition.total}
                </span>
              )}
            </div>
            <h2 className="mt-1 text-lg font-semibold tracking-[-0.01em]">
              {vc.investorName}
            </h2>
            <p className="mt-0.5 truncate text-xs text-black/55">
              To: {vc.partnerName ? `${vc.partnerName} · ` : ''}
              <span className="font-mono">{vc.partnerEmail}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close compose dialog"
            className="shrink-0 rounded-full p-1.5 text-black/40 transition-colors hover:bg-black/5 hover:text-black/70"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">
          {/* First-time-use prompt: the founder hasn't saved a default template
              yet, so we surface the inspiration examples and tell them to
              write their own voice in. We do NOT pre-fill the editor. */}
          {!hasSavedTemplate && !existingEntry && (
            <div className="mb-4 rounded-[14px] border border-[#42520d]/20 bg-[#dcefc7]/40 px-4 py-3">
              <p className="text-xs font-semibold text-[#42520d]">
                Write your own outreach — the way you'd actually say it.
              </p>
              <p className="mt-1 text-[11px] leading-5 text-black/60">
                Use the subject patterns if helpful, then write the body from scratch. Once you're
                happy, hit "Save as my default" so future composes start from your template.
              </p>
            </div>
          )}

          {/* Saved templates — only shown if the user actually has them. */}
          {templates.length > 0 && (
            <div className="mb-4">
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-black/45">
                Your templates
              </p>
              <div className="flex flex-wrap gap-1.5">
                {templates.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => applyTemplate(tpl)}
                    className="rounded-full border border-black/10 bg-white px-2.5 py-1 text-[11px] font-medium text-black/70 transition-colors hover:bg-[#fbfaf7]"
                  >
                    {tpl.name}
                    {tpl.isDefault ? ' · default' : ''}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Pre-baked subject patterns — apply with one click, never auto-applied. */}
          <div className="mb-4">
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-black/45">
              Subject patterns (click to apply)
            </p>
            <div className="flex flex-wrap gap-1.5">
              {PREBAKED_SUBJECT_LINES.map((line) => (
                <button
                  key={line}
                  type="button"
                  onClick={() => applySubject(line)}
                  className="rounded-full border border-black/10 bg-[#fbfaf7] px-2.5 py-1 text-[11px] font-medium text-black/65 transition-colors hover:bg-[#dcefc7] hover:text-black"
                >
                  {renderOutreachTemplate(line, vars)}
                </button>
              ))}
            </div>
          </div>

          <label className="mb-3 block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-black/45">
              Subject
            </span>
            <input
              type="text"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              className="w-full rounded-[12px] border border-black/10 bg-white px-3 py-2.5 text-sm text-black outline-none focus:border-[#42520d]"
              placeholder={hasSavedTemplate ? 'Edit or write a new subject…' : 'Write your subject — short and specific…'}
            />
          </label>

          <label className="mb-4 block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-black/45">
              Body
            </span>
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={12}
              className="w-full resize-y rounded-[12px] border border-black/10 bg-white px-3 py-2.5 text-sm leading-6 text-black outline-none focus:border-[#42520d]"
              placeholder={hasSavedTemplate
                ? 'Edit or write the body…'
                : 'Write the body in your own voice.'}
            />
          </label>

          {hasInspirationExamples && (
          <div className="mb-4 rounded-[14px] border border-black/10 bg-[#fbfaf7]">
            <button
              type="button"
              onClick={() => setInspirationOpen((prev) => !prev)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
              aria-expanded={inspirationOpen}
            >
              <span className="inline-flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-[#42520d]" />
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-black/70">
                  Inspiration — real cold emails
                </span>
              </span>
              <span className="text-[11px] text-black/45">{inspirationOpen ? 'Hide' : 'Show'}</span>
            </button>
            {inspirationOpen && activeExample && (
              <div className="border-t border-black/10 px-4 py-3">
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {OUTREACH_INSPIRATION_EXAMPLES.map((ex) => (
                    <button
                      key={ex.id}
                      type="button"
                      onClick={() => setActiveExampleId(ex.id)}
                      className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                        ex.id === activeExample.id
                          ? 'border-[#42520d] bg-[#42520d] text-white'
                          : 'border-black/10 bg-white text-black/65 hover:bg-[#dcefc7]'
                      }`}
                    >
                      {ex.label}
                    </button>
                  ))}
                </div>
                <p className="mb-2 text-[11px] italic text-black/55">{activeExample.note}</p>
                <div className="rounded-[10px] bg-white p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-black/40">
                    Subject
                  </p>
                  <p className="mt-1 text-sm font-medium text-black/85">{activeExample.subject}</p>
                  <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-black/40">
                    Body
                  </p>
                  <pre className="mt-1 whitespace-pre-wrap font-sans text-sm leading-6 text-black/75">
                    {activeExample.body}
                  </pre>
                </div>
                <p className="mt-2 text-[11px] text-black/45">
                  These are real-world patterns — read for shape and tone, then write your own. Don't copy verbatim. Investors recognize template emails instantly.
                </p>
              </div>
            )}
          </div>
          )}

          <p className="text-[11px] leading-5 text-black/45">
            You can use <code>{'{{founder_name}}'}</code>, <code>{'{{vc_partner}}'}</code>,
            <code>{'{{vc_firm}}'}</code>, <code>{'{{my_company}}'}</code>, <code>{'{{traction}}'}</code>
            in your saved default template — they fill in automatically per VC. Replies land in your own inbox.
          </p>

          {errorMessage && (
            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{errorMessage}</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-black/10 bg-[#fbfaf7] px-5 py-3">
          <button
            type="button"
            onClick={handleOpenInMail}
            disabled={!canSend}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-[#42520d] px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
          >
            <Send className="h-3.5 w-3.5" /> Open in mail app
          </button>
          <button
            type="button"
            onClick={handleSaveAsDefault}
            disabled={savingTemplate === 'saving' || !canSend}
            className="inline-flex items-center gap-1.5 rounded-full border border-black/15 bg-white px-3 py-2 text-xs font-semibold text-black/70 transition-colors hover:bg-[#fbfaf7] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Sparkles className="h-3.5 w-3.5 text-[#42520d]" />
            {savingTemplate === 'saving'
              ? 'Saving…'
              : savingTemplate === 'saved'
                ? 'Saved as default'
                : hasSavedTemplate
                  ? 'Update default'
                  : 'Save as my default'}
          </button>
          <button
            type="button"
            onClick={handleCopyBody}
            className="inline-flex items-center gap-1.5 rounded-full border border-black/15 bg-white px-3 py-2 text-xs font-semibold text-black/70 transition-colors hover:bg-[#fbfaf7]"
          >
            <Copy className="h-3.5 w-3.5" /> {copied ? 'Copied' : 'Copy'}
          </button>
          <select
            value={existingEntry?.stage ?? 'Drafted'}
            onChange={(event) => persist(event.target.value as VcOutreachStage)}
            className="rounded-full border border-black/15 bg-white px-3 py-2 text-xs font-semibold text-black/70 outline-none focus:border-[#42520d]"
            aria-label="Outreach stage"
          >
            {OUTREACH_STAGE_OPTIONS.map((stage) => (
              <option key={stage} value={stage}>{stage}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleMarkSent}
            disabled={saving === 'saving' || !canSend}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#42520d] bg-white px-3 py-2 text-xs font-semibold text-[#42520d] transition-colors hover:bg-[#dcefc7] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving === 'sent' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <MailCheck className="h-3.5 w-3.5" />}
            {saving === 'saving' ? 'Saving…' : 'Mark as sent'}
          </button>

          {(onPrev || onNext) && (
            <div className="ml-auto flex items-center gap-1">
              {onPrev && (
                <button
                  type="button"
                  onClick={handleAdvance(-1)}
                  className="inline-flex items-center gap-1 rounded-full border border-black/15 bg-white px-2.5 py-2 text-xs font-semibold text-black/65 transition-colors hover:bg-[#fbfaf7]"
                  aria-label="Previous VC"
                  title="Previous VC in the visible list"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Prev
                </button>
              )}
              {onNext && (
                <button
                  type="button"
                  onClick={handleAdvance(1)}
                  className="inline-flex items-center gap-1 rounded-full bg-black px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-black/85"
                  aria-label="Next VC"
                  title="Save current as draft (if edited) and load the next VC"
                >
                  Next VC
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
