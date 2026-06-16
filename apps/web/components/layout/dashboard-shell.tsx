import { getProfile } from "@/lib/auth/get-profile";
import { Sidebar } from "./sidebar";
import { redirect } from "next/navigation";

export async function DashboardShell({ children }: { children: React.ReactNode }) {
  const profile = await getProfile();
  if (!profile) redirect("/login?setup=1");

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar profile={profile} />
      <main className="relative flex-1 overflow-y-auto">
        <div className="relative z-10 mx-auto max-w-7xl p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
