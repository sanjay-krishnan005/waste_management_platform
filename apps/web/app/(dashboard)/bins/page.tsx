import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth/get-profile";
import { canManageBins } from "@/lib/auth/rbac";
import { BinListClient } from "@/components/bins/bin-list-client";

export default async function BinsPage() {
  const supabase = await createClient();
  const profile = await getProfile();

  const { data: bins } = await supabase
    .from("bins")
    .select("id, device_id, status, serial_number, bin_type, location_name, last_seen_at, latest_fill_level, customers(name)")
    .order("device_id");

  const { data: authenticated } = await supabase
    .from("bins")
    .select("id")
    .not("api_key", "is", null);

  const authenticatedIds = new Set(authenticated?.map((b) => b.id) ?? []);

  const { data: allCompartments } = await supabase
    .from("bin_compartments")
    .select("bin_id, label, current_fill_level, compartment_index, current_weight_kg, waste_count");

  const compartmentsByBin: Record<string, { label: string; current_fill_level: number; compartment_index: number; current_weight_kg: number; waste_count: number }[]> = {};
  for (const c of allCompartments ?? []) {
    if (!compartmentsByBin[c.bin_id]) compartmentsByBin[c.bin_id] = [];
    compartmentsByBin[c.bin_id].push(c);
  }

  return (
    <BinListClient
      bins={bins ?? []}
      compartmentsByBin={compartmentsByBin}
      authenticatedIds={authenticatedIds}
      canManage={canManageBins(profile?.role)}
    />
  );
}
