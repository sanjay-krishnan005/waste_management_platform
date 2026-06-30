import mqtt from "mqtt";
import { telemetryPayloadSchema, type TelemetryPayload } from "@sortyx/shared";
import pino from "pino";

const log = pino({
  transport:
    process.env.NODE_ENV !== "production"
      ? { target: "pino-pretty" }
      : undefined,
});

const TTN_APP_ID = process.env.TTN_APP_ID;
const TTN_API_KEY = process.env.TTN_API_KEY;
const TTN_BROKER = process.env.TTN_BROKER ?? "nam1.cloud.thethings.network";
const TTN_PORT = parseInt(process.env.TTN_PORT ?? "8883", 10);

export async function startTtnClient(
  processTelemetryPayload: (data: TelemetryPayload) => Promise<void>
): Promise<mqtt.MqttClient | null> {
  if (!TTN_APP_ID || !TTN_API_KEY) {
    log.info("TTN_APP_ID or TTN_API_KEY not set — TTN client not started");
    return null;
  }

  const brokerUrl = `mqtts://${TTN_BROKER}:${TTN_PORT}`;
  const topic = "#";

  log.info({ broker: brokerUrl, topic }, "Connecting to TTN MQTT");

  const client = mqtt.connect(brokerUrl, {
    username: `${TTN_APP_ID}@ttn`,
    password: TTN_API_KEY,
    reconnectPeriod: 5000,
    rejectUnauthorized: true,
  });

  client.on("connect", () => {
    log.info("Connected to TTN MQTT broker");

    client.subscribe(topic, { qos: 1 }, (err, granted) => {
  console.log("GRANTED:", granted);

      if (err) {
        console.error(err);
      } else {
        console.log("Subscribed");
      }
    });
  });

  client.on("message", (rcvTopic, payload) => {
    handleTtnMessage(rcvTopic, payload, processTelemetryPayload).catch((err) =>
      log.error(err, "TTN message processing failed")
    );
  });

  client.on("error", (err) => {
    log.error(err, "TTN MQTT error");
  });

  client.on("close", () => {
    log.warn("TTN MQTT connection closed");
  });

  client.on("reconnect", () => {
    log.info("TTN MQTT reconnecting...");
  });

  client.on("message", (topic, payload) => {
  console.log("TOPIC:", topic);
  console.log("PAYLOAD:", payload.toString());
  });

  return client;
}

type TtnUplink = {
  end_device_ids?: {
    device_id?: string;
  };
  uplink_message?: {
    decoded_payload?: {
      distance?: number;
      battery?: number;
    };
  };
};

async function handleTtnMessage(
  _topic: string,
  payload: Buffer,
  processTelemetryPayload: (data: TelemetryPayload) => Promise<void>
) {
  let parsed: TtnUplink;

  try {
    parsed = JSON.parse(payload.toString());
  } catch {
    log.warn("TTN invalid JSON payload");
    return;
  }

  const deviceId = parsed.end_device_ids?.device_id;
  if (!deviceId) {
    log.warn({ parsed }, "TTN payload missing device_id");
    return;
  }

  const decoded = parsed.uplink_message?.decoded_payload;
  if (!decoded || decoded.distance == null) {
    log.warn({ deviceId }, "TTN payload missing distance in decoded_payload");
    return;
  }

  const distanceCm = decoded.distance;
  const batteryPercent = decoded.battery;

  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: bin, error: binError } = await supabase
    .from("bins")
    .select("id, device_id, bin_height")
    .eq("device_id", deviceId)
    .single();

  if (binError || !bin) {
    log.warn({ deviceId }, "TTN device not found in Supabase");
    return;
  }

  const binHeight = bin.bin_height ?? 100;
  const rawFill = ((binHeight - distanceCm) / binHeight) * 100;
  const fillLevel = Math.max(0, Math.min(100, Math.round(rawFill * 10) / 10));

  log.info(
    { deviceId, distanceCm, binHeight, fillLevel, batteryPercent },
    "TTN telemetry transformed"
  );

  const telemetryData: TelemetryPayload = {
    deviceId,
    compartments: [
      {
        index: 0,
        fillLevel,
        weightKg: 0,
        wasteCount: 0,
      },
    ],
    batteryPercent: batteryPercent ?? 0,
    cameraStatus: "ok",
    sensorHealth: "ok",
    internetStatus: "online",
    timestamp: new Date().toISOString(),
  };

  const parseResult = telemetryPayloadSchema.safeParse(telemetryData);
  if (!parseResult.success) {
    log.warn(
      { deviceId, errors: parseResult.error.flatten() },
      "TTN transformed payload validation failed"
    );
    return;
  }

  await processTelemetryPayload(parseResult.data);
}
