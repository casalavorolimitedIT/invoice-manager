import type { ProfileRole } from "@/lib/supabase/profile";

export type RoleAwareItem = {
  allowedRoles?: readonly ProfileRole[];
};

export function canAccessRole(
  role: ProfileRole | null | undefined,
  allowedRoles?: readonly ProfileRole[],
) {
  if (!allowedRoles || allowedRoles.length === 0) {
    return true;
  }

  if (!role) {
    return false;
  }

  return allowedRoles.includes(role);
}

export function filterRoleItems<T extends RoleAwareItem>(
  items: T[],
  role: ProfileRole | null | undefined,
) {
  return items.filter((item) => canAccessRole(role, item.allowedRoles));
}

export function isAdmin(role: ProfileRole | null | undefined) {
  return role === "admin";
}
