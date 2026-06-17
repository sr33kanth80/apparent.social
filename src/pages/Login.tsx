import { AnimatePresence, motion } from 'framer-motion';
import { useKindeAuth } from '@kinde-oss/kinde-auth-react';
import { ArrowUpRight, AtSign, Fingerprint, Telescope, UserRound, type LucideIcon } from 'lucide-react';
import { clearExternalAppUser } from '@/lib/auth-service';
import type { DashboardRole } from '@/lib/apparent-types';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  getKindeLogoutUri,
  hasAnyKindeConnection,
  isKindeConfigured,
  kindeConnectionIds,
  resolveKindeRole,
  saveRequestedKindeRole,
} from '@/lib/kinde-auth';

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
    Icon: Fingerprint,
    founderValue: 'GitHub links',
    founderSupport: 'Show real shipping cadence and code history.',
    investorValue: 'Thesis fit',
    investorSupport: 'Score builders against your sectors and stage.',
  },
  {
    number: '02',
    label: 'Radar',
    Icon: Telescope,
    founderValue: 'Nearby peers',
    founderSupport: 'Find founders in your city and category.',
    investorValue: 'Builder density',
    investorSupport: '1,800+ VCs and live builder map at a glance.',
  },
  {
    number: '03',
    label: 'Motion',
    Icon: ArrowUpRight,
    founderValue: 'Investor DMs',
    founderSupport: 'Cold-pitch direct, track replies in-app.',
    investorValue: 'Deal flow',
    investorSupport: 'Kanban every signal from inbox to meeting.',
  },
];

const ROLE_SWAP_TRANSITION = { duration: 0.28, ease: [0.22, 0.61, 0.36, 1] } as const;
const ROLE_SWAP_VARIANTS = {
  initial: { opacity: 0, y: 8, filter: 'blur(4px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  exit: { opacity: 0, y: -8, filter: 'blur(4px)' },
};

const serifDisplay = {
  fontFamily: "var(--alden-serif, 'Source Serif 4', ui-serif, Georgia, 'Times New Roman', serif)",
};

const sansDisplay = {
  fontFamily: "var(--alden-sans, 'Inter', ui-sans-serif, system-ui, sans-serif)",
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
      <span className="whitespace-nowrap text-[var(--alden-sky)]">Find cracked builders.</span>
    </>
  ) : (
    <>
      Build proof.
      <br />
      <span className="text-[var(--alden-sky)]">Meet capital.</span>
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

  const handleRoleChange = (nextRole: DashboardRole) => {
    saveRequestedKindeRole(nextRole);
    setSearchParams({ role: nextRole });
  };

  return (
    <main className="min-h-screen overflow-x-hidden bg-[var(--alden-paper)] text-[var(--alden-ink)]" style={sansDisplay}>
      <section className="mx-auto max-w-[76rem] px-5 py-10 sm:px-8 md:py-14">
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_420px] xl:gap-12">
          <section className="hidden py-2 lg:block">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={activeRole}
                variants={ROLE_SWAP_VARIANTS}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={ROLE_SWAP_TRANSITION}
              >
                <h1 className="max-w-4xl text-6xl font-normal leading-[0.94] tracking-[-0.05em] xl:text-7xl">
                  {headline}
                </h1>
                <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--alden-graphite)]">
                  {bodyCopy}
                </p>

                <div className="mt-10 grid gap-4 border-y border-[var(--alden-fog)] py-6">
                  {contextItems.map((item, index) => (
                    <div key={item} className="grid gap-4 sm:grid-cols-[3rem_1fr]">
                      <span className="text-sm font-medium text-[var(--alden-graphite)]">0{index + 1}</span>
                      <p className="text-sm leading-6 text-[var(--alden-graphite)]">{item}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-8 grid grid-cols-3 items-stretch gap-3">
                  {FEATURE_PILLARS.map((pillar, index) => {
                    const value = isInvestor ? pillar.investorValue : pillar.founderValue;
                    const support = isInvestor ? pillar.investorSupport : pillar.founderSupport;
                    const isMiddle = index === 1;
                    const entrance = index === 0
                      ? { initial: { opacity: 0, x: -42 }, animate: { opacity: 1, x: 0 } }
                      : index === 2
                        ? { initial: { opacity: 0, x: 42 }, animate: { opacity: 1, x: 0 } }
                        : { initial: { opacity: 0, y: 18 }, animate: { opacity: 1, y: 0 } };
                    const delay = index === 0 ? 0 : index === 2 ? 0.24 : 0.12;

                    return (
                      <motion.article
                        key={pillar.label}
                        initial={entrance.initial}
                        animate={entrance.animate}
                        transition={{
                          duration: 0.52,
                          delay,
                          ease: [0.22, 1, 0.36, 1],
                        }}
                        whileHover={{ y: -3 }}
                        className={`relative flex min-h-[12rem] flex-col rounded-[8px] border border-[var(--alden-fog)] p-5 transition-colors ${
                          isMiddle ? 'bg-[var(--alden-sage)]' : 'bg-[var(--alden-paper)]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--alden-fog)] bg-white text-[var(--alden-ink)]">
                            <pillar.Icon className="h-4 w-4" />
                          </span>
                          <span className="text-[10px] font-medium uppercase text-[var(--alden-graphite)]">
                            {pillar.number}
                          </span>
                        </div>
                        <p className="mt-5 text-[10px] font-medium uppercase text-[var(--alden-graphite)]">
                          {pillar.label}
                        </p>
                        <p
                          className="mt-1 text-xl font-normal leading-tight tracking-[-0.03em] text-[var(--alden-ink)]"
                          style={serifDisplay}
                        >
                          {value}
                        </p>
                        <p className="mt-2 text-xs leading-5 text-[var(--alden-graphite)]">{support}</p>
                      </motion.article>
                    );
                  })}
                </div>
              </motion.div>
            </AnimatePresence>
          </section>

          <div className="lg:sticky lg:top-24">
            <div className="mb-4 grid grid-cols-2 gap-1 rounded-full border border-[var(--alden-fog)] bg-white p-1">
              {(['founder', 'investor'] as DashboardRole[]).map((nextRole) => {
                const active = activeRole === nextRole;
                return (
                  <button
                    key={nextRole}
                    type="button"
                    aria-pressed={active}
                    onClick={() => handleRoleChange(nextRole)}
                    className={`h-9 rounded-full px-4 text-sm font-medium transition-colors ${
                      active
                        ? nextRole === 'investor'
                          ? 'alden-investor-cta text-[var(--alden-ink)]'
                          : 'bg-[var(--alden-sage)] text-[var(--alden-ink)]'
                        : 'text-[var(--alden-graphite)] hover:bg-[var(--alden-parchment)] hover:text-[var(--alden-ink)]'
                    }`}
                  >
                    {nextRole === 'founder' ? 'For Founders' : 'For VCs'}
                  </button>
                );
              })}
            </div>

            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={activeRole}
                variants={ROLE_SWAP_VARIANTS}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={ROLE_SWAP_TRANSITION}
              >
                {isKindeConfigured ? (
                  <KindeAuthPanel
                    role={activeRole}
                    title={authTitle}
                    description={authDescription}
                    contextLabel={contextLabel}
                    contextItems={contextItems}
                    emailPlaceholder={emailPlaceholder}
                  />
                ) : (
                  <div className="rounded-[8px] border border-red-100 bg-white p-6">
                    <p className="text-sm font-semibold text-red-700">Kinde is not configured</p>
                    <p className="mt-2 text-sm leading-6 text-[var(--alden-graphite)]">
                      Set VITE_KINDE_CLIENT_ID and VITE_KINDE_DOMAIN in Vercel and redeploy to enable sign in.
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

const KindeAuthPanel = ({
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
  const { isLoading, isAuthenticated, login, register, logout, user: kindeUser } = useKindeAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated && kindeUser) {
      const targetRole = resolveKindeRole(kindeUser.id, role);
      navigate(`/dashboard/${targetRole}`, { replace: true });
      return;
    }

    if (!isLoading) {
      saveRequestedKindeRole(role);
      clearExternalAppUser();
    }
  }, [isAuthenticated, isLoading, kindeUser, navigate, role]);

  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signup');
  const isSignup = authMode === 'signup';

  const handleAuthClick = () => {
    saveRequestedKindeRole(role);
  };

  const continueWith = async (connectionId: string) => {
    handleAuthClick();
    const opts = connectionId ? { connectionId } : undefined;
    if (isSignup) {
      await (opts ? register(opts) : register());
    } else {
      await (opts ? login(opts) : login());
    }
  };

  const legacyRegister = async () => {
    handleAuthClick();
    await register();
  };

  return (
    <div className="relative overflow-hidden rounded-[8px] border border-[var(--alden-fog)] bg-[var(--alden-paper)] p-6 text-[var(--alden-ink)]">
      <div aria-hidden="true" className={`absolute inset-x-0 top-0 h-1 ${role === 'investor' ? 'bg-[var(--alden-sky)]' : 'bg-[var(--alden-sage)]'}`} />

      <div className="relative pt-2">
        <p
          className="text-2xl font-normal leading-tight tracking-[-0.035em] text-[var(--alden-ink)]"
          style={serifDisplay}
        >
          {title}
        </p>
        <p className="mt-2.5 text-sm leading-6 text-[var(--alden-graphite)]">{description}</p>
      </div>

      <div className="relative mt-5 rounded-[8px] border border-[var(--alden-fog)] bg-[var(--alden-parchment)] p-4">
        <p className="text-[10px] font-medium uppercase text-[var(--alden-graphite)]">
          {contextLabel}
        </p>
        <div className="mt-3 grid gap-2">
          {contextItems.map((item) => (
            <div key={item} className="flex items-start gap-2.5 text-sm leading-5 text-[var(--alden-graphite)]">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--alden-sage)] ring-1 ring-[var(--alden-ink)]/10" />
              {item}
            </div>
          ))}
        </div>
      </div>

      {!isAuthenticated && (
        <div className="relative mt-5 grid gap-3">
          {hasAnyKindeConnection ? (
            <>
              <div className="grid grid-cols-2 gap-1 rounded-full border border-[var(--alden-fog)] bg-[var(--alden-parchment)] p-1">
                {(['signup', 'signin'] as const).map((mode) => {
                  const active = authMode === mode;
                  const label = mode === 'signup' ? 'Sign up' : 'Sign in';
                  return (
                    <button
                      key={mode}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setAuthMode(mode)}
                      className={`h-8 rounded-full text-xs font-medium transition-colors ${
                        active
                          ? role === 'investor'
                            ? 'alden-investor-cta text-[var(--alden-ink)]'
                            : 'bg-[var(--alden-sage)] text-[var(--alden-ink)]'
                          : 'text-[var(--alden-graphite)] hover:bg-white hover:text-[var(--alden-ink)]'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              {kindeConnectionIds.google && (
                <button
                  type="button"
                  onClick={() => continueWith(kindeConnectionIds.google)}
                  disabled={isLoading}
                  className="inline-flex h-11 w-full items-center justify-center gap-3 rounded-full border border-[var(--alden-fog)] bg-white px-4 text-sm font-medium text-[var(--alden-ink)] transition-colors hover:bg-[var(--alden-parchment)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <GoogleMark className="h-4 w-4" />
                  {isLoading ? 'Loading...' : isSignup ? 'Sign up with Google' : 'Sign in with Google'}
                </button>
              )}

              {(kindeConnectionIds.email || kindeConnectionIds.username) && kindeConnectionIds.google && (
                <div className="flex items-center gap-3 text-[10px] font-medium uppercase text-[var(--alden-graphite)]">
                  <span className="h-px flex-1 bg-[var(--alden-fog)]" />
                  or
                  <span className="h-px flex-1 bg-[var(--alden-fog)]" />
                </div>
              )}

              {kindeConnectionIds.email && (
                <button
                  type="button"
                  onClick={() => continueWith(kindeConnectionIds.email)}
                  disabled={isLoading}
                  className={`inline-flex h-11 w-full items-center justify-center gap-3 rounded-full bg-[var(--alden-sage)] px-4 text-sm font-medium text-[var(--alden-ink)] transition-colors hover:bg-[#bed49f] disabled:cursor-not-allowed disabled:opacity-60 ${role === 'investor' ? 'alden-investor-cta' : ''}`}
                >
                  <AtSign className="h-4 w-4" />
                  {isLoading ? 'Loading...' : isSignup ? 'Sign up with email' : 'Sign in with email'}
                </button>
              )}

              {kindeConnectionIds.username && (
                <button
                  type="button"
                  onClick={() => continueWith(kindeConnectionIds.username)}
                  disabled={isLoading}
                  className="inline-flex h-11 w-full items-center justify-center gap-3 rounded-full border border-[var(--alden-fog)] bg-white px-4 text-sm font-medium text-[var(--alden-ink)] transition-colors hover:bg-[var(--alden-parchment)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <UserRound className="h-4 w-4" />
                  {isLoading ? 'Loading...' : isSignup ? 'Sign up with username' : 'Sign in with username'}
                </button>
              )}

              <p className="mt-1 text-center text-[11px] leading-5 text-[var(--alden-graphite)]">
                {role === 'investor'
                  ? 'Investor profiles are bound to the email used here.'
                  : 'Founder profiles are bound to the email used here.'}{' '}
                Suggested: {emailPlaceholder}
              </p>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => continueWith('')}
                disabled={isLoading}
                className={`inline-flex h-11 w-full items-center justify-center rounded-full bg-[var(--alden-sage)] px-4 text-sm font-medium text-[var(--alden-ink)] transition-colors hover:bg-[#bed49f] disabled:cursor-not-allowed disabled:opacity-60 ${role === 'investor' ? 'alden-investor-cta' : ''}`}
              >
                {isLoading ? 'Loading...' : 'Sign in'}
              </button>
              <button
                type="button"
                onClick={legacyRegister}
                disabled={isLoading}
                className="inline-flex h-11 w-full items-center justify-center rounded-full border border-[var(--alden-fog)] bg-white px-4 text-sm font-medium text-[var(--alden-ink)] transition-colors hover:bg-[var(--alden-parchment)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Create account
              </button>
              <p className="text-center text-[11px] text-[var(--alden-graphite)]">Suggested email: {emailPlaceholder}</p>
            </>
          )}
        </div>
      )}

      {isAuthenticated && (
        <div className="relative mt-5 flex items-center justify-between rounded-[8px] border border-[var(--alden-fog)] bg-[var(--alden-parchment)] px-4 py-3">
          <button
            type="button"
            onClick={() => logout({ redirectUrl: getKindeLogoutUri() })}
            className="inline-flex h-9 items-center justify-center rounded-full border border-[var(--alden-fog)] bg-white px-4 text-sm font-medium text-[var(--alden-ink)] transition-colors hover:bg-[var(--alden-paper)]"
          >
            Sign out
          </button>
          <button
            type="button"
            onClick={() => {
              const targetRole = kindeUser ? resolveKindeRole(kindeUser.id, role) : role;
              navigate(`/dashboard/${targetRole}`);
            }}
            className="inline-flex h-9 items-center justify-center rounded-full bg-[var(--alden-sage)] px-4 text-sm font-medium text-[var(--alden-ink)] transition-colors hover:bg-[#bed49f]"
          >
            Open workspace
          </button>
        </div>
      )}
    </div>
  );
};

const GoogleMark = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09Z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.98.66-2.23 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.11A6.62 6.62 0 0 1 5.5 12c0-.73.13-1.45.34-2.11V7.05H2.18A11 11 0 0 0 1 12c0 1.77.43 3.45 1.18 4.95l3.66-2.84Z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.05l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z"
    />
  </svg>
);
