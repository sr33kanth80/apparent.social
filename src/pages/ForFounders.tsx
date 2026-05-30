import { ArrowUpRight, CheckCircle2, Map, MapPin, Rocket, Search, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { GitHubIcon } from '../components/GitHubIcon';

const serifDisplay = {
  fontFamily: 'Georgia, "Times New Roman", serif',
};

const founderRows = [
  ['01', 'Make proof legible', 'Products, GitHub, press, traction, launches, location, and capital goals sit in one focused profile.'],
  ['02', 'Get matched by thesis', 'Investors find you through criteria, founder signals, stage, category, and the evidence you already have.'],
  ['03', 'Find your local network', 'Builder Radar shows peers, meetups, and nearby capital around your city, venue, or current location.'],
  ['04', 'Move from DM to deal room', 'Messages, terms review, and investor follow-up stay connected to the profile that created interest.'],
];

const founderBenefits = [
  {
    title: 'Proof profile',
    icon: CheckCircle2,
    text: 'Turn what you shipped into a profile that investors can actually evaluate.',
  },
  {
    title: 'GitHub context',
    icon: GitHubIcon,
    text: 'Show technical depth and project history without forcing people to hunt.',
  },
  {
    title: 'Investor matches',
    icon: Search,
    text: 'See investors whose thesis maps to your category, stage, and traction.',
  },
  {
    title: 'Founder network',
    icon: Users,
    text: 'Find nearby and similar builders, then start the conversation inside Apparent.',
  },
];

export const ForFounders = () => {
  const navigate = useNavigate();

  return (
    <main className="overflow-x-hidden bg-[#fbfaf7] text-black">
      <section className="mx-auto max-w-[92rem] px-5 pb-14 pt-14 sm:px-8 md:pt-20">
        <h1
          className="max-w-[86rem] text-[3.35rem] font-normal leading-[0.88] tracking-[-0.055em] sm:text-[7rem] md:text-[8.5rem] lg:text-[10rem]"
          style={serifDisplay}
        >
          Let your <span className="block sm:inline">work</span>
          <br />
          find its fit.
        </h1>
        <div className="mt-10 grid gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <p className="max-w-2xl text-lg leading-8 text-black/65 md:text-xl">
            Apparent turns what you&apos;ve shipped into a proof profile, then matches you to the investors whose thesis, stage, and sector actually fit your raise. No warm intro required.
          </p>
          <button
            type="button"
            onClick={() => navigate('/login?role=founder')}
            className="w-full rounded-full bg-[#dcefc7] px-6 py-3 text-sm font-semibold text-black hover:bg-[#cce8ae] sm:w-auto"
          >
            Create founder profile <ArrowUpRight className="ml-1 inline h-3.5 w-3.5 align-[-2px]" />
          </button>
        </div>
      </section>

      <section id="features" className="mx-auto grid max-w-[92rem] gap-8 border-t border-black/10 px-5 py-14 sm:px-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-stretch">
        <div className="py-4 lg:py-8">
          <p className="mb-12 text-sm font-semibold text-[#42520d]">For founders</p>
          <h2 className="text-5xl font-normal leading-none tracking-[-0.045em] md:text-7xl" style={serifDisplay}>
            See what investors need to see.
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
            className="mt-10 rounded-full bg-[#dcefc7] px-6 py-3 text-sm font-semibold text-black transition-colors hover:bg-[#cce8ae]"
          >
            Start building your profile
          </button>
        </div>

        {/* Mock founder profile — mirrors the real public profile an investor sees. */}
        <div className="relative flex min-h-[520px] flex-col justify-between overflow-hidden rounded-[32px] bg-[#1c1c1a] p-7 text-white">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#dcefc7] px-3 py-1 text-xs font-semibold text-[#42520d]">Founder on Apparent</span>
              <span className="rounded-full bg-[#42520d] px-3 py-1 text-xs font-semibold text-white">Raising Seed · $1.5M</span>
              <span className="flex items-center gap-1 text-xs text-white/50"><MapPin className="h-3 w-3" /> San Francisco</span>
            </div>
            <div className="mt-6 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#dcefc7] text-base font-semibold text-[#42520d]">AK</div>
              <div className="min-w-0">
                <p className="text-lg font-semibold">Aria Kim</p>
                <p className="text-sm text-white/55">@ariakim</p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-white/70">Building AgentKit, open-source agents teams actually ship to production.</p>
            <div className="mt-6 grid grid-cols-2 gap-3 border-t border-white/10 pt-6">
              {[
                ['Current build', 'AgentKit v2'],
                ['Category', 'AI agents'],
                ['Stage', 'Seed'],
                ['Traction', '4.2k GitHub stars'],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-white/40">{label}</p>
                  <p className="mt-1 text-sm font-medium text-white/85">{value}</p>
                </div>
              ))}
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

      <section className="mx-auto max-w-[92rem] border-t border-black/10 px-5 py-16 sm:px-8">
        <div className="pt-2">
          <p className="mb-12 text-sm font-semibold text-[#42520d]">What you unlock</p>
          <h2 className="max-w-4xl text-5xl font-normal leading-none tracking-[-0.045em] md:text-7xl" style={serifDisplay}>
            Build once. Become discoverable everywhere.
          </h2>
          <div className="mt-24 grid gap-10 md:grid-cols-4">
            {founderBenefits.map((benefit) => (
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
        <div className="flex min-h-[320px] items-center overflow-hidden rounded-[32px] bg-[#1c1c1a] px-8 py-14 text-white md:min-h-[420px] md:px-16">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#bcd99a]">The shift</p>
            <h2 className="mt-5 max-w-4xl text-4xl font-normal leading-[1.05] tracking-[-0.04em] md:text-6xl" style={serifDisplay}>
              Your GitHub is a better pitch than your network.
            </h2>
            <p className="mt-6 max-w-xl text-base leading-7 text-white/55">
              Apparent reads the evidence you already have and puts it in front of the investors it actually fits.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-[92rem] border-t border-black/10 px-5 py-16 sm:px-8 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="flex min-h-[420px] items-center overflow-hidden rounded-[32px] bg-[#42520d] p-10 text-white lg:min-h-[520px] lg:rounded-r-none lg:p-14">
          <blockquote className="max-w-md text-3xl font-normal leading-tight tracking-[-0.03em] md:text-4xl" style={serifDisplay}>
            “Your work should speak before your network does.”
          </blockquote>
        </div>
        <div className="bg-[#fbfaf7] px-0 py-10 lg:px-14 lg:py-16">
          <p className="text-sm font-semibold text-[#42520d]">From profile to deal</p>
          <div className="mt-8 grid gap-6">
            {[
              ['Launch', 'List products, metrics, links, and proof for each build.'],
              ['Match', 'See investors ranked by thesis fit and founder signal.'],
              ['Message', 'Start DMs with context already attached to your profile.'],
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
          <Map className="mx-auto mb-10 h-6 w-6 text-[#02A070]" />
          <h2 className="mx-auto max-w-3xl text-5xl font-normal leading-none tracking-[-0.045em] md:text-7xl" style={serifDisplay}>
            Put your proof where capital can find it.
          </h2>
          <p className="mx-auto mt-8 max-w-2xl text-base leading-8 text-black/55">
            Create the founder workspace, save your launches, and let Apparent turn your work into signal.
          </p>
          <button
            type="button"
            onClick={() => navigate('/login?role=founder')}
            className="mt-10 rounded-full bg-[#dcefc7] px-8 py-3 text-sm font-semibold text-black hover:bg-[#cce8ae]"
          >
            Create founder profile
          </button>
        </div>
      </section>
    </main>
  );
};
