import type { UserRole } from "@sortyx/shared";

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Admin",
  customer: "Customer",
};

export function canManageBins(role: UserRole | string | undefined) {
  return role === "admin";
}

export function canViewAllBins(role: UserRole | string | undefined) {
  return role === "admin";
}

export function isCustomer(role: UserRole | string | undefined) {
  return role === "customer";
}

export function getDefaultRoute(role: UserRole | string | undefined) {
  if (role === "customer") return "/portal";
  return "/dashboard";
}

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  organization_id: string | null;
  customer_id: string | null;
  fcm_token: string | null;
};
