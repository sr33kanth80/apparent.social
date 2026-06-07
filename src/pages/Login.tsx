import { AnimatePresence, motion } from 'framer-motion';
import { Show, SignInButton, SignUpButton, UserButton, useUser } from '@clerk/react';
import { ArrowUpRight, Fingerprint, Telescope, type LucideIcon } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { clearExternalAppUser } from '@/lib/auth-service';
import type { DashboardRole } from '@/lib/apparent-types';
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { isClerkConfigured, saveRequestedClerkRole } from '@/lib/clerk-auth';

interface FeaturePillar {
  number: string;
  label: string;
  founderValue: string;
  founderSupport: string;
  investorValue: string;
  investorSupport: string;
  Icon: LucideIcon;
}

const FEATURE_PILLARS: FeaturePillar[] = [
  {
    number: '01',
    label: 'Proof',
    // Fingerprint: identity + verifiable signal. Distinct from the generic
    // BadgeCheck every SaaS dashboard ships with.
    Icon: Fingerprint,
    founderValue: 'GitHub links',
    founderSupport: 'Show real shipping cadence and code history.',
    investorValue: 'Thesis fit',
    investorSupport: 'Score builders against your sectors and stage.',
  },
  {
    number: '02',
    label: 'Radar',
    // Telescope: far-sight + exploration. Reads more editorial than the
    // literal radar dish.
    Icon: Telescope,
    founderValue: 'Nearby peers',
    founderSupport: 'Find founders in your city and category.',
    investorValue: 'Builder density',
    investorSupport: '1,800+ VCs and live builder map at a glance.',
  },
  {
    number: '03',
    label: 'Motion',
    // ArrowUpRight: directional motion that mirrors the same icon the rest
    // of the app already uses on CTAs and project links.
    Icon: ArrowUpRight,
    founderValue: 'Investor DMs',
    founderSupport: 'Cold-pitch direct, track replies in-app.',
    investorValue: 'Deal flow',
    investorSupport: 'Kanban every signal from inbox to meeting.',
  },
];

// Shared transition for role-toggle content swaps. Short and eased so the
// crossfade reads as polish, not delay.
const ROLE_SWAP_TRANSITION = { duration: 0.28, ease: [0.22, 0.61, 0.36, 1] } as const;
const ROLE_SWAP_VARIANTS = {
  initial: { opacity: 0, y: 8, filter: 'blur(4px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  exit: { opacity: 0, y: -8, filter: 'blur(4px)' },
};

const serifDisplay = {
  fontFamily: 'Georgia, "Times New Roman", serif',
};

export const Login = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const role = searchParams.get('role');
  const activeRole: DashboardRole = role === 'investor' ? 'investor' : 'founder';
  const isInvestor = activeRole === 'investor';
  const isFounder = activeRole === 'founder';

  const headline = isInvestor ? (
    <>
      Define thesis.
      <br />
      <span className="whitespace-nowrap">Find cracked builders.</span>
    </>
  ) : (
    <>
      Build proof.
      <br />
      Meet capital.
    </>
  );
  const bodyCopy = isInvestor
    ? 'Create an investor profile, share your thesis, discover builders, and host meetups around the communities you want to back.'
    : 'Create a founder profile, connect GitHub, list products, and get discovered by VCs whose thesis fits what you are building.';
  const authTitle = isInvestor ? 'Create investor profile' : isFounder ? 'Create founder profile' : 'Sign in with email';
  const authDescription = isInvestor
    ? 'Sign in to publish your investment thesis, discover builders, and follow founder activity.'
    : 'Sign in to build your profile, publish launches, discover investors, and follow market activity.';
  const contextLabel = isInvestor
    ? 'Investor profile setup'
    : isFounder
      ? 'Founder profile setup'
      : 'Apparent profile setup';
  const contextItems = isInvestor
    ? ['Publish your investment thesis', 'Discover proof-of-work builder profiles', 'Host meetups and follow launches']
    : isFounder
      ? ['Connect GitHub and public proof', 'List products and launches', 'Get discovered by thesis-fit investors']
      : ['Create your profile', 'Follow launches and meetups', 'Discover the right people'];
  const emailPlaceholder = isInvestor
    ? 'partner@fund.com'
    : isFounder
      ? 'founder@startup.com'
      : 'you@app.com';

  const handleRoleChange = (nextRole: string) => {
    if (nextRole === 'founder' || nextRole === 'investor') {
      saveRequestedClerkRole(nextRole);
    }
    setSearchParams({ role: nextRole });
  };

  return (
    <main className="overflow-x-hidden bg-[#fbfaf7] text-black">
      <section className="mx-auto max-w-[92rem] px-5 py-14 sm:px-8 md:py-20">
        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_440px] xl:gap-16">
          <section className="hidden py-4 lg:block">
            {/* The editorial column re-themes per role. AnimatePresence
                crossfades + slides the whole block so the swap reads as a
                planned transition rather than instant string replacement. */}
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={activeRole}
                variants={ROLE_SWAP_VARIANTS}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={ROLE_SWAP_TRANSITION}
              >
                <h1
                  className="max-w-4xl text-6xl font-normal leading-[0.94] tracking-[-0.05em] xl:text-7xl"
                  style={serifDisplay}
                >
                  {headline}
                </h1>
                <p className="mt-8 max-w-2xl text-lg leading-8 text-black/60">
                  {bodyCopy}
                </p>

                <div className="mt-12 grid gap-5">
                  {contextItems.map((item, index) => (
                    <div key={item} className="grid gap-4 sm:grid-cols-[3rem_1fr]">
                      <span className="text-sm font-semibold text-black/45">0{index + 1}</span>
                      <p className="text-sm leading-6 text-black/65">{item}</p>
                    </div>
                  ))}
                </div>

                {/* Feature pillars — three interlocking puzzle pieces. Same
                    visual language as the hero headline on the marketing page
                    (.pz family in index.css), upscaled to card size.
                    Light → olive → light alternation keeps the seams crisp.
                    Each piece animates in from a different vector and snaps
                    into its neighbour, then a soft "click" pulse plays once
                    all three are seated. */}
                <div className="mt-12 grid grid-cols-3 items-stretch gap-0">
                  {FEATURE_PILLARS.map((pillar, index) => {
                    const value = isInvestor ? pillar.investorValue : pillar.founderValue;
                    const support = isInvestor ? pillar.investorSupport : pillar.founderSupport;

                    // Olive in the middle, light on the ends — high-contrast
                    // sequence that mirrors the hero headline.
                    const isMiddle = index === 1;
                    const pieceBg = isMiddle ? '#42520d' : '#dcefc7';
                    const pieceFg = isMiddle ? '#f4f1eb' : '#20300a';
                    const labelMuted = isMiddle ? 'text-white/60' : 'text-[#20300a]/60';
                    const supportMuted = isMiddle ? 'text-white/75' : 'text-[#20300a]/72';
                    const iconBadgeBg = isMiddle ? 'bg-white/15 text-white' : 'bg-[#42520d] text-[#dcefc7]';

                    // Puzzle joint class — leftmost only has knob, middle has
                    // both, rightmost only has socket. Z-index decreases
                    // left→right so each knob covers the next socket's hole.
                    const isLeft = index === 0;
                    const isRight = index === 2;
                    const jointClasses = [
                      'pz-card',
                      !isLeft && 'pz-card-socket-l',
                      !isRight && 'pz-card-knob-r',
                      isLeft && 'rounded-l-[18px]',
                      isRight && 'rounded-r-[18px]',
                    ]
                      .filter(Boolean)
                      .join(' ');
                    const zIndex = 3 - index;

                    // Entrance: outer pieces slide in horizontally from their
                    // sides, middle piece drops in from above. Easing
                    // overshoots slightly so the click-into-place reads as
                    // satisfying instead of mechanical.
                    const entrance = isLeft
                      ? { initial: { opacity: 0, x: -42 }, animate: { opacity: 1, x: 0 } }
                      : isRight
                        ? { initial: { opacity: 0, x: 42 }, animate: { opacity: 1, x: 0 } }
                        : { initial: { opacity: 0, y: -24, rotate: -4 }, animate: { opacity: 1, y: 0, rotate: 0 } };
                    const delay = isLeft ? 0 : isRight ? 0.32 : 0.18;

                    return (
                      <motion.article
                        key={pillar.label}
                        initial={entrance.initial}
                        animate={entrance.animate}
                        transition={{
                          duration: 0.6,
                          delay,
                          ease: [0.34, 1.42, 0.5, 1],
                        }}
                        whileHover={{ y: -3 }}
                        style={{
                          // Drive .pz-card background via CSS var so the
                          // ::after knob inherits the same fill cleanly.
                          ['--pz-card-color' as string]: pieceBg,
                          color: pieceFg,
                          zIndex,
                        }}
                        className={`${jointClasses} relative flex flex-col px-5 py-6 shadow-[0_8px_24px_rgba(0,0,0,0.06)] transition-shadow duration-300 hover:shadow-[0_18px_44px_rgba(0,0,0,0.12)]`}
                      >
                        {/* Decorative top + bottom nubs only on the outer
                            pieces — keeps the silhouette balanced (the middle
                            piece is symmetrical via its side joints alone). */}
                        {isLeft && <span aria-hidden="true" className="pz-card-nub pz-card-nub-t" />}
                        {isRight && <span aria-hidden="true" className="pz-card-nub pz-card-nub-b" />}

                        <div className="flex items-start justify-between gap-3">
                          <span className={`flex h-9 w-9 items-center justify-center rounded-[12px] ${iconBadgeBg}`}>
                            <pillar.Icon className="h-4 w-4" />
                          </span>
                          <span className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${labelMuted}`}>
                            {pillar.number}
                          </span>
                        </div>
                        <p className={`mt-5 text-[10px] font-semibold uppercase tracking-[0.18em] ${labelMuted}`}>
                          {pillar.label}
                        </p>
                        <p
                          className="mt-1 text-xl font-normal leading-tight tracking-[-0.02em]"
                          style={serifDisplay}
                        >
                          {value}
                        </p>
                        <p className={`mt-2 text-xs leading-5 ${supportMuted}`}>{support}</p>
                      </motion.article>
                    );
                  })}
                </div>
              </motion.div>
            </AnimatePresence>
          </section>

          <div>
            <div className="mb-5 flex justify-center">
              <Switch
                name="profile-role"
                value={activeRole}
                onValueChange={handleRoleChange}
                size="medium"
                style={{ width: 'min(100%, 300px)' }}
              >
                <Switch.Control
                  label="For Founders"
                  value="founder"
                  activeClassName="bg-[#dcefc7] text-black fill-black"
                />
                <Switch.Control
                  label="For VCs"
                  value="investor"
                  activeClassName="bg-[#42520d] text-white fill-white"
                />
              </Switch>
            </div>

            {/* Same crossfade on the right column so the form copy doesn't
                snap while the editorial column animates. */}
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={activeRole}
                variants={ROLE_SWAP_VARIANTS}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={ROLE_SWAP_TRANSITION}
              >
                {isClerkConfigured ? (
                  <ClerkAuthPanel
                    role={activeRole}
                    title={authTitle}
                    description={authDescription}
                    contextLabel={contextLabel}
                    contextItems={contextItems}
                    emailPlaceholder={emailPlaceholder}
                  />
                ) : (
                  <div className="rounded-[8px] border border-red-100 bg-white/80 p-6 shadow-[0_18px_60px_rgba(0,0,0,0.06)]">
                    <p className="text-sm font-semibold text-red-700">Clerk is not configured</p>
                    <p className="mt-2 text-sm leading-6 text-black/60">
                      Set VITE_CLERK_PUBLISHABLE_KEY in Vercel and redeploy to enable sign in.
                    </p>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </section>
    </main>
  );
};

const ClerkAuthPanel = ({
  role,
  title,
  description,
  contextLabel,
  contextItems,
  emailPlaceholder,
}: {
  role: DashboardRole;
  title: string;
  description: string;
  contextLabel: string;
  contextItems: string[];
  emailPlaceholder: string;
}) => {
  const navigate = useNavigate();
  const { isLoaded, isSignedIn } = useUser();
  const dashboardPath = `/dashboard/${role}`;

  useEffect(() => {
    saveRequestedClerkRole(role);
    if (isLoaded && isSignedIn) {
      navigate(dashboardPath, { replace: true });
    } else if (isLoaded) {
      clearExternalAppUser();
    }
  }, [dashboardPath, isLoaded, isSignedIn, navigate, role]);

  const handleAuthClick = () => {
    saveRequestedClerkRole(role);
  };

  return (
    <div className="rounded-[8px] border border-black/5 bg-white/80 p-6 shadow-[0_18px_60px_rgba(0,0,0,0.06)]">
      <div>
        <p className="text-xl font-semibold tracking-[-0.01em] text-black">{title}</p>
        <p className="mt-2 text-sm leading-6 text-black/60">{description}</p>
      </div>

      <div className="mt-6 rounded-[8px] border border-black/10 bg-[#fbfaf7] p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-black/45">{contextLabel}</p>
        <div className="mt-3 grid gap-2">
          {contextItems.map((item) => (
            <div key={item} className="flex items-center gap-2 text-sm text-black/70">
              <span className="h-1.5 w-1.5 rounded-full bg-[#42520d]" />
              {item}
            </div>
          ))}
        </div>
      </div>

      <Show when="signed-out">
        <div className="mt-6 grid gap-3">
          <SignInButton>
            <button
              type="button"
              onClick={handleAuthClick}
              className="inline-flex h-11 w-full items-center justify-center rounded-[8px] bg-black px-4 text-sm font-semibold text-white transition hover:bg-black/85"
            >
              Sign in with Clerk
            </button>
          </SignInButton>
          <SignUpButton>
            <button
              type="button"
              onClick={handleAuthClick}
              className="inline-flex h-11 w-full items-center justify-center rounded-[8px] border border-black/10 bg-white px-4 text-sm font-semibold text-black transition hover:bg-black/5"
            >
              Create account
            </button>
          </SignUpButton>
          <p className="text-center text-xs text-black/45">Suggested email: {emailPlaceholder}</p>
        </div>
      </Show>

      <Show when="signed-in">
        <div className="mt-6 flex items-center justify-between rounded-[8px] border border-black/10 bg-white px-4 py-3">
          <UserButton />
          <button
            type="button"
            onClick={() => navigate(dashboardPath)}
            className="inline-flex h-9 items-center justify-center rounded-[8px] bg-black px-4 text-sm font-semibold text-white transition hover:bg-black/85"
          >
            Open workspace
          </button>
        </div>
      </Show>
    </div>
  );
};
