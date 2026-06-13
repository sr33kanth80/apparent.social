import { useState } from 'react';
import { ArrowUpRight, BarChart3, Bell, Calendar, FileText, KanbanSquare, Play, Search, Target } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { GitHubIcon } from '../components/GitHubIcon';
import { LogoIcon } from '../components/LogoIcon';
import { useReveal } from '../lib/useReveal';

const serifDisplay = {
  fontFamily: "'Source Serif 4', ui-serif, Georgia, 'Times New Roman', serif",
};

// Founders shown in the interactive "Ranked by fit" inbox. Hovering a row
// expands the founder's profile card (same style as the For Founders mock).
const rankedFounders = [
  {
    handle: 'founder-profile',
    company: 'Founder profile',
    name: 'Founder',
    meta: 'Category - stage - location',
    fit: 'Thesis fit',
    headline: 'A concise founder-supplied summary of the company, proof, and current ask.',
    facts: [
      ['Current build', 'Product summary'],
      ['Stage', 'Founder selected'],
      ['Traction', 'Owner supplied'],
      ['Raising', 'Founder selected'],
    ],
  },
  {
    handle: 'product-profile',
    company: 'Product profile',
    name: 'Builder',
    meta: 'Sector - stage - geography',
    fit: 'Fresh proof',
    headline: 'A second preview row showing how another founder profile expands in the inbox.',
    facts: [
      ['Current build', 'Launch summary'],
      ['Stage', 'Founder selected'],
      ['Traction', 'Owner supplied'],
      ['Raising', 'Founder selected'],
    ],
  },
  {
    handle: 'launch-profile',
    company: 'Launch profile',
    name: 'Team',
    meta: 'Market - stage - location',
    fit: 'Review',
    headline: 'A reusable preview card for the product, team, proof links, and investor materials.',
    facts: [
      ['Current build', 'Launch details'],
      ['Stage', 'Founder selected'],
      ['Traction', 'Owner supplied'],
      ['Raising', 'Founder selected'],
    ],
  },
];
// Interactive ranked inbox: each row expands into the founder's profile card on
// hover (or keyboard focus), using the smooth grid-rows height transition.
const RankedByFitCard = () => {
  const [active, setActive] = useState(0);
  return (
    <div className="flex min-h-[520px] flex-col rounded-[40px] bg-[#242424] p-7 text-white">
      <div className="mb-5 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#a7fccd]">Ranked by fit</p>
        <LogoIcon className="h-5 w-5 text-[#000000]" />
      </div>

      <div className="grid gap-3">
        {rankedFounders.map((f, i) => {
          const open = active === i;
          return (
            <div
              key={f.handle}
              tabIndex={0}
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              className={`cursor-pointer rounded-2xl border p-4 outline-none transition-colors ${
                open ? 'border-[#a7fccd]/40 bg-white/[0.06]' : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.05]'
              }`}
            >
              {/* Row */}
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#cfdaf5] text-xs font-semibold text-[#242424]">AP</div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{f.company}</p>
                  <p className="text-xs text-white/45">{f.meta}</p>
                </div>
                <span className="ml-auto rounded-full bg-[#cfdaf5] px-2.5 py-1 text-xs font-semibold text-black">{f.fit}</span>
              </div>

              {/* Expanded founder card (smooth height via grid-rows) */}
              <div className={`grid transition-all duration-300 ease-out ${open ? 'mt-4 grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                <div className="overflow-hidden">
                  <div className="border-t border-white/10 pt-4">
                    <div className="flex items-center gap-3">
                      <div className="min-w-0">
                        <p className="text-base font-semibold">{f.name}</p>
                        <p className="text-xs text-white/50">@{f.handle}</p>
                      </div>
                      <div className="ml-auto text-right">
                        <p className="text-[0.55rem] font-semibold uppercase tracking-[0.14em] text-white/40">Proof</p>
                        <p className="text-sm font-semibold leading-none">Owner supplied</p>
                      </div>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-white/70">{f.headline}</p>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      {f.facts.map(([label, value]) => (
                        <div key={label}>
                          <p className="text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-white/40">{label}</p>
                          <p className="mt-0.5 text-sm font-medium text-white/85">{value}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-white/75">
                        <GitHubIcon className="h-3.5 w-3.5" /> GitHub
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-white/75">
                        <Play className="h-3.5 w-3.5" /> Pitch video
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-white/75">
                        <FileText className="h-3.5 w-3.5" /> Deck
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-5 text-xs text-white/40">Hover a founder to preview their profile.</p>
    </div>
  );
};

const vcRows = [
  ['01', 'Define thesis', 'Capture sectors, stages, geographies, check size, founder signals, pass signals, and examples.'],
  ['02', 'Let your agent source', 'Your AI investor agent works 24/7, ranking verified founders against your thesis by proof, freshness, and fit.'],
  ['03', 'Map builder density', 'Drop a place, locate projects nearby, and see Apparent builders around that focus.'],
  ['04', 'Move through deal flow', 'Save a builder, let the agent draft outreach, and drag opportunities through a Kanban pipeline.'],
];

const investorBenefits = [
  {
    title: 'Private thesis workspace',
    icon: Target,
    text: 'Turn your taste into criteria your AI agent can source against, repeatedly.',
  },
  {
    title: 'Agent-sourced signal inbox',
    icon: Search,
    text: 'Your agent surfaces verified founders with source links, proof, and relevance, fresh every day.',
  },
  {
    title: 'Deal-flow Kanban',
    icon: KanbanSquare,
    text: 'Move saved builders through sourcing, meeting, diligence, and partner review.',
  },
  {
    title: 'Digest and alerts',
    icon: Bell,
    text: 'Keep the highest-signal founder updates from disappearing between meetings.',
  },
];

export const ForVCs = () => {
  const navigate = useNavigate();
  useReveal();

  return (
    <main className="monad monad-page overflow-x-hidden bg-[#f6f3f1] text-black">
      <section data-reveal className="reveal mx-auto max-w-[92rem] px-5 pb-14 pt-14 sm:px-8 md:pt-20">
        <h1
          className="max-w-[86rem] text-[3.35rem] font-normal leading-[0.88] tracking-[-0.055em] sm:text-[7rem] md:text-[8.5rem] lg:text-[10rem]"
          style={serifDisplay}
        >
          Find <span className="block sm:inline">builders</span>
          <br />
          before <span className="block sm:inline">consensus.</span>
        </h1>
        <div className="mt-10 grid gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <p className="max-w-2xl text-lg leading-8 text-black/65 md:text-xl">
            Apparent gives investors a private sourcing desk with an AI agent that works 24/7. Capture your thesis once, and it sources, ranks, and drafts outreach to verified founders who fit, by proof, stage, and freshness.
          </p>
          <button
            type="button"
            onClick={() => navigate('/login?role=investor')}
            className="w-full rounded-full bg-[#cfdaf5] px-6 py-3 text-sm font-semibold text-black transition-colors hover:bg-[#bcc8ef] sm:w-auto"
          >
            Create investor profile <ArrowUpRight className="ml-1 inline h-3.5 w-3.5 align-[-2px]" />
          </button>
        </div>
      </section>

      <section id="features" data-reveal className="reveal mx-auto grid max-w-[92rem] gap-8 border-t border-black/10 px-5 py-14 sm:px-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-stretch">
        <div className="py-4 lg:py-8">
          <h2 className="text-5xl font-normal leading-none tracking-[-0.045em] md:text-7xl" style={serifDisplay}>
            See the sourcing picture earlier.
          </h2>
          <p className="mt-8 max-w-2xl text-base leading-8 text-black/60">
            Apparent turns builder proof, public signals, local density, and your thesis into a repeatable sourcing workflow.
          </p>
          <div className="mt-10 grid gap-5">
            {vcRows.map(([number, title, text]) => (
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
            onClick={() => navigate('/login?role=investor')}
            className="mt-10 rounded-full bg-[#cfdaf5] px-6 py-3 text-sm font-semibold text-black transition-colors hover:bg-[#bcc8ef]"
          >
            Build your thesis
          </button>
        </div>

        {/* Interactive ranked inbox — hover a founder to open their card. */}
        <RankedByFitCard />
      </section>

      <section data-reveal className="reveal mx-auto max-w-[92rem] border-t border-black/10 px-5 py-16 sm:px-8">
        <div className="pt-2">
          <h2 className="max-w-4xl text-5xl font-normal leading-none tracking-[-0.045em] md:text-7xl" style={serifDisplay}>
            Source from proof, not noise.
          </h2>
          <div className="mt-24 grid gap-10 md:grid-cols-4">
            {investorBenefits.map((benefit, i) => (
              <article key={benefit.title} data-reveal style={{ transitionDelay: `${i * 90}ms` }} className="reveal pt-1">
                <benefit.icon className="mb-8 h-5 w-5 text-black" />
                <h3 className="text-xl font-normal tracking-[-0.025em]" style={serifDisplay}>
                  {benefit.title}
                </h3>
                <p className="mt-5 text-sm leading-6 text-black/55">{benefit.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="deal-flow" data-reveal className="reveal mx-auto max-w-[92rem] px-5 py-10 sm:px-8">
        <div className="flex min-h-[320px] items-center overflow-hidden rounded-[40px] bg-[#242424] px-8 py-14 text-white md:min-h-[420px] md:px-16">
          <div>
            <h2 className="max-w-4xl text-4xl font-normal leading-[1.05] tracking-[-0.04em] md:text-6xl" style={serifDisplay}>
              By the time it&apos;s consensus, the round is full.
            </h2>
            <p className="mt-6 max-w-xl text-base leading-7 text-white/55">
              Apparent surfaces founders who fit your thesis while they&apos;re still building, not after the deal turns competitive.
            </p>
          </div>
        </div>
      </section>

      <section data-reveal className="reveal mx-auto grid max-w-[92rem] border-t border-black/10 px-5 py-16 sm:px-8 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="flex min-h-[420px] items-center overflow-hidden rounded-[40px] bg-[#242424] p-10 text-white lg:min-h-[580px] lg:rounded-r-none lg:p-14">
          <blockquote className="max-w-md text-3xl font-normal leading-tight tracking-[-0.03em] md:text-4xl" style={serifDisplay}>
            “The best sourcing advantage is knowing which builders matter before the market agrees.”
          </blockquote>
        </div>
        <div className="bg-[#f6f3f1] px-0 py-10 lg:px-14 lg:py-16">
          <div className="mt-8 grid gap-6">
            {[
              ['Inbox', 'Your agent ranks founder and company signals by thesis, proof, freshness, and geography.'],
              ['Outreach', 'The agent drafts first messages from your thesis and the founder signal that triggered the match.'],
              ['Pipeline', 'Drag saved builders through a clean venture CRM-style board.'],
            ].map(([title, text]) => (
              <div key={title}>
                <h3 className="text-base font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-black/55">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section data-reveal className="reveal mx-auto max-w-[92rem] border-t border-black/10 px-5 py-20 sm:px-8">
        <div className="py-10 text-center">
          <BarChart3 className="mx-auto mb-10 h-6 w-6 text-[#000000]" />
          <h2 className="mx-auto max-w-3xl text-5xl font-normal leading-none tracking-[-0.045em] md:text-7xl" style={serifDisplay}>
            Build your private sourcing desk.
          </h2>
          <p className="mx-auto mt-8 max-w-2xl text-base leading-8 text-black/55">
            Capture your thesis once, then let Apparent keep surfacing relevant builders with proof attached.
          </p>
          <button
            type="button"
            onClick={() => navigate('/login?role=investor')}
            className="mt-10 rounded-full bg-[#cfdaf5] px-8 py-3 text-sm font-semibold text-black transition-colors hover:bg-[#bcc8ef]"
          >
            Create investor profile
          </button>
        </div>
      </section>

      <section data-reveal className="reveal mx-auto max-w-[92rem] px-5 pb-20 sm:px-8">
        <div className="grid gap-10 text-sm text-black/55 md:grid-cols-3">
          {[
            ['Meetups', 'Announce rooms, office hours, and founder gatherings around your thesis.'],
            ['Terms', 'Keep term review and plain-language notes connected to the company context.'],
            ['Alerts', 'Persist digest and Slack alert preferences for fresh founder signals.'],
          ].map(([title, text], index) => {
            const icons = [Calendar, FileText, Bell];
            const Icon = icons[index];
            return (
              <div key={title} className="pt-1">
                <Icon className="mb-5 h-4 w-4 text-[#242424]" />
                <h3 className="font-semibold text-black">{title}</h3>
                <p className="mt-2 leading-6">{text}</p>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
};
