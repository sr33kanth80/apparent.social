import { ArrowUpRight, ChevronLeft, ChevronRight, CircleDot, Globe2, Radar, Search, ShieldCheck } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogoIcon } from '../components/LogoIcon';
import { useReveal } from '../lib/useReveal';

const serifDisplay = {
  fontFamily: 'Georgia, "Times New Roman", serif',
};

const proofRows = [
  ['01', 'Proof beats proximity', 'Products, GitHub, launches, press, traction, and location should travel farther than a warm intro.'],
  ['02', 'Taste should be searchable', 'Investors need a place to declare thesis, stage, sector, geography, and founder signals clearly.'],
  ['03', 'Place reveals momentum', 'Builder Radar makes local clusters and nearby rooms visible before they become consensus.'],
  ['04', 'Relationships need context', 'Messages, terms, meetups, and deal flow stay connected to the signal that started the conversation.'],
];

const values = [
  {
    title: 'Builders first',
    icon: CircleDot,
    text: 'The founder profile starts with shipped work instead of social proof theatre.',
  },
  {
    title: 'Taste over status',
    icon: Search,
    text: 'VC discovery should start from conviction, not just brand gravity.',
  },
  {
    title: 'Local context',
    icon: Radar,
    text: 'The map turns cities, venues, and clusters into a sourcing surface.',
  },
  {
    title: 'Clear motion',
    icon: ShieldCheck,
    text: 'DMs, terms, and pipeline work better when they keep the original proof nearby.',
  },
];

type MatchRow = { id: string; founder: string; investor: string; weight: number };
type Match = {
  founder: string;
  investor: string;
  total: number;
  founderAvatar: string;
  investorLogo: string;
  rows: MatchRow[];
};

// Initials for the monogram avatars / logos, e.g. "Aria Kim" -> "AK", "Atlas Capital" -> "AC".
const initials = (name: string) =>
  name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

// A deck of founder ⇄ investor matches. Each row's weights sum to that match's total.
const matches: Match[] = [
  {
    founder: 'Aria Kim',
    investor: 'Northstar',
    total: 92,
    founderAvatar: 'from-rose-400 to-orange-300',
    investorLogo: 'bg-emerald-500',
    rows: [
      { id: 'proof', founder: '4.2k GitHub stars', investor: 'Technical founders', weight: 24 },
      { id: 'sector', founder: 'AI agents', investor: 'Seed AI thesis', weight: 30 },
      { id: 'stage', founder: 'Seed · pre-revenue', investor: 'Pre-revenue checks', weight: 23 },
      { id: 'geo', founder: 'San Francisco', investor: 'United States', weight: 15 },
    ],
  },
  {
    founder: 'Diego Santos',
    investor: 'Atlas Capital',
    total: 88,
    founderAvatar: 'from-sky-400 to-cyan-300',
    investorLogo: 'bg-amber-500',
    rows: [
      { id: 'proof', founder: '1.2k deploys / week', investor: 'Usage-led growth', weight: 22 },
      { id: 'sector', founder: 'Open-source DB', investor: 'Dev-tools thesis', weight: 28 },
      { id: 'stage', founder: 'Seed round', investor: 'Leads seed rounds', weight: 20 },
      { id: 'geo', founder: 'Berlin', investor: 'Europe focus', weight: 18 },
    ],
  },
  {
    founder: 'Mara Lin',
    investor: 'Vertex Labs',
    total: 95,
    founderAvatar: 'from-violet-400 to-fuchsia-300',
    investorLogo: 'bg-indigo-500',
    rows: [
      { id: 'proof', founder: 'PhD · 2 patents', investor: 'Technical depth', weight: 25 },
      { id: 'sector', founder: 'Robotics', investor: 'Deep-tech thesis', weight: 32 },
      { id: 'stage', founder: 'Pre-seed', investor: 'Pre-seed checks', weight: 20 },
      { id: 'geo', founder: 'Toronto', investor: 'North America', weight: 18 },
    ],
  },
];

// A single match: animates its connectors and counts the score up whenever it activates.
const MatchView = ({ match, play }: { match: Match; play: boolean }) => {
  const [pct, setPct] = useState(0);
  const [connected, setConnected] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);

  useEffect(() => {
    if (!play) return;
    setConnected(false);
    setPct(0);
    const startLines = setTimeout(() => setConnected(true), 60);
    const duration = 1100;
    let raf = 0;
    let startTs = 0;
    const tick = (now: number) => {
      if (!startTs) startTs = now;
      const t = Math.min(1, (now - startTs) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setPct(Math.round(eased * match.total));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    const startCount = setTimeout(() => {
      raf = requestAnimationFrame(tick);
    }, 220);
    return () => {
      clearTimeout(startLines);
      clearTimeout(startCount);
      cancelAnimationFrame(raf);
    };
  }, [play, match]);

  return (
    <div className="flex flex-1 flex-col">
      {/* Founder + investor identities */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${match.founderAvatar} text-[11px] font-bold text-white ring-1 ring-white/15`}
          >
            {initials(match.founder)}
          </div>
          <div className="leading-tight">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">Founder</p>
            <p className="text-sm font-semibold text-white">{match.founder}</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="text-right leading-tight">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">Investor</p>
            <p className="text-sm font-semibold text-white">{match.investor}</p>
          </div>
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] ${match.investorLogo} text-[11px] font-bold text-white ring-1 ring-white/10`}
          >
            {initials(match.investor)}
          </div>
        </div>
      </div>

      {/* Match rows — centered so the card always fills */}
      <div className="flex flex-1 flex-col justify-center gap-2.5 py-5">
        {match.rows.map((row, i) => {
          const isHover = hovered === row.id;
          const dim = hovered !== null && !isHover;
          return (
            <div
              key={row.id}
              onMouseEnter={() => setHovered(row.id)}
              onMouseLeave={() => setHovered(null)}
              className={`grid cursor-default grid-cols-[1fr_auto_1fr] items-center gap-2 transition-opacity duration-300 ${
                dim ? 'opacity-40' : 'opacity-100'
              }`}
            >
              {/* Founder signal */}
              <div
                className={`justify-self-stretch rounded-xl border px-3 py-2.5 text-right text-xs font-semibold transition-colors duration-300 ${
                  isHover
                    ? 'border-[#bcd99a]/50 bg-[#bcd99a]/10 text-white'
                    : 'border-white/10 bg-white/[0.04] text-white/80'
                }`}
              >
                {row.founder}
              </div>

              {/* Connector */}
              <div className="relative flex w-16 items-center sm:w-20">
                {isHover && (
                  <span className="absolute left-1/2 top-[-17px] -translate-x-1/2 whitespace-nowrap rounded-full bg-[#bcd99a] px-2 py-0.5 text-[9px] font-bold text-black">
                    +{row.weight}%
                  </span>
                )}
                <span
                  className={`h-1.5 w-1.5 shrink-0 rounded-full transition-colors duration-500 ${
                    connected ? 'bg-[#bcd99a]' : 'bg-white/20'
                  }`}
                />
                <span className="relative h-px flex-1 overflow-hidden bg-white/10">
                  <span
                    className={`absolute inset-0 origin-left bg-gradient-to-r from-[#bcd99a] to-[#bcd99a]/60 transition-transform duration-700 ease-out ${
                      connected ? 'scale-x-100' : 'scale-x-0'
                    } ${isHover ? 'shadow-[0_0_8px_#bcd99a]' : ''}`}
                    style={{ transitionDelay: `${i * 110 + 120}ms` }}
                  />
                </span>
                <span
                  className={`h-1.5 w-1.5 shrink-0 rounded-full transition-colors duration-500 ${
                    connected ? 'bg-[#bcd99a]' : 'bg-white/20'
                  }`}
                  style={{ transitionDelay: `${i * 110 + 320}ms` }}
                />
              </div>

              {/* Investor signal */}
              <div
                className={`justify-self-stretch rounded-xl border px-3 py-2.5 text-left text-xs font-semibold transition-colors duration-300 ${
                  isHover
                    ? 'border-[#bcd99a]/50 bg-[#bcd99a]/10 text-white'
                    : 'border-white/10 bg-white/[0.04] text-white/80'
                }`}
              >
                {row.investor}
              </div>
            </div>
          );
        })}
      </div>

      {/* Match readout */}
      <div>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">Thesis match</p>
            <p className="text-4xl font-normal tracking-[-0.03em] text-[#bcd99a]" style={serifDisplay}>
              {pct}%
            </p>
          </div>
          <p className="mb-1 max-w-[12rem] text-right text-xs leading-5 text-white/40">
            Proof meets thesis. The intro writes itself.
          </p>
        </div>
        <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#bcd99a] to-[#02A070]"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
};

const MatchCard = () => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  // Reveal the deck once it scrolls into view.
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Auto-advance through the deck, pausing while hovered.
  useEffect(() => {
    if (!inView || paused) return;
    const id = setTimeout(() => setIndex((n) => (n + 1) % matches.length), 4800);
    return () => clearTimeout(id);
  }, [inView, paused, index]);

  const go = (n: number) => setIndex((n + matches.length) % matches.length);

  return (
    <div
      className="relative h-full"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Peeking deck behind, for depth */}
      <div className="pointer-events-none absolute inset-x-3 top-2 -bottom-2 -z-10 rounded-[32px] bg-[#1a1a17]" />
      <div className="pointer-events-none absolute inset-x-6 top-4 -bottom-4 -z-20 rounded-[32px] bg-[#151513]" />

      <div
        ref={cardRef}
        className="relative flex h-full min-h-[520px] flex-col overflow-hidden rounded-[32px] bg-[#141412] p-8 text-white"
      >
        {/* Ambient glow */}
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[#bcd99a]/10 blur-3xl" />

        {/* Header */}
        <div className="relative flex items-start justify-between">
          <div>
            <h3 className="text-2xl font-normal leading-tight tracking-[-0.03em] text-white" style={serifDisplay}>
              A fit,<br />both ways.
            </h3>
            <p className="mt-2 text-sm text-white/40">Hover a signal to trace the match.</p>
          </div>
          <LogoIcon className="h-9 w-9 text-[#bcd99a]" />
        </div>

        {/* Active match — keyed so the connect + count-up replays per card */}
        <div className="relative mt-9 flex flex-1 flex-col">
          <MatchView key={index} match={matches[index]} play={inView} />
        </div>

        {/* Deck navigation */}
        <div className="relative mt-6 flex items-center justify-between border-t border-white/[0.07] pt-5">
          <div className="flex items-center gap-2">
            {matches.map((m, i) => (
              <button
                key={m.founder}
                type="button"
                aria-label={`Show match ${i + 1}`}
                onClick={() => go(i)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === index ? 'w-6 bg-[#bcd99a]' : 'w-1.5 bg-white/25 hover:bg-white/50'
                }`}
              />
            ))}
            <span className="ml-3 text-[11px] font-semibold text-white/40">
              {index + 1} / {matches.length} live matches
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Previous match"
              onClick={() => go(index - 1)}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-white/60 transition-colors hover:border-white/30 hover:text-white"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Next match"
              onClick={() => go(index + 1)}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-white/60 transition-colors hover:border-white/30 hover:text-white"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const AboutUs = () => {
  const navigate = useNavigate();
  useReveal();

  return (
    <main className="overflow-x-hidden bg-[#fbfaf7] text-black">
      <section data-reveal className="reveal mx-auto max-w-[92rem] px-5 pb-14 pt-14 sm:px-8 md:pt-20">
        <h1
          className="max-w-[84rem] text-[3.65rem] font-normal leading-[0.88] tracking-[-0.055em] sm:text-[7rem] md:text-[8.5rem] lg:text-[10rem]"
          style={serifDisplay}
        >
          Capital <span className="block sm:inline">should</span>
          <br />
          find proof.
        </h1>
        <div className="mt-10 grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <p className="max-w-2xl text-lg leading-8 text-black/65 md:text-xl">
            Apparent exists because warm intros are a bad database for ambition. Great builders should become visible by what they ship, and investors should find them by thesis, proof, and timing.
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              ['Builder profiles', 'Proof, products, GitHub, traction, and location'],
              ['Investor thesis pages', 'Stage, sector, geography, founder taste, and pass signals'],
              ['Network map', 'A live view of Apparent builders around any place of interest'],
            ].map(([label, value]) => (
              <div key={label} className="rounded-[22px] bg-white/70 p-5">
                <p className="text-sm font-semibold">{label}</p>
                <p className="mt-3 text-sm leading-6 text-black/55">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section data-reveal className="reveal mx-auto grid max-w-[92rem] gap-8 border-t border-black/10 px-5 py-14 sm:px-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-stretch">
        <div className="py-4 lg:py-8">
          <p className="mb-12 text-sm font-semibold text-[#42520d]">Why Apparent exists</p>
          <h2 className="text-5xl font-normal leading-none tracking-[-0.045em] md:text-7xl" style={serifDisplay}>
            See the whole builder market.
          </h2>
          <p className="mt-8 max-w-2xl text-base leading-8 text-black/60">
            The traditional fundraising loop rewards proximity. Apparent shifts the center of gravity to proof: founders bring evidence, investors bring taste, and the product turns both into a network.
          </p>
          <div className="mt-10 grid gap-5">
            {proofRows.map(([number, title, text]) => (
              <div key={number} className="grid gap-4 sm:grid-cols-[3rem_1fr]">
                <span className="text-sm font-semibold text-black/45">{number}</span>
                <p className="text-sm leading-6 text-black/65">
                  <span className="font-semibold text-black">{title}:</span> {text}
                </p>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="mt-10 rounded-full bg-[#dcefc7] px-6 py-3 text-sm font-semibold text-black transition-colors hover:bg-[#cce8ae]"
          >
            Discover more
          </button>
        </div>

        {/* The match, both ways — proof meeting thesis, interactively. */}
        <MatchCard />
      </section>

      <section data-reveal className="reveal mx-auto max-w-[92rem] border-t border-black/10 px-5 py-16 sm:px-8">
        <div className="pt-2">
          <p className="mb-12 text-sm font-semibold text-[#42520d]">Operating principles</p>
          <h2 className="max-w-4xl text-5xl font-normal leading-none tracking-[-0.045em] md:text-7xl" style={serifDisplay}>
            We are rebuilding discovery around work.
          </h2>
          <div className="mt-24 grid gap-10 md:grid-cols-4">
            {values.map((value, i) => (
              <article key={value.title} data-reveal style={{ transitionDelay: `${i * 90}ms` }} className="reveal pt-1">
                <value.icon className="mb-8 h-5 w-5 text-black" />
                <h3 className="text-xl font-normal tracking-[-0.025em]" style={serifDisplay}>
                  {value.title}
                </h3>
                <p className="mt-5 text-sm leading-6 text-black/55">{value.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section data-reveal className="reveal mx-auto grid max-w-[92rem] border-t border-black/10 px-5 py-16 sm:px-8 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="flex min-h-[420px] items-center overflow-hidden rounded-[32px] bg-[#42520d] p-10 text-white lg:min-h-[580px] lg:rounded-r-none lg:p-14">
          <blockquote className="max-w-md text-3xl font-normal leading-tight tracking-[-0.03em] md:text-4xl" style={serifDisplay}>
            “The best early companies are visible before they are famous. Apparent is designed for that exact window.”
          </blockquote>
        </div>
        <div className="bg-[#fbfaf7] px-0 py-10 lg:px-14 lg:py-16">
          <p className="text-sm font-semibold text-[#42520d]">What we believe</p>
          <p className="mt-6 max-w-xl text-base leading-8 text-black/60">
            The next great companies are already shipping in public. They just aren&apos;t easy to find yet. Apparent makes proof legible and thesis searchable, so the right founder and the right investor meet in that early window instead of missing it.
          </p>
          <p className="mt-8 text-xs font-semibold uppercase tracking-[0.16em] text-[#42520d]">Proof before consensus</p>
        </div>
      </section>

      <section data-reveal className="reveal mx-auto max-w-[92rem] border-t border-black/10 px-5 py-20 sm:px-8">
        <div className="py-10 text-center">
          <Globe2 className="mx-auto mb-10 h-6 w-6 text-[#02A070]" />
          <h2 className="mx-auto max-w-3xl text-5xl font-normal leading-none tracking-[-0.045em] md:text-7xl" style={serifDisplay}>
            Join before the obvious round.
          </h2>
          <p className="mx-auto mt-8 max-w-2xl text-base leading-8 text-black/55">
            Create the profile, declare the thesis, and let Apparent turn proof into discovery.
          </p>
          <div className="mx-auto mt-10 flex max-w-3xl flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => navigate('/login?role=founder')}
              className="flex-1 rounded-full bg-[#dcefc7] px-6 py-3 text-sm font-semibold text-black hover:bg-[#cce8ae]"
            >
              Create founder profile
            </button>
            <button
              type="button"
              onClick={() => navigate('/login?role=investor')}
              className="flex-1 rounded-full bg-[#42520d] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#34420a]"
            >
              Create investor profile <ArrowUpRight className="ml-1 inline h-3.5 w-3.5 align-[-2px]" />
            </button>
          </div>
        </div>
      </section>
    </main>
  );
};
