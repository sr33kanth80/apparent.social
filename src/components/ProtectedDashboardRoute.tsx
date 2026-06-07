import { useEffect, useState, type ReactNode } from 'react';
import { useKindeAuth } from '@kinde-oss/kinde-auth-react';
import { Navigate } from 'react-router-dom';
import type { AppUser, DashboardRole } from '@/lib/apparent-types';
import { clearExternalAppUser, ensureProfile, getCurrentAppUser } from '@/lib/auth-service';
import { buildKindeAppUser, isKindeConfigured, resolveKindeRole } from '@/lib/kinde-auth';

interface ProtectedDashboardRouteProps {
  role: DashboardRole;
  children: (user: AppUser) => ReactNode;
}

export const ProtectedDashboardRoute = ({ role, children }: ProtectedDashboardRouteProps) => {
  if (isKindeConfigured) {
    return <KindeProtectedDashboardRoute role={role}>{children}</KindeProtectedDashboardRoute>;
  }

  return <LegacyProtectedDashboardRoute role={role}>{children}</LegacyProtectedDashboardRoute>;
};

const KindeProtectedDashboardRoute = ({ role, children }: ProtectedDashboardRouteProps) => {
  const { isLoading, isAuthenticated, user: kindeUser } = useKindeAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fbf8f3] text-sm text-gray-500">
        Loading Apparent workspace...
      </div>
    );
  }

  if (!isAuthenticated || !kindeUser) {
    clearExternalAppUser();
    return <Navigate to={`/login?role=${role}`} replace />;
  }

  const userRole = resolveKindeRole(kindeUser.id, role);
  if (userRole !== role) {
    return <Navigate to={`/dashboard/${userRole}`} replace />;
  }

  return <>{children(buildKindeAppUser(kindeUser, userRole))}</>;
};

const LegacyProtectedDashboardRoute = ({ role, children }: ProtectedDashboardRouteProps) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  // When the signed-in user's bound role doesn't match the URL's role we
  // redirect to their own dashboard instead of rendering the wrong one.
  const [redirectTo, setRedirectTo] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadUser = async () => {
      try {
        const currentUser = await getCurrentAppUser();
        if (!isMounted) return;

        if (!currentUser) {
          setUser(null);
          return;
        }

        // SECURITY: the URL's role is untrusted. The session's role comes
        // from the profiles table (set by getCurrentAppUser) and is the
        // source of truth. If they disagree, redirect — never coerce.
        if (currentUser.role !== role) {
          setRedirectTo(`/dashboard/${currentUser.role}`);
          return;
        }

        // Roles match. Make sure the profile row exists (no-op for returning
        // users) and render. ensureProfile no longer overwrites an existing
        // row's role, so this can't flip the binding.
        await ensureProfile(currentUser, currentUser.role);
        setUser(currentUser);
      } catch (requestError) {
        if (!isMounted) return;
        setError(requestError instanceof Error ? requestError.message : 'Unable to load session.');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadUser();

    return () => {
      isMounted = false;
    };
  }, [role]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fbf8f3] text-sm text-gray-500">
        Loading Apparent workspace...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fbf8f3] px-6 text-center">
        <div>
          <p className="text-sm font-medium text-red-700">Unable to open dashboard</p>
          <p className="mt-2 max-w-md text-sm text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (redirectTo) {
    return <Navigate to={redirectTo} replace />;
  }

  if (!user) {
    return <Navigate to={`/login?role=${role}`} replace />;
  }

  return <>{children(user)}</>;
};
