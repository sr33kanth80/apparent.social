import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, Briefcase, MapPin, Search, X } from 'lucide-react';
import { Map, MapClusterLayer, useMap } from '@/components/ui/map';
import { browseCompaniesInBounds, searchCompanies, type MapBounds } from '@/lib/jobs-service';
import type { HiringCompany } from '@/lib/apparent-types';

/**
 * Jobs Map — companies that are hiring, plotted by city.
 *
 * Company-level like wherewework: a pin is a company, the click-through goes to
 * that company's own careers page, and Apparent never hosts the listings.
 *
 * Loading is viewport-driven, the way a property search behaves: panning or
 * zooming fetches what is actually in view rather than one fixed global page.
 * Those reads hit the companies table directly under public RLS, so moving the
 * map is free; only an explicit search can call Orthogonal and discover new
 * companies.
 */

const BLUE = '#1d9bf0';
const MAX_LOADED = 2000;

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
 * Reports the viewport once the map settles. Debounced so a drag or pinch
 * issues one query instead of one per frame.
 */
function ViewportWatcher({ onSettle }: { onSettle: (bounds: MapBounds, zoom: number) => void }) {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!map || !isLoaded) return undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const report = () => {
      const bounds = map.getBounds();
      onSettle(
        {
          west: bounds.getWest(),
          south: bounds.getSouth(),
          east: bounds.getEast(),
          north: bounds.getNorth(),
        },
        map.getZoom(),
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

function CompanyPanel({ company, onClose }: { company: HiringCompany; onClose: () => void }) {
  return (
    <div className="absolute right-4 top-4 z-30 w-[320px] max-w-[calc(100vw-2rem)] border border-black/12 bg-[#fdf9f7] p-5 shadow-[0_10px_40px_rgba(0,0,0,0.14)]">
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

      {company.oneLiner && <p className="mt-3 text-sm leading-relaxed text-black/70">{company.oneLiner}</p>}

      {company.openRoles > 0 && (
        <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-black/80">
          <Briefcase className="h-4 w-4" />
          {company.openRoles} open {company.openRoles === 1 ? 'role' : 'roles'}
        </p>
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

  const merge = useCallback((rows: HiringCompany[]) => {
    if (!rows.length) return;
    setCompanies((prev) => {
      const next = { ...prev };
      for (const row of rows) {
        const existing = next[row.domain];
        // Keep whichever record knows about more roles.
        if (!existing || row.openRoles > existing.openRoles) next[row.domain] = row;
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
    async (bounds: MapBounds, zoom: number) => {
      const key = viewKey(bounds, zoom);
      if (seenViews.current.has(key)) return;
      seenViews.current.add(key);

      setLoadingView(true);
      // Zoomed in, the viewport is small enough to show everything in it; zoomed
      // out, cap the page so a world view does not pull the whole table.
      const rows = await browseCompaniesInBounds(bounds, zoom >= 6 ? 400 : 200);
      setLoadingView(false);
      merge(rows);
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
        maxZoom={14}
        theme="light"
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
          {notice ||
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
