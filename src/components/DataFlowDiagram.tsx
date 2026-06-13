import {
  ArrowUpRight,
  BadgeCheck,
  BellRing,
  Bot,
  Check,
  GitBranch,
  MapPin,
  MessageSquareText,
  Radar,
  Send,
  Sparkles,
} from 'lucide-react';
import { LogoIcon } from './LogoIcon';

const proofSignals = [
  { label: 'GitHub verified', value: '218 commits', icon: GitBranch },
  { label: 'Launch shipped', value: '3 products', icon: Sparkles },
  { label: 'Founder location', value: 'Seattle', icon: MapPin },
];

const investorMatches = [
  { name: 'Northstar Ventures', thesis: 'AI workflow tools', fit: '96%' },
  { name: 'Pioneer Fund', thesis: 'Developer infrastructure', fit: '91%' },
  { name: 'Gradient Capital', thesis: 'Seed, technical teams', fit: '87%' },
];

export const DataFlowDiagram = () => {
  return (
    <section className="mx-auto max-w-[1200px] px-6 pb-20">
      <div className="apparent-hero-app relative isolate overflow-hidden rounded-[44px] border border-ink/12">
        <div className="apparent-hero-app__grid" aria-hidden />
        <div className="apparent-hero-app__orb apparent-hero-app__orb--peach" aria-hidden />
        <div className="apparent-hero-app__orb apparent-hero-app__orb--mint" aria-hidden />

        <div className="relative z-10 border-b border-ink/10 px-5 py-3 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5" aria-hidden>
                <span className="h-2.5 w-2.5 rounded-full bg-[#ff9473]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#e2c161]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#5fcf8e]" />
              </div>
              <div className="flex items-center gap-2 rounded-full border border-ink/12 bg-parchment/70 px-3 py-1.5">
                <LogoIcon className="h-4 w-4 text-ink" />
                <span className="font-mono text-[11px] font-semibold text-ink">Apparent workspace</span>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-ink/12 bg-white/55 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-graphite">
              <span className="apparent-hero-live-dot h-1.5 w-1.5 rounded-full bg-[#5fcf8e]" />
              Live matching
            </div>
          </div>
        </div>

        <div className="relative z-10 grid gap-4 p-4 sm:p-5 lg:grid-cols-[12rem_minmax(0,1fr)_22rem] lg:p-6">
          <aside className="hidden rounded-[28px] border border-ink/10 bg-parchment/62 p-4 lg:block">
            <div className="mb-6 flex items-center gap-2">
              <div className="grid h-9 w-9 place-items-center rounded-2xl bg-ink text-parchment">
                <LogoIcon className="h-4 w-4" />
              </div>
              <div>
                <p className="font-mono text-[11px] font-semibold text-ink">Apparent</p>
                <p className="font-mono text-[10px] text-stone">founder view</p>
              </div>
            </div>
            {['Proof profile', 'Investor matches', 'Agent outreach'].map((item, index) => (
              <div
                key={item}
                className={`mb-2 rounded-2xl px-3 py-2.5 font-mono text-[11px] ${
                  index === 0 ? 'bg-ink text-parchment' : 'text-graphite'
                }`}
              >
                {item}
              </div>
            ))}
            <div className="mt-8 rounded-3xl border border-ink/10 bg-white/48 p-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-stone">Agent status</p>
              <div className="mt-3 flex items-center gap-2">
                <Bot className="h-4 w-4 text-ink" />
                <p className="font-mono text-[11px] text-graphite">Drafting warm paths</p>
              </div>
            </div>
          </aside>

          <main className="grid gap-4">
            <section className="apparent-hero-panel relative overflow-hidden rounded-[32px] border border-ink/10 p-5 sm:p-6">
              <div className="apparent-hero-scan" aria-hidden />
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="mb-4 flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#cfdaf5] px-3 py-1 font-mono text-[10px] font-semibold text-ink">
                      <BadgeCheck className="h-3 w-3" />
                      Verified proof
                    </span>
                    <span className="rounded-full border border-ink/12 px-3 py-1 font-mono text-[10px] text-graphite">Seed</span>
                    <span className="rounded-full border border-ink/12 px-3 py-1 font-mono text-[10px] text-graphite">AI devtools</span>
                  </div>
                  <h2 className="max-w-xl font-serif text-[clamp(2rem,4vw,3.6rem)] leading-[0.96] text-ink">
                    Founder profile that proves the work.
                  </h2>
                  <p className="mt-4 max-w-lg font-mono text-[13px] leading-6 text-graphite">
                    Apparent turns shipped products, public code, traction, and raise context into one investor-ready profile.
                  </p>
                </div>
                <div className="apparent-hero-score rounded-[28px] border border-ink/12 bg-parchment/78 p-4 text-center">
                  <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-stone">Profile strength</p>
                  <p className="mt-2 font-serif text-5xl leading-none text-ink">94</p>
                  <p className="mt-1 font-mono text-[10px] text-graphite">ready to match</p>
                </div>
              </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-3">
              {proofSignals.map((signal, index) => {
                const Icon = signal.icon;
                return (
                  <article
                    key={signal.label}
                    className="apparent-hero-proof-card rounded-[26px] border border-ink/10 bg-white/58 p-4"
                    style={{ animationDelay: `${index * 180}ms` }}
                  >
                    <Icon className="h-4 w-4 text-ink" />
                    <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.14em] text-stone">{signal.label}</p>
                    <p className="mt-1 font-mono text-[13px] font-semibold text-ink">{signal.value}</p>
                  </article>
                );
              })}
            </section>

            <section className="apparent-hero-agent rounded-[30px] border border-ink/10 bg-parchment/62 p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-2xl bg-ink text-parchment">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-mono text-[12px] font-semibold text-ink">Founder agent</p>
                    <p className="font-mono text-[11px] text-stone">Finding the right investors now</p>
                  </div>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full bg-[#a7fccd]/42 px-3 py-1.5 font-mono text-[10px] font-semibold text-ink">
                  <Check className="h-3 w-3" />
                  12 warm paths found
                </div>
              </div>
            </section>
          </main>

          <aside className="grid gap-4">
            <section className="apparent-hero-panel rounded-[32px] border border-ink/10 p-4 sm:p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="font-serif text-[25px] leading-tight text-ink">Investor matches</p>
                  <p className="mt-1 font-mono text-[11px] text-stone">Ranked by thesis fit</p>
                </div>
                <Radar className="h-5 w-5 text-ink" />
              </div>
              <div className="grid gap-3">
                {investorMatches.map((match, index) => (
                  <article
                    key={match.name}
                    className="apparent-hero-match-row rounded-[22px] border border-ink/10 bg-white/58 p-3"
                    style={{ animationDelay: `${index * 220}ms` }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-mono text-[12px] font-semibold text-ink">{match.name}</p>
                        <p className="mt-1 truncate font-mono text-[10px] text-stone">{match.thesis}</p>
                      </div>
                      <span className="rounded-full bg-[#cfdaf5] px-2.5 py-1 font-mono text-[11px] font-semibold text-ink">
                        {match.fit}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="apparent-hero-draft rounded-[32px] border border-ink/10 p-4 sm:p-5">
              <div className="mb-4 flex items-center gap-2">
                <MessageSquareText className="h-4 w-4 text-ink" />
                <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-ink">Agent draft</p>
              </div>
              <div className="grid gap-2">
                <span className="apparent-hero-type-line apparent-hero-type-line--wide" />
                <span className="apparent-hero-type-line" />
                <span className="apparent-hero-type-line apparent-hero-type-line--short" />
              </div>
              <button
                type="button"
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-ink px-4 py-3 font-mono text-[12px] font-semibold text-parchment"
              >
                Send intro <Send className="h-3.5 w-3.5" />
              </button>
            </section>
          </aside>
        </div>

        <div className="relative z-10 border-t border-ink/10 px-5 py-3 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3 font-mono text-[11px] text-stone">
            <span className="inline-flex items-center gap-2">
              <BellRing className="h-3.5 w-3.5 text-ink" />
              Apparent found a thesis-fit investor who backs devtools at seed.
            </span>
            <span className="inline-flex items-center gap-1 text-ink">
              View match <ArrowUpRight className="h-3.5 w-3.5" />
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
