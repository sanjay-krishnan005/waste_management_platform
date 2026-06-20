"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { formatPercent, formatDate, formatRelativeTime, cn } from "@/lib/utils";
import { BinCompartmentPieChart } from "./bin-compartment-pie-chart";
import { BinCredentials } from "./bin-credentials";
import { DeleteButton } from "@/components/ui/delete-button";
import { canManageBins } from "@/lib/auth/rbac";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import {
  Pencil,
  Activity,
  Camera,
  Battery,
  Wifi,
  Layers,
  KeyRound,
  BarChart3,
  Clock,
  Trash2,
  ChevronRight,
  CheckCircle2,
  XCircle,
} from "lucide-react";

type Compartment = {
  id: string;
  compartment_index: number;
  label: string;
  current_fill_level: number;
  current_weight_kg: number;
  waste_count: number;
  classification: Record<string, number>;
};

type Telemetry = {
  recorded_at: string;
  fill_level: number;
  weight_kg: number;
  battery_percent: number;
};

const statusConfig: Record<string, { label: string; variant: "success" | "destructive" | "warning" | "neutral" | "secondary" }> = {
  active: { label: "Active", variant: "success" },
  offline: { label: "Offline", variant: "destructive" },
  unregistered: { label: "Not connected", variant: "neutral" },
  maintenance: { label: "Maintenance", variant: "warning" },
  decommissioned: { label: "Decommissioned", variant: "secondary" },
};

function MetricBadge({ icon: Icon, label, value, status }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string | null; status?: string }) {
  const isOk = status === "ok" || status === "online";
  const isBad = status === "error" || status === "offline";
  return (
    <div className="flex items-center gap-3 rounded-lg border p-3">
      <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", isOk ? "bg-emerald-50 dark:bg-emerald-950/30" : isBad ? "bg-red-50 dark:bg-red-950/30" : "bg-muted")}>
        <Icon className={cn("h-4 w-4", isOk ? "text-emerald-600 dark:text-emerald-400" : isBad ? "text-red-600 dark:text-red-400" : "text-muted-foreground")} />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="flex items-center gap-1.5">
          <span className={cn("text-sm font-semibold", !value && "text-muted-foreground")}>{value ?? "No data"}</span>
          {isOk && <CheckCircle2 className="h-3 w-3 text-emerald-500" />}
          {isBad && <XCircle className="h-3 w-3 text-red-500" />}
        </div>
      </div>
    </div>
  );
}

export function BinDetailView({
  bin,
  compartments: initialCompartments,
  telemetry: initialTelemetry,
  role,
}: {
  bin: Record<string, unknown>;
  compartments: Compartment[];
  telemetry: Telemetry[];
  role?: string;
}) {
  const [compartments, setCompartments] = useState(initialCompartments);
  const [telemetry, setTelemetry] = useState(initialTelemetry);
  const [binState, setBinState] = useState(bin);
  const supabase = createClient();

  const b = binState as {
    id: string;
    device_id: string;
    status: string;
    location_name: string;
    latitude: number;
    longitude: number;
    latest_fill_level: number;
    latest_battery: number;
    camera_status: string | null;
    sensor_health: string | null;
    internet_status: string | null;
    snapshot_url: string;
    last_seen_at: string;
    bin_type: string;
    serial_number: string;
    deployment_date: string;
    customer_id: string;
  };

  const cfg = statusConfig[b.status] ?? { label: b.status, variant: "neutral" as const };

  const compartmentLabels: Record<string, string[]> = {
    one: ["Recyclable"],
    two: ["Recyclable", "Non-Recyclable"],
    three: ["Recyclable", "Non-Recyclable", "Food Waste"],
    four: ["Plastic", "General", "Paper", "Metal"],
  };

  function resolvedCompartments() {
    if (compartments.length > 0) return compartments;
    const labels = compartmentLabels[b.bin_type ?? "two"] ?? compartmentLabels.two;
    return labels.map((label, i) => ({
      id: `pending-${i}`,
      label,
      compartment_index: i,
      current_fill_level: 0,
      current_weight_kg: 0,
      waste_count: 0,
      classification: {},
    }));
  }

  const displayCompartments = resolvedCompartments();

  useEffect(() => {
    const channel = supabase
      .channel(`bin-${bin.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "bins", filter: `id=eq.${bin.id}` }, async () => {
        const { data } = await supabase.from("bins").select("*").eq("id", bin.id as string).single();
        if (data) setBinState(data);
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "telemetry_events", filter: `bin_id=eq.${bin.id}` }, async () => {
        const { data: t } = await supabase
          .from("telemetry_events")
          .select("recorded_at, fill_level, weight_kg, battery_percent")
          .eq("bin_id", bin.id as string)
          .order("recorded_at", { ascending: false })
          .limit(48);
        if (t) setTelemetry(t.reverse());
        const { data: c } = await supabase.from("bin_compartments").select("*").eq("bin_id", bin.id as string).order("compartment_index");
        if (c) setCompartments(c);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [supabase, bin.id]);

  const chartData = telemetry.map((t) => ({
    time: new Date(t.recorded_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    fill: t.fill_level,
    weight: t.weight_kg,
  }));

  const fillColor = b.latest_fill_level >= 85 ? "text-red-500" : b.latest_fill_level >= 60 ? "text-amber-500" : "text-emerald-500";
  const batteryColor = b.latest_battery <= 20 ? "text-red-500" : b.latest_battery <= 50 ? "text-amber-500" : "text-emerald-500";

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Link href="/bins" className="hover:text-foreground transition-colors">Bins</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground font-medium">{b.device_id}</span>
      </div>

      {/* Hero Section */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <Trash2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-mono">{b.device_id}</h1>
              <Badge variant={cfg.variant}>{cfg.label}</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {b.location_name ?? "No location set"}
              {b.latitude != null && b.longitude != null && (
                <span className="ml-2 text-xs font-mono">
                  ({b.latitude.toFixed(4)}, {b.longitude.toFixed(4)})
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canManageBins(role) && (
            <>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/bins/${bin.id}/edit`}>
                  <Pencil className="h-4 w-4 mr-1.5" />
                  Edit
                </Link>
              </Button>
              <DeleteButton
                id={b.id}
                path="bins"
                description={`Permanently delete bin ${b.device_id} and all its compartments, telemetry history, and alerts. This cannot be undone.`}
              />
            </>
          )}
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        <Card variant="glass">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Fill Level</p>
            <div className="mt-1 flex items-end gap-2">
              <span className={cn("text-2xl font-semibold tracking-tight", fillColor)}>
                {formatPercent(b.latest_fill_level)}
              </span>
              <div className={cn("flex-1 h-1.5 rounded-full bg-muted max-w-[80px]")}>
                <div
                  className={cn("h-full rounded-full transition-all", b.latest_fill_level >= 85 ? "bg-red-500" : b.latest_fill_level >= 60 ? "bg-amber-500" : "bg-emerald-500")}
                  style={{ width: `${Math.min(b.latest_fill_level ?? 0, 100)}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Battery</p>
            <div className="mt-1 flex items-center gap-2">
              <Battery className={cn("h-5 w-5", batteryColor)} />
              <span className={cn("text-2xl font-semibold tracking-tight", batteryColor)}>
                {formatPercent(b.latest_battery)}
              </span>
            </div>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Last Seen</p>
            <div className="mt-1 flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold">
                {b.last_seen_at ? formatRelativeTime(b.last_seen_at) : "Never"}
              </span>
            </div>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Type</p>
            <div className="mt-1 flex items-center gap-2">
              <Layers className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold">{b.bin_type === "one" ? "1-bin" : b.bin_type === "two" ? "2-bin" : b.bin_type === "three" ? "3-bin" : "4-bin"}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fill Level History + Health Monitoring */}
      <div className="grid gap-6 xl:grid-cols-3">
        <Card variant="glass" className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Fill Level History</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="fillGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6C2BD9" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#6C2BD9" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                  <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" unit="%" axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: "var(--radius)", border: "1px solid hsl(var(--border))", fontSize: "12px" }}
                  />
                  <Area type="monotone" dataKey="fill" stroke="#6C2BD9" strokeWidth={2} fill="url(#fillGradient)" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState icon={BarChart3} title="No telemetry data" description="Waiting for the bin to send data" className="py-12" />
            )}
          </CardContent>
        </Card>

        <Card variant="glass">
          <CardHeader>
            <CardTitle>Health Monitoring</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <MetricBadge icon={Camera} label="Camera" value={b.camera_status} status={b.camera_status ?? undefined} />
            <MetricBadge icon={Activity} label="Sensors" value={b.sensor_health} status={b.sensor_health ?? undefined} />
            <MetricBadge icon={Wifi} label="Internet" value={b.internet_status} status={b.internet_status ?? undefined} />
            <MetricBadge icon={Battery} label="Battery" value={formatPercent(b.latest_battery)} />
          </CardContent>
        </Card>
      </div>

      {/* Compartment Pie Chart + Breakdown */}
      <BinCompartmentPieChart
        compartments={displayCompartments.map((c) => ({ id: c.id, label: c.label, currentFillLevel: c.current_fill_level, compartmentIndex: c.compartment_index, wasteCount: c.waste_count }))}
        binName={b.device_id}
      />

      {/* Waste Count */}
      {displayCompartments.length > 0 && (
        <Card variant="glass">
          <CardHeader>
            <CardTitle>Waste Count</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {displayCompartments.map((c) => {
                const fill = c.current_fill_level;
                return (
                  <div key={c.id} className="flex items-center gap-3 rounded-lg border p-3">
                    <div className={cn("h-2.5 w-2.5 rounded-full shrink-0", fill >= 85 ? "bg-red-500" : fill >= 60 ? "bg-amber-500" : "bg-primary")} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground truncate">{c.label}</p>
                      <p className="text-lg font-bold">{c.waste_count}</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground">items</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Camera Snapshot */}
      {b.snapshot_url && (
        <Card variant="glass">
          <CardHeader>
            <CardTitle>Camera Snapshot</CardTitle>
          </CardHeader>
          <CardContent>
            <img src={b.snapshot_url} alt="Bin snapshot" loading="lazy" className="rounded-lg max-h-80 object-cover shadow-sm" />
          </CardContent>
        </Card>
      )}

      {/* Device Info */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle>Device Info</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-4 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Device ID</dt>
              <dd className="font-mono font-medium mt-0.5">{b.device_id}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Serial Number</dt>
              <dd className="font-mono text-sm mt-0.5">{b.serial_number ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Status</dt>
              <dd className="mt-0.5"><Badge variant={cfg.variant} className="text-[10px]">{cfg.label}</Badge></dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Deployed</dt>
              <dd className="mt-0.5">{b.deployment_date ? formatDate(b.deployment_date) : "—"}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Credentials (admin only) */}
      {canManageBins(role) && (
        <BinCredentials binId={b.id} />
      )}
    </div>
  );
}
