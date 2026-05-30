import { useEffect, useState } from 'react';
import type { AppUser } from '@/lib/apparent-types';
import { getCurrentAppUser } from '@/lib/auth-service';
import { SessionNavBar } from '@/components/ui/sidebar';
import { EditorialNavbar } from '@/components/EditorialNavbar';
import { Footer } from '@/components/Footer';
import { PublicProfile } from '@/pages/PublicProfile';

/**
 * Auth-aware chrome for public profile routes.
 * - Logged in: keep the user in their dashboard shell (sidebar) so visiting a
 *   founder/VC profile doesn't feel like being signed out.
 * - Logged out: the marketing navbar + footer (public visitor experience).
 *
 * A single stable root <div> wraps <PublicProfile> in both states so the
 * profile content never remounts (and never double-fetches) when auth resolves.
 */
export const ProfileShell = () => {
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

      <PublicProfile />

      {!user && !loading && <Footer />}
    </div>
  );
};
