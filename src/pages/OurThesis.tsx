import { Link } from 'react-router-dom';
import { EditorialNavbar } from '../components/editorial/EditorialNavbar';
import { EditorialFooter } from '../components/editorial/EditorialFooter';

const HOT = new Set([10, 11, 18, 19]);
const ON = new Set([3, 5, 6, 13, 14, 21, 22, 25, 28, 30]);

export const OurThesis = () => (
  <div className="ed-page">
    <EditorialNavbar />
    <main>
      {/* HERO */}
      <section className="ed-subhero ed-inner">
        <h1 className="ed-display">How Apparent <em>works.</em></h1>
        <p className="ed-lede">Apparent turns founder proof and investor thesis into a usable match: profile, fit reason, map context, outreach, and deal flow.</p>
        <div className="ed-cta">
          <Link className="ed-btn ed-btn-filled" to="/login?role=founder">I&apos;m a founder</Link>
          <Link className="ed-btn ed-btn-outline" to="/login?role=investor">I&apos;m an investor</Link>
        </div>
      </section>

      {/* INTRO */}
      <section className="ed-sec ed-divider" style={{ paddingBlock: 'clamp(40px,6vw,72px)' }}>
        <div className="ed-inner">
          <h2 className="ed-sec-title">Five pieces, one fundraising workflow.</h2>
          <p className="ed-lead" style={{ marginTop: 20, maxWidth: '52ch' }}>The product is not just a directory. Apparent keeps the evidence, thesis, geography, message, and pipeline connected from the first match to the next step.</p>
        </div>
      </section>

      {/* BIG STEPS */}
      <section className="ed-sec" style={{ paddingTop: 0 }}>
        <div className="ed-inner ed-bigsteps">
          <article className="ed-bigstep">
            <div>
              <span className="ed-n">01</span>
              <h3>Create a Proof Profile</h3>
              <p>Founders put the useful evidence in one place: launch, traction, customers, product, GitHub, pitch, and the current ask.</p>
            </div>
            <div className="ed-figure"><div className="ed-fin">
              <span className="ed-dlabel">Proof profile</span>
              <div className="ed-dbar ink" style={{ width: '72%' }} />
              <div className="ed-dbar" style={{ width: '90%' }} />
              <div className="ed-dbar" style={{ width: '58%' }} />
              <div className="ed-dbar ember" style={{ width: '40%' }} />
              <div className="ed-dbar" style={{ width: '80%' }} />
              <div className="ed-drow"><span className="ed-dpill ink">GitHub</span><span className="ed-dpill">Launch</span><span className="ed-dpill">Deck</span><span className="ed-dpill">Ask</span></div>
            </div></div>
          </article>

          <article className="ed-bigstep">
            <div>
              <span className="ed-n">02</span>
              <h3>Match it to thesis</h3>
              <p>Investors define what they actually fund. Apparent compares that thesis to founder proof, stage, category, geography, and timing.</p>
            </div>
            <div className="ed-figure"><div className="ed-fin">
              <div className="ed-drow"><span className="ed-dpill">Founder proof</span><span className="ed-dline" /><span className="ed-dpill ink">Investor thesis</span></div>
              <div className="ed-drow"><span className="ed-dpill">Stage</span><span className="ed-dline" /><span className="ed-dpill ink">Check fit</span></div>
              <div className="ed-drow"><span className="ed-dpill">Sector</span><span className="ed-dline" /><span className="ed-dpill ink">Mandate</span></div>
              <div style={{ marginTop: 18 }}><span className="ed-dlabel">Thesis match</span><div style={{ fontWeight: 300, fontSize: 42, letterSpacing: '-.03em', color: 'var(--ed-ember)', lineHeight: 1 }}>92%</div></div>
            </div></div>
          </article>

          <article className="ed-bigstep">
            <div>
              <span className="ed-n">03</span>
              <h3>See where builders are moving</h3>
              <p>Builder Radar turns founder density and investor context into a map, so discovery is grounded in place instead of noise.</p>
            </div>
            <div className="ed-figure"><div className="ed-fin">
              <span className="ed-dlabel" style={{ display: 'block', marginBottom: 10 }}>Builder density</span>
              <div className="ed-dgrid">{Array.from({ length: 32 }).map((_, i) => (<i key={i} className={HOT.has(i) ? 'hot' : ON.has(i) ? 'on' : undefined} />))}</div>
            </div></div>
          </article>

          <article className="ed-bigstep">
            <div>
              <span className="ed-n">04</span>
              <h3>Start outreach with context</h3>
              <p>The agent drafts from the actual reason for fit, so messages feel specific, useful, and tied to proof.</p>
            </div>
            <div className="ed-figure"><div className="ed-fin">
              <span className="ed-dlabel">Drafted outreach</span>
              <div className="ed-dbar" style={{ width: '96%', marginTop: 12 }} />
              <div className="ed-dbar" style={{ width: '88%' }} />
              <div className="ed-dbar" style={{ width: '92%' }} />
              <div className="ed-dbar" style={{ width: '64%' }} />
              <div className="ed-drow"><span className="ed-dpill ink">Send</span><span className="ed-dpill">Edit</span><span className="ed-dlabel" style={{ marginLeft: 'auto' }}>From your thesis and their proof</span></div>
            </div></div>
          </article>

          <article className="ed-bigstep">
            <div>
              <span className="ed-n">05</span>
              <h3>Move fit into deal flow</h3>
              <p>Investors can save, review, prioritize, and follow up with builders without losing the proof that made the match matter.</p>
            </div>
            <div className="ed-figure"><div className="ed-fin">
              <div className="ed-kanban">
                <div className="ed-kcol"><div className="ed-dlabel">New</div><div className="ed-dbar" style={{ width: '100%', marginTop: 8 }} /><div className="ed-dbar" style={{ width: '100%' }} /></div>
                <div className="ed-kcol"><div className="ed-dlabel">Review</div><div className="ed-dbar ink" style={{ width: '100%', marginTop: 8 }} /></div>
                <div className="ed-kcol"><div className="ed-dlabel">Shortlist</div><div className="ed-dbar ember" style={{ width: '100%', marginTop: 8 }} /></div>
              </div>
            </div></div>
          </article>
        </div>
      </section>

      {/* CLOSING */}
      <section className="ed-band">
        <div className="ed-inner">
          <h2>Show the work. Declare the thesis. Let Apparent connect the fit.</h2>
          <p>Start with the side of the marketplace you are on. Apparent keeps the rest of the workflow attached.</p>
          <div className="ed-cta" style={{ marginTop: 32 }}>
            <Link className="ed-btn ed-btn-filled" style={{ background: 'var(--ed-paper)', color: 'var(--ed-ink)' }} to="/login?role=founder">Start as founder</Link>
            <Link className="ed-btn ed-btn-outline" style={{ borderColor: 'var(--ed-paper)', color: 'var(--ed-paper)' }} to="/login?role=investor">Start as investor</Link>
          </div>
        </div>
      </section>
    </main>
    <EditorialFooter />
  </div>
);
