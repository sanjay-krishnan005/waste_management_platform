import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth/get-profile";
import { redirect } from "next/navigation";
import { CustomerBinsView } from "@/components/portal/customer-bins-view";

export default async function PortalBinsPage() {
  const profile = await getProfile();
  if (!profile || profile.role !== "customer") redirect("/dashboard");

  const supabase = await createClient();

  const { data: bins } = await supabase
    .from("bins")
    .select("id, device_id, status, latest_fill_level, location_name, bin_type, last_seen_at")
    .eq("customer_id", profile.customer_id)
    .order("device_id");

  const { data: allCompartments } = await supabase
    .from("bin_compartments")
    .select("bin_id, label, current_fill_level, compartment_index, current_weight_kg, waste_count");

  const compartmentsByBin: Record<string, { label: string; current_fill_level: number; compartment_index: number; current_weight_kg: number; waste_count: number }[]> = {};
  for (const c of allCompartments ?? []) {
    if (!compartmentsByBin[c.bin_id]) compartmentsByBin[c.bin_id] = [];
    compartmentsByBin[c.bin_id].push(c);
  }

  const expectedLabels: Record<string, string[]> = {
    two: ["Recyclables", "General Waste"],
    four: ["Plastic", "Paper", "Metal/Glass", "Organic"],
  };

  return (
    <CustomerBinsView
      bins={bins ?? []}
      compartmentsByBin={compartmentsByBin}
      expectedLabels={expectedLabels}
    />
  );
}
