import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Check, Loader2, Sparkles, Terminal } from 'lucide-react';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

/** Shared with the Dashboard finisher so a post-login claim still completes. */
export const PENDING_CLAIM_KEY = 'apparent:pending-claim';

type ClaimResult = { ok?: boolean; commits?: number; languages?: string; project?: string; error?: string };

export const ClaimBuild = () => {
  const [params] = useSearchParams();
  const code = params.get('code') || '';
  const [state, setState] = useState<'checking' | 'need_auth' | 'claiming' | 'done' | 'error'>('checking');
  const [result, setResult] = useState<ClaimResult | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!code) {
      setState('error');
      setError('This claim link is missing its code. Re-run `npx apparent` to get a fresh one.');
      return;
    }
    try {
      window.localStorage.setItem(PENDING_CLAIM_KEY, code);
    } catch {
      /* ignore */
    }

    let cancelled = false;
    (async () => {
      if (!isSupabaseConfigured || !supabase) {
        setState('need_auth');
        return;
      }
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        setState('need_auth');
        return;
      }
      setState('claiming');
      const { data, error: rpcError } = await supabase.rpc('claim_cli_build', { p_code: code });
      if (cancelled) return;
      const res = (data ?? {}) as ClaimResult;
      if (rpcError || !res.ok) {
        setState('error');
        setError(
          res.error === 'invalid_or_expired'
            ? 'This claim link has expired or was already used. Re-run `npx apparent` for a fresh one.'
            : rpcError?.message || 'Could not attach your build. Please try again.',
        );
        return;
      }
      try {
        window.localStorage.removeItem(PENDING_CLAIM_KEY);
      } catch {
        /* ignore */
      }
      setResult(res);
      setState('done');
    })();

    return () => {
      cancelled = true;
    };
  }, [code]);

  return (
    <div className="monad monad-page flex min-h-[70vh] items-center justify-center bg-[#f6f3f1] px-6 py-16">
      <div className="w-full max-w-md rounded-2xl border border-black/10 bg-white p-8 shadow-[0_10px_34px_rgba(0,0,0,0.05)]">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#242424]">
          <Terminal className="h-4 w-4" />
          npx apparent
        </div>

        {(state === 'checking' || state === 'claiming') && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            {state === 'claiming' ? 'Attaching your build to your profile…' : 'Checking your link…'}
          </div>
        )}

        {state === 'need_auth' && (
          <div>
            <h1 className="text-xl font-semibold text-black">Claim your build</h1>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">
              Sign in or create your founder account, and your <span className="font-medium">npx apparent</span> build
              attaches to your Apparent profile automatically.
            </p>
            <Link
              to="/login?role=founder"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-black"
            >
              <Sparkles className="h-4 w-4" /> Sign in to claim
            </Link>
            <p className="mt-3 text-xs text-gray-400">Your code is saved. Finish signing in and it'll attach itself.</p>
          </div>
        )}

        {state === 'done' && (
          <div>
            <div className="mb-2 flex items-center gap-2 text-[#242424]">
              <Check className="h-5 w-5" />
              <h1 className="text-xl font-semibold">You're on Apparent.</h1>
            </div>
            <p className="text-sm leading-relaxed text-gray-600">
              Your build is now part of your founder profile, and visible to the investors whose thesis you fit.
            </p>
            {result && (
              <div className="mt-4 space-y-1 rounded-xl bg-[#f6f3f1] p-3 text-sm text-gray-700">
                {result.project ? <p className="font-medium text-black">{result.project}</p> : null}
                <p>
                  {result.commits ? `${result.commits.toLocaleString()} commits` : ''}
                  {result.languages ? `  ·  ${result.languages}` : ''}
                </p>
              </div>
            )}
            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                to="/dashboard/founder/profile"
                className="inline-flex items-center gap-2 rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-black"
              >
                Finish your profile
              </Link>
              <Link
                to="/dashboard/founder"
                className="inline-flex items-center rounded-xl border border-black/10 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:text-black"
              >
                Go to dashboard
              </Link>
            </div>
          </div>
        )}

        {state === 'error' && (
          <div>
            <h1 className="text-xl font-semibold text-black">Couldn't claim that</h1>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">{error}</p>
            <Link
              to="/dashboard/founder"
              className="mt-5 inline-flex items-center rounded-xl border border-black/10 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:text-black"
            >
              Go to dashboard
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};
