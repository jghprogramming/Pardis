// User roles shared by the app code.
// These strings must match exactly the check constraint in
// supabase/migrations/001_init.sql
//   role in ('product_owner', 'building_manager', 'resident')
// and the policies in supabase/migrations/002_rls.sql.
// Until now the strings lived only in SQL, so app code would have had
// to retype them and a typo would silently break a role check.
//
// This file deliberately says nothing about permissions: who may read
// expenses, who may delete, and how the first product owner is created
// are decided by 002_rls.sql and are still awaiting the user's review
// there. Keep permission rules in the database, not here.

export const ROLES = {
  PRODUCT_OWNER: "product_owner",
  BUILDING_MANAGER: "building_manager",
  RESIDENT: "resident",
} as const;

export type UserRole = (typeof ROLES)[keyof typeof ROLES];

export const ALL_ROLES: readonly UserRole[] = [
  ROLES.PRODUCT_OWNER,
  ROLES.BUILDING_MANAGER,
  ROLES.RESIDENT,
];

// Narrow an unknown value (e.g. a row read from `profiles`) to a role,
// or return null instead of letting a mistyped role pass a check.
export function asUserRole(value: unknown): UserRole | null {
  if (typeof value !== "string") return null;
  return (ALL_ROLES as readonly string[]).includes(value)
    ? (value as UserRole)
    : null;
}

export function isProductOwner(role: UserRole | null | undefined): boolean {
  return role === ROLES.PRODUCT_OWNER;
}

export function isBuildingManager(role: UserRole | null | undefined): boolean {
  return role === ROLES.BUILDING_MANAGER;
}

export function isResident(role: UserRole | null | undefined): boolean {
  return role === ROLES.RESIDENT;
}
