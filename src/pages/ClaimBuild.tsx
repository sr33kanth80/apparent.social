import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Check, Loader2, Sparkles, Terminal } from 'lucide-react';
import { EditorialNavbar } from '../components/editorial/EditorialNavbar';
import { EditorialFooter } from '../components/editorial/EditorialFooter';
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
    <div className="ed-page">
      <EditorialNavbar />
      <main>
        <section className="ed-sec" style={{ minHeight: '60vh', display: 'grid', placeItems: 'center' }}>
          <div className="ed-inner" style={{ width: '100%', maxWidth: 460 }}>
            <div className="ed-form" style={{ padding: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, fontFamily: 'var(--ed-mono)', marginBottom: 16 }}>
                <Terminal style={{ width: 16, height: 16 }} /> npx apparent
              </div>

              {(state === 'checking' || state === 'claiming') && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--ed-graphite)' }}>
                  <Loader2 style={{ width: 16, height: 16 }} className="animate-spin" />
                  {state === 'claiming' ? 'Attaching your build to your profile…' : 'Checking your link…'}
                </div>
              )}

              {state === 'need_auth' && (
                <div>
                  <h2 style={{ fontSize: 21, fontWeight: 500 }}>Claim your build</h2>
                  <p className="ed-desc" style={{ marginTop: 8, fontSize: 14 }}>
                    Sign in or create your founder account, and your <span style={{ fontFamily: 'var(--ed-mono)' }}>npx apparent</span> build attaches to your Apparent profile automatically.
                  </p>
                  <Link className="ed-btn ed-btn-filled" to="/login?role=founder" style={{ marginTop: 20 }}>
                    <Sparkles style={{ width: 16, height: 16 }} /> Sign in to claim
                  </Link>
                  <p style={{ marginTop: 12, fontSize: 12, color: 'var(--ed-smoke)' }}>Your code is saved. Finish signing in and it&apos;ll attach itself.</p>
                </div>
              )}

              {state === 'done' && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <Check style={{ width: 20, height: 20, color: 'var(--ed-ember)' }} />
                    <h2 style={{ fontSize: 21, fontWeight: 500 }}>You&apos;re on Apparent.</h2>
                  </div>
                  <p className="ed-desc" style={{ fontSize: 14 }}>Your build is now part of your founder profile, and visible to the investors whose thesis you fit.</p>
                  {result && (
                    <div style={{ marginTop: 16, padding: 12, borderRadius: 'var(--ed-r)', background: 'var(--ed-canvas)', fontSize: 14, color: 'var(--ed-graphite)' }}>
                      {result.project ? <p style={{ fontWeight: 600, color: 'var(--ed-ink)' }}>{result.project}</p> : null}
                      <p>{result.commits ? `${result.commits.toLocaleString()} commits` : ''}{result.languages ? `  ·  ${result.languages}` : ''}</p>
                    </div>
                  )}
                  <div className="ed-cta" style={{ marginTop: 20 }}>
                    <Link className="ed-btn ed-btn-filled" to="/dashboard/founder/profile">Finish your profile</Link>
                    <Link className="ed-btn ed-btn-outline" to="/dashboard/founder">Go to dashboard</Link>
                  </div>
                </div>
              )}

              {state === 'error' && (
                <div>
                  <h2 style={{ fontSize: 21, fontWeight: 500 }}>Couldn&apos;t claim that</h2>
                  <p className="ed-desc" style={{ marginTop: 8, fontSize: 14 }}>{error}</p>
                  <Link className="ed-btn ed-btn-outline" to="/dashboard/founder" style={{ marginTop: 20 }}>Go to dashboard</Link>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
      <EditorialFooter />
    </div>
  );
};
