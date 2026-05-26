"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatPercent, formatDate } from "@/lib/utils";
import { Pencil, Activity, Camera, Battery, Wifi, Layers, KeyRound, BarChart3 } from "lucide-react";
import { BinCompartmentPieChart } from "./bin-compartment-pie-chart";
import { BinCredentials } from "./bin-credentials";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { cn } from "@/lib/utils";

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

function StatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    ok: "bg-green-500/10 text-green-600 border-green-200",
    online: "bg-green-500/10 text-green-600 border-green-200",
    warning: "bg-amber-500/10 text-amber-600 border-amber-200",
    error: "bg-red-500/10 text-red-600 border-red-200",
    offline: "bg-red-500/10 text-red-600 border-red-200",
  };
  return (
    <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", colorMap[status] ?? "bg-muted text-muted-foreground")}>
      {status}
    </Badge>
  );
}

function HealthCard({ icon: Icon, label, value, status }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string | null; status?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={cn("rounded-full p-2", status === "ok" || status === "online" ? "bg-green-500/10" : "bg-muted")}>
            <Icon className={cn("h-4 w-4", status === "ok" || status === "online" ? "text-green-600" : "text-muted-foreground")} />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <div className="flex items-center gap-2">
              <p className="font-semibold">{value ?? "No data"}</p>
              {status && <StatusBadge status={status} />}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
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
  const [activeTab, setActiveTab] = useState("overview");
  const supabase = createClient();

  const b = binState as {
    device_id: string;
    status: string;
    location_name: string;
    latest_fill_level: number;
    latest_battery: number;
    camera_status: string | null;
    sensor_health: string | null;
    internet_status: string | null;
    snapshot_url: string;
    last_seen_at: string;
    bin_type: string;
  };

  const compartmentLabels: Record<string, string[]> = {
    two: ["Recyclables", "General Waste"],
    four: ["Plastic", "Paper", "Metal/Glass", "Organic"],
  };

  function resolvedCompartments() {
    if (compartments.length > 0) return compartments;
    const labels = compartmentLabels[b.bin_type ?? "two"] ?? compartmentLabels.two;
    return labels.map((label, i) => ({
      id: `fallback-${i}`,
      label,
      compartment_index: i,
      current_fill_level: b.latest_fill_level ?? 0,
      current_weight_kg: 0,
      waste_count: 0,
      classification: {} as Record<string, number>,
    }));
  }

  const displayCompartments = resolvedCompartments();

  useEffect(() => {
    if (role === "customer" && activeTab === "credentials") {
      setActiveTab("overview");
    }
  }, [role, activeTab]);

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

  const fillColor = b.latest_fill_level >= 85 ? "text-red-500" : b.latest_fill_level >= 60 ? "text-amber-500" : "text-green-500";
  const batteryColor = b.latest_battery <= 20 ? "text-red-500" : b.latest_battery <= 50 ? "text-amber-500" : "text-green-500";

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1>{b.device_id}</h1>
            <Badge variant={b.status === "active" ? "default" : b.status === "unregistered" ? "secondary" : "destructive"}>
              {b.status === "unregistered" ? "not connected" : b.status}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1">{b.location_name ?? "No location set"}</p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/bins/${bin.id}/edit`}>
            <Pencil className="h-4 w-4 mr-1" />
            Edit
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Fill level</p>
              <p className={cn("text-2xl font-bold", fillColor)}>{formatPercent(b.latest_fill_level)}</p>
            </div>
            <div className="relative h-12 w-12">
              <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="3" className="text-muted" />
                <circle
                  cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="3"
                  strokeDasharray={`${(b.latest_fill_level / 100) * 94.2} 94.2`}
                  className={cn(fillColor.replace("text-", "text-").replace("500", "500"))}
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Battery</p>
              <p className={cn("text-2xl font-bold", batteryColor)}>{formatPercent(b.latest_battery)}</p>
            </div>
            <Battery className={cn("h-8 w-8", batteryColor)} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Last seen</p>
            <p className="text-sm font-semibold mt-0.5">{b.last_seen_at ? formatDate(b.last_seen_at) : "Never"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Type</p>
            <p className="text-sm font-semibold mt-0.5">{b.bin_type === "two" ? "2-bin" : "4-bin"}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="overview"><Activity className="h-4 w-4 mr-1.5" />Overview</TabsTrigger>
          <TabsTrigger value="telemetry"><BarChart3 className="h-4 w-4 mr-1.5" />Telemetry</TabsTrigger>
          <TabsTrigger value="compartments"><Layers className="h-4 w-4 mr-1.5" />Compartments</TabsTrigger>
          <TabsTrigger value="health"><Activity className="h-4 w-4 mr-1.5" />Health</TabsTrigger>
          {role !== "customer" && (
            <TabsTrigger value="credentials"><KeyRound className="h-4 w-4 mr-1.5" />Credentials</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Fill level history</CardTitle></CardHeader>
              <CardContent className="h-72">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="fillGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6C2BD9" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#6C2BD9" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" unit="%" />
                      <Tooltip contentStyle={{ borderRadius: "var(--radius)", border: "1px solid hsl(var(--border))" }} />
                      <Area type="monotone" dataKey="fill" stroke="#6C2BD9" strokeWidth={2} fill="url(#fillGradient)" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyState icon={BarChart3} title="No telemetry data" description="Waiting for the bin to send data" className="py-12" />
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Health monitoring</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <HealthCard icon={Camera} label="Camera" value={b.camera_status} status={b.camera_status ?? undefined} />
                <HealthCard icon={Activity} label="Sensors" value={b.sensor_health} status={b.sensor_health ?? undefined} />
                <HealthCard icon={Wifi} label="Internet" value={b.internet_status} status={b.internet_status ?? undefined} />
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader><CardTitle>Waste count</CardTitle></CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {displayCompartments.map((c) => (
                  <div key={c.id} className="flex items-center gap-3 rounded-lg border p-3">
                    <div className={cn("h-2 w-2 rounded-full", c.current_fill_level >= 85 ? "bg-red-500" : c.current_fill_level >= 60 ? "bg-amber-500" : "bg-sortyx")} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground truncate">{c.label}</p>
                      <p className="text-base font-bold">{c.waste_count}</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground">items</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <BinCompartmentPieChart
            compartments={displayCompartments.map((c) => ({ id: c.id, label: c.label, currentFillLevel: c.current_fill_level, compartmentIndex: c.compartment_index }))}
            binName={b.device_id}
          />
          {b.snapshot_url && (
            <Card>
              <CardHeader><CardTitle>Camera snapshot</CardTitle></CardHeader>
              <CardContent>
                <img src={b.snapshot_url} alt="Bin snapshot" className="rounded-lg max-h-80 object-cover shadow-[var(--shadow-card)]" />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="telemetry" className="mt-6">
          <Card>
            <CardHeader><CardTitle>Fill level history</CardTitle></CardHeader>
            <CardContent className="h-80">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="fillGradient2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6C2BD9" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#6C2BD9" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" unit="%" />
                    <Tooltip contentStyle={{ borderRadius: "var(--radius)", border: "1px solid hsl(var(--border))" }} />
                    <Area type="monotone" dataKey="fill" stroke="#6C2BD9" strokeWidth={2} fill="url(#fillGradient2)" dot={false} />
                    <Line type="monotone" dataKey="weight" stroke="#10b981" strokeWidth={1} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState icon={BarChart3} title="No telemetry data" description="Waiting for the bin to send data" className="py-12" />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compartments" className="mt-6 space-y-6">
          <BinCompartmentPieChart
            compartments={displayCompartments.map((c) => ({ id: c.id, label: c.label, currentFillLevel: c.current_fill_level, compartmentIndex: c.compartment_index }))}
            binName={b.device_id}
          />
          <Card>
            <CardHeader><CardTitle>Compartment breakdown</CardTitle></CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {displayCompartments.map((c) => {
                  const fill = c.current_fill_level;
                  const barColor = fill >= 85 ? "bg-red-500" : fill >= 60 ? "bg-amber-500" : "bg-sortyx";
                  return (
                    <Card key={c.id}>
                        <CardContent className="p-4 flex flex-col items-center text-center">
                          <p className="font-medium text-sm mb-3">{c.label}</p>
                          <div className="relative w-10 h-32 rounded-lg border-2 border-border bg-muted/30 overflow-hidden">
                            <div
                              className={cn("absolute bottom-0 left-0 right-0 transition-all duration-500 ease-out", barColor)}
                              style={{ height: `${fill}%` }}
                            >
                              <div className="absolute inset-x-0 top-0 h-2 bg-white/20 rounded-t-sm" />
                            </div>
                            <div className="absolute inset-x-0 top-1/4 h-px bg-border/50" />
                            <div className="absolute inset-x-0 top-2/4 h-px bg-border/50" />
                            <div className="absolute inset-x-0 top-3/4 h-px bg-border/50" />
                          </div>
                          <div className="mt-2 flex items-center gap-2 text-xs">
                            <span className="font-semibold">{formatPercent(fill)}</span>
                            <span className="text-muted-foreground">{c.current_weight_kg} kg</span>
                          </div>
                          <p className="text-xs text-muted-foreground">{c.waste_count} items</p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="health" className="mt-6">
          <div className="grid gap-4 md:grid-cols-3">
            <HealthCard icon={Camera} label="Camera status" value={b.camera_status ?? "No data"} status={b.camera_status ?? undefined} />
            <HealthCard icon={Activity} label="Sensor health" value={b.sensor_health ?? "No data"} status={b.sensor_health ?? undefined} />
            <HealthCard icon={Wifi} label="Internet connectivity" value={b.internet_status ?? "No data"} status={b.internet_status ?? undefined} />
          </div>
          <Card className="mt-6">
            <CardHeader><CardTitle>Device info</CardTitle></CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div><dt className="text-muted-foreground">Device ID</dt><dd className="font-mono font-medium">{b.device_id}</dd></div>
                <div><dt className="text-muted-foreground">Status</dt><dd className="capitalize">{b.status}</dd></div>
                <div><dt className="text-muted-foreground">Location</dt><dd>{b.location_name ?? "—"}</dd></div>
                <div><dt className="text-muted-foreground">Last seen</dt><dd>{b.last_seen_at ? formatDate(b.last_seen_at) : "—"}</dd></div>
              </dl>
            </CardContent>
          </Card>
        </TabsContent>

        {role !== "customer" && (
          <TabsContent value="credentials" className="mt-6">
            <BinCredentials binId={bin.id as string} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
