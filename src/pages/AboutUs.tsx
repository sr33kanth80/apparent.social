import { Link } from 'react-router-dom';
import { EditorialNavbar } from '../components/editorial/EditorialNavbar';
import { EditorialFooter } from '../components/editorial/EditorialFooter';
import { LogoIcon } from '../components/LogoIcon';

export const AboutUs = () => (
  <div className="ed-page">
    <EditorialNavbar />
    <main>
      {/* HERO */}
      <section className="ed-subhero ed-inner">
        <h1 className="ed-display">Capital should find <em>proof.</em></h1>
        <div className="ed-about-intro">
          <p className="ed-lede" style={{ marginTop: 0 }}>Apparent exists because warm intros are a bad database for ambition. Great builders should become visible by what they ship, and investors should find them by thesis, proof, and timing.</p>
          <div className="ed-infocards">
            <div className="ed-infocard"><b>Builder profiles</b><p>Proof, products, GitHub, traction, and location.</p></div>
            <div className="ed-infocard"><b>Investor thesis pages</b><p>Stage, sector, geography, founder taste, and pass signals.</p></div>
            <div className="ed-infocard"><b>Network map</b><p>A live view of Apparent builders around any place of interest.</p></div>
          </div>
        </div>
      </section>

      {/* PRINCIPLES */}
      <section className="ed-sec ed-divider">
        <div className="ed-inner ed-work">
          <div>
            <h2 className="ed-sec-title">See the whole builder market.</h2>
            <p className="ed-lead">The traditional fundraising loop rewards proximity. Apparent shifts the center of gravity to proof: founders bring evidence, investors bring taste, and the product turns both into a network.</p>
          </div>
          <div className="ed-steps">
            <div className="ed-step"><span className="ed-n">01</span><div><h3>Proof beats proximity</h3><p>Products, GitHub, launches, press, and traction, verified in one command, should travel farther than a warm intro.</p></div></div>
            <div className="ed-step"><span className="ed-n">02</span><div><h3>Taste should be searchable</h3><p>Investors need a place to declare thesis, stage, sector, geography, and founder signals clearly.</p></div></div>
            <div className="ed-step"><span className="ed-n">03</span><div><h3>Place reveals momentum</h3><p>Builder Radar makes local clusters and nearby rooms visible before they become consensus.</p></div></div>
            <div className="ed-step"><span className="ed-n">04</span><div><h3>The intro should write itself</h3><p>AI agents work both sides, matching founders and investors on each other&apos;s criteria and opening the first message.</p></div></div>
          </div>
        </div>
      </section>

      {/* VALUES */}
      <section className="ed-sec ed-divider">
        <div className="ed-inner">
          <h2 className="ed-sec-title">We are rebuilding discovery around work.</h2>
          <div className="ed-benefits">
            <div className="ed-benefit"><svg className="ed-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3" /></svg><h3>Builders first</h3><p>The founder profile starts with shipped work instead of social proof theatre.</p></div>
            <div className="ed-benefit"><svg className="ed-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg><h3>Taste over status</h3><p>VC discovery should start from conviction, not just brand gravity.</p></div>
            <div className="ed-benefit"><svg className="ed-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 21s-7-5.2-7-11a7 7 0 0 1 14 0c0 5.8-7 11-7 11Z" /><circle cx="12" cy="10" r="2.5" /></svg><h3>Local context</h3><p>The map turns cities, venues, and clusters into a sourcing surface.</p></div>
            <div className="ed-benefit"><svg className="ed-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 3l8 4v5c0 4.5-3.2 7.6-8 9-4.8-1.4-8-4.5-8-9V7Z" /><path d="M9 12l2 2 4-4" /></svg><h3>Clear motion</h3><p>DMs, terms, and pipeline work better when they keep the original proof nearby.</p></div>
          </div>
        </div>
      </section>

      {/* ESSAY */}
      <section className="ed-band">
        <div className="ed-inner ed-essay">
          <blockquote>&ldquo;The best early companies are visible before they are famous. Apparent is designed for that exact window.&rdquo;</blockquote>
          <p>The next great companies are already shipping in public. They just aren&apos;t easy to find yet. Apparent verifies proof in one command and makes thesis searchable, then puts an AI agent on each side, so the right founder and the right investor meet in that early window instead of missing it.</p>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="ed-sec ed-divider ed-final">
        <div className="ed-inner">
          <LogoIcon className="ed-mark" />
          <h2>Join before the obvious round.</h2>
          <p>Create the profile, declare the thesis, and let Apparent turn proof into discovery.</p>
          <div className="ed-cta">
            <Link className="ed-btn ed-btn-blue" to="/login?role=founder">Create founder profile</Link>
            <Link className="ed-btn ed-btn-green" to="/login?role=investor">Create investor profile</Link>
          </div>
        </div>
      </section>
    </main>
    <EditorialFooter />
  </div>
);
