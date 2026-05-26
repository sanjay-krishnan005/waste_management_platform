import { getProfile } from "@/lib/auth/get-profile";
import { Sidebar } from "./sidebar";
import { redirect } from "next/navigation";

export async function DashboardShell({ children }: { children: React.ReactNode }) {
  const profile = await getProfile();
  if (!profile) redirect("/login?setup=1");

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar profile={profile} />
      <main className="flex-1 overflow-y-auto bg-muted/30">
        <div className="container mx-auto p-6 max-w-7xl">{children}</div>
      </main>
    </div>
  );
}
