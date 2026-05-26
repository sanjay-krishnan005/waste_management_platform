import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import Papa from "papaparse";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { subDays, subWeeks, subMonths, format } from "date-fns";

function getDateRange(period: string) {
  const end = new Date();
  let start: Date;
  switch (period) {
    case "daily":
      start = subDays(end, 1);
      break;
    case "monthly":
      start = subMonths(end, 1);
      break;
    default:
      start = subWeeks(end, 1);
  }
  return { start, end };
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const period = request.nextUrl.searchParams.get("period") ?? "weekly";
  const formatType = request.nextUrl.searchParams.get("format") ?? "csv";
  const { start, end } = getDateRange(period);

  const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", user.id).single();
  if (!profile?.organization_id) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const service = await createServiceClient();
  const { data: bins } = await service
    .from("bins")
    .select("id, device_id, status, latest_fill_level, location_name")
    .eq("organization_id", profile.organization_id);

  const { data: telemetry } = await service
    .from("telemetry_events")
    .select("bin_id, recorded_at, fill_level, weight_kg")
    .eq("organization_id", profile.organization_id)
    .gte("recorded_at", start.toISOString())
    .lte("recorded_at", end.toISOString());

  const { data: alerts } = await service
    .from("alerts")
    .select("alert_type, severity, created_at, bins(device_id)")
    .eq("organization_id", profile.organization_id)
    .gte("created_at", start.toISOString());

  const rows = (bins ?? []).map((b) => {
    const binTelemetry = telemetry?.filter((t) => t.bin_id === b.id) ?? [];
    const avgFill =
      binTelemetry.length > 0
        ? binTelemetry.reduce((s, t) => s + (t.fill_level ?? 0), 0) / binTelemetry.length
        : b.latest_fill_level ?? 0;
    return {
      device_id: b.device_id,
      location: b.location_name ?? "",
      status: b.status,
      avg_fill_percent: Math.round(avgFill),
      telemetry_points: binTelemetry.length,
    };
  });

  await service.from("reports").insert({
    organization_id: profile.organization_id,
    created_by: user.id,
    period: period as "daily" | "weekly" | "monthly",
    format: formatType as "csv" | "pdf",
    start_date: format(start, "yyyy-MM-dd"),
    end_date: format(end, "yyyy-MM-dd"),
    metadata: { bin_count: rows.length, alert_count: alerts?.length ?? 0 },
  });

  if (formatType === "pdf") {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Sortyx Intelligence Platform", 14, 20);
    doc.setFontSize(12);
    doc.text(`${period} report: ${format(start, "yyyy-MM-dd")} — ${format(end, "yyyy-MM-dd")}`, 14, 30);
    autoTable(doc, {
      startY: 40,
      head: [["Device", "Location", "Status", "Avg Fill %", "Data Points"]],
      body: rows.map((r) => [r.device_id, r.location, r.status, String(r.avg_fill_percent), String(r.telemetry_points)]),
    });
    doc.text(`Total alerts: ${alerts?.length ?? 0}`, 14, (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10);
    const pdfBuffer = doc.output("arraybuffer");
    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="sortyx-${period}.pdf"`,
      },
    });
  }

  const csv = Papa.unparse(rows);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="sortyx-${period}.csv"`,
    },
  });
}
