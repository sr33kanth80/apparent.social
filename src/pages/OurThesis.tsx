import { ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AldenPublicNavbar } from '../components/AldenPublicNavbar';
import { useReveal } from '../lib/useReveal';

const serifDisplay = {
  fontFamily: "'Source Serif 4', ui-serif, Georgia, 'Times New Roman', serif",
};

type IllustrationVariant = 'proof' | 'fit' | 'radar' | 'outreach' | 'dealFlow';

const illustrations: Record<IllustrationVariant, { src: string; alt: string }> = {
  proof: {
    src: '/assets/illustrations/our-thesis-proof-profile.png',
    alt: 'Proof Profile illustration showing launch, traction, customers, product, and ask proof blocks.',
  },
  fit: {
    src: '/assets/illustrations/our-thesis-thesis-fit.png',
    alt: 'Thesis Fit illustration showing founder proof matched with investor thesis.',
  },
  radar: {
    src: '/assets/illustrations/our-thesis-builder-radar.png',
    alt: 'Builder Radar illustration showing a heat map of emerging founder investor fit.',
  },
  outreach: {
    src: '/assets/illustrations/our-thesis-smart-outreach.png',
    alt: 'Smart Outreach illustration showing proof and context becoming a personalized draft.',
  },
  dealFlow: {
    src: '/assets/illustrations/our-thesis-deal-flow.png',
    alt: 'Deal Flow illustration showing new, review, shortlist, context, priority, and thesis fit.',
  },
};

const walkthrough: Array<{
  number: string;
  title: string;
  text: string;
  variant: IllustrationVariant;
}> = [
  {
    number: '01',
    title: 'Create a Proof Profile',
    text: 'Founders put the useful evidence in one place: launch, traction, customers, product, GitHub, pitch, and the current ask.',
    variant: 'proof',
  },
  {
    number: '02',
    title: 'Match it to thesis',
    text: 'Investors define what they actually fund. Apparent compares that thesis to founder proof, stage, category, geography, and timing.',
    variant: 'fit',
  },
  {
    number: '03',
    title: 'See where builders are moving',
    text: 'Builder Radar turns founder density and investor context into a map, so discovery is grounded in place instead of noise.',
    variant: 'radar',
  },
  {
    number: '04',
    title: 'Start outreach with context',
    text: 'The agent drafts from the actual reason for fit, so messages feel specific, useful, and tied to proof.',
    variant: 'outreach',
  },
  {
    number: '05',
    title: 'Move fit into deal flow',
    text: 'Investors can save, review, prioritize, and follow up with builders without losing the proof that made the match matter.',
    variant: 'dealFlow',
  },
];

const ThesisIllustration = ({ variant, priority = false }: { variant: IllustrationVariant; priority?: boolean }) => {
  const illustration = illustrations[variant];

  return (
    <figure className="overflow-hidden rounded-[30px] border border-black/5 bg-white p-2 shadow-none">
      <img
        src={illustration.src}
        alt={illustration.alt}
        className="aspect-video h-auto w-full rounded-[24px] object-contain"
        loading={priority ? 'eager' : 'lazy'}
        decoding={priority ? 'sync' : 'async'}
      />
    </figure>
  );
};

export const OurThesis = () => {
  const navigate = useNavigate();
  useReveal();

  return (
    <main className="monad monad-page min-h-screen overflow-x-hidden bg-[#f6f3f1] text-black">
      <AldenPublicNavbar />

      <section data-reveal className="reveal mx-auto grid max-w-[92rem] gap-8 px-5 pb-10 pt-12 sm:px-8 md:pt-16 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
        <div>
          <h1
            className="max-w-[52rem] text-[3.2rem] font-normal leading-[0.9] tracking-[-0.055em] sm:text-[5.4rem] md:text-[6.4rem]"
            style={serifDisplay}
          >
            How Apparent works.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-black/65 md:text-xl">
            Apparent turns founder proof and investor thesis into a usable match: profile, fit reason, map context,
            outreach, and deal flow.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
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
              className="alden-investor-cta rounded-full border border-black/10 bg-white px-6 py-3 text-sm font-semibold text-black transition-colors"
            >
              I am an investor
            </button>
          </div>
        </div>

        <ThesisIllustration variant="proof" priority />
      </section>

      <section data-reveal className="reveal mx-auto max-w-[92rem] border-t border-black/10 px-5 py-10 sm:px-8">
        <div className="max-w-4xl">
          <h2 className="text-5xl font-normal leading-none tracking-[-0.045em] md:text-7xl" style={serifDisplay}>
            Five pieces, one fundraising workflow.
          </h2>
          <p className="mt-6 max-w-2xl text-base leading-7 text-black/60">
            The product is not just a directory. Apparent keeps the evidence, thesis, geography, message, and pipeline
            connected from the first match to the next step.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-[92rem] px-5 pb-10 sm:px-8">
        <div className="grid gap-5">
          {walkthrough.map((step, index) => (
            <article
              key={step.title}
              data-reveal
              className="reveal grid gap-6 border-t border-black/10 py-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-center lg:gap-10"
              style={{ transitionDelay: `${Math.min(index * 70, 240)}ms` }}
            >
              <div>
                <span className="text-sm font-semibold text-black/35">{step.number}</span>
                <h3 className="mt-4 text-4xl font-normal leading-none tracking-[-0.04em] md:text-6xl" style={serifDisplay}>
                  {step.title}
                </h3>
                <p className="mt-5 max-w-xl text-base leading-7 text-black/60">{step.text}</p>
              </div>
              <ThesisIllustration variant={step.variant} />
            </article>
          ))}
        </div>
      </section>

      <section data-reveal className="reveal mx-auto max-w-[92rem] border-t border-black/10 px-5 py-12 sm:px-8">
        <div className="grid gap-8 rounded-[34px] border border-black/5 bg-white p-7 sm:p-9 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <h2 className="max-w-3xl text-4xl font-normal leading-tight tracking-[-0.04em] md:text-6xl" style={serifDisplay}>
              Show the work. Declare the thesis. Let Apparent connect the fit.
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-7 text-black/60">
              Start with the side of the marketplace you are on. Apparent keeps the rest of the workflow attached.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
            <button
              type="button"
              onClick={() => navigate('/login?role=founder')}
              className="h-fit rounded-full bg-[#cfdaf5] px-6 py-3 text-sm font-semibold text-black transition-colors hover:bg-[#bcc8ef]"
            >
              Start as founder <ArrowUpRight className="ml-1 inline h-3.5 w-3.5 align-[-2px]" />
            </button>
            <button
              type="button"
              onClick={() => navigate('/login?role=investor')}
              className="alden-investor-cta h-fit rounded-full px-6 py-3 text-sm font-semibold text-black transition-colors"
            >
              Start as investor <ArrowUpRight className="ml-1 inline h-3.5 w-3.5 align-[-2px]" />
            </button>
          </div>
        </div>
      </section>
    </main>
  );
};
