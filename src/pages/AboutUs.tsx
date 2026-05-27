import { ArrowUpRight, CircleDot, Globe2, MapPin, Radar, Search, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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

export const AboutUs = () => {
  const navigate = useNavigate();

  return (
    <main className="overflow-x-hidden bg-[#fbfaf7] text-black">
      <section className="mx-auto max-w-[92rem] px-5 pb-14 pt-14 sm:px-8 md:pt-20">
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

      <section className="mx-auto grid max-w-[92rem] gap-8 border-t border-black/10 px-5 py-14 sm:px-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-stretch">
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

        <div className="relative min-h-[520px] overflow-hidden rounded-[32px] bg-[#d8c7a3]">
          <img
            src="https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1400&q=85"
            alt="Warm workspace representing visible structure"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-[#42520d]/10" />
          <div className="absolute bottom-6 left-6 right-6 rounded-[24px] bg-white/82 p-5 backdrop-blur">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold">Network signal</p>
                <p className="mt-1 text-sm text-black/55">Proof, place, thesis, and timing in one view.</p>
              </div>
              <MapPin className="h-5 w-5 shrink-0 text-[#02A070]" />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[92rem] border-t border-black/10 px-5 py-16 sm:px-8">
        <div className="pt-2">
          <p className="mb-12 text-sm font-semibold text-[#42520d]">Operating principles</p>
          <h2 className="max-w-4xl text-5xl font-normal leading-none tracking-[-0.045em] md:text-7xl" style={serifDisplay}>
            We are rebuilding discovery around work.
          </h2>
          <div className="mt-24 grid gap-10 md:grid-cols-4">
            {values.map((value) => (
              <article key={value.title} className="pt-1">
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

      <section className="mx-auto grid max-w-[92rem] border-t border-black/10 px-5 py-16 sm:px-8 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="min-h-[580px] overflow-hidden rounded-[32px] bg-[#d7d0c0] lg:rounded-r-none">
          <img
            src="https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1400&q=85"
            alt="Open terrain representing an expanding builder network"
            className="h-full w-full object-cover"
          />
        </div>
        <div className="bg-[#fbfaf7] px-0 py-10 lg:px-14 lg:py-16">
          <blockquote className="max-w-3xl text-4xl font-normal leading-tight tracking-[-0.04em] md:text-5xl" style={serifDisplay}>
            “The best early companies are visible before they are famous. Apparent is designed for that exact window.”
          </blockquote>
          <div className="mt-12">
            <p className="text-sm font-semibold">Apparent thesis</p>
            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#42520d]">Proof before consensus</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[92rem] border-t border-black/10 px-5 py-20 sm:px-8">
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
