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

  const { data: bin } = await service
    .from("bins")
    .select("organization_id, device_id")
    .eq("id", id)
    .single();
  if (!bin) {
    return NextResponse.json({ error: "Bin not found" }, { status: 404 });
  }

  await service.from("activity_log").insert({
    organization_id: bin.organization_id,
    user_id: user.id,
    action: "bin_deleted",
    details: { device_id: bin.device_id },
  });

  const { error } = await service.from("bins").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ success: true });
}
