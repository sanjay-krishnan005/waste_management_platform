"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

type AlertRow = {
  id: string;
  alert_type: string;
  severity: string;
  message: string;
  created_at: string;
  acknowledged_at: string | null;
  resolved_at: string | null;
  bins: { device_id: string } | { device_id: string }[] | null;
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [filter, setFilter] = useState<"active" | "all">("active");
  const supabase = createClient();

  async function load() {
    let q = supabase
      .from("alerts")
      .select("id, alert_type, severity, message, created_at, acknowledged_at, resolved_at, bins(device_id)")
      .order("created_at", { ascending: false });
    if (filter === "active") q = q.is("resolved_at", null);
    const { data } = await q.limit(50);
    setAlerts((data as unknown as AlertRow[]) ?? []);
  }

  useEffect(() => { load(); }, [filter]);

  useEffect(() => {
    const ch = supabase.channel("alerts-page").on("postgres_changes", { event: "*", schema: "public", table: "alerts" }, load).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [supabase]);

  async function acknowledge(id: string) {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("alerts").update({ acknowledged_at: new Date().toISOString(), acknowledged_by: user?.id }).eq("id", id);
    load();
  }

  async function resolve(id: string) {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("alerts").update({ resolved_at: new Date().toISOString(), resolved_by: user?.id }).eq("id", id);
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Alerts</h1>
          <p className="text-muted-foreground">Monitor and resolve bin alerts</p>
        </div>
        <div className="flex gap-2">
          <Button variant={filter === "active" ? "default" : "outline"} size="sm" onClick={() => setFilter("active")}>Active</Button>
          <Button variant={filter === "all" ? "default" : "outline"} size="sm" onClick={() => setFilter("all")}>All</Button>
        </div>
      </div>
      <div className="space-y-3">
        {alerts.map((a) => (
          <Card key={a.id}>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant={a.severity === "critical" ? "destructive" : "warning"}>{a.alert_type.replace(/_/g, " ")}</Badge>
                <span className="text-sm text-muted-foreground">
                  {Array.isArray(a.bins) ? a.bins[0]?.device_id : a.bins?.device_id}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">{formatDate(a.created_at)}</span>
            </CardHeader>
            <CardContent>
              <p>{a.message}</p>
              {!a.resolved_at && (
                <div className="flex gap-2 mt-3">
                  {!a.acknowledged_at && (
                    <Button size="sm" variant="outline" onClick={() => acknowledge(a.id)}>Acknowledge</Button>
                  )}
                  <Button size="sm" onClick={() => resolve(a.id)}>Resolve</Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
