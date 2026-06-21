import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowUpRight, FileText, Globe2, Link as LinkIcon, MapPin, MessageCircle, Star, Users } from 'lucide-react';
import { GitHubIcon } from '@/components/GitHubIcon';
import type { AppUser, PublicProjectDetail } from '@/lib/apparent-types';
import { loadPublicProjectDetail, saveMessage } from '@/lib/dashboard-service';
import { getCurrentAppUser } from '@/lib/auth-service';
import { VerifiedAvatar } from '@/components/VerifiedAvatar';
import NotFound4042 from '@/components/4042';

const getDomain = (url: string) => {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return 'apparent.social';
  }
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
      setDetail(loadedDetail);
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
      <section className="ed-sec ed-inner"><p className="ed-lead">Loading project profile...</p></section>
    );
  }

  if (!detail) {
    return (
      <NotFound4042 title="Project not found" message="That launch is unavailable or does not exist on Apparent yet." primaryLabel="Back to launches" />
    );
  }

  const { launch, founder, teamMembers } = detail;
  const domain = getDomain(launch.launchUrl || launch.proofUrl);
  const founderName = founder?.profileName || 'Founder on Apparent';

  return (
    <main>
      {/* HERO */}
      <section className="ed-subhero ed-inner">
        <div style={{ display: 'grid', gap: 32, gridTemplateColumns: 'minmax(0,1fr) 22rem', alignItems: 'end' }} className="ed-proj-hero">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <img src={launch.logoUrl || `https://www.google.com/s2/favicons?domain=${domain}&sz=128`} alt="" style={{ width: 52, height: 52, borderRadius: 'var(--ed-r)', background: 'var(--ed-paper)', objectFit: 'contain', padding: 10 }} />
              <div>
                <p style={{ fontSize: 14, fontWeight: 600 }}>{launch.category || 'Project profile'}</p>
                <p style={{ marginTop: 2, fontSize: 13, color: 'var(--ed-smoke)' }}>{launch.stage || 'Live on Apparent'}</p>
              </div>
            </div>
            <h1 className="ed-display" style={{ fontSize: 'clamp(2.6rem,8vw,96px)', maxWidth: '14ch' }}>{launch.name}</h1>
            <p className="ed-lede">{launch.intro || launch.tagline}</p>
          </div>

          <aside className="ed-pp-panel">
            <p style={{ fontSize: 13, fontWeight: 600, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--ed-smoke)' }}>Launched by</p>
            <Link to={`/profile/${founder?.userId || launch.ownerId}`} className="ed-row" style={{ marginTop: 14, background: 'var(--ed-canvas)', borderColor: 'var(--ed-fog)' }}>
              <VerifiedAvatar src={founder?.profilePhotoUrl} name={founderName} size="md" verified={founder?.githubVerified} />
              <div className="ed-who" style={{ flex: 1 }}>
                <b style={{ color: 'var(--ed-ink)' }}>{founderName}</b>
                <span style={{ color: 'var(--ed-smoke)' }}>{founder?.headline || founder?.currentBuild || launch.tagline}</span>
              </div>
              <ArrowUpRight style={{ width: 16, height: 16, color: 'var(--ed-ash)' }} />
            </Link>
            <div style={{ marginTop: 18, display: 'grid', gap: 10 }}>
              {launch.launchUrl && (
                <a className="ed-btn ed-btn-filled ed-block" href={launch.launchUrl} target="_blank" rel="noreferrer">Visit website <ArrowUpRight style={{ width: 16, height: 16 }} /></a>
              )}
              {launch.proofUrl && (
                <a className="ed-btn ed-btn-outline ed-block" href={launch.proofUrl} target="_blank" rel="noreferrer">View proof <ArrowUpRight style={{ width: 16, height: 16 }} /></a>
              )}
              {currentUser?.role === 'investor' && currentUser.id !== launch.ownerId && (
                <>
                  {outreachStatus === 'sent' ? (
                    <button type="button" className="ed-btn ed-btn-outline ed-block" onClick={() => navigate('/dashboard/investor/messages')}>
                      <MessageCircle style={{ width: 16, height: 16 }} /> Outreach sent · open inbox
                    </button>
                  ) : (
                    <button type="button" className="ed-btn ed-btn-filled ed-block" onClick={handleSendOutreach} disabled={outreachStatus === 'sending'}>
                      <MessageCircle style={{ width: 16, height: 16 }} /> {outreachStatus === 'sending' ? 'Sending…' : 'Send outreach DM'}
                    </button>
                  )}
                  {outreachError && <p style={{ fontSize: 12, color: 'var(--ed-ember)' }}>{outreachError}</p>}
                </>
              )}
              {!currentUser && (
                <Link className="ed-btn ed-btn-outline ed-block" to="/login?role=investor"><MessageCircle style={{ width: 16, height: 16 }} /> Sign in to send outreach</Link>
              )}
            </div>
          </aside>
        </div>
      </section>

      {launch.bannerUrl && (
        <section className="ed-inner" style={{ paddingBottom: 40 }}>
          <div style={{ height: 380, overflow: 'hidden', borderRadius: 'var(--ed-r-feature)', background: 'var(--ed-fog)' }}>
            <img src={launch.bannerUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        </section>
      )}

      {/* STATS */}
      <section className="ed-sec ed-divider ed-inner">
        <div className="ed-benefits" style={{ marginTop: 0 }}>
          {([['Location', launch.location || founder?.location || 'Not provided', MapPin], ['Momentum', launch.metrics || 'Not provided', Star], ['Tech stack', launch.techStack || 'Not provided', GitHubIcon], ['Funding', launch.fundingStatus || 'Not provided', Globe2]] as const).map(([label, value, Icon]) => (
            <article className="ed-infocard" key={String(label)}>
              <Icon style={{ width: 18, height: 18, color: 'var(--ed-ink)', marginBottom: 14 }} />
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--ed-smoke)' }}>{String(label)}</div>
              <p style={{ marginTop: 8 }}>{String(value)}</p>
            </article>
          ))}
        </div>
      </section>

      {/* PROOF + LOOKING FOR */}
      <section className="ed-sec ed-divider ed-inner">
        <div style={{ display: 'grid', gap: 20, gridTemplateColumns: '2fr 1fr' }} className="ed-proj-cols">
          <article className="ed-infocard">
            <h2 className="ed-sec-title" style={{ fontSize: 'clamp(1.5rem,3vw,28px)' }}>Proof signals</h2>
            <div style={{ marginTop: 18, display: 'grid', gap: 12 }}>
              {proofSignals.map((signal) => (
                <div key={signal} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', fontSize: 14, lineHeight: 1.6, color: 'var(--ed-graphite)' }}>
                  <Star style={{ width: 16, height: 16, marginTop: 3, flexShrink: 0, color: 'var(--ed-ink)' }} /> <span>{signal}</span>
                </div>
              ))}
            </div>
          </article>
          <article className="ed-infocard">
            <h2 className="ed-sec-title" style={{ fontSize: 'clamp(1.5rem,3vw,28px)' }}>Looking for</h2>
            <p style={{ marginTop: 18 }}>{launch.lookingFor || founder?.lookingFor || 'The founder has not specified what they are looking for yet.'}</p>
          </article>
        </div>
      </section>

      {/* TEAM */}
      <section className="ed-sec ed-divider ed-inner">
        <div className="ed-infocards">
          {teamMembers.map((member) => (
            <article className="ed-infocard" key={`${member.name}-${member.role}`}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {member.avatarUrl ? (
                  <img src={member.avatarUrl} alt="" style={{ width: 48, height: 48, borderRadius: 'var(--ed-r)', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: 48, height: 48, borderRadius: 'var(--ed-r)', background: 'var(--ed-canvas)', display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 600 }}>{member.name.slice(0, 2).toUpperCase()}</div>
                )}
                <div><h3 style={{ fontSize: 16, fontWeight: 600 }}>{member.name}</h3><p style={{ marginTop: 2, fontSize: 13, color: 'var(--ed-smoke)' }}>{member.role || 'Team member'}</p></div>
              </div>
              <p style={{ marginTop: 14 }}>{member.bio || 'Team context has not been added yet.'}</p>
              <div style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {(member.apparentUserId || member.profileUrl) && (
                  <Link className="ed-proof" to={member.apparentUserId ? `/profile/${member.apparentUserId}` : member.profileUrl}>Apparent profile</Link>
                )}
                {member.linkedinUrl && (
                  <a className="ed-proof" href={member.linkedinUrl} target="_blank" rel="noreferrer"><LinkIcon style={{ width: 13, height: 13 }} /> LinkedIn</a>
                )}
              </div>
            </article>
          ))}
          {teamMembers.length === 0 && (
            <div className="ed-infocard"><Users style={{ width: 20, height: 20, color: 'var(--ed-ink)', marginBottom: 12 }} /><p>Team members have not been added yet.</p></div>
          )}
        </div>
        {launch.teamSummary && <p style={{ marginTop: 24, maxWidth: '60ch', fontSize: 14, lineHeight: 1.6, color: 'var(--ed-graphite)' }}>{launch.teamSummary}</p>}
      </section>

      {(launch.demoVideoUrl || launch.pitchVideoUrl || launch.pitchDeckUrl || launch.pitchBookNote) && (
        <section className="ed-sec ed-divider ed-inner">
          <div style={{ display: 'grid', gap: 20, gridTemplateColumns: '1fr 1fr' }} className="ed-proj-cols">
            {launch.demoVideoUrl && <video style={{ aspectRatio: '16/9', width: '100%', borderRadius: 'var(--ed-r-feature)', background: '#000', objectFit: 'cover' }} src={launch.demoVideoUrl} controls />}
            {launch.pitchVideoUrl && <video style={{ aspectRatio: '16/9', width: '100%', borderRadius: 'var(--ed-r-feature)', background: '#000', objectFit: 'cover' }} src={launch.pitchVideoUrl} controls />}
            {(launch.pitchDeckUrl || launch.pitchBookNote) && (
              <article className="ed-infocard" style={{ gridColumn: '1 / -1' }}>
                <FileText style={{ width: 20, height: 20, color: 'var(--ed-ink)', marginBottom: 12 }} />
                <p>{launch.pitchBookNote || 'Pitch material attached.'}</p>
                {launch.pitchDeckUrl && (
                  <a className="ed-btn ed-btn-filled" href={launch.pitchDeckUrl} target="_blank" rel="noreferrer" style={{ marginTop: 16 }}>Open pitch deck <ArrowUpRight style={{ width: 16, height: 16 }} /></a>
                )}
              </article>
            )}
          </div>
        </section>
      )}
    </main>
  );
};
