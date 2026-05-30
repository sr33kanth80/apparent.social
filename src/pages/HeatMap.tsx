import { useEffect, useId, useMemo, useState } from 'react';
import { ArrowUpRight, Building2, Flame, Globe2, Layers3, LocateFixed, SlidersHorizontal, Users, X } from 'lucide-react';
import type { GeoJSONSource, MapLayerMouseEvent } from 'maplibre-gl';
import { Link } from 'react-router-dom';
import { Map, useMap } from '@/components/ui/map';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cityGeoCoordinates, seedBuilderNodes } from '@/lib/app-defaults';
import { loadFounderVCContacts, loadPublicProductLaunches } from '@/lib/dashboard-service';
import type { ProductLaunch, VCContact } from '@/lib/apparent-types';

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
};

interface HeatMapProps {
  includeVCContacts?: boolean;
  vcOnly?: boolean;
  /** Fill the available space edge-to-edge (no max-width section or rounded card). */
  fullBleed?: boolean;
  /** With fullBleed: fill the flex parent (flex-1) instead of forcing h-screen.
      Used on the public page so the map fits below the fixed navbar. */
  fillParent?: boolean;
  /** Founder's own stage/sectors — powers the "Match my profile" shortcut. */
  founderStage?: string;
  founderSectors?: string;
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

const ecosystemPoints: HeatMapPoint[] = [
  { id: 'eco-builder-sf', name: 'SF builder market', kind: 'builder', source: 'ecosystem', city: 'San Francisco', ...cityGeoCoordinates['San Francisco'], intensity: 94, label: 'AI, devtools, infra', imageUrl: cityImageByName['San Francisco'] },
  { id: 'eco-vc-sf', name: 'SF venture density', kind: 'vc', source: 'ecosystem', city: 'San Francisco', ...cityGeoCoordinates['San Francisco'], intensity: 96, label: 'Seed to growth capital', imageUrl: cityImageByName['San Francisco'] },
  { id: 'eco-builder-ny', name: 'NY builder market', kind: 'builder', source: 'ecosystem', city: 'New York', ...cityGeoCoordinates['New York'], intensity: 78, label: 'Fintech, SaaS, AI apps', imageUrl: cityImageByName['New York'] },
  { id: 'eco-vc-ny', name: 'NY venture density', kind: 'vc', source: 'ecosystem', city: 'New York', ...cityGeoCoordinates['New York'], intensity: 82, label: 'Fintech and enterprise capital', imageUrl: cityImageByName['New York'] },
  { id: 'eco-builder-austin', name: 'Austin builder market', kind: 'builder', source: 'ecosystem', city: 'Austin', ...cityGeoCoordinates.Austin, intensity: 58, label: 'Workflow and infra builders', imageUrl: cityImageByName.Austin },
  { id: 'eco-vc-boston', name: 'Boston venture density', kind: 'vc', source: 'ecosystem', city: 'Boston', ...cityGeoCoordinates.Boston, intensity: 63, label: 'Deep tech and AI capital', imageUrl: cityImageByName.Boston },
  { id: 'eco-builder-london', name: 'London builder market', kind: 'builder', source: 'ecosystem', city: 'London', ...cityGeoCoordinates.London, intensity: 66, label: 'AI, fintech, creator tools', imageUrl: cityImageByName.London },
  { id: 'eco-vc-london', name: 'London venture density', kind: 'vc', source: 'ecosystem', city: 'London', ...cityGeoCoordinates.London, intensity: 68, label: 'European venture hub', imageUrl: cityImageByName.London },
  { id: 'eco-builder-paris', name: 'Paris builder market', kind: 'builder', source: 'ecosystem', city: 'Paris', ...cityGeoCoordinates.Paris, intensity: 55, label: 'AI models and infra', imageUrl: cityImageByName.Paris },
  { id: 'eco-vc-berlin', name: 'Berlin venture density', kind: 'vc', source: 'ecosystem', city: 'Berlin', ...cityGeoCoordinates.Berlin, intensity: 52, label: 'European seed capital', imageUrl: cityImageByName.Berlin },
  { id: 'eco-builder-bengaluru', name: 'Bengaluru builder market', kind: 'builder', source: 'ecosystem', city: 'Bengaluru', ...cityGeoCoordinates.Bengaluru, intensity: 74, label: 'Developer tools and AI apps', imageUrl: cityImageByName.Bengaluru },
  { id: 'eco-vc-singapore', name: 'Singapore venture density', kind: 'vc', source: 'ecosystem', city: 'Singapore', ...cityGeoCoordinates.Singapore, intensity: 64, label: 'APAC venture hub', imageUrl: cityImageByName.Singapore },
];

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

    map.on('click', pointLayerId, handleClick);
    map.on('mouseenter', pointLayerId, handleMouseEnter);
    map.on('mouseleave', pointLayerId, handleMouseLeave);

    return () => {
      try {
        map.off('click', pointLayerId, handleClick);
        map.off('mouseenter', pointLayerId, handleMouseEnter);
        map.off('mouseleave', pointLayerId, handleMouseLeave);
        map.getCanvas().style.cursor = '';
        if (map.getLayer(pointLayerId)) map.removeLayer(pointLayerId);
        if (map.getLayer(heatLayerId)) map.removeLayer(heatLayerId);
        if (map.getSource(sourceId)) map.removeSource(sourceId);
      } catch {
        // MapLibre may already be tearing down the style.
      }
    };
  }, [map, isLoaded, geoJson, sourceId, heatLayerId, pointLayerId, pointById, onPointSelect]);

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

function HeatMapDetailPanel({ point, onClose }: { point: HeatMapPoint; onClose: () => void }) {
  const sourceLabel =
    point.source === 'vc_database'
      ? 'Cold-pitch VC contact'
      : point.source === 'apparent'
        ? 'On Apparent'
        : 'Ecosystem signal';
  const kindLabel = point.kind === 'vc' ? 'VC density' : 'Builder density';

  const specRows = [
    ['Signal score', String(point.intensity)],
    ['City', point.city],
    point.partnerName ? ['Partner', point.partnerName] : null,
    point.fundStage ? ['Stage', point.fundStage] : null,
  ].filter(Boolean) as Array<[string, string]>;

  return (
    <div className="overflow-hidden rounded-[18px] border border-black/10 bg-[#f0eee6] text-[#1f1e1d] shadow-[0_20px_60px_rgba(0,0,0,0.16)]">
      {/* header */}
      <div className="flex items-start justify-between gap-3 border-b border-black/10 px-5 pb-4 pt-5">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: CLAUDE_CLAY }}>
            {sourceLabel} · {kindLabel}
          </p>
          <h3 className="mt-1.5 font-serif text-xl font-normal leading-tight tracking-[-0.01em] text-[#1a1a1a]">
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

        {point.email && (
          <p className="break-all px-5 pt-3 text-sm font-medium" style={{ color: CLAUDE_CLAY }}>
            {point.email}
          </p>
        )}

        <div className="flex gap-2 px-5 pb-4 pt-3">
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
  founderStage = '',
  founderSectors = '',
}: HeatMapProps) => {
  const [publishedLaunches, setPublishedLaunches] = useState<ProductLaunch[]>([]);
  const [vcContacts, setVcContacts] = useState<VCContact[]>([]);
  const [mode, setMode] = useState<HeatMapMode>('all');
  const [selectedPoint, setSelectedPoint] = useState<HeatMapPoint | null>(null);
  const [infoDismissed, setInfoDismissed] = useState(false);
  const [vcFilters, setVcFilters] = useState<VcFilters>(emptyVcFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);

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

    Promise.all([
      loadPublicProductLaunches(),
      includeVCContacts ? loadFounderVCContacts() : Promise.resolve([]),
    ]).then(([launches, contacts]) => {
      if (isMounted) {
        setPublishedLaunches(launches);
        setVcContacts(contacts);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [includeVCContacts]);

  const heatPoints = useMemo(() => {
    const apparentBuilders: HeatMapPoint[] = [
      ...seedBuilderNodes.map((builder) => ({
        id: `apparent-builder-${builder.id}`,
        name: builder.company,
        kind: 'builder' as const,
        source: 'apparent' as const,
        city: builder.location,
        latitude: builder.latitude,
        longitude: builder.longitude,
        intensity: builder.fitScore,
        label: builder.category,
        profilePath: builder.profileUrl,
        imageUrl: cityImageByName[builder.location] || cityImageByName.Remote,
      })),
      ...publishedLaunches.map((launch, index) => launchToPoint(launch, index)),
    ];
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

    const ecosystemVCPoints = ecosystemPoints.filter((point) => point.kind === 'vc');
    const points = vcOnly ? [...vcContactPoints, ...ecosystemVCPoints] : [...apparentBuilders, ...vcContactPoints, ...ecosystemPoints];

    return points.map(offsetByKind);
  }, [publishedLaunches, vcContacts, vcOnly, vcFilters]);

  const filteredPoints = useMemo(
    () => heatPoints.filter((point) => mode === 'all' || point.kind === mode.slice(0, -1)),
    [heatPoints, mode],
  );
  const selectedVisiblePoint = selectedPoint && filteredPoints.some((point) => point.id === selectedPoint.id) ? selectedPoint : null;
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
              <HeatMapDetailPanel point={selectedVisiblePoint} onClose={() => setSelectedPoint(null)} />
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
    </main>
  );
};
