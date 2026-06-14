import { ArrowUpRight, CheckCircle2, FileText, Map, MapPin, Play, Rocket, Search, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { GitHubIcon } from '../components/GitHubIcon';
import { useReveal } from '../lib/useReveal';
import { CLI_CARD_HTML } from '../components/cliCardHtml';

const serifDisplay = {
  fontFamily: "'Source Serif 4', ui-serif, Georgia, 'Times New Roman', serif",
};

const founderRows = [
  ['01', 'Verify in seconds', 'Run npx apparent and your GitHub, shipped products, traction, and launches become a verified proof profile.'],
  ['02', 'Get matched by thesis', 'Investors find you through criteria, founder signals, stage, category, and the evidence you already have.'],
  ['03', 'Let your agent reach out', 'Your AI founder agent finds the investors who fit and opens personalized intros on your behalf, never spam.'],
  ['04', 'Move from DM to deal room', 'Messages, terms review, and investor follow-up stay connected to the profile that created interest.'],
];

const founderBenefits = [
  {
    title: 'Verified in one command',
    icon: CheckCircle2,
    text: 'Run npx apparent and turn what you shipped into a profile investors can actually trust.',
  },
  {
    title: 'GitHub context',
    icon: GitHubIcon,
    text: 'Show technical depth and project history without forcing people to hunt.',
  },
  {
    title: 'An agent that pitches for you',
    icon: Search,
    text: 'Your AI agent surfaces and reaches investors whose thesis maps to your category, stage, and traction.',
  },
  {
    title: 'Founder network',
    icon: Users,
    text: 'Find nearby and similar builders, then start the conversation inside Apparent.',
  },
];

export const ForFounders = () => {
  const navigate = useNavigate();
  useReveal();

  return (
    <main className="monad monad-page overflow-x-hidden bg-[#f6f3f1] text-black">
      <section data-reveal className="reveal mx-auto max-w-[92rem] px-5 pb-14 pt-14 sm:px-8 md:pt-20">
        <h1
          className="max-w-[86rem] text-[3.35rem] font-normal leading-[0.88] tracking-[-0.055em] sm:text-[7rem] md:text-[8.5rem] lg:text-[10rem]"
          style={serifDisplay}
        >
          Let your <span className="block sm:inline">work</span>
          <br />
          find its fit.
        </h1>
        <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,34rem)] lg:items-center">
          <div className="flex flex-col items-start gap-8">
            <p className="max-w-2xl text-lg leading-8 text-black/65 md:text-xl">
              Run <span className="font-mono text-[0.9em] text-[#242424]">npx apparent</span> and what you&apos;ve shipped becomes a verified proof profile. Then your AI agent matches and reaches the investors whose thesis, stage, and sector actually fit your raise. No warm intro required.
            </p>
            <button
              type="button"
              onClick={() => navigate('/login?role=founder')}
              className="w-full rounded-full bg-[#cfdaf5] px-6 py-3 text-sm font-semibold text-black hover:bg-[#bcc8ef] sm:w-auto"
            >
              Create founder profile <ArrowUpRight className="ml-1 inline h-3.5 w-3.5 align-[-2px]" />
            </button>
          </div>
          <div
            className="cli-card w-full"
            role="img"
            aria-label="The npx apparent build card: a verified founder profile rendered in the terminal from local git activity."
          >
            <div className="cli-card__bar" aria-hidden="true">
              <i style={{ background: '#ff5f57' }} />
              <i style={{ background: '#febc2e' }} />
              <i style={{ background: '#28c840' }} />
              <span className="t">founder@local: ~/medai</span>
            </div>
            <pre dangerouslySetInnerHTML={{ __html: CLI_CARD_HTML }} />
          </div>
        </div>
      </section>

      <section id="features" data-reveal className="reveal mx-auto grid max-w-[92rem] gap-8 border-t border-black/10 px-5 py-14 sm:px-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-stretch">
        <div className="py-4 lg:py-8">
          <h2 className="text-5xl font-normal leading-none tracking-[-0.045em] md:text-7xl" style={serifDisplay}>
            Show what investors need to see.
          </h2>
          <p className="mt-8 max-w-2xl text-base leading-8 text-black/60">
            Apparent is built around the evidence you already have: code, launches, customers, press, product velocity, and where you are building.
          </p>
          <div className="mt-10 grid gap-5">
            {founderRows.map(([number, title, text]) => (
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
            onClick={() => navigate('/login?role=founder')}
            className="mt-10 rounded-full bg-[#cfdaf5] px-6 py-3 text-sm font-semibold text-black transition-colors hover:bg-[#bcc8ef]"
          >
            Start building your profile
          </button>
        </div>

        {/* Example profile layout; real profiles are populated from founder data. */}
        <div className="relative flex min-h-[520px] flex-col justify-between overflow-hidden rounded-[40px] bg-[#242424] p-7 text-white">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#cfdaf5] px-3 py-1 text-xs font-semibold text-[#242424]">Founder on Apparent</span>
              <span className="rounded-full bg-[#242424] px-3 py-1 text-xs font-semibold text-white">Raise context</span>
              <span className="flex items-center gap-1 text-xs text-white/50"><MapPin className="h-3 w-3" /> Founder location</span>
            </div>
            <div className="mt-6 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#cfdaf5] text-sm font-semibold text-[#242424]">
                AP
              </div>
              <div className="min-w-0">
                <p className="text-lg font-semibold">Founder profile</p>
                <p className="text-sm text-white/55">@username</p>
              </div>
              <div className="shrink-0 border-l border-white/10 pl-4">
                <p className="text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-white/40">Proof</p>
                <p className="text-lg font-semibold leading-none">Verified</p>
                <span className="mt-1 inline-flex text-[0.65rem] font-semibold text-[#a7fccd]">Owner supplied</span>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-white/70">A focused snapshot of what the founder is building, shipping, and looking for.</p>
            <div className="mt-6 grid grid-cols-2 gap-3 border-t border-white/10 pt-6">
              {[
                ['Current build', 'Product summary'],
                ['Category', 'Founder selected'],
                ['Stage', 'Founder selected'],
                ['Traction', 'Owner supplied'],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-white/40">{label}</p>
                  <p className="mt-1 text-sm font-medium text-white/85">{value}</p>
                </div>
              ))}
            </div>

            {/* Pitch: compact video player + slide deck side by side */}
            <div className="mt-6 border-t border-white/10 pt-6">
              <p className="mb-3 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-white/40">Pitch</p>
              <div className="grid grid-cols-2 gap-3">
                {/* Mock video player */}
                <button
                  type="button"
                  className="group relative flex aspect-video w-full overflow-hidden rounded-xl bg-gradient-to-br from-[#242424] via-[#242424] to-[#242424]"
                  aria-label="Play founder pitch video"
                >
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-[#242424] shadow-lg transition-transform duration-200 group-hover:scale-110">
                      <Play className="ml-0.5 h-4 w-4 fill-current" />
                    </span>
                  </span>
                  <span className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                    <span className="text-[0.6rem] font-semibold text-white">Pitch video</span>
                    <span className="rounded bg-black/55 px-1 py-0.5 text-[0.55rem] font-medium text-white/90">Uploaded</span>
                  </span>
                </button>

                {/* Mock slide deck */}
                <div className="relative">
                  <div aria-hidden className="absolute right-0 top-0 h-full w-full -translate-y-1 translate-x-1 rounded-xl border border-white/10 bg-white/[0.03]" />
                  <div className="relative flex aspect-video flex-col rounded-xl border border-white/10 bg-white/[0.06] p-3">
                    <div className="h-1.5 w-2/3 rounded-full bg-white/30" />
                    <div className="mt-2 h-1 w-full rounded-full bg-white/10" />
                    <div className="mt-1.5 h-1 w-4/5 rounded-full bg-white/10" />
                    <div className="mt-auto flex items-center justify-between">
                      <span className="flex items-center gap-1 text-[0.6rem] text-white/45"><FileText className="h-3 w-3" /> Deck</span>
                      <span className="rounded bg-black/40 px-1 py-0.5 text-[0.55rem] font-medium text-white/70">Uploaded</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-7">
            <div className="flex flex-wrap gap-2">
              {[
                ['Website', Rocket],
                ['GitHub', GitHubIcon],
                ['LinkedIn', Users],
              ].map(([label, Icon]) => (
                <span key={label as string} className="flex items-center gap-1.5 rounded-full bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-white/75">
                  <Icon className="h-3.5 w-3.5" /> {label as string}
                </span>
              ))}
            </div>
            <p className="mt-6 text-xs text-white/40">Investors see the whole picture. What you&apos;ve shipped counts most.</p>
          </div>
        </div>
      </section>

      <section data-reveal className="reveal mx-auto max-w-[92rem] border-t border-black/10 px-5 py-16 sm:px-8">
        <div className="pt-2">
          <h2 className="max-w-4xl text-5xl font-normal leading-none tracking-[-0.045em] md:text-7xl" style={serifDisplay}>
            Build once. Become discoverable everywhere.
          </h2>
          <div className="mt-24 grid gap-10 md:grid-cols-4">
            {founderBenefits.map((benefit, i) => (
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

      <section data-reveal className="reveal mx-auto max-w-[92rem] px-5 py-10 sm:px-8">
        <div className="flex min-h-[320px] items-center overflow-hidden rounded-[40px] bg-[#242424] px-8 py-14 text-white md:min-h-[420px] md:px-16">
          <div>
            <h2 className="max-w-4xl text-4xl font-normal leading-[1.05] tracking-[-0.04em] md:text-6xl" style={serifDisplay}>
              Your GitHub is a better pitch than your network.
            </h2>
            <p className="mt-6 max-w-xl text-base leading-7 text-white/55">
              Apparent reads the evidence you already have and puts it in front of the investors it actually fits.
            </p>
          </div>
        </div>
      </section>

      <section data-reveal className="reveal mx-auto grid max-w-[92rem] border-t border-black/10 px-5 py-16 sm:px-8 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="flex min-h-[420px] items-center overflow-hidden rounded-[40px] bg-[#242424] p-10 text-white lg:min-h-[520px] lg:rounded-r-none lg:p-14">
          <blockquote className="max-w-md text-3xl font-normal leading-tight tracking-[-0.03em] md:text-4xl" style={serifDisplay}>
            “Your work should speak before your network does.”
          </blockquote>
        </div>
        <div className="bg-[#f6f3f1] px-0 py-10 lg:px-14 lg:py-16">
          <div className="mt-8 grid gap-6">
            {[
              ['Verify', 'Run npx apparent to attach real code, products, metrics, and proof to each build.'],
              ['Match', 'See investors ranked by thesis fit and founder signal.'],
              ['Let your agent open it', 'Your AI agent drafts the intro and starts the conversation with context attached.'],
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
          <Map className="mx-auto mb-10 h-6 w-6 text-[#000000]" />
          <h2 className="mx-auto max-w-3xl text-5xl font-normal leading-none tracking-[-0.045em] md:text-7xl" style={serifDisplay}>
            Put your proof where capital can find it.
          </h2>
          <p className="mx-auto mt-8 max-w-2xl text-base leading-8 text-black/55">
            Create the founder workspace, save your launches, and let Apparent turn your work into signal.
          </p>
          <button
            type="button"
            onClick={() => navigate('/login?role=founder')}
            className="mt-10 rounded-full bg-[#cfdaf5] px-8 py-3 text-sm font-semibold text-black hover:bg-[#bcc8ef]"
          >
            Create founder profile
          </button>
        </div>
      </section>
    </main>
  );
};
