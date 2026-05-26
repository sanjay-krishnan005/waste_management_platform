import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth/get-profile";
import { redirect } from "next/navigation";
import { CustomerDashboard } from "@/components/portal/customer-dashboard";

export default async function PortalPage() {
  const profile = await getProfile();
  if (!profile || profile.role !== "customer") redirect("/dashboard");

  const supabase = await createClient();

  const { data: bins } = await supabase
    .from("bins")
    .select("id, device_id, latitude, longitude, status, latest_fill_level, latest_battery, location_name, bin_type, last_seen_at")
    .eq("customer_id", profile.customer_id)
    .order("device_id");

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
    .limit(10);

  const fullBins = bins?.filter((b) => (b.latest_fill_level ?? 0) >= 85).length ?? 0;
  const offlineBins = bins?.filter((b) => b.status === "offline" || b.status === "unregistered").length ?? 0;

  return (
    <CustomerDashboard
      profile={profile}
      bins={bins ?? []}
      alerts={alerts ?? []}
      activity={activity ?? []}
      alertCount={alertCount ?? 0}
      fullBins={fullBins}
      offlineBins={offlineBins}
    />
  );
}
