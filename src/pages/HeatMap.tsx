import { useEffect, useId, useMemo, useState } from 'react';
import { ArrowUpRight, Building2, Flame, Globe2, Layers3, LocateFixed, Users, X } from 'lucide-react';
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

const buildFeatureCollection = (points: HeatMapPoint[]) => ({
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
    },
    geometry: {
      type: 'Point' as const,
      coordinates: [point.longitude, point.latitude],
    },
  })),
});

function ApparentHeatmapLayers({
  points,
  onPointSelect,
}: {
  points: HeatMapPoint[];
  onPointSelect: (point: HeatMapPoint) => void;
}) {
  const { map, isLoaded } = useMap();
  const id = useId().replace(/:/g, '');
  const sourceId = `apparent-heatmap-source-${id}`;
  const heatLayerId = `apparent-heatmap-layer-${id}`;
  const pointLayerId = `apparent-heatmap-point-layer-${id}`;
  const geoJson = useMemo(() => buildFeatureCollection(points), [points]);
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

// Blueprint-style detail panel: a drafting-sheet aesthetic (blueprint blue,
// grid lines, corner ticks, mono labels) shown on the side of the map.
const BLUEPRINT_LINE = 'rgba(142,197,255,0.25)';

function HeatMapDetailPanel({ point, onClose }: { point: HeatMapPoint; onClose: () => void }) {
  const sourceLabel =
    point.source === 'vc_database'
      ? 'Cold-pitch VC contact'
      : point.source === 'apparent'
        ? 'On Apparent'
        : 'Ecosystem signal';
  const kindLabel = point.kind === 'vc' ? 'VC density' : 'Builder density';

  const specRows = [
    ['Signal', String(point.intensity)],
    ['City', point.city],
    point.partnerName ? ['Partner', point.partnerName] : null,
    point.fundStage ? ['Stage', point.fundStage] : null,
  ].filter(Boolean) as Array<[string, string]>;

  const corner = 'pointer-events-none absolute h-2.5 w-2.5 border-[#8ec5ff]/60';

  return (
    <div
      className="relative overflow-hidden rounded-[12px] border border-[#8ec5ff]/40 text-[#dbeafe] shadow-[0_20px_60px_rgba(2,12,30,0.55)] backdrop-blur-sm"
      style={{
        backgroundColor: 'rgba(8,29,58,0.94)',
        backgroundImage:
          'linear-gradient(rgba(142,197,255,0.10) 1px, transparent 1px), linear-gradient(90deg, rgba(142,197,255,0.10) 1px, transparent 1px)',
        backgroundSize: '18px 18px',
      }}
    >
      {/* corner ticks */}
      <span className={`${corner} left-1.5 top-1.5 border-l border-t`} />
      <span className={`${corner} right-1.5 top-1.5 border-r border-t`} />
      <span className={`${corner} bottom-1.5 left-1.5 border-b border-l`} />
      <span className={`${corner} bottom-1.5 right-1.5 border-b border-r`} />

      {/* header */}
      <div className="flex items-start justify-between gap-2 px-4 pb-3 pt-4" style={{ borderBottom: `1px solid ${BLUEPRINT_LINE}` }}>
        <div className="min-w-0">
          <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#8ec5ff]">{sourceLabel} · {kindLabel}</p>
          <h3 className="mt-1 truncate font-mono text-base font-semibold leading-tight text-white">{point.name}</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded border border-[#8ec5ff]/30 p-1 text-[#8ec5ff] transition-colors hover:bg-[#8ec5ff]/10"
          aria-label="Close detail panel"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* logo stamp */}
      {point.imageUrl && point.imageKind === 'logo' && (
        <div className="flex justify-center py-3" style={{ borderBottom: `1px solid ${BLUEPRINT_LINE}` }}>
          <div className="flex h-12 w-12 items-center justify-center rounded border border-[#8ec5ff]/40 bg-white/95">
            <img src={point.imageUrl} alt={`${point.name} logo`} className="h-8 w-8 object-contain" />
          </div>
        </div>
      )}

      {/* spec rows with dotted leaders */}
      <div className="px-4 py-3 font-mono text-[11px]">
        {specRows.map(([label, value]) => (
          <div key={label} className="flex items-baseline gap-2 py-1">
            <span className="shrink-0 uppercase tracking-[0.15em] text-[#8ec5ff]/70">{label}</span>
            <span className="mb-[3px] flex-1 self-end border-b border-dashed border-[#8ec5ff]/30" />
            <span className="max-w-[58%] truncate text-right text-white">{value}</span>
          </div>
        ))}
      </div>

      {point.label && (
        <p className="px-4 py-3 text-[11px] leading-5 text-[#dbeafe]/80" style={{ borderTop: `1px solid ${BLUEPRINT_LINE}` }}>
          {point.label}
        </p>
      )}

      {point.email && (
        <p className="break-all px-4 pb-1 font-mono text-[11px] text-[#8ec5ff]">{point.email}</p>
      )}

      <div className="flex gap-2 px-4 pb-4 pt-2">
        <a
          href={point.email ? `mailto:${point.email}` : point.websiteUrl || '#'}
          target={point.email ? undefined : '_blank'}
          rel={point.email ? undefined : 'noreferrer'}
          className="flex flex-1 items-center justify-center gap-1.5 rounded border border-[#8ec5ff]/50 bg-[#8ec5ff]/10 px-3 py-2 font-mono text-[11px] font-semibold uppercase tracking-wide text-white transition-colors hover:bg-[#8ec5ff]/20"
        >
          <LocateFixed className="h-3.5 w-3.5" />
          {point.email ? 'Email' : 'Focus'}
        </a>
        {point.profilePath ? (
          <Link
            to={point.profilePath}
            className="flex h-9 w-9 items-center justify-center rounded border border-[#8ec5ff]/40 text-[#8ec5ff] transition-colors hover:bg-[#8ec5ff]/10"
            aria-label={`Open ${point.name}`}
          >
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        ) : point.websiteUrl ? (
          <a
            href={point.websiteUrl}
            target="_blank"
            rel="noreferrer"
            className="flex h-9 w-9 items-center justify-center rounded border border-[#8ec5ff]/40 text-[#8ec5ff] transition-colors hover:bg-[#8ec5ff]/10"
            aria-label={`Open ${point.name}`}
          >
            <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        ) : null}
      </div>

      {point.socialLinks && point.socialLinks.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-4 pb-4">
          {point.socialLinks.map((link) => (
            <a
              key={link.url}
              href={link.url}
              target="_blank"
              rel="noreferrer"
              className="rounded border border-[#8ec5ff]/30 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-[#8ec5ff]/80 transition-colors hover:bg-[#8ec5ff]/10 hover:text-white"
            >
              {link.label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

export const HeatMap = ({ includeVCContacts = false, vcOnly = false, fullBleed = false }: HeatMapProps) => {
  const [publishedLaunches, setPublishedLaunches] = useState<ProductLaunch[]>([]);
  const [vcContacts, setVcContacts] = useState<VCContact[]>([]);
  const [mode, setMode] = useState<HeatMapMode>('all');
  const [selectedPoint, setSelectedPoint] = useState<HeatMapPoint | null>(null);

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
      .map((contact, index) => vcContactToPoint(contact, index))
      .filter(Boolean) as HeatMapPoint[];

    const ecosystemVCPoints = ecosystemPoints.filter((point) => point.kind === 'vc');
    const points = vcOnly ? [...vcContactPoints, ...ecosystemVCPoints] : [...apparentBuilders, ...vcContactPoints, ...ecosystemPoints];

    return points.map(offsetByKind);
  }, [publishedLaunches, vcContacts, vcOnly]);

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
    <main className={fullBleed ? 'h-screen w-full overflow-hidden bg-[#e8e5dc] text-black' : 'min-h-screen overflow-x-hidden bg-[#fbfaf7] text-black'}>
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
            <ApparentHeatmapLayers points={filteredPoints} onPointSelect={setSelectedPoint} />
          </Map>

          <Card className="absolute left-4 top-4 z-10 w-[calc(100%-2rem)] max-w-[13.5rem] border-0 bg-white/90 shadow-[0_10px_34px_rgba(0,0,0,0.12)] backdrop-blur md:left-6 md:top-6">
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

          <div className="absolute bottom-4 left-4 right-4 z-10 grid gap-2 md:bottom-6 md:left-6 md:right-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <div className="max-w-md rounded-[14px] bg-white/90 p-3 shadow-[0_10px_34px_rgba(0,0,0,0.1)] backdrop-blur">
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
            </div>

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

          {/* Blueprint detail panel — slides in on the right when a point is selected */}
          {selectedVisiblePoint && (
            <div className="absolute right-4 top-4 z-20 max-h-[calc(100%-2rem)] w-[calc(100%-2rem)] max-w-[19rem] overflow-y-auto md:right-6 md:top-6 md:w-[19rem]">
              <HeatMapDetailPanel point={selectedVisiblePoint} onClose={() => setSelectedPoint(null)} />
            </div>
          )}
        </div>
      </section>
    </main>
  );
};
