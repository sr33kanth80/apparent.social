import { ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AldenPublicNavbar } from '../components/AldenPublicNavbar';
import { useReveal } from '../lib/useReveal';

const serifDisplay = {
  fontFamily: "'Source Serif 4', ui-serif, Georgia, 'Times New Roman', serif",
};

type IllustrationVariant = 'proof' | 'fit' | 'radar' | 'outreach' | 'dealFlow';

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

const founderProof = ['Launch', 'Traction', 'Customers', 'Product', 'Ask'];
const fitLabels = ['Founder', 'Proof', 'Investor', 'Thesis', 'Fit'];

const ink = '#28262a';
const sage = '#c8dfaa';
const sky = '#97cde5';
const cream = '#fbfaf7';
const coral = '#dd7a1e';

const Mascot = ({ x, y, scale = 1, flip = false }: { x: number; y: number; scale?: number; flip?: boolean }) => (
  <g transform={`translate(${x} ${y}) scale(${flip ? -scale : scale} ${scale})`}>
    <path
      d="M64 8c28 2 47 24 47 58 0 44-23 73-57 73-32 0-52-29-52-70C2 32 28 6 64 8Z"
      fill="#fffdf7"
      stroke={ink}
      strokeWidth="6"
      strokeLinejoin="round"
    />
    <path d="M20 52c13-10 31-14 52-12 14 1 27 5 38 13" fill="none" stroke={sage} strokeWidth="13" strokeLinecap="round" />
    <path d="M28 99c22 15 46 16 72 2" fill="none" stroke={sky} strokeWidth="10" strokeLinecap="round" />
    <circle cx="48" cy="62" r="5.5" fill={ink} />
    <circle cx="76" cy="62" r="5.5" fill={ink} />
    <path d="M53 84c8 7 18 7 27 0" fill="none" stroke={ink} strokeWidth="4.5" strokeLinecap="round" />
    <path d="M8 86c-16 8-22 20-18 36" fill="none" stroke={ink} strokeWidth="5" strokeLinecap="round" />
    <path d="M111 88c17 6 25 17 24 32" fill="none" stroke={ink} strokeWidth="5" strokeLinecap="round" />
    <path d="M29 140c-8 13-19 19-33 18" fill="none" stroke={ink} strokeWidth="5" strokeLinecap="round" />
    <path d="M86 141c7 13 18 20 33 20" fill="none" stroke={ink} strokeWidth="5" strokeLinecap="round" />
  </g>
);

const HandLabel = ({
  x,
  y,
  children,
  size = 24,
  color = ink,
  anchor = 'middle',
}: {
  x: number;
  y: number;
  children: string;
  size?: number;
  color?: string;
  anchor?: 'start' | 'middle' | 'end';
}) => (
  <text
    x={x}
    y={y}
    fill={color}
    fontFamily="Inter, ui-sans-serif, system-ui"
    fontSize={size}
    fontWeight="700"
    letterSpacing="-0.02em"
    textAnchor={anchor}
  >
    {children}
  </text>
);

const MiniCard = ({
  x,
  y,
  w,
  h,
  label,
  fill = '#ffffff',
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  fill?: string;
}) => (
  <g>
    <rect x={x} y={y} width={w} height={h} rx="18" fill={fill} stroke={ink} strokeWidth="4" />
    <HandLabel x={x + 22} y={y + 35} size={21} anchor="start">
      {label}
    </HandLabel>
    <path d={`M${x + 24} ${y + h - 26}c28-11 53-8 78-1 16 4 33 4 52-4`} fill="none" stroke={sky} strokeWidth="5" strokeLinecap="round" />
  </g>
);

const ProofIllustration = () => (
  <svg className="h-full w-full" viewBox="0 0 960 540" role="img" aria-label="Proof Profile illustration with launch, traction, customers, product, and ask labels.">
    <rect width="960" height="540" rx="42" fill="#ffffff" />
    <HandLabel x={480} y={78} size={48}>
      Proof Profile
    </HandLabel>
    <Mascot x={94} y={236} scale={1.25} />
    <path d="M271 318c38-21 74-33 116-35" fill="none" stroke={coral} strokeWidth="5" strokeLinecap="round" strokeDasharray="12 16" />
    <g transform="translate(350 116)">
      {founderProof.map((label, index) => {
        const x = (index % 2) * 224;
        const y = Math.floor(index / 2) * 112;
        return <MiniCard key={label} x={x} y={y} w={190} h={84} label={label} fill={index === 4 ? '#fff8ee' : '#ffffff'} />;
      })}
      <path d="M255 96c33 25 58 57 73 97" fill="none" stroke={sage} strokeWidth="7" strokeLinecap="round" />
      <path d="M326 184l14 38-40-9" fill="none" stroke={sage} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
    </g>
    <HandLabel x={162} y={450} size={24} color={sky}>
      show the work
    </HandLabel>
  </svg>
);

const FitIllustration = () => (
  <svg className="h-full w-full" viewBox="0 0 960 540" role="img" aria-label="Thesis Fit illustration matching founder proof to investor thesis.">
    <rect width="960" height="540" rx="42" fill="#ffffff" />
    <HandLabel x={480} y={78} size={50}>
      Thesis Fit
    </HandLabel>
    <rect x="96" y="142" width="240" height="230" rx="28" fill={cream} stroke={ink} strokeWidth="5" />
    <rect x="624" y="142" width="240" height="230" rx="28" fill={cream} stroke={ink} strokeWidth="5" />
    <HandLabel x={216} y={197} size={31}>
      Founder
    </HandLabel>
    <HandLabel x={216} y={246} size={26} color={sky}>
      Proof
    </HandLabel>
    <HandLabel x={744} y={197} size={31}>
      Investor
    </HandLabel>
    <HandLabel x={744} y={246} size={26} color={sky}>
      Thesis
    </HandLabel>
    <path d="M164 296h100M164 329h128" stroke={ink} strokeWidth="4" strokeLinecap="round" />
    <path d="M684 296h120M684 329h96" stroke={ink} strokeWidth="4" strokeLinecap="round" />
    <path d="M340 254c74-50 166-51 279 0" fill="none" stroke={sage} strokeWidth="10" strokeLinecap="round" />
    <path d="M340 309c74 48 165 49 278-1" fill="none" stroke={sky} strokeWidth="10" strokeLinecap="round" />
    <circle cx="480" cy="282" r="74" fill="#fff8ee" stroke={ink} strokeWidth="5" />
    <HandLabel x={480} y={294} size={36} color={coral}>
      Fit
    </HandLabel>
    <Mascot x={423} y={350} scale={0.94} />
    <g>
      {fitLabels.map((label, index) => (
        <HandLabel key={label} x={184 + index * 148} y={456} size={21} color={index === 4 ? coral : ink}>
          {label}
        </HandLabel>
      ))}
    </g>
  </svg>
);

const RadarIllustration = () => {
  const nodes = [
    [210, 206, sage],
    [302, 166, sky],
    [394, 236, coral],
    [470, 186, sage],
    [548, 277, coral],
    [650, 214, sky],
    [718, 310, sage],
    [268, 334, sky],
    [436, 356, sage],
    [615, 374, coral],
  ];

  return (
    <svg className="h-full w-full" viewBox="0 0 960 540" role="img" aria-label="Builder Radar illustration with Heat Map, Hot Fit, Rising, Thesis Match, and Next labels.">
      <rect width="960" height="540" rx="42" fill="#ffffff" />
      <HandLabel x={480} y={78} size={50}>
        Builder Radar
      </HandLabel>
      <HandLabel x={155} y={140} size={24} color={sky}>
        Heat Map
      </HandLabel>
      <path d="M148 254c52-81 149-125 291-132 154-8 274 38 360 138" fill="none" stroke={sage} strokeWidth="24" strokeLinecap="round" opacity="0.5" />
      <path d="M172 332c92-52 200-72 323-61 114 10 203 47 268 109" fill="none" stroke={sky} strokeWidth="18" strokeLinecap="round" opacity="0.42" />
      <path d="M127 415h708M127 415c45-47 86-80 124-99 52-27 101-32 147-14 67 26 112 17 162-49 38-49 83-65 135-47 36 13 77 43 123 91" fill="none" stroke={ink} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      {nodes.map(([cx, cy, fill], index) => (
        <g key={`${cx}-${cy}`}>
          <circle cx={cx} cy={cy} r={index === 2 || index === 5 ? 20 : 14} fill={fill as string} stroke={ink} strokeWidth="4" />
          {(index === 2 || index === 5) && <circle cx={cx} cy={cy} r="34" fill="none" stroke={coral} strokeWidth="4" opacity="0.45" />}
        </g>
      ))}
      <rect x="646" y="132" width="190" height="92" rx="22" fill={cream} stroke={ink} strokeWidth="4" />
      <HandLabel x={741} y={168} size={22} color={coral}>
        Hot Fit
      </HandLabel>
      <HandLabel x={741} y={199} size={18}>
        Thesis Match
      </HandLabel>
      <Mascot x={96} y={318} scale={1.08} />
      <path d="M228 352c57-24 111-59 162-105" fill="none" stroke={coral} strokeWidth="5" strokeLinecap="round" />
      <HandLabel x={396} y={474} size={22} color={sky}>
        Rising
      </HandLabel>
      <HandLabel x={746} y={474} size={22} color={coral}>
        Next
      </HandLabel>
    </svg>
  );
};

const OutreachIllustration = () => (
  <svg className="h-full w-full" viewBox="0 0 960 540" role="img" aria-label="Smart Outreach illustration showing proof, context, draft, personalized, and send labels.">
    <rect width="960" height="540" rx="42" fill="#ffffff" />
    <HandLabel x={480} y={78} size={50}>
      Smart Outreach
    </HandLabel>
    <rect x="118" y="146" width="284" height="265" rx="30" fill={cream} stroke={ink} strokeWidth="5" />
    <HandLabel x={180} y={195} size={25} anchor="start" color={sky}>
      Proof
    </HandLabel>
    <HandLabel x={180} y={238} size={25} anchor="start">
      Context
    </HandLabel>
    <path d="M177 285h168M177 324h136M177 363h188" stroke={ink} strokeWidth="5" strokeLinecap="round" />
    <rect x="525" y="148" width="302" height="235" rx="32" fill="#ffffff" stroke={ink} strokeWidth="5" />
    <HandLabel x={588} y={198} size={28} anchor="start">
      Draft
    </HandLabel>
    <HandLabel x={588} y={242} size={22} anchor="start" color={sky}>
      Why this fits
    </HandLabel>
    <path d="M590 285h172M590 322h136" stroke={ink} strokeWidth="5" strokeLinecap="round" />
    <path d="M712 350l84-24-28 71-16-35-40 25Z" fill={sage} stroke={ink} strokeWidth="4" strokeLinejoin="round" />
    <HandLabel x={790} y={444} size={24} color={coral}>
      Send
    </HandLabel>
    <path d="M405 275c44-27 78-30 117-11" fill="none" stroke={coral} strokeWidth="5" strokeLinecap="round" strokeDasharray="13 15" />
    <HandLabel x={473} y={229} size={22} color={coral}>
      Personalized
    </HandLabel>
    <Mascot x={401} y={337} scale={1.0} />
  </svg>
);

const DealFlowIllustration = () => (
  <svg className="h-full w-full" viewBox="0 0 960 540" role="img" aria-label="Deal Flow illustration with new, review, shortlist, thesis fit, context, priority, and top match labels.">
    <rect width="960" height="540" rx="42" fill="#ffffff" />
    <HandLabel x={480} y={78} size={50}>
      Deal Flow
    </HandLabel>
    {[118, 365, 612].map((x, index) => (
      <g key={x}>
        <rect x={x} y="140" width="208" height="270" rx="28" fill={cream} stroke={ink} strokeWidth="5" />
        <HandLabel x={x + 104} y={188} size={26} color={index === 2 ? coral : ink}>
          {['New', 'Review', 'Shortlist'][index]}
        </HandLabel>
        <rect x={x + 32} y="226" width="144" height="58" rx="16" fill="#ffffff" stroke={ink} strokeWidth="4" />
        <rect x={x + 32} y="306" width="144" height="58" rx="16" fill={index === 2 ? sage : '#ffffff'} stroke={ink} strokeWidth="4" />
      </g>
    ))}
    <path d="M321 275h44M568 275h44" stroke={coral} strokeWidth="7" strokeLinecap="round" />
    <path d="M351 255l27 20-27 20M598 255l27 20-27 20" fill="none" stroke={coral} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
    <HandLabel x={437} y={458} size={23} color={sky}>
      Context
    </HandLabel>
    <HandLabel x={602} y={458} size={23} color={coral}>
      Priority
    </HandLabel>
    <HandLabel x={716} y={344} size={21}>
      Top Match
    </HandLabel>
    <HandLabel x={716} y={263} size={20} color={sky}>
      Thesis Fit
    </HandLabel>
    <Mascot x={405} y={328} scale={0.98} />
  </svg>
);

const ThesisIllustration = ({ variant }: { variant: IllustrationVariant }) => {
  const className = 'aspect-video w-full';

  return (
    <div className="overflow-hidden rounded-[30px] border border-black/5 bg-white p-2 shadow-none">
      <div className={className}>
        {variant === 'proof' && <ProofIllustration />}
        {variant === 'fit' && <FitIllustration />}
        {variant === 'radar' && <RadarIllustration />}
        {variant === 'outreach' && <OutreachIllustration />}
        {variant === 'dealFlow' && <DealFlowIllustration />}
      </div>
    </div>
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

        <ThesisIllustration variant="proof" />
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
