import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowUpRight, FileText, Globe2, Link as LinkIcon, MapPin, MessageCircle, Star, Users } from 'lucide-react';
import { LogoIcon } from '@/components/LogoIcon';
import { GitHubIcon } from '@/components/GitHubIcon';
import { productLaunches } from '@/data/showcase-launches';
import type { AppUser, PublicProjectDetail } from '@/lib/apparent-types';
import { loadPublicProjectDetail, saveMessage } from '@/lib/dashboard-service';
import { getCurrentAppUser } from '@/lib/auth-service';
import { getStaticFounderProfile } from '@/lib/static-founder-profiles';
import { VerifiedAvatar } from '@/components/VerifiedAvatar';

const serifDisplay = {
  fontFamily: 'Georgia, "Times New Roman", serif',
};

const getDomain = (url: string) => {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return 'apparent.dev';
  }
};

const fallbackProjectDetail = (projectId: string): PublicProjectDetail | null => {
  const launch = productLaunches.find((item) => item.id === projectId);
  if (!launch) return null;

  const slug = launch.founderProfilePath.replace('/profile/', '');
  // Pull rich data from the static profiles map so the "Launched by"
  // card gets the real photo, headline, and social links.
  const staticResult = getStaticFounderProfile(slug);
  const sf = staticResult?.kind === 'founder' ? staticResult.profile : null;

  return {
    launch: {
      id: launch.id,
      ownerId: slug,
      slug: launch.id,
      name: launch.name,
      tagline: launch.tagline,
      intro: launch.description,
      category: launch.category,
      stage: launch.stage,
      location: launch.location,
      launchUrl: launch.website,
      proofUrl: '', // no separate proof URL for curated static launches
      metrics: launch.momentum,
      founderSignals: launch.proof,
      lookingFor: launch.investors.join(', '),
      updatedAt: new Date().toISOString(),
    },
    founder: {
      userId: slug,
      username: slug,
      profileName: sf?.profileName || launch.founder,
      headline: sf?.headline || `${launch.founder} · ${launch.name}`,
      bio: sf?.bio || launch.description,
      profilePhotoUrl: sf?.profilePhotoUrl || '',
      currentBuild: sf?.currentBuild || launch.name,
      category: sf?.category || launch.category,
      stage: sf?.stage || launch.stage,
      github: sf?.github || '',
      traction: sf?.traction || launch.momentum,
      lookingFor: sf?.lookingFor || launch.investors.join(', '),
      location: sf?.location || launch.location,
      press: sf?.press || launch.website,
      website: sf?.website || launch.website,
      linkedin: sf?.linkedin || '',
      xProfile: sf?.xProfile || '',
      pastProducts: sf?.pastProducts || '',
      launches: [],
    },
    teamMembers: [
      {
        name: sf?.profileName || launch.founder,
        role: 'Founder',
        bio: sf?.bio || `Leading ${launch.name}.`,
        location: sf?.location || launch.location,
        avatarUrl: sf?.profilePhotoUrl || '',
        profileUrl: launch.founderProfilePath,
        linkedinUrl: sf?.linkedin || '',
        xProfileUrl: sf?.xProfile || '',
        githubUrl: sf?.github || '',
        sortOrder: 0,
      },
    ],
  };
};

export const ProjectDetail = () => {
  const { projectId = '' } = useParams();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<PublicProjectDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [outreachStatus, setOutreachStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [outreachError, setOutreachError] = useState('');

  useEffect(() => {
    let isMounted = true;

    setIsLoading(true);
    loadPublicProjectDetail(projectId).then((loadedDetail) => {
      if (!isMounted) return;
      setDetail(loadedDetail ?? fallbackProjectDetail(projectId));
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [projectId]);

  useEffect(() => {
    let cancelled = false;
    getCurrentAppUser()
      .then((user) => {
        if (!cancelled) setCurrentUser(user);
      })
      .catch(() => {
        if (!cancelled) setCurrentUser(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Investor outreach: send a canned DM via the existing user_messages flow.
  // The founder sees the message in their inbox; this replaces the old sample
  // outreach drafts that were generated locally inside the investor dashboard.
  const handleSendOutreach = async () => {
    if (!currentUser || !detail) return;
    const founderName = detail.founder?.profileName || 'Founder on Apparent';
    const firstName = founderName.split(/\s+/)[0];
    const investorName = currentUser.username || currentUser.email.split('@')[0];

    setOutreachStatus('sending');
    setOutreachError('');

    try {
      await saveMessage(currentUser, {
        recipient: founderName,
        recipientId: detail.founder?.userId || detail.launch.ownerId,
        senderName: investorName,
        subject: `Apparent: interested in ${detail.launch.name}`,
        body:
          `Hi ${firstName} — I'm ${investorName} on Apparent. I came across ${detail.launch.name} and what you're building stood out. ` +
          `I'd love to learn more and see if there's a fit. Open to a quick call this week?\n\n— ${investorName}`,
        status: 'sent',
        context: `launch:${detail.launch.id}`,
      });
      setOutreachStatus('sent');
    } catch (error) {
      setOutreachStatus('error');
      setOutreachError(error instanceof Error ? error.message : 'Unable to send outreach.');
    }
  };

  const proofSignals = useMemo(
    () =>
      [
        detail?.launch.metrics,
        detail?.launch.customerSummary,
        ...(detail?.launch.founderSignals ?? []),
        detail?.launch.stage,
      ].filter((item): item is string => Boolean(item?.trim())),
    [detail],
  );

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#fbfaf7] px-5 py-20 text-black sm:px-8">
        <p className="text-sm font-semibold text-[#42520d]">Loading project profile...</p>
      </main>
    );
  }

  if (!detail) {
    return (
      <main className="min-h-screen bg-[#fbfaf7] px-5 py-20 text-black sm:px-8">
        <section className="mx-auto max-w-[92rem]">
          <LogoIcon className="mb-10 h-8 w-8 text-black" />
          <h1 className="max-w-3xl text-5xl font-normal leading-none tracking-[-0.045em] md:text-7xl" style={serifDisplay}>
            Project not found.
          </h1>
          <Link to="/" className="mt-10 inline-flex rounded-full bg-[#dcefc7] px-6 py-3 text-sm font-semibold text-black">
            Back to launches
          </Link>
        </section>
      </main>
    );
  }

  const { launch, founder, teamMembers } = detail;
  const domain = getDomain(launch.launchUrl || launch.proofUrl);
  const founderName = founder?.profileName || 'Founder on Apparent';

  return (
    <main className="overflow-x-hidden bg-[#fbfaf7] text-black">
      <section className="mx-auto max-w-[92rem] px-5 pb-14 pt-14 sm:px-8 md:pt-20">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-end">
          <div>
            <div className="mb-8 flex items-center gap-3">
              <img
                src={launch.logoUrl || `https://www.google.com/s2/favicons?domain=${domain}&sz=128`}
                alt=""
                className="h-14 w-14 rounded-[18px] bg-white object-contain p-3 shadow-sm"
              />
              <div>
                <p className="text-sm font-semibold text-[#42520d]">{launch.category || 'Project profile'}</p>
                <p className="mt-1 text-sm text-black/50">{launch.stage || 'Live on Apparent'}</p>
              </div>
            </div>
            <h1
              className="max-w-[76rem] text-[3.4rem] font-normal leading-[0.88] tracking-[-0.055em] sm:text-[7rem] md:text-[8.5rem] lg:text-[9.5rem]"
              style={serifDisplay}
            >
              {launch.name}
            </h1>
            <p className="mt-10 max-w-3xl text-lg leading-8 text-black/65 md:text-xl">
              {launch.intro || launch.tagline}
            </p>
          </div>

          <aside className="rounded-[24px] bg-white/75 p-5 shadow-[0_14px_44px_rgba(0,0,0,0.05)]">
            <p className="text-sm font-semibold text-[#42520d]">Launched by</p>

            {/* Founder card — entire row is one clickable link */}
            <Link
              to={`/profile/${founder?.userId || launch.ownerId}`}
              className="mt-4 flex items-center gap-3 rounded-[18px] p-2 -mx-2 transition-colors hover:bg-[#f4f1eb] group"
            >
              {/* Avatar */}
              <VerifiedAvatar
                src={founder?.profilePhotoUrl}
                name={founderName}
                size="md"
                verified={founder?.githubVerified}
              />

              {/* Name + headline */}
              <div className="min-w-0 flex-1">
                <p className="text-base font-semibold leading-tight group-hover:text-[#42520d] transition-colors">
                  {founderName}
                </p>
                <p className="mt-1 truncate text-sm text-black/50">
                  {founder?.headline || founder?.currentBuild || launch.tagline}
                </p>
              </div>

              {/* Arrow hint */}
              <ArrowUpRight className="h-4 w-4 shrink-0 text-black/25 transition-colors group-hover:text-[#42520d]" />
            </Link>
            <div className="mt-5 grid gap-3">
              {launch.launchUrl && (
                <a href={launch.launchUrl} target="_blank" rel="noreferrer" className="inline-flex justify-center rounded-full bg-[#42520d] px-5 py-3 text-sm font-semibold text-white hover:bg-[#34420a]">
                  Visit website <ArrowUpRight className="ml-2 h-4 w-4" />
                </a>
              )}
              {launch.proofUrl && (
                <a href={launch.proofUrl} target="_blank" rel="noreferrer" className="inline-flex justify-center rounded-full bg-[#dcefc7] px-5 py-3 text-sm font-semibold text-black hover:bg-[#cce8ae]">
                  View proof <ArrowUpRight className="ml-2 h-4 w-4" />
                </a>
              )}
              {/* Outreach: only shown to logged-in investors viewing someone else's
                  launch. Sends a canned DM via the existing user_messages system. */}
              {currentUser?.role === 'investor' && currentUser.id !== launch.ownerId && (
                <>
                  {outreachStatus === 'sent' ? (
                    <button
                      type="button"
                      onClick={() => navigate('/dashboard/investor/messages')}
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-[#42520d]/30 bg-white px-5 py-3 text-sm font-semibold text-[#42520d] hover:bg-[#f4f1eb]"
                    >
                      <MessageCircle className="h-4 w-4" /> Outreach sent · open inbox
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSendOutreach}
                      disabled={outreachStatus === 'sending'}
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-black px-5 py-3 text-sm font-semibold text-white hover:bg-black/85 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <MessageCircle className="h-4 w-4" />
                      {outreachStatus === 'sending' ? 'Sending…' : 'Send outreach DM'}
                    </button>
                  )}
                  {outreachError && (
                    <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{outreachError}</p>
                  )}
                </>
              )}
              {!currentUser && (
                <Link
                  to="/login?role=investor"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-semibold text-black hover:bg-[#f4f1eb]"
                >
                  <MessageCircle className="h-4 w-4" /> Sign in to send outreach
                </Link>
              )}
            </div>
          </aside>
        </div>
      </section>

      {launch.bannerUrl && (
        <section className="mx-auto max-w-[92rem] px-5 pb-10 sm:px-8">
          <div className="h-[320px] overflow-hidden rounded-[32px] bg-[#d7d0c0] md:h-[460px]">
            <img src={launch.bannerUrl} alt="" className="h-full w-full object-cover" />
          </div>
        </section>
      )}

      <section className="mx-auto max-w-[92rem] border-t border-black/10 px-5 py-16 sm:px-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['Location', launch.location || founder?.location || 'Not provided', MapPin],
            ['Momentum', launch.metrics || 'Not provided', Star],
            ['Tech stack', launch.techStack || 'Not provided', GitHubIcon],
            ['Funding', launch.fundingStatus || 'Not provided', Globe2],
          ].map(([label, value, Icon]) => (
            <article key={String(label)} className="rounded-[24px] bg-white/70 p-5">
              <Icon className="mb-5 h-4 w-4 text-[#42520d]" />
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-black/40">{String(label)}</p>
              <p className="mt-3 text-sm leading-6 text-black/65">{String(value)}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-[92rem] gap-8 border-t border-black/10 px-5 py-16 sm:px-8 lg:grid-cols-3">
        <article className="rounded-[28px] bg-white/70 p-6 lg:col-span-2">
          <h2 className="text-3xl font-normal tracking-[-0.035em]" style={serifDisplay}>
            Proof signals
          </h2>
          <div className="mt-6 grid gap-3">
            {proofSignals.map((signal) => (
              <div key={signal} className="flex items-start gap-3 text-sm leading-7 text-black/60">
                <Star className="mt-1 h-4 w-4 shrink-0 text-[#42520d]" />
                <span>{signal}</span>
              </div>
            ))}
          </div>
        </article>
        <article className="rounded-[28px] bg-white/70 p-6">
          <h2 className="text-3xl font-normal tracking-[-0.035em]" style={serifDisplay}>
            Looking for
          </h2>
          <p className="mt-6 text-sm leading-7 text-black/60">
            {launch.lookingFor || founder?.lookingFor || 'The founder has not specified what they are looking for yet.'}
          </p>
        </article>
      </section>

      <section className="mx-auto max-w-[92rem] border-t border-black/10 px-5 py-16 sm:px-8">
        <p className="mb-12 text-sm font-semibold text-[#42520d]">Team</p>
        <div className="grid gap-6 md:grid-cols-3">
          {(teamMembers.length ? teamMembers : []).map((member) => (
            <article key={`${member.name}-${member.role}`} className="rounded-[28px] bg-white/70 p-6">
              <div className="flex items-center gap-3">
                {member.avatarUrl ? (
                  <img src={member.avatarUrl} alt="" className="h-12 w-12 rounded-2xl object-cover" />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#dcefc7] text-sm font-semibold">
                    {member.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-semibold">{member.name}</h3>
                  <p className="mt-1 text-sm text-black/50">{member.role || 'Team member'}</p>
                </div>
              </div>
              <p className="mt-5 text-sm leading-7 text-black/60">{member.bio || 'Team context has not been added yet.'}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {(member.apparentUserId || member.profileUrl) && (
                  <Link to={member.apparentUserId ? `/profile/${member.apparentUserId}` : member.profileUrl} className="rounded-full bg-[#dcefc7] px-3 py-1.5 text-xs font-semibold text-black">
                    Apparent profile
                  </Link>
                )}
                {member.linkedinUrl && (
                  <a href={member.linkedinUrl} target="_blank" rel="noreferrer" className="rounded-full bg-[#fbfaf7] px-3 py-1.5 text-xs font-semibold text-black/60">
                    <LinkIcon className="mr-1 inline h-3.5 w-3.5" />
                    LinkedIn
                  </a>
                )}
              </div>
            </article>
          ))}
          {teamMembers.length === 0 && (
            <div className="rounded-[28px] bg-white/70 p-6 text-sm leading-7 text-black/60 md:col-span-3">
              <Users className="mb-5 h-5 w-5 text-[#42520d]" />
              Team members have not been added yet.
            </div>
          )}
        </div>
        {launch.teamSummary && <p className="mt-8 max-w-3xl text-sm leading-7 text-black/60">{launch.teamSummary}</p>}
      </section>

      {(launch.demoVideoUrl || launch.pitchVideoUrl || launch.pitchDeckUrl || launch.pitchBookNote) && (
        <section className="mx-auto max-w-[92rem] border-t border-black/10 px-5 py-16 sm:px-8">
          <p className="mb-12 text-sm font-semibold text-[#42520d]">Media and pitch book</p>
          <div className="grid gap-6 lg:grid-cols-2">
            {launch.demoVideoUrl && <video className="aspect-video w-full rounded-[24px] bg-black object-cover" src={launch.demoVideoUrl} controls />}
            {launch.pitchVideoUrl && <video className="aspect-video w-full rounded-[24px] bg-black object-cover" src={launch.pitchVideoUrl} controls />}
            {(launch.pitchDeckUrl || launch.pitchBookNote) && (
              <article className="rounded-[28px] bg-white/70 p-6 lg:col-span-2">
                <FileText className="mb-5 h-5 w-5 text-[#42520d]" />
                <p className="text-sm leading-7 text-black/60">{launch.pitchBookNote || 'Pitch material attached.'}</p>
                {launch.pitchDeckUrl && (
                  <a href={launch.pitchDeckUrl} target="_blank" rel="noreferrer" className="mt-5 inline-flex rounded-full bg-[#dcefc7] px-4 py-2 text-sm font-semibold text-black">
                    Open pitch deck <ArrowUpRight className="ml-2 h-4 w-4" />
                  </a>
                )}
              </article>
            )}
          </div>
        </section>
      )}
    </main>
  );
};
