import L, { type LayerGroup, type Map as LeafletMap } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useRef } from 'react';

import type { BuilderMapCluster, BuilderNode, DashboardRole, NetworkInterestPin } from '@/lib/apparent-types';
import { cn } from '@/lib/utils';

interface BuilderRadarMapProps {
  clusters: BuilderMapCluster[];
  builders: BuilderNode[];
  selectedCity: string;
  selectedBuilderId: string;
  role: DashboardRole;
  interestPin: NetworkInterestPin | null;
  radiusMiles: number;
  onSelectCity: (city: string) => void;
  onSelectBuilder: (builderId: string) => void;
  onViewportBuildersChange: (builderIds: string[]) => void;
  badgeLabel?: string;
  className?: string;
}

const defaultCenter: [number, number] = [39.8283, -98.5795];
const defaultTileUrl =
  (import.meta.env.VITE_NETWORK_TILE_URL as string | undefined) ||
  'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const markerHtml = (cluster: BuilderMapCluster, role: DashboardRole, selected: boolean) => `
  <div class="builder-radar-marker builder-radar-marker--${role}${selected ? ' builder-radar-marker--selected' : ''}" title="${escapeHtml(cluster.city)}">
    <span>${cluster.builderCount}</span>
  </div>
`;

const builderDotHtml = (builder: BuilderNode, role: DashboardRole, selected: boolean) => {
  const ingested = builder.origin === 'ingested';
  const titleSuffix = ingested ? ` (${builder.sourceLabel ?? 'ingested signal'})` : '';
  return `
  <div class="builder-radar-builder-dot builder-radar-builder-dot--${role}${ingested ? ' builder-radar-builder-dot--ingested' : ''}${selected ? ' builder-radar-builder-dot--selected' : ''}" title="${escapeHtml(`${builder.company} - ${builder.location}${titleSuffix}`)}">
    <span>${escapeHtml(builder.company.slice(0, 1).toUpperCase())}</span>
  </div>
`;
};

const pinHtml = (pin: NetworkInterestPin, role: DashboardRole) => `
  <div class="builder-radar-pin builder-radar-pin--${role}" title="${escapeHtml(pin.label)}">
    <span></span>
  </div>
`;

export function BuilderRadarMap({
  clusters,
  builders,
  selectedCity,
  selectedBuilderId,
  role,
  interestPin,
  radiusMiles,
  onSelectCity,
  onSelectBuilder,
  onViewportBuildersChange,
  badgeLabel,
  className,
}: BuilderRadarMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerLayerRef = useRef<LayerGroup | null>(null);
  const builderLayerRef = useRef<LayerGroup | null>(null);
  const pinLayerRef = useRef<LayerGroup | null>(null);
  const buildersRef = useRef(builders);
  const hasFitInitialViewRef = useRef(false);
  const previousDatasetKeyRef = useRef('');
  const previousPinKeyRef = useRef('');
  const initialInterestPinRef = useRef(interestPin);
  const onSelectCityRef = useRef(onSelectCity);
  const onSelectBuilderRef = useRef(onSelectBuilder);
  const onViewportBuildersChangeRef = useRef(onViewportBuildersChange);

  useEffect(() => {
    buildersRef.current = builders;
    onSelectCityRef.current = onSelectCity;
    onSelectBuilderRef.current = onSelectBuilder;
    onViewportBuildersChangeRef.current = onViewportBuildersChange;
  }, [builders, onSelectBuilder, onSelectCity, onViewportBuildersChange]);

  const emitVisibleBuilders = () => {
    const map = mapRef.current;
    if (!map) return;

    const bounds = map.getBounds();
    const visibleBuilderIds = buildersRef.current
      .filter((builder) => bounds.contains([builder.latitude, builder.longitude]))
      .map((builder) => builder.id);
    onViewportBuildersChangeRef.current(visibleBuilderIds);
  };

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return;
    }

    const map = L.map(containerRef.current, {
      center: defaultCenter,
      zoom: 3,
      zoomControl: false,
      attributionControl: false,
      minZoom: 2,
      maxZoom: 12,
      scrollWheelZoom: true,
      wheelDebounceTime: 40,
      wheelPxPerZoomLevel: 90,
    });

    L.tileLayer(defaultTileUrl, {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    L.control.zoom({ position: 'bottomleft' }).addTo(map);
    markerLayerRef.current = L.layerGroup().addTo(map);
    builderLayerRef.current = L.layerGroup().addTo(map);
    pinLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    const initialInterestPin = initialInterestPinRef.current;
    if (initialInterestPin) {
      map.setView([initialInterestPin.latitude, initialInterestPin.longitude], 8, { animate: false });
      previousPinKeyRef.current = `${initialInterestPin.label}:${initialInterestPin.latitude}:${initialInterestPin.longitude}`;
      hasFitInitialViewRef.current = true;
    }

    map.on('moveend zoomend', emitVisibleBuilders);

    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize({ animate: false });
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      map.off('moveend zoomend', emitVisibleBuilders);
      map.remove();
      mapRef.current = null;
      markerLayerRef.current = null;
      builderLayerRef.current = null;
      pinLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const markerLayer = markerLayerRef.current;
    const builderLayer = builderLayerRef.current;
    const pinLayer = pinLayerRef.current;

    if (!map || !markerLayer || !builderLayer || !pinLayer) {
      return;
    }

    markerLayer.clearLayers();
    builderLayer.clearLayers();
    pinLayer.clearLayers();

    clusters.forEach((cluster) => {
      const marker = L.marker([cluster.latitude, cluster.longitude], {
        icon: L.divIcon({
          html: markerHtml(cluster, role, selectedCity === cluster.city),
          className: 'builder-radar-marker-shell',
          iconSize: [44, 44],
          iconAnchor: [22, 22],
        }),
        keyboard: true,
        title: cluster.city,
      });

      marker.on('click', () => onSelectCityRef.current(cluster.city));
      marker.addTo(markerLayer);
    });

    builders.forEach((builder) => {
      const marker = L.marker([builder.latitude, builder.longitude], {
        icon: L.divIcon({
          html: builderDotHtml(builder, role, selectedBuilderId === builder.id),
          className: 'builder-radar-builder-dot-shell',
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        }),
        keyboard: true,
        title: `${builder.company} - ${builder.location}`,
        zIndexOffset: selectedBuilderId === builder.id ? 800 : 400,
      });

      marker.on('click', () => onSelectBuilderRef.current(builder.id));
      marker.addTo(builderLayer);
    });

    if (interestPin) {
      L.circle([interestPin.latitude, interestPin.longitude], {
        radius: radiusMiles * 1609.344,
        color: role === 'investor' ? '#42520d' : '#ef4444',
        weight: 1,
        fillColor: role === 'investor' ? '#42520d' : '#f97316',
        fillOpacity: 0.08,
      }).addTo(pinLayer);

      L.marker([interestPin.latitude, interestPin.longitude], {
        icon: L.divIcon({
          html: pinHtml(interestPin, role),
          className: 'builder-radar-pin-shell',
          iconSize: [34, 42],
          iconAnchor: [17, 38],
        }),
        keyboard: true,
        title: interestPin.label,
      }).addTo(pinLayer);
    }
  }, [builders, clusters, interestPin, radiusMiles, role, selectedBuilderId, selectedCity]);

  useEffect(() => {
    const map = mapRef.current;

    if (!map) {
      return;
    }

    const datasetKey = builders
      .map((builder) => `${builder.id}:${builder.latitude}:${builder.longitude}`)
      .sort()
      .join('|');
    const pinKey = interestPin ? `${interestPin.label}:${interestPin.latitude}:${interestPin.longitude}` : '';
    const datasetChanged = datasetKey !== previousDatasetKeyRef.current;
    const pinChanged = pinKey !== previousPinKeyRef.current;

    if (interestPin) {
      if (pinChanged) {
        map.setView([interestPin.latitude, interestPin.longitude], 8, { animate: true });
        previousPinKeyRef.current = pinKey;
        window.setTimeout(emitVisibleBuilders, 500);
      }

      previousDatasetKeyRef.current = datasetKey;
      hasFitInitialViewRef.current = true;
      return;
    }

    if (!hasFitInitialViewRef.current || datasetChanged || previousPinKeyRef.current) {
      const boundsPoints: Array<[number, number]> = [
        ...clusters.map((cluster) => [cluster.latitude, cluster.longitude] as [number, number]),
        ...builders.map((builder) => [builder.latitude, builder.longitude] as [number, number]),
      ];

      if (boundsPoints.length > 1) {
        const bounds = L.latLngBounds(boundsPoints);
        map.fitBounds(bounds.pad(0.28), { animate: true, duration: 0.45, maxZoom: 5 });
        window.setTimeout(emitVisibleBuilders, 500);
      } else if (boundsPoints.length === 1) {
        map.setView(boundsPoints[0], 5, { animate: true });
        window.setTimeout(emitVisibleBuilders, 500);
      } else {
        map.setView(defaultCenter, 3, { animate: true });
        onViewportBuildersChangeRef.current([]);
      }

      hasFitInitialViewRef.current = true;
    }

    previousDatasetKeyRef.current = datasetKey;
    previousPinKeyRef.current = pinKey;
  }, [builders, clusters, interestPin]);

  useEffect(() => {
    const map = mapRef.current;
    const selectedCluster = clusters.find((cluster) => cluster.city === selectedCity);

    if (!map || !selectedCluster || interestPin) {
      return;
    }

    map.flyTo([selectedCluster.latitude, selectedCluster.longitude], Math.max(map.getZoom(), 5), {
      animate: true,
      duration: 0.55,
    });
  }, [clusters, interestPin, selectedCity]);

  return (
    <div className={cn('relative z-0 min-h-[420px] overflow-hidden bg-[#f4f1eb]', className)}>
      <div ref={containerRef} className="absolute inset-0" />
      <div className="pointer-events-none absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm">
        {badgeLabel ?? (interestPin ? `${radiusMiles} mi radar` : 'Apparent builders only')}
      </div>
    </div>
  );
}
