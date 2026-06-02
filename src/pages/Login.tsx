import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUpRight, Fingerprint, Telescope, type LucideIcon } from 'lucide-react';
import { AuthForm } from '@/components/ui/sign-in';
import { Switch } from '@/components/ui/switch';
import { isRoleMismatchError, signInWithEmail } from '@/lib/auth-service';
import type { DashboardRole } from '@/lib/apparent-types';
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

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
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [authError, setAuthError] = useState('');
  // When a role mismatch is detected we surface a one-click switcher to flip
  // the toggle to the account's actual role instead of forcing the user to
  // read the error and find the toggle themselves.
  const [authErrorAction, setAuthErrorAction] = useState<{
    label: string;
    targetRole: DashboardRole;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const role = searchParams.get('role');
  const activeRole: DashboardRole = role === 'investor' ? 'investor' : 'founder';
  const isInvestor = activeRole === 'investor';
  const isFounder = activeRole === 'founder';

  const handleEmailSubmit = async (data: { email: string; password?: string }) => {
    setAuthError('');
    setAuthErrorAction(null);
    setIsSubmitting(true);

    try {
      const result = await signInWithEmail(data.email, data.password ?? '', activeRole);
      const path = isInvestor ? '/dashboard/investor' : '/dashboard/founder';
      navigate(path, result.isNew ? { state: { onboarding: true } } : undefined);
    } catch (error) {
      if (isRoleMismatchError(error)) {
        setAuthError(error.message);
        setAuthErrorAction({
          label: `Switch to ${error.actualRole === 'investor' ? 'Investor' : 'Founder'} sign-in`,
          targetRole: error.actualRole,
        });
      } else {
        setAuthError(error instanceof Error ? error.message : 'Unable to sign in.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

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
  const submitLabel = isInvestor ? 'Continue as Investor' : isFounder ? 'Continue as Founder' : 'Sign In';

  const handleRoleChange = (nextRole: string) => {
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
                <AuthForm
                  title={authTitle}
                  description={authDescription}
                  contextLabel={contextLabel}
                  contextItems={contextItems}
                  emailPlaceholder={emailPlaceholder}
                  submitLabel={isSubmitting ? 'Working...' : submitLabel}
                  onEmailSubmit={handleEmailSubmit}
                  className="border-0 bg-white/80 shadow-[0_18px_60px_rgba(0,0,0,0.06)]"
                />
              </motion.div>
            </AnimatePresence>
            {authError && (
              <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                <p>{authError}</p>
                {authErrorAction && (
                  <button
                    type="button"
                    onClick={() => {
                      setAuthError('');
                      setAuthErrorAction(null);
                      handleRoleChange(authErrorAction.targetRole);
                    }}
                    className="mt-3 inline-flex items-center justify-center rounded-full bg-red-700 px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90"
                  >
                    {authErrorAction.label}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
};
