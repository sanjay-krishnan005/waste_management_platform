import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth/get-profile";
import { redirect, notFound } from "next/navigation";
import { canManageBins } from "@/lib/auth/rbac";
import { CustomerForm } from "@/components/customers/customer-form";

export default async function EditCustomerPage({ params }: { params: { id: string } }) {
  const profile = await getProfile();
  if (!profile || !canManageBins(profile.role)) redirect("/dashboard");
  if (!profile.organization_id) redirect("/dashboard");

  const supabase = await createClient();
  const { data: customer } = await supabase
    .from("customers")
    .select("id, name, email, phone, address")
    .eq("id", params.id)
    .single();

  if (!customer) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Edit customer</h1>
        <p className="text-muted-foreground">{customer.name}</p>
      </div>
      <CustomerForm
        organizationId={profile.organization_id}
        initial={customer}
      />
    </div>
  );
}
