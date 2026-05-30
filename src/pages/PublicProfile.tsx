import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowUpRight,
  BookOpen,
  Briefcase,
  Check,
  ChevronRight,
  Globe,
  Link as LinkIcon,
  MapPin,
  MessageSquare,
  Rocket,
  Send,
  Share2,
  Target,
  Users,
  X,
} from 'lucide-react';
import { LogoIcon } from '@/components/LogoIcon';
import { GitHubIcon } from '@/components/GitHubIcon';
import { GitHubPanel } from '@/components/GitHubPanel';
import { loadPublicProfile, saveMessage } from '@/lib/dashboard-service';
import { getCurrentAppUser } from '@/lib/auth-service';
import type { AppUser, PublicFounderProfile, PublicInvestorProfile, PublicProfileResult } from '@/lib/apparent-types';

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
  const url = typeof window !== 'undefined' ? `${window.location.origin}/@${username}` : `/@${username}`;
  const shareText = `${name} on Apparent`;

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
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex items-center gap-1.5 rounded-full border border-black/15 bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-black/5"
      >
        <Share2 className="h-4 w-4" /> Share
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-50 mt-2 w-60 rounded-2xl border border-black/10 bg-white p-2 shadow-xl">
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
  const pastProductList = profile.pastProducts
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);

  const links = [
    profile.website && { label: 'Website', href: profile.website, icon: Globe },
    profile.github && { label: 'GitHub', href: profile.github, icon: GitHubIcon },
    profile.linkedin && { label: 'LinkedIn', href: profile.linkedin, icon: LinkIcon },
    profile.xProfile && { label: 'X / Twitter', href: profile.xProfile, icon: ArrowUpRight },
    profile.press && { label: 'More', href: profile.press, icon: BookOpen },
  ].filter(Boolean) as { label: string; href: string; icon: React.ElementType }[];

  return (
    <main className="overflow-x-hidden bg-[#fbfaf7] text-black">
      {/* ── Profile card hero ── */}
      <section className="mx-auto max-w-[82rem] px-5 pb-10 pt-12 sm:px-8 md:pt-16">
        <div className="overflow-hidden rounded-[32px] border border-black/10 bg-white/80 shadow-[0_18px_60px_rgba(0,0,0,0.06)]">
          {/* Status row */}
          <div className="flex flex-wrap items-center gap-2 border-b border-black/5 px-6 py-4 sm:px-8">
            <span className="rounded-full bg-[#dcefc7] px-3 py-1 text-xs font-semibold text-[#42520d]">Founder on Apparent</span>
            {(profile.fundraisingStatus === 'raising' || profile.fundraisingStatus === 'open') && (
              <span className="rounded-full bg-[#42520d] px-3 py-1 text-xs font-semibold text-white">
                {profile.fundraisingStatus === 'raising'
                  ? `Raising${profile.raisingRound ? ` ${profile.raisingRound}` : ''}${profile.raisingAmount ? ` · ${profile.raisingAmount}` : ''}`
                  : 'Open to investor intros'}
              </span>
            )}
            {profile.location && (
              <span className="ml-auto flex items-center gap-1 text-xs font-medium text-black/50">
                <MapPin className="h-3 w-3" /> {profile.location}
              </span>
            )}
          </div>

          {/* Identity + actions */}
          <div className="px-6 py-7 sm:px-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-center gap-4">
                <Avatar src={profile.profilePhotoUrl} name={profile.profileName || profile.username} bg="#dcefc7" />
                <div className="min-w-0">
                  <h1 className="text-3xl font-normal leading-tight tracking-[-0.03em] sm:text-4xl" style={serif}>
                    {profile.profileName || profile.username || 'Apparent Builder'}
                  </h1>
                  <p className="mt-1 text-sm font-semibold text-black/55">@{profile.username}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <MessageButton viewer={viewer} name={profile.profileName || profile.username} onMessage={onMessage} />
                {profile.shareable !== false && (
                  <ShareButton username={profile.username} name={profile.profileName || profile.username} />
                )}
              </div>
            </div>

            {profile.headline && (
              <p className="mt-6 max-w-3xl text-lg font-medium leading-7 text-black/75">{profile.headline}</p>
            )}
            {profile.bio && (
              <p className="mt-3 max-w-3xl text-base leading-7 text-black/60">{profile.bio}</p>
            )}

            {links.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-2">
                {links.map(({ label, href, icon: Icon }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-3.5 py-1.5 text-xs font-medium text-black/70 transition hover:border-black/20 hover:text-black"
                  >
                    <Icon className="h-3.5 w-3.5" /> {label}
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Build facts grid */}
          {(() => {
            const facts = [
              { icon: Rocket, label: 'Current build', value: profile.currentBuild },
              { icon: Target, label: 'Category', value: profile.category },
              { icon: ChevronRight, label: 'Stage', value: profile.stage },
              { icon: Users, label: 'Traction', value: profile.traction },
            ].filter((f) => f.value);
            if (facts.length === 0) return null;
            return (
              <div className="grid gap-px border-t border-black/5 bg-black/[0.06] sm:grid-cols-2 lg:grid-cols-4">
                {facts.map(({ icon: Icon, label, value }) => (
                  <div key={label} className="bg-[#fbfaf7] px-6 py-5 sm:px-8">
                    <Icon className="mb-3 h-4 w-4 text-[#42520d]" />
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-black/40">{label}</p>
                    <p className="mt-1.5 text-sm leading-6 text-black/70">{value}</p>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      </section>

      {/* ── GitHub (live public stats + contribution graph) ── */}
      {profile.github && <GitHubPanel github={profile.github} />}

      {/* ── Product launches ── */}
      {profile.launches.length > 0 && (
        <section className="mx-auto max-w-[82rem] border-t border-black/10 px-5 py-16 sm:px-8">
          <SectionLabel>Products &amp; launches</SectionLabel>
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
        </section>
      )}

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

  const infoRows = [
    visible('sectors') && profile.sectors && { icon: Target, label: 'Sectors', value: profile.sectors },
    visible('stage') && profile.stage && { icon: ChevronRight, label: 'Stage', value: profile.stage },
    visible('geography') && profile.geography && { icon: MapPin, label: 'Geography', value: profile.geography },
    visible('checkSize') && profile.checkSize && { icon: Briefcase, label: 'Check size', value: profile.checkSize },
  ].filter(Boolean) as { icon: React.ElementType; label: string; value: string }[];

  const portfolioList = visible('portfolioExamples')
    ? profile.portfolioExamples.split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  return (
    <main className="overflow-x-hidden bg-[#fbfaf7] text-black">
      {/* ── Profile card hero ── */}
      <section className="mx-auto max-w-[82rem] px-5 pb-10 pt-12 sm:px-8 md:pt-16">
        <div className="overflow-hidden rounded-[32px] border border-black/10 bg-white/80 shadow-[0_18px_60px_rgba(0,0,0,0.06)]">
          {/* Status row */}
          <div className="flex flex-wrap items-center gap-2 border-b border-black/5 px-6 py-4 sm:px-8">
            <span className="rounded-full bg-[#42520d] px-3 py-1 text-xs font-semibold text-white">Investor on Apparent</span>
          </div>

          {/* Identity + actions */}
          <div className="px-6 py-7 sm:px-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-center gap-4">
                <Avatar src={profile.profilePhotoUrl} name={profile.displayName || profile.username} bg="#42520d" />
                <div className="min-w-0">
                  <h1 className="text-3xl font-normal leading-tight tracking-[-0.03em] sm:text-4xl" style={serif}>
                    {profile.displayName || profile.username}
                  </h1>
                  <p className="mt-1 text-sm font-semibold text-black/55">@{profile.username}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <MessageButton viewer={viewer} name={profile.displayName || profile.username} onMessage={onMessage} />
                {profile.shareable !== false && (
                  <ShareButton username={profile.username} name={profile.displayName || profile.username} />
                )}
              </div>
            </div>

            {visible('thesis') && profile.thesis && (
              <p className="mt-6 max-w-3xl text-lg leading-7 text-black/70">{profile.thesis}</p>
            )}
          </div>

          {/* Investment parameters grid */}
          {infoRows.length > 0 && (
            <div className="grid gap-px border-t border-black/5 bg-black/[0.06] sm:grid-cols-2 lg:grid-cols-4">
              {infoRows.map(({ icon: Icon, label, value }) => (
                <div key={label} className="bg-[#fbfaf7] px-6 py-5 sm:px-8">
                  <Icon className="mb-3 h-4 w-4 text-[#42520d]" />
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-black/40">{label}</p>
                  <p className="mt-1.5 text-sm leading-6 text-black/70">{value}</p>
                </div>
              ))}
            </div>
          )}
        </div>
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

      {/* ── Founder signals ── */}
      {visible('founderSignals') && profile.founderSignals && (
        <section className="mx-auto max-w-[82rem] border-t border-black/10 px-5 py-16 sm:px-8">
          <SectionLabel>What they back</SectionLabel>
          <p className="max-w-2xl text-lg leading-8 text-black/65">{profile.founderSignals}</p>
        </section>
      )}

      {/* ── Connect / message ── */}
      <ConnectSection viewer={viewer} name={profile.displayName || profile.username} onMessage={onMessage} tone="light" />
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
