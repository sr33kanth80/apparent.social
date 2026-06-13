import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowUpRight, Sparkles, Star, Zap } from 'lucide-react';
import { loadBuilderInterestSummary, loadSourceSignal } from '../lib/dashboard-service';

const serif = { fontFamily: "'Source Serif 4', ui-serif, Georgia, 'Times New Roman', serif" };

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
    <main className="monad monad-page min-h-screen bg-[#f6f3f1] px-5 py-16 text-black sm:px-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/70 px-3 py-1.5 text-xs font-semibold text-[#242424]">
          <Sparkles className="h-3.5 w-3.5" /> Apparent · investor interest
        </div>

        {loading ? (
          <p className="text-lg text-black/50">Loading…</p>
        ) : total > 0 ? (
          <>
            <h1 className="text-4xl font-normal leading-[1.05] tracking-[-0.03em] sm:text-5xl" style={serif}>
              {total} investor{total === 1 ? '' : 's'}{' '}
              {summary.superlikes > 0 ? 'want to talk to you' : 'are interested in'}{' '}
              {company ? company : 'you'}.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-black/65">
              {founder ? `${founder.split(/\s+/)[0]}, ` : ''}we surfaced {label} from public signals and
              thesis-fit investors have already flagged it on Apparent. Claim your profile to see who they
              are and start the conversation.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <div className="flex items-center gap-3 rounded-[20px] border border-black/10 bg-white/70 p-5">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#242424] text-white">
                  <Star className="h-5 w-5" fill="currentColor" />
                </span>
                <div>
                  <p className="text-2xl font-semibold tracking-[-0.02em]">{summary.likes}</p>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-black/40">Liked you</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-[20px] border border-[#3aa0ff]/30 bg-[#eaf4ff] p-5">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#3aa0ff] text-white">
                  <Zap className="h-5 w-5" fill="currentColor" />
                </span>
                <div>
                  <p className="text-2xl font-semibold tracking-[-0.02em]">{summary.superlikes}</p>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-black/40">Want a call</p>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <h1 className="text-4xl font-normal leading-[1.05] tracking-[-0.03em] sm:text-5xl" style={serif}>
              Claim {company ? company : 'your profile'} on Apparent.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-black/65">
              We surfaced {label} from public signals. Claim your profile so thesis-fit investors can find
              you, follow what you ship, and reach out when there&apos;s a fit.
            </p>
          </>
        )}

        <div className="mt-10 flex flex-wrap items-center gap-3">
          <Link
            to={`/login?role=founder${signalId ? `&claim=${encodeURIComponent(signalId)}` : ''}`}
            className="inline-flex items-center gap-2 rounded-full bg-[#cfdaf5] px-6 py-3 text-sm font-semibold text-black transition hover:bg-[#bcc8ef]"
          >
            Claim my profile <ArrowUpRight className="h-4 w-4" />
          </Link>
          <Link to="/for-founders" className="px-2 py-3 text-sm font-semibold text-black/60 transition hover:text-black">
            What is Apparent?
          </Link>
        </div>

        <p className="mt-8 text-xs text-black/40">
          Free to claim. You control your profile and who can reach you.
        </p>
      </div>
    </main>
  );
};
