import { createClient } from "@/lib/supabase/server";
import type { Profile } from "./rbac";

export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, organization_id, customer_id, fcm_token")
    .eq("id", user.id)
    .maybeSingle();

  return data as Profile | null;
}
