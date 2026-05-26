import { DashboardShell } from "@/components/layout/dashboard-shell";
import { DashboardClientExtras } from "./layout-client";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShell>
      <DashboardClientExtras />
      {children}
    </DashboardShell>
  );
}
