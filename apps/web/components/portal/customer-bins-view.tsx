"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { formatPercent } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Trash2, ChevronDown, ChevronRight, Layers, ExternalLink } from "lucide-react";

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

function CompartmentBar({ fill, label, wasteCount }: { fill: number; label: string; wasteCount: number }) {
  const barColor = fill >= 85 ? "bg-red-500" : fill >= 60 ? "bg-amber-500" : "bg-green-500";
  return (
    <div className="flex flex-col items-center gap-1 group">
      <div className="relative w-10 h-24 rounded-lg border-2 border-border bg-muted/30 overflow-hidden">
        <div className={cn("absolute bottom-0 left-0 right-0 transition-all duration-500", barColor)} style={{ height: `${fill}%` }}>
          <div className="absolute inset-x-0 top-0 h-2 bg-white/20 rounded-t-sm" />
        </div>
        <div className="absolute inset-x-0 top-1/4 h-px bg-border/50" />
        <div className="absolute inset-x-0 top-2/4 h-px bg-border/50" />
        <div className="absolute inset-x-0 top-3/4 h-px bg-border/50" />
      </div>
      <span className="text-xs font-semibold">{formatPercent(fill)}</span>
      <span className="text-[9px] text-muted-foreground">{wasteCount} items</span>
      <span className="text-[10px] text-muted-foreground text-center leading-tight max-w-[64px]">{label}</span>
    </div>
  );
}

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

  const totalCompartments = bins.reduce((sum, b) => sum + getCompartments(b).length, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1>My Bins</h1>
        <p className="text-muted-foreground mt-1">{bins.length} bin{bins.length !== 1 ? "s" : ""} · {totalCompartments} compartment{totalCompartments !== 1 ? "s" : ""}</p>
      </div>

      {bins.length === 0 ? (
        <EmptyState icon={Trash2} title="No bins assigned" description="Contact your administrator to get bins assigned" />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {bins.map((bin) => {
              const compartments = getCompartments(bin);
              return (
                <Card key={bin.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <Link href={`/bins/${bin.id}`} className="font-medium text-sm hover:text-sortyx flex items-center gap-1 truncate">
                          {bin.device_id}
                          <ExternalLink className="h-3 w-3 shrink-0" />
                        </Link>
                        <Badge variant={bin.status === "active" ? "default" : "secondary"} className="text-[10px] px-1.5 py-0 shrink-0">
                          {bin.status}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground truncate ml-2">{bin.location_name ?? "—"}</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-end gap-3 justify-center">
                      {compartments
                        .sort((a, b) => a.compartment_index - b.compartment_index)
                        .map((c) => (
                          <CompartmentBar key={c.compartment_index} label={c.label} fill={c.current_fill_level} wasteCount={c.waste_count} />
                        ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-muted-foreground" />
                <CardTitle>Bin compartments</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {bins.map((bin) => {
                const compartments = getCompartments(bin);
                const isExpanded = expandedBin === bin.id;
                return (
                  <div key={bin.id} className="rounded-lg border overflow-hidden">
                    <button
                      onClick={() => setExpandedBin(isExpanded ? null : bin.id)}
                      className="flex w-full items-center justify-between p-3 text-sm hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {isExpanded ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                        <span className="font-medium truncate">{bin.device_id}</span>
                        <Badge variant={bin.status === "active" ? "default" : "secondary"} className="text-[10px] px-1.5 py-0 shrink-0">
                          {bin.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs text-muted-foreground">{compartments.length} compartment{compartments.length !== 1 ? "s" : ""}</span>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" asChild onClick={(e) => e.stopPropagation()}>
                          <Link href={`/bins/${bin.id}`}>
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        </Button>
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="border-t p-3 space-y-3">
                        {compartments
                          .sort((a, b) => a.compartment_index - b.compartment_index)
                          .map((c) => {
                            const fill = c.current_fill_level;
                            const barColor = fill >= 85 ? "bg-red-500" : fill >= 60 ? "bg-amber-500" : "bg-green-500";
                            return (
                              <div key={c.compartment_index} className="flex items-center gap-3">
                                <div className="relative w-6 h-20 rounded-md border border-border bg-muted/30 overflow-hidden shrink-0">
                                  <div className={cn("absolute bottom-0 left-0 right-0 transition-all", barColor)} style={{ height: `${fill}%` }}>
                                    <div className="absolute inset-x-0 top-0 h-1 bg-white/20 rounded-t-sm" />
                                  </div>
                                  <div className="absolute inset-x-0 top-1/4 h-px bg-border/30" />
                                  <div className="absolute inset-x-0 top-2/4 h-px bg-border/30" />
                                  <div className="absolute inset-x-0 top-3/4 h-px bg-border/30" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium">{c.label}</span>
                                    <span className="text-xs font-semibold">{formatPercent(fill)}</span>
                                  </div>
                                  <p className="text-[10px] text-muted-foreground">{c.current_weight_kg} kg · {c.waste_count} items</p>
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
