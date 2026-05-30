import { useEffect, useState, type ReactNode } from 'react';
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
  const [loading, setLoading] = useState(true);
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

      {children}

      {!user && !loading && <Footer />}
    </div>
  );
};
