import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth/get-profile";
import { notFound } from "next/navigation";
import { BinDetailView } from "@/components/bins/bin-detail-view";

export default async function BinDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const profile = await getProfile();

  const { data: bin } = await supabase.from("bins").select("*").eq("id", params.id).single();
  if (!bin) notFound();

  const { data: compartments } = await supabase
    .from("bin_compartments")
    .select("*")
    .eq("bin_id", params.id)
    .order("compartment_index");

  const { data: telemetry } = await supabase
    .from("telemetry_events")
    .select("recorded_at, fill_level, weight_kg, battery_percent")
    .eq("bin_id", params.id)
    .order("recorded_at", { ascending: false })
    .limit(48);

  return (
    <BinDetailView
      bin={bin}
      compartments={compartments ?? []}
      telemetry={(telemetry ?? []).reverse()}
      role={profile?.role}
    />
  );
}
