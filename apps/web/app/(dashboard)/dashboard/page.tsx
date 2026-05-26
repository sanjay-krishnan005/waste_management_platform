import { createClient } from "@/lib/supabase/server";
import { RealtimeDashboard } from "@/components/dashboard/realtime-dashboard";
import type { BinMapMarker } from "@/components/maps/bin-map";

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: bins } = await supabase
    .from("bins")
    .select("id, device_id, latitude, longitude, status, latest_fill_level, location_name, customers(name)");

  const fullBins = bins?.filter((b) => (b.latest_fill_level ?? 0) >= 85).length ?? 0;
  const offlineBins = (bins?.filter((b) => b.status === "offline" || b.status === "unregistered").length ?? 0);

  const { count: authenticatedBins } = await supabase
    .from("bins")
    .select("*", { count: "exact", head: true })
    .not("api_key", "is", null);

  const { count: alertCount } = await supabase
    .from("alerts")
    .select("*", { count: "exact", head: true })
    .is("resolved_at", null);

  const { data: alerts } = await supabase
    .from("alerts")
    .select("id, alert_type, severity, message, created_at, bins(device_id)")
    .is("resolved_at", null)
    .order("created_at", { ascending: false })
    .limit(5);

  const { data: activity } = await supabase
    .from("activity_log")
    .select("id, action, details, created_at, bins(device_id)")
    .order("created_at", { ascending: false })
    .limit(8);

  const markers = (bins ?? []).map((b) => ({
    id: b.id,
    device_id: b.device_id,
    latitude: b.latitude,
    longitude: b.longitude,
    status: b.status,
    latest_fill_level: b.latest_fill_level,
    location_name: b.location_name,
    customer_name: ((b.customers as unknown) as { name: string } | null)?.name ?? null,
  })) as BinMapMarker[];

  const binsByCustomer: { name: string; bins: string[] }[] = [];
  const customerMap = new Map<string, string[]>();
  for (const b of bins ?? []) {
    const name = ((b.customers as unknown) as { name: string } | null)?.name ?? "Unassigned";
    const list = customerMap.get(name) ?? [];
    list.push(b.device_id);
    customerMap.set(name, list);
  }
  for (const [name, binList] of Array.from(customerMap)) {
    binsByCustomer.push({ name, bins: binList });
  }

  return (
    <RealtimeDashboard
      initialBins={markers}
      initialKpis={{
        totalBins: bins?.length ?? 0,
        fullBins,
        activeAlerts: alertCount ?? 0,
        offlineBins,
        authenticatedBins: authenticatedBins ?? 0,
      }}
      initialAlerts={alerts ?? []}
      initialActivity={activity ?? []}
      initialBinsByCustomer={binsByCustomer}
    />
  );
}
