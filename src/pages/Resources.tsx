import { ArrowUpRight, BookOpen, FileText, Map, MessageCircle, PlayCircle, Search, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const serifDisplay = {
  fontFamily: "'Source Serif 4', ui-serif, Georgia, 'Times New Roman', serif",
};

const benefits = [
  {
    title: 'Founder profile guide',
    icon: BookOpen,
    text: 'Structure products, GitHub, traction, press, and capital goals so investors can scan proof fast.',
  },
  {
    title: 'Investor sourcing guide',
    icon: Search,
    text: 'Turn thesis, stage, geography, and founder taste into ranked sourcing criteria.',
  },
  {
    title: 'Builder Radar manual',
    icon: Map,
    text: 'Search places, locate nearby projects, filter builders, and read local cluster signal.',
  },
  {
    title: 'DM playbook',
    icon: MessageCircle,
    text: 'Draft founder notes, investor replies, and meetup follow-ups without losing context.',
  },
];

const playbooks = [
  ['01', 'Make a proof profile pop', 'The fields that matter most when investors scan a builder profile.'],
  ['02', 'Write a thesis people can search', 'How to turn investment taste into precise Apparent criteria.'],
  ['03', 'Use Builder Radar properly', 'How location, freshness, category, and density guide discovery.'],
  ['04', 'Move from signal to first message', 'Save a builder, draft outreach, and move into deal flow.'],
];

const walkthroughs = [
  ['Founder workspace', 'Save proof profile, launches, messages, and investor matches.'],
  ['Investor workspace', 'Save thesis, rank signals, draft outreach, and move builders through Kanban.'],
  ['Builder Radar', 'Search a place, locate nearby projects, and filter builders around the map focus.'],
  ['Terms review', 'Attach deal context, notes, status, and review history to the relationship.'],
];

export const Resources = () => {
  const navigate = useNavigate();

  return (
    <main className="monad monad-page overflow-x-hidden bg-[#f6f3f1] text-black">
      <section className="mx-auto max-w-[92rem] px-5 pb-14 pt-14 sm:px-8 md:pt-20">
        <h1
          className="max-w-[86rem] text-[3.55rem] font-normal leading-[0.88] tracking-[-0.055em] sm:text-[7rem] md:text-[8.5rem] lg:text-[10rem]"
          style={serifDisplay}
        >
          Resources <span className="block sm:inline">for</span>
          <br />
          finding signal.
        </h1>
        <div className="mt-10 grid gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <p className="max-w-2xl text-lg leading-8 text-black/65 md:text-xl">
            Guides, playbooks, and product notes for using Apparent as a founder proof profile, investor sourcing desk, Builder Radar, and deal workflow.
          </p>
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="w-full rounded-full bg-[#cfdaf5] px-6 py-3 text-sm font-semibold text-black transition-colors hover:bg-[#bcc8ef] sm:w-auto"
          >
            Start learning <ArrowUpRight className="ml-1 inline h-3.5 w-3.5 align-[-2px]" />
          </button>
        </div>
      </section>

      <section className="mx-auto max-w-[92rem] border-t border-black/10 px-5 py-16 sm:px-8">
        <div className="pt-2">
          <h2 className="max-w-4xl text-5xl font-normal leading-none tracking-[-0.045em] md:text-7xl" style={serifDisplay}>
            We’ve cracked the workflows.
          </h2>
          <p className="mt-8 max-w-2xl text-base leading-8 text-black/55">
            Each resource maps to a real product surface inside Apparent: profiles, thesis capture, radar discovery, DMs, terms, and deal flow.
          </p>

          <div className="mt-24 grid gap-10 md:grid-cols-4">
            {benefits.map((benefit) => (
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

      <section className="mx-auto max-w-[92rem] px-5 py-10 sm:px-8">
        <div className="flex min-h-[320px] items-center overflow-hidden rounded-[32px] bg-[#242424] px-8 py-14 text-white md:min-h-[420px] md:px-16">
          <div>
            <h2 className="max-w-4xl text-4xl font-normal leading-[1.05] tracking-[-0.04em] md:text-6xl" style={serifDisplay}>
              The clearest proof gets the meeting.
            </h2>
            <p className="mt-6 max-w-xl text-base leading-7 text-white/55">
              These guides show founders how to make their work legible, and investors how to turn taste into a searchable thesis.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-[92rem] gap-8 border-t border-black/10 px-5 py-14 sm:px-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-stretch">
        <div className="py-4 lg:py-8">
          <h2 className="text-5xl font-normal leading-none tracking-[-0.045em] md:text-7xl" style={serifDisplay}>
            See the path from signal to motion.
          </h2>
          <p className="mt-8 max-w-2xl text-base leading-8 text-black/60">
            The useful parts of Apparent are connected. These notes explain how to move from profile proof to radar discovery, first message, and deal-room context.
          </p>
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="mt-10 rounded-full bg-[#cfdaf5] px-6 py-3 text-sm font-semibold text-black transition-colors hover:bg-[#bcc8ef]"
          >
            Discover more
          </button>
        </div>

        <div className="grid gap-4">
          {playbooks.map(([number, title, text]) => (
            <article key={number} className="grid gap-4 rounded-[24px] bg-white/70 p-5 sm:grid-cols-[3rem_1fr_auto] sm:items-start">
              <span className="text-sm font-semibold text-black/45">{number}</span>
              <div>
                <h3 className="text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-black/55">{text}</p>
              </div>
              <button type="button" className="w-fit rounded-full bg-[#f6f3f1] px-3 py-1.5 text-xs font-semibold text-black/65 transition-colors hover:bg-white">
                Read
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-[92rem] border-t border-black/10 px-5 py-16 sm:px-8 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="flex min-h-[420px] items-center overflow-hidden rounded-[32px] bg-[#242424] p-10 text-white lg:min-h-[580px] lg:rounded-r-none lg:p-14">
          <blockquote className="max-w-md text-3xl font-normal leading-tight tracking-[-0.03em] md:text-4xl" style={serifDisplay}>
            “The fastest way to learn Apparent is to put your proof in it.”
          </blockquote>
        </div>
        <div className="bg-[#f6f3f1] px-0 py-10 lg:px-14 lg:py-16">
          <PlayCircle className="mb-10 h-6 w-6 text-[#000000]" />
          <h2 className="max-w-3xl text-5xl font-normal leading-none tracking-[-0.045em] md:text-7xl" style={serifDisplay}>
            Product walkthroughs.
          </h2>
          <div className="mt-12 grid gap-6">
            {walkthroughs.map(([title, text]) => (
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
          <Users className="mx-auto mb-10 h-6 w-6 text-[#000000]" />
          <h2 className="mx-auto max-w-3xl text-5xl font-normal leading-none tracking-[-0.045em] md:text-7xl" style={serifDisplay}>
            Learn it inside the product.
          </h2>
          <p className="mx-auto mt-8 max-w-2xl text-base leading-8 text-black/55">
            The best resource is the workspace itself. Start as a founder or investor and let the product guide the next move.
          </p>
          <div className="mx-auto mt-10 flex max-w-3xl flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => navigate('/login?role=founder')}
              className="flex-1 rounded-full bg-[#cfdaf5] px-6 py-3 text-sm font-semibold text-black hover:bg-[#bcc8ef]"
            >
              Create founder profile
            </button>
            <button
              type="button"
              onClick={() => navigate('/login?role=investor')}
              className="alden-investor-cta flex-1 rounded-full bg-[#cfdaf5] px-6 py-3 text-sm font-semibold text-black transition-colors hover:bg-[#bcc8ef]"
            >
              Create investor profile <ArrowUpRight className="ml-1 inline h-3.5 w-3.5 align-[-2px]" />
            </button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[92rem] px-5 pb-20 sm:px-8">
        <div className="grid gap-10 text-sm text-black/55 md:grid-cols-3">
          {[
            ['Matching', 'Rules-based today, explainable by profile, thesis, freshness, and proof.'],
            ['Integrations', 'GitHub, Slack, and signal connectors are staged as practical workflow extensions.'],
            ['Terms', 'Plain-language notes keep deal context readable before legal review gets heavy.'],
          ].map(([title, text]) => (
            <div key={title} className="pt-1">
              <FileText className="mb-5 h-4 w-4 text-[#242424]" />
              <h3 className="font-semibold text-black">{title}</h3>
              <p className="mt-2 leading-6">{text}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
};
