import { useEffect, useState, type ReactNode } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import type { AppUser, DashboardRole } from '@/lib/apparent-types';
import { ensureProfile, getCurrentAppUser } from '@/lib/auth-service';

interface ProtectedDashboardRouteProps {
  role: DashboardRole;
  children: (user: AppUser) => ReactNode;
}

export const ProtectedDashboardRoute = ({ role, children }: ProtectedDashboardRouteProps) => {
  const navigate = useNavigate();
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

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

        const roleAdjustedUser = { ...currentUser, role };
        await ensureProfile(roleAdjustedUser, role);
        setUser(roleAdjustedUser);
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
  }, [navigate, role]);

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

  if (!user) {
    return <Navigate to={`/login?role=${role}`} replace />;
  }

  return <>{children(user)}</>;
};
