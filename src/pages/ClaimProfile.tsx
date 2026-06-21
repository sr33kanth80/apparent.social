import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowUpRight, Sparkles, Star, Zap } from 'lucide-react';
import { EditorialNavbar } from '../components/editorial/EditorialNavbar';
import { EditorialFooter } from '../components/editorial/EditorialFooter';
import { loadBuilderInterestSummary, loadSourceSignal } from '../lib/dashboard-service';

/**
 * Public claim landing for an ingested (scraped) builder. Shown via a link sent
 * to a founder who isn't on Apparent yet: "N investors are interested in you —
 * claim your profile to connect." Closes the Discover growth loop.
 */
export const ClaimProfile = () => {
  const { signalId = '' } = useParams();
  const [params] = useSearchParams();
  const nameParam = params.get('name') || '';

  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState(nameParam);
  const [founder, setFounder] = useState('');
  const [summary, setSummary] = useState<{ likes: number; superlikes: number }>({ likes: 0, superlikes: 0 });

  useEffect(() => {
    let cancelled = false;
    const builderId = `signal:${signalId}`;
    Promise.all([loadSourceSignal(signalId), loadBuilderInterestSummary(builderId)])
      .then(([signal, interest]) => {
        if (cancelled) return;
        if (signal) {
          if (signal.company) setCompany(signal.company);
          setFounder(signal.founder);
        }
        setSummary(interest);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [signalId]);

  const total = summary.likes + summary.superlikes;
  const label = company || 'your work';

  return (
    <div className="ed-page">
      <EditorialNavbar />
      <main>
        <section className="ed-subhero ed-inner">
          <div style={{ maxWidth: 640 }}>
            <div className="ed-trust" style={{ marginTop: 0, marginBottom: 24 }}>
              <Sparkles style={{ width: 14, height: 14, color: 'var(--ed-ember)' }} /> <span>Apparent · investor interest</span>
            </div>

            {loading ? (
              <p className="ed-lede">Loading…</p>
            ) : total > 0 ? (
              <>
                <h1 className="ed-display" style={{ fontSize: 'clamp(2.2rem,6vw,64px)' }}>
                  {total} investor{total === 1 ? '' : 's'}{' '}
                  {summary.superlikes > 0 ? 'want to talk to you' : 'are interested in'}{' '}
                  <em>{company ? company : 'you'}.</em>
                </h1>
                <p className="ed-lede">
                  {founder ? `${founder.split(/\s+/)[0]}, ` : ''}we surfaced {label} from public signals and
                  thesis-fit investors have already flagged it on Apparent. Claim your profile to see who they
                  are and start the conversation.
                </p>

                <div className="ed-infocards" style={{ gridTemplateColumns: 'repeat(2,1fr)', marginTop: 32 }}>
                  <div className="ed-infocard" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <span style={{ display: 'grid', placeItems: 'center', width: 44, height: 44, borderRadius: 999, background: 'var(--ed-ink)', color: 'var(--ed-paper)' }}><Star style={{ width: 18, height: 18 }} fill="currentColor" /></span>
                    <div><div style={{ fontSize: 24, fontWeight: 600 }}>{summary.likes}</div><div style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--ed-smoke)' }}>Liked you</div></div>
                  </div>
                  <div className="ed-infocard" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <span style={{ display: 'grid', placeItems: 'center', width: 44, height: 44, borderRadius: 999, background: 'var(--ed-ember)', color: 'var(--ed-paper)' }}><Zap style={{ width: 18, height: 18 }} fill="currentColor" /></span>
                    <div><div style={{ fontSize: 24, fontWeight: 600, color: 'var(--ed-ember)' }}>{summary.superlikes}</div><div style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--ed-smoke)' }}>Want a call</div></div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <h1 className="ed-display" style={{ fontSize: 'clamp(2.2rem,6vw,64px)' }}>
                  Claim {company ? company : 'your profile'} on <em>Apparent.</em>
                </h1>
                <p className="ed-lede">
                  We surfaced {label} from public signals. Claim your profile so thesis-fit investors can find
                  you, follow what you ship, and reach out when there&apos;s a fit.
                </p>
              </>
            )}

            <div className="ed-cta" style={{ marginTop: 32 }}>
              <Link className="ed-btn ed-btn-filled" to={`/login?role=founder${signalId ? `&claim=${encodeURIComponent(signalId)}` : ''}`}>
                Claim my profile <ArrowUpRight style={{ width: 16, height: 16 }} />
              </Link>
              <Link className="ed-btn ed-btn-outline" to="/for-founders">What is Apparent?</Link>
            </div>
            <p style={{ marginTop: 24, fontSize: 12, color: 'var(--ed-smoke)' }}>Free to claim. You control your profile and who can reach you.</p>
          </div>
        </section>
      </main>
      <EditorialFooter />
    </div>
  );
};
