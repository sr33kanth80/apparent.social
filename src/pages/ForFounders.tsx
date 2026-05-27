import { ArrowUpRight, CheckCircle2, Map, Rocket, Search, Users } from 'lucide-react';
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
          find believers.
        </h1>
        <div className="mt-10 grid gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <p className="max-w-2xl text-lg leading-8 text-black/65 md:text-xl">
            Apparent gives builders a proof profile, product launch surface, network map, investor matching feed, DMs, and deal workflow without relying on warm intros.
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

        <div className="relative min-h-[520px] overflow-hidden rounded-[32px] bg-[#d8c7a3]">
          <img
            src="https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1400&q=85"
            alt="Workspace representing a founder proof profile"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-[#42520d]/10" />
          <div className="absolute bottom-6 left-6 right-6 rounded-[24px] bg-white/82 p-5 backdrop-blur">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold">Proof profile</p>
                <p className="mt-1 text-sm text-black/55">Launches, GitHub, traction, press, and location.</p>
              </div>
              <Rocket className="h-5 w-5 shrink-0 text-[#02A070]" />
            </div>
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
        <div className="h-[320px] overflow-hidden rounded-[32px] bg-[#d7d0c0] md:h-[420px]">
          <img
            src="https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1800&q=85"
            alt="Landscape representing nearby builder network"
            className="h-full w-full object-cover"
          />
        </div>
      </section>

      <section className="mx-auto grid max-w-[92rem] border-t border-black/10 px-5 py-16 sm:px-8 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="min-h-[580px] overflow-hidden rounded-[32px] bg-[#d8c7a3] lg:rounded-r-none">
          <img
            src="https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=1400&q=85"
            alt="Architectural forms representing structured founder proof"
            className="h-full w-full object-cover"
          />
        </div>
        <div className="bg-[#fbfaf7] px-0 py-10 lg:px-14 lg:py-16">
          <blockquote className="max-w-3xl text-4xl font-normal leading-tight tracking-[-0.04em] md:text-5xl" style={serifDisplay}>
            “Your work should speak before your network does.”
          </blockquote>
          <div className="mt-12 grid gap-6">
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
