# MQTT Contract — Sortyx Smart Bins

## Topics

| Topic | Direction | Description |
|-------|-----------|-------------|
| `sortyx/bins/{deviceId}/telemetry` | Publish (Pi → broker) | JSON telemetry payload |
| `sortyx/bins/{deviceId}/snapshot` | Publish (optional) | JPEG image or URL string |

The MQTT bridge subscribes to: `sortyx/bins/+/telemetry`

## Telemetry JSON Schema

```json
{
  "deviceId": "SRTX-001",
  "timestamp": "2026-05-19T12:00:00Z",
  "compartments": [
    {
      "index": 0,
      "fillLevel": 78,
      "weightKg": 12.4,
      "wasteCount": 42,
      "classification": { "plastic": 10, "paper": 20, "other": 12 }
    }
  ],
  "cameraStatus": "ok",
  "sensorHealth": "ok",
  "internetStatus": "online",
  "batteryPercent": 85,
  "snapshotUrl": "https://example.com/snap.jpg",
  "alerts": ["full_bin"]
}
```

### Field reference

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| deviceId | string | yes | Must match `bins.device_id` in platform |
| timestamp | ISO 8601 | no | Defaults to server time |
| compartments | array | yes | 2 items for 2-bin, 4 for 4-bin |
| compartments[].index | 0-3 | yes | Compartment index |
| compartments[].fillLevel | 0-100 | yes | Fill percentage |
| compartments[].weightKg | number | no | Weight in kg |
| compartments[].wasteCount | int | no | Item count |
| compartments[].classification | object | no | AI waste labels → counts |
| cameraStatus | ok \| error \| offline | no | Default `ok` |
| sensorHealth | ok \| degraded \| error | no | Default `ok` |
| internetStatus | online \| offline | no | Default `online` |
| batteryPercent | 0-100 | no | Triggers low_battery alert if &lt; 20 |
| snapshotUrl | URL | no | Latest camera image |
| alerts | string[] | no | Device-reported alert types |

### Alert types (alerts array)

- `full_bin`
- `offline`
- `sensor_failure`
- `camera_failure`
- `low_battery`
- `ad_expiry`

## Platform-side alert rules

The bridge also evaluates:

- **full_bin**: max compartment fill ≥ 85%
- **camera_failure**: cameraStatus === `error`
- **sensor_failure**: sensorHealth === `error`
- **low_battery**: batteryPercent &lt; 20
- **offline**: no telemetry for 10 minutes (cron)
- **ad_expiry**: bin ad expires within 3 days

Alerts are deduplicated per bin+type for 15 minutes.

## Example publish (mosquitto_pub)

```bash
mosquitto_pub -h YOUR_BROKER -u pi_user -P secret \
  -t "sortyx/bins/SRTX-001/telemetry" \
  -m '{"deviceId":"SRTX-001","compartments":[{"index":0,"fillLevel":45},{"index":1,"fillLevel":52}],"cameraStatus":"ok","sensorHealth":"ok","internetStatus":"online","batteryPercent":88}'
```
