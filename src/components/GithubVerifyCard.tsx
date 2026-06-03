import { useEffect, useState } from 'react';
import { BadgeCheck, Check, Copy, ExternalLink, RefreshCw } from 'lucide-react';
import { GitHubIcon } from './GitHubIcon';
import type { AppUser } from '@/lib/apparent-types';
import {
  clearGithubVerification,
  extractGithubLogin,
  githubVerificationCode,
  loadFounderTrust,
  verifyGithubOwnership,
  type FounderTrustState,
} from '@/lib/trust-service';

/**
 * Founder-facing GitHub ownership verification. The founder proves they
 * control the account by dropping an Apparent-issued code into a public gist;
 * we check it via the public API (no OAuth app, no secrets). Verified status
 * shows on their public profile so VCs can trust the GitHub link is really
 * theirs.
 */
export const GithubVerifyCard = ({ user, github }: { user: AppUser; github: string }) => {
  const [trust, setTrust] = useState<FounderTrustState | null>(null);
  const [username, setUsername] = useState('');
  const [checking, setChecking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState('');
  const [messageTone, setMessageTone] = useState<'idle' | 'error' | 'success'>('idle');

  useEffect(() => {
    let cancelled = false;
    loadFounderTrust(user).then((next) => {
      if (cancelled) return;
      setTrust(next);
      // Seed the input from the verified username, else from the profile's
      // github field so the founder doesn't retype it.
      setUsername(next.githubUsername || extractGithubLogin(github));
    });
    return () => {
      cancelled = true;
    };
  }, [user, github]);

  const login = extractGithubLogin(username) || username.trim();
  const code = login ? githubVerificationCode(user, login) : '';

  const handleCopy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked */
    }
  };

  const handleCheck = async () => {
    if (!login || checking) return;
    setChecking(true);
    setMessage('');
    setMessageTone('idle');
    const result = await verifyGithubOwnership(user, login);
    setTrust(result.trust);
    setMessage(result.message);
    setMessageTone(result.ok ? 'success' : 'error');
    setChecking(false);
  };

  const handleDisconnect = async () => {
    await clearGithubVerification(user);
    setTrust((prev) => (prev ? { ...prev, githubVerified: false, githubVerifiedAt: '' } : prev));
    setMessage('');
    setMessageTone('idle');
  };

  const verified = Boolean(trust?.githubVerified);

  return (
    <div className="rounded-[18px] border border-black/10 bg-white p-5 shadow-[0_6px_20px_rgba(0,0,0,0.03)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <GitHubIcon className="h-4 w-4 text-black" />
          <h3 className="text-sm font-semibold">GitHub verification</h3>
        </div>
        {verified ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#42520d] px-2.5 py-1 text-[11px] font-semibold text-white">
            <BadgeCheck className="h-3.5 w-3.5" /> Verified
          </span>
        ) : (
          <span className="rounded-full bg-[#f4f1eb] px-2.5 py-1 text-[11px] font-semibold text-black/55">
            Not verified
          </span>
        )}
      </div>

      {verified ? (
        <div className="mt-3">
          <p className="text-sm leading-6 text-black/65">
            Your GitHub{' '}
            <a
              href={`https://github.com/${trust?.githubUsername}`}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-[#42520d] hover:underline"
            >
              @{trust?.githubUsername}
            </a>{' '}
            is verified. VCs see a verified badge next to your GitHub on your public profile.
          </p>
          <button
            type="button"
            onClick={handleDisconnect}
            className="mt-3 rounded-full border border-black/10 px-3 py-1.5 text-xs font-medium text-black/60 transition-colors hover:bg-[#fbf8f3]"
          >
            Remove verification
          </button>
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          <p className="text-xs leading-5 text-black/55">
            Prove you own your GitHub so VCs can trust your shipping history. Quick, free, three steps.
          </p>

          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-black/45">
              GitHub username
            </span>
            <input
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="your-handle"
              className="h-10 w-full rounded-[10px] border border-black/10 bg-white px-3 text-sm outline-none focus:border-[#42520d]"
            />
          </label>

          {login && (
            <ol className="space-y-2 text-xs leading-5 text-black/65">
              <li className="flex gap-2">
                <span className="font-semibold text-[#42520d]">1.</span>
                <span>Copy this code:</span>
              </li>
              <li className="flex items-center gap-2 rounded-[10px] bg-[#fbfaf7] px-3 py-2">
                <code className="flex-1 truncate font-mono text-[11px] text-black/80">{code}</code>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1 rounded-full border border-black/10 bg-white px-2 py-1 text-[11px] font-semibold text-black/65 hover:bg-[#fbf8f3]"
                >
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-[#42520d]">2.</span>
                <span>
                  Create a{' '}
                  <a
                    href="https://gist.github.com/"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-0.5 font-semibold text-[#42520d] hover:underline"
                  >
                    public gist <ExternalLink className="h-3 w-3" />
                  </a>{' '}
                  with the code in its description (or as the filename). Keep it public.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-[#42520d]">3.</span>
                <span>Come back and check. You can delete the gist afterward.</span>
              </li>
            </ol>
          )}

          <button
            type="button"
            onClick={handleCheck}
            disabled={!login || checking}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#42520d] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#34420a] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${checking ? 'animate-spin' : ''}`} />
            {checking ? 'Checking…' : 'Check verification'}
          </button>
        </div>
      )}

      {message && (
        <p
          className={`mt-3 text-xs leading-5 ${
            messageTone === 'error' ? 'text-red-700' : 'text-[#42520d]'
          }`}
        >
          {message}
        </p>
      )}
    </div>
  );
};
