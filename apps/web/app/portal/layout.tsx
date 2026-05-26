import { DashboardShell } from "@/components/layout/dashboard-shell";

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
