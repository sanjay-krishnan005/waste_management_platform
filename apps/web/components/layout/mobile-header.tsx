"use client";

import { useState } from "react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
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
  Menu,
} from "lucide-react";
import Link from "next/link";

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

export function MobileHeader({ profile }: { profile: Profile }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const nav = profile.role === "customer" ? customerNav : adminNav;

  const pageTitle = nav.find((n) => pathname.startsWith(n.href))?.label ?? "Sortyx";

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
    <>
      <header className="fixed top-0 left-0 right-0 z-30 flex h-14 items-center justify-between border-b bg-background/80 backdrop-blur-xl px-4 lg:hidden">
        <div className="flex items-center gap-2.5">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon-sm">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <div className="flex h-14 items-center gap-2.5 border-b px-4">
                <div className="relative h-7 w-7 shrink-0">
                  <Image src="/logo.png" alt="Sortyx" fill className="object-contain" />
                </div>
                <span className="text-sm font-semibold tracking-tight">Sortyx</span>
              </div>
              <nav className="flex-1 space-y-0.5 p-2">
                {nav.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-center gap-2.5 rounded-md px-2.5 text-sm font-medium transition-all duration-150 h-9",
                        active
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      <Icon className={cn("h-4 w-4 shrink-0", active && "text-primary")} />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
              <div className="border-t p-2 space-y-1">
                <div className="flex items-center gap-2 px-2 py-1.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-[10px] font-semibold text-secondary-foreground">
                    {(profile.full_name ?? profile.email).charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium">{profile.full_name ?? profile.email}</p>
                    <p className="text-[10px] text-muted-foreground">{ROLE_LABELS[profile.role]}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-muted-foreground hover:text-foreground"
                  onClick={signOut}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign out
                </Button>
              </div>
            </SheetContent>
          </Sheet>
          <span className="text-sm font-semibold">{pageTitle}</span>
        </div>
        <div className="relative h-7 w-7">
          <Image src="/logo.png" alt="Sortyx" fill className="object-contain" />
        </div>
      </header>

      <nav className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around border-t bg-background/90 backdrop-blur-xl py-2 lg:hidden">
        {nav.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1 rounded-md transition-colors",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
