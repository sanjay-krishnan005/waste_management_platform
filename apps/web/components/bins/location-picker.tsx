"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "@/lib/leaflet-setup";
import { MapShell } from "@/components/maps/map-shell";

function LocationMarker({
  lat,
  lng,
  onChange,
}: {
  lat: number;
  lng: number;
  onChange: (lat: number, lng: number) => void;
}) {
  const [position, setPosition] = useState<[number, number]>([lat, lng]);

  useEffect(() => {
    setPosition([lat, lng]);
  }, [lat, lng]);

  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
      onChange(e.latlng.lat, e.latlng.lng);
    },
  });

  return <Marker position={position} />;
}

export default function LocationPicker({
  lat,
  lng,
  onChange,
}: {
  lat: number;
  lng: number;
  onChange: (lat: number, lng: number) => void;
}) {
  return (
    <div className="space-y-2">
      <MapShell className="h-64 w-full">
        <MapContainer
          center={[lat, lng]}
          zoom={15}
          className="h-full w-full rounded-md border"
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LocationMarker lat={lat} lng={lng} onChange={onChange} />
        </MapContainer>
      </MapShell>
      <p className="text-xs text-muted-foreground">
        Click the map to set GPS · Current: {lat.toFixed(5)}, {lng.toFixed(5)}
      </p>
    </div>
  );
}
