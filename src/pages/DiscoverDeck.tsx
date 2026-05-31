import { useEffect, useMemo, useState } from 'react';
import { motion, useMotionValue, useTransform, type PanInfo } from 'framer-motion';
import { BookOpen, MapPin, RotateCcw, Rocket, Sparkles, Star, X, Zap } from 'lucide-react';
import { GitHubIcon } from '../components/GitHubIcon';
import { saveBuilderDiscoveryState, saveMessage, saveVcInterest } from '../lib/dashboard-service';
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

const proofIcon = (type: string) => {
  if (type === 'github') return GitHubIcon;
  if (type === 'press') return BookOpen;
  return Rocket;
};

// ── The visual builder card (presentation only) ──────────────────────────────
const BuilderCard = ({ builder }: { builder: BuilderNode }) => {
  const isIngested = builder.origin === 'ingested';
  const raising =
    builder.fundraisingStatus === 'raising' || builder.fundraisingStatus === 'open';
  const facts = [
    ['Category', builder.category],
    ['Stage', builder.stage],
    ['Traction', builder.traction],
    ['Location', builder.location],
  ].filter(([, v]) => v) as [string, string][];
  const links = (builder.proofLinks || []).filter((l) => l.url).slice(0, 4);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[28px] bg-[#1c1c1a] p-6 text-white sm:p-7">
      {/* Status row */}
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

      {/* Identity */}
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

      {/* Summary */}
      {builder.buildSummary && (
        <p className="mt-4 line-clamp-3 text-sm leading-6 text-white/75">{builder.buildSummary}</p>
      )}

      {/* Facts */}
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

      {/* Match reasons */}
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

      {/* Proof links */}
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
    </div>
  );
};

// ── The draggable top card. Keyed per builder so motion values reset. ─────────
const SwipeCard = ({ builder, onDecide }: { builder: BuilderNode; onDecide: (d: Decision) => void }) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-220, 220], [-14, 14]);
  const likeOpacity = useTransform(x, [30, 130], [0, 1]);
  const passOpacity = useTransform(x, [-130, -30], [1, 0]);
  const superOpacity = useTransform(y, [-130, -40], [1, 0]);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y < -120 || info.velocity.y < -800) onDecide('superlike');
    else if (info.offset.x > 120 || info.velocity.x > 800) onDecide('like');
    else if (info.offset.x < -120 || info.velocity.x < -800) onDecide('pass');
  };

  return (
    <motion.div
      className="absolute inset-0 cursor-grab active:cursor-grabbing"
      style={{ x, y, rotate }}
      drag
      dragSnapToOrigin
      dragElastic={0.5}
      onDragEnd={handleDragEnd}
      whileTap={{ scale: 0.99 }}
    >
      <BuilderCard builder={builder} />
      {/* Swipe overlays */}
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

  const [index, setIndex] = useState(0);
  const [history, setHistory] = useState<{ index: number; decision: Decision; builderId: string }[]>([]);
  const [toast, setToast] = useState('');

  const current = deck[index];
  const next = deck[index + 1];
  const investorName = user.username || user.email.split('@')[0];

  const flash = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(''), 1900);
  };

  const apply = (builder: BuilderNode, decision: Decision) => {
    if (decision === 'pass') {
      saveBuilderDiscoveryState(user, builder.id, { hidden: true }).catch(() => {});
      return;
    }
    if (decision === 'like') {
      saveBuilderDiscoveryState(user, builder.id, { saved: true }).catch(() => {});
      void saveVcInterest(user, builder, 'like');
      flash(`Liked ${builder.company} — they'll see your interest.`);
      return;
    }
    // superlike
    saveBuilderDiscoveryState(user, builder.id, { saved: true, stage: 'Meeting' }).catch(() => {});
    void saveVcInterest(user, builder, 'superlike');
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

  const swipe = (decision: Decision) => {
    if (!current) return;
    setHistory((h) => [...h, { index, decision, builderId: current.id }]);
    apply(current, decision);
    setIndex((i) => i + 1);
  };

  const undo = () => {
    setHistory((h) => {
      if (!h.length) return h;
      const last = h[h.length - 1];
      if (last.decision === 'pass') saveBuilderDiscoveryState(user, last.builderId, { hidden: false }).catch(() => {});
      else saveBuilderDiscoveryState(user, last.builderId, { saved: false }).catch(() => {});
      setIndex(last.index);
      return h.slice(0, -1);
    });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp'].includes(e.key)) e.preventDefault();
      if (e.key === 'ArrowLeft') swipe('pass');
      else if (e.key === 'ArrowRight') swipe('like');
      else if (e.key === 'ArrowUp') swipe('superlike');
      else if (e.key === 'Backspace' || e.key.toLowerCase() === 'z') undo();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, index]);

  return (
    <div className="mx-auto flex max-w-md flex-col px-1 py-2">
      <div className="mb-5 text-center">
        <h1 className="text-2xl font-semibold tracking-[-0.02em]" style={serif}>
          Discover builders
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Swipe through founders ranked by your thesis. Pass, like, or call.
        </p>
      </div>

      {/* Card stack */}
      <div className="relative mx-auto h-[clamp(440px,62vh,560px)] w-full">
        {!current ? (
          <div className="flex h-full flex-col items-center justify-center rounded-[28px] border border-dashed border-black/15 bg-white/60 p-8 text-center">
            <Sparkles className="mb-4 h-7 w-7 text-[#42520d]" />
            <p className="text-lg font-semibold">You&apos;re all caught up</p>
            <p className="mt-2 max-w-xs text-sm text-gray-500">
              No more builders in your deck right now. New founders surface as they ship and join.
            </p>
            {history.length > 0 && (
              <button
                type="button"
                onClick={undo}
                className="mt-6 inline-flex items-center gap-1.5 rounded-full border border-black/15 bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-black/5"
              >
                <RotateCcw className="h-4 w-4" /> Undo last
              </button>
            )}
          </div>
        ) : (
          <>
            {next && (
              <div className="absolute inset-0 scale-[0.96] opacity-60" style={{ transformOrigin: 'top center' }}>
                <BuilderCard builder={next} />
              </div>
            )}
            <SwipeCard key={current.id} builder={current} onDecide={swipe} />
          </>
        )}
      </div>

      {/* Controls */}
      {current && (
        <div className="mt-6 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={undo}
            disabled={!history.length}
            title="Undo"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-black/10 bg-white text-black/50 shadow-sm transition hover:text-black disabled:opacity-40"
          >
            <RotateCcw className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => swipe('pass')}
            title="Pass (←)"
            className="flex h-14 w-14 items-center justify-center rounded-full border border-black/10 bg-white text-[#e7483d] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <X className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={() => swipe('superlike')}
            title="Superlike — request a call (↑)"
            className="flex h-16 w-16 items-center justify-center rounded-full bg-[#3aa0ff] text-white shadow-lg shadow-[#3aa0ff]/30 transition hover:-translate-y-0.5"
          >
            <Zap className="h-7 w-7" fill="currentColor" />
          </button>
          <button
            type="button"
            onClick={() => swipe('like')}
            title="Like (→)"
            className="flex h-14 w-14 items-center justify-center rounded-full bg-[#42520d] text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <Star className="h-6 w-6" fill="currentColor" />
          </button>
        </div>
      )}

      <div className="mt-4 flex items-center justify-center gap-5 text-[0.7rem] font-medium text-gray-400">
        <span className="inline-flex items-center gap-1"><X className="h-3.5 w-3.5" /> Pass ←</span>
        <span className="inline-flex items-center gap-1"><Star className="h-3.5 w-3.5" /> Like →</span>
        <span className="inline-flex items-center gap-1"><Zap className="h-3.5 w-3.5" /> Call ↑</span>
      </div>

      {/* Toast */}
      {toast && (
        <div className="pointer-events-none fixed bottom-8 left-1/2 z-50 -translate-x-1/2 rounded-full bg-[#1c1c1a] px-4 py-2 text-sm font-medium text-white shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
};
