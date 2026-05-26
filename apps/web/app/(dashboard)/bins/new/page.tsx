import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth/get-profile";
import { canManageBins } from "@/lib/auth/rbac";
import { redirect } from "next/navigation";
import { BinForm } from "@/components/bins/bin-form";

export default async function NewBinPage() {
  const profile = await getProfile();
  if (!profile || !canManageBins(profile.role)) {
    redirect("/bins");
  }

  const supabase = await createClient();
  const { data: customers } = await supabase
    .from("customers")
    .select("id, name")
    .order("name");

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold">Add bin</h1>
        <p className="text-muted-foreground">Register a new smart waste bin</p>
      </div>
      <BinForm customers={customers ?? []} organizationId={profile.organization_id!} />
    </div>
  );
}
