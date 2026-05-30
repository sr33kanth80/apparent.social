import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import type { AppUser } from '@/lib/apparent-types';
import { getCurrentAppUser } from '@/lib/auth-service';
import { SessionNavBar } from '@/components/ui/sidebar';
import { EditorialNavbar } from '@/components/EditorialNavbar';
import { Footer } from '@/components/Footer';

/**
 * Auth-aware chrome for public content pages (profiles, project detail, …).
 * - Logged in: keep the user in their dashboard shell (sidebar) so opening a
 *   profile or project never feels like being signed out.
 * - Logged out: the marketing navbar + footer (public visitor experience).
 *
 * A single stable root <div> wraps {children} in both states so the page
 * content never remounts (or double-fetches) when auth resolves.
 */
export const PublicPageShell = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<AppUser | null>(null);

  const handleBack = () => {
    // Go back to wherever they came from; fall back to the dashboard/home if
    // they landed here directly (e.g. opened in a new tab).
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(user ? `/dashboard/${user.role}#overview` : '/');
    }
  };

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
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className={user ? 'min-h-screen bg-[#fbfaf7] pl-[15rem]' : 'min-h-screen bg-[#fbfaf7]'}>
      {user ? (
        <SessionNavBar role={user.role} user={user} />
      ) : !loading ? (
        <EditorialNavbar />
      ) : null}

      <div className="mx-auto max-w-[92rem] px-5 pt-5 sm:px-8">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-3.5 py-1.5 text-sm font-medium text-black/70 shadow-sm transition-colors hover:bg-black/5 hover:text-black"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
      </div>

      {children}

      {!user && !loading && <Footer />}
    </div>
  );
};
