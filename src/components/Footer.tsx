import { Link } from 'react-router-dom';
import { LogoIcon } from './LogoIcon';

const footerColumns = [
  {
    title: 'Product',
    links: [
      { label: 'Founder profiles', to: '/for-founders' },
      { label: 'Investor sourcing', to: '/for-vcs' },
      { label: 'Builder Radar', to: '/#signals' },
      { label: 'How it works', to: '/#how-to' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', to: '/about' },
      { label: 'Resources', to: '/resources' },
      { label: 'Contact', to: '/contact' },
      { label: 'Get started', to: '/login' },
    ],
  },
];

export const Footer = () => {
  return (
    <footer className="bg-[#1A1A1A] text-white">
      <div className="mx-auto max-w-[88rem] px-6 py-16">
        <div className="mb-16 grid grid-cols-1 gap-12 md:grid-cols-[1.5fr_1fr_1fr]">
          <div>
            <div className="mb-4 flex items-center gap-3">
              <LogoIcon className="h-7 w-7 text-white" />
              <img
                src="/apparent-wordmark-white.png"
                alt="Apparent"
                className="h-8 w-auto max-w-[10rem] object-contain"
              />
            </div>
            <p className="mb-6 max-w-sm text-base leading-relaxed text-white/60">
              The social capital network for builders and VCs. Profiles, launches, thesis matching, meetups, maps, and clearer deal terms.
            </p>
          </div>

          {footerColumns.map((column) => (
            <div key={column.title}>
              <h3 className="mb-4 text-sm font-medium uppercase tracking-wider text-white">
                {column.title}
              </h3>
              <ul className="space-y-3">
                {column.links.map((link) => (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      className="text-base text-white/60 transition-colors duration-200 hover:text-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-white/10 pt-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-white/40">
            &copy; 2026 Apparent. All rights reserved.
            </p>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <Link to="/privacy" className="text-sm text-white/40 transition-colors duration-200 hover:text-white">
                Privacy Policy
              </Link>
              <Link to="/terms" className="text-sm text-white/40 transition-colors duration-200 hover:text-white">
                Terms of Service
              </Link>
              <Link to="/cookies" className="text-sm text-white/40 transition-colors duration-200 hover:text-white">
                Cookie Policy
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
