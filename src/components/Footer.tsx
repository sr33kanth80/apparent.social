import { Link } from 'react-router-dom';
import { LogoIcon } from './LogoIcon';

const footerColumns = [
  {
    title: 'Product',
    links: [
      { label: 'Founder profiles', to: '/for-founders' },
      { label: 'Investor sourcing', to: '/for-vcs' },
      { label: 'Builder Radar', to: '/heat-map' },
      { label: 'How it works', to: '/#how-it-works' },
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

export const Footer = () => {
  return (
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
  );
};
