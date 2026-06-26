import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { EditorialNavbar } from '../components/editorial/EditorialNavbar';
import { EditorialFooter } from '../components/editorial/EditorialFooter';
import { LogoIcon } from '../components/LogoIcon';

type VcSignal = {
  initials: string;
  company: string;
  meta: string;
  score: number;
  proof: string[];
  source: string;
  draft: string;
  stage: 'Inbox' | 'Reviewing' | 'Drafted';
};

const VC_SIGNALS: VcSignal[] = [
  {
    initials: 'AK',
    company: 'Edge runtime for agents',
    meta: 'Dev tools | Pre-seed | SF',
    score: 96,
    proof: ['412 commits', 'GitHub verified', '3 launches'],
    source: 'Fresh proof from npx apparent',
    draft: 'Your devtools thesis maps to their agent runtime and weekly shipping cadence.',
    stage: 'Reviewing',
  },
  {
    initials: 'NL',
    company: 'Local-first sync engine',
    meta: 'AI infra | Seed | Remote',
    score: 92,
    proof: ['Usage up 38%', 'Open-source traction', 'Seed raise'],
    source: 'Founder signal updated today',
    draft: 'They fit your AI infra mandate and are actively collecting seed conversations.',
    stage: 'Inbox',
  },
  {
    initials: 'RS',
    company: 'Eval harness for LLMs',
    meta: 'Dev tools | Pre-seed | NYC',
    score: 89,
    proof: ['New enterprise pilot', 'Demo attached', 'Warm category fit'],
    source: 'Product launch and proof links',
    draft: 'The eval workflow is close to your recent pass/fund signals. Ask for the pilot notes.',
    stage: 'Drafted',
  },
];

const InvestorSourcingPreview = () => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [activity, setActivity] = useState('Agent ranked 3 fresh builders against your thesis.');
  const selectedSignal = VC_SIGNALS[selectedIndex];

  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => {
      setSelectedIndex((current) => (current + 1) % VC_SIGNALS.length);
    }, 2200);

    return () => window.clearInterval(id);
  }, [paused]);

  const selectSignal = (index: number) => {
    setSelectedIndex(index);
    setActivity(`Opened ${VC_SIGNALS[index].company} from Signal inbox.`);
  };

  return (
    <div
      className="ed-mock ed-vc-sourcing-card"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="ed-mock-head">
        <span className="ed-t">Signal inbox 📡</span>
        <span className="ed-live"><i />fresh today ⚡</span>
      </div>

      <div className="ed-vc-board">
        <div className="ed-vc-list" role="list" aria-label="Ranked founder signals">
          {VC_SIGNALS.map((signal, index) => (
            <button
              key={signal.company}
              type="button"
              className={`ed-row ed-signal-row${index === selectedIndex ? ' is-active' : ''}`}
              onClick={() => selectSignal(index)}
              aria-pressed={index === selectedIndex}
            >
              <div className="ed-av">{signal.initials}</div>
              <div className="ed-who">
                <b>{signal.company}</b>
                <span>{signal.meta}</span>
              </div>
              <div className="ed-score">
                <b>{signal.score}</b>
                <span>Fit</span>
              </div>
            </button>
          ))}
        </div>

        <div className="ed-signal-detail" aria-live="polite">
          <div className="ed-signal-detail-top">
            <div>
              <span className="ed-signal-kicker">Ranked by fit 🎯</span>
              <h3>{selectedSignal.company}</h3>
            </div>
            <div className="ed-fit-orb" style={{ '--fit': selectedSignal.score } as CSSProperties}>
              <span>{selectedSignal.score}</span>
            </div>
          </div>

          <div className="ed-proof-row">
            {selectedSignal.proof.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>

          <div className="ed-agent-draft">
            <span>Agent draft ✍️</span>
            <p>{selectedSignal.draft}</p>
          </div>

          <div className="ed-signal-source">{selectedSignal.source}</div>

          <div className="ed-signal-actions">
            <button type="button" onClick={() => setActivity(`Saved ${selectedSignal.company} to deal flow.`)}>Save</button>
            <button type="button" onClick={() => setActivity(`Opened source links for ${selectedSignal.company}.`)}>Source</button>
            <button type="button" className="is-primary" onClick={() => setActivity(`Drafted outreach for ${selectedSignal.company}.`)}>Draft outreach</button>
          </div>
        </div>
      </div>

      <div className="ed-vc-activity">
        <span>{activity}</span>
      </div>
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
            Source your next deal before <span className="ed-emoji-keep"><em>consensus.</em><span className="ed-display-emoji">🔎</span></span>
          </h1>
          <p className="ed-lede">Apparent is a private sourcing desk for VCs, GPs, and angels. Capture your <span className="ed-emoji-keep">thesis once <span className="ed-copy-emoji">🧭</span></span> and an AI agent surfaces investable startups that fit, ranked by proof, stage, and <span className="ed-emoji-keep">freshness <span className="ed-copy-emoji">📈</span></span>, then drafts the outreach.</p>
          <div className="ed-cta">
            <Link className="ed-btn ed-btn-filled" to="/login?role=investor">Source your deal flow
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 17 17 7M9 7h8v8" /></svg>
            </Link>
            <Link className="ed-btn ed-btn-outline" to="/our-thesis">How it works</Link>
          </div>
          <div className="ed-trust">
            <span className="ed-emoji-keep"><b>1,800+</b> investors on Apparent <span className="ed-copy-emoji">💸</span></span><span className="ed-d" />
            <span className="ed-emoji-keep">Verified proof, not pitches <span className="ed-copy-emoji">✅</span></span><span className="ed-d" />
            <span className="ed-emoji-keep">No warm intro required <span className="ed-copy-emoji">🤝</span></span>
          </div>
        </div>
        <InvestorSourcingPreview />
      </section>

      {/* WORKFLOW */}
      <section className="ed-sec ed-divider">
        <div className="ed-inner ed-work">
          <div>
            <h2 className="ed-sec-title">See the sourcing picture earlier.</h2>
            <p className="ed-lead">Apparent turns builder proof, public signals, local density, and your thesis into a repeatable sourcing workflow.</p>
            <Link className="ed-btn ed-btn-filled" to="/login?role=investor" style={{ marginTop: 28 }}>Build your thesis</Link>
          </div>
          <div className="ed-steps">
            <div className="ed-step"><span className="ed-n">01</span><div><h3>Define thesis</h3><p>Capture sectors, stages, geographies, check size, founder signals, pass signals, and examples.</p></div></div>
            <div className="ed-step"><span className="ed-n">02</span><div><h3>Let your agent source</h3><p>Your AI investor agent works 24/7, ranking verified founders against your thesis by proof, freshness, and fit.</p></div></div>
            <div className="ed-step"><span className="ed-n">03</span><div><h3>Map builder density</h3><p>Drop a place, locate projects nearby, and see Apparent builders around that focus.</p></div></div>
            <div className="ed-step"><span className="ed-n">04</span><div><h3>Move through deal flow</h3><p>Save a builder, let the agent draft outreach, and drag opportunities through a Kanban pipeline.</p></div></div>
          </div>
        </div>
      </section>

      {/* BENEFITS */}
      <section className="ed-sec ed-divider">
        <div className="ed-inner">
          <h2 className="ed-sec-title">Source from proof, not noise.</h2>
          <div className="ed-benefits">
            <div className="ed-benefit"><svg className="ed-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></svg><h3>Private thesis workspace</h3><p>Turn your taste into criteria your AI agent can source against, repeatedly.</p></div>
            <div className="ed-benefit"><svg className="ed-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg><h3>Agent-sourced signal inbox</h3><p>Your agent surfaces verified founders with source links, proof, and relevance, fresh every day.</p></div>
            <div className="ed-benefit"><svg className="ed-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="4" width="5" height="16" rx="1" /><rect x="10" y="4" width="5" height="11" rx="1" /><rect x="17" y="4" width="4" height="7" rx="1" /></svg><h3>Deal-flow Kanban</h3><p>Move saved builders through sourcing, meeting, diligence, and partner review.</p></div>
            <div className="ed-benefit"><svg className="ed-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></svg><h3>Digest and alerts</h3><p>Keep the highest-signal founder updates from disappearing between meetings.</p></div>
          </div>
        </div>
      </section>

      {/* DARK BAND */}
      <section className="ed-band">
        <div className="ed-inner">
          <h2>By the time it&apos;s consensus, the round is full.</h2>
          <p>Apparent surfaces founders who fit your thesis while they&apos;re still building, not after the deal turns competitive.</p>
        </div>
      </section>

      {/* SIGNAL TO DEAL ROOM */}
      <section className="ed-sec ed-divider">
        <div className="ed-inner">
          <h2 className="ed-sec-title">From signal to deal room.</h2>
          <div className="ed-infocards" style={{ marginTop: 'clamp(32px,5vw,56px)' }}>
            <div className="ed-infocard"><b>Inbox</b><p>Your agent ranks founder and company signals by thesis, proof, freshness, and geography.</p></div>
            <div className="ed-infocard"><b>Outreach</b><p>The agent drafts first messages from your thesis and the founder signal that triggered the match.</p></div>
            <div className="ed-infocard"><b>Pipeline</b><p>Drag saved builders through a clean venture CRM-style board.</p></div>
          </div>
        </div>
      </section>

      {/* MEETUPS / TERMS / ALERTS */}
      <section className="ed-sec">
        <div className="ed-inner">
          <div className="ed-infocards">
            <div className="ed-infocard"><b>Meetups</b><p>Announce rooms, office hours, and founder gatherings around your thesis.</p></div>
            <div className="ed-infocard"><b>Terms</b><p>Keep term review and plain-language notes connected to the company context.</p></div>
            <div className="ed-infocard"><b>Alerts</b><p>Persist digest and Slack alert preferences for fresh founder signals.</p></div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="ed-sec ed-divider">
        <div className="ed-inner">
          <h2 className="ed-sec-title">Questions, answered.</h2>
          <div className="ed-faq">
            <div className="ed-q"><h3>Is this just another investor database?</h3><p>No. A database lists everyone. Apparent sources against your thesis and ranks investable startups by proof, stage, and freshness, so your list gets sharper, not longer.</p></div>
            <div className="ed-q"><h3>Where does the proof come from?</h3><p>Founders verify GitHub, shipped products, traction, and launches in one command. You source from evidence, not decks.</p></div>
            <div className="ed-q"><h3>Do I have to write the outreach?</h3><p>No. Your agent drafts the first message from your thesis and the signal that triggered the match. You review and send.</p></div>
            <div className="ed-q"><h3>How early are these companies?</h3><p>Apparent surfaces founders while they&apos;re still building, before the round turns competitive, so you see fit before consensus.</p></div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="ed-sec ed-divider ed-final">
        <div className="ed-inner">
          <LogoIcon className="ed-mark" />
          <h2>Build your private sourcing desk.</h2>
          <p>Capture your thesis once, then let Apparent keep surfacing investable startups with proof attached.</p>
          <div className="ed-cta">
            <Link className="ed-btn ed-btn-filled" to="/login?role=investor">Source your deal flow</Link>
            <Link className="ed-btn ed-btn-outline" to="/our-thesis">See the thesis</Link>
          </div>
        </div>
      </section>
    </main>
    <EditorialFooter />
  </div>
);
