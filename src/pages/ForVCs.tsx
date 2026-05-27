import { ArrowUpRight, BarChart3, Bell, Calendar, FileText, KanbanSquare, Radar, Search, Target } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const serifDisplay = {
  fontFamily: 'Georgia, "Times New Roman", serif',
};

const vcRows = [
  ['01', 'Define thesis', 'Capture sectors, stages, geographies, check size, founder signals, pass signals, and examples.'],
  ['02', 'Rank public proof', 'Signals are scored by relevance, freshness, source type, stage, geography, and founder taste.'],
  ['03', 'Map builder density', 'Drop a place, locate projects nearby, and see Apparent builders around that focus.'],
  ['04', 'Move through deal flow', 'Save a builder, draft outreach, and drag opportunities through a Kanban pipeline.'],
];

const investorBenefits = [
  {
    title: 'Private thesis workspace',
    icon: Target,
    text: 'Turn your taste into criteria the sourcing system can use repeatedly.',
  },
  {
    title: 'Ranked signal inbox',
    icon: Search,
    text: 'Fresh companies and builders appear with source links, proof, and relevance.',
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

  return (
    <main className="overflow-x-hidden bg-[#fbfaf7] text-black">
      <section className="mx-auto max-w-[92rem] px-5 pb-14 pt-14 sm:px-8 md:pt-20">
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
            Apparent gives investors a private founder-sourcing workspace: thesis capture, Builder Radar, ranked signal inbox, outreach drafts, daily digest, and draggable deal flow.
          </p>
          <button
            type="button"
            onClick={() => navigate('/login?role=investor')}
            className="w-full rounded-full bg-[#42520d] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#34420a] sm:w-auto"
          >
            Create investor profile <ArrowUpRight className="ml-1 inline h-3.5 w-3.5 align-[-2px]" />
          </button>
        </div>
      </section>

      <section id="features" className="mx-auto grid max-w-[92rem] gap-8 border-t border-black/10 px-5 py-14 sm:px-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-stretch">
        <div className="py-4 lg:py-8">
          <p className="mb-12 text-sm font-semibold text-[#42520d]">For VCs and GPs</p>
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
            className="mt-10 rounded-full bg-[#dcefc7] px-6 py-3 text-sm font-semibold text-black transition-colors hover:bg-[#cce8ae]"
          >
            Build your thesis
          </button>
        </div>

        <div className="relative min-h-[520px] overflow-hidden rounded-[32px] bg-[#d8c7a3]">
          <img
            src="https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1400&q=85"
            alt="Landscape representing early founder discovery"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-[#42520d]/15" />
          <div className="absolute bottom-6 left-6 right-6 rounded-[24px] bg-white/82 p-5 backdrop-blur">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold">Builder Radar</p>
                <p className="mt-1 text-sm text-black/55">Apparent builders by proof, location, stage, and fit.</p>
              </div>
              <Radar className="h-5 w-5 shrink-0 text-[#02A070]" />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[92rem] border-t border-black/10 px-5 py-16 sm:px-8">
        <div className="pt-2">
          <p className="mb-12 text-sm font-semibold text-[#42520d]">Workspace</p>
          <h2 className="max-w-4xl text-5xl font-normal leading-none tracking-[-0.045em] md:text-7xl" style={serifDisplay}>
            Source from proof, not noise.
          </h2>
          <div className="mt-24 grid gap-10 md:grid-cols-4">
            {investorBenefits.map((benefit) => (
              <article key={benefit.title} className="pt-1">
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

      <section id="deal-flow" className="mx-auto max-w-[92rem] px-5 py-10 sm:px-8">
        <div className="h-[320px] overflow-hidden rounded-[32px] bg-[#d7d0c0] md:h-[420px]">
          <img
            src="https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1800&q=85"
            alt="Workspace representing investor sourcing operations"
            className="h-full w-full object-cover"
          />
        </div>
      </section>

      <section className="mx-auto grid max-w-[92rem] border-t border-black/10 px-5 py-16 sm:px-8 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="min-h-[580px] overflow-hidden rounded-[32px] bg-[#d8c7a3] lg:rounded-r-none">
          <img
            src="https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=1400&q=85"
            alt="Structured forms representing a deal-flow pipeline"
            className="h-full w-full object-cover"
          />
        </div>
        <div className="bg-[#fbfaf7] px-0 py-10 lg:px-14 lg:py-16">
          <blockquote className="max-w-3xl text-4xl font-normal leading-tight tracking-[-0.04em] md:text-5xl" style={serifDisplay}>
            “The best sourcing advantage is knowing which builders matter before the market agrees.”
          </blockquote>
          <div className="mt-12 grid gap-6">
            {[
              ['Inbox', 'Rank founder/company signals by thesis, proof, freshness, and geography.'],
              ['Outreach', 'Draft first messages from the thesis and signal context.'],
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

      <section className="mx-auto max-w-[92rem] border-t border-black/10 px-5 py-20 sm:px-8">
        <div className="py-10 text-center">
          <BarChart3 className="mx-auto mb-10 h-6 w-6 text-[#02A070]" />
          <h2 className="mx-auto max-w-3xl text-5xl font-normal leading-none tracking-[-0.045em] md:text-7xl" style={serifDisplay}>
            Build your private sourcing desk.
          </h2>
          <p className="mx-auto mt-8 max-w-2xl text-base leading-8 text-black/55">
            Capture your thesis once, then let Apparent keep surfacing relevant builders with proof attached.
          </p>
          <button
            type="button"
            onClick={() => navigate('/login?role=investor')}
            className="mt-10 rounded-full bg-[#42520d] px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#34420a]"
          >
            Create investor profile
          </button>
        </div>
      </section>

      <section className="mx-auto max-w-[92rem] px-5 pb-20 sm:px-8">
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
                <Icon className="mb-5 h-4 w-4 text-[#42520d]" />
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
