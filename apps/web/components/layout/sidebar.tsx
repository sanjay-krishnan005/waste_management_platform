"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { Profile } from "@/lib/auth/rbac";
import { ROLE_LABELS } from "@/lib/auth/rbac";
import {
  LayoutDashboard,
  Trash2,
  FileText,
  Users,
  ShieldCheck,
  BookOpen,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const adminNav: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/bins", label: "Bins", icon: Trash2 },
  { href: "/admin/bin-auth", label: "Bin Auth", icon: ShieldCheck },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/manual", label: "Manual", icon: BookOpen },
];

const customerNav: NavItem[] = [
  { href: "/portal", label: "Dashboard", icon: LayoutDashboard },
  { href: "/portal/bins", label: "My Bins", icon: Trash2 },
  { href: "/portal/reports", label: "Reports", icon: FileText },
];

export function Sidebar({ profile }: { profile: Profile }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  const nav = profile.role === "customer" ? customerNav : adminNav;

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === href;
    if (href === "/portal") return pathname === href;
    return pathname.startsWith(href + "/") || pathname === href;
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside
      className={cn(
        "relative z-10 flex h-full flex-col glass transition-all duration-200",
        collapsed ? "w-14" : "w-60"
      )}
    >
      <div className={cn("flex h-14 items-center border-b border-white/10 dark:border-white/5", collapsed ? "justify-center px-0" : "gap-2.5 px-4")}>
        <div className="relative h-7 w-7 shrink-0">
          <Image src="/logo.png" alt="Sortyx" fill className="object-contain" />
        </div>
        {!collapsed && (
          <span className="text-sm font-semibold tracking-tight">Sortyx</span>
        )}
      </div>

      <nav className="flex-1 space-y-0.5 p-2">
        {nav.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-2.5 text-sm font-medium transition-all duration-150",
                collapsed ? "justify-center h-9 w-10 mx-auto" : "h-9",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon className={cn("h-4 w-4 shrink-0", active && "text-primary")} />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className={cn("border-t border-white/10 dark:border-white/5 p-2 space-y-1", collapsed && "flex flex-col items-center")}>
        <div className={cn("flex items-center", collapsed ? "flex-col gap-1" : "gap-2 px-2 py-1.5")}>
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-[10px] font-semibold text-secondary-foreground">
            {(profile.full_name ?? profile.email).charAt(0).toUpperCase()}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium">{profile.full_name ?? profile.email}</p>
              <p className="text-[10px] text-muted-foreground">{ROLE_LABELS[profile.role]}</p>
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size={collapsed ? "icon" : "sm"}
          className={cn("w-full justify-start text-muted-foreground hover:text-foreground", collapsed && "w-10 h-9 mx-auto")}
          onClick={signOut}
          title="Sign out"
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span className="ml-2">Sign out</span>}
        </Button>
      </div>

      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-1/2 flex h-6 w-6 items-center justify-center rounded-full border bg-background shadow-sm hover:bg-accent transition-colors"
      >
        {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </button>
    </aside>
  );
}
