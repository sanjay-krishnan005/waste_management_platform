import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth/get-profile";
import { redirect } from "next/navigation";
import { canManageBins } from "@/lib/auth/rbac";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DeleteButton } from "@/components/ui/delete-button";

export default async function CustomersPage() {
  const profile = await getProfile();
  if (!profile || !canManageBins(profile.role)) redirect("/dashboard");

  const supabase = await createClient();
  const { data: customers } = await supabase
    .from("customers")
    .select("id, name, email, phone, address, bins(device_id)")
    .order("name");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Customers</h1>
          <p className="text-muted-foreground">Manage clients who use your smart bins</p>
        </div>
        <Button asChild>
          <Link href="/admin/customers/new">
            <Plus className="mr-2 h-4 w-4" />
            Add customer
          </Link>
        </Button>
      </div>
      {(customers ?? []).length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No customers yet. Click Add customer to create one, then assign bins when adding or editing bins.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {(customers ?? []).map((c) => (
            <Card key={c.id}>
              <CardHeader className="flex flex-row items-start justify-between">
                <CardTitle>{c.name}</CardTitle>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/admin/customers/${c.id}/edit`}>
                      <Pencil className="h-4 w-4" />
                    </Link>
                  </Button>
                  <DeleteButton id={c.id} path="admin/customers" />
                </div>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                {c.email && <p>{c.email}</p>}
                {c.phone && <p>{c.phone}</p>}
                {c.address && <p className="text-muted-foreground">{c.address}</p>}
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    Assigned bins ({(c.bins as { device_id: string }[]).length}):
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {(c.bins as { device_id: string }[]).length === 0 ? (
                      <span className="text-xs text-muted-foreground">None</span>
                    ) : (
                      (c.bins as { device_id: string }[]).map((b) => (
                        <Badge key={b.device_id} variant="outline" className="text-xs">
                          <Trash2 className="mr-1 h-3 w-3" />
                          {b.device_id}
                        </Badge>
                      ))
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
