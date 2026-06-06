import { useEffect, useState, useRef } from 'react';
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
  const linksRef = useRef<HTMLDivElement | null>(null);
  const positionPill = (el: HTMLElement | null) => {
    const container = linksRef.current;
    if (!container || !el) return;
    const cr = container.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const BORDER_ADJUST = 1;
    const left = r.left - cr.left - BORDER_ADJUST;
    const top = r.top - cr.top - BORDER_ADJUST;
    const width = r.width + BORDER_ADJUST * 2;
    const height = r.height + BORDER_ADJUST * 2;
    container.style.setProperty('--hover-left', `${left}px`);
    container.style.setProperty('--hover-top', `${top}px`);
    container.style.setProperty('--hover-width', `${width}px`);
    container.style.setProperty('--hover-height', `${height}px`);
    container.classList.add('is-hovering');
  };
  const handleLinkEnter = (e: React.MouseEvent<HTMLElement>) => {
    positionPill(e.currentTarget as HTMLElement);
  };
  const handleLinksLeave = () => {
    const container = linksRef.current;
    if (!container) return;
    container.classList.remove('is-hovering');
  };
  const navigate = useNavigate();
  const [isFloating, setIsFloating] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsFloating(window.scrollY > 44);

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <div aria-hidden="true" className="h-[74px] sm:h-[78px]" />
      <div
        className={`fixed left-0 right-0 top-0 z-50 pointer-events-none transition-all duration-300 ${
          isFloating ? 'bg-transparent px-3 py-3' : 'bg-[#fbfaf7] px-0 py-0'
        }`}
      >
        <nav
          className={`pointer-events-auto mx-auto flex w-full items-center justify-between gap-4 transition-all duration-300 ease-out ${
            isFloating
              ? 'max-w-[74rem] rounded-full bg-white/58 px-4 py-2.5 shadow-[0_18px_50px_rgba(49,65,15,0.14)] backdrop-blur-2xl sm:px-5'
              : 'max-w-[92rem] px-5 py-5 sm:px-8'
          }`}
        >
          <Link to="/" className="flex min-w-0 items-center gap-2.5" aria-label="Apparent home">
            <LogoIcon className={`text-black transition-all duration-300 ${isFloating ? 'h-6 w-6' : 'h-7 w-7'}`} />
            <img
              src="/apparent-wordmark.png"
              alt="Apparent"
              className={`w-auto object-contain transition-all duration-300 ${
                isFloating ? 'h-5 max-w-[5.75rem] sm:h-6 sm:max-w-[7.25rem]' : 'h-6 max-w-[5.75rem] sm:h-7 sm:max-w-[8.5rem]'
              }`}
            />
          </Link>

          <div
            ref={linksRef}
            onMouseLeave={handleLinksLeave}
            className={`nav-links relative hidden items-center text-sm font-semibold transition-all duration-300 md:flex ${
              isFloating ? 'gap-6' : 'gap-8'
            }`}
          >
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                onMouseEnter={handleLinkEnter}
                className={({ isActive }) =>
                  `nav-active-link transition-colors hover:text-[#02A070] ${isActive ? 'nav-active-link--active' : ''}`
                }
              >
                {link.label}
              </NavLink>
            ))}
            <span className="nav-hover-pill" aria-hidden="true" />
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/login')}
              className={`rounded-full bg-[#8E9C78] text-xs font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#8E9C78] hover:text-black sm:text-sm ${
                isFloating ? 'px-3 py-2 sm:px-5 sm:py-2.5' : 'px-3 py-2.5 sm:px-6 sm:py-3'
              }`}
            >
              <span className="hidden sm:inline">Get started</span>
              <span className="sm:hidden">Start</span>
              <ArrowUpRight className="ml-1 inline h-3.5 w-3.5 align-[-2px]" />
            </button>
          </div>
        </nav>
      </div>
    </>
  );
};
