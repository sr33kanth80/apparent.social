import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowUpRight,
  BadgeCheck,
  Briefcase,
  Check,
  FileText,
  Globe,
  Link as LinkIcon,
  MapPin,
  MessageSquare,
  Play,
  Plus,
  Send,
  Share2,
  X,
} from 'lucide-react';
import { LogoIcon } from '@/components/LogoIcon';
import { GitHubIcon } from '@/components/GitHubIcon';
import { loadPublicProfile, saveMessage } from '@/lib/dashboard-service';
import { getCurrentAppUser } from '@/lib/auth-service';
import type { AppUser, PublicFounderProfile, PublicInvestorProfile, PublicProfileResult } from '@/lib/apparent-types';
import { VerifiedAvatar } from '@/components/VerifiedAvatar';
import { GitHubBadge } from '@/components/GitHubBadge';

const serif = { fontFamily: 'Georgia, "Times New Roman", serif' };

// ─── tiny helpers ──────────────────────────────────────────────────────────────

const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

const Avatar = ({ src, name, size = 'lg', bg = '#dcefc7' }: { src?: string; name: string; size?: 'sm' | 'lg'; bg?: string }) => {
  const dim = size === 'lg' ? 'h-20 w-20 text-xl rounded-[22px]' : 'h-11 w-11 text-sm rounded-[14px]';
  return src ? (
    <img src={src} alt={name} className={`${dim} shrink-0 object-cover`} />
  ) : (
    <div
      className={`${dim} flex shrink-0 items-center justify-center font-semibold`}
      style={{ background: bg }}
    >
      {initials(name) || name.slice(0, 2).toUpperCase()}
    </div>
  );
};

const Tag = ({ children, accent = false }: { children: React.ReactNode; accent?: boolean }) => (
  <span
    className={`rounded-full px-3 py-1.5 text-xs font-semibold ${accent ? 'bg-[#42520d] text-white' : 'bg-[#dcefc7] text-black'}`}
  >
    {children}
  </span>
);

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="mb-8 text-sm font-semibold uppercase tracking-[0.12em] text-[#42520d]">{children}</p>
);

// ─── messaging ──────────────────────────────────────────────────────────────

const firstNameOf = (name: string) => name.split(/\s+/)[0] || 'them';

// Primary "Message" button for the hero. DM is gated to logged-in viewers.
const MessageButton = ({ viewer, name, onMessage }: { viewer: AppUser | null; name: string; onMessage: () => void }) => {
  const cls =
    'inline-flex items-center gap-1.5 rounded-full bg-[#42520d] px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90';
  return viewer ? (
    <button type="button" onClick={onMessage} className={cls}>
      <MessageSquare className="h-4 w-4" /> Message {firstNameOf(name)}
    </button>
  ) : (
    <Link to="/login" className={cls}>
      <MessageSquare className="h-4 w-4" /> Log in to message
    </Link>
  );
};

// Share-profile button: copy link, native share, and one-click X / LinkedIn.
const ShareButton = ({ username, name }: { username: string; name: string }) => {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const url = typeof window !== 'undefined' ? `${window.location.origin}/@${username}` : `/@${username}`;
  const shareText = `${name} on Apparent`;

  const MENU_WIDTH = 240;
  const toggle = () => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      // Right-align the menu under the button, clamped to the viewport.
      setPos({ top: r.bottom + 8, left: Math.max(8, Math.min(r.right - MENU_WIDTH, window.innerWidth - MENU_WIDTH - 8)) });
    }
    setOpen((value) => !value);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked */
    }
  };

  const nativeShare = async () => {
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({ title: shareText, url });
      } catch {
        /* cancelled */
      }
    } else {
      await copy();
    }
    setOpen(false);
  };

  const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(url)}`;
  const liUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
  const itemCls = 'flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-black transition-colors hover:bg-[#fbf8f3]';

  return (
    <div className="inline-block">
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        className="inline-flex items-center gap-1.5 rounded-full border border-black/15 bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-black/5"
      >
        <Share2 className="h-4 w-4" /> Share
      </button>
      {open && pos && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          {/* Fixed so it isn't clipped by the profile card's overflow-hidden. */}
          <div
            className="fixed z-50 w-60 rounded-2xl border border-black/10 bg-white p-2 shadow-xl"
            style={{ top: pos.top, left: pos.left }}
          >
            <button type="button" onClick={copy} className={itemCls}>
              {copied ? <Check className="h-4 w-4 text-[#42520d]" /> : <LinkIcon className="h-4 w-4" />}
              {copied ? 'Link copied!' : 'Copy link'}
            </button>
            <a href={xUrl} target="_blank" rel="noreferrer" onClick={() => setOpen(false)} className={itemCls}>
              <ArrowUpRight className="h-4 w-4" /> Share on X
            </a>
            <a href={liUrl} target="_blank" rel="noreferrer" onClick={() => setOpen(false)} className={itemCls}>
              <LinkIcon className="h-4 w-4" /> Share on LinkedIn
            </a>
            {typeof navigator !== 'undefined' && 'share' in navigator && (
              <button type="button" onClick={nativeShare} className={itemCls}>
                <Share2 className="h-4 w-4" /> More…
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
};

// Bottom connect card — auth-aware: a real "Message" action when logged in,
// the join/sign-in pitch only for logged-out visitors.
const ConnectSection = ({
  viewer,
  name,
  onMessage,
  tone,
}: {
  viewer: AppUser | null;
  name: string;
  onMessage: () => void;
  tone: 'dark' | 'light';
}) => {
  // Logged-in viewers already have a Message button in the profile header,
  // so this CTA is redundant for them. Only render it for logged-out visitors
  // (the sign-in nudge).
  if (viewer) return null;

  const fname = firstNameOf(name);
  const card = tone === 'dark' ? 'bg-[#42520d] text-white' : 'bg-[#dcefc7] text-black';
  const eyebrow = tone === 'dark' ? 'text-white/60' : 'text-[#42520d]';
  const sub = tone === 'dark' ? 'text-white/70' : 'text-black/60';
  const primary =
    tone === 'dark'
      ? 'bg-white text-[#42520d] hover:bg-[#dcefc7]'
      : 'bg-[#42520d] text-white hover:opacity-90';
  const secondary =
    tone === 'dark' ? 'border-white/30 text-white hover:bg-white/10' : 'border-black/20 text-black hover:bg-black/5';

  return (
    <section className="mx-auto max-w-[92rem] border-t border-black/10 px-5 py-16 sm:px-8">
      <div className={`rounded-[32px] px-8 py-10 md:flex md:items-center md:justify-between ${card}`}>
        <div>
          <p className={`text-sm font-semibold uppercase tracking-[0.12em] ${eyebrow}`}>{viewer ? 'On Apparent' : 'Connect on Apparent'}</p>
          <h2 className="mt-3 max-w-xl text-3xl font-normal leading-tight tracking-[-0.03em]" style={serif}>
            {viewer ? `Reach out to ${fname}` : `Want to reach ${fname}?`}
          </h2>
          <p className={`mt-3 max-w-lg text-sm leading-7 ${sub}`}>
            {viewer
              ? `Send ${fname} a direct message on Apparent.`
              : `Sign in to message ${fname} directly and follow their work on Apparent.`}
          </p>
        </div>
        <div className="mt-8 flex flex-col gap-3 md:ml-10 md:mt-0 md:shrink-0">
          {viewer ? (
            <button
              type="button"
              onClick={onMessage}
              className={`inline-flex items-center justify-center gap-1.5 rounded-full px-6 py-3 text-sm font-semibold transition ${primary}`}
            >
              <MessageSquare className="h-4 w-4" /> Message {fname}
            </button>
          ) : (
            <>
              <Link to="/login" className={`rounded-full px-6 py-3 text-center text-sm font-semibold transition ${primary}`}>
                Log in to message
              </Link>
              <Link to="/login" className={`rounded-full border px-6 py-3 text-center text-sm font-semibold transition ${secondary}`}>
                Create a free account
              </Link>
            </>
          )}
        </div>
      </div>
    </section>
  );
};

// Compose modal for sending a direct message.
const ProfileMessageModal = ({
  viewer,
  target,
  onClose,
}: {
  viewer: AppUser;
  target: { name: string; username: string; userId: string };
  onClose: () => void;
}) => {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');

  const send = async () => {
    if (!body.trim()) return;
    setStatus('sending');
    try {
      await saveMessage(viewer, {
        recipient: target.name || `@${target.username}`,
        recipientId: target.userId,
        senderName: viewer.username || viewer.email.split('@')[0],
        subject: subject.trim() || `Message from ${viewer.username || viewer.email.split('@')[0]}`,
        body: body.trim(),
        status: 'sent',
        context: `dm:${target.username}`,
      });
      setStatus('sent');
    } catch {
      setStatus('idle');
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-[24px] bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        {status === 'sent' ? (
          <div className="py-6 text-center">
            <p className="text-lg font-semibold" style={serif}>Message sent</p>
            <p className="mt-2 text-sm text-black/60">Your message to {target.name} is on its way.</p>
            <button type="button" onClick={onClose} className="mt-6 rounded-full bg-[#42520d] px-6 py-2.5 text-sm font-semibold text-white">
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold" style={serif}>Message {target.name}</h3>
              <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-1.5 text-black/40 transition-colors hover:bg-black/5 hover:text-black/70">
                <X className="h-4 w-4" />
              </button>
            </div>
            <input
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder="Subject (optional)"
              className="mt-4 h-10 w-full rounded-xl border border-black/10 px-3 text-sm outline-none focus:border-black/30"
            />
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder={`Write to ${target.name}…`}
              className="mt-3 min-h-32 w-full resize-none rounded-xl border border-black/10 px-3 py-2 text-sm leading-relaxed outline-none focus:border-black/30"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={onClose} className="rounded-full border border-black/10 px-4 py-2 text-sm font-semibold hover:bg-[#fbf8f3]">
                Cancel
              </button>
              <button
                type="button"
                onClick={send}
                disabled={status === 'sending' || !body.trim()}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#42520d] px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" /> {status === 'sending' ? 'Sending…' : 'Send'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ─── dark hero card (mockup-styled) ────────────────────────────────────────

// Verified GitHub contribution-calendar palette.
const COMMIT_LEVELS = [
  'bg-black/[0.06]',
  'bg-[#9be9a8]',
  'bg-[#40c463]',
  'bg-[#30a14e]',
  'bg-[#216e39]',
];
type GhStats = {
  publicRepos: number;
  followers: number;
  stars: number;
  topLanguages: string[];
} | null;

const extractGhLogin = (github: string): string => {
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

const compact = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, '')}k` : String(n);

type ContributionCalendar = {
  totalContributions: number;
  // [week][day] flattened. Each cell is { date, count }.
  weeks: Array<Array<{ date: string; count: number }>>;
};

// Quantize a contribution count into one of our 5 visual levels. Mirrors the
// thresholds GitHub uses on its own profile so the densest weeks really do
// stand out.
const countToLevel = (count: number): number => {
  if (count <= 0) return 0;
  if (count < 3) return 1;
  if (count < 6) return 2;
  if (count < 10) return 3;
  return 4;
};

const FounderHero = ({
  profile,
  viewer,
  onMessage,
  isOwnProfile,
}: {
  profile: PublicFounderProfile;
  viewer: AppUser | null;
  onMessage: () => void;
  isOwnProfile?: boolean;
}) => {
  const ghLogin = extractGhLogin(profile.github);
  const [ghStats, setGhStats] = useState<GhStats>(null);
  const [calendar, setCalendar] = useState<ContributionCalendar | null>(null);

  useEffect(() => {
    if (!ghLogin) return;
    let cancelled = false;
    fetch(`/api/github?username=${encodeURIComponent(ghLogin)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { stats?: GhStats } | null) => {
        if (!cancelled && data && data.stats) setGhStats(data.stats);
      })
      .catch(() => {
        /* leave stats null */
      });
    return () => {
      cancelled = true;
    };
  }, [ghLogin]);

  // Real contribution calendar only when the founder is verified.
  useEffect(() => {
    const handle = profile.githubUsername || ghLogin;
    if (!handle || !profile.githubVerified) return;
    let cancelled = false;
    // v=3 busts the browser's locally-cached 304 from the previous attempt.
    // Safe to leave in; future drift bumps the number.
    fetch(`/api/github/contributions?username=${encodeURIComponent(handle)}&v=3`)
      .then(async (r) => {
        if (r.status === 404) return null;
        if (!r.ok) return null;
        return r.json();
      })
      .then((data: { ok?: boolean; weeks?: ContributionCalendar['weeks']; totalContributions?: number } | null) => {
        if (cancelled || !data || !data.ok || !data.weeks) return;
        setCalendar({
          totalContributions: data.totalContributions ?? 0,
          weeks: data.weeks,
        });
      })
      .catch(() => {
        /* leave calendar null; the grid stays hidden */
      });
    return () => {
      cancelled = true;
    };
  }, [ghLogin, profile.githubUsername, profile.githubVerified]);

  const columns: number[][] = calendar
    ? calendar.weeks.map((week) => {
        // Pad short last-week to 7 days so the grid has a uniform height.
        const padded = [...week];
        while (padded.length < 7) padded.push({ date: '', count: 0 });
        return padded.slice(0, 7).map((d) => countToLevel(d.count));
      })
    : [];

  const realStarsLabel = ghStats ? `${compact(ghStats.stars)} stars · ${compact(ghStats.publicRepos)} repos` : 'GitHub';
  const headlineCount = `${compact(calendar?.totalContributions ?? 0)} contributions`;

  const name = profile.profileName || profile.username || 'Apparent Builder';
  const headline = profile.headline || profile.bio || '';
  const fundraisingPill =
    profile.fundraisingStatus === 'raising'
      ? `Raising${profile.raisingRound ? ` ${profile.raisingRound}` : ''}${
          profile.raisingAmount ? ` · ${profile.raisingAmount}` : ''
        }`
      : profile.fundraisingStatus === 'open'
        ? 'Open to investor intros'
        : '';

  const facts = [
    { label: 'Current build', value: profile.currentBuild },
    { label: 'Category', value: profile.category },
    { label: 'Stage', value: profile.stage },
    { label: 'Traction', value: profile.traction },
  ].filter((f) => f.value);

  const hasLatestLaunch = profile.launches && profile.launches.length > 0;
  const latestLaunch = hasLatestLaunch ? profile.launches[0] : null;

  // Unified GitHub handle for both the panel + the footer pill: prefer the
  // OAuth-verified username, fall back to whatever the founder typed into
  // the profile form. Without this, a founder who connected GitHub but
  // never filled the URL field would render no panel at all.
  const ghHandle = profile.githubUsername || ghLogin;
  const ghProfileUrl = profile.github || (ghHandle ? `https://github.com/${ghHandle}` : '');

  const links = [
    profile.website && { label: 'Website', href: profile.website, icon: Globe },
    ghProfileUrl && { label: 'GitHub', href: ghProfileUrl, icon: GitHubIcon },
    profile.linkedin && { label: 'LinkedIn', href: profile.linkedin, icon: LinkIcon },
    profile.xProfile && { label: 'X', href: profile.xProfile, icon: ArrowUpRight },
  ].filter(Boolean) as { label: string; href: string; icon: React.ElementType }[];

  return (
    <section className="mx-auto max-w-[64rem] px-5 pt-12 sm:px-8 md:pt-16">
      {/* Action bar — Message + Share — sits inline above the editorial flow.
          No dark card wrapper anymore; everything below flows on the cream
          page background with hairline separators between sections. */}
      <div className="mb-8 flex flex-wrap items-center justify-end gap-2">
        <MessageButton viewer={viewer} name={name} onMessage={onMessage} />
        {profile.shareable !== false && (
          <ShareButton username={profile.username} name={name} />
        )}
      </div>

      {/* ─ Top pill row ─ */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-[#dcefc7] px-3 py-1 text-xs font-semibold text-[#20300a]">
          Founder on Apparent
        </span>
        {fundraisingPill && (
          <span className="rounded-full bg-[#42520d] px-3 py-1 text-xs font-semibold text-white">
            {fundraisingPill}
          </span>
        )}
        {profile.location && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-black/60">
            <MapPin className="h-3.5 w-3.5" /> {profile.location}
          </span>
        )}
      </div>

      {/* ─ Header row ─ */}
      <div className="mt-6 flex flex-wrap items-center gap-4">
        <VerifiedAvatar src={profile.profilePhotoUrl} name={name} size="sm" bg="#42520d" verified={profile.githubVerified} />
        <div className="min-w-0">
          <p className="truncate text-2xl font-normal tracking-[-0.02em]" style={serif}>{name}</p>
          <p className="mt-0.5 text-xs font-semibold text-black/55">@{profile.username}</p>
        </div>
        {profile.githubVerified && (
          <GitHubBadge
            username={profile.githubUsername || ghLogin || ''}
            link={`https://github.com/${profile.githubUsername || ghLogin}`}
          />
        )}
      </div>

      {/* ─ Headline ─ */}
      {headline ? (
        <p className="mt-5 max-w-3xl text-base leading-7 text-black/70">{headline}</p>
      ) : (
        <div className="mt-5">
          <div className="space-y-2">
            <div className="h-4 w-2/3 max-w-md rounded bg-[#e8e4da]" />
            <div className="h-4 w-1/2 max-w-xs rounded bg-[#e8e4da]" />
          </div>
          {!isOwnProfile && (
            <span className="mt-2 inline-flex items-center rounded-full border border-black/8 bg-[#ebe8e0] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-black/35">
              Incomplete
            </span>
          )}
          {isOwnProfile && (
            <Link
              to="/dashboard/founder/profile"
              className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#42520d]/55 transition-colors hover:text-[#42520d]"
            >
              <Plus className="h-3 w-3" /> Add a headline
            </Link>
          )}
        </div>
      )}

      {/* ─ GitHub activity grid ─ */}
      {ghHandle && calendar && (
        <div className="mt-10 border-t border-black/10 pt-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/45">
              {headlineCount} · last year{calendar ? ' · verified' : ''}
            </p>
            <div className="flex items-center gap-1.5 text-[11px] text-black/45">
              <span>Less</span>
              {[0, 1, 2, 3, 4].map((lvl) => (
                <span key={lvl} className={`h-2.5 w-2.5 rounded-[2px] ${COMMIT_LEVELS[lvl]}`} />
              ))}
              <span>More</span>
            </div>
          </div>
          <div className="mt-4 overflow-x-auto">
            <div className="flex gap-1">
              {columns.map((col, i) => (
                <div key={i} className="flex flex-col gap-1">
                  {col.map((level, j) => (
                    <span
                      key={j}
                      className={`h-2.5 w-2.5 rounded-[2px] ${COMMIT_LEVELS[level]}`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-black/40">
            <span>{realStarsLabel}</span>
            <a
              href={ghProfileUrl || `https://github.com/${ghHandle}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-black/55 transition-colors hover:text-black"
            >
              Open on GitHub <ArrowUpRight className="h-3 w-3" />
            </a>
          </div>
        </div>
      )}

      {/* ─ Connect GitHub prompt (own profile, no github linked) ─ */}
      {!ghHandle && isOwnProfile && (
        <div className="mt-10 border-t border-black/10 pt-6">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-black/45">
            GitHub activity
          </p>
          <Link
            to="/dashboard/founder/profile"
            className="flex items-center gap-3 rounded-2xl border border-dashed border-black/15 bg-[#f4f1eb] p-4 transition-colors hover:border-[#42520d]/30 hover:bg-[#edeae3]"
          >
            <GitHubIcon className="h-5 w-5 shrink-0 text-black/35" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-black/65">Connect GitHub</p>
              <p className="text-xs text-black/40">Show your contribution history to investors</p>
            </div>
            <ArrowUpRight className="ml-auto h-4 w-4 shrink-0 text-black/25" />
          </Link>
        </div>
      )}

      {/* ─ Facts grid ─ */}
      {facts.length > 0 && (
        <div className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-black/10 bg-black/[0.06] sm:grid-cols-2">
          {facts.map((f) => (
            <div key={f.label} className="bg-[#fbfaf7] px-5 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-black/45">
                {f.label}
              </p>
              <p className="mt-1 text-base font-semibold text-black">{f.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* ─ Pitch row: video + deck ─ */}
      {latestLaunch && (latestLaunch.pitchVideoUrl || latestLaunch.demoVideoUrl || latestLaunch.pitchDeckUrl) && (
        <div className="mt-10 border-t border-black/10 pt-6">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#42520d]">
            Pitch
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {/* Video card */}
            {(latestLaunch.pitchVideoUrl || latestLaunch.demoVideoUrl) && (
              <a
                href={latestLaunch.pitchVideoUrl || latestLaunch.demoVideoUrl}
                target="_blank"
                rel="noreferrer"
                className="group relative flex h-44 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#dcefc7] via-[#a8c890] to-[#42520d]"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#42520d] shadow-lg transition-transform group-hover:scale-105">
                  <Play className="h-5 w-5 translate-x-[1px]" />
                </span>
                <span className="absolute bottom-3 left-3 text-xs font-semibold uppercase tracking-[0.16em] text-white">
                  {latestLaunch.pitchVideoUrl ? 'Seed pitch' : 'Demo'}
                </span>
              </a>
            )}
            {/* Deck card */}
            {latestLaunch.pitchDeckUrl && (
              <a
                href={latestLaunch.pitchDeckUrl}
                target="_blank"
                rel="noreferrer"
                className="relative flex h-44 flex-col justify-between overflow-hidden rounded-2xl border border-black/10 bg-white p-5 transition-colors hover:bg-[#fbfaf7]"
              >
                <div className="space-y-2">
                  <div className="h-2 w-2/3 rounded-full bg-black/10" />
                  <div className="h-2 w-1/2 rounded-full bg-black/08" />
                  <div className="h-2 w-3/5 rounded-full bg-black/08" />
                </div>
                <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.14em] text-black/55">
                  <span className="inline-flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5" /> Deck
                  </span>
                  <span>Open</span>
                </div>
              </a>
            )}
          </div>
        </div>
      )}

      {/* ─ Footer link pills ─ */}
      {links.length > 0 && (
        <div className="mt-10 flex flex-wrap gap-2 border-t border-black/10 pt-6">
          {links.map(({ label, href, icon: Icon }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-semibold text-black/70 transition-colors hover:border-black/20 hover:bg-[#fbfaf7] hover:text-black"
            >
              <Icon className="h-3.5 w-3.5" /> {label}
              {label === 'GitHub' && profile.githubVerified && (
                <BadgeCheck className="h-3 w-3 text-[#216e39]" />
              )}
            </a>
          ))}
        </div>
      )}
    </section>
  );
};

// ─── founder profile ──────────────────────────────────────────────────────────

const SkeletonLaunchCard = () => (
  <div className="rounded-[28px] bg-white/80 p-6">
    <div className="flex items-center gap-3">
      <div className="h-10 w-10 rounded-[12px] bg-[#e8e4da]" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-28 rounded bg-[#e8e4da]" />
        <div className="h-3 w-16 rounded bg-[#e8e4da]" />
      </div>
    </div>
    <div className="mt-4 space-y-2">
      <div className="h-3 w-full rounded bg-[#e8e4da]" />
      <div className="h-3 w-3/4 rounded bg-[#e8e4da]" />
    </div>
    <div className="mt-4 flex gap-2">
      <div className="h-6 w-14 rounded-full bg-[#e8e4da]" />
      <div className="h-6 w-10 rounded-full bg-[#e8e4da]" />
    </div>
  </div>
);

const FounderProfilePage = ({
  profile,
  viewer,
  onMessage,
}: {
  profile: PublicFounderProfile;
  viewer: AppUser | null;
  onMessage: () => void;
}) => {
  const pastProductList = profile.pastProducts
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);

  const isOwnProfile = viewer?.id === profile.userId;

  const completionFields = {
    photo: !!profile.profilePhotoUrl,
    headline: !!(profile.headline || profile.bio),
    github: !!(profile.github || profile.githubUsername || profile.githubVerified),
    launch: profile.launches.length > 0,
  };
  const completedCount = Object.values(completionFields).filter(Boolean).length;
  const totalCount = Object.keys(completionFields).length;
  const isProfileComplete = completedCount === totalCount;

  return (
    <main className="overflow-x-hidden bg-[#fbfaf7] text-black">
      {/* ── Completion banner (own profile, incomplete) ── */}
      {isOwnProfile && !isProfileComplete && (
        <div className="border-b border-black/10 bg-[#f4f1eb] px-5 py-3 sm:px-8">
          <div className="mx-auto flex max-w-[64rem] items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex gap-1">
                {Object.values(completionFields).map((done, i) => (
                  <div
                    key={i}
                    className={`h-1.5 w-8 rounded-full transition-colors ${done ? 'bg-[#42520d]' : 'bg-[#d4d0c8]'}`}
                  />
                ))}
              </div>
              <p className="text-xs font-semibold text-black/50">
                {completedCount}/{totalCount} sections complete
              </p>
            </div>
            <Link
              to="/dashboard/founder/profile"
              className="shrink-0 text-xs font-semibold text-[#42520d] hover:underline"
            >
              Complete profile →
            </Link>
          </div>
        </div>
      )}

      {/* Hero: pill row, avatar, headline, GitHub activity, facts, pitch, links */}
      <FounderHero profile={profile} viewer={viewer} onMessage={onMessage} isOwnProfile={isOwnProfile} />

      {/* ── Product launches ── */}
      <section className="mx-auto max-w-[82rem] border-t border-black/10 px-5 py-16 sm:px-8">
        <div className="mb-8 flex flex-wrap items-center gap-3">
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[#42520d]">Products &amp; launches</p>
          {profile.launches.length === 0 && !isOwnProfile && (
            <span className="rounded-full border border-black/8 bg-[#ebe8e0] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-black/35">
              Incomplete
            </span>
          )}
        </div>
        {profile.launches.length > 0 ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {profile.launches.map((launch) => (
              <Link
                key={launch.id}
                to={`/projects/${launch.slug || launch.id}`}
                className="group rounded-[28px] bg-white/80 p-6 transition-all hover:-translate-y-0.5 hover:bg-white hover:shadow-lg"
              >
                <div className="flex items-center gap-3">
                  {launch.logoUrl ? (
                    <img
                      src={launch.logoUrl}
                      alt=""
                      className="h-10 w-10 rounded-[12px] object-contain p-1"
                      onError={(e) => {
                        const img = e.currentTarget;
                        img.style.display = 'none';
                        const fallback = img.nextElementSibling as HTMLElement | null;
                        if (fallback) fallback.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div
                    className="h-10 w-10 items-center justify-center rounded-[12px] bg-[#dcefc7] text-xs font-bold text-[#42520d]"
                    style={{ display: launch.logoUrl ? 'none' : 'flex' }}
                  >
                    {launch.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-semibold" style={serif}>{launch.name}</p>
                    <p className="mt-0.5 text-xs text-black/50">{launch.category}</p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-black/30 transition group-hover:text-[#42520d]" />
                </div>
                <p className="mt-4 line-clamp-2 text-sm leading-6 text-black/60">{launch.tagline || launch.intro}</p>
                {launch.metrics && (
                  <p className="mt-3 text-xs font-medium text-[#42520d]">{launch.metrics}</p>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  {[launch.stage, launch.location].filter(Boolean).map((tag) => (
                    <Tag key={tag}>{tag}</Tag>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        ) : isOwnProfile ? (
          /* Own profile, no launches yet — CTA + one skeleton card */
          <div className="grid gap-5 md:grid-cols-2">
            <Link
              to="/dashboard/founder/profile"
              className="flex flex-col items-center justify-center gap-3 rounded-[28px] border-2 border-dashed border-[#42520d]/20 bg-white/60 p-8 text-center transition-colors hover:border-[#42520d]/35 hover:bg-white/80"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#dcefc7]">
                <Plus className="h-5 w-5 text-[#42520d]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#42520d]">Add your first launch</p>
                <p className="mt-1 text-xs text-black/45">Show investors what you've built</p>
              </div>
            </Link>
            <SkeletonLaunchCard />
          </div>
        ) : (
          /* Visitor viewing incomplete profile — skeleton cards */
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            <SkeletonLaunchCard />
            <SkeletonLaunchCard />
            <SkeletonLaunchCard />
          </div>
        )}
      </section>

      {/* ── Past products ── */}
      {pastProductList.length > 0 && (
        <section className="mx-auto max-w-[82rem] border-t border-black/10 px-5 py-16 sm:px-8">
          <SectionLabel>Past products</SectionLabel>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pastProductList.map((item) => (
              <li key={item} className="flex items-center gap-2 rounded-2xl bg-white/80 px-4 py-3 text-sm text-black/70">
                <Briefcase className="h-3.5 w-3.5 shrink-0 text-[#42520d]" />
                {item}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── Raising ── */}
      {(profile.fundraisingStatus === 'raising' || profile.fundraisingStatus === 'open') &&
        (profile.raisingAsk || profile.raisingRound || profile.raisingAmount) && (
          <section className="mx-auto max-w-[82rem] border-t border-black/10 px-5 py-16 sm:px-8">
            <SectionLabel>{profile.fundraisingStatus === 'raising' ? 'Raising now' : 'Open to investor intros'}</SectionLabel>
            <div className="flex flex-wrap items-center gap-2">
              {profile.raisingRound && <Tag accent>{profile.raisingRound}</Tag>}
              {profile.raisingAmount && <Tag>{profile.raisingAmount}</Tag>}
              {profile.openToContact && <Tag>Open to contact</Tag>}
            </div>
            {profile.raisingAsk && (
              <p className="mt-6 max-w-2xl text-lg leading-8 text-black/65">{profile.raisingAsk}</p>
            )}
          </section>
        )}

      {/* ── Looking for ── */}
      {profile.lookingFor && (
        <section className="mx-auto max-w-[82rem] border-t border-black/10 px-5 py-16 sm:px-8">
          <SectionLabel>Looking to meet</SectionLabel>
          <p className="max-w-2xl text-lg leading-8 text-black/65">{profile.lookingFor}</p>
        </section>
      )}

      {/* ── Connect / message ── */}
      <ConnectSection viewer={viewer} name={profile.profileName || profile.username} onMessage={onMessage} tone="dark" />
    </main>
  );
};

// ─── investor profile ─────────────────────────────────────────────────────────

const InvestorProfilePage = ({
  profile,
  viewer,
  onMessage,
}: {
  profile: PublicInvestorProfile;
  viewer: AppUser | null;
  onMessage: () => void;
}) => {
  const visible = (key: string) => profile.publicFields.includes(key);

  const name = profile.displayName || profile.username;

  const facts = [
    visible('sectors') && profile.sectors && { label: 'Sectors', value: profile.sectors },
    visible('stage') && profile.stage && { label: 'Stage', value: profile.stage },
    visible('geography') && profile.geography && { label: 'Geography', value: profile.geography },
    visible('checkSize') && profile.checkSize && { label: 'Check size', value: profile.checkSize },
  ].filter(Boolean) as { label: string; value: string }[];

  const portfolioList = visible('portfolioExamples')
    ? profile.portfolioExamples.split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  return (
    <main className="overflow-x-hidden bg-[#fbfaf7] text-black">
      {/* ── Hero — open editorial layout, mirrors FounderHero ── */}
      <section className="mx-auto max-w-[64rem] px-5 pt-12 sm:px-8 md:pt-16">
        {/* Action bar */}
        <div className="mb-8 flex flex-wrap items-center justify-end gap-2">
          <MessageButton viewer={viewer} name={name} onMessage={onMessage} />
          {profile.shareable !== false && (
            <ShareButton username={profile.username} name={name} />
          )}
        </div>

        {/* Pill row */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-[#42520d] px-3 py-1 text-xs font-semibold text-white">
            Investor on Apparent
          </span>
        </div>

        {/* Header row: avatar + name */}
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <Avatar src={profile.profilePhotoUrl} name={name} bg="#42520d" />
          <div className="min-w-0">
            <p className="truncate text-2xl font-normal tracking-[-0.02em]" style={serif}>{name}</p>
            <p className="mt-0.5 text-xs font-semibold text-black/55">@{profile.username}</p>
          </div>
        </div>

        {/* Thesis — where founder's headline lives */}
        {visible('thesis') && profile.thesis ? (
          <p className="mt-5 max-w-3xl text-base leading-7 text-black/70">{profile.thesis}</p>
        ) : (
          <div className="mt-5 space-y-2">
            <div className="h-4 w-2/3 max-w-md rounded bg-[#e8e4da]" />
            <div className="h-4 w-1/2 max-w-xs rounded bg-[#e8e4da]" />
          </div>
        )}

        {/* Facts grid: Sectors / Stage / Geography / Check size */}
        {facts.length > 0 && (
          <div className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-black/10 bg-black/[0.06] sm:grid-cols-2">
            {facts.map((f) => (
              <div key={f.label} className="bg-[#fbfaf7] px-5 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-black/45">
                  {f.label}
                </p>
                <p className="mt-1 text-base font-semibold text-black">{f.value}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Portfolio calibration ── */}
      {portfolioList.length > 0 && (
        <section className="mx-auto max-w-[82rem] border-t border-black/10 px-5 py-16 sm:px-8">
          <SectionLabel>Companies that match their taste</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {portfolioList.map((co) => (
              <Tag key={co} accent>{co}</Tag>
            ))}
          </div>
        </section>
      )}

      {/* ── What they back ── */}
      {visible('founderSignals') && profile.founderSignals && (
        <section className="mx-auto max-w-[82rem] border-t border-black/10 px-5 py-16 sm:px-8">
          <SectionLabel>What they back</SectionLabel>
          <p className="max-w-2xl text-lg leading-8 text-black/65">{profile.founderSignals}</p>
        </section>
      )}

      {/* ── Connect / message ── */}
      <ConnectSection viewer={viewer} name={name} onMessage={onMessage} tone="light" />
    </main>
  );
};

// ─── restricted investor gate ─────────────────────────────────────────────────

const InvestorRestrictedPage = ({ username }: { username: string }) => (
  <main className="min-h-screen overflow-x-hidden bg-[#fbfaf7] text-black">
    <section className="mx-auto flex min-h-[70vh] max-w-[92rem] flex-col items-start justify-center px-5 sm:px-8">
      <p className="mb-6 text-sm font-semibold uppercase tracking-[0.12em] text-[#42520d]">Apparent investor</p>
      <h1 className="max-w-3xl text-5xl font-normal leading-none tracking-[-0.045em] md:text-7xl" style={serif}>
        @{username}
      </h1>
      <p className="mt-8 max-w-lg text-lg leading-8 text-black/60">
        This investor profile is only visible to Apparent members. Sign in or create an account to view their full thesis, sectors, and contact details.
      </p>
      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          to="/login?role=founder"
          className="rounded-full bg-[#42520d] px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90"
        >
          Sign in as founder
        </Link>
        <Link
          to="/login?role=investor"
          className="rounded-full border border-black/20 bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-[#dcefc7]"
        >
          Sign in as investor
        </Link>
      </div>
    </section>
  </main>
);

// ─── root ─────────────────────────────────────────────────────────────────────

export const PublicProfile = () => {
  // Support /@:handle (now routed as /:handle in App.tsx — React Router v7
  // can't parse /@:param) and legacy /profile/:profileId.
  const { handle: rawHandle = '', profileId = '' } = useParams();
  const handle = (rawHandle || profileId).replace(/^@/, '');

  // If the path segment doesn't start with @ it's not a profile route —
  // let it fall through to not_found so other pages aren't shadowed.
  const isProfileRoute = rawHandle.startsWith('@') || Boolean(profileId);

  const [result, setResult] = useState<PublicProfileResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewer, setViewer] = useState<AppUser | null>(null);
  const [dmFor, setDmFor] = useState<{ name: string; username: string; userId: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    getCurrentAppUser()
      .then((current) => {
        if (!cancelled) setViewer(current);
      })
      .catch(() => {
        /* logged out */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!handle || !isProfileRoute) {
      setResult({ kind: 'not_found' });
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    loadPublicProfile(handle)
      .then((res) => {
        if (!cancelled) {
          setResult(res);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setResult({ kind: 'not_found' });
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [handle, isProfileRoute]);

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fbfaf7]">
        <div className="flex flex-col items-center gap-4">
          <LogoIcon className="h-8 w-8 animate-pulse text-[#42520d]" />
          <p className="text-sm text-black/40">Loading profile…</p>
        </div>
      </main>
    );
  }

  if (!result || result.kind === 'not_found') {
    return (
      <main className="min-h-screen overflow-x-hidden bg-[#fbfaf7] text-black">
        <section className="mx-auto flex min-h-[70vh] max-w-[92rem] flex-col items-start justify-center px-5 sm:px-8">
          <LogoIcon className="mb-10 h-8 w-8 text-black" />
          <h1 className="max-w-3xl text-5xl font-normal leading-none tracking-[-0.045em] md:text-7xl" style={serif}>
            Profile not found.
          </h1>
          <p className="mt-6 text-lg text-black/50">@{handle} doesn&apos;t exist on Apparent yet.</p>
          <Link
            to="/"
            className="mt-10 inline-flex rounded-full bg-[#dcefc7] px-6 py-3 text-sm font-semibold text-black transition hover:bg-[#c9e6ac]"
          >
            Back to Apparent
          </Link>
        </section>
      </main>
    );
  }

  let content: React.ReactNode;
  if (result.kind === 'founder') {
    const p = result.profile;
    content = (
      <FounderProfilePage
        profile={p}
        viewer={viewer}
        onMessage={() => setDmFor({ name: p.profileName || p.username, username: p.username, userId: p.userId })}
      />
    );
  } else if (result.profile.restricted) {
    content = <InvestorRestrictedPage username={result.profile.username} />;
  } else {
    const p = result.profile;
    content = (
      <InvestorProfilePage
        profile={p}
        viewer={viewer}
        onMessage={() => setDmFor({ name: p.displayName || p.username, username: p.username, userId: p.userId })}
      />
    );
  }

  return (
    <>
      {content}
      {dmFor && viewer && <ProfileMessageModal viewer={viewer} target={dmFor} onClose={() => setDmFor(null)} />}
    </>
  );
};


