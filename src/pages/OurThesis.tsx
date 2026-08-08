import { Link } from 'react-router-dom';
import { EditorialNavbar } from '../components/editorial/EditorialNavbar';
import { EditorialFooter } from '../components/editorial/EditorialFooter';
import { BuilderRadarMap } from '../components/BuilderRadarMap';
import type { BuilderMapCluster, BuilderNode } from '../lib/apparent-types';

const thesisRadarClusters = [
  {
    city: 'Seattle',
    latitude: 47.6062,
    longitude: -122.3321,
    builderCount: 18,
    categoryMix: ['AI infra', 'Developer Tools'],
    stageMix: ['Pre-seed', 'Seed'],
    latestActivity: '3 AI infra launches this week',
    latestActivityLabel: '3 launches',
    fitScore: 92,
    builderIds: ['arc-relay', 'kernelkit', 'tracebase'],
    meetups: 2,
  },
  {
    city: 'San Francisco',
    latitude: 37.7749,
    longitude: -122.4194,
    builderCount: 42,
    categoryMix: ['AI', 'Devtools'],
    stageMix: ['Seed', 'Series A'],
    latestActivity: '12 fresh VC-fit launches',
    latestActivityLabel: '12 launches',
    fitScore: 88,
    builderIds: ['northbeam'],
    meetups: 4,
  },
] satisfies BuilderMapCluster[];

const thesisRadarBuilders = [
  {
    id: 'arc-relay',
    founderId: 'maya',
    founderName: 'Maya Chen',
    company: 'Arc Relay',
    displayLabel: 'Arc Relay',
    buildSummary: 'AI devtool runtime with OSS adoption.',
    category: 'AI infrastructure',
    stage: 'Seed',
    location: 'Seattle, WA',
    latitude: 47.6205,
    longitude: -122.3493,
    proofLinks: [{ label: 'GitHub', url: '#', type: 'github' }],
    traction: '$18k MRR',
    launchCount: 2,
    latestActivity: 'Launched agent runtime benchmark',
    latestActivityLabel: 'Launched this week',
    fitScore: 92,
    matchReasons: ['OSS adoption', 'Seed timing', 'Devtools thesis'],
    profileUrl: '#',
    githubUrl: '#',
    pressUrl: '#',
    launchUrl: '#',
    rawTags: ['AI infra', 'Developer Tools'],
    origin: 'apparent',
    fundraisingStatus: 'raising',
    raisingRound: 'Seed',
    raisingAmount: '$1.2M',
    openToContact: true,
  },
  {
    id: 'kernelkit',
    founderId: 'leo',
    founderName: 'Leo Grant',
    company: 'KernelKit',
    displayLabel: 'KernelKit',
    buildSummary: 'Observability layer for agent workflows.',
    category: 'Developer Tools',
    stage: 'Pre-seed',
    location: 'Bellevue, WA',
    latitude: 47.6101,
    longitude: -122.2015,
    proofLinks: [{ label: 'Launch', url: '#', type: 'launch' }],
    traction: '14 design partners',
    launchCount: 1,
    latestActivity: 'Added enterprise pilot notes',
    latestActivityLabel: 'Updated yesterday',
    fitScore: 88,
    matchReasons: ['Technical buyer pull', 'Fresh proof'],
    profileUrl: '#',
    githubUrl: '#',
    pressUrl: '#',
    launchUrl: '#',
    rawTags: ['Observability', 'Agents'],
    origin: 'apparent',
    fundraisingStatus: 'open',
    openToContact: true,
  },
  {
    id: 'tracebase',
    founderId: 'sam',
    founderName: 'Sam Rivera',
    company: 'Tracebase',
    displayLabel: 'Tracebase',
    buildSummary: 'Workflow memory for support engineering teams.',
    category: 'B2B SaaS',
    stage: 'Seed',
    location: 'Tacoma, WA',
    latitude: 47.2529,
    longitude: -122.4443,
    proofLinks: [{ label: 'Profile', url: '#', type: 'profile' }],
    traction: '812 waitlist signups',
    launchCount: 3,
    latestActivity: 'Published customer proof',
    latestActivityLabel: 'Fresh proof',
    fitScore: 79,
    matchReasons: ['Workflow thesis', 'Regional signal'],
    profileUrl: '#',
    githubUrl: '#',
    pressUrl: '#',
    launchUrl: '#',
    rawTags: ['Workflow', 'Support'],
    origin: 'ingested',
    sourceLabel: 'Product signal',
  },
] satisfies BuilderNode[];

const thesisRadarPin = {
  label: 'Founders dinner',
  latitude: 47.6097,
  longitude: -122.3331,
};

export const OurThesis = () => (
  <div className="ed-page">
    <EditorialNavbar />
    <main>
      {/* HERO */}
      <section className="ed-subhero ed-inner">
        <h1 className="ed-display">From conviction to <em>connection.<span className="ed-display-emoji" aria-hidden="true">🤝</span></em></h1>
        <p className="ed-lede">Apparent helps founders make momentum visible and gives anyone serious about investing the tools to discover, understand, and connect with companies that fit what they believe.</p>
        <div className="ed-cta">
          <Link className="ed-btn ed-btn-blue" to="/login?role=founder">I&apos;m a founder</Link>
          <Link className="ed-btn ed-btn-green" to="/login?role=investor">I&apos;m an investor</Link>
        </div>
      </section>

      {/* INTRO */}
      <section className="ed-sec ed-divider" style={{ paddingBlock: 'clamp(40px,6vw,72px)' }}>
        <div className="ed-inner">
          <h2 className="ed-sec-title">Five pieces, one path to conviction.</h2>
          <p className="ed-lead" style={{ marginTop: 20, maxWidth: '52ch' }}>Apparent is not just a directory. It keeps founder proof, investment thesis, geography, conversation, and diligence connected from the first match to the next step.</p>
        </div>
      </section>

      {/* BIG STEPS */}
      <section className="ed-sec" style={{ paddingTop: 0 }}>
        <div className="ed-inner ed-bigsteps">
          <article className="ed-bigstep">
            <div>
              <span className="ed-n">01</span>
              <h3>Create a Proof Profile</h3>
              <p>Founders put useful evidence in one place—launch, traction, customers, product, GitHub, pitch, and the current ask—then control who can see it.</p>
            </div>
            <div className="ed-figure ed-product-figure"><div className="ed-proof-card">
              <div className="ed-ui-top">
                <span>Founder dossier</span>
                <b>Raising now</b>
              </div>
              <div className="ed-founder-head">
                <div className="ed-avatar">AR</div>
                <div>
                  <strong>Arc Relay</strong>
                  <span>AI devtool runtime, seed</span>
                </div>
                <em>$1.2M ask</em>
              </div>
              <div className="ed-proof-grid">
                <div><span>GitHub</span><b>128 commits</b></div>
                <div><span>Launch</span><b>812 signups</b></div>
                <div><span>Revenue</span><b>$18k MRR</b></div>
                <div><span>Customers</span><b>14 teams</b></div>
              </div>
              <div className="ed-proof-note">
                <span>Current pull</span>
                <p>Open source agents are adopting the runtime faster than the hosted product can onboard them.</p>
              </div>
            </div></div>
          </article>

          <article className="ed-bigstep">
            <div>
              <span className="ed-n">02</span>
              <h3>Match it to conviction</h3>
              <p>People define what they want to back. Apparent compares that thesis to founder proof, stage, category, geography, and timing.</p>
            </div>
            <div className="ed-figure ed-product-figure"><div className="ed-match-card">
              <div className="ed-ui-top">
                <span>Thesis engine</span>
                <b>92% fit</b>
              </div>
              <div className="ed-match-split">
                <div className="ed-thesis-box">
                  <span>Investor thesis</span>
                  <p>Seed devtools with usage from technical teams, OSS pull, and clear enterprise wedge.</p>
                </div>
                <div className="ed-match-score">
                  <strong>92</strong>
                  <span>ranked match</span>
                </div>
              </div>
              <div className="ed-score-list">
                <div><span>Founder proof</span><i style={{ width: '96%' }} /></div>
                <div><span>Stage and check</span><i style={{ width: '88%' }} /></div>
                <div><span>Sector overlap</span><i style={{ width: '94%' }} /></div>
                <div><span>Geography and timing</span><i style={{ width: '76%' }} /></div>
              </div>
              <div className="ed-fit-reason">Matched because GitHub growth, AI infra category, and seed timing map to the saved thesis.</div>
            </div></div>
          </article>

          <article className="ed-bigstep">
            <div>
              <span className="ed-n">03</span>
              <h3>See where builders are moving</h3>
              <p>Builder Radar turns founder density and investor context into a map, so discovery is grounded in place instead of noise.</p>
            </div>
            <div className="ed-figure ed-product-figure"><div className="ed-radar-card">
              <div className="ed-ui-top">
                <span>Builder Radar</span>
                <b>Seattle cluster</b>
              </div>
              <BuilderRadarMap
                clusters={thesisRadarClusters}
                builders={thesisRadarBuilders}
                selectedCity="Seattle"
                selectedBuilderId="arc-relay"
                role="investor"
                interestPin={thesisRadarPin}
                radiusMiles={12}
                badgeLabel="Seattle thesis radar"
                className="ed-thesis-map-stage"
                onSelectCity={() => undefined}
                onSelectBuilder={() => undefined}
                onViewportBuildersChange={() => undefined}
              />
              <div className="ed-radar-list">
                <div><b>Fresh signal</b><span>2 launches match your thesis this week.</span></div>
                <div><b>Warm context</b><span>One founder is attending a room you follow.</span></div>
              </div>
            </div></div>
          </article>

          <article className="ed-bigstep">
            <div>
              <span className="ed-n">04</span>
              <h3>Start outreach with context</h3>
              <p>The agent drafts from the actual reason for fit, so messages feel specific, useful, and tied to proof.</p>
            </div>
            <div className="ed-figure ed-product-figure"><div className="ed-outreach-card">
              <div className="ed-ui-top">
                <span>Agent draft</span>
                <b>Review before send</b>
              </div>
              <div className="ed-reason-card">
                <span>Reason for fit</span>
                <p>Arc Relay maps to your AI infra thesis through OSS adoption, technical buyer pull, and a seed round opening this month.</p>
              </div>
              <div className="ed-message-card">
                <b>Hi Maya, Arc Relay stood out because...</b>
                <p>I found the GitHub growth and agent runtime adoption relevant to your devtools thesis. Worth a quick read?</p>
              </div>
              <div className="ed-action-row"><button type="button">Edit</button><button type="button" className="primary">Send</button></div>
            </div></div>
          </article>

          <article className="ed-bigstep">
            <div>
              <span className="ed-n">05</span>
              <h3>Carry conviction forward</h3>
              <p>Investors can save, review, prioritize, and follow up with founders without losing the proof that made the match matter.</p>
            </div>
            <div className="ed-figure ed-product-figure"><div className="ed-pipeline-card">
              <div className="ed-ui-top">
                <span>Deal flow</span>
                <b>Proof stays attached</b>
              </div>
              <div className="ed-kanban">
                <div className="ed-kcol"><span>New</span><div>Arc Relay <b>92%</b></div><div>Northbeam <b>81%</b></div></div>
                <div className="ed-kcol active"><span>Review</span><div>KernelKit <b>88%</b></div></div>
                <div className="ed-kcol"><span>Shortlist</span><div>Tracebase <b>79%</b></div></div>
              </div>
              <div className="ed-next-step">
                <span>Next move</span>
                <p>Review Arc Relay deck, then schedule founder office hours from the matched room.</p>
              </div>
            </div></div>
          </article>
        </div>
      </section>

      {/* CLOSING */}
      <section className="ed-band">
        <div className="ed-inner">
          <h2>Show the work. Define what you believe. Let Apparent connect the fit.</h2>
          <p>Whether you are building a company or learning to invest in one, Apparent keeps the evidence and relationship attached.</p>
          <div className="ed-cta" style={{ marginTop: 32 }}>
            <Link className="ed-btn ed-btn-blue" to="/login?role=founder">Start as founder</Link>
            <Link className="ed-btn ed-btn-green" to="/login?role=investor">Start as investor</Link>
          </div>
        </div>
      </section>
    </main>
    <EditorialFooter />
  </div>
);
