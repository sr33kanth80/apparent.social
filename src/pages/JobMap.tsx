import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  browseCompanies,
  browseCompaniesInBounds,
  discoverArea,
  resolvePreciseLocations,
} from '@/lib/jobs-service';
import type { HiringCompany } from '@/lib/apparent-types';
import { CityMap3D, type CityMap3DHandle, type MapView } from '@/components/jobs/CityMap3D';
import { CompanyPanel } from '@/components/jobs/CompanyPanel';
import { CommandPalette } from '@/components/jobs/CommandPalette';
import { JobsHeader } from '@/components/jobs/JobsHeader';
import { AddCompanyModal, ReportProblemModal } from '@/components/jobs/SubmissionModals';
import { SavedPanel } from '@/components/jobs/SavedPanel';
import { NearbyPanel } from '@/components/jobs/NearbyPanel';
import { decideDiscovery } from '@/components/jobs/explore-policy';
import { useSavedJobs } from '@/lib/saved-jobs';

/**
 * Jobs Map — a real 3D city of companies that are hiring.
 *
 * Buildings are genuine OpenStreetMap footprints extruded to their tagged
 * heights, and companies are placed on the actual office the geocoder resolves
 * for them. Markers that could not be resolved fall back to the city centroid
 * and are drawn as approximate, so the map never claims a precision it lacks.
 *
 * Everything shown originates live from Orthogonal; the table behind it is a
 * read-through cache, not a corpus.
 */

/**
 * Zoom at which panning starts discovering. Below it the view spans several
 * cities and the label under the crosshair is not what the viewer is looking at.
 */
const DISCOVER_MIN_ZOOM = 12;

/**
 * How many places one session will discover on its own.
 *
 * Every discovery is billed, and a long drag across a continent crosses dozens
 * of cities. Deliberate acts — picking a city, searching, Near me — are not
 * capped; only what happens without anyone asking.
 */
const AUTO_DISCOVERY_LIMIT = 8;

/** How stale cached rows may be before looking at a city refreshes them. */
const STALE_AFTER_MS = 30 * 60 * 1000;

const isStale = (rows: HiringCompany[]) => {
  if (!rows.length) return true;
  let newest = 0;
  for (const row of rows) {
    const ms = row.lastEnrichedAt ? Date.parse(row.lastEnrichedAt) : NaN;
    if (Number.isFinite(ms) && ms > newest) newest = ms;
  }
  // No timestamp at all predates freshness tracking: treat as stale.
  return newest === 0 || Date.now() - newest > STALE_AFTER_MS;
};

export default function JobMap() {
  const [companies, setCompanies] = useState<Record<string, HiringCompany>>({});
  const [selected, setSelected] = useState<HiringCompany | null>(null);
  const [activeCity, setActiveCity] = useState('');
  const [status, setStatus] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [minRoles, setMinRoles] = useState(0);
  const [savedOpen, setSavedOpen] = useState(false);
  const [nearbyOpen, setNearbyOpen] = useState(false);
  const [origin, setOrigin] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const saved = useSavedJobs();
  const mapRef = useRef<CityMap3DHandle | null>(null);
  // Cities already refreshed this session, so switching back and forth does not
  // re-bill the same place.
  const refreshed = useRef<Set<string>>(new Set());
  const autoDiscoveries = useRef(0);

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
        // Freshness beats role count: a refresh that legitimately finds fewer
        // openings must replace the older row, not lose to it.
        const incoming = row.lastEnrichedAt ? Date.parse(row.lastEnrichedAt) : 0;
        const current = existing.lastEnrichedAt ? Date.parse(existing.lastEnrichedAt) : 0;
        if (incoming > current || (incoming === current && row.openRoles > existing.openRoles)) {
          next[row.domain] = row;
        }
      }
      return next;
    });
  }, []);

  // Paint from the cache immediately: it costs nothing and the city is up fast.
  useEffect(() => {
    let mounted = true;
    browseCompanies(600)
      .then((rows) => {
        if (!mounted) return;
        merge(rows);
        // Open on the busiest city rather than an empty "all cities" sprawl.
        const byCity = new Map<string, number>();
        for (const row of rows) {
          if (row.city) byCity.set(row.city, (byCity.get(row.city) ?? 0) + 1);
        }
        const busiest = [...byCity.entries()].sort((a, b) => b[1] - a[1])[0];
        if (busiest) setActiveCity(busiest[0]);
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, [merge]);

  const all = useMemo(() => Object.values(companies), [companies]);

  const cities = useMemo(() => {
    const counts = new Map<string, number>();
    for (const company of all) {
      if (company.city) counts.set(company.city, (counts.get(company.city) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([city]) => city);
  }, [all]);

  const visible = useMemo(() => {
    let rows = activeCity ? all.filter((company) => company.city === activeCity) : all;
    if (minRoles > 0) rows = rows.filter((company) => company.openRoles >= minRoles);
    return rows;
  }, [all, activeCity, minRoles]);

  /**
   * Where to point the camera when the city changes.
   *
   * Median, not mean: office coordinates are allowed to sit up to 75km from
   * their city, and a single outlying suburb drags an average to a point
   * halfway between — which is some field with nothing in it. The median
   * ignores the outlier and lands where the companies actually are.
   */
  const centre = useMemo(() => {
    const points = visible.filter((c) => c.latitude != null && c.longitude != null);
    if (!points.length) return null;
    const middle = (values: number[]) => {
      const sorted = [...values].sort((a, b) => a - b);
      return sorted[Math.floor(sorted.length / 2)];
    };
    return {
      latitude: middle(points.map((c) => c.latitude as number)),
      longitude: middle(points.map((c) => c.longitude as number)),
    };
  }, [visible]);

  /**
   * Pull the visible companies onto their real buildings.
   *
   * Batched and capped because each is a paid geocode, and only ever requested
   * for companies still sitting on a city centroid — the server stores the
   * result, so a company is resolved once and never again.
   */
  const resolving = useRef<Set<string>>(new Set());
  useEffect(() => {
    const pending = visible
      .filter((c) => c.geoPrecision !== 'exact' && !resolving.current.has(c.domain))
      .slice(0, 12);
    if (!pending.length) return;

    pending.forEach((c) => resolving.current.add(c.domain));
    let mounted = true;
    resolvePreciseLocations(
      pending.map((c) => ({ domain: c.domain, name: c.name, city: c.city })),
    )
      .then((located) => {
        if (!mounted || !located.length) return;
        setCompanies((prev) => {
          const next = { ...prev };
          for (const hit of located) {
            const row = next[hit.domain];
            if (row) {
              next[hit.domain] = {
                ...row,
                latitude: hit.latitude,
                longitude: hit.longitude,
                geoPrecision: 'exact',
              };
            }
          }
          return next;
        });
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, [visible]);

  /** Read-through: opening a city refreshes it when what we hold has gone stale. */
  useEffect(() => {
    if (!activeCity || refreshed.current.has(activeCity)) return;
    const rows = all.filter((company) => company.city === activeCity);
    if (!isStale(rows)) return;

    refreshed.current.add(activeCity);
    let mounted = true;
    setStatus(rows.length ? `Refreshing ${activeCity}…` : `Finding companies in ${activeCity}…`);

    discoverArea(activeCity)
      .then((result) => {
        if (!mounted) return;
        merge(result.companies);
        setStatus(
          result.error ||
            (result.companies.length
              ? `${result.companies.length} hiring in ${activeCity}.`
              : `Nothing hiring found in ${activeCity} yet.`),
        );
        window.setTimeout(() => mounted && setStatus(''), 4000);
      })
      .catch(() => undefined);

    return () => {
      mounted = false;
    };
  }, [activeCity, all, merge]);

  /**
   * Load whatever is where the viewer just arrived.
   *
   * Two halves, deliberately unequal. Reading the viewport is free, so it runs
   * on every settled view and is what makes pinning feel continuous — pins
   * appear as you travel rather than only when a city is picked. Discovery is
   * paid, so it needs a named place, a close enough zoom, and a session cap.
   */
  const handleExplore = useCallback(
    (view: MapView) => {
      browseCompaniesInBounds(view.bounds, 300).then(merge).catch(() => undefined);

      // Panning away from the chosen city drops the filter, otherwise every
      // company found along the way would be loaded and then hidden. Only a
      // real drag counts: the opening flight to the busiest city would
      // otherwise undo the city it had just chosen.
      if (view.userDriven && view.place && activeCity && view.place !== activeCity) {
        setActiveCity('');
      }

      const held = all.filter((company) => company.city === view.place);
      const verdict = decideDiscovery({
        place: view.place,
        zoom: view.zoom,
        minZoom: DISCOVER_MIN_ZOOM,
        seen: refreshed.current,
        autoDiscoveries: autoDiscoveries.current,
        limit: AUTO_DISCOVERY_LIMIT,
        holdsFresh: held.length > 0 && !isStale(held),
      });
      // Remembering a place we deliberately skipped stops it being reconsidered
      // on every small pan around it.
      if (verdict === 'held-fresh') refreshed.current.add(view.place);
      if (verdict !== 'discover') return;

      refreshed.current.add(view.place);
      autoDiscoveries.current += 1;
      setStatus(`Looking for who’s hiring in ${view.place}…`);

      discoverArea(view.place)
        .then((result) => {
          merge(result.companies);
          setStatus(
            result.error ||
              (result.companies.length
                ? `${result.companies.length} hiring in ${view.place}.`
                : `Nothing hiring found in ${view.place} yet.`),
          );
          window.setTimeout(() => setStatus(''), 4000);
        })
        .catch(() => undefined);
    },
    [activeCity, all, merge],
  );

  /**
   * Point the map at the viewer.
   *
   * Nothing else is needed: the camera move settles, and the explore handler
   * above loads and discovers whatever is around them, the same as if they had
   * panned there themselves.
   */
  const findNearMe = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus('This browser can’t share a location.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setOrigin({ latitude, longitude });
        setNearbyOpen(true);
        setSavedOpen(false);
        setSelected(null);
        // The city filter would hide everything found around a viewer who is
        // not in the city that happened to be selected.
        setActiveCity('');
        setLocating(false);
        mapRef.current?.flyToCity(latitude, longitude);
      },
      (error) => {
        setLocating(false);
        setStatus(
          error.code === error.PERMISSION_DENIED
            ? 'Location permission denied — pick a city instead.'
            : 'Couldn’t get your location.',
        );
        window.setTimeout(() => setStatus(''), 4000);
      },
      { timeout: 10_000, maximumAge: 300_000 },
    );
  }, []);

  // ⌘K / Ctrl+K anywhere on the page.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const focusCompany = useCallback(
    (company: HiringCompany) => {
      // Switch cities first when the match lives elsewhere, or its building is
      // not on the board for the camera to find.
      if (company.city && company.city !== activeCity) setActiveCity(company.city);
      setSelected(company);
      // Next frame: the new city has to lay out before the camera can fly to it.
      requestAnimationFrame(() => mapRef.current?.focusCompany(company.domain));
    },
    [activeCity],
  );

  return (
    <div className="relative flex-1 overflow-hidden bg-[#e9e3d9]">
      <CityMap3D
        ref={mapRef}
        companies={visible}
        selectedDomain={selected?.domain ?? null}
        onSelect={setSelected}
        centre={centre}
        centreKey={activeCity}
        onExplore={handleExplore}
      />

      <JobsHeader
        cities={cities}
        activeCity={activeCity}
        onCityChange={(city) => {
          setActiveCity(city);
          setSelected(null);
        }}
        minRoles={minRoles}
        onMinRolesChange={setMinRoles}
        savedCount={Object.keys(saved).length}
        onOpenSaved={() => {
          setSavedOpen((open) => !open);
          setNearbyOpen(false);
        }}
        onNearMe={findNearMe}
        locating={locating}
        onOpenSearch={() => setSearchOpen(true)}
        onAddCompany={() => setAddOpen(true)}
        onReportProblem={() => setReportOpen(true)}
      />

      {/* Quiet status line: what the map is doing, without covering it. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-4 z-20 flex justify-center px-4">
        <p className="rounded-full border border-black/8 bg-white/85 px-3.5 py-1.5 text-xs text-black/55 shadow-sm backdrop-blur">
          {status ||
            (visible.length
              ? `${visible.length} ${visible.length === 1 ? 'company' : 'companies'} hiring${
                  activeCity ? ` in ${activeCity}` : ''
                } · drag to pan, right-drag to orbit, scroll to zoom`
              : 'Pick a city to start')}
        </p>
      </div>

      {nearbyOpen && (
        <NearbyPanel
          origin={origin}
          companies={all}
          status={status}
          onClose={() => setNearbyOpen(false)}
          onPick={focusCompany}
        />
      )}

      {savedOpen && (
        <SavedPanel
          onClose={() => setSavedOpen(false)}
          onPickCompany={(domain) => {
            const company = companies[domain];
            if (company) focusCompany(company);
          }}
        />
      )}

      {selected && <CompanyPanel company={selected} onClose={() => setSelected(null)} />}

      <CommandPalette
        open={searchOpen}
        companies={all}
        onClose={() => setSearchOpen(false)}
        onPick={focusCompany}
      />

      {addOpen && <AddCompanyModal onClose={() => setAddOpen(false)} />}
      {reportOpen && <ReportProblemModal onClose={() => setReportOpen(false)} />}
    </div>
  );
}
