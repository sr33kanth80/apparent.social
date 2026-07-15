import { useKindeAuth } from '@kinde-oss/kinde-auth-react';
import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import type { AppUser } from '@/lib/apparent-types';
import { getCurrentAppUser } from '@/lib/auth-service';
import { isKindeConfigured, resolveKindeRole } from '@/lib/kinde-auth';
import { LogoIcon } from '../LogoIcon';

const NAV_LINKS: [string, string][] = [
  ['/for-vcs', 'For investors'],
  ['/for-founders', 'For founders'],
  ['/our-thesis', 'Thesis'],
  ['/heat-map', 'Heat Map'],
  ['/blog', 'Blog'],
  ['/about', 'About'],
];

const AuthActionPlaceholder = () => (
  <span aria-hidden="true" className="ed-btn ed-btn-blue ed-nav-auth-placeholder">Dashboard</span>
);

const SignedOutAction = () => <Link className="ed-btn ed-btn-blue" to="/login">Get Started</Link>;

const KindeAuthAction = () => {
  const { isAuthenticated, isLoading, user } = useKindeAuth();

  if (isLoading) return <AuthActionPlaceholder />;

  if (isAuthenticated && user) {
    const role = resolveKindeRole(user.id, 'founder');
    return <Link className="ed-btn ed-btn-blue" to={`/dashboard/${role}`}>Dashboard</Link>;
  }

  return <SignedOutAction />;
};

const LegacyAuthAction = () => {
  const [authChecked, setAuthChecked] = useState(false);
  const [user, setUser] = useState<AppUser | null>(null);

  useEffect(() => {
    let mounted = true;

    getCurrentAppUser()
      .then((currentUser) => {
        if (mounted) setUser(currentUser);
      })
      .catch(() => {
        if (mounted) setUser(null);
      })
      .finally(() => {
        if (mounted) setAuthChecked(true);
      });

    return () => {
      mounted = false;
    };
  }, []);

  if (!authChecked) return <AuthActionPlaceholder />;
  if (user) return <Link className="ed-btn ed-btn-blue" to={`/dashboard/${user.role}`}>Dashboard</Link>;
  return <SignedOutAction />;
};

const NavbarAuthAction = () => (isKindeConfigured ? <KindeAuthAction /> : <LegacyAuthAction />);

// Top nav for the redesigned public site. Shrinks into a centered floating
// pill once the page is scrolled and keeps its primary action session-aware.
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
          <NavbarAuthAction />
        </div>
      </div>
    </header>
  );
};
