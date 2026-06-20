"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { KpiCards } from "./kpi-cards";
import { BinMap, type BinMapMarker } from "@/components/maps/bin-map";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import Link from "next/link";
import { formatDate, formatRelativeTime, cn } from "@/lib/utils";
import { Bell, MapPin, Users, ActivityIcon, Clock, RefreshCw, ArrowUpRight, CheckCircle2, Eye, X, Trash2 } from "lucide-react";

type Alert = {
  id: string;
  alert_type: string;
  severity: string;
  message: string;
  created_at: string;
  acknowledged_at: string | null;
  resolved_at: string | null;
  bins: { device_id: string } | { device_id: string }[] | null;
};

type Activity = {
  id: string;
  action: string;
  details: Record<string, unknown>;
  created_at: string;
  bins: { device_id: string } | { device_id: string }[] | null;
};

const severityConfig: Record<string, { color: string; label: string }> = {
  critical: { color: "bg-red-500", label: "Critical" },
  high: { color: "bg-orange-500", label: "High" },
  medium: { color: "bg-amber-500", label: "Medium" },
  low: { color: "bg-blue-500", label: "Low" },
};

const TYPE_OPTIONS = ["all", "full_bin", "offline", "sensor_failure", "camera_failure", "low_battery"] as const;

export function RealtimeDashboard({
  initialBins,
  initialKpis,
  initialAlerts,
  initialActivity,
  initialBinsByCustomer,
}: {
  initialBins: BinMapMarker[];
  initialKpis: {
    totalBins: number;
    fullBins: number;
    activeAlerts: number;
    offlineBins: number;
    authenticatedBins: number;
  };
  initialAlerts: Alert[];
  initialActivity: Activity[];
  initialBinsByCustomer: { name: string; bins: string[] }[];
}) {
  const [bins, setBins] = useState(initialBins);
  const [kpis, setKpis] = useState(initialKpis);
  const [alerts, setAlerts] = useState(initialAlerts);
  const [activity, setActivity] = useState(initialActivity);
  const [binsByCustomer, setBinsByCustomer] = useState(initialBinsByCustomer);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [alertFilter, setAlertFilter] = useState<string>("all");
  const bellRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  const refreshData = useCallback(async () => {
    setRefreshing(true);
    const { data: binData } = await supabase
      .from("bins")
      .select("id, device_id, latitude, longitude, status, latest_fill_level, location_name, customers(name)");

    if (binData) {
      const mapped = binData.map((b) => ({
        id: b.id,
        device_id: b.device_id,
        latitude: b.latitude,
        longitude: b.longitude,
        status: b.status,
        latest_fill_level: b.latest_fill_level,
        location_name: b.location_name,
        customer_name: ((b.customers as unknown) as { name: string } | null)?.name ?? null,
      })) as BinMapMarker[];
      setBins(mapped);

      const customerMap = new Map<string, string[]>();
      for (const b of binData) {
        const name = ((b.customers as unknown) as { name: string } | null)?.name ?? "Unassigned";
        const list = customerMap.get(name) ?? [];
        list.push(b.device_id);
        customerMap.set(name, list);
      }
      setBinsByCustomer(Array.from(customerMap.entries()).map(([name, bins]) => ({ name, bins })));
    }

    const full = binData?.filter((b) => (b.latest_fill_level ?? 0) >= 85).length ?? 0;
    const offline = binData?.filter((b) => b.status === "offline" || b.status === "unregistered").length ?? 0;

    const { count: alertCount } = await supabase
      .from("alerts")
      .select("*", { count: "exact", head: true })
      .is("resolved_at", null);

    const { count: authCount } = await supabase
      .from("bins")
      .select("*", { count: "exact", head: true })
      .not("api_key", "is", null);

    setKpis({ totalBins: binData?.length ?? 0, fullBins: full, activeAlerts: alertCount ?? 0, offlineBins: offline, authenticatedBins: authCount ?? 0 });

    const { data: alertData } = await supabase
      .from("alerts")
      .select("id, alert_type, severity, message, created_at, acknowledged_at, resolved_at, bins(device_id)")
      .is("resolved_at", null)
      .order("created_at", { ascending: false })
      .limit(10);
    if (alertData) setAlerts(alertData as unknown as Alert[]);

    const { data: actData } = await supabase
      .from("activity_log")
      .select("id, action, details, created_at, bins(device_id)")
      .order("created_at", { ascending: false })
      .limit(8);
    if (actData) setActivity(actData as unknown as Activity[]);

    setLastUpdated(new Date());
    setRefreshing(false);
  }, [supabase]);

  useEffect(() => {
    const channel = supabase
      .channel("dashboard-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "bins" }, () => refreshData())
      .on("postgres_changes", { event: "*", schema: "public", table: "alerts" }, () => refreshData())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "telemetry_events" }, () => refreshData())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "activity_log" }, () => refreshData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [supabase, refreshData]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false);
      }
    }
    if (bellOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [bellOpen]);

  async function handleAcknowledge(id: string) {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("alerts").update({ acknowledged_at: new Date().toISOString(), acknowledged_by: user?.id }).eq("id", id);
    refreshData();
  }

  async function handleResolve(id: string) {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("alerts").update({ resolved_at: new Date().toISOString(), resolved_by: user?.id }).eq("id", id);
    refreshData();
  }

  const activeAlertCount = kpis.activeAlerts;
  const filteredAlerts = alertFilter === "all"
    ? alerts
    : alerts.filter((a) => a.alert_type === alertFilter);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1>Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">Real-time overview of your smart waste bins</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mr-1">
            <Clock className="h-3 w-3" />
            <span className="hidden sm:inline">{formatDate(lastUpdated.toISOString())}</span>
          </div>
          {/* Bell dropdown */}
          <div ref={bellRef} className="relative">
            <Button
              variant="ghost"
              size="icon-sm"
              className="relative"
              onClick={() => setBellOpen(!bellOpen)}
            >
              <Bell className="h-4 w-4" />
              {activeAlertCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[8px] font-bold text-destructive-foreground">
                  {activeAlertCount > 9 ? "9+" : activeAlertCount}
                </span>
              )}
            </Button>

            {bellOpen && (
              <div className="absolute right-0 top-full mt-2 w-[380px] origin-top-right rounded-lg border shadow-lg animate-scale-in z-50 glass-strong">
                <div className="flex items-center justify-between border-b px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-semibold">Alerts</span>
                    {activeAlertCount > 0 && (
                      <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                        {activeAlertCount} active
                      </Badge>
                    )}
                  </div>
                  <Button variant="ghost" size="icon-sm" onClick={() => setBellOpen(false)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>

                {/* Severity filter */}
                <div className="flex gap-1.5 px-4 py-2 border-b overflow-x-auto">
                  <button
                    onClick={() => setAlertFilter("all")}
                    className={cn(
                      "shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-medium transition-colors whitespace-nowrap",
                      alertFilter === "all"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-input text-muted-foreground hover:bg-accent"
                    )}
                  >
                    All
                  </button>
                  {TYPE_OPTIONS.filter((t) => t !== "all").map((t) => (
                    <button
                      key={t}
                      onClick={() => setAlertFilter(t)}
                      className={cn(
                        "shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-medium transition-colors whitespace-nowrap",
                        alertFilter === t
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-input text-muted-foreground hover:bg-accent"
                      )}
                    >
                      {t.replace(/_/g, " ")}
                    </button>
                  ))}
                </div>

                {/* Alert list */}
                <div className="max-h-[360px] overflow-y-auto">
                  {filteredAlerts.length === 0 ? (
                    <div className="flex flex-col items-center py-10 text-center">
                      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                        <Bell className="h-5 w-5 text-muted-foreground/60" />
                      </div>
                      <p className="text-xs font-medium text-muted-foreground">No alerts</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">All bins are operating normally</p>
                    </div>
                  ) : (
                    filteredAlerts.map((a) => {
                      const sev = a.severity ?? "medium";
                      const cfg = severityConfig[sev] ?? severityConfig.medium;
                      const binDeviceId = Array.isArray(a.bins) ? a.bins[0]?.device_id : a.bins?.device_id;
                      return (
                        <div key={a.id} className="border-b last:border-0 px-4 py-3 transition-colors hover:bg-accent/20">
                          <div className="flex items-start gap-2.5">
                            <div className={cn("mt-1 h-2 w-2 shrink-0 rounded-full", cfg.color)} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[10px] font-medium text-foreground capitalize">
                                  {a.alert_type.replace(/_/g, " ")}
                                </span>
                                {binDeviceId && (
                                  <span className="text-[10px] font-mono text-muted-foreground">
                                    {binDeviceId}
                                  </span>
                                )}
                                <span className="text-[10px] text-muted-foreground ml-auto">
                                  {formatRelativeTime(a.created_at)}
                                </span>
                              </div>
                              <p className="text-xs text-foreground/80 mt-0.5 leading-relaxed">{a.message}</p>
                              <div className="flex items-center gap-1.5 mt-2">
                                {!a.acknowledged_at && (
                                  <button
                                    onClick={() => handleAcknowledge(a.id)}
                                    className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-medium text-muted-foreground hover:bg-accent transition-colors"
                                  >
                                    <Eye className="h-3 w-3" />
                                    Acknowledge
                                  </button>
                                )}
                                <button
                                  onClick={() => handleResolve(a.id)}
                                  className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-medium text-muted-foreground hover:bg-accent transition-colors"
                                >
                                  <CheckCircle2 className="h-3 w-3" />
                                  Resolve
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Footer */}
                <div className="border-t px-4 py-2.5">
                  <Button variant="ghost" size="sm" asChild className="w-full text-xs">
                    <Link href="/alerts">
                      View all alerts
                      <ArrowUpRight className="ml-1 h-3 w-3" />
                    </Link>
                  </Button>
                </div>
              </div>
            )}
          </div>

          <Button variant="ghost" size="icon-sm" onClick={refreshData} disabled={refreshing}>
            <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <KpiCards data={kpis} />

      {/* Bento Grid: Map + Activity + Bins by Customer */}
      <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-4">
        {/* Map - spans 2 cols */}
        <Card variant="glass" className="md:col-span-2 lg:col-span-3 overflow-hidden flex flex-col min-h-[420px] md:min-h-0">
          <CardHeader className="flex flex-row items-center justify-between pb-3 shrink-0">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <CardTitle>Live Map</CardTitle>
            </div>
            <Badge variant="neutral" className="text-[11px] font-normal">
              {bins.length} bin{bins.length !== 1 ? "s" : ""}
            </Badge>
          </CardHeader>
          <div className="relative flex-1 min-h-[300px] md:min-h-[360px]">
            {bins.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center bg-muted/20">
                <div className="text-center">
                  <div className="mb-3 rounded-xl bg-muted p-3 inline-block">
                    <MapPin className="h-5 w-5 text-muted-foreground/60" />
                  </div>
                  <p className="text-sm font-medium">No bins on map</p>
                  <p className="text-xs text-muted-foreground mt-1">Deploy bins to see them here</p>
                </div>
              </div>
            ) : (
              <BinMap markers={bins} />
            )}
          </div>
        </Card>

        {/* Recent Activity - spans 1 col */}
        <Card variant="glass" className="flex flex-col overflow-hidden md:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-3 shrink-0">
            <div className="flex items-center gap-2">
              <ActivityIcon className="h-4 w-4 text-muted-foreground" />
              <CardTitle>Recent Activity</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto max-h-[360px] p-0">
            {activity.length === 0 ? (
              <div className="flex items-center justify-center h-full py-10">
                <EmptyState icon={ActivityIcon} title="No activity yet" description="Activity will appear as bins interact" className="py-8" />
              </div>
            ) : (
              <div className="px-4 py-3">
                {activity.map((a, i) => {
                  const binDeviceId = Array.isArray(a.bins) ? a.bins[0]?.device_id : a.bins?.device_id;
                  return (
                    <div key={a.id} className="relative flex gap-3 pb-5 last:pb-2">
                      {i < activity.length - 1 && (
                        <div className="absolute left-[11px] top-6 bottom-0 w-px bg-border" />
                      )}
                      <div className="relative z-10 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-primary/20 bg-background">
                        <div className="h-2 w-2 rounded-full bg-primary/60" />
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

        {/* Bins by Customer - full width */}
        <Card variant="glass" className="md:col-span-3 lg:col-span-4">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <CardTitle>Bins by Customer</CardTitle>
            </div>
            <Badge variant="neutral" className="text-[11px] font-normal">
              {binsByCustomer.length} customer{binsByCustomer.length !== 1 ? "s" : ""}
            </Badge>
          </CardHeader>
          <CardContent>
            {binsByCustomer.length === 0 ? (
              <EmptyState icon={Trash2} title="No bins deployed" description="Assign bins to customers to see them here" className="py-8" />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {binsByCustomer.map((c) => (
                  <div key={c.name} className="rounded-lg border p-3 transition-colors hover:bg-accent/30">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">{c.name}</span>
                      <Badge variant="secondary" className="text-[10px]">
                        {c.bins.length} bin{c.bins.length !== 1 ? "s" : ""}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {c.bins.map((deviceId) => (
                        <Badge key={deviceId} variant="outline" className="text-[10px] font-mono">
                          {deviceId}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
