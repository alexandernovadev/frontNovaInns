export const ROLES = ['SUPER_ADMIN', 'ADMIN', 'STAFF', 'GUEST'] as const;

export const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  STAFF: 'Staff',
  GUEST: 'Guest',
};
