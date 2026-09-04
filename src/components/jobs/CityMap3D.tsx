import { useCallback, useEffect, useImperativeHandle, useRef, forwardRef } from 'react';
import maplibregl, { type Map as MapLibreMap, type Marker } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { HiringCompany } from '@/lib/apparent-types';
import { fanOffset, layoutMarkers, type MarkerState } from './marker-layout';
import { assignBuildings, metresBetween, ringCentre, scatterAround, type Point } from './scatter';

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

/** What the viewer is currently looking at, reported after the camera settles. */
export type MapView = {
  bounds: { west: number; south: number; east: number; north: number };
  latitude: number;
  longitude: number;
  zoom: number;
  /** Nearest city/town label rendered under the camera, when the tiles carry one. */
  place: string;
  /** True when the viewer moved the camera, false when code flew it somewhere. */
  userDriven: boolean;
};

/** Which OSM place classes may name a view, and how much they are discounted. */
const PLACE_PENALTY: Record<string, number> = {
  city: 1,
  town: 1.6,
  village: 3,
  suburb: 4,
};

/** Below this, the view spans more places than a single lookup could answer for. */
const EXPLORE_MIN_ZOOM = 10;
/** How still the camera must be before the view counts as somewhere someone went. */
const EXPLORE_SETTLE_MS = 700;

type MarkerEntry = { marker: Marker; company: HiringCompany };

type Props = {
  companies: HiringCompany[];
  selectedDomain: string | null;
  onSelect: (company: HiringCompany | null) => void;
  centre: { latitude: number; longitude: number } | null;
  /** Identity of the place `centre` describes. The camera moves when THIS
   *  changes, never merely because the coordinates were recomputed. */
  centreKey: string;
  /** Fired once the camera settles somewhere, so the page can load what is there. */
  onExplore?: (view: MapView) => void;
};

export const CityMap3D = forwardRef<CityMap3DHandle, Props>(function CityMap3D(
  { companies, selectedDomain, onSelect, centre, centreKey, onExplore },
  ref,
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Map<string, MarkerEntry>>(new Map());
  /** Which stack, if any, the viewer has fanned open. */
  const expandedRef = useRef<string | null>(null);
  /**
   * Display positions for companies with no resolved office, one per
   * building. Cached so a marker does not hop to a different rooftop every
   * time tiles reload.
   */
  const scatterRef = useRef<Map<string, Point>>(new Map());
  const takenBuildingsRef = useRef<Set<string>>(new Set());
  const readyRef = useRef(false);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const onExploreRef = useRef(onExplore);
  onExploreRef.current = onExplore;

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
   * Give every unresolved company its own building.
   *
   * Footprints come from the vector tiles already loaded, so a marker lands on
   * a real structure instead of the middle of a road or a river. Runs only for
   * companies without a position yet and keeps what it assigns, so pins stay
   * put as tiles come and go.
   */
  const assignScatter = useCallback((list: HiringCompany[]) => {
    const map = mapRef.current;
    if (!map) return false;

    const pending = list.filter(
      (c) =>
        c.geoPrecision !== 'exact' &&
        c.latitude != null &&
        c.longitude != null &&
        !scatterRef.current.has(c.domain),
    );
    if (!pending.length) return false;

    const centre: Point = [pending[0].longitude as number, pending[0].latitude as number];

    let footprints: Point[] = [];
    try {
      const features = map.querySourceFeatures('openmaptiles', { sourceLayer: 'building' });
      const seen = new Set<string>();
      for (const feature of features) {
        const geometry = feature.geometry as { type: string; coordinates?: unknown };
        let ring: Point[] | undefined;
        if (geometry?.type === 'Polygon') {
          ring = (geometry.coordinates as Point[][])?.[0];
        } else if (geometry?.type === 'MultiPolygon') {
          ring = (geometry.coordinates as Point[][][])?.[0]?.[0];
        }
        const centroid = ring ? ringCentre(ring) : null;
        if (!centroid) continue;
        // Keep it in the city, not whatever else sits in a loaded tile.
        if (metresBetween(centre, centroid) > 2500) continue;
        // Tiles repeat features across boundaries; dedupe on rounded position.
        const key = `${centroid[0].toFixed(5)},${centroid[1].toFixed(5)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        footprints.push(centroid);
      }
    } catch {
      footprints = [];
    }

    // Sorted for a stable candidate order regardless of tile arrival order.
    footprints.sort((a, b) => a[0] - b[0] || a[1] - b[1]);

    const free = footprints.filter(
      (point) => !takenBuildingsRef.current.has(`${point[0].toFixed(5)},${point[1].toFixed(5)}`),
    );

    if (free.length >= 2) {
      const assigned = assignBuildings(
        pending.map((c) => c.domain),
        free,
      );
      for (const [domain, point] of assigned) {
        scatterRef.current.set(domain, point);
        takenBuildingsRef.current.add(`${point[0].toFixed(5)},${point[1].toFixed(5)}`);
      }
    }

    // Anything still unplaced (no buildings loaded, or more companies than
    // rooftops) gets spread anyway rather than left stacked on the centroid.
    pending
      .filter((c) => !scatterRef.current.has(c.domain))
      .forEach((c, i) => scatterRef.current.set(c.domain, scatterAround(c.domain, centre, i)));

    return true;
  }, []);

  /** Where a marker actually draws: its real office, or its assigned building. */
  const positionOf = useCallback((company: HiringCompany): Point | null => {
    if (company.geoPrecision !== 'exact') {
      const scattered = scatterRef.current.get(company.domain);
      if (scattered) return scattered;
    }
    if (company.latitude == null || company.longitude == null) return null;
    return [company.longitude, company.latitude];
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
      .map(([domain, entry]) => ({ domain, entry, at: positionOf(entry.company) }))
      .filter((row): row is { domain: string; entry: MarkerEntry; at: Point } => row.at !== null)
      .map(({ domain, entry, at }) => {
        const point = map.project(at);
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
  }, [selectedDomain, positionOf]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const paint = () => {
      const existing = markersRef.current;
      const wanted = new Set<string>();

      assignScatter(companies);

      for (const company of companies) {
        const at = positionOf(company);
        if (!at) continue;
        wanted.add(company.domain);

        const current = existing.get(company.domain);
        if (current) {
          current.company = company;
          current.marker.setLngLat(at);
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
          .setLngLat(at)
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
  }, [companies, selectedDomain, buildMarkerElement, relayout, assignScatter, positionOf]);

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

  /**
   * Report where the viewer has arrived, once they stop moving.
   *
   * Debounced rather than fired per frame: a single drag emits hundreds of
   * move events, and each one would otherwise become a database read and,
   * worse, a paid discovery of somewhere the viewer merely passed over.
   *
   * The place name is read off the basemap's own `place` labels, which are
   * already rendered — so knowing what city is on screen costs nothing and
   * needs no reverse geocoder.
   */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return undefined;

    let timer: ReturnType<typeof setTimeout> | undefined;
    // A drag means the viewer went looking; a flyTo means we took them. Only
    // the first should be allowed to override a filter they chose.
    let userDriven = false;
    const markUser = (event: { originalEvent?: unknown }) => {
      if (event?.originalEvent) userDriven = true;
    };

    const nearestPlace = (): string => {
      try {
        const features = map.querySourceFeatures('openmaptiles', { sourceLayer: 'place' });
        const centreOfView = map.getCenter();
        let best = '';
        let bestScore = Infinity;
        for (const feature of features) {
          /**
           * A city label beats a town at the same distance: the bigger place is
           * the one a viewer would say they were looking at. Smaller classes
           * are still accepted, heavily penalised — zoomed right into a city
           * centre, the city's own label point can sit outside the loaded
           * tiles, and a suburb name beats reporting nowhere at all.
           */
          const penalty = PLACE_PENALTY[String(feature.properties?.class ?? '')];
          if (!penalty) continue;
          const name = String(feature.properties?.name ?? '').trim();
          if (!name || feature.geometry?.type !== 'Point') continue;
          const [lng, lat] = feature.geometry.coordinates as [number, number];
          const score =
            metresBetween([centreOfView.lng, centreOfView.lat], [lng, lat]) * penalty;
          if (score < bestScore) {
            bestScore = score;
            best = name;
          }
        }
        return best;
      } catch {
        // Tiles not loaded yet: an unnamed view is still worth reporting, since
        // the bounds alone are enough to read what is already stored.
        return '';
      }
    };

    const settle = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        const report = onExploreRef.current;
        if (!report || map.getZoom() < EXPLORE_MIN_ZOOM) return;
        const bounds = map.getBounds();
        const at = map.getCenter();
        report({
          bounds: {
            west: bounds.getWest(),
            south: bounds.getSouth(),
            east: bounds.getEast(),
            north: bounds.getNorth(),
          },
          latitude: at.lat,
          longitude: at.lng,
          zoom: map.getZoom(),
          place: nearestPlace(),
          userDriven,
        });
        userDriven = false;
      }, EXPLORE_SETTLE_MS);
    };

    map.on('dragstart', markUser);
    map.on('zoomstart', markUser);
    map.on('moveend', settle);
    map.on('zoomend', settle);
    return () => {
      if (timer) clearTimeout(timer);
      map.off('dragstart', markUser);
      map.off('zoomstart', markUser);
      map.off('moveend', settle);
      map.off('zoomend', settle);
    };
  }, []);

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
      const at = company ? positionOf(company) : null;
      if (!map || !company || !at) return;

      // Searching a company in another city switches the city too, which would
      // otherwise queue a second flyTo to that city's centre and fight this
      // one. Claiming the place here means the city move is skipped and the
      // camera goes where the viewer actually asked.
      if (company.city) flownTo.current = company.city;

      map.flyTo({
        center: at,
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
