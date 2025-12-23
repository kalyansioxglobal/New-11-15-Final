import type { UserRole } from '@/lib/permissions';
import { canImpersonate } from '@/lib/permissions';

export const IMPERSONATE_COOKIE = 'x-impersonate-user-id';

type ImpersonationTarget = { isTestUser: boolean | null };

export function canImpersonateUser(
  currentRole: UserRole,
  target: ImpersonationTarget
): boolean {
  if (!canImpersonate(currentRole)) return false;

  if (currentRole === 'TEST_USER') {
    return !!target.isTestUser;
  }

  return true;
}
