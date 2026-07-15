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
    detail: 'Open-source adoption is up 38% month over month. The founder is opening a seed round this month.',
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
    <div className="ed-vc-dash" aria-label="Signal inbox preview">
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
  <div className="ed-page">
    <EditorialNavbar />
    <main>
      {/* HERO */}
      <section className="ed-subhero ed-inner ed-split">
        <div>
          <h1 className="ed-display">
            Find your next outlier before the round gets <span className="ed-emoji-keep"><em>crowded.</em><span className="ed-display-emoji">🔎</span></span>
          </h1>
          <p className="ed-lede">Apparent gives emerging managers, GPs, and investment teams a private sourcing workspace. Set your <span className="ed-emoji-keep">thesis once <span className="ed-copy-emoji">🧭</span></span> and get a prioritized pipeline of companies worth a first look. Every match includes the reason to lean in, recent traction, founder proof, and a <span className="ed-emoji-keep">draft intro <span className="ed-copy-emoji">📈</span></span>.</p>
          <div className="ed-cta">
            <Link className="ed-btn ed-btn-green" to="/login?role=investor">Build your pipeline
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 17 17 7M9 7h8v8" /></svg>
            </Link>
            <Link className="ed-btn ed-btn-outline" to="/our-thesis">See how Apparent sources</Link>
          </div>
          <div className="ed-trust">
            <span className="ed-emoji-keep"><b>1,800+</b> investors on Apparent <span className="ed-copy-emoji">💸</span></span><span className="ed-d" />
            <span className="ed-emoji-keep">Proof behind every match <span className="ed-copy-emoji">✅</span></span><span className="ed-d" />
            <span className="ed-emoji-keep">Get in before consensus <span className="ed-copy-emoji">🤝</span></span>
          </div>
        </div>
        <InvestorSourcingPreview />
      </section>

      {/* WORKFLOW */}
      <section className="ed-sec ed-divider">
        <div className="ed-inner ed-work">
          <div>
            <h2 className="ed-sec-title">Build a pipeline your partnership can act on.</h2>
            <p className="ed-lead">Go from thesis to first meeting without living in spreadsheets, scattered bookmarks, and half-remembered founder updates.</p>
            <Link className="ed-btn ed-btn-green" to="/login?role=investor" style={{ marginTop: 28 }}>Set your thesis</Link>
          </div>
          <div className="ed-steps">
            <div className="ed-step"><span className="ed-n">01</span><div><h3>Set your investment thesis</h3><p>Capture the sectors, stages, geographies, check size, must-have signals, pass reasons, and companies that define your taste.</p></div></div>
            <div className="ed-step"><span className="ed-n">02</span><div><h3>Keep the top of funnel moving</h3><p>Apparent continuously screens verified founders against your thesis and ranks the deals most worth a first pass.</p></div></div>
            <div className="ed-step"><span className="ed-n">03</span><div><h3>See where talent is clustering</h3><p>Search a city or neighborhood to find builders and new companies forming around your areas of focus.</p></div></div>
            <div className="ed-step"><span className="ed-n">04</span><div><h3>Work the pipeline</h3><p>Save a company, draft the intro, and move the opportunity from screening to first meeting, diligence, and partner review.</p></div></div>
          </div>
        </div>
      </section>

      {/* BENEFITS */}
      <section className="ed-sec ed-divider">
        <div className="ed-inner">
          <h2 className="ed-sec-title">Spend your time on deals worth underwriting.</h2>
          <div className="ed-benefits">
            <div className="ed-benefit"><svg className="ed-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></svg><h3>Your thesis, operationalized</h3><p>Turn the way you evaluate a deal into clear criteria Apparent can source against every day.</p></div>
            <div className="ed-benefit"><svg className="ed-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg><h3>Thesis-matched deal flow</h3><p>Get verified companies with source links, recent traction, and a clear explanation of why each one fits.</p></div>
            <div className="ed-benefit"><svg className="ed-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="4" width="5" height="16" rx="1" /><rect x="10" y="4" width="5" height="11" rx="1" /><rect x="17" y="4" width="4" height="7" rx="1" /></svg><h3>One shared pipeline</h3><p>Track every company from first screen through meeting, diligence, and partner review.</p></div>
            <div className="ed-benefit"><svg className="ed-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></svg><h3>Deal monitoring</h3><p>Stay on top of the founder updates and traction changes that can turn a pass into a second look.</p></div>
          </div>
        </div>
      </section>

      {/* DARK BAND */}
      <section className="ed-band">
        <div className="ed-inner">
          <h2>When everyone sees the deal, allocation gets hard.</h2>
          <p>Apparent helps you form conviction while the company is still emerging, before the round gets competitive and the cap table fills up.</p>
        </div>
      </section>

      {/* SIGNAL TO DEAL ROOM */}
      <section className="ed-sec ed-divider">
        <div className="ed-inner">
          <h2 className="ed-sec-title">From first signal to partner meeting.</h2>
          <div className="ed-infocards" style={{ marginTop: 'clamp(32px,5vw,56px)' }}>
            <div className="ed-infocard"><b>First pass</b><p>Quickly screen each company for thesis fit, founder-market fit, traction, stage, and timing.</p></div>
            <div className="ed-infocard"><b>First meeting</b><p>Start with the signal that caught your attention and a drafted intro you can make your own.</p></div>
            <div className="ed-infocard"><b>Partner review</b><p>Keep the opportunity, supporting proof, and current stage together as the deal moves forward.</p></div>
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
            <div className="ed-q"><h3>Is this another startup database?</h3><p>No. A database gives you names. Apparent gives you thesis-matched deal flow, the reason each company deserves a first pass, and the proof to decide whether to lean in.</p></div>
            <div className="ed-q"><h3>What can I screen before taking a meeting?</h3><p>Each match can include source links, shipping activity, traction, launch recency, stage, geography, and the thesis-fit rationale behind the recommendation.</p></div>
            <div className="ed-q"><h3>Does Apparent replace due diligence?</h3><p>No. It makes sourcing and the first pass faster. Your team still owns founder references, customer calls, market work, cap-table review, and legal and financial diligence.</p></div>
            <div className="ed-q"><h3>Do I have to write the first message?</h3><p>No. Apparent drafts an intro from your thesis and the signal that triggered the match. You add your point of view, review it, and send.</p></div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="ed-sec ed-divider ed-final">
        <div className="ed-inner">
          <LogoIcon className="ed-mark" />
          <h2>Bring better deals to the partner meeting.</h2>
          <p>Turn your thesis into a living pipeline, make the first pass faster, and reach the right founders before the round crowds up.</p>
          <div className="ed-cta">
            <Link className="ed-btn ed-btn-green" to="/login?role=investor">Build your pipeline</Link>
            <Link className="ed-btn ed-btn-outline" to="/our-thesis">See how it works</Link>
          </div>
        </div>
      </section>
    </main>
    <EditorialFooter />
  </div>
);
