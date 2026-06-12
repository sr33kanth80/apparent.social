import { ArrowUpRight } from 'lucide-react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { LogoIcon } from './LogoIcon';

const navLinks = [
  { label: 'For Founders', to: '/for-founders' },
  { label: 'For VCs', to: '/for-vcs' },
  { label: 'Heat Map', to: '/heat-map' },
  { label: 'Blog', to: '/blog' },
  { label: 'About Us', to: '/about' },
];

export const EditorialNavbar = () => {
  const navigate = useNavigate();

  return (
    <header className="monad sticky top-0 z-50 border-b border-ink bg-parchment">
      <nav className="mx-auto flex max-w-[1200px] items-center justify-between gap-4 px-6 py-4">
        <Link to="/" className="flex items-center gap-2.5" aria-label="Apparent home">
          <LogoIcon className="h-6 w-6 text-ink" />
          <span className="font-serif text-[22px] leading-none text-ink">Apparent</span>
        </Link>

        <div className="hidden items-center gap-7 md:flex">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `font-mono text-[14px] tracking-[-0.02em] transition-colors ${
                  isActive ? 'text-ink' : 'text-graphite hover:text-ink'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="monad-cta hidden border border-ink px-5 py-2.5 font-mono text-[14px] text-ink hover:bg-ink hover:text-parchment sm:inline-flex"
          >
            Log in
          </button>
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="monad-cta inline-flex items-center gap-1.5 bg-[#cfdaf5] px-5 py-2.5 font-mono text-[14px] text-ink hover:bg-[#bcc8ef]"
          >
            Get started
            <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </nav>
    </header>
  );
};
