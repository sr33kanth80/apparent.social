import { useEffect, useRef, useState } from 'react';
import { BadgeCheck, ExternalLink } from 'lucide-react';
import { GitHubIcon } from './GitHubIcon';
import type { AppUser } from '@/lib/apparent-types';
import {
  buildGithubAuthorizeUrl,
  confirmGithubOAuth,
  disconnectGithub,
  extractGithubLogin,
  githubStateMatches,
  loadFounderTrust,
  type FounderTrustState,
} from '@/lib/trust-service';

/**
 * Founder-facing GitHub connect. One click → GitHub OAuth → we confirm and
 * flip github_verified server-side. Verified status shows on the public
 * profile so VCs can trust the GitHub link is really theirs. Handles the
 * OAuth return (?gh_token / ?gh_error) when GitHub bounces back to the
 * profile page.
 */
export const GithubVerifyCard = ({ user, github }: { user: AppUser; github: string }) => {
  const [trust, setTrust] = useState<FounderTrustState | null>(null);
  const [status, setStatus] = useState<'idle' | 'connecting' | 'confirming' | 'disconnecting'>('idle');
  const [message, setMessage] = useState('');
  const [messageTone, setMessageTone] = useState<'idle' | 'error' | 'success'>('idle');
  const handledReturn = useRef(false);

  useEffect(() => {
    let cancelled = false;
    loadFounderTrust(user).then((next) => {
      if (!cancelled) setTrust(next);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Handle the OAuth return. GitHub → /api/github/callback → here with
  // ?gh_token=<blob>&gh_state=<nonce>, or ?gh_error=<reason>.
  useEffect(() => {
    if (handledReturn.current) return;
    const params = new URLSearchParams(window.location.search);
    const token = params.get('gh_token');
    const error = params.get('gh_error');
    const returnedState = params.get('gh_state') ?? '';
    if (!token && !error) return;
    handledReturn.current = true;

    // Strip the OAuth params from the URL so a refresh doesn't replay them.
    const clean = () => {
      params.delete('gh_token');
      params.delete('gh_error');
      params.delete('gh_state');
      const qs = params.toString();
      window.history.replaceState(
        {},
        '',
        `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`,
      );
    };

    if (error) {
      setMessage('GitHub connection was cancelled or failed. Try again.');
      setMessageTone('error');
      clean();
      return;
    }
    if (!githubStateMatches(returnedState)) {
      setMessage('Security check failed (state mismatch). Try connecting again.');
      setMessageTone('error');
      clean();
      return;
    }

    setStatus('confirming');
    confirmGithubOAuth(token as string).then((result) => {
      setMessage(result.message);
      setMessageTone(result.ok ? 'success' : 'error');
      setStatus('idle');
      clean();
      if (result.ok) {
        // Reload trust so the verified pill + username show immediately.
        loadFounderTrust(user).then(setTrust);
      }
    });
  }, [user]);

  const handleConnect = () => {
    setStatus('connecting');
    setMessage('');
    setMessageTone('idle');
    window.location.href = buildGithubAuthorizeUrl();
  };

  const handleDisconnect = async () => {
    if (status !== 'idle') return;
    setStatus('disconnecting');
    setMessage('');
    setMessageTone('idle');
    const result = await disconnectGithub();
    if (result.ok) {
      setTrust((prev) => (prev ? { ...prev, githubVerified: false, githubUsername: '' } : prev));
      setMessage('Disconnected. Connect again with a different account if you like.');
      setMessageTone('success');
    } else {
      setMessage(result.message);
      setMessageTone('error');
    }
    setStatus('idle');
  };

  const verified = Boolean(trust?.githubVerified);
  const displayLogin = trust?.githubUsername || extractGithubLogin(github);

  return (
    <div className="rounded-[18px] border border-black/10 bg-white p-5 shadow-[0_6px_20px_rgba(0,0,0,0.03)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <GitHubIcon className="h-4 w-4 text-black" />
          <h3 className="text-sm font-semibold">GitHub</h3>
        </div>
        {verified ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-charcoal px-2.5 py-1 text-[11px] font-semibold text-white">
            <BadgeCheck className="h-3.5 w-3.5" /> Verified
          </span>
        ) : (
          <span className="rounded-full bg-[#f4f1eb] px-2.5 py-1 text-[11px] font-semibold text-black/55">
            Not connected
          </span>
        )}
      </div>

      {verified ? (
        <div className="mt-3">
          <p className="text-sm leading-6 text-black/65">
            Connected as{' '}
            <a
              href={`https://github.com/${displayLogin}`}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-ink hover:underline"
            >
              @{displayLogin}
            </a>
            . VCs see a verified badge next to your GitHub on your public profile.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleDisconnect}
              disabled={status !== 'idle'}
              className="rounded-full border border-black/10 px-3 py-1.5 text-xs font-medium text-black/60 transition-colors hover:bg-[#f6f3f1] disabled:opacity-60"
            >
              {status === 'disconnecting' ? 'Disconnecting…' : 'Disconnect GitHub'}
            </button>
            <a
              href={`https://github.com/settings/connections/applications/Ov23li5dwJPP1dGzfy38`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-full bg-[#fbfaf7] px-3 py-1.5 text-xs font-medium text-black/55 transition-colors hover:bg-[#f4f1eb]"
            >
              Manage on GitHub <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <p className="mt-2 text-[11px] leading-5 text-black/45">
            To switch accounts: disconnect here, sign out of GitHub or switch the account you&apos;re signed into, then connect again.
          </p>
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          <p className="text-xs leading-5 text-black/55">
            Connect your GitHub in one click so VCs can trust your shipping history is really yours. We only read your public profile.
          </p>
          <button
            type="button"
            onClick={handleConnect}
            disabled={status !== 'idle'}
            className="inline-flex items-center gap-1.5 rounded-full bg-black px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-black/85 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <GitHubIcon className="h-3.5 w-3.5" />
            {status === 'connecting'
              ? 'Redirecting…'
              : status === 'confirming'
                ? 'Confirming…'
                : 'Connect GitHub'}
          </button>
        </div>
      )}

      {message && (
        <p
          className={`mt-3 text-xs leading-5 ${
            messageTone === 'error' ? 'text-red-700' : 'text-ink'
          }`}
        >
          {message}
        </p>
      )}
    </div>
  );
};
