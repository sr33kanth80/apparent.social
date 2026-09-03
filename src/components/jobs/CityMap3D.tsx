import { useCallback, useEffect, useImperativeHandle, useRef, forwardRef } from 'react';
import maplibregl, { type Map as MapLibreMap, type Marker } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { HiringCompany } from '@/lib/apparent-types';

/**
 * Real-world 3D city, built on OpenStreetMap.
 *
 * Buildings are actual OSM footprints extruded to their real tagged heights —
 * not stylised blocks — via a `fill-extrusion` layer over the OpenMapTiles
 * `building` source-layer, which carries `render_height` and
 * `render_min_height` straight from OSM.
 *
 * Tiles come from OpenFreeMap: OSM data, no API key.
 * ponytail: swap the style URL for MapTiler or Protomaps if this ever needs an
 * uptime guarantee; both serve the same schema, so nothing else changes.
 */

const STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';

/** Buildings exist from z14 in the tiles; below that the camera stays flat. */
const BUILDINGS_ZOOM = 14;
const CITY_ZOOM = 15.9;
const FOCUS_ZOOM = 17.2;

export type CityMap3DHandle = {
  focusCompany: (domain: string) => void;
  flyToCity: (latitude: number, longitude: number) => void;
};

type Props = {
  companies: HiringCompany[];
  selectedDomain: string | null;
  onSelect: (company: HiringCompany | null) => void;
  centre: { latitude: number; longitude: number } | null;
};

export const CityMap3D = forwardRef<CityMap3DHandle, Props>(function CityMap3D(
  { companies, selectedDomain, onSelect, centre },
  ref,
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Map<string, Marker>>(new Map());
  const readyRef = useRef(false);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  // ---- map setup -------------------------------------------------------
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return undefined;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE_URL,
      center: [-122.3321, 47.6062],
      zoom: CITY_ZOOM,
      // A pitched camera is the whole point: extrusions read as buildings only
      // when seen from an angle.
      pitch: 58,
      bearing: -18,
      maxPitch: 75,
      // MapLibre v5 moved this under canvasContextAttributes. Without it the
      // extrusion edges crawl with jaggies at every camera move.
      canvasContextAttributes: { antialias: true },
      attributionControl: { compact: true },
    });
    mapRef.current = map;

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right');

    map.on('load', () => {
      readyRef.current = true;

      // Liberty ships its own building-3d layer, but only from z14 with flat
      // shading. Replacing it gives control over height ramp and colour.
      if (map.getLayer('building-3d')) map.removeLayer('building-3d');

      /**
       * Insert beneath the first TEXT layer.
       *
       * The usual advice is "below the first symbol layer", but this style's
       * first symbol is a one-way-arrow icon sitting midway through the road
       * stack: anchoring there left fifty road and bridge layers painting over
       * the buildings, so 358 extrusions rendered and none were visible.
       * Testing for an actual text-field finds the label layers, which are the
       * only ones that genuinely belong on top.
       */
      const layers = map.getStyle().layers ?? [];
      const firstSymbol = layers.find(
        (layer) => layer.type === 'symbol' && (layer.layout as { 'text-field'?: unknown })?.['text-field'],
      )?.id;

      map.addLayer(
        {
          id: 'osm-buildings-3d',
          type: 'fill-extrusion',
          source: 'openmaptiles',
          'source-layer': 'building',
          minzoom: BUILDINGS_ZOOM,
          filter: ['!=', ['get', 'hide_3d'], true],
          paint: {
            /**
             * Buildings have to contrast with the basemap, not match it.
             * A beige ramp over Liberty's beige land rendered 358 extrusions
             * that were all technically drawn and none of which could be seen.
             * Taller buildings also read cooler, which gives the skyline depth
             * without inventing data.
             */
            'fill-extrusion-color': [
              'interpolate',
              ['linear'],
              ['coalesce', ['get', 'render_height'], 10],
              0,
              '#cfc6b8',
              30,
              '#bcb5aa',
              90,
              '#9aa8b8',
              200,
              '#7d93ab',
              350,
              '#6a83a0',
            ],
            // Grow from flat as you descend, so buildings rise into view
            // instead of popping.
            'fill-extrusion-height': [
              'interpolate',
              ['linear'],
              ['zoom'],
              BUILDINGS_ZOOM,
              0,
              BUILDINGS_ZOOM + 1,
              ['coalesce', ['get', 'render_height'], 10],
            ],
            'fill-extrusion-base': [
              'interpolate',
              ['linear'],
              ['zoom'],
              BUILDINGS_ZOOM,
              0,
              BUILDINGS_ZOOM + 1,
              ['coalesce', ['get', 'render_min_height'], 0],
            ],
            'fill-extrusion-opacity': 1,
            // Shades the lower parts of each wall: cheap ambient occlusion that
            // stops the city looking like flat paper cut-outs.
            'fill-extrusion-vertical-gradient': true,
          },
        },
        firstSymbol,
      );

      // Sky and horizon, so a pitched camera looks out at something rather than
      // off the edge of the world.
      try {
        map.setSky({
          'sky-color': '#bcd7f0',
          'horizon-color': '#eae3d8',
          'fog-color': '#efe9e0',
          'sky-horizon-blend': 0.6,
          'horizon-fog-blend': 0.6,
          'fog-ground-blend': 0.4,
        });
      } catch {
        // Older MapLibre builds have no sky; the map is fine without it.
      }

      map.setLight({ anchor: 'viewport', color: '#ffffff', intensity: 0.42, position: [1.4, 200, 40] });
    });

    // Captured now: the ref may point elsewhere by the time cleanup runs.
    const markers = markersRef.current;
    return () => {
      readyRef.current = false;
      markers.forEach((marker) => marker.remove());
      markers.clear();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // ---- markers ---------------------------------------------------------
  const buildMarkerElement = useCallback((company: HiringCompany, isSelected: boolean) => {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'jobs-marker';
    el.dataset.selected = String(isSelected);
    // Approximate placements are shown differently: a marker sitting on a city
    // centroid must not look as certain as one on a resolved address.
    el.dataset.approx = String(company.geoPrecision !== 'exact');
    el.setAttribute('aria-label', `${company.name}, ${company.openRoles} open roles`);
    el.innerHTML = `
      <span class="jobs-marker-body">
        <span class="jobs-marker-name"></span>
        ${company.openRoles > 0 ? `<span class="jobs-marker-count">${company.openRoles}</span>` : ''}
      </span>
      <span class="jobs-marker-stem"></span>`;
    const nameEl = el.querySelector('.jobs-marker-name');
    if (nameEl) nameEl.textContent = company.name;
    return el;
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const paint = () => {
      const existing = markersRef.current;
      const wanted = new Set<string>();

      for (const company of companies) {
        if (company.latitude == null || company.longitude == null) continue;
        wanted.add(company.domain);

        const isSelected = company.domain === selectedDomain;
        const current = existing.get(company.domain);
        if (current) {
          current.setLngLat([company.longitude, company.latitude]);
          const el = current.getElement();
          el.dataset.selected = String(isSelected);
          el.dataset.approx = String(company.geoPrecision !== 'exact');
          continue;
        }

        const el = buildMarkerElement(company, isSelected);
        el.addEventListener('click', (event) => {
          event.stopPropagation();
          onSelectRef.current(company);
        });

        const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
          .setLngLat([company.longitude, company.latitude])
          .addTo(map);
        existing.set(company.domain, marker);
      }

      // Drop markers for companies no longer in view (a city change).
      for (const [domain, marker] of existing) {
        if (!wanted.has(domain)) {
          marker.remove();
          existing.delete(domain);
        }
      }
    };

    if (readyRef.current) paint();
    else map.once('load', paint);
  }, [companies, selectedDomain, buildMarkerElement]);

  // ---- camera ----------------------------------------------------------
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !centre) return;
    map.flyTo({
      center: [centre.longitude, centre.latitude],
      zoom: CITY_ZOOM,
      pitch: 58,
      bearing: -18,
      duration: 1600,
      essential: true,
    });
  }, [centre]);

  useImperativeHandle(ref, () => ({
    focusCompany: (domain: string) => {
      const map = mapRef.current;
      const company = companies.find((entry) => entry.domain === domain);
      if (!map || !company || company.latitude == null || company.longitude == null) return;
      map.flyTo({
        center: [company.longitude, company.latitude],
        zoom: FOCUS_ZOOM,
        pitch: 62,
        duration: 1500,
        essential: true,
      });
    },
    flyToCity: (latitude: number, longitude: number) => {
      mapRef.current?.flyTo({
        center: [longitude, latitude],
        zoom: CITY_ZOOM,
        pitch: 58,
        duration: 1600,
        essential: true,
      });
    },
  }));

  // Clicking empty map closes the panel.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return undefined;
    const onClick = () => onSelectRef.current(null);
    map.on('click', onClick);
    return () => {
      map.off('click', onClick);
    };
  }, []);

  return <div ref={containerRef} className="h-full w-full" />;
});
