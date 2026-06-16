import { useEffect, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { LogoIcon } from './LogoIcon';
import type { AppUser } from '@/lib/apparent-types';
import { getCurrentAppUser } from '@/lib/auth-service';

const navLinks = [
  { label: 'For Founders', to: '/for-founders' },
  { label: 'For VCs', to: '/for-vcs' },
  { label: 'Heat Map', to: '/heat-map' },
  { label: 'Blog', to: '/blog' },
  { label: 'About Us', to: '/about' },
  { label: 'How it works', to: '/#how-it-works' },
];

export const AldenPublicNavbar = () => {
  const navigate = useNavigate();
  const [authChecked, setAuthChecked] = useState(false);
  const [user, setUser] = useState<AppUser | null>(null);

  useEffect(() => {
    let mounted = true;
    getCurrentAppUser()
      .then((current) => {
        if (mounted) setUser(current);
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

  return (
    <header className="alden-nav">
      <nav className="alden-shell alden-nav__inner" aria-label="Primary navigation">
        <Link to="/" className="alden-brand" aria-label="Apparent home">
          <LogoIcon className="h-6 w-6" />
          <img src="/apparent-wordmark.png" alt="Apparent" className="alden-brand__wordmark" />
        </Link>

        <div className="alden-nav__links" aria-label="Site sections">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) => `alden-nav__link${isActive ? ' alden-nav__link--active' : ''}`}
            >
              {link.label}
            </NavLink>
          ))}
        </div>

        <div className="alden-nav__actions">
          {!authChecked ? null : user ? (
            <button type="button" onClick={() => navigate(`/dashboard/${user.role}`)} className="alden-button alden-button--small">
              Go to dashboard
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          ) : (
            <>
              <button type="button" className="alden-link-button" onClick={() => navigate('/login')}>
                Log in
              </button>
              <button type="button" className="alden-button alden-button--small" onClick={() => navigate('/login')}>
                Get started
              </button>
            </>
          )}
        </div>
      </nav>
    </header>
  );
};
