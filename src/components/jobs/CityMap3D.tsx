import { useCallback, useEffect, useImperativeHandle, useRef, forwardRef } from 'react';
import maplibregl, { type Map as MapLibreMap, type Marker } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { HiringCompany } from '@/lib/apparent-types';
import { fanOffset, layoutMarkers, type MarkerState } from './marker-layout';

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

type MarkerEntry = { marker: Marker; company: HiringCompany };

type Props = {
  companies: HiringCompany[];
  selectedDomain: string | null;
  onSelect: (company: HiringCompany | null) => void;
  centre: { latitude: number; longitude: number } | null;
  /** Identity of the place `centre` describes. The camera moves when THIS
   *  changes, never merely because the coordinates were recomputed. */
  centreKey: string;
};

export const CityMap3D = forwardRef<CityMap3DHandle, Props>(function CityMap3D(
  { companies, selectedDomain, onSelect, centre, centreKey },
  ref,
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Map<string, MarkerEntry>>(new Map());
  /** Which stack, if any, the viewer has fanned open. */
  const expandedRef = useRef<string | null>(null);
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

    /**
     * Applied on `styledata`, not `load`.
     *
     * `load` waits for the initial TILES as well as the style, so a slow or
     * flaky tile server leaves it unfired indefinitely — and everything hung
     * off it never happens: no 3D buildings, no sky, no markers. The layer
     * only actually needs the style, which arrives much earlier and on its
     * own event.
     */
    const applyStyle = () => {
      if (!map.isStyleLoaded()) return false;
      if (map.getLayer('osm-buildings-3d')) return true; // already applied
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
      return true;
    };

    /**
     * Keep trying until it takes.
     *
     * A single `styledata` listener is not enough: the event can fire while
     * isStyleLoaded() is still false and then never fire again, leaving the
     * custom layer unapplied and Liberty's flat default rendering in its
     * place. Several signals plus a slow interval backstop mean no single
     * missed event loses the layer.
     */
    let applyTimer: ReturnType<typeof setInterval> | undefined;
    const stopApplying = () => {
      if (applyTimer) clearInterval(applyTimer);
      applyTimer = undefined;
      map.off('styledata', tryApply);
      map.off('idle', tryApply);
    };
    function tryApply() {
      if (applyStyle()) stopApplying();
    }

    if (!applyStyle()) {
      map.on('styledata', tryApply);
      map.on('idle', tryApply);
      applyTimer = setInterval(tryApply, 400);
    }

    // Captured now: the ref may point elsewhere by the time cleanup runs.
    const markers = markersRef.current;
    return () => {
      stopApplying();
      readyRef.current = false;
      markers.forEach((entry) => entry.marker.remove());
      markers.clear();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // ---- markers ---------------------------------------------------------
  const buildMarkerElement = useCallback((company: HiringCompany) => {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'jobs-marker';
    el.setAttribute('aria-label', `${company.name}, ${company.openRoles} open roles`);
    el.innerHTML = `
      <span class="jobs-marker-body">
        <span class="jobs-marker-name"></span>
        <span class="jobs-marker-count"></span>
        <span class="jobs-marker-stack"></span>
      </span>
      <span class="jobs-marker-stem"></span>`;
    const nameEl = el.querySelector('.jobs-marker-name');
    if (nameEl) nameEl.textContent = company.name;
    const countEl = el.querySelector('.jobs-marker-count') as HTMLElement | null;
    if (countEl) {
      countEl.textContent = String(company.openRoles);
      countEl.style.display = company.openRoles > 0 ? '' : 'none';
    }
    return el;
  }, []);

  /**
   * Decide how each marker draws itself for the current camera.
   *
   * Overlap is a screen-space property, so this runs on every move rather than
   * once when the data arrives.
   */
  const relayout = useCallback(() => {
    const map = mapRef.current;
    const entries = markersRef.current;
    if (!map || !entries.size) return;

    const projected = [...entries.entries()]
      .filter(([, entry]) => entry.company.latitude != null && entry.company.longitude != null)
      .map(([domain, entry]) => {
        const point = map.project([
          entry.company.longitude as number,
          entry.company.latitude as number,
        ]);
        return { domain, company: entry.company, x: point.x, y: point.y };
      });

    const { states, stacks } = layoutMarkers(projected);

    // A selected company must never be one of the hidden ones. If it sits
    // under a folded stack, open that stack rather than leaving the viewer
    // looking at a panel whose pin they cannot see.
    if (selectedDomain && states.get(selectedDomain) === 'stacked') {
      for (const [anchor, members] of stacks) {
        if (members.includes(selectedDomain)) {
          expandedRef.current = anchor;
          break;
        }
      }
    }
    const expanded = expandedRef.current;

    // Which anchor each folded marker belongs to, so a fanned stack can place
    // its members.
    const parentOf = new Map<string, { anchor: string; index: number; total: number }>();
    for (const [anchor, members] of stacks) {
      members.forEach((domain, index) =>
        parentOf.set(domain, { anchor, index, total: members.length }),
      );
    }

    for (const [domain, entry] of entries) {
      const el = entry.marker.getElement();
      const state: MarkerState = states.get(domain) ?? 'full';
      const members = stacks.get(domain);
      const isOpenAnchor = expanded === domain;

      el.dataset.selected = String(domain === selectedDomain);
      el.dataset.approx = String(entry.company.geoPrecision !== 'exact');

      if (state === 'stacked') {
        const parent = parentOf.get(domain);
        if (parent && expanded === parent.anchor) {
          // Fanned open: a pixel offset makes each member separately clickable
          // without moving it off its real coordinate.
          entry.marker.setOffset(fanOffset(parent.index, parent.total));
          el.dataset.state = 'full';
          el.dataset.fanned = 'true';
        } else {
          entry.marker.setOffset([0, 0]);
          el.dataset.state = 'hidden';
          el.dataset.fanned = 'false';
        }
      } else {
        entry.marker.setOffset([0, 0]);
        el.dataset.state = state;
        el.dataset.fanned = 'false';
      }

      // A folded anchor advertises how many are hiding beneath it.
      const stackEl = el.querySelector('.jobs-marker-stack') as HTMLElement | null;
      const hidden = members && !isOpenAnchor ? members.length : 0;
      if (stackEl) {
        stackEl.textContent = hidden ? `+${hidden}` : '';
        stackEl.style.display = hidden ? '' : 'none';
      }
      el.dataset.stack = hidden ? 'true' : 'false';
    }
  }, [selectedDomain]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const paint = () => {
      const existing = markersRef.current;
      const wanted = new Set<string>();

      for (const company of companies) {
        if (company.latitude == null || company.longitude == null) continue;
        wanted.add(company.domain);

        const current = existing.get(company.domain);
        if (current) {
          current.company = company;
          current.marker.setLngLat([company.longitude, company.latitude]);
          continue;
        }

        const el = buildMarkerElement(company);
        el.addEventListener('click', (event) => {
          event.stopPropagation();
          // A folded marker opens its stack first. The company underneath is
          // then one more click away, which beats it being unreachable.
          if (el.dataset.stack === 'true') {
            expandedRef.current = company.domain;
            relayout();
            return;
          }
          // The fan deliberately stays open: picking a company to read its
          // roles should not sweep every other pin off the map.
          onSelectRef.current(company);
          relayout();
        });

        const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
          .setLngLat([company.longitude, company.latitude])
          .addTo(map);
        existing.set(company.domain, { marker, company });
      }

      // Drop markers for companies no longer in view (a city change).
      for (const [domain, entry] of existing) {
        if (!wanted.has(domain)) {
          entry.marker.remove();
          existing.delete(domain);
        }
      }
      relayout();
    };

    // Painted immediately. Markers are DOM overlays, not style layers, so they
    // never needed the map to finish loading — gating them behind it meant a
    // slow tile server showed an empty map with no companies on it.
    paint();
  }, [companies, selectedDomain, buildMarkerElement, relayout]);

  // What overlaps changes with every pan and zoom, so re-pack on camera move.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return undefined;
    const onMove = () => relayout();
    map.on('move', onMove);
    map.on('zoom', onMove);
    return () => {
      map.off('move', onMove);
      map.off('zoom', onMove);
    };
  }, [relayout]);

  // ---- camera ----------------------------------------------------------
  /**
   * Fly only when the place changes, not when its coordinates do.
   *
   * `centre` is recomputed from the company list, and precise geocoding
   * resolves companies in batches — so every batch produced a slightly
   * different centre and another flyTo, yanking the camera around while the
   * data settled and dragging the viewer off any company they had just
   * searched for. Keying on the place makes the camera follow intent instead.
   */
  const flownTo = useRef<string | null>(null);
  useEffect(() => {
    const map = mapRef.current;
    // No centre yet means the city's data has not arrived; stay put and let a
    // later render fly, rather than recording this place as already visited.
    if (!map || !centre || !centreKey) return;
    if (flownTo.current === centreKey) return;
    flownTo.current = centreKey;

    map.flyTo({
      center: [centre.longitude, centre.latitude],
      zoom: CITY_ZOOM,
      pitch: 58,
      bearing: -18,
      duration: 1600,
      essential: true,
    });
  }, [centre, centreKey]);

  useImperativeHandle(ref, () => ({
    focusCompany: (domain: string) => {
      const map = mapRef.current;
      const company = companies.find((entry) => entry.domain === domain);
      if (!map || !company || company.latitude == null || company.longitude == null) return;

      // Searching a company in another city switches the city too, which would
      // otherwise queue a second flyTo to that city's centre and fight this
      // one. Claiming the place here means the city move is skipped and the
      // camera goes where the viewer actually asked.
      if (company.city) flownTo.current = company.city;

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
    const onClick = () => {
      expandedRef.current = null;
      onSelectRef.current(null);
    };
    map.on('click', onClick);
    return () => {
      map.off('click', onClick);
    };
  }, []);

  return <div ref={containerRef} className="h-full w-full" />;
});
