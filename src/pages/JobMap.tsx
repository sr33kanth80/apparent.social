import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, Briefcase, MapPin, Search, X } from 'lucide-react';
import { Map, MapMarker, MarkerContent } from '@/components/ui/map';
import { browseCompanies, searchCompanies } from '@/lib/jobs-service';
import type { HiringCompany } from '@/lib/apparent-types';

/**
 * Jobs Map — companies that are hiring, plotted by city.
 *
 * Company-level like wherewework: a pin is a company, its size reflects how
 * many roles are open, and the click-through goes to that company's own careers
 * page. Apparent never hosts the listings.
 *
 * The map paints from the local corpus on load (free) and only calls /api/jobs
 * when the visitor explicitly searches, which is what can discover new
 * companies and grow the corpus for everyone after.
 */

const BLUE = '#1d9bf0';

/** Pin scales with open roles so dense hirers read at a glance. */
const pinSize = (openRoles: number) => {
  if (openRoles >= 50) return 30;
  if (openRoles >= 20) return 25;
  if (openRoles >= 5) return 21;
  return 18;
};

// Plain object, not a Map: the map component imported above shadows the global
// Map constructor in this module.
const dedupe = (rows: HiringCompany[]) => {
  const byDomain: Record<string, HiringCompany> = {};
  for (const row of rows) {
    const existing = byDomain[row.domain];
    // Keep whichever record knows about more roles.
    if (!existing || row.openRoles > existing.openRoles) byDomain[row.domain] = row;
  }
  return Object.values(byDomain);
};

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
  const [companies, setCompanies] = useState<HiringCompany[]>([]);
  const [selected, setSelected] = useState<HiringCompany | null>(null);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [notice, setNotice] = useState('');

  // Free path: paint whatever has already been discovered.
  useEffect(() => {
    let mounted = true;
    browseCompanies()
      .then((rows) => {
        if (mounted) setCompanies(dedupe(rows));
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, []);

  const pinned = useMemo(
    () => companies.filter((c) => c.latitude != null && c.longitude != null),
    [companies],
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
    // Merge rather than replace: the map is cumulative.
    setCompanies((prev) => dedupe([...result.companies, ...prev]));
    setNotice(
      result.source === 'orthogonal'
        ? `Found ${result.companies.length} — added to the map.`
        : `${result.companies.length} already on the map.`,
    );
  };

  return (
    <div className="relative flex-1 overflow-hidden">
      <Map center={[-40, 30]} zoom={1.8} projection={{ type: 'globe' }} minZoom={1.2} maxZoom={12} theme="light">
        {pinned.map((company) => {
          const size = pinSize(company.openRoles);
          return (
            <MapMarker
              key={company.domain}
              longitude={company.longitude as number}
              latitude={company.latitude as number}
              anchor="bottom"
              onClick={() => setSelected(company)}
            >
              <MarkerContent>
                <MapPin
                  style={{ height: size, width: size }}
                  className="drop-shadow-[0_6px_10px_rgba(0,0,0,0.35)]"
                  color="#0b6cab"
                  fill={BLUE}
                  strokeWidth={1.5}
                />
              </MarkerContent>
            </MapMarker>
          );
        })}
      </Map>

      {/* Search — the only action that can discover new companies. */}
      <form
        onSubmit={handleSearch}
        className="absolute left-4 top-4 z-30 w-[320px] max-w-[calc(100vw-2rem)]"
      >
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

        {(notice || pinned.length > 0) && (
          <p className="mt-2 bg-[#fdf9f7]/90 px-2 py-1 text-xs text-black/55 backdrop-blur">
            {notice || `${pinned.length} ${pinned.length === 1 ? 'company' : 'companies'} hiring`}
          </p>
        )}
      </form>

      {selected && <CompanyPanel company={selected} onClose={() => setSelected(null)} />}

      {/* First-run state: the corpus is empty until someone searches. */}
      {pinned.length === 0 && !searching && (
        <div className="pointer-events-none absolute bottom-8 left-1/2 z-20 -translate-x-1/2 text-center">
          <p className="bg-[#fdf9f7]/90 px-4 py-2 text-sm text-black/60 backdrop-blur">
            Search a city or sector to start filling the map.
          </p>
        </div>
      )}
    </div>
  );
}
