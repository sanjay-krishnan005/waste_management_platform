"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import dynamic from "next/dynamic";
import QRCode from "qrcode";

const LocationPicker = dynamic(() => import("./location-picker"), { ssr: false });

const COMPARTMENT_LABELS: Record<string, string[]> = {
  one: ["Recyclable"],
  two: ["Recyclable", "Non-Recyclable"],
  three: ["Recyclable", "Non-Recyclable", "Food Waste"],
  four: ["Plastic", "General", "Paper", "Metal"],
};

const UNASSIGNED_CUSTOMER = "__unassigned__";

export function BinForm({
  customers,
  organizationId,
  initial,
}: {
  customers: { id: string; name: string }[];
  organizationId: string;
  initial?: Record<string, unknown>;
}) {
  const router = useRouter();
  const isEdit = Boolean(initial?.id);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [binType, setBinType] = useState<"one" | "two" | "three" | "four">((initial?.bin_type as "one" | "two" | "three" | "four") ?? "two");
  const [lat, setLat] = useState((initial?.latitude as number) ?? 27.4728);
  const [lng, setLng] = useState((initial?.longitude as number) ?? 89.639);
  const [deviceId, setDeviceId] = useState((initial?.device_id as string) ?? "");
  const [serialNumber, setSerialNumber] = useState((initial?.serial_number as string) ?? "");
  const [locationName, setLocationName] = useState((initial?.location_name as string) ?? "");
  const [customerId, setCustomerId] = useState<string>((initial?.customer_id as string) ?? UNASSIGNED_CUSTOMER);
  const [deploymentDate, setDeploymentDate] = useState(
    ((initial?.deployment_date as string) ?? new Date().toISOString().split("T")[0])
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();

    const payload = {
      customer_id: customerId === UNASSIGNED_CUSTOMER ? null : customerId,
      device_id: deviceId,
      serial_number: serialNumber,
      bin_type: binType,
      latitude: lat,
      longitude: lng,
      location_name: locationName,
      deployment_date: deploymentDate,
    };

    if (isEdit) {
      const { error: updateError } = await supabase.from("bins").update(payload).eq("id", initial!.id as string);
      if (updateError) {
        setError(updateError.message);
        setLoading(false);
        return;
      }

      await supabase.from("bin_compartments").delete().eq("bin_id", initial!.id as string);
      const labels = COMPARTMENT_LABELS[binType];
      await supabase.from("bin_compartments").insert(
        labels.map((label, index) => ({
          bin_id: initial!.id as string,
          compartment_index: index,
          label,
        }))
      );

      await supabase.from("activity_log").insert({
        organization_id: organizationId,
        bin_id: initial!.id as string,
        action: "bin_updated",
        details: { device_id: deviceId, bin_type: binType },
      });
      router.push(`/bins/${initial!.id}`);
      router.refresh();
      return;
    }

    const qrDataUrl = await QRCode.toDataURL(deviceId, { width: 256 });

    const { data: bin, error: insertError } = await supabase
      .from("bins")
      .insert({
        ...payload,
        organization_id: organizationId,
        qr_code: deviceId,
        qr_code_url: qrDataUrl,
        status: "unregistered",
      })
      .select("id")
      .single();

    if (insertError || !bin) {
      setError(insertError?.message ?? "Failed to create bin");
      setLoading(false);
      return;
    }

    const labels = COMPARTMENT_LABELS[binType];
    await supabase.from("bin_compartments").insert(
      labels.map((label, index) => ({
        bin_id: bin.id,
        compartment_index: index,
        label,
      }))
    );

    await supabase.from("activity_log").insert({
      organization_id: organizationId,
      bin_id: bin.id,
      action: "bin_created",
      details: { device_id: deviceId },
    });

    router.push(`/bins/${bin.id}`);
    router.refresh();
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Device ID</Label>
              <Input value={deviceId} onChange={(e) => setDeviceId(e.target.value)} required placeholder="SRTX-007" />
            </div>
            <div className="space-y-2">
              <Label>Serial number</Label>
              <Input value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Bin type</Label>
              <Select value={binType} onValueChange={(v) => setBinType(v as "one" | "two" | "three" | "four")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="one">1-bin (Recyclable)</SelectItem>
                  <SelectItem value="two">2-bin</SelectItem>
                  <SelectItem value="three">3-bin</SelectItem>
                  <SelectItem value="four">4-bin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Customer</Label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UNASSIGNED_CUSTOMER}>Unassigned</SelectItem>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Location name</Label>
            <Input value={locationName} onChange={(e) => setLocationName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Deployment date</Label>
            <Input type="date" value={deploymentDate} onChange={(e) => setDeploymentDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>GPS location</Label>
            <p className="text-xs text-muted-foreground">
              Click the map to place the pin. Coordinates are saved when you create the bin.
            </p>
            <LocationPicker lat={lat} lng={lng} onChange={(la, ln) => { setLat(la); setLng(ln); }} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={loading}>{loading ? "Saving..." : isEdit ? "Save changes" : "Create bin"}</Button>
        </form>
      </CardContent>
    </Card>
  );
}
