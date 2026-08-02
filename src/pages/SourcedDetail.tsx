import { useEffect, useState, type ElementType, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import {
  ArrowUpRight,
  CalendarDays,
  Globe2,
  Layers,
  Link as LinkIcon,
  Loader2,
  MapPin,
  Search,
  ShieldAlert,
  Sparkles,
  Tag,
  Users,
} from 'lucide-react';
import { GitHubIcon } from '@/components/GitHubIcon';
import { useAgentAuthHeaders } from '@/lib/agent-auth';
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

/** One row of the page's property table. */
const Prop = ({ icon: Icon, label, children }: { icon: ElementType; label: string; children: ReactNode }) => (
  <div className="ap-prop">
    <span className="ap-prop-key">
      <Icon /> {label}
    </span>
    <div className="ap-prop-val">{children}</div>
  </div>
);

/** Property values we looked for but could not establish read as empty, not absent. */
const Unknown = ({ children = 'Unknown' }: { children?: ReactNode }) => (
  <span className="text-[var(--ed-smoke)]">{children}</span>
);

const ExtLink = ({ href, children }: { href: string; children: ReactNode }) => (
  <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1">
    {children}
    <ArrowUpRight className="h-3 w-3 shrink-0 opacity-45" />
  </a>
);

/**
 * Investor-facing detail page for a sourced (agent-discovered) startup, laid out
 * as a document: page icon, title, property table, then research blocks flowing
 * down a single measured column.
 *
 * Nothing here is verified, so the page states that rather than styling around
 * it — a "Sourced · unverified" property at the top and a closing callout.
 */
export const SourcedDetail = () => {
  const { signalId = '' } = useParams();
  const authHeaders = useAgentAuthHeaders();
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
    const result = await enrichSourcedStartup(startup.id, authHeaders);
    if (result.ok) setDossier(result.dossier);
    else setEnrichError(result.error || 'Could not build the deep dive. Try again.');
    setEnriching(false);
  };

  if (isLoading) {
    return (
      <main className="ap-doc ed-inner">
        <div className="ap-profile-skeleton h-[72px] w-[72px] rounded-2xl" />
        <div className="ap-profile-skeleton mt-5 h-11 w-2/3 max-w-md rounded" />
        <div className="ap-profile-skeleton mt-4 h-5 w-full max-w-xl rounded" />
        <div className="ap-profile-skeleton mt-8 h-40 w-full rounded" />
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

  return (
    <main className="ap-doc ed-inner">
      {/* ── Page header ── */}
      {domain ? (
        <img
          src={`https://www.google.com/s2/favicons?domain=${domain}&sz=128`}
          alt=""
          className="ap-doc-icon"
          onError={(e) => {
            e.currentTarget.style.visibility = 'hidden';
          }}
        />
      ) : (
        <div className="ap-doc-icon-fallback">{startup.company.slice(0, 1).toUpperCase()}</div>
      )}

      <h1 className="ap-doc-title">{startup.company}</h1>
      {startup.detail && <p className="ap-doc-lede">{startup.detail}</p>}

      {/* ── Page properties ── */}
      <div className="ap-props">
        <Prop icon={ShieldAlert} label="Status">
          <span className="ap-profile-tag ap-profile-tag--accent">Sourced · unverified</span>
        </Prop>

        {startup.profileUrl && (
          <Prop icon={Globe2} label="Website">
            <ExtLink href={startup.profileUrl}>{getDomain(startup.profileUrl) || startup.profileUrl}</ExtLink>
          </Prop>
        )}

        {startup.sourceUrl && (
          <Prop icon={LinkIcon} label="Original source">
            <ExtLink href={startup.sourceUrl}>{getDomain(startup.sourceUrl) || startup.sourceUrl}</ExtLink>
          </Prop>
        )}

        {startup.githubUrl && (
          <Prop icon={GitHubIcon} label="GitHub">
            <ExtLink href={startup.githubUrl}>
              {startup.githubUrl.replace(/^https?:\/\/(www\.)?github\.com\//i, '') || 'Repository'}
            </ExtLink>
          </Prop>
        )}

        <Prop icon={Layers} label="Stage">
          {startup.stage || <Unknown />}
        </Prop>

        <Prop icon={MapPin} label="Location">
          {startup.location || <Unknown />}
        </Prop>

        <Prop icon={Users} label="Founder">
          {startup.founder || <Unknown>Not identified</Unknown>}
        </Prop>

        {startup.tags.length > 0 && (
          <Prop icon={Tag} label="Sectors">
            <div className="ap-prop-chips">
              {startup.tags.map((tag) => (
                <span key={tag} className="ap-profile-tag">
                  {tag}
                </span>
              ))}
            </div>
          </Prop>
        )}

        <Prop icon={Search} label="Discovered via">
          {startup.sourceType || 'Web'}
        </Prop>

        <Prop icon={CalendarDays} label="Discovered">
          {formatDate(startup.freshnessAt)}
        </Prop>
      </div>

      <hr className="ap-doc-rule" />

      {/* ── Deep dive ── */}
      <section className="ap-doc-section">
        <div className="ap-doc-head">
          <h2 className="ap-doc-h2">Deep dive</h2>
          {dossier && (
            <span className="ap-profile-tag">
              <Sparkles className="h-3.5 w-3.5" /> AI research
            </span>
          )}
        </div>

        {dossier ? (
          <>
            <p className="ap-doc-p">{dossier.summary}</p>
            {dossier.whatTheyBuild && <p className="ap-doc-p">{dossier.whatTheyBuild}</p>}

            {(dossier.traction?.length ?? 0) > 0 && (
              <section className="ap-doc-section">
                <h3 className="ap-doc-h3">Traction signals</h3>
                <div className="ap-doc-list">
                  {dossier.traction!.map((item) => (
                    <div key={item} className="ap-doc-li">
                      <span className="ap-doc-li-dot" />
                      <p>{item}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {dossier.thesisFit && (
              <section className="ap-doc-section">
                <h3 className="ap-doc-h3">Thesis fit &amp; risk</h3>
                <p className="ap-doc-p">{dossier.thesisFit}</p>
              </section>
            )}

            {(dossier.team?.length ?? 0) > 0 && (
              <section className="ap-doc-section">
                <h3 className="ap-doc-h3">Team</h3>
                <div className="grid gap-3.5">
                  {dossier.team!.map((member) => (
                    <div key={member.name}>
                      <p className="text-[15px] font-semibold text-[var(--ed-ink)]">
                        {member.name}
                        {member.role && (
                          <span className="font-normal text-[var(--ed-smoke)]"> — {member.role}</span>
                        )}
                      </p>
                      {member.note && (
                        <p className="mt-1 max-w-[66ch] text-sm leading-relaxed text-[var(--ed-graphite)]">
                          {member.note}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {(dossier.sources?.length ?? 0) > 0 && (
              <section className="ap-doc-section">
                <h3 className="ap-doc-h3">Sources</h3>
                <div className="ap-prop-chips">
                  {dossier.sources!.map((s) => (
                    <a key={s.url} className="ap-profile-tag" href={s.url} target="_blank" rel="noreferrer">
                      <LinkIcon className="h-3 w-3" /> {s.label || getDomain(s.url) || 'link'}
                    </a>
                  ))}
                </div>
              </section>
            )}

            <p className="mt-6 text-xs text-[var(--ed-smoke)]">
              AI-generated from public sources — verify before acting.
            </p>
          </>
        ) : (
          <div className="ap-callout">
            <Sparkles />
            <div className="min-w-0">
              <p>
                Apparent's research agent will dig into this company — team, traction, and why it fits
                your thesis — from public sources.
              </p>
              <button
                type="button"
                className="ed-btn ed-btn-filled mt-3.5"
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
                <p className="mt-2.5 text-xs">This takes ~20–40 seconds while the agent reads the web.</p>
              )}
              {enrichError && <p className="mt-2.5 text-[13px] text-[var(--ed-ember)]">{enrichError}</p>}
            </div>
          </div>
        )}
      </section>

      <hr className="ap-doc-rule" />

      <div className="ap-callout">
        <ShieldAlert />
        <p>
          Discovered by Apparent's sourcing agent from public signals. Not verified or claimed by the
          founder — treat as a lead, not vetted dealflow.
        </p>
      </div>
    </main>
  );
};
