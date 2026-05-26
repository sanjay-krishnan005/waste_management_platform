import { z } from "zod";

export const compartmentTelemetrySchema = z.object({
  index: z.number().int().min(0).max(3),
  fillLevel: z.number().min(0).max(100),
  weightKg: z.number().min(0).optional(),
  wasteCount: z.number().int().min(0).optional(),
  classification: z.record(z.string(), z.number()).optional(),
});

export const telemetryPayloadSchema = z.object({
  deviceId: z.string().min(1),
  apiKey: z.string().optional(),
  timestamp: z.string().datetime().optional(),
  compartments: z.array(compartmentTelemetrySchema).min(1).max(4),
  cameraStatus: z.enum(["ok", "error", "offline"]).optional(),
  sensorHealth: z.enum(["ok", "degraded", "error"]).optional(),
  internetStatus: z.enum(["online", "offline"]).optional(),
  batteryPercent: z.number().min(0).max(100).optional(),
  snapshotUrl: z.string().nullable().optional(),
  alerts: z
    .array(
      z.enum([
        "full_bin",
        "offline",
        "sensor_failure",
        "camera_failure",
        "low_battery",
        "ad_expiry",
      ])
    )
    .optional(),
});

export type TelemetryPayload = z.infer<typeof telemetryPayloadSchema>;
export type CompartmentTelemetry = z.infer<typeof compartmentTelemetrySchema>;

export const USER_ROLES = [
  "admin",
  "customer",
] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const BIN_TYPES = ["two", "four"] as const;
export type BinType = (typeof BIN_TYPES)[number];

export const BIN_STATUSES = [
  "active",
  "maintenance",
  "offline",
  "decommissioned",
  "unregistered",
] as const;
export type BinStatus = (typeof BIN_STATUSES)[number];

export const ALERT_TYPES = [
  "full_bin",
  "offline",
  "sensor_failure",
  "camera_failure",
  "low_battery",
  "ad_expiry",
] as const;
export type AlertType = (typeof ALERT_TYPES)[number];

export const MQTT_TOPICS = {
  telemetry: (deviceId: string) => `sortyx/bins/${deviceId}/telemetry`,
  snapshot: (deviceId: string) => `sortyx/bins/${deviceId}/snapshot`,
  telemetryWildcard: "sortyx/bins/+/telemetry",
  snapshotWildcard: "sortyx/bins/+/snapshot",
} as const;
