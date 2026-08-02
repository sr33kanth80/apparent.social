import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowUpRight, Globe2, Link as LinkIcon, Loader2, MapPin, Sparkles, Star, Tag, Users } from 'lucide-react';
import { GitHubIcon } from '@/components/GitHubIcon';
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

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="ap-profile-label">{children}</p>
);

/**
 * Investor-facing detail page for a sourced (agent-discovered) startup.
 *
 * Same two-column dossier as a founder's public profile — sticky identity rail,
 * scrolling evidence stream — so a sourced lead and a claimed profile read as
 * the same kind of document. The difference is stated, not styled: nothing here
 * is verified, so the rail carries a "Sourced · unverified" mark and the stream
 * leads with whatever the agent actually found.
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
    return (
      <main className="ap-dossier ed-inner">
        <aside className="ap-rail">
          <div className="ap-profile-skeleton h-20 w-20 rounded-[18px]" />
          <div className="ap-profile-skeleton h-8 w-2/3 rounded" />
          <div className="ap-profile-skeleton h-4 w-1/2 rounded" />
        </aside>
        <div className="ap-stream">
          <div className="space-y-3">
            <div className="ap-profile-skeleton h-7 w-3/4 rounded" />
            <div className="ap-profile-skeleton h-7 w-1/2 rounded" />
          </div>
        </div>
      </main>
    );
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

  const domain = getDomain(startup.profileUrl || startup.sourceUrl);

  // The pitch is the largest type on the page — but `detail` is free text from a
  // scrape, so a paragraph-length one drops to body size rather than blowing the
  // column out to several lines of 52px serif.
  const pitch = startup.detail || 'No description captured yet.';
  const pitchClass = pitch.length <= 150 ? 'ap-lede' : 'ed-lede';

  // Stage and location are already tags in the rail, so they stay out of here.
  // Three facts also fill the auto-fit grid exactly — a wrapped row would leave
  // uncovered cells showing the container's hairline colour as a solid block.
  const facts = [
    { label: 'Founder', value: startup.founder || 'Not identified' },
    { label: 'Source', value: startup.sourceType || 'Web' },
    { label: 'Discovered', value: formatDate(startup.freshnessAt) },
  ];

  return (
    <main className="ap-dossier ed-inner">
      {/* ── Identity rail — sticks while the evidence scrolls past ── */}
      <aside className="ap-rail">
        <div className="ap-rail-id">
          {domain ? (
            <img
              src={`https://www.google.com/s2/favicons?domain=${domain}&sz=128`}
              alt=""
              className="h-20 w-20 rounded-[18px] border border-[var(--ed-fog)] bg-[var(--ed-paper)] object-contain p-3.5"
              onError={(e) => {
                e.currentTarget.style.visibility = 'hidden';
              }}
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-[18px] bg-[var(--ed-ink)] text-2xl text-[var(--ed-paper)]">
              {startup.company.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="ap-rail-name">{startup.company}</h1>
            {domain && <p className="ap-rail-handle">{domain}</p>}
          </div>
        </div>

        <div className="ap-rail-meta">
          <span className="ap-profile-tag ap-profile-tag--accent">
            <Globe2 className="h-3.5 w-3.5" /> Sourced · unverified
          </span>
          {startup.stage && <span className="ap-profile-tag">{startup.stage}</span>}
          {startup.location && (
            <span className="ap-profile-location">
              <MapPin className="h-3.5 w-3.5" /> {startup.location}
            </span>
          )}
        </div>

        <div className="ap-rail-actions">
          {startup.profileUrl && (
            <a
              className="ed-btn ed-btn-filled ap-profile-action"
              href={startup.profileUrl}
              target="_blank"
              rel="noreferrer"
            >
              Visit website <ArrowUpRight className="h-4 w-4" />
            </a>
          )}
          {startup.sourceUrl && (
            <a
              className="ed-btn ed-btn-outline ap-profile-action"
              href={startup.sourceUrl}
              target="_blank"
              rel="noreferrer"
            >
              View original source <ArrowUpRight className="h-4 w-4" />
            </a>
          )}
          {startup.githubUrl && (
            <a
              className="ed-btn ed-btn-outline ap-profile-action"
              href={startup.githubUrl}
              target="_blank"
              rel="noreferrer"
            >
              <GitHubIcon className="h-4 w-4" /> GitHub <ArrowUpRight className="h-4 w-4" />
            </a>
          )}
        </div>

        <p className="text-xs leading-relaxed text-[var(--ed-smoke)]">
          Discovered by Apparent's sourcing agent from public signals. Not verified or claimed by the
          founder — treat as a lead, not vetted dealflow.
        </p>
      </aside>

      {/* ── Evidence stream — ordered by what an investor came to find out ── */}
      <div className="ap-stream">
        {/* 1. What is this company? */}
        <section className="ap-block">
          <p className={pitchClass}>{pitch}</p>
        </section>

        {/* 2. Is it worth the time? The agent dossier carries the page. */}
        <section className="ap-block">
          <div className="ap-block-head">
            <SectionLabel>Deep dive</SectionLabel>
            {dossier && (
              <span className="ap-profile-tag">
                <Sparkles className="h-3.5 w-3.5" /> AI research
              </span>
            )}
          </div>

          {dossier ? (
            <div className="grid gap-5">
              <article className="ed-infocard">
                <p className="text-[15px] leading-relaxed text-[var(--ed-ink)]">{dossier.summary}</p>
                {dossier.whatTheyBuild && (
                  <p className="mt-4 text-sm leading-relaxed text-[var(--ed-graphite)]">
                    {dossier.whatTheyBuild}
                  </p>
                )}
              </article>

              {((dossier.traction?.length ?? 0) > 0 || dossier.thesisFit) && (
                <div className="grid gap-5 sm:grid-cols-2">
                  {(dossier.traction?.length ?? 0) > 0 && (
                    <article className="ed-infocard">
                      <b>Traction signals</b>
                      <div className="mt-3 grid gap-3">
                        {dossier.traction!.map((item) => (
                          <div key={item} className="flex items-start gap-2.5">
                            <Star className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ed-ink)]" />
                            <span className="text-sm leading-relaxed text-[var(--ed-graphite)]">{item}</span>
                          </div>
                        ))}
                      </div>
                    </article>
                  )}
                  {dossier.thesisFit && (
                    <article className="ed-infocard">
                      <b>Thesis fit &amp; risk</b>
                      <p>{dossier.thesisFit}</p>
                    </article>
                  )}
                </div>
              )}

              {(dossier.team?.length ?? 0) > 0 && (
                <article className="ed-infocard">
                  <b className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-[var(--ed-ink)]" /> Team
                  </b>
                  <div className="mt-3 grid gap-3.5">
                    {dossier.team!.map((member) => (
                      <div key={member.name}>
                        <p className="text-[15px] font-semibold text-[var(--ed-ink)]">
                          {member.name}
                          {member.role && (
                            <span className="font-normal text-[var(--ed-smoke)]"> — {member.role}</span>
                          )}
                        </p>
                        {member.note && (
                          <p className="mt-1 text-sm leading-relaxed text-[var(--ed-graphite)]">
                            {member.note}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </article>
              )}

              {(dossier.sources?.length ?? 0) > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-[var(--ed-smoke)]">Sources</span>
                  {dossier.sources!.map((s) => (
                    <a key={s.url} className="ap-profile-tag" href={s.url} target="_blank" rel="noreferrer">
                      <LinkIcon className="h-3 w-3" /> {s.label || getDomain(s.url) || 'link'}
                    </a>
                  ))}
                </div>
              )}

              <p className="text-xs text-[var(--ed-smoke)]">
                AI-generated from public sources — verify before acting.
              </p>
            </div>
          ) : (
            <article className="ed-infocard text-center">
              <Sparkles className="mx-auto h-5 w-5 text-[var(--ed-ink)]" />
              <p className="mx-auto mt-3 max-w-[52ch] text-sm leading-relaxed text-[var(--ed-graphite)]">
                Apparent's research agent will dig into this company — team, traction, and why it fits
                your thesis — from public sources.
              </p>
              <button
                type="button"
                className="ed-btn ed-btn-filled mt-5"
                onClick={handleEnrich}
                disabled={enriching}
              >
                {enriching ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Researching…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" /> Generate deep dive
                  </>
                )}
              </button>
              {enriching && (
                <p className="mt-3 text-xs text-[var(--ed-smoke)]">
                  This takes ~20–40 seconds while the agent reads the web.
                </p>
              )}
              {enrichError && <p className="mt-3 text-[13px] text-[var(--ed-ember)]">{enrichError}</p>}
            </article>
          )}
        </section>

        {/* 3. Where did this come from? */}
        <section className="ap-block">
          <div className="ap-block-head">
            <SectionLabel>Signals</SectionLabel>
          </div>
          <div className="ap-stats">
            {facts.map((f) => (
              <div key={f.label} className="ap-stat">
                <p className="ap-profile-micro">{f.label}</p>
                <p className="ap-stat-value">{f.value}</p>
              </div>
            ))}
          </div>
        </section>

        {startup.tags.length > 0 && (
          <section className="ap-block">
            <div className="ap-block-head">
              <SectionLabel>Sectors</SectionLabel>
            </div>
            <div className="flex flex-wrap gap-2">
              {startup.tags.map((tag) => (
                <span key={tag} className="ap-profile-tag">
                  <Tag className="h-3 w-3" /> {tag}
                </span>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
};
