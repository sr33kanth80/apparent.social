import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, Briefcase, MapPin, Search, X } from 'lucide-react';
import type { Map as MapLibreMap } from 'maplibre-gl';
import { Map, MapClusterLayer, useMap } from '@/components/ui/map';
import {
  browseCompaniesInBounds,
  discoverArea,
  loadJobsForCompany,
  searchCompanies,
  type MapBounds,
} from '@/lib/jobs-service';
import type { CompanyJob, HiringCompany } from '@/lib/apparent-types';

/**
 * Jobs Map — companies that are hiring, plotted by city.
 *
 * Company-level like wherewework: a pin is a company, the click-through goes to
 * that company's own careers page, and Apparent never hosts the listings.
 *
 * Loading is viewport-driven, the way a property search behaves: panning or
 * zooming fetches what is actually in view rather than one fixed global page.
 * Those reads hit the companies table directly under public RLS, so moving the
 * map is free.
 *
 * Zooming into an area the corpus does not cover additionally triggers
 * discovery, which CAN spend. See the guards below for what keeps that in
 * check.
 */

const BLUE = '#1d9bf0';
const MAX_LOADED = 2000;

/**
 * OpenStreetMap vector tiles via OpenFreeMap — keyless and free, unlike the
 * CARTO basemap this replaced, and its Liberty style already ships a
 * `building-3d` fill-extrusion layer driven by real OSM building heights. That
 * is what gives the city view actual 3D massing rather than a flat plan.
 *
 * ponytail: OpenFreeMap is a free community service with no SLA. If the map
 * ever needs an uptime guarantee, swap this URL for MapTiler or Protomaps —
 * both serve the same OpenMapTiles schema, so nothing else here changes.
 */
const OSM_3D_STYLE = 'https://tiles.openfreemap.org/styles/liberty';

/** Buildings only exist from z14, so the camera tilts in to show them off. */
const BUILDINGS_ZOOM = 14;
const TILTED_PITCH = 55;

/**
 * Auto-discovery guards. Exploring the map can spend money, so it only fires
 * when someone has zoomed to a specific place (not a continent), the area is
 * genuinely empty rather than merely sparse, and that area has not already been
 * tried this session -- deduped by the place name the basemap reports, so
 * nudging the map is not a new area. The server adds its own guards on top: it
 * answers from cache when the place was discovered recently, and rate-limits
 * per IP.
 */
const DISCOVER_MIN_ZOOM = 8;
const DISCOVER_WHEN_FEWER_THAN = 4;
/**
 * How old cached rows may be before exploring an area refreshes them.
 *
 * Without this the map only ever filled empty areas: once somewhere had a few
 * companies it was never looked at again, so a city discovered days ago kept
 * showing days-old openings forever. Matches the server's own cache window.
 */
const STALE_AFTER_MS = 30 * 60 * 1000;

const isStale = (rows: HiringCompany[]) => {
  if (!rows.length) return true;
  let newest = 0;
  for (const row of rows) {
    const ms = row.lastEnrichedAt ? Date.parse(row.lastEnrichedAt) : NaN;
    if (Number.isFinite(ms) && ms > newest) newest = ms;
  }
  // No timestamp at all means it predates freshness tracking: treat as stale.
  return newest === 0 || Date.now() - newest > STALE_AFTER_MS;
};

type PlacedCompany = HiringCompany & { lat: number; lng: number };

const viewKey = (b: MapBounds, zoom: number) =>
  `${[b.west, b.south, b.east, b.north].map((n) => n.toFixed(2)).join(',')}@${Math.round(zoom)}`;

/**
 * Pins are city centroids, so every company in a city shares one coordinate and
 * would stack into a single unclickable point once zoomed past clustering.
 * Co-located companies are fanned onto rings around the centroid.
 *
 * Presentation only — the stored coordinate stays the true centroid. Positions
 * come from a stable sort so a pin does not jump between renders.
 */
const fanOutCoLocated = (companies: HiringCompany[]): PlacedCompany[] => {
  const groups: Record<string, HiringCompany[]> = {};
  for (const company of companies) {
    if (company.latitude == null || company.longitude == null) continue;
    const key = `${company.latitude},${company.longitude}`;
    (groups[key] ||= []).push(company);
  }

  const placed: PlacedCompany[] = [];
  for (const group of Object.values(groups)) {
    if (group.length === 1) {
      const only = group[0];
      placed.push({ ...only, lat: only.latitude as number, lng: only.longitude as number });
      continue;
    }
    group.sort((a, b) => a.domain.localeCompare(b.domain));
    const perRing = 8;
    const radius = 0.016;
    group.forEach((company, index) => {
      const ring = Math.floor(index / perRing);
      const angle = ((index % perRing) / perRing) * Math.PI * 2 + ring * 0.45;
      const r = radius * (1 + ring * 0.85);
      placed.push({
        ...company,
        // Latitude is compressed so a ring reads as a circle rather than an
        // ellipse at typical city latitudes.
        lat: (company.latitude as number) + r * Math.sin(angle) * 0.62,
        lng: (company.longitude as number) + r * Math.cos(angle),
      });
    });
  }
  return placed;
};

/**
 * Name of the place under the middle of the map, read from the OSM vector
 * tiles already on screen.
 *
 * The hiring endpoints filter by city NAME while the map only knows
 * coordinates, so something has to bridge the two. Orthogonal's catalog has no
 * reverse geocoder, and a hand-written coordinate table is exactly what we are
 * getting rid of — but the basemap is OpenStreetMap and its `place` layer
 * carries city, town and village names. Reading them costs nothing and is as
 * live as the tiles.
 */
const placeNameAtCentre = (map: MapLibreMap): string => {
  let layerIds: string[];
  try {
    layerIds = map
      .getStyle()
      .layers.filter((layer) => (layer as { 'source-layer'?: string })['source-layer'] === 'place')
      .map((layer) => layer.id)
      .filter((id) => map.getLayer(id));
  } catch {
    return '';
  }
  if (!layerIds.length) return '';

  const features = map.queryRenderedFeatures(undefined, { layers: layerIds });
  if (!features.length) return '';

  const centre = map.project(map.getCenter());
  // A city beats a town beats a village; ties break on distance from centre, so
  // the label the viewer is actually looking at wins.
  const rank: Record<string, number> = { city: 3, town: 2, village: 1 };

  let best: { name: string; score: number; distance: number } | null = null;
  for (const feature of features) {
    const props = (feature.properties ?? {}) as Record<string, unknown>;
    const score = rank[String(props.class ?? '')] ?? 0;
    if (!score) continue; // states and countries are too coarse to search on
    const name = String(props['name:en'] ?? props.name ?? '').trim();
    if (!name) continue;

    const geometry = feature.geometry as { type: string; coordinates?: [number, number] };
    if (geometry?.type !== 'Point' || !geometry.coordinates) continue;
    const point = map.project(geometry.coordinates);
    const distance = Math.hypot(point.x - centre.x, point.y - centre.y);

    if (!best || score > best.score || (score === best.score && distance < best.distance)) {
      best = { name, score, distance };
    }
  }
  return best?.name ?? '';
};

/**
 * Reports the viewport once the map settles. Debounced so a drag or pinch
 * issues one query instead of one per frame.
 */
function ViewportWatcher({
  onSettle,
}: {
  onSettle: (bounds: MapBounds, zoom: number, placeName: string) => void;
}) {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!map || !isLoaded) return undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const report = () => {
      const zoom = map.getZoom();

      // Tilt in once buildings exist so their extrusions read as massing, and
      // lie back down when zoomed out where a pitched globe just looks skewed.
      // Only acted on when the camera is actually far from the target pitch, so
      // the easeTo cannot feed its own moveend back into a loop.
      const wantPitch = zoom >= BUILDINGS_ZOOM ? TILTED_PITCH : 0;
      if (Math.abs(map.getPitch() - wantPitch) > 6) {
        map.easeTo({ pitch: wantPitch, duration: 600 });
      }

      const bounds = map.getBounds();
      onSettle(
        {
          west: bounds.getWest(),
          south: bounds.getSouth(),
          east: bounds.getEast(),
          north: bounds.getNorth(),
        },
        zoom,
        placeNameAtCentre(map),
      );
    };

    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(report, 280);
    };

    report();
    map.on('moveend', schedule);
    map.on('zoomend', schedule);
    return () => {
      clearTimeout(timer);
      map.off('moveend', schedule);
      map.off('zoomend', schedule);
    };
  }, [map, isLoaded, onSettle]);

  return null;
}

/** "3d ago" reads faster than a date when scanning for fresh postings. */
const postedLabel = (postedAt: string | null) => {
  if (!postedAt) return '';
  const ms = Date.parse(postedAt);
  if (!Number.isFinite(ms)) return '';
  const days = Math.floor((Date.now() - ms) / 86_400_000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
};

function CompanyPanel({ company, onClose }: { company: HiringCompany; onClose: () => void }) {
  const [jobs, setJobs] = useState<CompanyJob[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoadingJobs(true);
    setJobs([]);
    loadJobsForCompany(company.domain)
      .then((rows) => {
        if (mounted) setJobs(rows);
      })
      .catch(() => undefined)
      .finally(() => {
        if (mounted) setLoadingJobs(false);
      });
    return () => {
      mounted = false;
    };
  }, [company.domain]);

  return (
    <div className="absolute right-4 top-4 z-30 flex max-h-[calc(100%-2rem)] w-[340px] max-w-[calc(100vw-2rem)] flex-col border border-black/12 bg-[#fdf9f7] shadow-[0_10px_40px_rgba(0,0,0,0.14)]">
      <div className="shrink-0 border-b border-black/10 p-5 pb-4">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 text-black/40 transition-colors hover:text-black"
        >
          <X className="h-4 w-4" />
        </button>

        <h2 className="pr-6 font-serif text-xl leading-tight text-black">{company.name}</h2>

        {company.city && (
          <p className="mt-1 flex items-center gap-1.5 text-xs text-black/55">
            <MapPin className="h-3.5 w-3.5" />
            {company.city}
          </p>
        )}

        {company.oneLiner && (
          <p className="mt-3 text-sm leading-relaxed text-black/70">{company.oneLiner}</p>
        )}

        {company.careersUrl && (
          <a
            href={company.careersUrl}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="mt-4 inline-flex items-center gap-1.5 border px-3.5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
            style={{ background: BLUE, borderColor: BLUE }}
          >
            View careers
            <ArrowUpRight className="h-4 w-4" />
          </a>
        )}
      </div>

      {/* The actual roles. A count alone could not tell anyone whether the
          openings were worth a click. */}
      <div className="min-h-0 flex-1 overflow-y-auto p-5 pt-4">
        <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-black/45">
          <Briefcase className="h-3.5 w-3.5" />
          {company.openRoles > 0
            ? `${company.openRoles} open ${company.openRoles === 1 ? 'role' : 'roles'}`
            : 'Open roles'}
        </p>

        {loadingJobs && <p className="mt-3 text-sm text-black/45">Loading roles…</p>}

        {!loadingJobs && jobs.length === 0 && (
          <p className="mt-3 text-sm text-black/45">
            No individual roles stored yet — use “View careers” for their listings.
          </p>
        )}

        <ul className="mt-3 space-y-3">
          {jobs.map((job) => {
            const posted = postedLabel(job.postedAt);
            const meta = [job.seniority, job.employmentType, job.location].filter(Boolean).join(' · ');
            return (
              <li key={job.jobKey} className="border-b border-black/8 pb-3 last:border-0 last:pb-0">
                {job.jobUrl ? (
                  <a
                    href={job.jobUrl}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="text-sm font-medium leading-snug text-black underline-offset-2 hover:underline"
                    style={{ color: BLUE }}
                  >
                    {job.title}
                  </a>
                ) : (
                  <span className="text-sm font-medium leading-snug text-black">{job.title}</span>
                )}
                {meta && <p className="mt-0.5 text-xs text-black/50">{meta}</p>}
                {posted && <p className="mt-0.5 text-xs text-black/35">Posted {posted}</p>}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

export default function JobMap() {
  const [companies, setCompanies] = useState<Record<string, HiringCompany>>({});
  const [selected, setSelected] = useState<HiringCompany | null>(null);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [loadingView, setLoadingView] = useState(false);
  const [notice, setNotice] = useState('');
  // Viewports already fetched: panning back somewhere seen costs no query.
  const seenViews = useRef<Set<string>>(new Set());
  // Areas already offered to discovery this session, on a coarse grid.
  const triedAreas = useRef<Set<string>>(new Set());
  const [discovering, setDiscovering] = useState('');

  const merge = useCallback((rows: HiringCompany[]) => {
    if (!rows.length) return;
    setCompanies((prev) => {
      const next = { ...prev };
      for (const row of rows) {
        const existing = next[row.domain];
        if (!existing) {
          next[row.domain] = row;
          continue;
        }
        // Freshness wins over role count: a refresh that legitimately finds
        // fewer openings must replace the older row, not lose to it. Only when
        // neither is newer does the richer record win.
        const incoming = row.lastEnrichedAt ? Date.parse(row.lastEnrichedAt) : 0;
        const current = existing.lastEnrichedAt ? Date.parse(existing.lastEnrichedAt) : 0;
        if (incoming > current || (incoming === current && row.openRoles > existing.openRoles)) {
          next[row.domain] = row;
        }
      }
      const keys = Object.keys(next);
      if (keys.length <= MAX_LOADED) return next;
      // Bound memory on a long browsing session: keep the densest hirers.
      const trimmed: Record<string, HiringCompany> = {};
      for (const key of keys
        .sort((a, b) => next[b].openRoles - next[a].openRoles)
        .slice(0, MAX_LOADED)) {
        trimmed[key] = next[key];
      }
      return trimmed;
    });
  }, []);

  const handleViewport = useCallback(
    async (bounds: MapBounds, zoom: number, placeName: string) => {
      const key = viewKey(bounds, zoom);
      if (seenViews.current.has(key)) return;
      seenViews.current.add(key);

      setLoadingView(true);
      // Zoomed in, the viewport is small enough to show everything in it; zoomed
      // out, cap the page so a world view does not pull the whole table.
      const rows = await browseCompaniesInBounds(bounds, zoom >= 6 ? 400 : 200);
      setLoadingView(false);
      merge(rows);

      // Read-through: fetch when the area is empty, and also when what we have
      // has gone stale. Deliberately gated -- this is the one path where moving
      // the map can cost money.
      if (zoom < DISCOVER_MIN_ZOOM) return;
      const sparse = rows.length < DISCOVER_WHEN_FEWER_THAN;
      if (!sparse && !isStale(rows)) return;

      // No place label under the centre means open water or somewhere too
      // coarse to search, and there is nothing meaningful to ask for.
      if (!placeName) return;

      const areaKey = placeName.toLowerCase();
      if (triedAreas.current.has(areaKey)) return;
      triedAreas.current.add(areaKey);

      setDiscovering(
        sparse
          ? `Looking for companies hiring in ${placeName}…`
          : `Refreshing ${placeName}…`,
      );
      const found = await discoverArea(placeName);
      setDiscovering('');

      if (found.companies.length) {
        merge(found.companies);
        setNotice(
          sparse
            ? `Found ${found.companies.length} hiring in ${found.resolvedCity || placeName}.`
            : `Refreshed ${found.resolvedCity || placeName} — ${found.companies.length} hiring.`,
        );
      } else if (!found.error) {
        setNotice('Nothing hiring found in this area yet.');
      }
    },
    [merge],
  );

  const placed = useMemo(() => fanOutCoLocated(Object.values(companies)), [companies]);

  const geojson = useMemo(
    () => ({
      type: 'FeatureCollection' as const,
      features: placed.map((company) => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [company.lng, company.lat] },
        properties: { domain: company.domain },
      })),
    }),
    [placed],
  );

  const handleSearch = async (event: React.FormEvent) => {
    event.preventDefault();
    const term = query.trim();
    if (!term || searching) return;

    setSearching(true);
    setNotice('');
    const result = await searchCompanies(term);
    setSearching(false);

    if (result.error) {
      setNotice(result.error);
      return;
    }
    if (!result.companies.length) {
      setNotice('Nothing found for that search yet.');
      return;
    }
    merge(result.companies);
    setNotice(
      result.source === 'orthogonal'
        ? `Found ${result.companies.length} — added to the map.`
        : `${result.companies.length} already on the map.`,
    );
  };

  return (
    <div className="relative flex-1 overflow-hidden">
      <Map
        center={[-40, 30]}
        zoom={1.8}
        projection={{ type: 'globe' }}
        minZoom={1.2}
        // Past 14 the OSM building extrusions appear; stopping at 14 would have
        // meant never actually seeing them.
        maxZoom={18}
        maxPitch={70}
        theme="light"
        styles={{ light: OSM_3D_STYLE, dark: OSM_3D_STYLE }}
      >
        <ViewportWatcher onSettle={handleViewport} />
        <MapClusterLayer
          data={geojson}
          clusterMaxZoom={9}
          clusterRadius={45}
          clusterColors={['#8ecbf5', '#3aa8ef', '#0b6cab']}
          clusterThresholds={[25, 150]}
          pointColor={BLUE}
          onPointClick={(feature) => {
            const domain = String(feature.properties?.domain || '');
            if (domain && companies[domain]) setSelected(companies[domain]);
          }}
        />
      </Map>

      {/* Search — the only action that can discover new companies. */}
      <form onSubmit={handleSearch} className="absolute left-4 top-4 z-30 w-[320px] max-w-[calc(100vw-2rem)]">
        <div className="flex items-center gap-2 border border-black/12 bg-[#fdf9f7] px-3 py-2 shadow-[0_6px_24px_rgba(0,0,0,0.10)]">
          <Search className="h-4 w-4 shrink-0 text-black/40" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Startups hiring in Berlin…"
            aria-label="Search companies that are hiring"
            className="w-full bg-transparent text-sm text-black outline-none placeholder:text-black/35"
          />
          <button
            type="submit"
            disabled={searching || !query.trim()}
            className="shrink-0 px-2 py-1 text-xs font-medium text-white transition-opacity disabled:opacity-40"
            style={{ background: BLUE }}
          >
            {searching ? '…' : 'Search'}
          </button>
        </div>

        <p className="mt-2 bg-[#fdf9f7]/90 px-2 py-1 text-xs text-black/55 backdrop-blur">
          {discovering ||
            notice ||
            (loadingView
              ? 'Loading this area…'
              : placed.length > 0
                ? `${placed.length} ${placed.length === 1 ? 'company' : 'companies'} on the map`
                : 'Zoom in or search to fill the map.')}
        </p>
      </form>

      {selected && <CompanyPanel company={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
