import { useEffect, useState } from 'react';
import { useKindeAuth } from '@kinde-oss/kinde-auth-react';
import { ArrowUpRight, AtSign, Fingerprint, Telescope, UserRound, type LucideIcon } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { EditorialNavbar } from '../components/editorial/EditorialNavbar';
import { EditorialFooter } from '../components/editorial/EditorialFooter';
import { clearExternalAppUser } from '@/lib/auth-service';
import type { DashboardRole } from '@/lib/apparent-types';
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
  { number: '01', label: 'Proof', Icon: Fingerprint, founderValue: 'GitHub links', founderSupport: 'Show real shipping cadence and code history.', investorValue: 'Thesis fit', investorSupport: 'Score builders against your sectors and stage.' },
  { number: '02', label: 'Radar', Icon: Telescope, founderValue: 'Nearby peers', founderSupport: 'Find founders in your city and category.', investorValue: 'Builder density', investorSupport: '1,800+ VCs and a live builder map at a glance.' },
  { number: '03', label: 'Motion', Icon: ArrowUpRight, founderValue: 'Investor DMs', founderSupport: 'Cold-pitch direct, track replies in-app.', investorValue: 'Deal flow', investorSupport: 'Kanban every signal from inbox to meeting.' },
];

const GoogleMark = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09Z" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.98.66-2.23 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
    <path d="M5.84 14.11A6.62 6.62 0 0 1 5.5 12c0-.73.13-1.45.34-2.11V7.05H2.18A11 11 0 0 0 1 12c0 1.77.43 3.45 1.18 4.95l3.66-2.84Z" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.05l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z" />
  </svg>
);

export const Login = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const role = searchParams.get('role');
  const activeRole: DashboardRole = role === 'investor' ? 'investor' : 'founder';
  const isInvestor = activeRole === 'investor';

  const bodyCopy = isInvestor
    ? 'Create an investor profile, share your thesis, discover builders, and host meetups around the communities you want to back.'
    : 'Create a founder profile, connect GitHub, list products, and get discovered by VCs whose thesis fits what you are building.';
  const contextItems = isInvestor
    ? ['Publish your investment thesis', 'Discover proof-of-work builder profiles', 'Host meetups and follow launches']
    : ['Connect GitHub and public proof', 'List products and launches', 'Get discovered by thesis-fit investors'];

  const handleRoleChange = (nextRole: DashboardRole) => {
    saveRequestedKindeRole(nextRole);
    setSearchParams({ role: nextRole });
  };

  return (
    <div className="ed-page">
      <EditorialNavbar />
      <main>
        <section className="ed-subhero ed-inner">
          <div className="ed-auth">
            <div className={`ed-auth-pitch ${isInvestor ? 'is-investor' : 'is-founder'}`}>
              <h1>{isInvestor ? <>Define thesis. <em>Find cracked builders.</em></> : <>Build proof. <em>Meet capital.</em></>}</h1>
              <p className="ed-lede">{bodyCopy}</p>
              <div className="ed-auth-list">
                {contextItems.map((item, index) => (
                  <div className="ed-it" key={item}><span>0{index + 1}</span><p>{item}</p></div>
                ))}
              </div>
              <div className="ed-pillars">
                {FEATURE_PILLARS.map((pillar) => {
                  const Icon = pillar.Icon;
                  return (
                    <div className="ed-pillar" key={pillar.label}>
                      <Icon style={{ width: 18, height: 18, color: 'var(--ed-ink)' }} />
                      <div className="ed-pl" style={{ marginTop: 12 }}>{pillar.label}</div>
                      <b>{isInvestor ? pillar.investorValue : pillar.founderValue}</b>
                      <p>{isInvestor ? pillar.investorSupport : pillar.founderSupport}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="ed-seg" style={{ marginBottom: 16 }}>
                {(['founder', 'investor'] as DashboardRole[]).map((nextRole) => (
                  <button key={nextRole} type="button" aria-pressed={activeRole === nextRole} className={activeRole === nextRole ? 'is-on' : ''} onClick={() => handleRoleChange(nextRole)}>
                    {nextRole === 'founder' ? 'For Founders' : 'For VCs'}
                  </button>
                ))}
              </div>

              {isKindeConfigured ? (
                <KindeAuthPanel role={activeRole} />
              ) : (
                <div className="ed-auth-card">
                  <h2>Sign in is not configured</h2>
                  <p className="ed-desc">Set VITE_KINDE_CLIENT_ID and VITE_KINDE_DOMAIN in the environment and redeploy to enable sign in.</p>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
      <EditorialFooter />
    </div>
  );
};

const KindeAuthPanel = ({ role }: { role: DashboardRole }) => {
  const navigate = useNavigate();
  const { isLoading, isAuthenticated, login, register, logout, user: kindeUser } = useKindeAuth();
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signup');
  const isSignup = authMode === 'signup';
  const isInvestor = role === 'investor';

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

  const handleAuthClick = () => saveRequestedKindeRole(role);
  const continueWith = async (connectionId: string) => {
    handleAuthClick();
    const opts = connectionId ? { connectionId } : undefined;
    if (isSignup) await (opts ? register(opts) : register());
    else await (opts ? login(opts) : login());
  };
  const legacyRegister = async () => { handleAuthClick(); await register(); };

  const verb = isSignup ? 'Sign up' : 'Sign in';
  const title = isSignup
    ? (isInvestor ? 'Create investor profile' : 'Create founder profile')
    : (isInvestor ? 'Sign in as investor' : 'Sign in as founder');

  return (
    <div className="ed-auth-card">
      <h2>{title}</h2>

      {!isAuthenticated && (
        <>
          {hasAnyKindeConnection ? (
            <div className="ed-auth-methods">
              {kindeConnectionIds.google && (
                <button type="button" className="ed-btn ed-block ed-gh" disabled={isLoading} onClick={() => continueWith(kindeConnectionIds.google!)}>
                  <GoogleMark className="" /> {isLoading ? 'Loading...' : `${verb} with Google`}
                </button>
              )}

              {(kindeConnectionIds.email || kindeConnectionIds.username) && kindeConnectionIds.google && (
                <div className="ed-auth-or">or</div>
              )}

              {kindeConnectionIds.email && (
                <button type="button" className="ed-btn ed-block ed-btn-outline" disabled={isLoading} onClick={() => continueWith(kindeConnectionIds.email!)}>
                  <AtSign style={{ width: 16, height: 16 }} /> {isLoading ? 'Loading...' : `${verb} with email`}
                </button>
              )}

              {kindeConnectionIds.username && (
                <button type="button" className="ed-btn ed-block ed-btn-outline" disabled={isLoading} onClick={() => continueWith(kindeConnectionIds.username!)}>
                  <UserRound style={{ width: 16, height: 16 }} /> {isLoading ? 'Loading...' : `${verb} with username`}
                </button>
              )}
            </div>
          ) : (
            <div className="ed-auth-methods">
              <button type="button" className="ed-btn ed-block ed-btn-filled" disabled={isLoading} onClick={() => continueWith('')}>{isLoading ? 'Loading...' : 'Sign in'}</button>
              <button type="button" className="ed-btn ed-block ed-btn-outline" disabled={isLoading} onClick={legacyRegister}>Create account</button>
            </div>
          )}

          <p className="ed-auth-toggle">
            {isSignup ? 'Already have an account?' : 'New here?'}{' '}
            <button type="button" onClick={() => setAuthMode(isSignup ? 'signin' : 'signup')}>
              {isSignup ? 'Sign in' : 'Create account'}
            </button>
          </p>
        </>
      )}

      {isAuthenticated && (
        <div className="ed-authed">
          <button type="button" className="ed-btn ed-btn-outline" onClick={() => logout({ redirectUrl: getKindeLogoutUri() })}>Sign out</button>
          <button type="button" className="ed-btn ed-btn-filled" onClick={() => { const targetRole = kindeUser ? resolveKindeRole(kindeUser.id, role) : role; navigate(`/dashboard/${targetRole}`); }}>Open workspace</button>
        </div>
      )}
    </div>
  );
};
