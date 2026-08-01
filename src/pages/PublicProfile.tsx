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
import NotFound4042 from '@/components/4042';
import { GitHubIcon } from '@/components/GitHubIcon';
import { loadPublicProfile, saveMessage } from '@/lib/dashboard-service';
import { getCurrentAppUser } from '@/lib/auth-service';
import type { AppUser, PublicFounderProfile, PublicInvestorProfile, PublicProfileResult } from '@/lib/apparent-types';
import { VerifiedAvatar } from '@/components/VerifiedAvatar';
import { GitHubBadge } from '@/components/GitHubBadge';

// Editorial: the display font is now Inter Tight (kept the name `serif` to avoid churn).
const serif = { fontFamily: 'var(--ed-font)' };

// ─── tiny helpers ──────────────────────────────────────────────────────────────

const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

const Avatar = ({ src, name, size = 'lg', bg = 'var(--ed-ink)' }: { src?: string; name: string; size?: 'sm' | 'lg'; bg?: string }) => {
  const dim = size === 'lg' ? 'h-20 w-20 text-xl rounded-[14px]' : 'h-11 w-11 text-sm rounded-[8px]';
  return src ? (
    <img src={src} alt={name} className={`${dim} shrink-0 object-cover`} />
  ) : (
    <div
      className={`${dim} flex shrink-0 items-center justify-center font-semibold text-[var(--ed-paper)]`}
      style={{ background: bg }}
    >
      {initials(name) || name.slice(0, 2).toUpperCase()}
    </div>
  );
};

const Tag = ({ children, accent = false }: { children: React.ReactNode; accent?: boolean }) => (
  <span
    className={`ap-profile-tag${accent ? ' ap-profile-tag--accent' : ''}`}
  >
    {children}
  </span>
);

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="ap-profile-label">{children}</p>
);

// ─── messaging ──────────────────────────────────────────────────────────────

const firstNameOf = (name: string) => name.split(/\s+/)[0] || 'them';

// Primary "Message" button for the hero. DM is gated to logged-in viewers.
const MessageButton = ({ viewer, name, onMessage }: { viewer: AppUser | null; name: string; onMessage: () => void }) => {
  const cls =
    'ed-btn ed-btn-filled ap-profile-action';
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
  const itemCls = 'flex w-full items-center gap-2 rounded-[8px] px-3 py-2 text-sm text-[var(--ed-ink)] transition-colors hover:bg-[var(--ed-canvas)]';

  return (
    <div className="inline-block">
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        className="ed-btn ed-btn-outline ap-profile-action"
      >
        <Share2 className="h-4 w-4" /> Share
      </button>
      {open && pos && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          {/* Fixed so it isn't clipped by the profile card's overflow-hidden. */}
          <div
            className="fixed z-50 w-60 rounded-[14px] border border-black/10 bg-white p-2 shadow-xl"
            style={{ top: pos.top, left: pos.left }}
          >
            <button type="button" onClick={copy} className={itemCls}>
              {copied ? <Check className="h-4 w-4 text-[var(--ed-ink)]" /> : <LinkIcon className="h-4 w-4" />}
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
  const card = tone === 'dark' ? 'ap-profile-connect--dark' : 'ap-profile-connect--light';
  const eyebrow = tone === 'dark' ? 'text-white/60' : 'text-[var(--ed-smoke)]';
  const sub = tone === 'dark' ? 'text-white/70' : 'text-[var(--ed-graphite)]';
  const primary =
    tone === 'dark'
      ? 'bg-white text-[var(--ed-ink)] hover:bg-[var(--ed-canvas)]'
      : 'bg-[var(--ed-canvas)] text-black hover:bg-[var(--ed-fog)]';
  const secondary =
    tone === 'dark' ? 'border-white/30 text-white hover:bg-white/10' : 'border-black/20 text-black hover:bg-black/5';

  return (
    <section className="ap-profile-connect-wrap ed-inner">
      <div className={`ap-profile-connect ${card}`}>
        <div>
          <p className={`ap-profile-connect-label ${eyebrow}`}>{viewer ? 'On Apparent' : 'Connect on Apparent'}</p>
          <h2 className="ap-profile-connect-title" style={serif}>
            {viewer ? `Reach out to ${fname}` : `Want to reach ${fname}?`}
          </h2>
          <p className={`ap-profile-connect-copy ${sub}`}>
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
              className={`ed-btn inline-flex items-center justify-center gap-1.5 ${primary}`}
            >
              <MessageSquare className="h-4 w-4" /> Message {fname}
            </button>
          ) : (
            <>
              <Link to="/login" className={`ed-btn justify-center text-center ${primary}`}>
                Log in to message
              </Link>
              <Link to="/login" className={`ed-btn justify-center text-center ${secondary}`}>
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
      <div className="w-full max-w-md rounded-[14px] border border-[var(--ed-fog)] bg-white p-6 shadow-[0_24px_80px_rgba(34,34,34,0.16)]" onClick={(event) => event.stopPropagation()}>
        {status === 'sent' ? (
          <div className="py-6 text-center">
            <p className="text-lg font-semibold" style={serif}>Message sent</p>
            <p className="mt-2 text-sm text-black/60">Your message to {target.name} is on its way.</p>
            <button type="button" onClick={onClose} className="ed-btn ed-btn-filled mt-6">
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
              className="mt-4 h-10 w-full rounded-[8px] border border-black/10 bg-[var(--ed-canvas)] px-3 text-sm outline-none focus:border-black/30"
            />
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder={`Write to ${target.name}…`}
              className="mt-3 min-h-32 w-full resize-none rounded-[8px] border border-black/10 bg-[var(--ed-canvas)] px-3 py-2 text-sm leading-relaxed outline-none focus:border-black/30"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={onClose} className="ed-btn ed-btn-outline">
                Cancel
              </button>
              <button
                type="button"
                onClick={send}
                disabled={status === 'sending' || !body.trim()}
                className="ed-btn ed-btn-filled disabled:cursor-not-allowed disabled:opacity-50"
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
  'bg-black/20',
  'bg-black/40',
  'bg-black/65',
  'bg-[var(--ed-ink)]',
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

const SkeletonLaunchCard = () => (
  <div className="ap-profile-card">
    <div className="flex items-center gap-3">
      <div className="ap-profile-skeleton h-10 w-10 rounded-[8px]" />
      <div className="flex-1 space-y-2">
        <div className="ap-profile-skeleton h-4 w-28 rounded" />
        <div className="ap-profile-skeleton h-3 w-16 rounded" />
      </div>
    </div>
    <div className="mt-4 space-y-2">
      <div className="ap-profile-skeleton h-3 w-full rounded" />
      <div className="ap-profile-skeleton h-3 w-3/4 rounded" />
    </div>
    <div className="mt-4 flex gap-2">
      <div className="ap-profile-skeleton h-6 w-14 rounded-full" />
      <div className="ap-profile-skeleton h-6 w-10 rounded-full" />
    </div>
  </div>
);

const FounderDossier = ({
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

  const realStarsLabel = ghStats ? `${compact(ghStats.stars)} stars / ${compact(ghStats.publicRepos)} repos` : 'GitHub';
  const headlineCount = `${compact(calendar?.totalContributions ?? 0)} contributions`;

  const name = profile.profileName || profile.username || 'Apparent Builder';
  const headline = profile.headline || profile.bio || '';
  const fundraisingPill =
    profile.fundraisingStatus === 'raising'
      ? `Raising${profile.raisingRound ? ` ${profile.raisingRound}` : ''}${
          profile.raisingAmount ? ` / ${profile.raisingAmount}` : ''
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

  const pastProductList = profile.pastProducts
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);

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
    <div className="ap-dossier ed-inner">
      {/* ── Identity rail — sticks while the evidence scrolls past ── */}
      <aside className="ap-rail">
        <div className="ap-rail-id">
          <VerifiedAvatar
            src={profile.profilePhotoUrl}
            name={name}
            size="lg"
            bg="var(--ed-ink)"
            verified={profile.githubVerified}
          />
          <div className="min-w-0">
            <h1 className="ap-rail-name" style={serif}>{name}</h1>
            <p className="ap-rail-handle">@{profile.username}</p>
          </div>
        </div>

        <div className="ap-rail-meta">
          <span className="ap-profile-tag">Founder on Apparent</span>
          {/* Sticky status: the detailed Raising block scrolls away, and it
              only renders when there's a round/amount/ask to show — this pill
              keeps the signal up for profiles that set status and nothing else. */}
          {fundraisingPill && <span className="ap-profile-tag ap-profile-tag--accent">{fundraisingPill}</span>}
          {profile.location && (
            <span className="ap-profile-location">
              <MapPin className="h-3.5 w-3.5" /> {profile.location}
            </span>
          )}
        </div>

        {profile.githubVerified && (
          <GitHubBadge
            username={profile.githubUsername || ghLogin || ''}
            link={`https://github.com/${profile.githubUsername || ghLogin}`}
          />
        )}

        <div className="ap-rail-actions">
          <MessageButton viewer={viewer} name={name} onMessage={onMessage} />
          {profile.shareable !== false && (
            <ShareButton username={profile.username} name={name} />
          )}
        </div>

        {links.length > 0 && (
          <div className="ap-rail-links">
            {links.map(({ label, href, icon: Icon }) => (
              <a key={label} href={href} target="_blank" rel="noreferrer" className="ap-rail-link">
                <Icon className="h-3.5 w-3.5 shrink-0" /> {label}
                {label === 'GitHub' && profile.githubVerified && (
                  <BadgeCheck className="h-3 w-3 text-[var(--ed-ink)]" />
                )}
                <ArrowUpRight className="ap-rail-link-out h-3.5 w-3.5" />
              </a>
            ))}
          </div>
        )}
      </aside>

      {/* ── Evidence stream — ordered by what a visitor came to find out ── */}
      <div className="ap-stream">
        {/* 1. The pitch, as the largest type on the page. */}
        <section className="ap-block">
          {headline ? (
            <p className="ap-lede">{headline}</p>
          ) : (
            <div>
              <div className="space-y-2">
                <div className="ap-profile-skeleton h-5 w-2/3 max-w-md rounded" />
                <div className="ap-profile-skeleton h-5 w-1/2 max-w-xs rounded" />
              </div>
              {!isOwnProfile && <span className="ap-profile-tag mt-4">Incomplete</span>}
              {isOwnProfile && (
                <Link
                  to="/dashboard/founder/profile"
                  className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[var(--ed-ink)]/55 transition-colors hover:text-[var(--ed-ink)]"
                >
                  <Plus className="h-3 w-3" /> Add a headline
                </Link>
              )}
            </div>
          )}
        </section>

        {/* 2. Raising — the most actionable fact, so it sits near the top
               instead of at the bottom of the page like it used to. */}
        {(profile.fundraisingStatus === 'raising' || profile.fundraisingStatus === 'open') &&
          (profile.raisingAsk || profile.raisingRound || profile.raisingAmount) && (
            <section className="ap-block">
              <div className="ap-block-head">
                <SectionLabel>
                  {profile.fundraisingStatus === 'raising' ? 'Raising now' : 'Open to investor intros'}
                </SectionLabel>
              </div>
              <div className="ap-raise">
                {profile.raisingAmount && (
                  <span className="ap-raise-figure" style={serif}>{profile.raisingAmount}</span>
                )}
                {profile.raisingRound && <Tag accent>{profile.raisingRound}</Tag>}
                {profile.openToContact && <Tag>Open to contact</Tag>}
              </div>
              {profile.raisingAsk && <p className="ap-profile-body mt-5">{profile.raisingAsk}</p>}
            </section>
          )}

        {/* 3. Proof — the contribution grid and the hard facts together, since
               they answer the same question: is this real? */}
        {((ghHandle && calendar) || facts.length > 0 || (!ghHandle && isOwnProfile)) && (
          <section className="ap-block">
            <div className="ap-block-head">
              <SectionLabel>Proof</SectionLabel>
            </div>

            {ghHandle && calendar && (
              <div className="ap-profile-github">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="ap-profile-micro">
                    {headlineCount} / last year{calendar ? ' / verified' : ''}
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
                          <span key={j} className={`h-2.5 w-2.5 rounded-[2px] ${COMMIT_LEVELS[level]}`} />
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

            {!ghHandle && isOwnProfile && (
              <Link to="/dashboard/founder/profile" className="ap-profile-empty-link">
                <GitHubIcon className="h-5 w-5 shrink-0 text-black/35" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-black/65">Connect GitHub</p>
                  <p className="text-xs text-black/40">Show your contribution history to investors</p>
                </div>
                <ArrowUpRight className="ml-auto h-4 w-4 shrink-0 text-black/25" />
              </Link>
            )}

            {facts.length > 0 && (
              <div className={`ap-stats${ghHandle && calendar ? ' mt-7' : ''}`}>
                {facts.map((f) => (
                  <div key={f.label} className="ap-stat">
                    <p className="ap-profile-micro">{f.label}</p>
                    <p className="ap-stat-value">{f.value}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* 4. The work itself. */}
        <section className="ap-block">
          <div className="ap-block-head">
            <SectionLabel>Products &amp; launches</SectionLabel>
            {profile.launches.length === 0 && !isOwnProfile && (
              <span className="ap-profile-tag">Incomplete</span>
            )}
          </div>
          {profile.launches.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {profile.launches.map((launch) => (
                <Link
                  key={launch.id}
                  to={`/projects/${launch.slug || launch.id}`}
                  className="ap-profile-card group"
                >
                  <div className="flex items-center gap-3">
                    {launch.logoUrl ? (
                      <img
                        src={launch.logoUrl}
                        alt=""
                        className="h-10 w-10 rounded-[8px] object-contain p-1"
                        onError={(e) => {
                          const img = e.currentTarget;
                          img.style.display = 'none';
                          const fallback = img.nextElementSibling as HTMLElement | null;
                          if (fallback) fallback.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div
                      className="h-10 w-10 items-center justify-center rounded-[8px] bg-[var(--ed-canvas)] text-xs font-bold text-[var(--ed-ink)]"
                      style={{ display: launch.logoUrl ? 'none' : 'flex' }}
                    >
                      {launch.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base font-semibold text-[var(--ed-ink)]" style={serif}>
                        {launch.name}
                      </p>
                      <p className="mt-0.5 text-xs text-black/50">{launch.category}</p>
                    </div>
                    <ArrowUpRight className="h-4 w-4 shrink-0 text-black/30 transition group-hover:text-[var(--ed-ink)]" />
                  </div>
                  <p className="mt-4 line-clamp-2 text-sm leading-6 text-black/60">
                    {launch.tagline || launch.intro}
                  </p>
                  {launch.metrics && (
                    <p className="mt-3 text-xs font-medium text-[var(--ed-ink)]">{launch.metrics}</p>
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
            <div className="grid gap-4 sm:grid-cols-2">
              <Link
                to="/dashboard/founder/profile"
                className="ap-profile-card ap-profile-card--empty flex flex-col items-center justify-center gap-3 text-center"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--ed-canvas)]">
                  <Plus className="h-5 w-5 text-[var(--ed-ink)]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--ed-ink)]">Add your first launch</p>
                  <p className="mt-1 text-xs text-black/45">Show investors what you've built</p>
                </div>
              </Link>
              <SkeletonLaunchCard />
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <SkeletonLaunchCard />
              <SkeletonLaunchCard />
            </div>
          )}
        </section>

        {/* 5. Pitch material for the latest launch. */}
        {latestLaunch && (latestLaunch.pitchVideoUrl || latestLaunch.demoVideoUrl || latestLaunch.pitchDeckUrl) && (
          <section className="ap-block">
            <div className="ap-block-head">
              <SectionLabel>Pitch</SectionLabel>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {(latestLaunch.pitchVideoUrl || latestLaunch.demoVideoUrl) && (
                <a
                  href={latestLaunch.pitchVideoUrl || latestLaunch.demoVideoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="ap-profile-media ap-profile-media--video group"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-[var(--ed-ink)] shadow-lg transition-transform group-hover:scale-105">
                    <Play className="h-5 w-5 translate-x-[1px]" />
                  </span>
                  <span className="absolute bottom-3 left-3 text-xs font-semibold uppercase tracking-[0.16em] text-white">
                    {latestLaunch.pitchVideoUrl ? 'Seed pitch' : 'Demo'}
                  </span>
                </a>
              )}
              {latestLaunch.pitchDeckUrl && (
                <a
                  href={latestLaunch.pitchDeckUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="ap-profile-media ap-profile-media--deck group"
                >
                  <FileText className="h-6 w-6 text-[var(--ed-ember)]" />
                  <div>
                    <p className="text-base font-semibold text-[var(--ed-ink)]">Pitch deck</p>
                    <p className="mt-2 text-sm text-[var(--ed-graphite)]">
                      Open the material attached to the latest launch.
                    </p>
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.14em] text-black/55">
                    <span>Deck</span>
                    <span>Open</span>
                  </div>
                </a>
              )}
            </div>
          </section>
        )}

        {/* 6. Track record. */}
        {pastProductList.length > 0 && (
          <section className="ap-block">
            <div className="ap-block-head">
              <SectionLabel>Past products</SectionLabel>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2">
              {pastProductList.map((item) => (
                <li key={item} className="ap-profile-list-item">
                  <Briefcase className="h-3.5 w-3.5 shrink-0 text-[var(--ed-ink)]" />
                  {item}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* 7. The ask. */}
        {profile.lookingFor && (
          <section className="ap-block">
            <div className="ap-block-head">
              <SectionLabel>Looking to meet</SectionLabel>
            </div>
            <p className="ap-profile-body">{profile.lookingFor}</p>
          </section>
        )}
      </div>
    </div>
  );
};

// ─── founder profile ──────────────────────────────────────────────────────────

const FounderProfilePage = ({
  profile,
  viewer,
  onMessage,
}: {
  profile: PublicFounderProfile;
  viewer: AppUser | null;
  onMessage: () => void;
}) => {
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
    <main className="ed-page apparent-profile apparent-profile-founder">
      {/* ── Completion banner (own profile, incomplete) ── */}
      {isOwnProfile && !isProfileComplete && (
        <div className="ap-profile-completion">
          <div className="ed-inner flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex gap-1">
                {Object.values(completionFields).map((done, i) => (
                  <div
                    key={i}
                    className={`h-1.5 w-8 rounded-full transition-colors ${done ? 'bg-[var(--ed-ink)]' : 'bg-[var(--ed-fog)]'}`}
                  />
                ))}
              </div>
              <p className="text-xs font-semibold text-black/50">
                {completedCount}/{totalCount} sections complete
              </p>
            </div>
            <Link
              to="/dashboard/founder/profile"
              className="shrink-0 text-xs font-semibold text-[var(--ed-ink)] hover:underline"
            >
              Complete profile
            </Link>
          </div>
        </div>
      )}

      <FounderDossier profile={profile} viewer={viewer} onMessage={onMessage} isOwnProfile={isOwnProfile} />

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
    <main className="ed-page apparent-profile apparent-profile-investor">
      {/* Same dossier shape as the founder side: sticky identity rail, then
          the thesis and what it buys as an evidence stream. */}
      <div className="ap-dossier ed-inner">
        <aside className="ap-rail">
          <div className="ap-rail-id">
            <Avatar src={profile.profilePhotoUrl} name={name} bg="var(--ed-ink)" />
            <div className="min-w-0">
              <h1 className="ap-rail-name" style={serif}>{name}</h1>
              <p className="ap-rail-handle">@{profile.username}</p>
            </div>
          </div>

          <div className="ap-rail-meta">
            <span className="ap-profile-tag ap-profile-tag--accent">Investor on Apparent</span>
          </div>

          <div className="ap-rail-actions">
            <MessageButton viewer={viewer} name={name} onMessage={onMessage} />
            {profile.shareable !== false && (
              <ShareButton username={profile.username} name={name} />
            )}
          </div>
        </aside>

        <div className="ap-stream">
          {/* Thesis leads — it's the investor equivalent of the founder lede. */}
          <section className="ap-block">
            {visible('thesis') && profile.thesis ? (
              <p className="ap-lede">{profile.thesis}</p>
            ) : (
              <div className="space-y-2">
                <div className="ap-profile-skeleton h-5 w-2/3 max-w-md rounded" />
                <div className="ap-profile-skeleton h-5 w-1/2 max-w-xs rounded" />
              </div>
            )}
          </section>

          {/* Mandate: sectors / stage / geography / check size. */}
          {facts.length > 0 && (
            <section className="ap-block">
              <div className="ap-block-head">
                <SectionLabel>Mandate</SectionLabel>
              </div>
              <div className="ap-stats">
                {facts.map((f) => (
                  <div key={f.label} className="ap-stat">
                    <p className="ap-profile-micro">{f.label}</p>
                    <p className="ap-stat-value">{f.value}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {portfolioList.length > 0 && (
            <section className="ap-block">
              <div className="ap-block-head">
                <SectionLabel>Companies that match their taste</SectionLabel>
              </div>
              <div className="flex flex-wrap gap-2">
                {portfolioList.map((co) => (
                  <Tag key={co} accent>{co}</Tag>
                ))}
              </div>
            </section>
          )}

          {visible('founderSignals') && profile.founderSignals && (
            <section className="ap-block">
              <div className="ap-block-head">
                <SectionLabel>What they back</SectionLabel>
              </div>
              <p className="ap-profile-body">{profile.founderSignals}</p>
            </section>
          )}
        </div>
      </div>

      {/* ── Connect / message ── */}
      <ConnectSection viewer={viewer} name={name} onMessage={onMessage} tone="dark" />
    </main>
  );
};

// ─── restricted investor gate ─────────────────────────────────────────────────

const InvestorRestrictedPage = ({ username }: { username: string }) => (
  <main className="ed-page apparent-profile apparent-profile-restricted">
    <section className="ap-profile-hero ed-inner min-h-[70dvh]">
      <p className="ap-profile-label">Apparent investor</p>
      <h1 className="ap-profile-name ap-profile-name--large" style={serif}>
        @{username}
      </h1>
      <p className="ap-profile-dek">
        This investor profile is only visible to Apparent members. Sign in or create an account to view their full thesis, sectors, and contact details.
      </p>
      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          to="/login?role=founder"
          className="ed-btn ed-btn-filled"
        >
          Sign in as founder
        </Link>
        <Link
          to="/login?role=investor"
          className="ed-btn ed-btn-outline"
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
      <main className="ed-page apparent-profile flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <LogoIcon className="h-8 w-8 animate-pulse text-[var(--ed-ink)]" />
          <p className="text-sm text-black/40">Loading profile…</p>
        </div>
      </main>
    );
  }

  if (!result || result.kind === 'not_found') {
    return (
      <main className="ed-page apparent-profile min-h-screen overflow-x-hidden">
        <NotFound4042
          title="Profile not found"
          message={`@${handle || 'that profile'} does not exist on Apparent yet.`}
          primaryLabel="Back to Apparent"
        />
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


