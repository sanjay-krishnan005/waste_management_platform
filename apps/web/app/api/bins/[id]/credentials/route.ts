import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { randomBytes } from "crypto";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: admin } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!admin || admin.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const service = await createServiceClient();

  const { data: bin } = await service
    .from("bins")
    .select("api_key, mqtt_username, mqtt_password, credentials_updated_at")
    .eq("id", params.id)
    .single();

  if (!bin || !bin.api_key) {
    return NextResponse.json({ hasCredentials: false });
  }

  return NextResponse.json({
    hasCredentials: true,
    apiKey: bin.api_key,
    mqttUsername: bin.mqtt_username,
    mqttPassword: bin.mqtt_password,
    updatedAt: bin.credentials_updated_at,
  });
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
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

  const service = await createServiceClient();

  const { data: bin } = await service
    .from("bins")
    .select("id, device_id, organization_id, api_key")
    .eq("id", params.id)
    .single();
  if (!bin) {
    return NextResponse.json({ error: "Bin not found" }, { status: 404 });
  }

  const apiKey = `srtx_${randomBytes(24).toString("hex")}`;
  const mqttUsername = bin.device_id;
  const mqttPassword = randomBytes(16).toString("hex");

  const { error } = await service
    .from("bins")
    .update({
      api_key: apiKey,
      mqtt_username: mqttUsername,
      mqtt_password: mqttPassword,
      credentials_updated_at: new Date().toISOString(),
    })
    .eq("id", params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await service.from("activity_log").insert({
    organization_id: bin.organization_id,
    user_id: user.id,
    bin_id: bin.id,
    action: "bin_credentials_generated",
    details: { device_id: bin.device_id },
  });

  return NextResponse.json({ apiKey, mqttUsername, mqttPassword });
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: admin } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!admin || admin.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const service = await createServiceClient();

  const { data: bin } = await service
    .from("bins")
    .select("id, device_id, organization_id")
    .eq("id", params.id)
    .single();
  if (!bin) {
    return NextResponse.json({ error: "Bin not found" }, { status: 404 });
  }

  const { error } = await service
    .from("bins")
    .update({
      api_key: null,
      mqtt_username: null,
      mqtt_password: null,
      credentials_updated_at: new Date().toISOString(),
    })
    .eq("id", params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await service.from("activity_log").insert({
    organization_id: bin.organization_id,
    user_id: user.id,
    bin_id: bin.id,
    action: "bin_credentials_revoked",
    details: { device_id: bin.device_id },
  });

  return NextResponse.json({ success: true });
}
