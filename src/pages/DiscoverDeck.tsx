import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { animate, motion, useMotionValue, useTransform, type PanInfo } from 'framer-motion';
import { ArrowUpRight, BookOpen, Check, Link2, MapPin, RotateCcw, Rocket, Sparkles, Star, TrendingUp, X, Zap } from 'lucide-react';
import { GitHubIcon } from '../components/GitHubIcon';
import { loadInvitableBuilders, saveBuilderDiscoveryState, saveMessage, saveVcInterest } from '../lib/dashboard-service';
import type { AppUser, BuilderNode } from '../lib/apparent-types';

const serif = { fontFamily: 'Georgia, "Times New Roman", serif' };

type Decision = 'pass' | 'like' | 'superlike';

const isUuid = (value?: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value || '');

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('') || name.slice(0, 2).toUpperCase();

const firstNameOf = (name?: string) => (name || 'there').split(/\s+/)[0];

const introBody = (b: BuilderNode, investorName: string) =>
  `Hi ${firstNameOf(b.founderName)} — I came across ${b.company} on Apparent and what you're building stood out. ` +
  `I'd love to get on a quick call this week to learn more. Would that work?\n\n— ${investorName}`;

// Split a founder's MRR string into the headline value and a growth chip,
// e.g. "$24K MRR · +22% MoM" → { value: "$24K MRR", growth: "+22% MoM" }.
const splitGrowth = (mrr: string): { value: string; growth: string } => {
  const match = mrr.match(/([+\-]?\d[\d.,]*\s*%[^,·•|]*)/);
  if (!match) return { value: mrr.trim(), growth: '' };
  const growth = match[0].trim();
  const value = mrr.replace(match[0], '').replace(/[·•|,\s]+$/, '').trim();
  return { value: value || mrr.trim(), growth };
};

// Shimmering MRR display (reuses the .mrr-shimmer effect from the profile mock).
const MrrStat = ({ mrr }: { mrr: string }) => {
  const { value, growth } = splitGrowth(mrr);
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className="text-[0.55rem] font-semibold uppercase tracking-[0.14em] text-white/40">MRR</span>
      <span className="mrr-shimmer text-base font-semibold leading-none">{value}</span>
      {growth && (
        <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-[#58d39a]">
          <TrendingUp className="h-3 w-3" /> {growth}
        </span>
      )}
    </div>
  );
};

const proofIcon = (type: string) => {
  if (type === 'github') return GitHubIcon;
  if (type === 'press') return BookOpen;
  return Rocket;
};

// Deterministic GitHub-style activity grid, seeded per builder (dark palette to
// match the For Founders mock). Decorative: conveys "active builder", consistent
// per builder across renders.
const COMMIT_LEVELS = ['bg-white/[0.05]', 'bg-[#1e3a1e]', 'bg-[#2e6b2e]', 'bg-[#37a04a]', 'bg-[#58d39a]'];
const hashSeed = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};
const mulberry32 = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const commitColumnsFor = (seed: string) => {
  const rand = mulberry32(hashSeed(seed));
  return Array.from({ length: 52 }, () => {
    const quiet = rand() < 0.16;
    const busy = rand() < 0.2;
    return Array.from({ length: 7 }, (_, d) => {
      const weekend = d === 0 || d === 6;
      if (quiet && rand() < 0.8) return 0;
      let r = rand();
      if (busy) r = r * 0.6 + 0.4;
      if (weekend) r *= 0.55;
      if (r < 0.4) return 0;
      if (r < 0.6) return 1;
      if (r < 0.78) return 2;
      if (r < 0.91) return 3;
      return 4;
    });
  });
};

const factsOf = (b: BuilderNode): [string, string][] =>
  (
    [
      ['Category', b.category],
      ['Stage', b.stage],
      ['Traction', b.traction],
      ['Location', b.location],
      ['Raising', b.fundraisingStatus === 'raising' ? `${b.raisingRound ?? ''} ${b.raisingAmount ?? ''}`.trim() : ''],
    ] as [string, string][]
  ).filter(([, v]) => v);

// ── Compact builder card ─────────────────────────────────────────────────────
const BuilderCard = ({ builder }: { builder: BuilderNode }) => {
  const isIngested = builder.origin === 'ingested';
  const raising = builder.fundraisingStatus === 'raising' || builder.fundraisingStatus === 'open';
  const facts = factsOf(builder);
  const links = (builder.proofLinks || []).filter((l) => l.url).slice(0, 4);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[28px] bg-[#1c1c1a] p-6 text-white sm:p-7">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-[#dcefc7] px-3 py-1 text-xs font-semibold text-[#42520d]">
          {isIngested ? builder.sourceLabel || 'Public signal' : 'On Apparent'}
        </span>
        {raising && (
          <span className="rounded-full bg-[#42520d] px-3 py-1 text-xs font-semibold text-white">
            {builder.fundraisingStatus === 'raising'
              ? `Raising${builder.raisingRound ? ` ${builder.raisingRound}` : ''}${builder.raisingAmount ? ` · ${builder.raisingAmount}` : ''}`
              : 'Open to intros'}
          </span>
        )}
        {builder.location && (
          <span className="ml-auto flex items-center gap-1 text-xs font-semibold text-white/55">
            <MapPin className="h-4 w-4 text-[#e7483d]" fill="currentColor" /> {builder.location}
          </span>
        )}
      </div>

      <div className="mt-5 flex items-center gap-3">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#42520d] text-lg font-semibold text-white">
          {initialsOf(builder.founderName || builder.company)}
        </div>
        <div className="min-w-0">
          <p className="truncate text-xl font-semibold tracking-[-0.01em]" style={serif}>
            {builder.company}
          </p>
          {builder.founderName && <p className="truncate text-sm text-white/55">{builder.founderName}</p>}
        </div>
        {typeof builder.fitScore === 'number' && builder.fitScore > 0 && (
          <span className="ml-auto rounded-full bg-[#dcefc7] px-3 py-1.5 text-sm font-semibold text-black">
            {builder.fitScore}% fit
          </span>
        )}
      </div>

      {builder.mrr && (
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
          <MrrStat mrr={builder.mrr} />
        </div>
      )}

      {builder.buildSummary && (
        <p className="mt-4 line-clamp-3 text-sm leading-6 text-white/75">{builder.buildSummary}</p>
      )}

      {facts.length > 0 && (
        <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 border-t border-white/10 pt-5">
          {facts.map(([label, value]) => (
            <div key={label} className="min-w-0">
              <p className="text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-white/40">{label}</p>
              <p className="mt-1 line-clamp-2 text-sm font-medium text-white/85">{value}</p>
            </div>
          ))}
        </div>
      )}

      {builder.matchReasons && builder.matchReasons.length > 0 && (
        <div className="mt-5">
          <p className="mb-2 flex items-center gap-1.5 text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-[#bcd99a]">
            <Sparkles className="h-3 w-3" /> Why they fit
          </p>
          <div className="flex flex-wrap gap-2">
            {builder.matchReasons.slice(0, 3).map((reason) => (
              <span key={reason} className="rounded-full bg-white/[0.06] px-2.5 py-1 text-xs text-white/70">
                {reason}
              </span>
            ))}
          </div>
        </div>
      )}

      {links.length > 0 && (
        <div className="mt-auto flex flex-wrap gap-2 pt-6">
          {links.map((link) => {
            const Icon = proofIcon(link.type);
            return (
              <span
                key={link.url}
                className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-white/75"
              >
                <Icon className="h-3.5 w-3.5" /> {link.label}
              </span>
            );
          })}
        </div>
      )}

      <p className="mt-4 text-center text-[0.65rem] text-white/30">Tap for full profile</p>
    </div>
  );
};

// ── Expanded detail (tap to open) ────────────────────────────────────────────
const BuilderDetail = ({
  builder,
  onClose,
  onDecide,
}: {
  builder: BuilderNode;
  onClose: () => void;
  onDecide: (d: Decision) => void;
}) => {
  const raising = builder.fundraisingStatus === 'raising' || builder.fundraisingStatus === 'open';
  const facts = factsOf(builder);
  const links = (builder.proofLinks || []).filter((l) => l.url);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto overscroll-contain scroll-smooth rounded-t-[28px] bg-[#1c1c1a] text-white sm:rounded-[28px] [scrollbar-color:rgba(255,255,255,0.25)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:w-1.5 hover:[&::-webkit-scrollbar-thumb]:bg-white/35"
        initial={{ y: 40, opacity: 0.6 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 32 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative p-6 sm:p-8">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/70 transition hover:bg-white/20"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex flex-wrap items-center gap-2 pr-8">
            <span className="rounded-full bg-[#dcefc7] px-3 py-1 text-xs font-semibold text-[#42520d]">
              {builder.origin === 'ingested' ? builder.sourceLabel || 'Public signal' : 'On Apparent'}
            </span>
            {raising && (
              <span className="rounded-full bg-[#42520d] px-3 py-1 text-xs font-semibold text-white">
                {builder.fundraisingStatus === 'raising'
                  ? `Raising${builder.raisingRound ? ` ${builder.raisingRound}` : ''}${builder.raisingAmount ? ` · ${builder.raisingAmount}` : ''}`
                  : 'Open to intros'}
              </span>
            )}
            {builder.location && (
              <span className="flex items-center gap-1 text-xs font-semibold text-white/55">
                <MapPin className="h-4 w-4 text-[#e7483d]" fill="currentColor" /> {builder.location}
              </span>
            )}
          </div>

          <div className="mt-5 flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#42520d] text-2xl font-semibold text-white">
              {initialsOf(builder.founderName || builder.company)}
            </div>
            <div className="min-w-0">
              <h2 className="text-2xl font-semibold tracking-[-0.02em]" style={serif}>
                {builder.company}
              </h2>
              {builder.founderName && <p className="text-sm text-white/55">{builder.founderName}</p>}
            </div>
            {typeof builder.fitScore === 'number' && builder.fitScore > 0 && (
              <div className="ml-auto shrink-0 text-right">
                <p className="text-[0.55rem] font-semibold uppercase tracking-[0.14em] text-white/40">Thesis fit</p>
                <p className="text-2xl font-semibold leading-none text-[#bcd99a]">{builder.fitScore}%</p>
              </div>
            )}
          </div>

          {builder.mrr && (
            <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
              <MrrStat mrr={builder.mrr} />
            </div>
          )}

          {builder.buildSummary && (
            <p className="mt-5 text-sm leading-7 text-white/80">{builder.buildSummary}</p>
          )}

          {/* Build activity graph (seeded, GitHub-style) — matches the mock. */}
          {builder.githubUrl && (
            <div className="mt-6 border-t border-white/10 pt-6">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-white/40">Build activity · last year</p>
                <span className="flex items-center gap-1 text-[0.55rem] text-white/35">
                  Less
                  <span className="flex gap-0.5">
                    {COMMIT_LEVELS.map((c, i) => <span key={i} className={`h-2 w-2 rounded-[2px] ${c}`} />)}
                  </span>
                  More
                </span>
              </div>
              <div className="flex gap-1 overflow-x-auto pb-2 [scrollbar-color:rgba(188,217,154,0.35)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#bcd99a]/30 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:h-1.5">
                {commitColumnsFor(builder.id).map((col, w) => (
                  <div key={w} className="flex flex-col gap-1">
                    {col.map((lvl, d) => (
                      <span key={d} className={`h-2.5 w-2.5 shrink-0 rounded-[3px] ${COMMIT_LEVELS[lvl]}`} />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {facts.length > 0 && (
            <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-5 border-t border-white/10 pt-6">
              {facts.map(([label, value]) => (
                <div key={label} className="min-w-0">
                  <p className="text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-white/40">{label}</p>
                  <p className="mt-1 text-sm font-medium text-white/85">{value}</p>
                </div>
              ))}
            </div>
          )}

          {builder.matchReasons && builder.matchReasons.length > 0 && (
            <div className="mt-6">
              <p className="mb-2 flex items-center gap-1.5 text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-[#bcd99a]">
                <Sparkles className="h-3 w-3" /> Why they fit your thesis
              </p>
              <div className="flex flex-wrap gap-2">
                {builder.matchReasons.map((reason) => (
                  <span key={reason} className="rounded-full bg-white/[0.06] px-2.5 py-1 text-xs text-white/70">
                    {reason}
                  </span>
                ))}
              </div>
            </div>
          )}

          {builder.latestActivityLabel && (
            <p className="mt-6 text-xs text-white/45">Latest: {builder.latestActivityLabel}</p>
          )}

          {links.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2 border-t border-white/10 pt-6">
              {links.map((link) => {
                const Icon = proofIcon(link.type);
                return (
                  <a
                    key={link.url}
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-white/80 transition hover:bg-white/12"
                  >
                    <Icon className="h-3.5 w-3.5" /> {link.label}
                  </a>
                );
              })}
            </div>
          )}

          {builder.profileUrl && (
            <Link
              to={builder.profileUrl}
              className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-[#bcd99a] transition hover:text-white"
            >
              View full profile <ArrowUpRight className="h-4 w-4" />
            </Link>
          )}

          {/* Actions */}
          <div className="mt-7 flex items-center justify-center gap-4 border-t border-white/10 pt-6">
            <button
              type="button"
              onClick={() => onDecide('pass')}
              className="flex h-12 w-12 items-center justify-center rounded-full border border-white/15 text-[#e7483d] transition hover:bg-white/5"
            >
              <X className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => onDecide('superlike')}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-[#3aa0ff] text-white shadow-lg shadow-[#3aa0ff]/30 transition hover:-translate-y-0.5"
            >
              <Zap className="h-6 w-6" fill="currentColor" />
            </button>
            <button
              type="button"
              onClick={() => onDecide('like')}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-[#42520d] text-white transition hover:-translate-y-0.5"
            >
              <Star className="h-5 w-5" fill="currentColor" />
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ── The deck ─────────────────────────────────────────────────────────────────
export const DiscoverDeck = ({ user, builders }: { user: AppUser; builders: BuilderNode[] }) => {
  const deck = useMemo(
    () =>
      builders
        .filter((b) => !b.isCurrentUser && b.company)
        .slice()
        .sort((a, b) => (b.fitScore || 0) - (a.fitScore || 0)),
    [builders],
  );

  const len = deck.length;
  const [step, setStep] = useState(0); // monotonic; wraps via modulo → infinite deck
  const [decided, setDecided] = useState(0);
  const [history, setHistory] = useState<{ decision: Decision; builderId: string }[]>([]);
  const [toast, setToast] = useState('');
  const [detail, setDetail] = useState<BuilderNode | null>(null);
  const [invitable, setInvitable] = useState<{ signalId: string; builderName: string; kind: 'like' | 'superlike' }[]>([]);
  const [copied, setCopied] = useState('');
  const busy = useRef(false);

  const current = len ? deck[step % len] : undefined;
  const next = len ? deck[(step + 1) % len] : undefined;
  const investorName = user.username || user.email.split('@')[0];

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-220, 220], [-14, 14]);
  const likeOpacity = useTransform(x, [30, 130], [0, 1]);
  const passOpacity = useTransform(x, [-130, -30], [1, 0]);
  const superOpacity = useTransform(y, [-130, -40], [1, 0]);

  const flash = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(''), 1900);
  };

  // Track liked builders who aren't on Apparent yet so the VC can invite them.
  const addInvitable = (builder: BuilderNode, kind: 'like' | 'superlike') => {
    if (isUuid(builder.founderId) || !builder.id.startsWith('signal:')) return;
    const signalId = builder.id.replace(/^signal:/, '');
    setInvitable((prev) => [
      { signalId, builderName: builder.founderName || builder.company, kind },
      ...prev.filter((p) => p.signalId !== signalId),
    ]);
  };

  const copyInvite = async (it: { signalId: string; builderName: string }) => {
    const url = `${window.location.origin}/claim/${it.signalId}?name=${encodeURIComponent(it.builderName)}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(it.signalId);
      window.setTimeout(() => setCopied(''), 1600);
    } catch {
      /* clipboard blocked */
    }
  };

  const apply = (builder: BuilderNode, decision: Decision) => {
    if (decision === 'pass') {
      saveBuilderDiscoveryState(user, builder.id, { hidden: true }).catch(() => {});
      return;
    }
    if (decision === 'like') {
      saveBuilderDiscoveryState(user, builder.id, { saved: true }).catch(() => {});
      void saveVcInterest(user, builder, 'like');
      addInvitable(builder, 'like');
      flash(`Liked ${builder.company} — they'll see your interest.`);
      return;
    }
    saveBuilderDiscoveryState(user, builder.id, { saved: true, stage: 'Meeting' }).catch(() => {});
    void saveVcInterest(user, builder, 'superlike');
    addInvitable(builder, 'superlike');
    if (isUuid(builder.founderId)) {
      saveMessage(user, {
        recipient: builder.founderName || builder.company,
        recipientId: builder.founderId,
        senderName: investorName,
        subject: `${investorName} wants to talk`,
        body: introBody(builder, investorName),
        status: 'sent',
        context: 'discover',
      }).catch(() => {});
      flash(`Intro sent to ${builder.founderName || builder.company}.`);
    } else {
      flash(`Superliked — they'll be invited to connect.`);
    }
  };

  // Fly the current card out, then advance — only once the animation finishes,
  // so the next card never starts mid-flight (simple + reliable).
  const decide = (decision: Decision) => {
    if (!current || busy.current) return;
    busy.current = true;
    apply(current, decision);
    setHistory((h) => [...h, { decision, builderId: current.id }]);

    const finish = () => {
      setStep((s) => s + 1);
      setDecided((d) => d + 1);
      x.set(0);
      y.set(0);
      busy.current = false;
    };

    if (decision === 'superlike') {
      animate(y, -650, { duration: 0.26, ease: 'easeIn', onComplete: finish });
    } else {
      animate(x, decision === 'pass' ? -650 : 650, { duration: 0.26, ease: 'easeIn', onComplete: finish });
    }
  };

  const undo = () => {
    if (busy.current || !history.length || step === 0) return;
    const last = history[history.length - 1];
    if (last.decision === 'pass') saveBuilderDiscoveryState(user, last.builderId, { hidden: false }).catch(() => {});
    else saveBuilderDiscoveryState(user, last.builderId, { saved: false }).catch(() => {});
    setHistory((h) => h.slice(0, -1));
    setDecided((d) => Math.max(0, d - 1));
    setStep((s) => Math.max(0, s - 1));
    x.set(0);
    y.set(0);
  };

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y < -120 || info.velocity.y < -700) decide('superlike');
    else if (info.offset.x > 120 || info.velocity.x > 700) decide('like');
    else if (info.offset.x < -120 || info.velocity.x < -700) decide('pass');
    else {
      animate(x, 0, { type: 'spring', stiffness: 400, damping: 32 });
      animate(y, 0, { type: 'spring', stiffness: 400, damping: 32 });
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (detail) {
        if (e.key === 'Escape') setDetail(null);
        return;
      }
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp'].includes(e.key)) e.preventDefault();
      if (e.key === 'ArrowLeft') decide('pass');
      else if (e.key === 'ArrowRight') decide('like');
      else if (e.key === 'ArrowUp') decide('superlike');
      else if (e.key === 'Backspace' || e.key.toLowerCase() === 'z') undo();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, step, detail, history.length]);

  useEffect(() => {
    let cancelled = false;
    loadInvitableBuilders(user)
      .then((rows) => {
        if (!cancelled) setInvitable(rows);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <div className="mx-auto flex max-w-md flex-col px-1 py-2">
      <div className="mb-5 text-center">
        <h1 className="text-2xl font-semibold tracking-[-0.02em]" style={serif}>
          Discover builders
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Swipe through founders ranked by your thesis. Tap a card for the full profile.
        </p>
      </div>

      <div className="relative mx-auto h-[clamp(460px,64vh,580px)] w-full">
        {!current ? (
          <div className="flex h-full flex-col items-center justify-center rounded-[28px] border border-dashed border-black/15 bg-white/60 p-8 text-center">
            <Sparkles className="mb-4 h-7 w-7 text-[#42520d]" />
            <p className="text-lg font-semibold">No builders in your deck yet</p>
            <p className="mt-2 max-w-xs text-sm text-gray-500">
              New founders surface here as they ship and join. Set your thesis to sharpen the matches.
            </p>
          </div>
        ) : (
          <>
            {next && (
              <div className="absolute inset-0 scale-[0.96] opacity-60" style={{ transformOrigin: 'top center' }}>
                <BuilderCard builder={next} />
              </div>
            )}
            <motion.div
              className="absolute inset-0 cursor-grab touch-none active:cursor-grabbing"
              style={{ x, y, rotate }}
              drag
              dragSnapToOrigin={false}
              dragElastic={0.6}
              onDragEnd={handleDragEnd}
              onTap={() => {
                if (!busy.current) setDetail(current);
              }}
            >
              <BuilderCard builder={current} />
              <motion.div style={{ opacity: likeOpacity }} className="pointer-events-none absolute left-5 top-6 -rotate-12 rounded-lg border-4 border-[#42c463] px-3 py-1 text-xl font-extrabold text-[#42c463]">
                LIKE
              </motion.div>
              <motion.div style={{ opacity: passOpacity }} className="pointer-events-none absolute right-5 top-6 rotate-12 rounded-lg border-4 border-[#e7483d] px-3 py-1 text-xl font-extrabold text-[#e7483d]">
                PASS
              </motion.div>
              <motion.div style={{ opacity: superOpacity }} className="pointer-events-none absolute inset-x-0 top-5 mx-auto w-fit rounded-lg border-4 border-[#3aa0ff] px-3 py-1 text-xl font-extrabold text-[#3aa0ff]">
                CALL ME
              </motion.div>
            </motion.div>
          </>
        )}
      </div>

      {current && (
        <>
          <div className="mt-6 flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={undo}
              disabled={!history.length || step === 0}
              title="Undo"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-black/10 bg-white text-black/50 shadow-sm transition hover:text-black disabled:opacity-40"
            >
              <RotateCcw className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => decide('pass')}
              title="Pass (←)"
              className="flex h-14 w-14 items-center justify-center rounded-full border border-black/10 bg-white text-[#e7483d] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <X className="h-6 w-6" />
            </button>
            <button
              type="button"
              onClick={() => decide('superlike')}
              title="Superlike — request a call (↑)"
              className="flex h-16 w-16 items-center justify-center rounded-full bg-[#3aa0ff] text-white shadow-lg shadow-[#3aa0ff]/30 transition hover:-translate-y-0.5"
            >
              <Zap className="h-7 w-7" fill="currentColor" />
            </button>
            <button
              type="button"
              onClick={() => decide('like')}
              title="Like (→)"
              className="flex h-14 w-14 items-center justify-center rounded-full bg-[#42520d] text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <Star className="h-6 w-6" fill="currentColor" />
            </button>
          </div>

          <div className="mt-4 flex items-center justify-center gap-5 text-[0.7rem] font-medium text-gray-400">
            <span className="inline-flex items-center gap-1"><X className="h-3.5 w-3.5" /> Pass ←</span>
            <span className="inline-flex items-center gap-1"><Star className="h-3.5 w-3.5" /> Like →</span>
            <span className="inline-flex items-center gap-1"><Zap className="h-3.5 w-3.5" /> Call ↑</span>
            <span className="text-gray-300">·</span>
            <span>{decided} reviewed</span>
          </div>
        </>
      )}

      {/* Invite the builders you liked who aren't on Apparent yet. */}
      {invitable.length > 0 && (
        <div className="mt-8 rounded-[20px] border border-black/10 bg-white/70 p-5">
          <div className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-[#42520d]" />
            <div>
              <p className="text-sm font-semibold">Invite builders you liked</p>
              <p className="mt-0.5 text-xs text-gray-500">
                These founders aren&apos;t on Apparent yet. Send their claim link so you can connect.
              </p>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {invitable.slice(0, 10).map((it) => (
              <div key={it.signalId} className="flex items-center gap-3 rounded-xl bg-[#fbfaf7] px-3 py-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#42520d] text-xs font-semibold text-white">
                  {initialsOf(it.builderName || 'B')}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{it.builderName || 'Builder'}</p>
                  <p className="text-xs text-gray-500">{it.kind === 'superlike' ? 'You want a call' : 'You liked them'}</p>
                </div>
                <button
                  type="button"
                  onClick={() => copyInvite(it)}
                  className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#42520d] px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90"
                >
                  {copied === it.signalId ? <Check className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />}
                  {copied === it.signalId ? 'Copied!' : 'Copy invite link'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Portal to body so the fixed overlay escapes the dashboard's transformed
          motion wrapper (which would otherwise scope `fixed` to a tall element). */}
      {detail &&
        createPortal(
          <BuilderDetail
            builder={detail}
            onClose={() => setDetail(null)}
            onDecide={(d) => {
              setDetail(null);
              decide(d);
            }}
          />,
          document.body,
        )}

      {toast &&
        createPortal(
          <div className="pointer-events-none fixed bottom-8 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-[#1c1c1a] px-4 py-2 text-sm font-medium text-white shadow-xl">
            {toast}
          </div>,
          document.body,
        )}
    </div>
  );
};
