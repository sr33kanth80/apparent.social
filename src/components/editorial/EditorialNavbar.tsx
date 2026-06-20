import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { LogoIcon } from '../LogoIcon';

const NAV_LINKS: [string, string][] = [
  ['/for-vcs', 'For investors'],
  ['/for-founders', 'For founders'],
  ['/our-thesis', 'Thesis'],
  ['/heat-map', 'Heat Map'],
  ['/blog', 'Blog'],
  ['/about', 'About'],
];

// Top nav for the redesigned public site. Shrinks into a centered floating
// pill once the page is scrolled. Real routes; auth goes to /login.
export const EditorialNavbar = () => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={`ed-nav${scrolled ? ' is-scrolled' : ''}`}>
      <div className="ed-nav-row">
        <Link to="/" className="ed-brand" aria-label="Apparent home">
          <LogoIcon className="ed-mark" />
          <img className="ed-word" src="/apparent-wordmark.png" alt="Apparent" />
        </Link>
        <nav className="ed-nav-links" aria-label="Site sections">
          {NAV_LINKS.map(([to, label]) => (
            <NavLink key={to} to={to} className={({ isActive }) => (isActive ? 'is-active' : undefined)}>
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="ed-nav-actions">
          <Link className="ed-nav-login" to="/login">Log in</Link>
          <Link className="ed-btn ed-btn-filled" to="/login">Sign up</Link>
        </div>
      </div>
    </header>
  );
};
