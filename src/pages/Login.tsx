import { AuthForm } from '@/components/ui/sign-in';
import { Switch } from '@/components/ui/switch';
import { createDevSession, sendEmailLink, signInWithEmail } from '@/lib/auth-service';
import type { DashboardRole } from '@/lib/apparent-types';
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const serifDisplay = {
  fontFamily: 'Georgia, "Times New Roman", serif',
};

export const Login = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [authError, setAuthError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const role = searchParams.get('role');
  const activeRole: DashboardRole = role === 'investor' ? 'investor' : 'founder';
  const isInvestor = activeRole === 'investor';
  const isFounder = activeRole === 'founder';

  const handleSocialSignIn = (provider: string) => {
    window.alert(`Continue with ${provider}`);
  };

  const handleEmailSubmit = async (data: { email: string; password?: string }) => {
    setAuthError('');
    setIsSubmitting(true);

    try {
      await signInWithEmail(data.email, data.password ?? '', activeRole);
      navigate(isInvestor ? '/dashboard/investor' : '/dashboard/founder');
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Unable to sign in.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailLink = async () => {
    const email = window.prompt('Email address for your Apparent sign-in link');
    if (!email) {
      return;
    }

    setAuthError('');
    setIsSubmitting(true);

    try {
      await sendEmailLink(email, activeRole);
      window.alert('Check your email for the Apparent sign-in link.');
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Unable to send email link.');
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
  const socialLabel = isInvestor
    ? 'Continue as investor with'
    : isFounder
      ? 'Continue as founder with'
      : 'Sign in with';
  const emailLinkLabel = isInvestor
    ? 'Email me an investor link'
    : isFounder
      ? 'Email me a founder link'
      : 'Or email me a link';
  const submitLabel = isInvestor ? 'Continue as Investor' : isFounder ? 'Continue as Founder' : 'Sign In';
  const bypassLabel = isInvestor
    ? 'Skip login - enter investor portal'
    : 'Skip login - enter founder portal';

  const handleRoleChange = (nextRole: string) => {
    setSearchParams({ role: nextRole });
  };

  const handleBypass = () => {
    createDevSession(activeRole);
    navigate(isInvestor ? '/dashboard/investor' : '/dashboard/founder');
  };

  return (
    <main className="overflow-x-hidden bg-[#fbfaf7] text-black">
      <section className="mx-auto max-w-[92rem] px-5 py-14 sm:px-8 md:py-20">
        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_440px] xl:gap-16">
          <section className="hidden py-4 lg:block">
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

            <div className="mt-12 grid gap-4 sm:grid-cols-3">
              {[
                ['Proof', isInvestor ? 'Thesis fit' : 'GitHub links'],
                ['Radar', isInvestor ? 'Builder density' : 'Nearby peers'],
                ['Motion', isInvestor ? 'Deal flow' : 'Investor DMs'],
              ].map(([label, value]) => (
                <div key={label} className="rounded-[22px] bg-white/70 p-5">
                  <p className="text-sm font-semibold">{label}</p>
                  <p className="mt-3 text-sm leading-6 text-black/55">{value}</p>
                </div>
              ))}
            </div>
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

            <AuthForm
              title={authTitle}
              description={authDescription}
              contextLabel={contextLabel}
              contextItems={contextItems}
              emailPlaceholder={emailPlaceholder}
              socialLabel={socialLabel}
              emailLinkLabel={emailLinkLabel}
              submitLabel={isSubmitting ? 'Working...' : submitLabel}
              bypassLabel={bypassLabel}
              onSocialSignIn={handleSocialSignIn}
              onEmailSubmit={handleEmailSubmit}
              onEmailLink={handleEmailLink}
              onBypass={handleBypass}
              className="border-0 bg-white/80 shadow-[0_18px_60px_rgba(0,0,0,0.06)]"
            />
            {authError && (
              <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                {authError}
              </p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
};
