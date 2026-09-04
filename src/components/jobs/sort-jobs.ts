import type { CompanyJob } from '@/lib/apparent-types';

/** How a company's open roles are ordered in the panel. */
export type SortKey = 'fresh' | 'oldest' | 'title';

export const SORTS: { value: SortKey; label: string }[] = [
  { value: 'fresh', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'title', label: 'A–Z' },
];

/**
 * Providers frequently give no posting date at all. Treating a missing date as
 * epoch would bury every dated role under the undated ones when sorting oldest
 * first, so undated roles sort last in both directions instead.
 */
const postedMs = (job: Pick<CompanyJob, 'postedAt'>) => {
  const ms = job.postedAt ? Date.parse(job.postedAt) : NaN;
  return Number.isFinite(ms) ? ms : null;
};

export const sortJobs = <T extends Pick<CompanyJob, 'title' | 'postedAt'>>(
  jobs: T[],
  sort: SortKey,
): T[] =>
  [...jobs].sort((a, b) => {
    if (sort === 'title') return a.title.localeCompare(b.title);
    const left = postedMs(a);
    const right = postedMs(b);
    if (left === null && right === null) return 0;
    if (left === null) return 1;
    if (right === null) return -1;
    return sort === 'fresh' ? right - left : left - right;
  });
