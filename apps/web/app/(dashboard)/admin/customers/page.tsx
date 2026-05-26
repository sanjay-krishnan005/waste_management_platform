import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth/get-profile";
import { redirect } from "next/navigation";
import { canManageBins } from "@/lib/auth/rbac";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DeleteButton } from "@/components/ui/delete-button";
import { Plus, Pencil, Trash2, Mail, Phone, MapPin } from "lucide-react";

export default async function CustomersPage() {
  const profile = await getProfile();
  if (!profile || !canManageBins(profile.role)) redirect("/dashboard");

  const supabase = await createClient();
  const { data: customers } = await supabase
    .from("customers")
    .select("id, name, email, phone, address, bins(device_id)")
    .order("name");

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1>Customers</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage clients who use your smart bins</p>
        </div>
        <Button asChild>
          <Link href="/admin/customers/new">
            <Plus className="mr-1.5 h-4 w-4" />
            Add customer
          </Link>
        </Button>
      </div>

      {(customers ?? []).length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
              <UsersIcon className="h-6 w-6 text-muted-foreground/60" />
            </div>
            <p className="text-sm font-medium">No customers yet</p>
            <p className="mt-1 text-xs text-muted-foreground">Click Add customer to create one, then assign bins when adding or editing bins.</p>
            <div className="mt-4">
              <Button asChild size="sm">
                <Link href="/admin/customers/new">
                  <Plus className="mr-1.5 h-4 w-4" />
                  Add customer
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(customers ?? []).map((c) => {
            const binList = c.bins as { device_id: string }[];
            return (
              <Card key={c.id} hover>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle>{c.name}</CardTitle>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon-sm" asChild>
                        <Link href={`/admin/customers/${c.id}/edit`}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                      <DeleteButton id={c.id} path="admin/customers" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="text-xs space-y-2">
                  {c.email && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-3.5 w-3.5" />
                      <span>{c.email}</span>
                    </div>
                  )}
                  {c.phone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-3.5 w-3.5" />
                      <span>{c.phone}</span>
                    </div>
                  )}
                  {c.address && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" />
                      <span className="truncate">{c.address}</span>
                    </div>
                  )}
                  <div className="pt-2 border-t">
                    <p className="text-[10px] text-muted-foreground mb-1.5">
                      Assigned bins ({binList.length}):
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {binList.length === 0 ? (
                        <span className="text-[10px] text-muted-foreground italic">None</span>
                      ) : (
                        binList.map((b) => (
                          <Badge key={b.device_id} variant="outline" className="text-[10px] font-mono">
                            <Trash2 className="mr-1 h-2.5 w-2.5" />
                            {b.device_id}
                          </Badge>
                        ))
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  );
}
