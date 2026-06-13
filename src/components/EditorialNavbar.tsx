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
];

export const EditorialNavbar = () => {
  const navigate = useNavigate();
  // Auth-aware CTAs: a logged-in visitor on a marketing page should see a way
  // back to their dashboard, not "Log in / Get started". `authChecked` gates
  // the auth slot so a signed-in user never flashes the logged-out buttons.
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
    <header className="monad monad-nav sticky top-0 z-50 border-b border-ink bg-parchment">
      <nav className="mx-auto flex max-w-[1200px] items-center justify-between gap-4 px-6 py-4">
        <Link to="/" className="monad-nav__brand flex items-center gap-2.5" aria-label="Apparent home">
          <LogoIcon className="h-6 w-6 text-ink" />
          <span className="font-serif text-[22px] leading-none text-ink">Apparent</span>
        </Link>

        <div className="hidden items-center gap-2 rounded-full border border-ink/10 bg-parchment/65 px-2 py-1 md:flex">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `monad-nav__link rounded-full px-3 py-2 font-mono text-[13px] transition-colors ${
                  isActive ? 'border border-ink/20 text-ink' : 'border border-transparent text-graphite hover:text-ink'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </div>

        <div className="flex items-center gap-2.5">
          {!authChecked ? null : user ? (
            <button
              type="button"
              onClick={() => navigate(`/dashboard/${user.role}`)}
              className="monad-cta inline-flex items-center gap-1.5 bg-[#cfdaf5] px-5 py-2.5 font-mono text-[14px] text-ink hover:bg-[#bcc8ef]"
            >
              Go to dashboard
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="monad-cta hidden border border-ink bg-parchment px-5 py-2.5 font-mono text-[13px] text-ink hover:bg-ink hover:text-parchment sm:inline-flex"
              >
                Log in
              </button>
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="monad-cta inline-flex items-center gap-1.5 bg-charcoal px-5 py-2.5 font-mono text-[13px] text-parchment hover:bg-ink"
              >
                Get started
                <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>
      </nav>
    </header>
  );
};
