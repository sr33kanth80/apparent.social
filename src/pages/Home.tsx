import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowUpRight, Check, MapPin, Radar, Send, Sparkles, Zap } from 'lucide-react';
import { EditorialNavbar } from '../components/EditorialNavbar';
import { LogoIcon } from '../components/LogoIcon';
import { LogoCloud } from '../components/logo-cloud';
import { signupForWaitlist, type WaitlistRole } from '../lib/waitlist-service';
import { HeatMap } from './HeatMap';

const serifDisplay = {
  fontFamily: 'Georgia, "Times New Roman", serif',
};

// Recognizable funds for the hero trust pill. Logos come from the favicon
// service already used for launch logos, so they stay reliable (no hotlinking).
const heroInvestors: { name: string; domain: string }[] = [
  { name: 'Y Combinator', domain: 'ycombinator.com' },
  { name: 'Sequoia Capital', domain: 'sequoiacap.com' },
  { name: 'Andreessen Horowitz', domain: 'a16z.com' },
  { name: 'Accel', domain: 'accel.com' },
  { name: 'Antler', domain: 'antler.co' },
];

export const Home = () => {
  const navigate = useNavigate();

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#fbfaf7] text-black">
      <EditorialNavbar />

      {/* HERO — founder-led: state what Apparent is and the wedge in one breath. */}
      <section className="mx-auto max-w-[78rem] px-5 pb-6 pt-10 sm:px-8 md:pt-16">
        <div className="mb-6 flex justify-center">
          <div className="inline-flex items-center gap-2.5 rounded-full border border-black/10 bg-white/80 py-1.5 pl-2 pr-4 text-xs font-semibold text-[#42520d] shadow-[0_4px_14px_rgba(0,0,0,0.05)]">
            <div className="flex items-center">
              {heroInvestors.map((investor, index) => (
                <img
                  key={investor.domain}
                  src={`https://www.google.com/s2/favicons?domain=${investor.domain}&sz=128`}
                  alt={investor.name}
                  title={investor.name}
                  className={`h-7 w-7 rounded-full border-2 border-white bg-white object-contain p-0.5 ${index > 0 ? '-ml-2.5' : ''}`}
                />
              ))}
            </div>
            <span>1,800+ investors mapped</span>
          </div>
        </div>
        <div className="flex flex-col items-center text-center">
          <h1
            className="max-w-3xl text-4xl font-normal leading-[1.15] tracking-[-0.04em] md:text-5xl lg:max-w-none lg:whitespace-nowrap xl:text-6xl"
            style={serifDisplay}
          >
            <span className="pz pz-light pz-end-l pz-knob-r" style={{ zIndex: 4 }}>Find<i className="pz-nub pz-nub-b" /></span><span className="pz pz-olive pz-socket-l pz-knob-r pz-drop" style={{ zIndex: 3 }}>investors<i className="pz-nub pz-nub-t" /></span><span className="pz pz-light pz-socket-l pz-knob-r" style={{ zIndex: 2 }}>who actually<i className="pz-nub pz-nub-b" /></span><span className="pz pz-olive pz-socket-l pz-end-r pz-slide" style={{ zIndex: 1 }}>fit.<i className="pz-nub pz-nub-t" /></span>
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-black/65 md:text-lg">
            Apparent matches founders and investors by thesis, stage, and sector.
            <br />
            Founders reach the funds that back what they&apos;re building. Investors meet the founders who fit their thesis.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/login?role=founder')}
              className="inline-flex items-center gap-2 rounded-full bg-[#dcefc7] px-6 py-3 text-sm font-semibold text-black transition-colors hover:bg-[#cce8ae]"
            >
              I&apos;m a founder <ArrowUpRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => navigate('/login?role=investor')}
              className="inline-flex items-center gap-2 rounded-full bg-[#42520d] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#34420a]"
            >
              I&apos;m an investor
            </button>
          </div>
        </div>
      </section>

      <LogoCloud />

      <WaitlistSection />

      {/* HEATMAP MAGNET — the free front door, mirrors OpenVC's investor list but alive. */}
      <section className="mx-auto max-w-[78rem] px-5 pb-12 sm:px-8">
        <div className="mb-4 flex justify-end">
          <Link
            to="/heat-map"
            className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-5 py-2.5 text-sm font-semibold text-black shadow-[0_8px_24px_rgba(0,0,0,0.08)] transition-all duration-200 hover:scale-[1.01] hover:border-black hover:bg-black hover:text-white"
          >
            Open the full map <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="relative flex h-[clamp(360px,56vh,560px)] overflow-hidden rounded-[26px] border border-black/10 bg-[#e8e5dc] shadow-[0_18px_60px_rgba(0,0,0,0.08)]">
          <HeatMap includeVCContacts vcOnly fullBleed fillParent lockContacts />
        </div>
      </section>

      {/* WHO IT'S FOR — the section that makes a stranger self-identify in 5 seconds. */}
      <section className="mx-auto max-w-[78rem] border-t border-black/10 px-5 py-12 sm:px-8">
        <h2 className="max-w-2xl text-3xl font-normal leading-tight tracking-[-0.035em] md:text-4xl" style={serifDisplay}>
          One map. Two sides of the table.
        </h2>
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {/* Founders */}
          <div className="flex flex-col rounded-[24px] border border-black/10 bg-white/70 p-7">
            <LogoIcon className="h-6 w-6 text-[#42520d]" />
            <h3 className="mt-5 text-2xl font-semibold tracking-[-0.02em]">Reach the investors who fit your raise.</h3>
            <ul className="mt-5 grid gap-3 text-sm leading-6 text-black/65">
              {[
                'Match to funds by thesis, stage, and sector, not a generic list of thousands.',
                'See which investors fit your raise and which are already tracking you.',
                'Flip on “raising now” so the right funds know you’re open, and approach them with context.',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#42520d]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => navigate('/login?role=founder')}
              className="mt-7 inline-flex w-fit items-center gap-2 rounded-full bg-[#dcefc7] px-5 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-[#cce8ae]"
            >
              Create founder profile <ArrowUpRight className="h-4 w-4" />
            </button>
          </div>

          {/* Investors */}
          <div className="flex flex-col rounded-[24px] bg-[#1c1c1a] p-7 text-white">
            <LogoIcon className="h-6 w-6 text-[#bcd99a]" />
            <h3 className="mt-5 text-2xl font-semibold tracking-[-0.02em]">Meet the founders who fit your thesis.</h3>
            <ul className="mt-5 grid gap-3 text-sm leading-6 text-white/70">
              {[
                'A live map of builders who fit your stage, sector, and geography.',
                'Filter by thesis fit and who’s raising right now, not a static directory.',
                'Approach the founders who actually fit, the moment the signal is fresh.',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#bcd99a]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => navigate('/login?role=investor')}
              className="mt-7 inline-flex w-fit items-center gap-2 rounded-full bg-[#42520d] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#34420a]"
            >
              Create investor profile <ArrowUpRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      {/* THE WEDGE — fit beats volume, on both sides. */}
      <section className="mx-auto max-w-[78rem] border-t border-black/10 px-5 py-12 sm:px-8">
        <div className="grid gap-8 md:grid-cols-2 md:items-center">
          <div>
            <h2 className="max-w-xl text-3xl font-normal leading-tight tracking-[-0.035em] md:text-4xl" style={serifDisplay}>
              The right match beats a hundred wrong ones.
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-black/60">
              A generic list of thousands wastes everyone&apos;s time. Apparent matches founders
              and investors on thesis, stage, and sector first, so the conversations that happen
              are the ones that should.
            </p>
          </div>
          <div className="grid gap-3">
            <div className="rounded-[18px] border border-black/10 bg-white/50 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-black/35">The old way</p>
              <p className="mt-2 text-sm leading-6 text-black/55">
                Work a list of thousands. Guess at fit. Hope something sticks.
              </p>
            </div>
            <div className="rounded-[18px] border border-[#42520d]/20 bg-[#dcefc7]/40 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#42520d]">On Apparent</p>
              <p className="mt-2 text-sm leading-6 text-black/65">
                Match on thesis and stage. Talk to the few who fit. Skip the rest.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS — the two-sided loop. */}
      <section id="how-to" className="mx-auto max-w-[78rem] border-t border-black/10 px-5 py-10 sm:px-8">
        <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div>
            <h2 className="max-w-xl text-3xl font-normal leading-tight tracking-[-0.035em] md:text-4xl" style={serifDisplay}>
              Show up. Match on fit. Connect.
            </h2>
          </div>
          <ol className="grid gap-x-6 gap-y-8 sm:grid-cols-3">
            {[
              { icon: Zap, title: 'Show your work', text: 'Launches, commits, and traction become a profile that proves itself.' },
              { icon: Radar, title: 'Match on fit', text: 'See the investors whose thesis, stage, and sector actually fit your raise.' },
              { icon: Send, title: 'Start the right conversation', text: 'Approach the funds that fit, or signal you’re raising and let them come to you.' },
            ].map((item, i) => (
              <li key={item.title} className="border-t border-black/10 pt-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-normal leading-none tracking-[-0.04em] text-[#42520d] tabular-nums" style={serifDisplay}>
                    0{i + 1}
                  </span>
                  <item.icon className="h-4 w-4 text-black/30" />
                </div>
                <h3 className="mt-4 text-base font-semibold tracking-[-0.015em]">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-black/55">{item.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-[78rem] border-t border-black/10 px-5 py-12 sm:px-8">
        <div className="grid gap-6 rounded-[26px] bg-white/65 p-6 text-left md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <MapPin className="mb-5 h-5 w-5 text-[#42520d]" />
            <h2 className="max-w-2xl text-3xl font-normal leading-tight tracking-[-0.035em] md:text-4xl" style={serifDisplay}>
              Find your fit.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-black/55">
              Founders find the investors who fit their raise. Investors find the founders who fit their thesis. Pick your side and start in under a minute.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row md:flex-col">
            <button
              type="button"
              onClick={() => navigate('/login?role=founder')}
              className="rounded-full bg-[#dcefc7] px-6 py-3 text-sm font-semibold text-black hover:bg-[#cce8ae]"
            >
              Create founder profile
            </button>
            <button
              type="button"
              onClick={() => navigate('/login?role=investor')}
              className="rounded-full bg-[#42520d] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#34420a]"
            >
              Create investor profile <ArrowUpRight className="ml-1 inline h-3.5 w-3.5 align-[-2px]" />
            </button>
          </div>
        </div>
      </section>
    </main>
  );
};

// ── Waitlist signup CTA ───────────────────────────────────────────────────
// Email-only capture. Stored in waitlist_signups (anon-insert, admin-read).
// Editorial design language: cream surface, olive accent, serif headline,
// matches the rest of the landing page.

const WaitlistSection = () => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<WaitlistRole>('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (status === 'submitting') return;
    setStatus('submitting');
    setMessage('');
    try {
      const result = await signupForWaitlist({ email, role, source: 'landing-cta' });
      if (result.ok) {
        setStatus('success');
        setMessage(result.message);
        if (result.isNew) setEmail('');
      } else {
        setStatus('error');
        setMessage(result.message);
      }
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Unable to save your email.');
    }
  };

  const roleChips: { value: WaitlistRole; label: string }[] = [
    { value: 'founder', label: 'Founder' },
    { value: 'investor', label: 'Investor' },
    { value: 'curious', label: 'Just curious' },
  ];

  return (
    <section className="mx-auto max-w-[78rem] px-5 pb-12 pt-6 sm:px-8">
      <div className="relative overflow-hidden rounded-[32px] bg-[#f4f1eb] px-6 py-10 shadow-[0_18px_44px_rgba(0,0,0,0.05)] sm:px-12 sm:py-14 md:px-16">
        {/* Background flourish: same warm-cream → mint gradient sweep the rest
            of the page leans on, kept subtle. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            background:
              'radial-gradient(circle at 15% 25%, rgba(220,239,199,0.55) 0%, transparent 45%), radial-gradient(circle at 85% 75%, rgba(66,82,13,0.07) 0%, transparent 50%)',
          }}
        />

        <div className="relative grid gap-8 md:grid-cols-[1.05fr_minmax(0,1fr)] md:items-end md:gap-12">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-[#42520d]/15 bg-white/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#42520d]">
              <Sparkles className="h-3 w-3" />
              Early access
            </div>
            <h2
              className="mt-4 max-w-2xl text-3xl font-normal leading-[1.05] tracking-[-0.035em] sm:text-4xl md:text-[2.85rem]"
              style={serifDisplay}
            >
              Be first in when Apparent opens.
            </h2>
            <p className="mt-4 max-w-xl text-base leading-7 text-black/65">
              Founders meet thesis-fit investors; investors source thesis-fit founders. Drop your email and we&apos;ll email you the moment public access lands.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="w-full" noValidate>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-0">
              <label htmlFor="waitlist-email" className="sr-only">
                Email address
              </label>
              <input
                id="waitlist-email"
                type="email"
                required
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  if (status !== 'idle') {
                    setStatus('idle');
                    setMessage('');
                  }
                }}
                placeholder="you@startup.com"
                className="h-12 w-full flex-1 rounded-full border border-black/10 bg-white px-5 text-sm text-black outline-none transition-colors placeholder:text-black/35 focus:border-[#42520d] sm:rounded-r-none sm:border-r-0"
                disabled={status === 'submitting' || status === 'success'}
              />
              <button
                type="submit"
                disabled={status === 'submitting' || status === 'success'}
                className="inline-flex h-12 items-center justify-center gap-1.5 rounded-full bg-[#42520d] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#34420a] disabled:cursor-not-allowed disabled:opacity-70 sm:rounded-l-none"
              >
                {status === 'submitting' ? (
                  'Adding…'
                ) : status === 'success' ? (
                  <>
                    <Check className="h-4 w-4" /> On the list
                  </>
                ) : (
                  <>
                    Join the waitlist <ArrowUpRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>

            {/* Optional role hint — purely for our segmentation, never used
                to gate anything. Reuses the same olive-on-cream chip style as
                the page's other pills. */}
            <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px] font-medium text-black/55">
              <span className="mr-1 uppercase tracking-[0.14em] text-black/40">I&apos;m a</span>
              {roleChips.map((chip) => {
                const isActive = role === chip.value;
                return (
                  <button
                    key={chip.value}
                    type="button"
                    onClick={() => setRole(isActive ? '' : chip.value)}
                    disabled={status === 'submitting' || status === 'success'}
                    className={`rounded-full border px-2.5 py-1 transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                      isActive
                        ? 'border-[#42520d] bg-[#42520d] text-white'
                        : 'border-black/15 bg-white/70 text-black/65 hover:border-[#42520d]/60 hover:text-[#42520d]'
                    }`}
                  >
                    {chip.label}
                  </button>
                );
              })}
            </div>

            {message && (
              <p
                role={status === 'error' ? 'alert' : 'status'}
                className={`mt-3 text-xs leading-5 ${
                  status === 'error' ? 'text-red-700' : 'text-[#42520d]'
                }`}
              >
                {message}
              </p>
            )}

            <p className="mt-2 text-[11px] leading-5 text-black/40">
              No spam. One email when we open, and one if there&apos;s a real reason to write.
            </p>
          </form>
        </div>
      </div>
    </section>
  );
};
