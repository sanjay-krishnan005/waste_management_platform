"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate, formatRelativeTime, cn } from "@/lib/utils";
import { Bell, CheckCircle2, Eye, Filter, AlertTriangle, Clock } from "lucide-react";

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

const severityConfig: Record<string, { color: string; bg: string; border: string; label: string }> = {
  critical: { color: "bg-red-500", bg: "bg-red-50 dark:bg-red-950/20", border: "border-l-red-500", label: "Critical" },
  high: { color: "bg-orange-500", bg: "bg-orange-50 dark:bg-orange-950/20", border: "border-l-orange-500", label: "High" },
  medium: { color: "bg-amber-500", bg: "bg-amber-50 dark:bg-amber-950/20", border: "border-l-amber-500", label: "Medium" },
  low: { color: "bg-blue-500", bg: "bg-blue-50 dark:bg-blue-950/20", border: "border-l-blue-500", label: "Low" },
};

const SEVERITY_OPTIONS = ["all", "critical", "high", "medium", "low"] as const;
const TYPE_OPTIONS = ["all", "full_bin", "offline", "sensor_failure", "camera_failure", "low_battery", "ad_expiry"] as const;

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [filter, setFilter] = useState<"active" | "all">("active");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const supabase = createClient();

  async function load() {
    let q = supabase
      .from("alerts")
      .select("id, alert_type, severity, message, created_at, acknowledged_at, resolved_at, bins(device_id)")
      .order("created_at", { ascending: false });
    if (filter === "active") q = q.is("resolved_at", null);
    const { data } = await q.limit(50);
    setAlerts((data as unknown as AlertRow[]) ?? []);
    setSelected(new Set());
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

  async function bulkAction(action: "acknowledge" | "resolve") {
    const { data: { user } } = await supabase.auth.getUser();
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    const update: Record<string, unknown> = action === "acknowledge"
      ? { acknowledged_at: new Date().toISOString(), acknowledged_by: user?.id }
      : { resolved_at: new Date().toISOString(), resolved_by: user?.id };
    await supabase.from("alerts").update(update).in("id", ids);
    load();
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const filteredAlerts = alerts.filter((a) => {
    if (severityFilter !== "all" && a.severity !== severityFilter) return false;
    if (typeFilter !== "all" && a.alert_type !== typeFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1>Alerts</h1>
          <p className="mt-1 text-sm text-muted-foreground">Monitor and resolve bin alerts</p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border p-0.5">
          <Button
            variant={filter === "active" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setFilter("active")}
            className="text-xs"
          >
            Active
          </Button>
          <Button
            variant={filter === "all" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setFilter("all")}
            className="text-xs"
          >
            All
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {SEVERITY_OPTIONS.map((s) => (
          <button
            key={s}
            onClick={() => setSeverityFilter(s)}
            className={cn(
              "inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
              severityFilter === s
                ? "border-primary bg-primary/10 text-primary"
                : "border-input bg-background text-muted-foreground hover:bg-accent"
            )}
          >
            {s === "all" ? "All Severities" : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-2 rounded-lg border bg-accent/30 p-2 animate-fade-in">
          <span className="text-xs font-medium text-muted-foreground">{selected.size} selected</span>
          <Button size="sm" variant="outline" onClick={() => bulkAction("acknowledge")}>
            <Eye className="h-3.5 w-3.5 mr-1.5" />
            Acknowledge
          </Button>
          <Button size="sm" variant="outline" onClick={() => bulkAction("resolve")}>
            <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
            Resolve
          </Button>
        </div>
      )}

      {/* Alert list */}
      <div className="space-y-2">
        {filteredAlerts.length === 0 ? (
          <EmptyState
            icon={Bell}
            title={filter === "active" ? "No active alerts" : "No alerts found"}
            description="All bins are operating normally"
            className="py-16"
          />
        ) : (
          filteredAlerts.map((a) => {
            const sev = a.severity ?? "medium";
            const cfg = severityConfig[sev] ?? severityConfig.medium;
            const isSelected = selected.has(a.id);
            const binDeviceId = Array.isArray(a.bins) ? a.bins[0]?.device_id : a.bins?.device_id;
            return (
              <div
                key={a.id}
                className={cn(
                  "rounded-lg border-l-4 border bg-card p-4 transition-all duration-150",
                  cfg.border,
                  isSelected && "ring-2 ring-primary/30",
                  "hover:shadow-sm"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="flex items-center h-5 pt-0.5">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(a.id)}
                      className="h-4 w-4 rounded border-input"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={a.alert_type === "offline" || a.alert_type === "sensor_failure" ? "destructive" : "default"} className="text-[10px] px-1.5 py-0">
                        {a.alert_type.replace(/_/g, " ")}
                      </Badge>
                      <span className={cn("inline-block h-1.5 w-1.5 rounded-full", cfg.color)} />
                      <span className="text-xs text-muted-foreground">{cfg.label}</span>
                      {binDeviceId && (
                        <span className="text-xs font-mono text-muted-foreground">{binDeviceId}</span>
                      )}
                      <span className="text-xs text-muted-foreground ml-auto">{formatRelativeTime(a.created_at)}</span>
                    </div>
                    <p className="mt-1.5 text-sm text-foreground">{a.message}</p>
                    {!a.resolved_at && (
                      <div className="flex gap-2 mt-3">
                        {!a.acknowledged_at && (
                          <Button size="sm" variant="outline" onClick={() => acknowledge(a.id)} className="text-xs h-7">
                            <Eye className="h-3 w-3 mr-1" />
                            Acknowledge
                          </Button>
                        )}
                        <Button size="sm" onClick={() => resolve(a.id)} className="text-xs h-7">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Resolve
                        </Button>
                      </div>
                    )}
                    {a.resolved_at && (
                      <p className="mt-1.5 text-xs text-muted-foreground flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                        Resolved {formatRelativeTime(a.resolved_at)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
