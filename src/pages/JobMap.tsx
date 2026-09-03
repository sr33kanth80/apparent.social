import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { browseCompanies, discoverArea } from '@/lib/jobs-service';
import type { HiringCompany } from '@/lib/apparent-types';
import { IsoMap, type IsoMapHandle } from '@/components/jobs/IsoMap';
import { CompanyPanel } from '@/components/jobs/CompanyPanel';
import { CommandPalette } from '@/components/jobs/CommandPalette';
import { JobsHeader } from '@/components/jobs/JobsHeader';
import { AddCompanyModal, ReportProblemModal } from '@/components/jobs/SubmissionModals';

/**
 * Jobs Map — a stylised isometric city of companies that are hiring.
 *
 * Buildings are grid plots, not real geography: the data resolves a company to
 * a CITY, and pretending to know its exact building would be a lie the map
 * tells confidently. Storey count is real, though — it comes from how many
 * roles are open, so the skyline is the data.
 *
 * Everything shown originates live from Orthogonal; the table behind it is a
 * read-through cache, not a corpus.
 */

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
  const mapRef = useRef<IsoMapHandle | null>(null);
  // Cities already refreshed this session, so switching back and forth does not
  // re-bill the same place.
  const refreshed = useRef<Set<string>>(new Set());

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

  const visible = useMemo(
    () => (activeCity ? all.filter((company) => company.city === activeCity) : all),
    [all, activeCity],
  );

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
    <div className="relative flex-1 overflow-hidden bg-[#f4efe9]">
      <IsoMap
        ref={mapRef}
        companies={visible}
        selectedDomain={selected?.domain ?? null}
        onSelect={setSelected}
      />

      <JobsHeader
        cities={cities}
        activeCity={activeCity}
        onCityChange={(city) => {
          setActiveCity(city);
          setSelected(null);
        }}
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
                } · drag to pan, scroll to zoom, double-click to enter`
              : 'Pick a city to start')}
        </p>
      </div>

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
