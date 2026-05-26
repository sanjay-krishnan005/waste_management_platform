import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function ManualPage() {
  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold">Manual</h1>
        <p className="text-muted-foreground">How to use the platform and integrate real smart bins</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick start</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm leading-relaxed">
          <ol className="list-decimal list-inside space-y-2">
            <li><strong>Create a customer</strong> — Go to Customers and add the client who owns the bins.</li>
            <li><strong>Add a bin</strong> — Go to Bins, click Add bin, fill in the device ID, serial number, and assign it to a customer.</li>
            <li><strong>Generate credentials</strong> — Open the bin detail page, scroll to the Authentication section, and click Generate credentials. This creates an API key and MQTT credentials for the bin.</li>
            <li><strong>Configure the smart bin</strong> — Provide the generated API key, MQTT username, and MQTT password to the bin firmware.</li>
            <li><strong>Verify connection</strong> — Once the bin sends telemetry, the status changes from &quot;not connected&quot; to &quot;active&quot; and data appears on the dashboard.</li>
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>MQTT integration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm leading-relaxed">
          <p>The platform uses MQTT for real-time communication with smart bins. A bridge service listens for incoming telemetry and stores it in the database.</p>

          <div className="rounded-lg border p-4 space-y-2">
            <h3 className="font-semibold">Topic structure</h3>
            <code className="block bg-muted p-2 rounded text-xs font-mono">
              sortyx/bins/{"{deviceId}"}/telemetry
            </code>
            <p className="text-muted-foreground">Each bin publishes telemetry to its own topic. The bridge subscribes to the wildcard <code className="text-xs font-mono">sortyx/bins/+/telemetry</code>.</p>
          </div>

          <div className="rounded-lg border p-4 space-y-2">
            <h3 className="font-semibold">Telemetry payload format</h3>
            <p>The bin must send a JSON payload with the following structure:</p>
            <pre className="bg-muted p-3 rounded text-xs font-mono overflow-x-auto">{`{
  "deviceId": "SRTX-001",
  "apiKey": "srtx_abc123...",
  "timestamp": "2026-05-22T10:30:00Z",
  "compartments": [
    {
      "index": 0,
      "fillLevel": 45,
      "weightKg": 12.5,
      "wasteCount": 8,
      "classification": { "plastic": 3, "metal": 5 }
    },
    {
      "index": 1,
      "fillLevel": 72,
      "weightKg": 20.1,
      "wasteCount": 15
    }
  ],
  "cameraStatus": "ok",
  "sensorHealth": "ok",
  "internetStatus": "online",
  "batteryPercent": 85,
  "snapshotUrl": "https://..."
}`}</pre>
          </div>

          <div className="rounded-lg border p-4 space-y-2">
            <h3 className="font-semibold">MQTT broker connection</h3>
            <table className="w-full text-xs">
              <tbody>
                <tr className="border-b"><td className="py-1 font-medium pr-4">Broker URL</td><td className="py-1 font-mono">{process.env.NEXT_PUBLIC_MQTT_URL || "mqtt://your-broker:1883"}</td></tr>
                <tr className="border-b"><td className="py-1 font-medium pr-4">Username</td><td className="py-1 font-mono">{process.env.NEXT_PUBLIC_MQTT_USER || "&lt;bin MQTT username&gt;"}</td></tr>
                <tr className="border-b"><td className="py-1 font-medium pr-4">Password</td><td className="py-1 font-mono">{process.env.NEXT_PUBLIC_MQTT_PASS || "&lt;bin MQTT password&gt;"}</td></tr>
                <tr><td className="py-1 font-medium pr-4">TLS</td><td className="py-1">Supported if broker requires it</td></tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Authentication</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm leading-relaxed">
          <p>Each bin must authenticate before its telemetry is accepted. Authentication serves two purposes:</p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>API key</strong> — Sent in the <code className="text-xs font-mono">apiKey</code> field of every telemetry payload. The MQTT bridge validates it against the stored key for that device ID.</li>
            <li><strong>MQTT credentials</strong> — Used to connect to the MQTT broker (username/password). These are generated per bin and can be revoked if compromised.</li>
          </ul>

          <div className="rounded-lg border p-4">
            <h3 className="font-semibold mb-2">Generating credentials</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>Navigate to the bin detail page</li>
              <li>Scroll to the <strong>Authentication</strong> section</li>
              <li>Click <Badge variant="outline" className="text-xs">Generate credentials</Badge></li>
              <li>Copy the API key, MQTT username, and MQTT password</li>
              <li>Configure your bin firmware with these values</li>
              <li>Click <Badge variant="outline" className="text-xs">Revoke</Badge> to invalidate credentials if needed</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Platform features</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm leading-relaxed">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border p-4">
              <h3 className="font-semibold mb-1">Dashboard</h3>
              <p className="text-muted-foreground text-xs">Real-time KPI cards, live map with bin markers, alert center, bins by customer breakdown, and recent activity log.</p>
            </div>
            <div className="rounded-lg border p-4">
              <h3 className="font-semibold mb-1">Bins</h3>
              <p className="text-muted-foreground text-xs">List, create, edit, and delete bins. Each bin has a detail page with fill level history, compartment breakdown, health monitoring, camera snapshot, and authentication management.</p>
            </div>
            <div className="rounded-lg border p-4">
              <h3 className="font-semibold mb-1">Alerts</h3>
              <p className="text-muted-foreground text-xs">Alerts are auto-generated by the MQTT bridge for full bins, sensor failures, camera errors, low battery, and offline detection. Acknowledge and resolve from the alerts page.</p>
            </div>
            <div className="rounded-lg border p-4">
              <h3 className="font-semibold mb-1">Customers</h3>
              <p className="text-muted-foreground text-xs">Manage customers and their assigned bins. Create customer accounts with login credentials, edit details, or delete.</p>
            </div>
            <div className="rounded-lg border p-4">
              <h3 className="font-semibold mb-1">Bin Auth</h3>
              <p className="text-muted-foreground text-xs">Overview of all bins with their authentication status. See which bins have API keys configured, their last telemetry time, and quick links to the bin detail page.</p>
            </div>
            <div className="rounded-lg border p-4">
              <h3 className="font-semibold mb-1">Reports</h3>
              <p className="text-muted-foreground text-xs">Export bin data as CSV or PDF for offline analysis. Filter by date range and format.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bin status meanings</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 font-medium">Meaning</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="py-2"><Badge variant="secondary">not connected</Badge></td>
                <td className="py-2 text-sm">Bin was created in the platform but has never sent telemetry. Generate credentials and configure the smart bin to start receiving data.</td>
              </tr>
              <tr className="border-b">
                <td className="py-2"><Badge variant="success">active</Badge></td>
                <td className="py-2 text-sm">Bin is online and sending telemetry data normally.</td>
              </tr>
              <tr className="border-b">
                <td className="py-2"><Badge variant="destructive">offline</Badge></td>
                <td className="py-2 text-sm">Bin has been active but stopped sending data. Check power, internet connection, or MQTT configuration.</td>
              </tr>
              <tr className="border-b">
                <td className="py-2"><Badge variant="secondary">maintenance</Badge></td>
                <td className="py-2 text-sm">Bin is undergoing maintenance and temporarily out of service.</td>
              </tr>
              <tr>
                <td className="py-2"><Badge variant="secondary">decommissioned</Badge></td>
                <td className="py-2 text-sm">Bin has been permanently removed from service.</td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Alert types</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 font-medium">Alert type</th>
                <th className="pb-2 font-medium">Triggered when</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b"><td className="py-2 font-mono text-xs">full_bin</td><td className="py-2">Any compartment reaches 85% fill level</td></tr>
              <tr className="border-b"><td className="py-2 font-mono text-xs">offline</td><td className="py-2">Bin has not sent telemetry for 10+ minutes</td></tr>
              <tr className="border-b"><td className="py-2 font-mono text-xs">sensor_failure</td><td className="py-2">Sensor health reported as &quot;error&quot;</td></tr>
              <tr className="border-b"><td className="py-2 font-mono text-xs">camera_failure</td><td className="py-2">Camera status reported as &quot;error&quot;</td></tr>
              <tr className="border-b"><td className="py-2 font-mono text-xs">low_battery</td><td className="py-2">Battery drops below 20%</td></tr>
              <tr><td className="py-2 font-mono text-xs">ad_expiry</td><td className="py-2">A digital ad on the bin has expired</td></tr>
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Troubleshooting</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="rounded-lg border p-3">
            <p className="font-semibold">Bin shows &quot;not connected&quot;</p>
            <p className="text-muted-foreground text-xs mt-1">Generate credentials in the bin detail page, configure the bin firmware with the API key, and ensure the bin can reach the MQTT broker.</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="font-semibold">No alerts appearing</p>
            <p className="text-muted-foreground text-xs mt-1">Alerts are generated by the MQTT bridge when processing telemetry. Verify the bridge service is running and bins are sending data.</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="font-semibold">Map shows no markers</p>
            <p className="text-muted-foreground text-xs mt-1">Bins need valid GPS coordinates (latitude/longitude). Set these when creating or editing a bin using the location picker on the map.</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="font-semibold">API key rejected</p>
            <p className="text-muted-foreground text-xs mt-1">Regenerate credentials from the bin detail page and update the bin firmware. Ensure the correct device ID is used in the telemetry topic.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
