import { Link, useNavigate } from 'react-router-dom';
import { ArrowUpRight, Check } from 'lucide-react';
import { EditorialNavbar } from '../components/EditorialNavbar';
import { LogoIcon } from '../components/LogoIcon';
import { useReveal } from '../lib/useReveal';
import { HeatMap } from './HeatMap';

// Recognizable funds for the hero trust pill. Logos come from the favicon
// service already used for launch logos, so they stay reliable (no hotlinking).
const heroInvestors: { name: string; domain: string }[] = [
  { name: 'Y Combinator', domain: 'ycombinator.com' },
  { name: 'Sequoia Capital', domain: 'sequoiacap.com' },
  { name: 'Andreessen Horowitz', domain: 'a16z.com' },
  { name: 'Accel', domain: 'accel.com' },
  { name: 'Antler', domain: 'antler.co' },
];

// Data-flow diagram: founder proof (sources) → Apparent (processing) → investor
// thesis (destinations). Encodes the two-sided agent matching as a Monad-style
// flow composition.
const founderSources = ['PROOF OF WORK', 'GITHUB', 'TRACTION', 'LAUNCHES', 'NPX APPARENT'];
const investorCriteria = ['THESIS FIT', 'STAGE', 'SECTOR', 'CHECK SIZE'];
const agentStages = ['VERIFY', 'MATCH', 'RANK', 'INTRO'];

const founderBullets = [
  'Verify your work in seconds with npx apparent. GitHub, traction, and shipped products become your pitch.',
  'Match to funds by thesis, stage, and sector, not a generic list of thousands.',
  'Your AI founder agent reaches the investors who fit and opens the intro for you, never spam.',
];

const investorBullets = [
  'A live map of builders who fit your stage, sector, and geography.',
  'Your AI investor agent sources and ranks deals against your thesis 24/7, then drafts the outreach.',
  'Every founder verified by real code and traction, so diligence starts before the first call.',
];

const howItWorks = [
  { title: 'Show your work', text: 'Run npx apparent and your launches, commits, and traction become a profile that proves itself.' },
  { title: 'Match on fit', text: 'Apparent ranks the investors whose thesis, stage, and sector actually fit your raise.' },
  { title: 'Let the agents connect you', text: "Your AI agent reaches the funds that fit, or signal you're raising and let theirs come to you." },
];

const SourceTag = ({ label, align, index = 0 }: { label: string; align: 'left' | 'right'; index?: number }) => (
  <span
    data-reveal
    style={{ transitionDelay: `${index * 80}ms` }}
    className={`reveal inline-flex items-center gap-2.5 rounded-full border border-ink bg-parchment px-4 py-2 font-mono text-[12px] tracking-[-0.02em] text-ink ${
      align === 'right' ? 'flex-row-reverse' : ''
    }`}
  >
    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-ink" />
    {label}
  </span>
);

export const Home = () => {
  const navigate = useNavigate();
  useReveal();

  return (
    <div className="monad min-h-screen bg-parchment text-ink">
      {/* ANNOUNCEMENT BAR */}
      <div className="w-full bg-ink">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-center gap-x-3 gap-y-1 px-6 py-2.5 text-center">
          <span className="font-mono text-[13px] text-parchment">Proof of work is the new warm intro.</span>
          <Link
            to="/our-thesis"
            className="font-mono text-[13px] text-parchment underline decoration-parchment/40 underline-offset-4 transition hover:decoration-parchment"
          >
            Read the thesis ↗
          </Link>
        </div>
      </div>

      <EditorialNavbar />

      {/* HERO */}
      <section className="mx-auto max-w-[1200px] px-6 pb-12 pt-16 text-center md:pt-20">
        <div className="mb-8 flex justify-center">
          <div className="inline-flex items-center gap-2.5 rounded-full border border-ink bg-parchment px-3 py-1.5">
            <div className="flex items-center">
              {heroInvestors.map((investor, index) => (
                <img
                  key={investor.domain}
                  src={`https://www.google.com/s2/favicons?domain=${investor.domain}&sz=128`}
                  alt={investor.name}
                  title={investor.name}
                  className={`h-5 w-5 rounded-full border border-ink bg-parchment object-contain p-0.5 ${index > 0 ? '-ml-2' : ''}`}
                />
              ))}
            </div>
            <span className="font-mono text-[12px] tracking-[-0.02em] text-ink">1,800+ investors mapped</span>
          </div>
        </div>

        <h1 className="mx-auto max-w-[920px] font-serif text-[clamp(2.6rem,6vw,5rem)] leading-[1.08] tracking-[-0.02em] text-ink">
          Founders and investors who&nbsp;fit.
        </h1>
        <p className="mx-auto mt-6 max-w-[640px] font-mono text-[16px] leading-[1.6] tracking-[-0.02em] text-graphite">
          AI agents work both sides of the table. Founders find the right funds, investors find the right founders. No cold emails.
        </p>

        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/login?role=founder')}
            className="monad-cta inline-flex items-center gap-2 bg-charcoal px-6 py-3 text-[14px] text-parchment"
          >
            I&apos;m a founder <ArrowUpRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => navigate('/login?role=investor')}
            className="monad-cta inline-flex items-center gap-2 border border-ink px-6 py-3 text-[14px] text-ink hover:bg-ink hover:text-parchment"
          >
            I&apos;m an investor
          </button>
        </div>
      </section>

      {/* DATA-FLOW DIAGRAM — founder proof → Apparent → investor thesis */}
      <section className="mx-auto max-w-[1200px] px-6 pb-20">
        <div className="relative grid items-center gap-10 md:grid-cols-[1fr_auto_1fr] md:gap-6">
          {/* connector axis — dashes travel left→right to read as throughput */}
          <div aria-hidden className="flow-axis pointer-events-none absolute inset-x-10 top-1/2 hidden h-px -translate-y-1/2 md:block" />

          {/* Left: founder proof */}
          <div className="flex flex-col items-center gap-3 md:items-end">
            <span className="mb-1 font-mono text-[11px] uppercase tracking-[0.1em] text-stone">Founder proof</span>
            {founderSources.map((tag, i) => (
              <SourceTag key={tag} label={tag} align="right" index={i} />
            ))}
          </div>

          {/* Center: Apparent node */}
          <div className="relative flex flex-col items-center">
            <div
              aria-hidden
              className="flow-aura pointer-events-none absolute left-1/2 top-[3.5rem] -z-10 h-56 w-56 rounded-full"
              style={{
                background:
                  'radial-gradient(circle, rgba(167,252,205,0.6) 0%, rgba(160,181,235,0.2) 52%, rgba(246,243,241,0) 74%)',
              }}
            />
            <div className="flex h-28 w-28 items-center justify-center rounded-full border border-ink bg-parchment shadow-[0_0_10px_rgba(0,0,0,0.1)]">
              <LogoIcon className="h-10 w-10 text-ink" />
            </div>
            <span className="mt-4 font-mono text-[13px] tracking-[-0.02em] text-ink">APPARENT</span>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {agentStages.map((stage, i) => (
                <span
                  key={stage}
                  className="inline-flex items-center gap-1.5 rounded-full border border-ink/30 px-2.5 py-1 font-mono text-[11px] text-graphite"
                >
                  <span
                    className="flow-dot h-1.5 w-1.5 rounded-full bg-[#5fcf8e]"
                    style={{ animationDelay: `${i * 0.6}s` }}
                  />
                  {stage}
                </span>
              ))}
            </div>
          </div>

          {/* Right: investor thesis */}
          <div className="flex flex-col items-center gap-3 md:items-start">
            <span className="mb-1 font-mono text-[11px] uppercase tracking-[0.1em] text-stone">Investor thesis</span>
            {investorCriteria.map((tag, i) => (
              <SourceTag key={tag} label={tag} align="left" index={i} />
            ))}
          </div>
        </div>
        <p className="mt-10 text-center font-mono text-[13px] tracking-[-0.02em] text-stone">
          Founder proof in. Investor thesis out. Agents match both sides.
        </p>
      </section>

      {/* MAP — the live front door */}
      <section data-reveal className="reveal mx-auto max-w-[1200px] border-t border-ink/12 px-6 py-20">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-serif text-[clamp(1.8rem,3.5vw,2.5rem)] leading-[1.1] text-ink">One map. Two sides of the table.</h2>
            <p className="mt-3 font-mono text-[14px] leading-[1.6] text-graphite">1,800+ investors, plotted by geography, stage, and thesis.</p>
          </div>
          <Link
            to="/heat-map"
            className="monad-cta inline-flex items-center gap-2 border border-ink px-5 py-2.5 font-mono text-[14px] text-ink hover:bg-ink hover:text-parchment"
          >
            Open the full map <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="relative flex h-[clamp(360px,56vh,560px)] overflow-hidden rounded-[40px] border border-ink bg-[#e8e5dc]">
          <HeatMap includeVCContacts vcOnly fullBleed fillParent lockContacts />
        </div>
      </section>

      {/* WHO IT'S FOR */}
      <section data-reveal className="reveal mx-auto max-w-[1200px] border-t border-ink/12 px-6 py-20">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Founders */}
          <div className="relative isolate flex flex-col overflow-hidden rounded-[40px] bg-lavender p-10 shadow-[0_0_10px_rgba(0,0,0,0.1)]">
            {/* Peach → periwinkle wash, contained within the card radius */}
            <div
              aria-hidden
              className="pointer-events-none absolute -right-20 -top-20 -z-10 h-64 w-64 rounded-full blur-2xl"
              style={{ background: 'linear-gradient(150deg, rgba(255,148,115,0.55), rgba(160,181,235,0.5))' }}
            />
            <LogoIcon className="h-6 w-6 text-ink" />
            <h3 className="mt-6 font-serif text-[28px] leading-[1.15] text-ink">Reach the investors who fit your raise.</h3>
            <ul className="mt-6 grid gap-3.5 font-mono text-[14px] leading-[1.55] text-graphite">
              {founderBullets.map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-ink" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => navigate('/login?role=founder')}
              className="monad-cta mt-8 inline-flex w-fit items-center gap-2 bg-charcoal px-5 py-2.5 font-mono text-[14px] text-parchment"
            >
              Create founder profile <ArrowUpRight className="h-4 w-4" />
            </button>
          </div>

          {/* Investors */}
          <div className="relative isolate flex flex-col overflow-hidden rounded-[40px] bg-charcoal p-10 text-parchment shadow-[0_0_10px_rgba(0,0,0,0.1)]">
            {/* Mint → periwinkle glow, reads as a soft aura on the dark surface */}
            <div
              aria-hidden
              className="pointer-events-none absolute -right-20 -top-20 -z-10 h-64 w-64 rounded-full blur-2xl"
              style={{ background: 'linear-gradient(150deg, rgba(167,252,205,0.5), rgba(160,181,235,0.45))' }}
            />
            <LogoIcon className="h-6 w-6 text-parchment" />
            <h3 className="mt-6 font-serif text-[28px] leading-[1.15] text-parchment">Meet the founders who fit your thesis.</h3>
            <ul className="mt-6 grid gap-3.5 font-mono text-[14px] leading-[1.55] text-parchment/70">
              {investorBullets.map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#a7fccd]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => navigate('/login?role=investor')}
              className="monad-cta mt-8 inline-flex w-fit items-center gap-2 bg-parchment px-5 py-2.5 font-mono text-[14px] text-ink"
            >
              Create investor profile <ArrowUpRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      {/* THE WEDGE */}
      <section data-reveal className="reveal mx-auto max-w-[1200px] border-t border-ink/12 px-6 py-20">
        <div className="grid gap-10 md:grid-cols-2 md:items-center">
          <div>
            <h2 className="max-w-xl font-serif text-[clamp(1.8rem,3.5vw,2.5rem)] leading-[1.12] text-ink">
              The right match beats a hundred wrong ones.
            </h2>
            <p className="mt-5 max-w-xl font-mono text-[14px] leading-[1.6] text-graphite">
              A generic list of thousands wastes everyone&apos;s time. Apparent matches founders and investors on
              thesis, stage, and sector first, so the conversations that happen are the ones that should.
            </p>
          </div>
          <div className="grid gap-3">
            <div className="rounded-[24px] border border-ink/15 bg-parchment p-6">
              <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-stone">The old way</p>
              <p className="mt-2 font-mono text-[14px] leading-[1.55] text-graphite">
                Work a list of thousands. Guess at fit. Hope something sticks.
              </p>
            </div>
            <div className="rounded-[24px] bg-lavender p-6">
              <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink">On Apparent</p>
              <p className="mt-2 font-mono text-[14px] leading-[1.55] text-ink/80">
                Match on thesis and stage. Talk to the few who fit. Skip the rest.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-to" data-reveal className="reveal mx-auto max-w-[1200px] border-t border-ink/12 px-6 py-20">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <h2 className="max-w-xl font-serif text-[clamp(1.8rem,3.5vw,2.5rem)] leading-[1.12] text-ink">
            Verify. Match on fit. Let the agents connect you.
          </h2>
          <ol className="grid gap-x-6 gap-y-8 sm:grid-cols-3">
            {howItWorks.map((item, i) => (
              <li
                key={item.title}
                data-reveal
                style={{ transitionDelay: `${i * 90}ms` }}
                className="reveal border-t border-ink/15 pt-4"
              >
                <span className="font-mono text-[20px] tabular-nums text-ink">0{i + 1}</span>
                <h3 className="mt-4 font-serif text-[20px] leading-[1.2] text-ink">{item.title}</h3>
                <p className="mt-2 font-mono text-[13px] leading-[1.55] text-graphite">{item.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* FINAL CTA */}
      <section data-reveal className="reveal mx-auto max-w-[1200px] border-t border-ink/12 px-6 py-24 text-center">
        <h2 className="mx-auto max-w-2xl font-serif text-[clamp(2.2rem,5vw,3.5rem)] leading-[1.08] text-ink">Find your fit.</h2>
        <p className="mx-auto mt-5 max-w-xl font-mono text-[14px] leading-[1.6] text-graphite">
          Founders find the investors who fit their raise. Investors find the founders who fit their thesis. Pick your side
          and start in under a minute.
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/login?role=founder')}
            className="monad-cta inline-flex items-center gap-2 bg-charcoal px-6 py-3 text-[14px] text-parchment"
          >
            Create founder profile <ArrowUpRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => navigate('/login?role=investor')}
            className="monad-cta inline-flex items-center gap-2 border border-ink px-6 py-3 text-[14px] text-ink hover:bg-ink hover:text-parchment"
          >
            Create investor profile
          </button>
        </div>
      </section>
    </div>
  );
};
