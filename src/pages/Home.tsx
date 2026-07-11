import L, { type Map as LeafletMap } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useRef, useState } from 'react';
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

const DENSITY_CENTER: [number, number] = [37.7767, -122.4242];
const DENSITY_TILE_URL =
  (import.meta.env.VITE_NETWORK_TILE_URL as string | undefined) ||
  'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

const DENSITY_BUILDERS = [
  { lat: 37.7779, lng: -122.4231, initials: 'AK', company: 'Edge runtime', meta: '0.2 mi' },
  { lat: 37.7718, lng: -122.4265, initials: 'NL', company: 'Sync engine', meta: '0.5 mi' },
  { lat: 37.7822, lng: -122.4313, initials: 'RS', company: 'Eval harness', meta: '0.8 mi' },
  { lat: 37.7691, lng: -122.4146, initials: 'VM', company: 'Vector memory', meta: '1.0 mi' },
  { lat: 37.7856, lng: -122.4148, initials: 'IO', company: 'Infra ops', meta: '1.3 mi' },
] as const;

const DensityMapPreview = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: DENSITY_CENTER,
      zoom: 14,
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      touchZoom: false,
      boxZoom: false,
      keyboard: false,
    });

    L.tileLayer(DENSITY_TILE_URL, {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    L.circle(DENSITY_CENTER, {
      radius: 1400,
      color: '#5d2a1a',
      weight: 1,
      fillColor: '#5d2a1a',
      fillOpacity: 0.1,
    }).addTo(map);

    L.marker(DENSITY_CENTER, {
      interactive: false,
      icon: L.divIcon({
        html: '<div class="ed-density-place-pin"><span></span></div>',
        className: 'ed-density-marker-shell',
        iconSize: [34, 42],
        iconAnchor: [17, 38],
      }),
    }).addTo(map);

    DENSITY_BUILDERS.forEach((builder) => {
      L.marker([builder.lat, builder.lng], {
        interactive: false,
        icon: L.divIcon({
          html: `<div class="ed-density-builder-marker"><span>${builder.initials}</span><b>${builder.company}</b><small>${builder.meta}</small></div>`,
          className: 'ed-density-marker-shell',
          iconSize: [104, 34],
          iconAnchor: [16, 17],
        }),
      }).addTo(map);
    });

    mapRef.current = map;
    window.setTimeout(() => map.invalidateSize({ animate: false }), 0);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  return <div ref={containerRef} className="ed-density-map-canvas" aria-hidden="true" />;
};

const VC_LOGOS = [
  ['Accel', 'www.accel.com'],
  ['8VC', 'www.8vc.com'],
  ['Bessemer', 'www.bvp.com'],
  ['Bain Capital Ventures', 'www.baincapitalventures.com'],
  ['FJ Labs', 'www.fjlabs.com'],
  ['500 Global', 'www.500.co'],
  ['Madrona', 'www.madrona.com'],
  ['Upfront Ventures', 'www.upfront.com'],
  ['Initialized Capital', 'www.initialized.com'],
  ['Founder Collective', 'foundercollective.com'],
  ['Threshold Ventures', 'www.threshold.vc'],
  ['LocalGlobe', 'localglobe.vc'],
  ['Innovation Endeavors', 'www.innovationendeavors.com'],
  ['Jackson Square Ventures', 'www.jsv.com'],
  ['Javelin Venture Partners', 'www.javelinvp.com'],
  ['Jazz Venture Partners', 'www.jazzvp.com'],
  ['Acrew Capital', 'www.acrewcapital.com'],
  ['Amino Capital', 'www.aminocapital.com'],
  ['Abstract', 'www.abstract.com'],
  ['Glasswing Ventures', 'www.glasswing.vc'],
  ['Hyperplane', 'hyperplane.vc'],
  ['BootstrapLabs', 'www.bootstraplabs.com'],
  ['BBG Ventures', 'www.bbgventures.com'],
  ['Flourish Ventures', 'www.flourishventures.com'],
  ['Pioneer Square Labs', 'www.psl.com'],
  ['FUSE', 'www.fuse.vc'],
  ['Ascend', 'www.ascend.vc'],
  ['Founders Co-op', 'www.founderscoop.com'],
  ['01 Advisors', 'www.01a.com'],
  ['1517 Fund', 'www.1517fund.com'],
  ['2048 Ventures', 'www.2048.vc'],
  ['January Ventures', 'www.january.ventures'],
  ['Operator Partners', 'www.operatorpartners.com'],
  ['Shrug Capital', 'www.shrug.vc'],
  ['The Fund', 'www.thefund.vc'],
  ['MaC Venture Capital', 'www.macventurecapital.com'],
  ['4DX Ventures', 'www.4dxventures.com'],
  ['7wire Ventures', 'www.7wireventures.com'],
  ['Altos Ventures', 'www.altos.vc'],
  ['Voyager Capital', 'www.voyagercapital.com'],
] as const;

const VC_LOGO_ROWS = [
  VC_LOGOS.slice(0, 14),
  VC_LOGOS.slice(14, 28),
  VC_LOGOS.slice(28),
] as const;

const vcLogoUrl = (website: string) => `https://www.google.com/s2/favicons?sz=128&domain_url=${encodeURIComponent(`https://${website}`)}`;

const VerifiedBadge = ({ className = '' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 22 22" aria-hidden="true" focusable="false">
    <path
      fill="currentColor"
      d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.69-.13.635-.08 1.293.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.604-.274 1.26-.144 1.896.13.636.433 1.221.878 1.69.47.446 1.055.752 1.69.883.635.13 1.294.083 1.902-.141.27.587.7 1.086 1.24 1.44s1.167.551 1.813.568c.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.224 1.26.272 1.895.141.636-.13 1.22-.436 1.69-.883.445-.468.749-1.053.882-1.688.13-.634.085-1.29-.138-1.896.587-.274 1.084-.705 1.438-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z"
    />
  </svg>
);

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
          <div className="ed-mock-head"><span className="ed-t">Builder density - SF</span><span className="ed-live"><i />18 nearby</span></div>
          <div className="ed-density-map" role="img" aria-label="Map of builder density around Hayes Valley in San Francisco">
            <DensityMapPreview />
            <div className="ed-density-map-chip">
              <b>Hayes Valley</b>
              <span>focus place</span>
            </div>
          </div>
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
            <h1 className="ed-display">
              Where <span className="ed-hero-keep">traction 📈</span> meets{' '}
              <em className="ed-hero-keep">conviction💸</em>
            </h1>
            <p className="ed-sub">Apparent connects founders who&apos;ve shipped with investors who are actively writing cheques. Founders turn proof into intros; investors source startups that fit their thesis, ranked by proof, stage, and freshness.</p>
            <div className="ed-cta">
              <Link className="ed-btn ed-btn-green" to="/login?role=investor">Source your deal flow
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 17 17 7M9 7h8v8" /></svg>
              </Link>
              <Link className="ed-btn ed-btn-outline-blue" to="/for-founders">I&apos;m a founder</Link>
            </div>
            <div className="ed-trust">
              <span><b>1,800+</b> investors on Apparent</span><span className="ed-d" />
              <span className="ed-trust-verified"><VerifiedBadge className="ed-vb ed-vb-sm" />Verified proof, not pitches</span><span className="ed-d" />
              <span>No warm intro required</span>
            </div>
            <div className="ed-logos">
              <span className="ed-lbl">VCs mapped in Builder Radar</span>
              <div className="ed-logo-cloud" aria-label="VC firms listed in Apparent's investor heatmap">
                {VC_LOGO_ROWS.map((row, rowIndex) => (
                  <div className={`ed-logo-row row-${rowIndex + 1}`} key={rowIndex}>
                    <div className="ed-logo-track">
                      {[0, 1].map((copy) =>
                        row.map(([name, website]) => (
                          <span className="ed-vc-logo" key={`${name}-${copy}`} title={name} aria-hidden={copy === 1}>
                            <img src={vcLogoUrl(website)} alt="" loading="lazy" />
                            <span>{name}</span>
                          </span>
                        )),
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="ed-surface-wrap" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
            <div className="ed-tabbar" role="tablist">
              {TABS.map((t) => (
                <button key={t} className={`${t === tab ? 'is-active' : ''}`} onClick={() => setTab(t)} type="button">
                  {t[0].toUpperCase() + t.slice(1)}
                </button>
              ))}
              <div className="ed-live-picker">
                <button className="ed-visit" type="button" aria-haspopup="true">
                  See it live
                </button>
                <div className="ed-live-menu" aria-label="Choose live demo audience">
                  <Link to="/for-founders">Founders</Link>
                  <Link to="/for-vcs">Investors</Link>
                </div>
              </div>
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
        <section id="builder-radar" className="ed-sec ed-divider ed-map-feature">
          <div className="ed-inner">
            <div className="ed-map-head">
              <div>
              <h2 className="ed-sec-title">Capital is easier to read when it has a shape.</h2>
              <p className="ed-lead">Builder Radar plots investors and builders by geography, stage, and thesis instead of burying them in a spreadsheet. Read the density before it becomes consensus.</p>
              </div>
              <Link className="ed-btn ed-btn-filled" to="/heat-map">Open Builder Radar</Link>
            </div>
            <div className="ed-map-stage">
              <HeatMap includeVCContacts vcOnly fullBleed fillParent lockContacts />
            </div>
          </div>
        </section>

        {/* WORKFLOW */}
        <section className="ed-sec ed-divider">
          <div className="ed-inner ed-work">
            <div>
              <h2 className="ed-sec-title">See the sourcing picture earlier.</h2>
              <p className="ed-lead">Apparent turns builder proof, public signals, local density, and your thesis into one repeatable sourcing workflow.</p>
              <Link className="ed-btn ed-btn-green" to="/for-vcs" style={{ marginTop: 28 }}>Build your thesis</Link>
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
                <div className="ed-acard-head">
                  <LogoIcon className="ed-acard-mark" />
                  <span>Founder proof</span>
                </div>
                <h3>Make your strongest signal visible.</h3>
                <ul>
                  <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="9" /><path d="M9 12l2 2 4-4" /></svg>Verified builds, launches, and traction in one quiet profile.</li>
                  <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="9" /><path d="M9 12l2 2 4-4" /></svg>Investor matching by thesis, stage, sector, and geography.</li>
                  <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="9" /><path d="M9 12l2 2 4-4" /></svg>An AI founder agent that drafts focused, fit-based outreach.</li>
                </ul>
                <Link className="ed-btn ed-btn-blue" to="/for-founders">Create founder profile</Link>
              </div>
              <div className="ed-acard">
                <div className="ed-acard-head">
                  <LogoIcon className="ed-acard-mark" />
                  <span>Investor desk</span>
                </div>
                <h3>Source builders by evidence.</h3>
                <ul>
                  <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="2.5" /></svg>A thesis-aware view of builders with real proof behind them.</li>
                  <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="2.5" /></svg>Ranking that separates active signal from stale fundraising lists.</li>
                  <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="2.5" /></svg>AI-suggested outreach grounded in why the founder fits.</li>
                </ul>
                <Link className="ed-btn ed-btn-green" to="/for-vcs">Create investor profile</Link>
              </div>
            </div>
          </div>
        </section>

        {/* DARK BAND */}
        <section className="ed-band">
          <div className="ed-inner ed-band-grid">
            <div>
              <h2>By the time it&apos;s consensus, the round is full.</h2>
              <p>Apparent surfaces founders who fit your thesis while they&apos;re still building, not after the deal turns competitive.</p>
            </div>
            <div className="ed-band-signal" aria-hidden="true">
              <LogoIcon className="ed-band-mark" />
              <div className="ed-band-lines">
                <span>Proof profile</span>
                <span>Thesis fit</span>
                <span>Drafted outreach</span>
              </div>
              <div className="ed-band-score">
                <b>96</b>
                <span>fit</span>
              </div>
            </div>
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
              <Link className="ed-btn ed-btn-outline-blue" to="/for-founders">Create founder profile</Link>
            </div>
            <div className="ed-cards">
              {[
                ['AK', 'Edge runtime for agents', 'Dev tools · Pre-seed', 'Founder-supplied summary of the company, proof, and current ask. Owner controlled.', 'Pre-seed', '$1.2M', 'Deck', '96 fit'],
                ['NL', 'Local-first sync engine', 'AI infra · Seed', 'A second preview card showing the product, team, proof links, and investor materials.', 'Seed', '$3M', 'Pitch video', '92 fit'],
                ['RS', 'Eval harness for LLMs', 'Dev tools · Pre-seed', 'A reusable card for the product, team, proof links, and current raise.', 'Pre-seed', '$800k', 'Deck', '89 fit'],
              ].map((c) => (
                <article className="ed-card" key={c[0]}>
                  <div className="ed-ch"><div className="ed-av">{c[0]}</div><div><b>{c[1]}</b><span>{c[2]}</span></div><span className="ed-badge ed-badge-icon" aria-label="Verified"><VerifiedBadge className="ed-vb" /></span></div>
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
              <Link className="ed-btn ed-btn-green" to="/login?role=investor">Source your deal flow</Link>
              <Link className="ed-btn ed-btn-outline" to="/contact">Book a walkthrough</Link>
            </div>
          </div>
        </section>
      </main>

      <EditorialFooter />
    </div>
  );
};
