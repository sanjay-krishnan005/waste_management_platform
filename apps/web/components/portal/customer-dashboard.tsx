"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BinMap, type BinMapMarker } from "@/components/maps/bin-map";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Trash2, AlertTriangle, WifiOff, Activity, Bell, Clock, Download } from "lucide-react";
import type { Profile } from "@/lib/auth/rbac";
import { toast } from "sonner";
import { useState } from "react";

type Bin = {
  id: string;
  device_id: string;
  latitude: number | null;
  longitude: number | null;
  status: string;
  latest_fill_level: number | null;
  latest_battery: number | null;
  location_name: string | null;
  bin_type: string | null;
  last_seen_at: string | null;
};

type Alert = {
  id: string;
  alert_type: string;
  severity: string;
  message: string;
  created_at: string;
  bins: { device_id: string } | { device_id: string }[] | null;
};

type Activity = {
  id: string;
  action: string;
  details: Record<string, unknown>;
  created_at: string;
  bins: { device_id: string } | { device_id: string }[] | null;
};

export function CustomerDashboard({
  profile,
  bins,
  alerts,
  activity,
  alertCount,
  fullBins,
  offlineBins,
}: {
  profile: Profile;
  bins: Bin[];
  alerts: Alert[];
  activity: Activity[];
  alertCount: number;
  fullBins: number;
  offlineBins: number;
}) {
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      const res = await fetch("/api/reports/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format: "csv", scope: "my-bins" }),
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bins-report-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Report downloaded");
    } catch {
      toast.error("Export failed");
    }
    setExporting(false);
  }

  const kpis = [
    { label: "My Bins", value: bins.length, icon: Trash2, color: "text-sortyx", iconBg: "bg-sortyx/10", borderAccent: "border-l-sortyx" },
    { label: "Full Bins", value: fullBins, icon: Activity, color: "text-amber-600", iconBg: "bg-amber-500/10", borderAccent: "border-l-amber-500" },
    { label: "Active Alerts", value: alertCount, icon: AlertTriangle, color: "text-red-600", iconBg: "bg-red-500/10", borderAccent: "border-l-red-500" },
    { label: "Offline", value: offlineBins, icon: WifiOff, color: "text-gray-600", iconBg: "bg-gray-500/10", borderAccent: "border-l-gray-500" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1>Dashboard</h1>
          <p className="text-muted-foreground mt-1">Welcome, {profile.full_name ?? profile.email}</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}>
          <Download className="mr-1.5 h-4 w-4" />
          {exporting ? "Exporting..." : "Export report"}
        </Button>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <Card key={k.label} className={cn("border-l-4", k.borderAccent)}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className={cn("rounded-full p-2", k.iconBg)}>
                    <Icon className={cn("h-4 w-4", k.color)} />
                  </div>
                </div>
                <div className="mt-2">
                  <div className="text-2xl font-bold">{k.value}</div>
                  <p className="text-sm text-muted-foreground">{k.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Your bins on map</CardTitle></CardHeader>
          <CardContent className="p-0">
            {bins.length === 0 ? (
              <div className="flex items-center justify-center h-[300px] bg-muted/20">
                <p className="text-sm text-muted-foreground">No bins assigned yet</p>
              </div>
            ) : (
              <BinMap markers={bins as BinMapMarker[]} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <CardTitle>Active alerts</CardTitle>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/portal/alerts">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[300px] overflow-y-auto">
            {alerts.length === 0 ? (
              <EmptyState icon={Bell} title="No active alerts" description="All bins operating normally" className="py-6" />
            ) : (
              alerts.map((a) => (
                <div key={a.id} className="rounded-lg border p-3 text-sm">
                  <div className="flex items-start gap-3">
                    <span className={cn("inline-block h-2 w-2 rounded-full shrink-0 mt-1", a.severity === "critical" ? "bg-red-500" : "bg-amber-500")} />
                    <div className="flex-1 min-w-0">
                      <Badge variant={a.severity === "critical" ? "destructive" : "secondary"} className="text-[10px] px-1.5 py-0 mb-1">
                        {a.alert_type.replace("_", " ")}
                      </Badge>
                      <p className="truncate">{a.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">{formatDate(a.created_at)}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <CardTitle>Recent activity</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {activity.length === 0 ? (
            <EmptyState icon={Activity} title="No activity yet" description="Activity will appear as bins interact" className="py-6" />
          ) : (
            <div className="space-y-3">
              {activity.slice(0, 5).map((a) => (
                <div key={a.id} className="flex items-start gap-3 text-sm">
                  <div className="rounded-full border p-1 mt-0.5">
                    <Activity className="h-3 w-3 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="capitalize">{a.action.replace(/_/g, " ")}</p>
                    {(Array.isArray(a.bins) ? a.bins[0]?.device_id : a.bins?.device_id) && (
                      <p className="text-xs text-muted-foreground font-mono">
                        {Array.isArray(a.bins) ? a.bins[0]?.device_id : a.bins?.device_id}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">{formatDate(a.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
