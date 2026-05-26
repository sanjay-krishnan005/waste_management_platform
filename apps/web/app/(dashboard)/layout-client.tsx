"use client";

import { Toaster } from "sonner";
import { FcmRegister } from "@/components/notifications/fcm-register";

export function DashboardClientExtras() {
  return (
    <>
      <Toaster
        position="top-right"
        richColors
        closeButton
        toastOptions={{
          style: { borderRadius: "var(--radius)" },
        }}
      />
      <FcmRegister />
    </>
  );
}
