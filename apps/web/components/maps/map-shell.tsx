"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/** Avoid SSR/hydration issues with react-leaflet */
export function MapShell({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-lg border bg-muted text-sm text-muted-foreground",
          className
        )}
      >
        Loading map…
      </div>
    );
  }

  return <div className={cn("relative z-0", className)}>{children}</div>;
}
