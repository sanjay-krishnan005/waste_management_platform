import { getProfile } from "@/lib/auth/get-profile";
import { redirect } from "next/navigation";
import { canManageBins } from "@/lib/auth/rbac";
import { CustomerForm } from "@/components/customers/customer-form";

export default async function NewCustomerPage() {
  const profile = await getProfile();
  if (!profile || !canManageBins(profile.role)) redirect("/dashboard");
  if (!profile.organization_id) redirect("/dashboard");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Add customer</h1>
        <p className="text-muted-foreground">Create a client to assign bins to</p>
      </div>
      <CustomerForm organizationId={profile.organization_id} />
    </div>
  );
}
