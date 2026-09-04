import { Bookmark, Trash2, X } from 'lucide-react';
import { removeSaved, useSavedJobs } from '@/lib/saved-jobs';

/**
 * The roles someone bookmarked, across every company and city.
 *
 * Saving is only worth anything if the saved things can be found again without
 * remembering which pin they were behind, so this reads from localStorage
 * rather than the map's loaded companies.
 */

const savedLabel = (savedAt: string) => {
  const ms = Date.parse(savedAt);
  if (!Number.isFinite(ms)) return '';
  const days = Math.floor((Date.now() - ms) / 86_400_000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  return `${days}d ago`;
};

export function SavedPanel({
  onClose,
  onPickCompany,
}: {
  onClose: () => void;
  onPickCompany: (domain: string) => void;
}) {
  const saved = useSavedJobs();
  const jobs = Object.values(saved).sort((a, b) => b.savedAt.localeCompare(a.savedAt));

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
          <Bookmark className="h-4 w-4" style={{ color: '#16a34a' }} />
          Saved roles
        </h2>
        <p className="mt-1 text-xs text-black/50">
          {jobs.length ? `${jobs.length} saved on this device` : 'Nothing saved yet'}
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-5 pt-4">
        {!jobs.length && (
          <p className="text-sm text-black/45">
            Open a company and tap the bookmark on a role to keep it here.
          </p>
        )}

        <ul className="space-y-3">
          {jobs.map((job) => (
            <li
              key={job.key}
              className="flex items-start gap-2 border-b border-black/8 pb-3 last:border-0 last:pb-0"
            >
              <div className="min-w-0 flex-1">
                {job.jobUrl ? (
                  <a
                    href={job.jobUrl}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="text-sm font-medium leading-snug underline-offset-2 hover:underline"
                    style={{ color: '#1d9bf0' }}
                  >
                    {job.title}
                  </a>
                ) : (
                  <span className="text-sm font-medium leading-snug text-black">{job.title}</span>
                )}
                <p className="mt-0.5 text-xs text-black/50">
                  <button
                    type="button"
                    onClick={() => onPickCompany(job.domain)}
                    className="underline-offset-2 hover:underline"
                  >
                    {job.company}
                  </button>
                  {job.location ? ` · ${job.location}` : ''}
                </p>
                <p className="mt-0.5 text-xs text-black/35">Saved {savedLabel(job.savedAt)}</p>
              </div>

              <button
                type="button"
                onClick={() => removeSaved(job.key)}
                aria-label={`Remove ${job.title}`}
                className="shrink-0 p-0.5 text-black/25 transition-colors hover:text-black/60"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
