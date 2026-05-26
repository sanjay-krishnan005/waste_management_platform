import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: admin } = await supabase
    .from("profiles")
    .select("role, organization_id")
    .eq("id", user.id)
    .single();
  if (!admin || admin.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await request.json();
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const service = await createServiceClient();

  const { data: customer } = await service
    .from("customers")
    .select("id, name, email, organization_id")
    .eq("id", id)
    .single();
  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  const { data: profiles } = await service
    .from("profiles")
    .select("id")
    .eq("customer_id", id);

  for (const p of profiles ?? []) {
    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users/${p.id}`,
        { method: "DELETE", headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}` } }
      );
    } catch {}
    try { await service.from("profiles").delete().eq("id", p.id); } catch {}
  }

  const { error } = await service.from("customers").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await service.from("activity_log").insert({
    organization_id: customer.organization_id,
    user_id: user.id,
    action: "customer_deleted",
    details: { customer_id: id, name: customer.name, email: customer.email },
  });

  return NextResponse.json({ success: true });
}
