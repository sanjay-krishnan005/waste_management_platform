import { getProfile } from "@/lib/auth/get-profile";
import { Sidebar } from "./sidebar";
import { MobileHeader } from "./mobile-header";
import { redirect } from "next/navigation";

export async function DashboardShell({ children }: { children: React.ReactNode }) {
  const profile = await getProfile();
  if (!profile) redirect("/login?setup=1");

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="hidden lg:flex">
        <Sidebar profile={profile} />
      </div>
      <MobileHeader profile={profile} />
      <main className="relative flex-1 overflow-y-auto pt-14 lg:pt-0">
        <div className="relative z-10 mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
