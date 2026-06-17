import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  CircleDot,
  GitBranch,
  MapPin,
  MessagesSquare,
  Search,
} from 'lucide-react';
import { LogoIcon } from '../components/LogoIcon';
import { LogoCloud } from '../components/logo-cloud';
import { useReveal } from '../lib/useReveal';
import { HeatMap } from './HeatMap';

const navLinks = [
  { label: 'For Founders', to: '/for-founders' },
  { label: 'For VCs', to: '/for-vcs' },
  { label: 'Heat Map', to: '/heat-map' },
  { label: 'Blog', to: '/blog' },
  { label: 'About Us', to: '/about' },
  { label: 'How it works', to: '/our-thesis' },
];

const footerColumns = [
  {
    title: 'Product',
    links: [
      { label: 'Founder profiles', to: '/for-founders' },
      { label: 'Investor sourcing', to: '/for-vcs' },
      { label: 'Builder Radar', to: '/heat-map' },
      { label: 'How it works', to: '/our-thesis' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', to: '/about' },
      { label: 'Blog', to: '/blog' },
      { label: 'Resources', to: '/resources' },
      { label: 'Our Thesis', to: '/our-thesis' },
      { label: 'Contact', to: '/contact' },
      { label: 'Get started', to: '/login' },
    ],
  },
];

const founderSignals = [
  'Verified builds, launches, and traction in one quiet profile.',
  'Investor matching by thesis, stage, sector, and geography.',
  'An AI founder agent that drafts focused, fit-based outreach.',
];

const investorSignals = [
  'A thesis-aware view of builders with real proof behind them.',
  'Ranking that separates active signal from stale fundraising lists.',
  'AI-suggested outreach grounded in why the founder fits.',
];

const workflow = [
  {
    icon: GitBranch,
    title: 'Verify the work',
    text: 'Founders connect the proof they already have: code, launches, traction, and public momentum.',
  },
  {
    icon: Search,
    title: 'Match the thesis',
    text: 'Apparent compares stage, sector, geography, and investor criteria before suggesting a path.',
  },
  {
    icon: MessagesSquare,
    title: 'Open the right intro',
    text: 'Agents help both sides start with context, not a cold template or a generic database export.',
  },
];

export const Home = () => {
  const navigate = useNavigate();
  const location = useLocation();
  useReveal();

  return (
    <main className="alden-landing min-h-screen bg-[var(--alden-paper)] text-[var(--alden-ink)]">
      <header className="alden-nav">
        <nav className="alden-shell alden-nav__inner" aria-label="Primary navigation">
          <Link to="/" className="alden-brand" aria-label="Apparent home">
            <LogoIcon className="h-6 w-6" />
            <img src="/apparent-wordmark.png" alt="Apparent" className="alden-brand__wordmark" />
          </Link>

          <div className="alden-nav__links" aria-label="Site sections">
            {navLinks.map((link) => {
              const isHashLink = link.to.startsWith('#');
              const isActive = isHashLink ? location.hash === link.to : location.pathname === link.to;
              const className = `alden-nav__link${isActive ? ' alden-nav__link--active' : ''}`;

              return isHashLink ? (
                <a key={link.to} href={link.to} className={className} aria-current={isActive ? 'page' : undefined}>
                  {link.label}
                </a>
              ) : (
                <Link key={link.to} to={link.to} className={className} aria-current={isActive ? 'page' : undefined}>
                  {link.label}
                </Link>
              );
            })}
          </div>

          <div className="alden-nav__actions">
            <button type="button" className="alden-button alden-button--small" onClick={() => navigate('/login')}>
              Get started
            </button>
          </div>
        </nav>
      </header>

      <section className="alden-hero alden-shell" data-reveal>
        <div className="alden-hero__copy">
          <h1>
            Meet investors who actually <span>fit.</span>
          </h1>
          <p>
            Apparent turns verified founder signal into investor matches, ranked by thesis, stage, sector,
            and timing. The product stays quiet so the proof can do the talking.
          </p>
          <div className="alden-hero__actions">
            <button type="button" className="alden-button" onClick={() => navigate('/login?role=founder')}>
              I am a founder
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
            <button type="button" className="alden-button alden-button--ghost" onClick={() => navigate('/login?role=investor')}>
              I am an investor
            </button>
          </div>
          <LogoCloud className="alden-logo-cloud--hero" />
        </div>
      </section>

      <section id="heat-map" className="alden-map-section" aria-label="Investor heat map">
        <div className="alden-shell">
          <div className="alden-map-copy" data-reveal>
            <h2>
              Capital is easier to read when it has a <span>shape.</span>
            </h2>
            <p>
              The heat map stays on the landing page because it is the clearest view of the Apparent network:
              investors plotted by geography, stage, and thesis instead of buried in a spreadsheet.
            </p>
            <Link to="/heat-map" className="alden-map-link">
              Open full heat map
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          <div className="alden-map-frame" data-reveal>
            <HeatMap includeVCContacts vcOnly fullBleed fillParent lockContacts />
          </div>
        </div>
      </section>

      <section id="how-it-works" className="alden-editorial alden-shell" data-reveal>
        <h2>
          A calmer way to find the <span>right conversation.</span>
        </h2>
        <p>
          Apparent is not another noisy fundraising directory. It keeps the workflow narrow: prove the work,
          match the thesis, then open a conversation with context.
        </p>

        <div className="alden-workflow">
          {workflow.map((item, index) => {
            const Icon = item.icon;
            return (
              <article className="alden-workflow-card" key={item.title} data-reveal style={{ transitionDelay: `${index * 90}ms` }}>
                <div className="alden-workflow-card__top">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                  <span>0{index + 1}</span>
                </div>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section id="for-who" className="alden-two-column">
        <div className="alden-shell alden-two-column__inner">
          <article className="alden-audience-card" data-reveal>
            <h2>
              Make your strongest signal <span>visible.</span>
            </h2>
            <ul>
              {founderSignals.map((signal) => (
                <li key={signal}>
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  <span>{signal}</span>
                </li>
              ))}
            </ul>
            <button type="button" className="alden-button" onClick={() => navigate('/login?role=founder')}>
              Create founder profile
            </button>
          </article>

          <article className="alden-audience-card" data-reveal>
            <h2>
              Source builders by <span>evidence.</span>
            </h2>
            <ul>
              {investorSignals.map((signal) => (
                <li key={signal}>
                  <CircleDot className="h-4 w-4" aria-hidden="true" />
                  <span>{signal}</span>
                </li>
              ))}
            </ul>
            <button type="button" className="alden-button alden-button--ghost" onClick={() => navigate('/login?role=investor')}>
              Create investor profile
            </button>
          </article>
        </div>
      </section>

      <section className="alden-quote alden-shell" data-reveal>
        <div className="alden-quote__wash" aria-hidden="true" />
        <blockquote>
          The warm intro was a proxy for trust. Apparent makes the actual <span>proof</span> easier to read.
        </blockquote>
        <div className="alden-attribution">
          <div className="alden-avatar-stack" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <div>
            <strong>Apparent network</strong>
            <p>Founders, operators, and early-stage investors</p>
          </div>
        </div>
      </section>

      <section className="alden-final alden-shell" data-reveal>
        <MapPin className="h-6 w-6" aria-hidden="true" />
        <h2>
          Find the few matches that <span>matter.</span>
        </h2>
        <p>Start with a verified profile or a thesis-aware sourcing desk. Both paths meet at fit.</p>
        <div className="alden-hero__actions">
          <button type="button" className="alden-button" onClick={() => navigate('/login?role=founder')}>
            Start as founder
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
          <button type="button" className="alden-link-button" onClick={() => navigate('/login?role=investor')}>
            Start as investor
          </button>
        </div>
      </section>

      <footer className="alden-footer">
        <div className="alden-shell">
          <div className="alden-footer__main">
            <div className="alden-footer__brand-block">
              <Link to="/" className="alden-brand" aria-label="Apparent home">
                <LogoIcon className="h-6 w-6" />
                <img src="/apparent-wordmark.png" alt="Apparent" className="alden-brand__wordmark" />
              </Link>
              <p>
                Proof of work is the new warm intro. Founders show what they have built. Investors find them by
                thesis, proof, and timing.
              </p>
            </div>

            {footerColumns.map((column) => (
              <div className="alden-footer__column" key={column.title}>
                <h3>{column.title}</h3>
                <ul>
                  {column.links.map((link) => (
                    <li key={link.to}>
                      <Link to={link.to}>{link.label}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="alden-footer__bottom">
            <p>&copy; 2026 Apparent. All rights reserved.</p>
            <div className="alden-footer__legal">
              <Link to="/privacy">Privacy Policy</Link>
              <Link to="/terms">Terms of Service</Link>
              <Link to="/cookies">Cookie Policy</Link>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
};
