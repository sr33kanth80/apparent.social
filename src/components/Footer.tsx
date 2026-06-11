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
    <footer className="monad border-t border-ink bg-parchment text-ink">
      <div className="mx-auto max-w-[1200px] px-6 py-20">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-[1.6fr_1fr_1fr]">
          <div>
            <div className="mb-5 flex items-center gap-2.5">
              <LogoIcon className="h-6 w-6 text-ink" />
              <span className="font-serif text-[22px] leading-none text-ink">Apparent</span>
            </div>
            <p className="max-w-sm font-mono text-[14px] leading-[1.6] text-graphite">
              Proof of work is the new warm intro. Founders show what they have built. Investors find them by thesis, proof, and timing.
            </p>
          </div>

          {footerColumns.map((column) => (
            <div key={column.title}>
              <h3 className="mb-5 font-mono text-[12px] font-medium uppercase tracking-[0.08em] text-ink">
                {column.title}
              </h3>
              <ul className="space-y-3">
                {column.links.map((link) => (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      className="font-mono text-[14px] text-graphite transition-colors hover:text-ink"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 border-t border-ink/15 pt-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <p className="font-mono text-[12px] text-stone">© 2026 Apparent. All rights reserved.</p>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <Link to="/privacy" className="font-mono text-[12px] text-stone transition-colors hover:text-ink">
                Privacy Policy
              </Link>
              <Link to="/terms" className="font-mono text-[12px] text-stone transition-colors hover:text-ink">
                Terms of Service
              </Link>
              <Link to="/cookies" className="font-mono text-[12px] text-stone transition-colors hover:text-ink">
                Cookie Policy
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
