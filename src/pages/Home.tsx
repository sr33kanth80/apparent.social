import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { EditorialNavbar } from '../components/editorial/EditorialNavbar';
import { EditorialFooter } from '../components/editorial/EditorialFooter';
import { LogoIcon } from '../components/LogoIcon';
import { HeatMap } from './HeatMap';

const TABS = ['thesis', 'sourcing', 'density', 'pipeline'] as const;
type Tab = (typeof TABS)[number];

const META: Record<Tab, { n: string; label: string; note: string }> = {
  thesis: { n: '01', label: 'Turn your taste into criteria your agent sources against.', note: 'Sectors, stages, geographies, check size, the founder signals you back, and the ones you pass on, captured once.' },
  sourcing: { n: '02', label: 'Verified founders, ranked against your thesis every day.', note: 'Each match arrives with proof, source links, and a relevance score, surfaced while founders are still building.' },
  density: { n: '03', label: 'See where the builders are working, near your focus.', note: 'Drop a place and locate the Apparent builders around it. Map the density before the market does.' },
  pipeline: { n: '04', label: 'Move saved builders through a clean deal-flow board.', note: 'Sourced, meeting, diligence, partner review. The agent drafts the first outreach for you.' },
};

const HOT = new Set([27, 28, 39, 40]);
const ON = new Set([5, 7, 14, 19, 22, 33, 45, 51, 53, 58, 62, 66, 70]);

const GitHubGlyph = () => (
  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 .5A11.5 11.5 0 0 0 8.4 22.9c.6.1.8-.2.8-.6v-2c-3.2.7-3.9-1.4-3.9-1.4-.5-1.3-1.3-1.7-1.3-1.7-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17 5.3 18 5.6 18 5.6c.6 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.3c0 .4.2.7.8.6A11.5 11.5 0 0 0 12 .5Z" /></svg>
);

const Panel = ({ tab }: { tab: Tab }) => {
  switch (tab) {
    case 'thesis':
      return (
        <div className="ed-mock">
          <div className="ed-mock-head"><span className="ed-t">Thesis workspace</span><span className="ed-live"><i />private</span></div>
          <div className="ed-chips">
            <span className="ed-chip"><b>Sector</b> · Dev tools</span>
            <span className="ed-chip"><b>Sector</b> · AI infra</span>
            <span className="ed-chip"><b>Stage</b> · Pre-seed → A</span>
            <span className="ed-chip"><b>Check</b> · $250k–$2M</span>
            <span className="ed-chip"><b>Geo</b> · SF · NYC · Remote</span>
            <span className="ed-chip"><b>Signal</b> · Ships in public</span>
          </div>
          <div className="ed-thesis-foot">Saved. Your agent sources against this continuously.</div>
        </div>
      );
    case 'sourcing':
      return (
        <div className="ed-mock">
          <div className="ed-mock-head"><span className="ed-t">Ranked by fit</span><span className="ed-live"><i />fresh today</span></div>
          <div className="ed-row"><div className="ed-av">AK</div><div className="ed-who"><b>Edge runtime for agents</b><span>Dev tools · Pre-seed · SF</span></div><div className="ed-score"><b>96</b><span>Fit</span></div></div>
          <div className="ed-row"><div className="ed-av">NL</div><div className="ed-who"><b>Local-first sync engine</b><span>AI infra · Seed · Remote</span></div><div className="ed-score"><b>92</b><span>Fit</span></div></div>
          <div className="ed-row"><div className="ed-av">RS</div><div className="ed-who"><b>Eval harness for LLMs</b><span>Dev tools · Pre-seed · NYC</span></div><div className="ed-score"><b>89</b><span>Fit</span></div></div>
        </div>
      );
    case 'density':
      return (
        <div className="ed-mock">
          <div className="ed-mock-head"><span className="ed-t">Builder density · SF</span><span className="ed-live"><i />18 nearby</span></div>
          <div className="ed-density">{Array.from({ length: 72 }).map((_, i) => (<i key={i} className={HOT.has(i) ? 'hot' : ON.has(i) ? 'on' : undefined} />))}</div>
          <div className="ed-thesis-foot">Drop a place to see Apparent builders working near your focus.</div>
        </div>
      );
    case 'pipeline':
      return (
        <div className="ed-mock">
          <div className="ed-mock-head"><span className="ed-t">Deal flow</span><span className="ed-live"><i />7 active</span></div>
          <div className="ed-kanban">
            <div className="ed-kcol"><div className="ed-kt">Sourced</div><div className="ed-kcard">Edge runtime <span>Drafted outreach</span></div><div className="ed-kcard">Sync engine <span>Saved</span></div></div>
            <div className="ed-kcol"><div className="ed-kt">Meeting</div><div className="ed-kcard">Eval harness <span>Thu 2:00</span></div></div>
            <div className="ed-kcol"><div className="ed-kt">Diligence</div><div className="ed-kcard">Vector store <span>Terms review</span></div></div>
          </div>
        </div>
      );
  }
};

export const Home = () => {
  const [tab, setTab] = useState<Tab>('thesis');
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setTab((t) => TABS[(TABS.indexOf(t) + 1) % TABS.length]), 1100);
    return () => clearInterval(id);
  }, [paused]);

  return (
    <div className="ed-page">
      <EditorialNavbar />

      <main>
        {/* HERO */}
        <section className="ed-hero">
          <div className="ed-inner">
            <h1 className="ed-display">Where proof meets <em>capital.</em></h1>
            <p className="ed-sub">Apparent connects founders who&apos;ve shipped with investors who are actively writing cheques. Founders turn proof into intros; investors source startups that fit their thesis, ranked by proof, stage, and freshness.</p>
            <div className="ed-cta">
              <Link className="ed-btn ed-btn-filled" to="/login?role=investor">Source your deal flow
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 17 17 7M9 7h8v8" /></svg>
              </Link>
              <Link className="ed-btn ed-btn-ember" to="/for-founders">I&apos;m a founder</Link>
            </div>
            <div className="ed-trust">
              <span><b>1,800+</b> investors on Apparent</span><span className="ed-d" />
              <span>Verified proof, not pitches</span><span className="ed-d" />
              <span>No warm intro required</span>
            </div>
            <div className="ed-logos">
              <span className="ed-lbl">Builders &amp; investors on Apparent</span>
              <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" /></svg>
              <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" /></svg>
              <svg width="26" height="24" viewBox="0 0 26 24" aria-hidden="true"><path d="M13 2 24 22H2Z" /></svg>
              <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2 22 12 12 22 2 12Z" /></svg>
              <svg width="26" height="24" viewBox="0 0 26 24" aria-hidden="true"><path d="M7 2h12l5 10-5 10H7L2 12Z" /></svg>
            </div>
          </div>

          <div className="ed-surface-wrap" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
            <div className="ed-tabbar" role="tablist">
              {TABS.map((t) => (
                <button key={t} className={`${t === tab ? 'is-active' : ''}`} onClick={() => setTab(t)} type="button">
                  {t[0].toUpperCase() + t.slice(1)}
                </button>
              ))}
              <Link className="ed-visit" to="/for-vcs">See it live</Link>
            </div>
            <div className="ed-surface ed-inner">
              <div className="ed-surface-grid">
                <div className="ed-surface-left">
                  <div className="ed-surface-num">{META[tab].n}</div>
                  <div className="ed-surface-label">{META[tab].label}</div>
                  <p className="ed-surface-note">{META[tab].note}</p>
                </div>
                <div><Panel key={tab} tab={tab} /></div>
              </div>
            </div>
          </div>
        </section>

        {/* HEAT MAP */}
        <section className="ed-sec ed-divider">
          <div className="ed-inner ed-work">
            <div>
              <h2 className="ed-sec-title">Capital is easier to read when it has a shape.</h2>
              <p className="ed-lead">Builder Radar plots investors and builders by geography, stage, and thesis instead of burying them in a spreadsheet. Read the density before it becomes consensus.</p>
              <Link className="ed-btn ed-btn-filled" to="/heat-map" style={{ marginTop: 28 }}>Open Builder Radar</Link>
            </div>
            <div className="ed-map-stage">
              <HeatMap includeVCContacts vcOnly fillParent lockContacts />
            </div>
          </div>
        </section>

        {/* WORKFLOW */}
        <section className="ed-sec ed-divider">
          <div className="ed-inner ed-work">
            <div>
              <h2 className="ed-sec-title">See the sourcing picture earlier.</h2>
              <p className="ed-lead">Apparent turns builder proof, public signals, local density, and your thesis into one repeatable sourcing workflow.</p>
              <Link className="ed-btn ed-btn-filled" to="/for-vcs" style={{ marginTop: 28 }}>Build your thesis</Link>
            </div>
            <div className="ed-steps">
              <div className="ed-step"><span className="ed-n">01</span><div><h3>Define thesis</h3><p>Capture sectors, stages, geographies, check size, the founder signals you back, and the ones you pass on.</p></div></div>
              <div className="ed-step"><span className="ed-n">02</span><div><h3>Let your agent source</h3><p>Your AI investor agent works 24/7, ranking verified founders against your thesis by proof, freshness, and fit.</p></div></div>
              <div className="ed-step"><span className="ed-n">03</span><div><h3>Map builder density</h3><p>Drop a place, locate projects nearby, and see the Apparent builders working around that focus.</p></div></div>
              <div className="ed-step"><span className="ed-n">04</span><div><h3>Move through deal flow</h3><p>Save a builder, let the agent draft outreach, and drag opportunities through a clean pipeline.</p></div></div>
            </div>
          </div>
        </section>

        {/* BENEFITS */}
        <section className="ed-sec ed-divider">
          <div className="ed-inner">
            <h2 className="ed-sec-title">Source from proof, not noise.</h2>
            <div className="ed-benefits">
              <div className="ed-benefit">
                <svg className="ed-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></svg>
                <h3>Private thesis workspace</h3><p>Turn your taste into criteria your AI agent can source against, repeatedly.</p>
              </div>
              <div className="ed-benefit">
                <svg className="ed-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
                <h3>Agent-sourced inbox</h3><p>Verified founders with source links, proof, and relevance, surfaced fresh every day.</p>
              </div>
              <div className="ed-benefit">
                <svg className="ed-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="4" width="5" height="16" rx="1" /><rect x="10" y="4" width="5" height="11" rx="1" /><rect x="17" y="4" width="4" height="7" rx="1" /></svg>
                <h3>Deal-flow Kanban</h3><p>Move saved builders through sourcing, meeting, diligence, and partner review.</p>
              </div>
              <div className="ed-benefit">
                <svg className="ed-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></svg>
                <h3>Digest &amp; alerts</h3><p>Keep the highest-signal founder updates from disappearing between meetings.</p>
              </div>
            </div>
          </div>
        </section>

        {/* AUDIENCE */}
        <section className="ed-sec ed-divider">
          <div className="ed-inner">
            <h2 className="ed-sec-title">Two sides, one fit.</h2>
            <div className="ed-audience">
              <div className="ed-acard">
                <h3>Make your strongest signal visible.</h3>
                <ul>
                  <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="9" /><path d="M9 12l2 2 4-4" /></svg>Verified builds, launches, and traction in one quiet profile.</li>
                  <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="9" /><path d="M9 12l2 2 4-4" /></svg>Investor matching by thesis, stage, sector, and geography.</li>
                  <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="9" /><path d="M9 12l2 2 4-4" /></svg>An AI founder agent that drafts focused, fit-based outreach.</li>
                </ul>
                <Link className="ed-btn ed-btn-ember" to="/for-founders">Create founder profile</Link>
              </div>
              <div className="ed-acard">
                <h3>Source builders by evidence.</h3>
                <ul>
                  <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="2.5" /></svg>A thesis-aware view of builders with real proof behind them.</li>
                  <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="2.5" /></svg>Ranking that separates active signal from stale fundraising lists.</li>
                  <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="2.5" /></svg>AI-suggested outreach grounded in why the founder fits.</li>
                </ul>
                <Link className="ed-btn ed-btn-filled" to="/for-vcs">Create investor profile</Link>
              </div>
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

        {/* QUOTE */}
        <section className="ed-sec ed-quote">
          <div className="ed-inner">
            <blockquote>&ldquo;The best sourcing advantage is knowing which builders matter before the market agrees.&rdquo;</blockquote>
            <div className="ed-attr"><span className="ed-av" /><span>The Apparent thesis</span></div>
          </div>
        </section>

        {/* VERIFIED FOUNDERS */}
        <section className="ed-sec ed-divider">
          <div className="ed-inner">
            <div className="ed-verified-head">
              <h2 className="ed-sec-title">Verified builders, with proof attached.</h2>
              <Link className="ed-btn ed-btn-outline" to="/for-founders">Create founder profile</Link>
            </div>
            <div className="ed-cards">
              {[
                ['AK', 'Edge runtime for agents', 'Dev tools · Pre-seed', 'Founder-supplied summary of the company, proof, and current ask. Owner controlled.', 'Pre-seed', '$1.2M', 'Deck', '96 fit'],
                ['NL', 'Local-first sync engine', 'AI infra · Seed', 'A second preview card showing the product, team, proof links, and investor materials.', 'Seed', '$3M', 'Pitch video', '92 fit'],
                ['RS', 'Eval harness for LLMs', 'Dev tools · Pre-seed', 'A reusable card for the product, team, proof links, and current raise.', 'Pre-seed', '$800k', 'Deck', '89 fit'],
              ].map((c) => (
                <article className="ed-card" key={c[0]}>
                  <div className="ed-ch"><div className="ed-av">{c[0]}</div><div><b>{c[1]}</b><span>{c[2]}</span></div><span className="ed-badge">Verified</span></div>
                  <p className="ed-desc">{c[3]}</p>
                  <div className="ed-meta"><div><span>Stage</span><b>{c[4]}</b></div><div><span>Raising</span><b>{c[5]}</b></div></div>
                  <div className="ed-proofs">
                    <span className="ed-proof"><GitHubGlyph />GitHub</span>
                    <span className="ed-proof">{c[6]}</span>
                    <span className="ed-proof ed-fit">{c[7]}</span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="ed-sec ed-divider ed-final">
          <div className="ed-inner">
            <LogoIcon className="ed-mark" />
            <h2>Build your private sourcing desk.</h2>
            <p>Capture your thesis once, then let Apparent keep surfacing relevant builders with proof attached.</p>
            <div className="ed-cta">
              <Link className="ed-btn ed-btn-filled" to="/login?role=investor">Source your deal flow</Link>
              <Link className="ed-btn ed-btn-outline" to="/contact">Book a walkthrough</Link>
            </div>
          </div>
        </section>
      </main>

      <EditorialFooter />
    </div>
  );
};
