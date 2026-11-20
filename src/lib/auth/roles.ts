import type { Database } from "@/types/database";

export type AdminRole = Database["public"]["Enums"]["admin_role"];

export const ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: "Admin",
  staff: "Staff",
  dj: "DJ",
};

/** Descending privilege. Used to keep the legacy `role` column sensible. */
export const ROLE_PRIORITY: readonly AdminRole[] = [
  "super_admin",
  "staff",
  "dj",
] as const;

export function hasRole(
  roles: readonly AdminRole[],
  role: AdminRole,
): boolean {
  return roles.includes(role);
}

export function hasAdminAccess(roles: readonly AdminRole[]): boolean {
  return roles.includes("super_admin") || roles.includes("staff");
}

export function primaryRole(roles: readonly AdminRole[]): AdminRole {
  return ROLE_PRIORITY.find((role) => roles.includes(role)) ?? "staff";
}

export function roleLabel(role: AdminRole): string {
  return ROLE_LABELS[role];
}

/** "Admin + DJ" for the account list. Order follows ROLE_PRIORITY. */
export function rolesLabel(roles: readonly AdminRole[]): string {
  const ordered = ROLE_PRIORITY.filter((role) => roles.includes(role));

  return ordered.length > 0
    ? ordered.map(roleLabel).join(" + ")
    : "No role";
}

/** Combines the authoritative `roles` array with the legacy `role` column. */
export function mergeRoles(
  role: AdminRole | null | undefined,
  roles: readonly AdminRole[] | null | undefined,
): AdminRole[] {
  const merged = new Set<AdminRole>(roles ?? []);

  if (role) {
    merged.add(role);
  }

  return [...merged];
}
