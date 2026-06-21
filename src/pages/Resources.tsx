import { Link } from 'react-router-dom';
import { EditorialNavbar } from '../components/editorial/EditorialNavbar';
import { EditorialFooter } from '../components/editorial/EditorialFooter';
import { LogoIcon } from '../components/LogoIcon';

export const Resources = () => (
  <div className="ed-page">
    <EditorialNavbar />
    <main>
      {/* HERO */}
      <section className="ed-subhero ed-inner">
        <h1 className="ed-display">Resources for finding <em>signal.</em></h1>
        <p className="ed-lede">Guides, playbooks, and product notes for using Apparent as a founder proof profile, investor sourcing desk, Builder Radar, and deal workflow.</p>
        <div className="ed-cta"><Link className="ed-btn ed-btn-filled" to="/login">Start learning</Link></div>
      </section>

      {/* GUIDES */}
      <section className="ed-sec ed-divider">
        <div className="ed-inner">
          <h2 className="ed-sec-title">We&apos;ve cracked the workflows.</h2>
          <p className="ed-lead">Each resource maps to a real product surface inside Apparent: profiles, thesis capture, radar discovery, DMs, terms, and deal flow.</p>
          <div className="ed-benefits">
            <div className="ed-benefit"><svg className="ed-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 5a2 2 0 0 1 2-2h11v18H6a2 2 0 0 1-2-2Z" /><path d="M17 3a2 2 0 0 1 2 2v14" /></svg><h3>Founder profile guide</h3><p>Structure products, GitHub, traction, press, and capital goals so investors can scan proof fast.</p></div>
            <div className="ed-benefit"><svg className="ed-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg><h3>Investor sourcing guide</h3><p>Turn thesis, stage, geography, and founder taste into ranked sourcing criteria.</p></div>
            <div className="ed-benefit"><svg className="ed-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 3 3 5v16l6-2 6 2 6-2V3l-6 2-6-2Z" /><path d="M9 3v16M15 5v16" /></svg><h3>Builder Radar manual</h3><p>Search places, locate nearby projects, filter builders, and read local cluster signal.</p></div>
            <div className="ed-benefit"><svg className="ed-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" /></svg><h3>DM playbook</h3><p>Draft founder notes, investor replies, and meetup follow-ups without losing context.</p></div>
          </div>
        </div>
      </section>

      {/* BAND */}
      <section className="ed-band">
        <div className="ed-inner">
          <h2>The clearest proof gets the meeting.</h2>
          <p>These guides show founders how to make their work legible, and investors how to turn taste into a searchable thesis.</p>
        </div>
      </section>

      {/* PLAYBOOKS */}
      <section className="ed-sec ed-divider">
        <div className="ed-inner ed-work">
          <div>
            <h2 className="ed-sec-title">See the path from signal to motion.</h2>
            <p className="ed-lead">The useful parts of Apparent are connected. These notes explain how to move from profile proof to radar discovery, first message, and deal-room context.</p>
            <Link className="ed-btn ed-btn-filled" to="/login" style={{ marginTop: 28 }}>Discover more</Link>
          </div>
          <div className="ed-steps">
            <div className="ed-step"><span className="ed-n">01</span><div><h3>Make a proof profile pop</h3><p>The fields that matter most when investors scan a builder profile.</p></div></div>
            <div className="ed-step"><span className="ed-n">02</span><div><h3>Write a thesis people can search</h3><p>How to turn investment taste into precise Apparent criteria.</p></div></div>
            <div className="ed-step"><span className="ed-n">03</span><div><h3>Use Builder Radar properly</h3><p>How location, freshness, category, and density guide discovery.</p></div></div>
            <div className="ed-step"><span className="ed-n">04</span><div><h3>Move from signal to first message</h3><p>Save a builder, draft outreach, and move into deal flow.</p></div></div>
          </div>
        </div>
      </section>

      {/* WALKTHROUGHS */}
      <section className="ed-sec ed-divider">
        <div className="ed-inner">
          <h2 className="ed-sec-title">Product walkthroughs.</h2>
          <div className="ed-infocards" style={{ marginTop: 'clamp(32px,5vw,56px)' }}>
            <div className="ed-infocard"><b>Founder workspace</b><p>Save proof profile, launches, messages, and investor matches.</p></div>
            <div className="ed-infocard"><b>Investor workspace</b><p>Save thesis, rank signals, draft outreach, and move builders through Kanban.</p></div>
            <div className="ed-infocard"><b>Builder Radar</b><p>Search a place, locate nearby projects, and filter builders around the map focus.</p></div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="ed-sec ed-divider ed-final">
        <div className="ed-inner">
          <LogoIcon className="ed-mark" />
          <h2>Learn it inside the product.</h2>
          <p>The best resource is the workspace itself. Start as a founder or investor and let the product guide the next move.</p>
          <div className="ed-cta">
            <Link className="ed-btn ed-btn-filled" to="/login?role=founder">Create founder profile</Link>
            <Link className="ed-btn ed-btn-outline" to="/login?role=investor">Create investor profile</Link>
          </div>
        </div>
      </section>
    </main>
    <EditorialFooter />
  </div>
);
