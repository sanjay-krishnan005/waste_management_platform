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
  if (status === "offline" || status === "unregistered") return "#ef4444";
  if ((fill ?? 0) >= 85) return "#f59e0b";
  if (status === "maintenance") return "#8b5cf6";
  return "#22c55e";
}

function radiusByFill(fill: number | null) {
  const f = fill ?? 0;
  if (f >= 85) return 12;
  if (f >= 60) return 10;
  return 8;
}

function MapInvalidateSize() {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 200);
    return () => clearTimeout(t);
  }, [map]);
  return null;
}

function MapBounds({ markers }: { markers: BinMapMarker[] }) {
  const map = useMap();
  useEffect(() => {
    if (markers.length === 0) return;
    const valid = markers.filter((m) => m.latitude != null && m.longitude != null);
    if (valid.length === 0) return;
    const bounds = valid.map((m) => [m.latitude, m.longitude] as [number, number]);
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
  }, [map, markers]);
  return null;
}

export default function BinMapInner({ markers }: { markers: BinMapMarker[] }) {
  const valid = markers.filter(
    (m) => m.latitude != null && m.longitude != null && !Number.isNaN(m.latitude)
  );
  const center: [number, number] =
    valid.length > 0 ? [valid[0].latitude, valid[0].longitude] : defaultCenter;

  return (
    <MapShell className="h-[420px] w-full">
      <MapContainer
        center={center}
        zoom={valid.length > 1 ? 13 : 14}
        className="h-full w-full"
        scrollWheelZoom
        zoomControl={false}
      >
        <MapInvalidateSize />
        {valid.length > 1 && <MapBounds markers={valid} />}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {valid.map((bin) => {
          const color = statusColor(bin.status, bin.latest_fill_level);
          const r = radiusByFill(bin.latest_fill_level);
          return (
            <CircleMarker
              key={bin.id}
              center={[bin.latitude, bin.longitude]}
              radius={r}
              pathOptions={{
                color: color,
                fillColor: color,
                fillOpacity: 0.7,
                weight: 2,
              }}
            >
              <Popup>
                <div className="text-xs space-y-1 font-sans min-w-[140px]">
                  <p className="font-semibold text-sm">{bin.device_id}</p>
                  {bin.location_name && (
                    <p className="text-muted-foreground">{bin.location_name}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-muted-foreground">Fill:</span>
                    <span className="font-medium">{bin.latest_fill_level ?? 0}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Status:</span>
                    <span className="capitalize">{bin.status}</span>
                  </div>
                  {bin.customer_name && (
                    <p className="text-muted-foreground text-[10px]">{bin.customer_name}</p>
                  )}
                  <Link
                    href={`/bins/${bin.id}`}
                    className="inline-flex items-center text-primary text-[10px] font-medium hover:underline mt-1"
                  >
                    View details →
                  </Link>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
      {valid.length === 0 && (
        <p className="absolute bottom-3 left-3 right-3 rounded-lg bg-background/90 backdrop-blur-sm border px-3 py-2 text-xs text-muted-foreground text-center">
          No bins with GPS coordinates yet. Set location when adding a bin.
        </p>
      )}
    </MapShell>
  );
}
