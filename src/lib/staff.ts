import type { UserRole } from '@/contexts/AuthContext';

/** Moderators and admins are the same staff role for access control. */
export function isStaff(role: UserRole | string | null | undefined): boolean {
  return role === 'moderator' || role === 'admin';
}
