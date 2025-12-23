import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { checkPageAccess } from '@/lib/access-control/guard';
import type { UserRole } from '@/lib/permissions';

type UseRoleGuardResult = {
  loading: boolean;
  authorized: boolean;
};

export function useRoleGuard(pathname?: string): UseRoleGuardResult {
  const router = useRouter();
  const { effectiveUser, loading } = useEffectiveUser();
  const currentPath = pathname || router.pathname;

  const role = (effectiveUser?.role || 'EMPLOYEE') as UserRole;

  const accessResult = useMemo(() => {
    if (loading) {
      return { allowed: false, reason: undefined };
    }
    return checkPageAccess(currentPath, {
      role,
      isAuthenticated: !!effectiveUser,
    });
  }, [currentPath, role, loading, effectiveUser]);

  const authorized = accessResult.allowed;

  useEffect(() => {
    if (loading) return;
    if (!authorized) {
      router.replace('/my-day');
    }
  }, [loading, authorized, router, currentPath]);

  return { loading, authorized };
}
