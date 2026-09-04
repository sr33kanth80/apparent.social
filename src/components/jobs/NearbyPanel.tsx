import { useMemo } from 'react';
import { Compass, X } from 'lucide-react';
import { metresBetween } from '@/components/jobs/scatter';
import type { HiringCompany } from '@/lib/apparent-types';

/**
 * Who is hiring around the viewer, nearest first.
 *
 * The map already shows this spatially, but "nearest first" is the one ordering
 * a map cannot express — and it is exactly the question someone asks when they
 * want a job they can commute to.
 */

const distanceLabel = (metres: number) => {
  if (metres < 950) return `${Math.round(metres / 50) * 50}m`;
  return `${(metres / 1000).toFixed(metres < 9500 ? 1 : 0)}km`;
};

export function NearbyPanel({
  origin,
  companies,
  status,
  onClose,
  onPick,
}: {
  origin: { latitude: number; longitude: number } | null;
  companies: HiringCompany[];
  status: string;
  onClose: () => void;
  onPick: (company: HiringCompany) => void;
}) {
  const ranked = useMemo(() => {
    if (!origin) return [];
    return companies
      .filter((company) => company.latitude != null && company.longitude != null)
      .map((company) => ({
        company,
        metres: metresBetween(
          [origin.longitude, origin.latitude],
          [company.longitude as number, company.latitude as number],
        ),
      }))
      .sort((a, b) => a.metres - b.metres)
      .slice(0, 50);
  }, [companies, origin]);

  return (
    <div className="absolute left-4 top-[5.5rem] z-20 flex max-h-[calc(100%-7rem)] w-[340px] max-w-[calc(100vw-2rem)] flex-col border border-black/12 bg-[#fdf9f7] shadow-[0_10px_40px_rgba(0,0,0,0.14)]">
      <div className="relative shrink-0 border-b border-black/10 p-5 pb-4">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 text-black/40 transition-colors hover:text-black"
        >
          <X className="h-4 w-4" />
        </button>
        <h2 className="flex items-center gap-2 pr-6 font-serif text-xl leading-tight text-black">
          <Compass className="h-4 w-4" style={{ color: '#16a34a' }} />
          Hiring near you
        </h2>
        <p className="mt-1 text-xs text-black/50">
          {status || (ranked.length ? `${ranked.length} nearest, closest first` : 'Nothing found yet')}
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-5 pt-4">
        <ul className="space-y-3">
          {ranked.map(({ company, metres }) => (
            <li key={company.domain} className="border-b border-black/8 pb-3 last:border-0 last:pb-0">
              <button
                type="button"
                onClick={() => onPick(company)}
                className="flex w-full items-baseline gap-2 text-left"
              >
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-black underline-offset-2 hover:underline">
                  {company.name}
                </span>
                <span className="shrink-0 text-xs tabular-nums text-black/45">
                  {distanceLabel(metres)}
                </span>
              </button>
              <p className="mt-0.5 text-xs text-black/50">
                {company.openRoles > 0
                  ? `${company.openRoles} open ${company.openRoles === 1 ? 'role' : 'roles'}`
                  : 'Hiring'}
                {company.city ? ` · ${company.city}` : ''}
                {/* A centroid is not an address; saying so keeps the distance honest. */}
                {company.geoPrecision !== 'exact' ? ' · approximate' : ''}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
