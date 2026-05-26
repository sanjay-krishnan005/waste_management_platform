"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BinMap, type BinMapMarker } from "@/components/maps/bin-map";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate, formatRelativeTime, cn } from "@/lib/utils";
import { Trash2, AlertTriangle, WifiOff, Activity, Bell, Clock, Download, CheckCircle2, XCircle } from "lucide-react";
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

  const avgFill = bins.length > 0
    ? Math.round(bins.reduce((s, b) => s + (b.latest_fill_level ?? 0), 0) / bins.length)
    : 0;

  const kpis = [
    { label: "My Bins", value: bins.length, icon: Trash2, color: "text-primary", iconBg: "bg-primary/10" },
    { label: "Full Bins", value: fullBins, icon: AlertTriangle, color: "text-amber-600 dark:text-amber-400", iconBg: "bg-amber-50 dark:bg-amber-950/30" },
    { label: "Active Alerts", value: alertCount, icon: Bell, color: "text-red-600 dark:text-red-400", iconBg: "bg-red-50 dark:bg-red-950/30" },
    { label: "Offline", value: offlineBins, icon: WifiOff, color: "text-muted-foreground", iconBg: "bg-muted" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1>Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">Welcome back, {profile.full_name ?? profile.email}</p>
        </div>
      </div>

      {/* Welcome summary card */}
      <Card className="bg-gradient-to-r from-primary/5 to-transparent border-primary/10">
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium">Your Fleet Overview</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {bins.length} bin{bins.length !== 1 ? "s" : ""} · Average fill {avgFill}%
                {fullBins > 0 && <span className="ml-2 text-amber-600">· {fullBins} bin{fullBins !== 1 ? "s" : ""} need attention</span>}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}>
              <Download className="mr-1.5 h-4 w-4" />
              {exporting ? "Exporting..." : "Export"}
            </Button>
          </div>
          {/* Mini fill overview */}
          {bins.length > 0 && (
            <div className="mt-4 flex gap-1.5">
              {bins.map((b) => {
                const fill = b.latest_fill_level ?? 0;
                return (
                  <div
                    key={b.id}
                    className="flex-1 h-2 rounded-full bg-muted overflow-hidden"
                    title={`${b.device_id}: ${Math.round(fill)}%`}
                  >
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        fill >= 85 ? "bg-red-500" : fill >= 60 ? "bg-amber-500" : "bg-primary"
                      )}
                      style={{ width: `${fill}%` }}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <Card key={k.label}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">{k.label}</span>
                  <Icon className={cn("h-4 w-4", k.color)} />
                </div>
                <div className={cn("mt-2 text-2xl font-semibold tracking-tight", k.color)}>
                  {k.value}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Your Bins on Map</CardTitle>
          </CardHeader>
          <div className="relative">
            {bins.length === 0 ? (
              <div className="flex items-center justify-center h-[300px] bg-muted/20">
                <p className="text-sm text-muted-foreground">No bins assigned yet</p>
              </div>
            ) : (
              <BinMap markers={bins as BinMapMarker[]} />
            )}
          </div>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <CardTitle>Active Alerts</CardTitle>
            </div>
            <Button variant="ghost" size="sm" asChild className="text-xs">
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
                    <div className={cn("mt-0.5 h-2 w-2 shrink-0 rounded-full", a.severity === "critical" ? "bg-red-500" : "bg-amber-500")} />
                    <div className="flex-1 min-w-0">
                      <Badge variant="neutral" className="text-[10px] px-1.5 py-0 mb-1">
                        {a.alert_type.replace(/_/g, " ")}
                      </Badge>
                      <p className="text-xs truncate">{a.message}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">{formatRelativeTime(a.created_at)}</p>
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
            <CardTitle>Recent Activity</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {activity.length === 0 ? (
            <EmptyState icon={Activity} title="No activity yet" description="Activity will appear as bins interact" className="py-6" />
          ) : (
            <div className="space-y-3">
              {activity.slice(0, 5).map((a) => {
                const binDeviceId = Array.isArray(a.bins) ? a.bins[0]?.device_id : a.bins?.device_id;
                return (
                  <div key={a.id} className="flex items-start gap-3 text-sm">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full border bg-background">
                      <Activity className="h-3 w-3 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium capitalize">{a.action.replace(/_/g, " ")}</p>
                      {binDeviceId && (
                        <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{binDeviceId}</p>
                      )}
                      <p className="text-[10px] text-muted-foreground mt-0.5">{formatRelativeTime(a.created_at)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
