import { Link } from 'react-router-dom';
import { EditorialNavbar } from '../components/editorial/EditorialNavbar';
import { EditorialFooter } from '../components/editorial/EditorialFooter';
import { LogoIcon } from '../components/LogoIcon';
import { CLI_CARD_HTML } from '../components/cliCardHtml';

export const ForFounders = () => (
  <div className="ed-page ed-founder-page">
    <EditorialNavbar />
    <main>
      {/* HERO */}
      <section className="ed-subhero ed-inner ed-split ed-founder-hero">
        <div>
          <h1 className="ed-display ed-genz-head">
            Raise where your <em>momentum is visible.<span className="ed-display-emoji" aria-hidden="true">📈</span></em>
          </h1>
          <p className="ed-lede">Launch your startup on Apparent, turn the work you have already done into credible proof, and get matched with people whose investment interests fit your company. You choose what becomes visible. The right investors get a reason to come to you.</p>
          <div className="ed-cta">
            <Link className="ed-btn ed-btn-blue" to="/login?role=founder">Launch your startup
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 17 17 7M9 7h8v8" /></svg>
            </Link>
            <Link className="ed-btn ed-btn-outline" to="/our-thesis">How it works</Link>
          </div>
          <div className="ed-trust">
            <span><b>1,800+</b> investors mapped</span><span className="ed-d" />
            <span>Founder-controlled proof</span><span className="ed-d" />
            <span>No warm intro required</span>
          </div>
        </div>
        <div className="ed-cli-wrap" aria-label="npx apparent terminal preview">
          <div className="cli-card ed-cli-card">
            <div className="cli-card__bar">
              <i style={{ background: '#ff5f57' }} />
              <i style={{ background: '#febc2e' }} />
              <i style={{ background: '#28c840' }} />
              <span className="t">founder@local: ~/medai</span>
            </div>
            <pre dangerouslySetInnerHTML={{ __html: CLI_CARD_HTML }} />
          </div>
          <p className="ed-cli-caption">One command reads local git, renders this verified build card, and shows exactly what reaches your Apparent profile. Source code never leaves the machine.</p>
        </div>
      </section>

      {/* DM INBOX */}
      <section className="ed-sec ed-divider">
        <div className="ed-inner">
          <h2 className="ed-sec-title">Launch once. Become discoverable by the right capital.</h2>
          <p className="ed-lead">Apparent matches your proof, stage, sector, geography, and current raise with investors already looking for companies like yours.</p>
          <div style={{ marginTop: 'clamp(28px,4vw,44px)', maxWidth: 660 }}>
            <div className="ed-mock">
              <div className="ed-mock-head"><span className="ed-t">Investor inbox</span><span className="ed-live"><i />3 new</span></div>
              <div className="ed-row"><div className="ed-av">SV</div><div className="ed-who"><b>Seed fund, dev tools</b><span>Writing $250k-$1M cheques now</span></div><div className="ed-score"><b>DM</b><span>New</span></div></div>
              <div className="ed-row"><div className="ed-av">AC</div><div className="ed-who"><b>Angel, ex-founder</b><span>Backs technical pre-seed teams</span></div><div className="ed-score"><b>DM</b><span>New</span></div></div>
              <div className="ed-row"><div className="ed-av">GP</div><div className="ed-who"><b>GP, AI infra thesis</b><span>Leads and co-invests at seed</span></div><div className="ed-score"><b>DM</b><span>New</span></div></div>
              <div className="ed-thesis-foot">Matched to your proof profile the moment you launched.</div>
            </div>
          </div>
        </div>
      </section>

      {/* WORKFLOW */}
      <section className="ed-sec ed-divider">
        <div className="ed-inner ed-work">
          <div>
            <h2 className="ed-sec-title">Show what matters. Keep control of the rest.</h2>
            <p className="ed-lead">Bring code, launches, customers, traction, and product velocity into one investor-readable profile. You decide what is public and what is shared only with investors.</p>
            <Link className="ed-btn ed-btn-blue" to="/login?role=founder" style={{ marginTop: 28 }}>Start building your profile</Link>
          </div>
          <div className="ed-steps">
            <div className="ed-step"><span className="ed-n">01</span><div><h3>Launch with proof</h3><p>Run npx apparent and turn your GitHub, shipped products, traction, and launches into a verified profile.</p></div></div>
            <div className="ed-step"><span className="ed-n">02</span><div><h3>Choose who sees what</h3><p>Keep sensitive details private, share selected evidence with investors, and make only the right signals public.</p></div></div>
            <div className="ed-step"><span className="ed-n">03</span><div><h3>Get matched by conviction</h3><p>Apparent finds investors whose thesis, stage, category, and founder signals align with your company.</p></div></div>
            <div className="ed-step"><span className="ed-n">04</span><div><h3>Move from interest to a raise</h3><p>Messages, terms review, and investor follow-up stay connected to the proof that created interest.</p></div></div>
          </div>
        </div>
      </section>

      {/* BENEFITS */}
      <section className="ed-sec ed-divider">
        <div className="ed-inner">
          <h2 className="ed-sec-title">Let your progress make the fundraising case.</h2>
          <div className="ed-benefits">
            <div className="ed-benefit"><svg className="ed-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="9" /><path d="M9 12l2 2 4-4" /></svg><h3>Verified in one command</h3><p>Run npx apparent and turn what you shipped into a profile investors can actually trust.</p></div>
            <div className="ed-benefit"><svg className="ed-ic" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .5A11.5 11.5 0 0 0 8.4 22.9c.6.1.8-.2.8-.6v-2c-3.2.7-3.9-1.4-3.9-1.4-.5-1.3-1.3-1.7-1.3-1.7-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17 5.3 18 5.6 18 5.6c.6 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.3c0 .4.2.7.8.6A11.5 11.5 0 0 0 12 .5Z" /></svg><h3>Permissioned by design</h3><p>Control which details are public and which are visible only to investors.</p></div>
            <div className="ed-benefit"><svg className="ed-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg><h3>An agent that pitches for you</h3><p>Your AI agent surfaces and reaches investors whose thesis maps to your category, stage, and traction.</p></div>
            <div className="ed-benefit"><svg className="ed-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="9" cy="8" r="3" /><path d="M3 20a6 6 0 0 1 12 0" /><path d="M16 6a3 3 0 0 1 0 6" /><path d="M18 20a6 6 0 0 0-3-5.2" /></svg><h3>Connected business signals <span className="ed-copy-emoji" aria-hidden="true">📊</span></h3><p>In development: connect selected campaign and business tools so approved investors can follow the momentum you choose to share.</p></div>
          </div>
        </div>
      </section>

      {/* DARK BAND */}
      <section className="ed-band">
        <div className="ed-inner">
          <h2>Your company. Your data. Your audience. <span className="ed-copy-emoji" aria-hidden="true">🔒</span></h2>
          <p>As connected business signals roll out, you decide what is public, what approved investors can see, and what remains private.</p>
        </div>
      </section>

      {/* VERIFY / MATCH / OPEN */}
      <section className="ed-sec ed-divider">
        <div className="ed-inner">
          <h2 className="ed-sec-title">Verify. Match. Let your agent open it.</h2>
          <div className="ed-infocards" style={{ marginTop: 'clamp(32px,5vw,56px)' }}>
            <div className="ed-infocard"><b>Verify</b><p>Run npx apparent to attach real code, products, metrics, and proof to each build.</p></div>
            <div className="ed-infocard"><b>Match</b><p>See investors ranked by thesis fit and founder signal.</p></div>
            <div className="ed-infocard"><b>Let your agent open it</b><p>Your AI agent drafts the intro and starts the conversation with context attached.</p></div>
          </div>
        </div>
      </section>

      {/* QUOTE */}
      <section className="ed-sec ed-quote">
        <div className="ed-inner">
          <blockquote>&ldquo;Your work should speak before your network does.&rdquo;</blockquote>
          <div className="ed-attr"><span className="ed-av" /><span>The Apparent thesis</span></div>
        </div>
      </section>

      {/* FAQ */}
      <section className="ed-sec ed-divider">
        <div className="ed-inner">
          <h2 className="ed-sec-title">Questions, answered.</h2>
          <div className="ed-faq">
            <div className="ed-q"><h3>Are these real investors or scraped contacts?</h3><p>Real investors with live theses on Apparent, actively sourcing and writing cheques. Not a scraped list.</p></div>
            <div className="ed-q"><h3>What do I need to launch?</h3><p>Run npx apparent. Your GitHub, products, and traction become a verified proof profile in seconds.</p></div>
            <div className="ed-q"><h3>Will investors actually reach out?</h3><p>Investors whose thesis matches your stage, sector, and proof can DM you directly, and your agent can open the conversation on your behalf.</p></div>
            <div className="ed-q"><h3>Do I need a warm intro?</h3><p>No. Proof travels farther than a warm intro here. Your shipped work is what earns the meeting.</p></div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="ed-sec ed-divider ed-final">
        <div className="ed-inner">
          <LogoIcon className="ed-mark" />
          <h2>Raise where the right investors can find you.</h2>
          <p>Launch your startup, make the right proof visible, and let conviction-matched investors come to you.</p>
          <div className="ed-cta">
            <Link className="ed-btn ed-btn-blue" to="/login?role=founder">Launch your startup</Link>
            <Link className="ed-btn ed-btn-outline" to="/our-thesis">See the thesis</Link>
          </div>
        </div>
      </section>
    </main>
    <EditorialFooter />
  </div>
);
