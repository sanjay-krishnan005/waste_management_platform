"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Pencil, Plus, Trash2, LayoutGrid, List, Search, X } from "lucide-react";
import { DeleteButton } from "@/components/ui/delete-button";
import { cn, formatPercent } from "@/lib/utils";

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

  const filtered = useMemo(() => {
    if (!search.trim()) return bins;
    const q = search.toLowerCase();
    return bins.filter(
      (b) =>
        b.device_id.toLowerCase().includes(q) ||
        b.serial_number?.toLowerCase().includes(q) ||
        b.location_name?.toLowerCase().includes(q) ||
        ((b.customers as unknown) as { name: string } | null)?.name?.toLowerCase().includes(q)
    );
  }, [bins, search]);

  const statusVariant = (status: string) => {
    switch (status) {
      case "active": return "default" as const;
      case "offline": return "destructive" as const;
      default: return "secondary" as const;
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case "active": return "Active";
      case "offline": return "Offline";
      case "unregistered": return "Not connected";
      default: return status;
    }
  };

  const binCompartmentLabels: Record<string, string[]> = {
    two: ["Recyclables", "General Waste"],
    four: ["Plastic", "Paper", "Metal/Glass", "Organic"],
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1>Bins</h1>
          <p className="text-muted-foreground mt-1">Manage smart waste bin deployments</p>
        </div>
        {canManage && (
          <Button asChild>
            <Link href="/bins/new">
              <Plus className="mr-2 h-4 w-4" />
              Add bin
            </Link>
          </Button>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by device ID, serial, location, customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border bg-background pl-9 pr-8 py-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
        <div className="flex items-center rounded-lg border p-0.5">
          <button
            onClick={() => setView("grid")}
            className={cn("rounded-md p-1.5 transition-colors", view === "grid" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground")}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setView("table")}
            className={cn("rounded-md p-1.5 transition-colors", view === "table" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground")}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Trash2}
          title={search ? "No bins match your search" : "No bins deployed"}
          description={search ? "Try a different search term" : "Create your first bin deployment"}
          action={
            !search && canManage ? (
              <Button asChild>
                <Link href="/bins/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Add bin
                </Link>
              </Button>
            ) : undefined
          }
        />
      ) : view === "grid" ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((bin) => {
            const existingCompartments = compartmentsByBin[bin.id] ?? [];
            const compartments = existingCompartments.length > 0
              ? existingCompartments
              : (binCompartmentLabels[bin.bin_type ?? "two"] ?? binCompartmentLabels.two).map((label, i) => ({
                  label,
                  compartment_index: i,
                  current_fill_level: bin.latest_fill_level ?? 0,
                  current_weight_kg: 0,
                  waste_count: 0,
                }));
            return (
              <div key={bin.id} className="relative group">
                <Link href={`/bins/${bin.id}`}>
                  <Card hover className="h-full">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base font-mono">{bin.device_id}</CardTitle>
                        <div className="flex items-center gap-1.5">
                          {authenticatedIds.has(bin.id) && (
                            <Badge variant="outline" className="text-[10px] border-green-500 text-green-600 px-1.5 py-0">
                              Auth
                            </Badge>
                          )}
                          <Badge variant={statusVariant(bin.status)} className="text-[10px] px-1.5 py-0">
                            {statusLabel(bin.status)}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="text-sm space-y-2">
                      {bin.location_name ? (
                        <p className="text-muted-foreground truncate">{bin.location_name}</p>
                      ) : (
                        <p className="text-muted-foreground italic text-xs">No location set</p>
                      )}
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span>{bin.bin_type === "two" ? "2-bin" : "4-bin"}</span>
                        {bin.serial_number && <span className="font-mono">SN: {bin.serial_number}</span>}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className={cn("inline-block h-1.5 w-1.5 rounded-full", bin.last_seen_at ? "bg-green-500" : "bg-muted-foreground")} />
                        {bin.last_seen_at ? `Last data: ${new Date(bin.last_seen_at).toLocaleDateString()}` : "No telemetry received"}
                      </div>
                      <div className="flex items-end gap-1.5 pt-1">
                        {compartments
                          .sort((a, b) => a.compartment_index - b.compartment_index)
                          .map((c) => {
                            const fill = c.current_fill_level;
                            const barColor = fill >= 85 ? "bg-red-500" : fill >= 60 ? "bg-amber-500" : "bg-sortyx";
                return (
                  <div key={c.compartment_index} className="flex flex-col items-center gap-1 flex-1 min-w-0">
                    <div className="relative w-10 h-28 rounded-lg border-2 border-border bg-muted/30 overflow-hidden">
                      <div className={cn("absolute bottom-0 left-0 right-0 transition-all duration-500 ease-out", barColor)} style={{ height: `${fill}%` }}>
                        <div className="absolute inset-x-0 top-0 h-2 bg-white/20 rounded-t-sm" />
                      </div>
                      <div className="absolute inset-x-0 top-1/4 h-px bg-border/50" />
                      <div className="absolute inset-x-0 top-2/4 h-px bg-border/50" />
                      <div className="absolute inset-x-0 top-3/4 h-px bg-border/50" />
                    </div>
                    <span className="mt-1 text-xs font-semibold leading-tight">{formatPercent(fill)}</span>
                    <span className="text-[9px] text-muted-foreground">{c.waste_count} items</span>
                    <span className="text-[10px] text-muted-foreground text-center leading-tight truncate max-w-full">{c.label}</span>
                  </div>
                );
                          })}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          {((bin.customers as unknown) as { name: string } | null)?.name ?? "Unassigned"}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
                {canManage && (
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="outline" size="sm" asChild className="h-7 w-7 p-0">
                      <Link href={`/bins/${bin.id}/edit`}>
                        <Pencil className="h-3 w-3" />
                      </Link>
                    </Button>
                    <DeleteButton id={bin.id} path="bins" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-lg border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-3 font-medium">Device ID</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium">Location</th>
                <th className="text-left p-3 font-medium">Type</th>
                <th className="text-left p-3 font-medium">Customer</th>
                <th className="text-left p-3 font-medium">Last seen</th>
                {canManage && <th className="text-right p-3 font-medium">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((bin) => (
                <tr key={bin.id} className="border-b hover:bg-accent/50 transition-colors">
                  <td className="p-3 font-mono text-xs">
                    <Link href={`/bins/${bin.id}`} className="hover:text-sortyx">
                      {bin.device_id}
                    </Link>
                  </td>
                  <td className="p-3">
                    <Badge variant={statusVariant(bin.status)} className="text-[10px] px-1.5 py-0">
                      {statusLabel(bin.status)}
                    </Badge>
                  </td>
                  <td className="p-3 text-muted-foreground text-xs">{bin.location_name ?? "—"}</td>
                  <td className="p-3 text-xs">{bin.bin_type === "two" ? "2-bin" : "4-bin"}</td>
                  <td className="p-3 text-xs">{((bin.customers as unknown) as { name: string } | null)?.name ?? "Unassigned"}</td>
                  <td className="p-3 text-xs text-muted-foreground">
                    {bin.last_seen_at ? new Date(bin.last_seen_at).toLocaleDateString() : "—"}
                  </td>
                  {canManage && (
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="outline" size="sm" asChild className="h-7 w-7 p-0">
                          <Link href={`/bins/${bin.id}/edit`}>
                            <Pencil className="h-3 w-3" />
                          </Link>
                        </Button>
                        <DeleteButton id={bin.id} path="bins" />
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center">
        Showing {filtered.length} of {bins.length} bin{bins.length !== 1 ? "s" : ""}
      </p>
    </div>
  );
}
