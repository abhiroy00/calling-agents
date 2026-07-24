import { useSelector } from "react-redux";
import type { RootState } from "@/app/store";
import type { UserRole } from "@/features/auth/authSlice";

export const ROLE_LABEL: Record<UserRole, string> = {
  super_admin: "Super Admin",
  manager: "Manager",
  bd_executive: "BD Executive",
};

/** The current user's role, or null when unknown. */
export function useRole(): UserRole | null {
  return useSelector((s: RootState) => (s.auth.user?.role as UserRole | undefined) ?? null);
}

/** Does the current user's role satisfy the required set? */
export function useHasRole(allowed: UserRole[]): boolean {
  const role = useRole();
  return role != null && allowed.includes(role);
}

/** Super admins reach every admin surface. */
export function useIsSuperAdmin(): boolean {
  return useRole() === "super_admin";
}

/** Super admins + managers (read-only system/roles surfaces). */
export function useIsManager(): boolean {
  const role = useRole();
  return role === "super_admin" || role === "manager";
}
