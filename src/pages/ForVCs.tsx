import { Link } from 'react-router-dom';
import { EditorialNavbar } from '../components/editorial/EditorialNavbar';
import { EditorialFooter } from '../components/editorial/EditorialFooter';
import { LogoIcon } from '../components/LogoIcon';

type VcSignal = {
  company: string;
  founder: string;
  relevance: number;
  column: 'New' | 'Screening' | 'Outreach ready';
  detail: string;
  source: string;
  freshness: string;
  stage: string;
  location: string;
};

const VC_SIGNALS: VcSignal[] = [
  {
    company: 'Edge runtime for agents',
    founder: 'Ari Kaplan',
    relevance: 96,
    column: 'Screening',
    detail: 'High shipping velocity: 412 commits in 90 days, GitHub-verified. Strong fit for your pre-seed developer tools thesis.',
    source: 'npx apparent',
    freshness: 'Updated 2h ago',
    stage: 'Pre-seed',
    location: 'SF',
  },
  {
    company: 'Local-first sync engine',
    founder: 'Nia Lassiter',
    relevance: 92,
    column: 'New',
    detail: 'Revenue-generating with paying design partners and growing MRR. The founder is opening a seed round this month.',
    source: 'Founder update',
    freshness: 'Fresh today',
    stage: 'Seed',
    location: 'Remote',
  },
  {
    company: 'Eval harness for LLMs',
    founder: 'Rae Shirota',
    relevance: 89,
    column: 'Outreach ready',
    detail: 'New enterprise pilot. The wedge and buyer profile match two companies already in your portfolio.',
    source: 'Launch signal',
    freshness: 'Yesterday',
    stage: 'Pre-seed',
    location: 'NYC',
  },
];

const THESIS_TAGS = ['AI infra', 'Dev tools', 'Pre-seed → Seed', 'Bay Area / Remote'];

const InvestorSourcingPreview = () => {
  const avgRelevance = Math.round(
    VC_SIGNALS.reduce((sum, s) => sum + s.relevance, 0) / VC_SIGNALS.length
  );

  return (
    <div className="ed-vc-dash" aria-label="Example pre-vetted deal pipeline">
      <div className="ed-vc-dash-head">
        <div className="ed-vc-dash-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
          <h3>New deals</h3>
        </div>
        <span className="ed-vc-dash-meta">Avg thesis fit {avgRelevance}%</span>
      </div>

      <div className="ed-vc-dash-thesis" aria-label="Your thesis">
        <span className="ed-vc-dash-thesis-label">Thesis</span>
        {THESIS_TAGS.map((tag) => <span key={tag} className="ed-vc-dash-chip">{tag}</span>)}
      </div>

      <ul className="ed-vc-dash-list">
        {VC_SIGNALS.map((signal) => (
          <li key={signal.company} className="ed-vc-dash-row">
            <div className="ed-vc-dash-main">
              <div className="ed-vc-dash-title-row">
                <b>{signal.company}</b>
                <span className="ed-vc-dash-by">by {signal.founder}</span>
                <span className="ed-vc-dash-rel">{signal.relevance}%</span>
                <span className="ed-vc-dash-col">{signal.column}</span>
              </div>
              <p className="ed-vc-dash-detail">{signal.detail}</p>
              <div className="ed-vc-dash-meta-row">
                <span>{signal.source}</span>
                <span>{signal.freshness}</span>
                <span>{signal.stage}</span>
                <span>{signal.location}</span>
              </div>
            </div>
            <div className="ed-vc-dash-actions">
              <span className="ed-vc-dash-pill">Company</span>
              <span className="ed-vc-dash-pill">Add to pipeline</span>
              <span className="ed-vc-dash-pill is-primary">Draft intro</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export const ForVCs = () => (
  <div className="ed-page ed-vc-page">
    <EditorialNavbar />
    <main>
      {/* HERO */}
      <section className="ed-subhero ed-inner ed-split">
        <div>
          <h1 className="ed-display">
            You do not need to work at a VC firm to <em>invest like one.<span className="ed-display-emoji" aria-hidden="true">💡</span></em>
          </h1>
          <p className="ed-lede">Apparent gives new and experienced investors the tools to build a thesis, discover startups, understand the evidence behind them, and connect with the founders they believe in. Your conviction is the starting point.</p>
          <div className="ed-cta">
            <Link className="ed-btn ed-btn-green" to="/login?role=investor">Explore startups
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 17 17 7M9 7h8v8" /></svg>
            </Link>
            <Link className="ed-btn ed-btn-outline" to="/our-thesis">See how Apparent works</Link>
          </div>
          <div className="ed-trust">
            <span><b>1,800+</b> investors mapped</span><span className="ed-d" />
            <span>For angels, operators, and funds</span><span className="ed-d" />
            <span>Proof behind every match</span>
          </div>
        </div>
        <InvestorSourcingPreview />
      </section>

      {/* WORKFLOW */}
      <section className="ed-sec ed-divider">
        <div className="ed-inner ed-work">
          <div>
            <h2 className="ed-sec-title">Turn your conviction into an investment thesis.</h2>
            <p className="ed-lead">Choose the companies you want to understand by sector, stage, location, check size, and founder signals. Apparent shows you why each match deserves your attention.</p>
            <Link className="ed-btn ed-btn-green" to="/login?role=investor" style={{ marginTop: 28 }}>Build your thesis</Link>
          </div>
          <div className="ed-steps">
            <div className="ed-step"><span className="ed-n">01</span><div><h3>Define what you believe</h3><p>Capture the sectors, stages, places, check size, must-have signals, and pass reasons that shape your point of view.</p></div></div>
            <div className="ed-step"><span className="ed-n">02</span><div><h3>Discover matching startups</h3><p>Apparent screens founders against your thesis and brings forward the companies most worth understanding.</p></div></div>
            <div className="ed-step"><span className="ed-n">03</span><div><h3>Follow the proof</h3><p>See the founder&apos;s work, available traction, source links, and the exact reasons the opportunity fits.</p></div></div>
            <div className="ed-step"><span className="ed-n">04</span><div><h3>Connect and keep learning</h3><p>Save the company, draft the intro, and carry its proof from first look through meetings and diligence.</p></div></div>
          </div>
        </div>
      </section>

      {/* BENEFITS */}
      <section className="ed-sec ed-divider">
        <div className="ed-inner">
          <h2 className="ed-sec-title">Build conviction before the first conversation.</h2>
          <div className="ed-benefits">
            <div className="ed-benefit"><svg className="ed-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></svg><h3>Matched to your thesis</h3><p>Each company is screened against your sectors, stage, geography, check size, must-have signals, and pass reasons.</p></div>
            <div className="ed-benefit"><svg className="ed-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg><h3>Founder proof upfront</h3><p>Review available revenue, customers, usage, pilots, launches, and shipped work before requesting a meeting.</p></div>
            <div className="ed-benefit"><svg className="ed-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="4" width="5" height="16" rx="1" /><rect x="10" y="4" width="5" height="11" rx="1" /><rect x="17" y="4" width="4" height="7" rx="1" /></svg><h3>Permissioned business signals <span className="ed-copy-emoji" aria-hidden="true">📊</span></h3><p>In development: founders will connect selected campaign and business tools, then decide which performance signals you can see.</p></div>
            <div className="ed-benefit"><svg className="ed-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></svg><h3>A living view of momentum</h3><p>Follow meaningful founder updates and changes as your understanding of the company develops.</p></div>
          </div>
        </div>
      </section>

      {/* DARK BAND */}
      <section className="ed-band">
        <div className="ed-inner">
          <h2>Anyone can form a thesis. Apparent helps you act on it.</h2>
          <p>Start with relevant companies and the proof behind each match. Develop conviction before the market tells you what to think.</p>
        </div>
      </section>

      {/* SIGNAL TO DEAL ROOM */}
      <section className="ed-sec ed-divider">
        <div className="ed-inner">
          <h2 className="ed-sec-title">From first signal to informed conviction.</h2>
          <div className="ed-infocards" style={{ marginTop: 'clamp(32px,5vw,56px)' }}>
            <div className="ed-infocard"><b>First pass</b><p>Quickly screen each company for thesis fit, founder-market fit, traction, stage, and timing.</p></div>
            <div className="ed-infocard"><b>First meeting</b><p>Start with the signal that caught your attention and a drafted intro you can make your own.</p></div>
            <div className="ed-infocard"><b>Ongoing diligence</b><p>Keep the opportunity, supporting proof, and current stage together as your understanding develops.</p></div>
          </div>
        </div>
      </section>

      {/* MEETUPS / TERMS / ALERTS */}
      <section className="ed-sec">
        <div className="ed-inner">
          <div className="ed-infocards">
            <div className="ed-infocard"><b>Network</b><p>Run office hours, small founder dinners, and thesis-led gatherings where strong referrals begin.</p></div>
            <div className="ed-infocard"><b>Terms</b><p>Keep term review and plain-language notes connected to the company and round context.</p></div>
            <div className="ed-infocard"><b>Monitoring</b><p>Use digest and Slack alerts to catch new traction, launches, and founder updates while they are fresh.</p></div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="ed-sec ed-divider">
        <div className="ed-inner">
          <h2 className="ed-sec-title">Questions, answered.</h2>
          <div className="ed-faq">
            <div className="ed-q"><h3>Do I need to be a professional VC?</h3><p>No. Apparent is for angels, operators, emerging investors, funds, and anyone building a serious investment thesis.</p></div>
            <div className="ed-q"><h3>What does pre-vetted mean?</h3><p>Pre-vetted means screened for thesis fit with the available traction, source links, and founder proof attached. It is a stronger starting point for your first pass, not a substitute for due diligence.</p></div>
            <div className="ed-q"><h3>Can I focus on revenue-generating startups?</h3><p>Yes. Revenue is a supported traction signal, including MRR and ARR. Add it to your mandate and Apparent can prioritize companies showing revenue, paying customers, and commercial momentum.</p></div>
            <div className="ed-q"><h3>Can I complete an investment through Apparent?</h3><p>Not yet. Apparent currently helps you discover, understand, and connect with startups. Direct investment support is in development.</p></div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="ed-sec ed-divider ed-final">
        <div className="ed-inner">
          <LogoIcon className="ed-mark" />
          <h2>Build your own venture thesis.</h2>
          <p>Discover the founders who fit what you believe, understand the evidence, and start the relationship with context.</p>
          <div className="ed-cta">
            <Link className="ed-btn ed-btn-green" to="/login?role=investor">Explore startups</Link>
            <Link className="ed-btn ed-btn-outline" to="/our-thesis">See how it works</Link>
          </div>
        </div>
      </section>
    </main>
    <EditorialFooter />
  </div>
);
