import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowUpRight, Globe2, Link as LinkIcon, Loader2, MapPin, Sparkles, Star, Tag, Users } from 'lucide-react';
import { GitHubIcon } from '@/components/GitHubIcon';
import { VerifiedAvatar } from '@/components/VerifiedAvatar';
import type { SourcedDossier, SourcedStartup } from '@/lib/apparent-types';
import { enrichSourcedStartup, loadSourceSignalDetail } from '@/lib/dashboard-service';
import NotFound4042 from '@/components/4042';

const getDomain = (url: string) => {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return '';
  }
};

const formatDate = (iso: string) => {
  if (!iso) return 'Recently';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? 'Recently'
    : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

/**
 * Investor-facing detail page for a sourced (agent-discovered) startup, rendered
 * in the same editorial template as a native Apparent launch (ProjectDetail) but
 * explicitly marked "Sourced · unverified". No founder has claimed it, so there's
 * no outreach DM, team, or pitch material — instead we surface what the sourcing
 * agent found and link out to the original source. The "Deep dive" block is a
 * placeholder for Phase 2 agent enrichment.
 */
export const SourcedDetail = () => {
  const { signalId = '' } = useParams();
  const [startup, setStartup] = useState<SourcedStartup | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dossier, setDossier] = useState<SourcedDossier | null>(null);
  const [enriching, setEnriching] = useState(false);
  const [enrichError, setEnrichError] = useState('');

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    loadSourceSignalDetail(signalId).then((loaded) => {
      if (!isMounted) return;
      setStartup(loaded);
      setDossier(loaded?.dossier ?? null);
      setIsLoading(false);
    });
    return () => {
      isMounted = false;
    };
  }, [signalId]);

  const handleEnrich = async () => {
    if (!startup || enriching) return;
    setEnriching(true);
    setEnrichError('');
    const result = await enrichSourcedStartup(startup.id);
    if (result.ok) setDossier(result.dossier);
    else setEnrichError(result.error || 'Could not build the deep dive. Try again.');
    setEnriching(false);
  };

  if (isLoading) {
    return <section className="ed-sec ed-inner"><p className="ed-lead">Loading sourced profile...</p></section>;
  }

  if (!startup) {
    return (
      <NotFound4042
        title="Startup not found"
        message="That sourced lead is unavailable or no longer in Apparent's deal flow."
        primaryLabel="Back to deal flow"
      />
    );
  }

  const homepage = startup.profileUrl || startup.sourceUrl;
  const domain = getDomain(homepage);
  const founderName = startup.founder || 'Founding team';
  const category = startup.tags[0] || 'Sourced startup';

  return (
    <main>
      {/* HERO */}
      <section className="ed-subhero ed-inner">
        <div style={{ display: 'grid', gap: 32, gridTemplateColumns: 'minmax(0,1fr) 22rem', alignItems: 'end' }} className="ed-proj-hero">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <img src={domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=128` : ''} alt="" style={{ width: 52, height: 52, borderRadius: 'var(--ed-r)', background: 'var(--ed-paper)', objectFit: 'contain', padding: 10 }} onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />
              <div>
                <p style={{ fontSize: 14, fontWeight: 600 }}>{category}</p>
                <p style={{ marginTop: 2, fontSize: 13, color: 'var(--ed-smoke)' }}>{startup.stage || 'Sourced lead'}</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 999, background: 'var(--ed-paper)', border: '1px solid var(--ed-fog)', fontSize: 12, fontWeight: 600, color: 'var(--ed-smoke)' }}>
                <Globe2 style={{ width: 13, height: 13 }} /> Sourced · unverified
              </span>
            </div>
            <h1 className="ed-display" style={{ fontSize: 'clamp(2.6rem,8vw,96px)', maxWidth: '14ch' }}>{startup.company}</h1>
            <p className="ed-lede">{startup.detail}</p>
          </div>

          <aside className="ed-pp-panel">
            <p style={{ fontSize: 13, fontWeight: 600, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--ed-smoke)' }}>Sourced lead</p>
            <div className="ed-row" style={{ marginTop: 14, background: 'var(--ed-canvas)', borderColor: 'var(--ed-fog)' }}>
              <VerifiedAvatar src={undefined} name={founderName} size="md" verified={false} />
              <div className="ed-who" style={{ flex: 1 }}>
                <b style={{ color: 'var(--ed-ink)' }}>{founderName}</b>
                <span style={{ color: 'var(--ed-smoke)' }}>Discovered from {startup.sourceType || 'public'} signals</span>
              </div>
            </div>
            <div style={{ marginTop: 18, display: 'grid', gap: 10 }}>
              {startup.profileUrl && (
                <a className="ed-btn ed-btn-filled ed-block" href={startup.profileUrl} target="_blank" rel="noreferrer">Visit website <ArrowUpRight style={{ width: 16, height: 16 }} /></a>
              )}
              {startup.sourceUrl && (
                <a className="ed-btn ed-btn-outline ed-block" href={startup.sourceUrl} target="_blank" rel="noreferrer">View original source <ArrowUpRight style={{ width: 16, height: 16 }} /></a>
              )}
              {startup.githubUrl && (
                <a className="ed-btn ed-btn-outline ed-block" href={startup.githubUrl} target="_blank" rel="noreferrer"><GitHubIcon style={{ width: 16, height: 16 }} /> GitHub</a>
              )}
            </div>
            <p style={{ marginTop: 16, fontSize: 12, lineHeight: 1.5, color: 'var(--ed-smoke)' }}>
              Discovered by Apparent's sourcing agent from public signals. Not yet verified or claimed by the founder — treat as a lead, not vetted dealflow.
            </p>
          </aside>
        </div>
      </section>

      {/* STATS */}
      <section className="ed-sec ed-divider ed-inner">
        <div className="ed-benefits" style={{ marginTop: 0 }}>
          {([['Location', startup.location || 'Not provided', MapPin], ['Stage', startup.stage || 'Unknown', Star], ['Source', startup.sourceType || 'Web', Globe2], ['Discovered', formatDate(startup.freshnessAt), Sparkles]] as const).map(([label, value, Icon]) => (
            <article className="ed-infocard" key={String(label)}>
              <Icon style={{ width: 18, height: 18, color: 'var(--ed-ink)', marginBottom: 14 }} />
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--ed-smoke)' }}>{String(label)}</div>
              <p style={{ marginTop: 8 }}>{String(value)}</p>
            </article>
          ))}
        </div>
      </section>

      {/* WHAT THEY'RE BUILDING + TAGS */}
      <section className="ed-sec ed-divider ed-inner">
        <div style={{ display: 'grid', gap: 20, gridTemplateColumns: '2fr 1fr' }} className="ed-proj-cols">
          <article className="ed-infocard">
            <h2 className="ed-sec-title" style={{ fontSize: 'clamp(1.5rem,3vw,28px)' }}>What they're building</h2>
            <p style={{ marginTop: 18, fontSize: 15, lineHeight: 1.7, color: 'var(--ed-graphite)' }}>{startup.detail || 'No description captured yet.'}</p>
          </article>
          <article className="ed-infocard">
            <h2 className="ed-sec-title" style={{ fontSize: 'clamp(1.5rem,3vw,28px)' }}>Sectors</h2>
            <div style={{ marginTop: 18, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {startup.tags.length > 0 ? (
                startup.tags.map((tag) => (
                  <span key={tag} className="ed-proof"><Tag style={{ width: 13, height: 13 }} /> {tag}</span>
                ))
              ) : (
                <p style={{ color: 'var(--ed-smoke)' }}>No sectors tagged yet.</p>
              )}
            </div>
          </article>
        </div>
      </section>

      {/* DEEP DIVE — on-demand agent dossier (Phase 2, via /api/sourced-enrich) */}
      <section className="ed-sec ed-divider ed-inner">
        {dossier ? (
          <div style={{ display: 'grid', gap: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Sparkles style={{ width: 20, height: 20, color: 'var(--ed-ink)' }} />
              <h2 className="ed-sec-title" style={{ fontSize: 'clamp(1.5rem,3vw,28px)' }}>Deep dive</h2>
              <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--ed-smoke)' }}>AI research</span>
            </div>

            <article className="ed-infocard">
              <p style={{ fontSize: 16, lineHeight: 1.7, color: 'var(--ed-ink)' }}>{dossier.summary}</p>
              {dossier.whatTheyBuild && (
                <p style={{ marginTop: 16, fontSize: 15, lineHeight: 1.7, color: 'var(--ed-graphite)' }}>{dossier.whatTheyBuild}</p>
              )}
            </article>

            <div style={{ display: 'grid', gap: 20, gridTemplateColumns: '1fr 1fr' }} className="ed-proj-cols">
              {(dossier.traction?.length ?? 0) > 0 && (
                <article className="ed-infocard">
                  <h3 className="ed-sec-title" style={{ fontSize: 'clamp(1.3rem,3vw,22px)' }}>Traction signals</h3>
                  <div style={{ marginTop: 16, display: 'grid', gap: 12 }}>
                    {dossier.traction!.map((item) => (
                      <div key={item} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', fontSize: 14, lineHeight: 1.6, color: 'var(--ed-graphite)' }}>
                        <Star style={{ width: 16, height: 16, marginTop: 3, flexShrink: 0, color: 'var(--ed-ink)' }} /> <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </article>
              )}
              {dossier.thesisFit && (
                <article className="ed-infocard">
                  <h3 className="ed-sec-title" style={{ fontSize: 'clamp(1.3rem,3vw,22px)' }}>Thesis fit & risk</h3>
                  <p style={{ marginTop: 16, fontSize: 14, lineHeight: 1.7, color: 'var(--ed-graphite)' }}>{dossier.thesisFit}</p>
                </article>
              )}
            </div>

            {(dossier.team?.length ?? 0) > 0 && (
              <article className="ed-infocard">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Users style={{ width: 18, height: 18, color: 'var(--ed-ink)' }} />
                  <h3 className="ed-sec-title" style={{ fontSize: 'clamp(1.3rem,3vw,22px)' }}>Team</h3>
                </div>
                <div style={{ marginTop: 16, display: 'grid', gap: 14 }}>
                  {dossier.team!.map((member) => (
                    <div key={member.name}>
                      <p style={{ fontSize: 15, fontWeight: 600 }}>{member.name}{member.role ? <span style={{ color: 'var(--ed-smoke)', fontWeight: 400 }}> — {member.role}</span> : null}</p>
                      {member.note && <p style={{ marginTop: 4, fontSize: 14, lineHeight: 1.6, color: 'var(--ed-graphite)' }}>{member.note}</p>}
                    </div>
                  ))}
                </div>
              </article>
            )}

            {(dossier.sources?.length ?? 0) > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ed-smoke)' }}>Sources:</span>
                {dossier.sources!.map((s) => (
                  <a key={s.url} className="ed-proof" href={s.url} target="_blank" rel="noreferrer"><LinkIcon style={{ width: 13, height: 13 }} /> {s.label || getDomain(s.url) || 'link'}</a>
                ))}
              </div>
            )}
            <p style={{ fontSize: 12, color: 'var(--ed-smoke)' }}>AI-generated from public sources — verify before acting.</p>
          </div>
        ) : (
          <article className="ed-infocard" style={{ textAlign: 'center', padding: '40px 24px' }}>
            <Sparkles style={{ width: 22, height: 22, color: 'var(--ed-ink)', margin: '0 auto 14px' }} />
            <h2 className="ed-sec-title" style={{ fontSize: 'clamp(1.4rem,3vw,26px)' }}>Generate a deep dive</h2>
            <p style={{ maxWidth: '52ch', margin: '12px auto 0', color: 'var(--ed-smoke)', lineHeight: 1.6 }}>
              Apparent's research agent will dig into this company — team, traction, and why it fits your thesis — from public sources.
            </p>
            <button type="button" className="ed-btn ed-btn-filled" onClick={handleEnrich} disabled={enriching} style={{ marginTop: 20 }}>
              {enriching ? (<><Loader2 className="animate-spin" style={{ width: 16, height: 16 }} /> Researching…</>) : (<><Sparkles style={{ width: 16, height: 16 }} /> Generate deep dive</>)}
            </button>
            {enriching && <p style={{ marginTop: 12, fontSize: 12, color: 'var(--ed-smoke)' }}>This takes ~20–40 seconds while the agent reads the web.</p>}
            {enrichError && <p style={{ marginTop: 12, fontSize: 13, color: 'var(--ed-ember)' }}>{enrichError}</p>}
          </article>
        )}
      </section>
    </main>
  );
};
