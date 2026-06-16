"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { DeleteButton } from "@/components/ui/delete-button";
import { cn, formatPercent, formatRelativeTime } from "@/lib/utils";
import {
  Pencil,
  Plus,
  Trash2,
  Search,
  X,
  Grid3X3,
  List,
  ChevronDown,
  ExternalLink,
  Filter,
  SlidersHorizontal,
  Wifi,
  WifiOff,
  AlertTriangle,
  CheckCircle2,
  Timer,
  ShieldCheck,
} from "lucide-react";
import { BinMiniPie } from "./bin-mini-pie";

type Bin = {
  id: string;
  device_id: string;
  status: string;
  serial_number: string | null;
  bin_type: string | null;
  location_name: string | null;
  last_seen_at: string | null;
  latest_fill_level: number | null;
  customers: { name: string } | { name: string }[] | null;
};

const STATUS_OPTIONS = ["all", "active", "offline", "unregistered", "maintenance", "decommissioned"] as const;

const statusConfig: Record<string, { label: string; variant: "success" | "destructive" | "warning" | "neutral" | "secondary" }> = {
  active: { label: "Active", variant: "success" },
  offline: { label: "Offline", variant: "destructive" },
  unregistered: { label: "Not connected", variant: "neutral" },
  maintenance: { label: "Maintenance", variant: "warning" },
  decommissioned: { label: "Decommissioned", variant: "secondary" },
};

export function BinListClient({
  bins,
  compartmentsByBin,
  authenticatedIds,
  canManage,
}: {
  bins: Bin[];
  compartmentsByBin: Record<string, { label: string; current_fill_level: number; compartment_index: number; current_weight_kg: number; waste_count: number }[]>;
  authenticatedIds: Set<string>;
  canManage: boolean;
}) {
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"grid" | "table">("grid");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useMemo(() => {
    let result = bins;
    if (statusFilter !== "all") {
      result = result.filter((b) => b.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (b) =>
          b.device_id.toLowerCase().includes(q) ||
          b.serial_number?.toLowerCase().includes(q) ||
          b.location_name?.toLowerCase().includes(q) ||
          ((b.customers as unknown) as { name: string } | null)?.name?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [bins, search, statusFilter]);

  const countByStatus = useMemo(() => {
    const counts: Record<string, number> = { all: bins.length };
    for (const b of bins) {
      counts[b.status] = (counts[b.status] ?? 0) + 1;
    }
    return counts;
  }, [bins]);

  function getCompartments(bin: Bin) {
    const existing = compartmentsByBin[bin.id] ?? [];
    if (existing.length > 0) return existing;
    const labels = bin.bin_type === "four"
      ? ["Plastic", "Paper", "Metal/Glass", "Organic"]
      : bin.bin_type === "three"
      ? ["Recyclable", "Non-Recyclable", "Food Waste"]
      : bin.bin_type === "one"
      ? ["Recyclable"]
      : ["Recyclables", "General Waste"];
    return labels.map((label, i) => ({
      label,
      compartment_index: i,
      current_fill_level: bin.latest_fill_level ?? 0,
      current_weight_kg: 0,
      waste_count: 0,
    }));
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1>Bins</h1>
          <p className="mt-1 text-sm text-muted-foreground">{bins.length} bin{bins.length !== 1 ? "s" : ""} deployed</p>
        </div>
        {canManage && (
          <Button asChild>
            <Link href="/bins/new">
              <Plus className="mr-1.5 h-4 w-4" />
              Add bin
            </Link>
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search bins..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-8 h-9 text-sm"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={cn(showFilters && "bg-accent")}
          >
            <Filter className="h-4 w-4 mr-1.5" />
            Filters
          </Button>
          <div className="flex items-center rounded-lg border p-0.5">
            <button
              onClick={() => setView("grid")}
              className={cn("rounded-md p-1.5 transition-colors", view === "grid" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              <Grid3X3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setView("table")}
              className={cn("rounded-md p-1.5 transition-colors", view === "table" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {showFilters && (
        <div className="flex flex-wrap gap-2 animate-fade-in">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                "inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                statusFilter === s
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-input bg-background text-muted-foreground hover:bg-accent"
              )}
            >
              {s === "all" ? "All" : statusConfig[s]?.label ?? s}
              <span className="ml-1.5 text-[10px] opacity-60">({countByStatus[s] ?? 0})</span>
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          icon={Trash2}
          title={search || statusFilter !== "all" ? "No bins match your filters" : "No bins deployed"}
          description={search || statusFilter !== "all" ? "Try adjusting your search or filters" : "Create your first bin deployment"}
          action={
            !search && statusFilter === "all" && canManage ? (
              <Button asChild>
                <Link href="/bins/new">
                  <Plus className="mr-1.5 h-4 w-4" />
                  Add bin
                </Link>
              </Button>
            ) : undefined
          }
        />
      ) : view === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((bin) => {
            const compartments = getCompartments(bin);
            const cfg = statusConfig[bin.status] ?? { label: bin.status, variant: "neutral" as const };
            const customerName = ((bin.customers as unknown) as { name: string } | null)?.name ?? "Unassigned";
            return (
              <Link key={bin.id} href={`/bins/${bin.id}`} className="group block">
                <Card hover className="h-full">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <CardTitle className="font-mono text-sm">{bin.device_id}</CardTitle>
                          {authenticatedIds.has(bin.id) && (
                            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {bin.location_name ?? "No location set"}
                        </p>
                      </div>
                      <Badge variant={cfg.variant} className="text-[10px] shrink-0">
                        {cfg.label}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <BinMiniPie compartments={compartments} />

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        {bin.bin_type === "one" ? "1-bin" : bin.bin_type === "two" ? "2-bin" : bin.bin_type === "three" ? "3-bin" : "4-bin"}
                      </span>
                      <span className="text-border">·</span>
                      <span>{customerName}</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      {bin.last_seen_at ? (
                        <>
                          <Timer className="h-3 w-3" />
                          {formatRelativeTime(bin.last_seen_at)}
                        </>
                      ) : (
                        <span className="italic">No telemetry received</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden card-shadow">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/30 text-left text-xs font-medium text-muted-foreground">
                <th className="px-4 py-3">Device ID</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Last seen</th>
                <th className="px-4 py-3 text-right">Fill</th>
                {canManage && <th className="px-4 py-3 text-right w-20">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((bin) => {
                const cfg = statusConfig[bin.status] ?? { label: bin.status, variant: "neutral" as const };
                const fillPer = bin.latest_fill_level ?? 0;
                return (
                  <tr key={bin.id} className="border-b last:border-0 hover:bg-accent/20 transition-colors text-sm">
                    <td className="px-4 py-3">
                      <Link href={`/bins/${bin.id}`} className="font-mono text-xs font-medium hover:text-primary transition-colors">
                        {bin.device_id}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={cfg.variant} className="text-[10px]">{cfg.label}</Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{bin.location_name ?? "—"}</td>
                    <td className="px-4 py-3 text-xs">{bin.bin_type === "one" ? "1-bin" : bin.bin_type === "two" ? "2-bin" : bin.bin_type === "three" ? "3-bin" : "4-bin"}</td>
                    <td className="px-4 py-3 text-xs">{((bin.customers as unknown) as { name: string } | null)?.name ?? "Unassigned"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {bin.last_seen_at ? formatRelativeTime(bin.last_seen_at) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              fillPer >= 85 ? "bg-red-500" : fillPer >= 60 ? "bg-amber-500" : "bg-primary"
                            )}
                            style={{ width: `${fillPer}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium tabular-nums w-8 text-right">{Math.round(fillPer)}%</span>
                      </div>
                    </td>
                    {canManage && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon-sm" asChild>
                            <Link href={`/bins/${bin.id}/edit`}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Link>
                          </Button>
                          <DeleteButton
                            id={bin.id}
                            path="bins"
                            description={`Permanently delete bin ${bin.device_id} and all its compartments, telemetry history, and alerts. This cannot be undone.`}
                          />
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-center text-[11px] text-muted-foreground">
        Showing {filtered.length} of {bins.length} bin{bins.length !== 1 ? "s" : ""}
      </p>
    </div>
  );
}
