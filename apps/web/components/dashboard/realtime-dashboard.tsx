"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { KpiCards } from "./kpi-cards";
import { BinMap, type BinMapMarker } from "@/components/maps/bin-map";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Bell, Clock, MapPin, Users, ActivityIcon, ShieldCheck } from "lucide-react";

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

function SeverityDot({ severity }: { severity: string }) {
  return (
    <span
      className={cn(
        "inline-block h-2 w-2 rounded-full shrink-0",
        severity === "critical" && "bg-red-500",
        severity === "warning" && "bg-amber-500",
        severity === "info" && "bg-blue-500",
        !["critical", "warning", "info"].includes(severity) && "bg-gray-400"
      )}
    />
  );
}

function ActionIcon({ action }: { action: string }) {
  const base = "h-4 w-4 text-muted-foreground";
  if (action.includes("alert")) return <Bell className={base} />;
  if (action.includes("auth") || action.includes("credential")) return <ShieldCheck className={base} />;
  return <ActivityIcon className={base} />;
}



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
      setBinsByCustomer(
        Array.from(customerMap.entries()).map(([name, bins]) => ({ name, bins }))
      );
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

    setKpis({
      totalBins: binData?.length ?? 0,
      fullBins: full,
      activeAlerts: alertCount ?? 0,
      offlineBins: offline,
      authenticatedBins: authCount ?? 0,
    });

    const { data: alertData } = await supabase
      .from("alerts")
      .select("id, alert_type, severity, message, created_at, bins(device_id)")
      .is("resolved_at", null)
      .order("created_at", { ascending: false })
      .limit(5);
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

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, refreshData]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1>Dashboard</h1>
          <p className="text-muted-foreground mt-1">Real-time overview of your smart waste bins</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>Updated {formatDate(lastUpdated.toISOString())}</span>
          {refreshing && <div className="h-3 w-3 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />}
        </div>
      </div>

      <KpiCards data={kpis} />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <CardTitle>Live map</CardTitle>
            </div>
            <Badge variant="outline" className="text-xs font-normal">
              {bins.length} bin{bins.length !== 1 ? "s" : ""}
            </Badge>
          </CardHeader>
          <CardContent className="p-0">
            {bins.length === 0 ? (
              <div className="flex items-center justify-center h-[400px] bg-muted/20">
                <div className="text-center">
                  <div className="mb-3 rounded-full bg-muted p-4 inline-block">
                    <MapPin className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium">No bins on map</p>
                  <p className="text-xs text-muted-foreground mt-1">Deploy bins to see them on the map</p>
                </div>
              </div>
            ) : (
              <BinMap markers={bins} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <CardTitle>Alert center</CardTitle>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/alerts">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[420px] overflow-y-auto">
            {alerts.length === 0 ? (
              <EmptyState
                icon={Bell}
                title="No active alerts"
                description="All bins are operating normally"
                className="py-8"
              />
            ) : (
              alerts.map((a) => (
                <div key={a.id} className="rounded-lg border p-3 text-sm hover:bg-accent/50 transition-colors">
                  <div className="flex items-start gap-3">
                    <SeverityDot severity={a.severity} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <Badge
                          variant={a.severity === "critical" ? "destructive" : "secondary"}
                          className="text-[10px] px-1.5 py-0"
                        >
                          {a.alert_type.replace("_", " ")}
                        </Badge>
                      </div>
                      <p className="text-foreground truncate">{a.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">{formatDate(a.created_at)}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <CardTitle>Bins by customer</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 max-h-[400px] overflow-y-auto">
            {binsByCustomer.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No bins deployed"
                description="Assign bins to customers to see them here"
                className="py-8"
              />
            ) : (
              binsByCustomer.map((c) => (
                <div key={c.name} className="rounded-lg border p-3 hover:bg-accent/50 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{c.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {c.bins.length}
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
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ActivityIcon className="h-4 w-4 text-muted-foreground" />
              <CardTitle>Recent activity</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {activity.length === 0 ? (
              <EmptyState
                icon={ActivityIcon}
                title="No activity yet"
                description="Activity will appear as bins interact with the platform"
                className="py-8"
              />
            ) : (
              <div className="space-y-0">
                {activity.map((a, i) => (
                  <div key={a.id} className="flex gap-3 pb-3 last:pb-0">
                    <div className="flex flex-col items-center">
                      <div className="rounded-full border p-1.5 bg-background">
                        <ActionIcon action={a.action} />
                      </div>
                      {i < activity.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
                    </div>
                    <div className="flex-1 min-w-0 pb-3">
                      <p className="text-sm font-medium capitalize">{a.action.replace(/_/g, " ")}</p>
                      {(Array.isArray(a.bins) ? a.bins[0]?.device_id : a.bins?.device_id) && (
                        <p className="text-xs text-muted-foreground font-mono">
                          {Array.isArray(a.bins) ? a.bins[0]?.device_id : a.bins?.device_id}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-0.5">{formatDate(a.created_at)}</p>
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
