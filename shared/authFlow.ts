export type OnboardingRole = "citizen" | "asha" | "cho" | "asha_cho" | "doctor" | "facility_staff" | "administrator" | "admin";
export type AccountStatus = "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";

export function normalizeDashboardRole(role: string): string {
  if (role === "admin" || role === "super_admin" || role === "superadmin") return "administrator";
  return role;
}

export function getPostLoginRoute(
  role: string,
  statusOrPendingRole?: string | null,
  pendingRole?: string | null,
): string | null {
  const KNOWN_STATUSES = ["PENDING", "APPROVED", "REJECTED", "SUSPENDED"];
  let status: string = "APPROVED";
  let targetPendingRole: string | null = pendingRole || null;

  if (statusOrPendingRole) {
    if (KNOWN_STATUSES.includes(statusOrPendingRole.toUpperCase())) {
      status = statusOrPendingRole.toUpperCase();
    } else if (!pendingRole) {
      targetPendingRole = statusOrPendingRole;
    }
  }

  if (targetPendingRole && targetPendingRole !== role) return null;

  if (status === "PENDING") return "/pending-approval";
  if (status === "REJECTED") return "/registration-rejected";
  if (status === "SUSPENDED") return "/account-suspended";

  return `/dashboard/${normalizeDashboardRole(role)}`;
}

export function shouldCompleteOnboarding(role: string, pendingRole?: string | null): pendingRole is OnboardingRole {
  return Boolean(pendingRole && pendingRole !== role);
}
