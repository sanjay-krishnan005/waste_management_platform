"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Popup, CircleMarker, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "@/lib/leaflet-setup";
import Link from "next/link";
import type { BinMapMarker } from "./bin-map";
import { MapShell } from "./map-shell";

const defaultCenter: [number, number] = [27.4728, 89.6390];

function statusColor(status: string, fill: number | null) {
  if (status === "offline") return "#ef4444";
  if ((fill ?? 0) >= 90) return "#f59e0b";
  if (status === "maintenance") return "#8b5cf6";
  if (status === "unregistered") return "#9ca3af";
  return "#22c55e";
}

function MapInvalidateSize() {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 200);
    return () => clearTimeout(t);
  }, [map]);
  return null;
}

export default function BinMapInner({ markers }: { markers: BinMapMarker[] }) {
  const valid = markers.filter(
    (m) => m.latitude != null && m.longitude != null && !Number.isNaN(m.latitude)
  );
  const center: [number, number] =
    valid.length > 0 ? [valid[0].latitude, valid[0].longitude] : defaultCenter;

  return (
    <MapShell className="h-[400px] w-full">
      <MapContainer
        center={center}
        zoom={valid.length > 0 ? 14 : 12}
        className="h-full w-full rounded-lg border"
        scrollWheelZoom
      >
        <MapInvalidateSize />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {valid.map((bin) => (
          <CircleMarker
            key={bin.id}
            center={[bin.latitude, bin.longitude]}
            radius={10}
            pathOptions={{
              color: statusColor(bin.status, bin.latest_fill_level),
              fillColor: statusColor(bin.status, bin.latest_fill_level),
              fillOpacity: 0.8,
            }}
          >
            <Popup>
              <div className="text-sm">
                <p className="font-semibold">{bin.device_id}</p>
                <p>{bin.location_name ?? "Unknown location"}</p>
                <p>Customer: {bin.customer_name ?? "Unassigned"}</p>
                <p>Fill: {bin.latest_fill_level ?? 0}%</p>
                <p>Status: {bin.status}</p>
                <Link href={`/bins/${bin.id}`} className="text-sortyx underline">
                  View details
                </Link>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
      {valid.length === 0 && (
        <p className="absolute bottom-2 left-2 right-2 rounded bg-background/90 border px-3 py-2 text-xs text-muted-foreground text-center">
          No bins with GPS yet. Set location on Add bin (click the map) or run seed data.
        </p>
      )}
    </MapShell>
  );
}
