import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, RefreshCw, Sparkles, Star } from 'lucide-react';

import { GitHubIcon } from '@/components/GitHubIcon';
import { supabase } from '@/lib/supabase';
import type { AppUser } from '@/lib/apparent-types';

type TopRepo = {
  name: string;
  description: string;
  language: string;
  stars: number;
  url: string;
  topics: string[];
};

type DossierData = {
  topRepos?: TopRepo[];
  languages?: string[];
  totalStars?: number;
  publicRepos?: number;
};

type EnrichResponse = {
  ok: boolean;
  error?: string;
  cached?: boolean;
  dossier?: DossierData;
  summary?: string;
  githubSummary?: string;
  updatedAt?: string;
};

interface FounderDossierCardProps {
  user: AppUser;
}

/**
 * The founder agent's GitHub-enriched dossier. Auto-builds on mount (served from
 * cache if fresh), and offers a manual refresh. This is what makes the founder
 * "Apparent" to investors — the investor agent reads the same dossier.
 */
export const FounderDossierCard = ({ user }: FounderDossierCardProps) => {
  const [state, setState] = useState<'idle' | 'loading' | 'ready' | 'not_connected' | 'error'>('idle');
  const [data, setData] = useState<EnrichResponse | null>(null);
  const [error, setError] = useState('');
  const ranRef = useRef(false);

  const enrich = useCallback(
    async (force: boolean) => {
      if (!supabase || user.isDev) {
        setState('not_connected');
        return;
      }
      setState('loading');
      setError('');
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        if (!token) {
          setState('not_connected');
          return;
        }
        const res = await fetch('/api/founder-enrich', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ force }),
        });
        const json: EnrichResponse = await res.json().catch(() => ({ ok: false, error: 'bad_response' }));
        if (!json.ok) {
          if (json.error === 'github_not_connected') {
            setState('not_connected');
            return;
          }
          throw new Error(json.error || 'enrichment_failed');
        }
        setData(json);
        setState('ready');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not build your dossier.');
        setState('error');
      }
    },
    [user.isDev],
  );

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;
    void enrich(false);
  }, [enrich]);

  // Hidden entirely until GitHub is connected — the GithubVerifyCard handles connect.
  if (state === 'not_connected') return null;

  const dossier = data?.dossier ?? {};
  const topRepos = dossier.topRepos ?? [];

  return (
    <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-[0_10px_34px_rgba(0,0,0,0.04)]">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-black">
          <Sparkles className="h-4 w-4 text-[#42520d]" />
          Your investor dossier
          <span className="inline-flex items-center gap-1 rounded-full bg-[#fbf8f3] px-2 py-0.5 text-[10px] font-medium text-gray-500">
            <GitHubIcon className="h-3 w-3" /> GitHub-enriched
          </span>
        </div>
        {state === 'ready' && (
          <button
            type="button"
            onClick={() => enrich(true)}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-gray-500 transition-colors hover:bg-[#fbf8f3] hover:text-black"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        )}
      </div>

      <p className="mb-3 text-xs text-gray-500">
        This is what thesis-fit investors (and their agents) see first. Your founder agent builds it from your GitHub
        and your Apparent profile.
      </p>

      {state === 'loading' && (
        <div className="flex items-center gap-2 rounded-xl bg-[#fbf8f3] px-3.5 py-3 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Building your dossier from GitHub…
        </div>
      )}

      {state === 'error' && (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700">
          <span>{error}</span>
          <button type="button" onClick={() => enrich(true)} className="font-semibold underline">
            Retry
          </button>
        </div>
      )}

      {state === 'ready' && (
        <div className="space-y-3">
          {data?.summary && <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">{data.summary}</p>}

          {(dossier.totalStars || dossier.publicRepos || (dossier.languages?.length ?? 0) > 0) && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
              {typeof dossier.totalStars === 'number' && (
                <span className="inline-flex items-center gap-1">
                  <Star className="h-3 w-3" /> {dossier.totalStars} stars
                </span>
              )}
              {typeof dossier.publicRepos === 'number' && <span>{dossier.publicRepos} public repos</span>}
              {(dossier.languages?.length ?? 0) > 0 && <span>{dossier.languages!.slice(0, 4).join(' · ')}</span>}
            </div>
          )}

          {topRepos.length > 0 && (
            <div className="grid gap-2 sm:grid-cols-2">
              {topRepos.slice(0, 4).map((repo) => (
                <a
                  key={repo.url || repo.name}
                  href={repo.url || undefined}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl border border-black/10 p-3 transition-colors hover:border-black/30"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs font-semibold text-black">{repo.name}</span>
                    <span className="inline-flex shrink-0 items-center gap-1 text-[11px] text-gray-400">
                      <Star className="h-3 w-3" /> {repo.stars}
                    </span>
                  </div>
                  {repo.description && <p className="mt-1 line-clamp-2 text-[11px] text-gray-500">{repo.description}</p>}
                  {repo.language && <p className="mt-1 text-[10px] text-gray-400">{repo.language}</p>}
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
