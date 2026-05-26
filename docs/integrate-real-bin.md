# Connect a Real Raspberry Pi Bin

## Overview

```
[Raspberry Pi] --MQTT publish--> [Your MQTT broker] --subscribe--> [MQTT bridge] --write--> [Supabase] --realtime--> [Dashboard]
```

## Step 1 — Register the bin in the platform

1. **Customers** → Add customer (optional)
2. **Bins** → **Add bin**
   - **Device ID**: must match what the Pi sends (e.g. `SRTX-101`)
   - **Serial number**: your hardware label
   - **GPS**: click the map to set location (required for live map pin)
   - **Customer**: assign or leave Unassigned
3. Save — compartments are created automatically (2 or 4)

## Step 2 — Configure the MQTT bridge

Edit `services/mqtt-bridge/.env`:

```env
MQTT_URL=mqtt://YOUR_BROKER_IP:1883
MQTT_USER=bridge_user
MQTT_PASS=your_password
MQTT_TOPIC_TELEMETRY=sortyx/bins/+/telemetry

SUPABASE_URL=https://nuxiinkfwffindrfejvt.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

Start the bridge:

```bash
cd sortyx-intelligence-platform
npm run dev:bridge
```

Health check: `http://localhost:8080/health` → `{"status":"ok","mqtt":true}`

## Step 3 — Configure the Raspberry Pi

Publish JSON to topic:

```
sortyx/bins/{deviceId}/telemetry
```

Example payload (see `docs/mqtt-contract.md`):

```json
{
  "deviceId": "SRTX-101",
  "timestamp": "2026-05-19T12:00:00Z",
  "compartments": [
    { "index": 0, "fillLevel": 45, "weightKg": 8.2, "wasteCount": 30 },
    { "index": 1, "fillLevel": 60, "weightKg": 10.1, "wasteCount": 25 }
  ],
  "cameraStatus": "ok",
  "sensorHealth": "ok",
  "internetStatus": "online",
  "batteryPercent": 88
}
```

Test from your PC:

```bash
mosquitto_pub -h YOUR_BROKER -t "sortyx/bins/SRTX-101/telemetry" -m "{\"deviceId\":\"SRTX-101\",\"compartments\":[{\"index\":0,\"fillLevel\":45},{\"index\":1,\"fillLevel\":60}],\"cameraStatus\":\"ok\",\"sensorHealth\":\"ok\",\"internetStatus\":\"online\",\"batteryPercent\":88}"
```

## Step 4 — Monitor on the dashboard

1. Open **Dashboard** — KPIs and map update via Supabase Realtime
2. Open **Bins** → your bin → live charts and compartment data
3. **Alerts** — full bin, offline, sensor/camera issues (auto-created by bridge)

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Bin not updating | Device ID in DB must exactly match MQTT `deviceId` |
| Bridge shows "Unknown device" | Register bin in platform first |
| Map empty | Set GPS on bin (click map on Add bin) |
| No realtime | Enable Realtime on tables in Supabase |
| Bridge can't connect | Check MQTT_URL, firewall, broker ACL |

## Production

- Run MQTT bridge on a VPS/Railway/Docker 24/7 near your broker
- Deploy web app to Vercel with Supabase env vars
- Pi only needs outbound MQTT to broker (no direct Supabase access)
