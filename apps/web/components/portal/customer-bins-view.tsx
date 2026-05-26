"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { formatPercent, formatRelativeTime, cn } from "@/lib/utils";
import { Trash2, Search, X, ExternalLink, ChevronDown, ChevronRight, Layers } from "lucide-react";
import { BinMiniPie } from "@/components/bins/bin-mini-pie";

type Bin = {
  id: string;
  device_id: string;
  status: string;
  latest_fill_level: number | null;
  location_name: string | null;
  bin_type: string | null;
  last_seen_at: string | null;
};

type Compartment = {
  label: string;
  current_fill_level: number;
  compartment_index: number;
  current_weight_kg: number;
  waste_count: number;
};

const statusConfig: Record<string, { label: string; variant: "success" | "destructive" | "warning" | "neutral" | "secondary" }> = {
  active: { label: "Active", variant: "success" },
  offline: { label: "Offline", variant: "destructive" },
  unregistered: { label: "Not connected", variant: "neutral" },
  maintenance: { label: "Maintenance", variant: "warning" },
  decommissioned: { label: "Decommissioned", variant: "secondary" },
};

export function CustomerBinsView({
  bins,
  compartmentsByBin,
  expectedLabels,
}: {
  bins: Bin[];
  compartmentsByBin: Record<string, Compartment[]>;
  expectedLabels: Record<string, string[]>;
}) {
  const [expandedBin, setExpandedBin] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  function getCompartments(bin: Bin): Compartment[] {
    const existing = compartmentsByBin[bin.id];
    if (existing && existing.length > 0) return existing;
    const labels = expectedLabels[bin.bin_type ?? "two"] ?? expectedLabels.two;
    return labels.map((label, i) => ({
      label,
      compartment_index: i,
      current_fill_level: 0,
      current_weight_kg: 0,
      waste_count: 0,
    }));
  }

  const filtered = search.trim()
    ? bins.filter((b) =>
        b.device_id.toLowerCase().includes(search.toLowerCase()) ||
        b.location_name?.toLowerCase().includes(search.toLowerCase())
      )
    : bins;

  const totalCompartments = bins.reduce((sum, b) => sum + getCompartments(b).length, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1>My Bins</h1>
        <p className="mt-1 text-sm text-muted-foreground">{bins.length} bin{bins.length !== 1 ? "s" : ""} · {totalCompartments} compartment{totalCompartments !== 1 ? "s" : ""}</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search bins..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 pr-8 h-9 text-sm"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Trash2} title={search ? "No bins match your search" : "No bins assigned"} description={search ? "Try a different search term" : "Contact your administrator to get bins assigned"} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((bin) => {
              const compartments = getCompartments(bin);
              const cfg = statusConfig[bin.status] ?? { label: bin.status, variant: "neutral" as const };
              return (
                <Link key={bin.id} href={`/bins/${bin.id}`} className="group block">
                  <Card hover className="h-full">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <CardTitle className="font-mono text-sm">{bin.device_id}</CardTitle>
                            <Badge variant={cfg.variant} className="text-[10px]">{cfg.label}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {bin.location_name ?? "—"}
                          </p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <BinMiniPie compartments={compartments} />
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        {bin.last_seen_at ? (
                          <>Last seen {formatRelativeTime(bin.last_seen_at)}</>
                        ) : (
                          <span className="italic">No telemetry</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-muted-foreground" />
                <CardTitle>Compartment Details</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {filtered.map((bin) => {
                const compartments = getCompartments(bin);
                const isExpanded = expandedBin === bin.id;
                return (
                  <div key={bin.id} className="rounded-lg border overflow-hidden transition-all">
                    <button
                      onClick={() => setExpandedBin(isExpanded ? null : bin.id)}
                      className="flex w-full items-center justify-between p-3 text-sm hover:bg-accent/30 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {isExpanded ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
                        <span className="font-medium truncate font-mono text-xs">{bin.device_id}</span>
                        <Badge variant={bin.status === "active" ? "success" : "neutral"} className="text-[10px]">{bin.status}</Badge>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs text-muted-foreground">{compartments.length} compartment{compartments.length !== 1 ? "s" : ""}</span>
                        <Button variant="ghost" size="icon-sm" asChild onClick={(e) => e.stopPropagation()}>
                          <Link href={`/bins/${bin.id}`}>
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="border-t p-3 space-y-2 animate-fade-in">
                        {compartments
                          .sort((a, b) => a.compartment_index - b.compartment_index)
                          .map((c) => {
                            const fill = c.current_fill_level;
                            const barColor = fill >= 85 ? "bg-red-500" : fill >= 60 ? "bg-amber-500" : "bg-emerald-500";
                            return (
                              <div key={c.compartment_index} className="flex items-center gap-3">
                                <div className="relative w-5 h-16 rounded-md border bg-muted/30 overflow-hidden shrink-0">
                                  <div className={cn("absolute bottom-0 left-0 right-0 transition-all duration-500", barColor)} style={{ height: `${fill}%` }}>
                                    <div className="absolute inset-x-0 top-0 h-1 bg-white/20 rounded-t-sm" />
                                  </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium">{c.label}</span>
                                    <span className="text-xs font-semibold tabular-nums">{formatPercent(fill)}</span>
                                  </div>
                                  <p className="text-[10px] text-muted-foreground mt-0.5">
                                    {c.current_weight_kg} kg · {c.waste_count} items
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
