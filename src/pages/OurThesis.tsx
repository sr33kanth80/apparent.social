import { ArrowUpRight, CheckCircle2, MapPin, MessageCircle, Search, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AldenPublicNavbar } from '../components/AldenPublicNavbar';
import { useReveal } from '../lib/useReveal';

const serifDisplay = {
  fontFamily: "'Source Serif 4', ui-serif, Georgia, 'Times New Roman', serif",
};

const steps = [
  ['01', 'Founder adds proof', 'Products, GitHub, traction, launch links, pitch video, deck, and raise context go into one profile.'],
  ['02', 'Investor adds thesis', 'Stage, sector, geography, check size, founder signals, and pass signals become sourcing criteria.'],
  ['03', 'Apparent compares both', 'The system ranks founder profiles by fit, freshness, proof quality, and location signal.'],
  ['04', 'The right intro starts', 'Both sides get the reason for the match, then move into messages, saved builders, and deal flow.'],
];

const founderBullets = [
  'Create a founder profile or run npx apparent.',
  'Connect proof: code, products, traction, pitch materials, and current raise.',
  'Let your founder agent find investors whose thesis actually fits.',
];

const investorBullets = [
  'Create an investor profile and describe what you fund.',
  'Review ranked founders with the proof and fit reason attached.',
  'Save, message, map, and move promising builders through your pipeline.',
];

const surfaces = [
  {
    title: 'Heat Map',
    icon: MapPin,
    text: 'See where relevant builders and VC contacts cluster by place.',
  },
  {
    title: 'Fit-ranked search',
    icon: Search,
    text: 'Find founders or investors by thesis, proof, stage, geography, and freshness.',
  },
  {
    title: 'Contextual messages',
    icon: MessageCircle,
    text: 'Start outreach from the actual match reason, not a generic cold template.',
  },
];

const ApparentSketch = () => (
  <div className="rounded-[36px] border border-black/5 bg-white p-4 sm:p-6">
    <svg
      viewBox="0 0 960 540"
      role="img"
      aria-label="A simple sketch showing founder proof and investor thesis flowing through Apparent into a useful match."
      className="aspect-video w-full"
    >
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#dd7a1e" />
        </marker>
      </defs>

      <rect width="960" height="540" rx="34" fill="#ffffff" />

      <g fill="none" stroke="#28262a" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M84 118c50-11 104-9 154 3 13 3 22 15 20 28l-18 118c-2 14-15 23-29 21-48-8-96-8-144 2-13 3-26-6-28-20L22 158c-2-14 7-27 21-30 14-3 28-6 41-10Z" />
        <path d="M128 90c43-8 88-6 132 5" />
        <path d="M70 172c42-9 86-8 132 3" />
        <path d="M76 213c36-7 74-6 113 3" />
        <path d="M697 117c50-11 104-9 154 3 13 3 22 15 20 28l-18 118c-2 14-15 23-29 21-48-8-96-8-144 2-13 3-26-6-28-20l-17-112c-2-14 7-27 21-30 14-3 27-6 41-10Z" />
        <path d="M734 172c42-9 86-8 132 3" />
        <path d="M740 213c36-7 74-6 113 3" />
        <path d="M345 142c47-10 98-9 149 0 17 3 29 18 27 36l-22 169c-2 17-17 29-34 27-49-7-98-7-147 0-17 2-32-10-34-27l-22-169c-2-18 10-33 27-36 18-3 37-3 56 0Z" />
        <path d="M326 205c46-9 95-9 143 0" />
        <path d="M323 260c49-9 100-9 151 0" />
        <path d="M331 316c38-6 77-6 116-1" />
        <path d="M328 415c78-24 162-25 244-2" />
        <path d="M585 379c50-5 99-1 149 13 16 4 25 21 20 37l-13 44c-5 16-21 25-37 21-51-12-102-13-153-1-16 4-32-6-36-22l-11-44c-4-16 6-32 22-36 20-5 40-9 59-12Z" />
      </g>

      <g fill="none" stroke="#dd7a1e" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" markerEnd="url(#arrow)">
        <path d="M252 232c39-17 75-24 116-18" />
        <path d="M615 228c-34-16-69-22-109-17" />
        <path d="M478 366c30 31 67 47 113 49" />
      </g>

      <g>
        <path
          d="M422 246c26 0 44 20 44 48 0 38-20 62-47 62-30 0-48-27-47-63 1-29 20-47 50-47Z"
          fill="#28262a"
        />
        <circle cx="408" cy="286" r="6" fill="#ffffff" />
        <circle cx="438" cy="286" r="6" fill="#ffffff" />
        <path d="M393 355c-9 23-19 39-33 50" fill="none" stroke="#28262a" strokeWidth="4" strokeLinecap="round" />
        <path d="M448 354c11 21 22 37 36 49" fill="none" stroke="#28262a" strokeWidth="4" strokeLinecap="round" />
        <path d="M370 303c-19-1-34 5-48 19" fill="none" stroke="#28262a" strokeWidth="4" strokeLinecap="round" />
        <path d="M464 306c17 2 32 10 44 24" fill="none" stroke="#28262a" strokeWidth="4" strokeLinecap="round" />
      </g>

      <g fontFamily="Inter, ui-sans-serif, system-ui" fontWeight="700" fill="#28262a">
        <text x="62" y="352" fontSize="31">Founder proof</text>
        <text x="675" y="352" fontSize="31">Investor thesis</text>
        <text x="342" y="126" fontSize="34">Apparent</text>
        <text x="548" y="455" fontSize="31">Fit + reason</text>
      </g>

      <g fontFamily="Inter, ui-sans-serif, system-ui" fontWeight="700" fontSize="21">
        <text x="78" y="154" fill="#317fb2">code</text>
        <text x="82" y="197" fill="#317fb2">traction</text>
        <text x="94" y="240" fill="#317fb2">pitch</text>
        <text x="716" y="154" fill="#317fb2">stage</text>
        <text x="720" y="197" fill="#317fb2">sector</text>
        <text x="735" y="240" fill="#317fb2">check</text>
        <text x="333" y="241" fill="#dd7a1e">compare</text>
        <text x="333" y="296" fill="#dd7a1e">rank</text>
        <text x="337" y="348" fill="#b23b3b">no spam</text>
      </g>
    </svg>
  </div>
);

const RoleCard = ({
  title,
  bullets,
  cta,
  ctaClassName = '',
  onClick,
}: {
  title: string;
  bullets: string[];
  cta: string;
  ctaClassName?: string;
  onClick: () => void;
}) => (
  <article className="rounded-[32px] border border-black/5 bg-white/75 p-7 sm:p-8">
    <h3 className="text-3xl font-normal tracking-[-0.035em]" style={serifDisplay}>
      {title}
    </h3>
    <ul className="mt-7 space-y-4">
      {bullets.map((bullet) => (
        <li key={bullet} className="flex gap-3 text-sm leading-6 text-black/65">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#28262a]" />
          <span>{bullet}</span>
        </li>
      ))}
    </ul>
    <button
      type="button"
      onClick={onClick}
      className={`mt-8 inline-flex items-center rounded-full bg-[#cfdaf5] px-5 py-3 text-sm font-semibold text-black transition-colors hover:bg-[#bcc8ef] ${ctaClassName}`}
    >
      {cta} <ArrowUpRight className="ml-1.5 h-4 w-4" />
    </button>
  </article>
);

export const OurThesis = () => {
  const navigate = useNavigate();
  useReveal();

  return (
    <main className="monad monad-page min-h-screen overflow-x-hidden bg-[#f6f3f1] text-black">
      <AldenPublicNavbar />

      <section data-reveal className="reveal mx-auto grid max-w-[92rem] gap-10 px-5 pb-12 pt-12 sm:px-8 md:pt-16 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div>
          <h1
            className="max-w-[52rem] text-[3.25rem] font-normal leading-[0.9] tracking-[-0.055em] sm:text-[5.5rem] md:text-[6.6rem]"
            style={serifDisplay}
          >
            How Apparent works.
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-8 text-black/65 md:text-xl">
            Founders put proof in. Investors put thesis in. Apparent compares both and helps the right conversation start.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => navigate('/login?role=founder')}
              className="rounded-full bg-[#cfdaf5] px-6 py-3 text-sm font-semibold text-black transition-colors hover:bg-[#bcc8ef]"
            >
              I am a founder
            </button>
            <button
              type="button"
              onClick={() => navigate('/login?role=investor')}
              className="alden-investor-cta rounded-full border border-black/10 bg-white px-6 py-3 text-sm font-semibold text-black transition-colors hover:bg-[#f6f3f1]"
            >
              I am an investor
            </button>
          </div>
        </div>

        <ApparentSketch />
      </section>

      <section id="how-to" data-reveal className="reveal mx-auto max-w-[92rem] border-t border-black/10 px-5 py-12 sm:px-8">
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {steps.map(([number, title, text]) => (
            <article key={title} className="rounded-[28px] border border-black/5 bg-white/70 p-6">
              <span className="text-sm font-semibold text-black/35">{number}</span>
              <h2 className="mt-8 text-2xl font-normal tracking-[-0.03em]" style={serifDisplay}>
                {title}
              </h2>
              <p className="mt-4 text-sm leading-6 text-black/60">{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section data-reveal className="reveal mx-auto grid max-w-[92rem] gap-5 border-t border-black/10 px-5 py-12 sm:px-8 lg:grid-cols-2">
        <RoleCard
          title="If you are a founder"
          bullets={founderBullets}
          cta="Create founder profile"
          onClick={() => navigate('/login?role=founder')}
        />
        <RoleCard
          title="If you are an investor"
          bullets={investorBullets}
          cta="Create investor profile"
          ctaClassName="alden-investor-cta"
          onClick={() => navigate('/login?role=investor')}
        />
      </section>

      <section data-reveal className="reveal mx-auto max-w-[92rem] border-t border-black/10 px-5 py-12 sm:px-8">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <h2 className="max-w-3xl text-5xl font-normal leading-none tracking-[-0.045em] md:text-7xl" style={serifDisplay}>
              The match does not stop at a score.
            </h2>
            <p className="mt-7 max-w-xl text-base leading-8 text-black/60">
              Apparent keeps the proof, thesis, location, message, and pipeline context attached so both sides know why the match exists.
            </p>
          </div>

          <div className="grid gap-4">
            {surfaces.map((surface) => (
              <article key={surface.title} className="grid gap-4 rounded-[24px] border border-black/5 bg-white/70 p-5 sm:grid-cols-[3rem_1fr]">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#cfdaf5] text-[#242424]">
                  <surface.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xl font-normal tracking-[-0.025em]" style={serifDisplay}>
                    {surface.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-black/60">{surface.text}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section data-reveal className="reveal mx-auto max-w-[92rem] border-t border-black/10 px-5 py-14 sm:px-8">
        <div className="grid gap-8 rounded-[36px] border border-black/5 bg-white/75 p-7 sm:p-10 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <Sparkles className="mb-6 h-5 w-5 text-[#28262a]" />
            <h2 className="max-w-3xl text-4xl font-normal leading-tight tracking-[-0.04em] md:text-6xl" style={serifDisplay}>
              Show the work. Declare the thesis. Let Apparent connect the fit.
            </h2>
          </div>
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="h-fit rounded-full bg-[#cfdaf5] px-6 py-3 text-sm font-semibold text-black transition-colors hover:bg-[#bcc8ef]"
          >
            Get started <ArrowUpRight className="ml-1 inline h-3.5 w-3.5 align-[-2px]" />
          </button>
        </div>
      </section>
    </main>
  );
};
