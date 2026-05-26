"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Trash2,
  Bell,
  FileText,
  Users,
  ShieldCheck,
  BookOpen,
  LogOut,
  Sun,
  Moon,
} from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/auth/rbac";
import { ROLE_LABELS } from "@/lib/auth/rbac";

const adminNav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/bins", label: "Bins", icon: Trash2 },
  { href: "/alerts", label: "Alerts", icon: Bell },
  { href: "/admin/bin-auth", label: "Bin Auth", icon: ShieldCheck },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/manual", label: "Manual", icon: BookOpen },
];

const customerNav = [
  { href: "/portal", label: "Dashboard", icon: LayoutDashboard },
  { href: "/portal/bins", label: "My Bins", icon: Trash2 },
  { href: "/portal/alerts", label: "Alerts", icon: Bell },
  { href: "/portal/reports", label: "Reports", icon: FileText },
];

export function Sidebar({ profile }: { profile: Profile }) {
  const pathname = usePathname();
  const router = useRouter();
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  const nav = profile.role === "customer" ? customerNav : adminNav;

  function toggleDark() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="flex h-full w-64 flex-col border-r bg-card">
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <Image
          src="/logo.png"
          alt="Sortyx"
          width={36}
          height={36}
          className="shrink-0 rounded-lg"
        />
        <div>
          <p className="font-semibold text-sm">Sortyx</p>
          <p className="text-xs text-muted-foreground">Intelligence Platform</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {nav.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{profile.full_name ?? profile.email}</p>
            <p className="text-xs text-muted-foreground">{ROLE_LABELS[profile.role]}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={toggleDark} className="h-8 w-8 p-0 shrink-0" title={dark ? "Light mode" : "Dark mode"}>
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>
        <Button variant="ghost" size="sm" className="w-full justify-start" onClick={signOut}>
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </Button>
      </div>
    </aside>
  );
}
