import { ChevronDown } from 'lucide-react';
import { LogoIcon } from './LogoIcon';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';

export const NewNavbar = () => {
  const navigate = useNavigate();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  return (
    <nav className="px-6 py-4 flex items-center justify-between max-w-7xl mx-auto">
      {/* Left: Logo */}
      <Link to="/" className="flex items-center gap-2">
        <LogoIcon className="w-7 h-7 text-black" />
        <img
          src="/apparent-wordmark.png"
          alt="Apparent"
          className="h-7 w-auto max-w-[8.75rem] object-contain"
        />
      </Link>

      {/* Center: Nav Links (hidden on mobile) */}
      <div className="hidden md:flex items-center gap-8">
        <div 
          className="relative"
          onMouseEnter={() => setOpenDropdown('founders')}
          onMouseLeave={() => setOpenDropdown(null)}
        >
          <button className="flex items-center gap-1 text-sm text-gray-700 hover:text-black transition-colors py-2">
            For Founders
            <ChevronDown className="w-4 h-4" />
          </button>
          {openDropdown === 'founders' && (
            <div className="absolute top-full left-0 pt-2">
              <div className="w-48 bg-white border border-gray-200 rounded-lg shadow-lg py-2">
                <Link
                  to="/for-founders"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  onClick={() => setOpenDropdown(null)}
                >
                  Overview
                </Link>
                <Link
                  to="/for-founders#features"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  onClick={() => setOpenDropdown(null)}
                >
                  Features
                </Link>
              </div>
            </div>
          )}
        </div>

        <div 
          className="relative"
          onMouseEnter={() => setOpenDropdown('vcs')}
          onMouseLeave={() => setOpenDropdown(null)}
        >
          <button className="flex items-center gap-1 text-sm text-gray-700 hover:text-black transition-colors py-2">
            For VCs
            <ChevronDown className="w-4 h-4" />
          </button>
          {openDropdown === 'vcs' && (
            <div className="absolute top-full left-0 pt-2">
              <div className="w-48 bg-white border border-gray-200 rounded-lg shadow-lg py-2">
                <Link
                  to="/for-vcs"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  onClick={() => setOpenDropdown(null)}
                >
                  Overview
                </Link>
                <Link
                  to="/for-vcs#features"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  onClick={() => setOpenDropdown(null)}
                >
                  Features
                </Link>
                <Link
                  to="/for-vcs#deal-flow"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  onClick={() => setOpenDropdown(null)}
                >
                  Deal Flow
                </Link>
              </div>
            </div>
          )}
        </div>

        <NavLink
          to="/about"
          className={({ isActive }) =>
            `nav-active-link text-sm text-gray-700 transition-colors hover:text-black ${isActive ? 'nav-active-link--active' : ''}`
          }
        >
          About Us
        </NavLink>
        <NavLink
          to="/resources"
          className={({ isActive }) =>
            `nav-active-link text-sm text-gray-700 transition-colors hover:text-black ${isActive ? 'nav-active-link--active' : ''}`
          }
        >
          Resources
        </NavLink>
        <NavLink
          to="/our-thesis"
          className={({ isActive }) =>
            `nav-active-link text-sm text-gray-700 transition-colors hover:text-black ${isActive ? 'nav-active-link--active' : ''}`
          }
        >
          Our Thesis
        </NavLink>
      </div>

      {/* Right: CTA */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/login')}
          className="bg-black text-white px-5 py-2.5 rounded-full text-sm font-medium hover:bg-gray-800 transition-colors"
        >
          Get started
        </button>
      </div>
    </nav>
  );
};
