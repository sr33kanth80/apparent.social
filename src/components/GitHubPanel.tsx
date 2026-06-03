import { useEffect, useState } from 'react';
import { BadgeCheck, FolderGit2, Star, Users } from 'lucide-react';
import { GitHubIcon } from './GitHubIcon';

type GitHubData = {
  profile: { login: string; name: string; avatarUrl: string; htmlUrl: string };
  stats: { publicRepos: number; followers: number; stars: number; topLanguages: string[] };
};

const compact = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, '')}k` : String(n);

/** Pull the GitHub username (first path segment) out of a profile URL or handle. */
const extractLogin = (github: string): string => {
  const raw = (github || '').trim();
  if (!raw) return '';
  try {
    const url = new URL(raw.startsWith('http') ? raw : `https://${raw}`);
    if (!/(^|\.)github\.com$/i.test(url.hostname)) return '';
    return url.pathname.split('/').filter(Boolean)[0] || '';
  } catch {
    return raw.replace(/^@/, '').split('/')[0];
  }
};

/**
 * Live GitHub stats + contribution graph for a founder profile. Renders nothing
 * until data loads, and nothing at all if the username can't be resolved (so it
 * degrades gracefully to the plain GitHub link the profile already shows).
 */
export const GitHubPanel = ({
  github,
  verified = false,
}: {
  github: string;
  /** True when the founder proved account ownership via the gist-code check. */
  verified?: boolean;
}) => {
  const login = extractLogin(github);
  const [data, setData] = useState<GitHubData | null>(null);

  useEffect(() => {
    if (!login) return;
    let cancelled = false;
    fetch(`/api/github?username=${encodeURIComponent(login)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: GitHubData | null) => {
        if (!cancelled && d && d.profile) setData(d);
      })
      .catch(() => {
        /* leave panel hidden */
      });
    return () => {
      cancelled = true;
    };
  }, [login]);

  if (!login || !data) return null;

  const { stats } = data;
  const statItems = [
    { icon: Star, label: 'Stars', value: compact(stats.stars) },
    { icon: FolderGit2, label: 'Repos', value: compact(stats.publicRepos) },
    { icon: Users, label: 'Followers', value: compact(stats.followers) },
  ];

  return (
    <section className="mx-auto max-w-[82rem] border-t border-black/10 px-5 py-16 sm:px-8">
      <div className="mb-8 flex flex-wrap items-center gap-3">
        <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[#42520d]">GitHub</p>
        {verified && (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#42520d] px-2.5 py-1 text-[11px] font-semibold text-white">
            <BadgeCheck className="h-3.5 w-3.5" /> Ownership verified
          </span>
        )}
      </div>

      <div className="rounded-[28px] border border-black/10 bg-white/80 p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <a
            href={data.profile.htmlUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-sm font-semibold text-black transition hover:text-[#42520d]"
          >
            <GitHubIcon className="h-4 w-4" /> @{data.profile.login}
            {verified && <BadgeCheck className="h-4 w-4 text-[#42520d]" />}
          </a>
          {stats.topLanguages.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {stats.topLanguages.map((lang) => (
                <span key={lang} className="rounded-full bg-[#dcefc7] px-2.5 py-1 text-xs font-semibold text-[#42520d]">
                  {lang}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3">
          {statItems.map(({ icon: Icon, label, value }) => (
            <div key={label} className="rounded-[18px] bg-[#fbfaf7] px-4 py-4">
              <Icon className="mb-2 h-4 w-4 text-[#42520d]" />
              <p className="text-xl font-semibold tracking-[-0.02em]">{value}</p>
              <p className="mt-0.5 text-xs font-semibold uppercase tracking-[0.12em] text-black/40">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
