"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

export type BinMapMarker = {
  id: string;
  device_id: string;
  latitude: number;
  longitude: number;
  status: string;
  latest_fill_level: number | null;
  location_name: string | null;
  customer_name?: string | null;
};

const MapInner = dynamic(() => import("./bin-map-inner"), {
  ssr: false,
  loading: () => (
    <div className="h-[400px] w-full rounded-lg border bg-muted animate-pulse flex items-center justify-center text-muted-foreground">
      Loading map...
    </div>
  ),
});

export function BinMap({ markers }: { markers: BinMapMarker[] }) {
  return <MapInner markers={markers} />;
}
