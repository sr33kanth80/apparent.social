import { Link } from 'react-router-dom';
import { EditorialNavbar } from '../components/editorial/EditorialNavbar';
import { EditorialFooter } from '../components/editorial/EditorialFooter';
import { LogoIcon } from '../components/LogoIcon';
import { CLI_CARD_HTML } from '../components/cliCardHtml';

export const ForFounders = () => (
  <div className="ed-page">
    <EditorialNavbar />
    <main>
      {/* HERO */}
      <section className="ed-subhero ed-inner ed-split ed-founder-hero">
        <div>
          <h1 className="ed-display ed-genz-head">
            <span className="ed-genz-word">Stop<span className="ed-clap">👏</span></span>{' '}
            <span className="ed-genz-word">launching<span className="ed-clap">👏</span></span>{' '}
            <span className="ed-genz-word">into<span className="ed-clap">👏</span></span>{' '}
            <span className="ed-genz-word">the<span className="ed-clap">👏</span></span>{' '}
            <br />
            <span className="ed-genz-word">void<span className="ed-clap">👏</span></span>
          </h1>
          <p className="ed-lede">Most launches disappear. On Apparent you launch in front of investors who are actively writing cheques, so the right ones DM you, matched by thesis, proof, and stage. Run <code style={{ fontFamily: 'var(--ed-mono)', fontSize: '0.92em' }}>npx apparent</code> and your shipped work becomes the proof that earns the intro. No warm intro required.</p>
          <div className="ed-cta">
            <Link className="ed-btn ed-btn-blue" to="/login?role=founder">Launch to active investors
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 17 17 7M9 7h8v8" /></svg>
            </Link>
            <Link className="ed-btn ed-btn-outline" to="/our-thesis">How it works</Link>
          </div>
          <div className="ed-trust">
            <span><b>1,800+</b> active investors</span><span className="ed-d" />
            <span>Verified in one command</span><span className="ed-d" />
            <span>Investors DM you</span>
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
          <h2 className="ed-sec-title">Launch, then watch the DMs land.</h2>
          <p className="ed-lead">Investors whose thesis matches your proof, stage, and sector reach out directly. You launch to a room that&apos;s already watching.</p>
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
            <h2 className="ed-sec-title">Show what investors need to see.</h2>
            <p className="ed-lead">Apparent is built around the evidence you already have: code, launches, customers, press, product velocity, and where you are building.</p>
            <Link className="ed-btn ed-btn-blue" to="/login?role=founder" style={{ marginTop: 28 }}>Start building your profile</Link>
          </div>
          <div className="ed-steps">
            <div className="ed-step"><span className="ed-n">01</span><div><h3>Verify in seconds</h3><p>Run npx apparent and your GitHub, shipped products, traction, and launches become a verified proof profile.</p></div></div>
            <div className="ed-step"><span className="ed-n">02</span><div><h3>Get matched by thesis</h3><p>Investors find you through criteria, founder signals, stage, category, and the evidence you already have.</p></div></div>
            <div className="ed-step"><span className="ed-n">03</span><div><h3>Let your agent reach out</h3><p>Your AI founder agent finds the investors who fit and opens personalized intros on your behalf, never spam.</p></div></div>
            <div className="ed-step"><span className="ed-n">04</span><div><h3>Move from DM to deal room</h3><p>Messages, terms review, and investor follow-up stay connected to the profile that created interest.</p></div></div>
          </div>
        </div>
      </section>

      {/* BENEFITS */}
      <section className="ed-sec ed-divider">
        <div className="ed-inner">
          <h2 className="ed-sec-title">Build once. Become discoverable everywhere.</h2>
          <div className="ed-benefits">
            <div className="ed-benefit"><svg className="ed-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="9" /><path d="M9 12l2 2 4-4" /></svg><h3>Verified in one command</h3><p>Run npx apparent and turn what you shipped into a profile investors can actually trust.</p></div>
            <div className="ed-benefit"><svg className="ed-ic" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .5A11.5 11.5 0 0 0 8.4 22.9c.6.1.8-.2.8-.6v-2c-3.2.7-3.9-1.4-3.9-1.4-.5-1.3-1.3-1.7-1.3-1.7-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17 5.3 18 5.6 18 5.6c.6 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.3c0 .4.2.7.8.6A11.5 11.5 0 0 0 12 .5Z" /></svg><h3>GitHub context</h3><p>Show technical depth and project history without forcing people to hunt.</p></div>
            <div className="ed-benefit"><svg className="ed-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg><h3>An agent that pitches for you</h3><p>Your AI agent surfaces and reaches investors whose thesis maps to your category, stage, and traction.</p></div>
            <div className="ed-benefit"><svg className="ed-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="9" cy="8" r="3" /><path d="M3 20a6 6 0 0 1 12 0" /><path d="M16 6a3 3 0 0 1 0 6" /><path d="M18 20a6 6 0 0 0-3-5.2" /></svg><h3>Founder network</h3><p>Find nearby and similar builders, then start the conversation inside Apparent.</p></div>
          </div>
        </div>
      </section>

      {/* DARK BAND */}
      <section className="ed-band">
        <div className="ed-inner">
          <h2>Your GitHub is a better pitch than your network.</h2>
          <p>Apparent reads the evidence you already have and puts it in front of the investors it actually fits.</p>
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
          <h2>Put your proof in front of capital.</h2>
          <p>Verify in one command, launch your build, and let active investors come to you.</p>
          <div className="ed-cta">
            <Link className="ed-btn ed-btn-blue" to="/login?role=founder">Launch to active investors</Link>
            <Link className="ed-btn ed-btn-outline" to="/our-thesis">See the thesis</Link>
          </div>
        </div>
      </section>
    </main>
    <EditorialFooter />
  </div>
);
