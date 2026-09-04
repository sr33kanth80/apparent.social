import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, Bookmark, Briefcase, MapPin, X } from 'lucide-react';
import { fetchCompanyRoles, loadJobsForCompany } from '@/lib/jobs-service';
import { savedKey, toggleSaved, useSavedJobs } from '@/lib/saved-jobs';
import { SORTS, sortJobs, type SortKey } from '@/components/jobs/sort-jobs';
import type { CompanyJob, HiringCompany } from '@/lib/apparent-types';

const BLUE = '#1d9bf0';
/** Same green as the map pins, so a saved role reads as part of the map. */
const GREEN = '#16a34a';

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

export function CompanyPanel({ company, onClose }: { company: HiringCompany; onClose: () => void }) {
  const [jobs, setJobs] = useState<CompanyJob[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [sort, setSort] = useState<SortKey>('fresh');
  const [savedOnly, setSavedOnly] = useState(false);
  const saved = useSavedJobs();

  const shown = useMemo(() => {
    const filtered = savedOnly
      ? jobs.filter((job) => saved[savedKey(company.domain, job.jobKey)])
      : jobs;
    return sortJobs(filtered, sort);
  }, [jobs, saved, savedOnly, sort, company.domain]);

  useEffect(() => {
    let mounted = true;
    setLoadingJobs(true);
    setJobs([]);

    (async () => {
      const stored = await loadJobsForCompany(company.domain).catch(() => []);
      if (!mounted) return;

      if (stored.length || company.openRoles === 0) {
        setJobs(stored);
        setLoadingJobs(false);
        return;
      }

      // A role count with nothing behind it: the roles were never stored for
      // this company, either because a city-wide discovery only kept the first
      // few pages or because it predates roles being stored at all. Fetch
      // them now rather than showing a number we cannot substantiate.
      const added = await fetchCompanyRoles(company.domain, company.name, company.city);
      if (!mounted) return;

      const refreshed = added ? await loadJobsForCompany(company.domain).catch(() => []) : [];
      if (!mounted) return;
      setJobs(refreshed);
      setLoadingJobs(false);
    })();

    return () => {
      mounted = false;
    };
  }, [company.domain, company.name, company.city, company.openRoles]);

  return (
    <div className="absolute right-4 top-[5.5rem] z-20 flex max-h-[calc(100%-7rem)] w-[340px] max-w-[calc(100vw-2rem)] flex-col border border-black/12 bg-[#fdf9f7] shadow-[0_10px_40px_rgba(0,0,0,0.14)]">
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
            Couldn’t list these individually — use “View careers” for their listings.
          </p>
        )}

        {/* Sorting only earns its space once there is more than one role. */}
        {jobs.length > 1 && (
          <div className="mt-3 flex items-center gap-2">
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as SortKey)}
              aria-label="Sort roles"
              className="rounded-md border border-black/12 bg-white px-2 py-1 text-xs text-black/70 outline-none transition-colors hover:border-black/25"
            >
              {SORTS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setSavedOnly((value) => !value)}
              aria-pressed={savedOnly}
              className="flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition-colors"
              style={
                savedOnly
                  ? { borderColor: GREEN, background: GREEN, color: '#fff' }
                  : { borderColor: 'rgba(0,0,0,0.12)', color: 'rgba(0,0,0,0.6)' }
              }
            >
              <Bookmark className={`h-3 w-3 ${savedOnly ? 'fill-current' : ''}`} />
              Saved
            </button>
          </div>
        )}

        {!loadingJobs && jobs.length > 0 && shown.length === 0 && (
          <p className="mt-3 text-sm text-black/45">No saved roles here yet.</p>
        )}

        <ul className="mt-3 space-y-3">
          {shown.map((job) => {
            const posted = postedLabel(job.postedAt);
            const meta = [job.seniority, job.employmentType, job.location].filter(Boolean).join(' · ');
            const key = savedKey(company.domain, job.jobKey);
            const isSaved = Boolean(saved[key]);
            return (
              <li
                key={job.jobKey}
                className="flex items-start gap-2 border-b border-black/8 pb-3 last:border-0 last:pb-0"
              >
                <div className="min-w-0 flex-1">
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
                </div>

                <button
                  type="button"
                  aria-pressed={isSaved}
                  aria-label={isSaved ? `Unsave ${job.title}` : `Save ${job.title}`}
                  title={isSaved ? 'Saved' : 'Save this role'}
                  onClick={() =>
                    toggleSaved({
                      key,
                      domain: company.domain,
                      company: company.name,
                      title: job.title,
                      jobUrl: job.jobUrl,
                      location: job.location || company.city,
                      postedAt: job.postedAt,
                    })
                  }
                  className="shrink-0 p-0.5 transition-colors"
                  style={{ color: isSaved ? GREEN : 'rgba(0,0,0,0.28)' }}
                >
                  <Bookmark className={`h-4 w-4 ${isSaved ? 'fill-current' : ''}`} />
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

