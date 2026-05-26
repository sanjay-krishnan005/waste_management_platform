import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, Key, Eye, Wifi, WifiOff, CheckCircle2, XCircle } from "lucide-react";

const statusConfig: Record<string, { label: string; variant: "success" | "destructive" | "warning" | "neutral" | "secondary" }> = {
  active: { label: "Active", variant: "success" },
  offline: { label: "Offline", variant: "destructive" },
  unregistered: { label: "Not connected", variant: "neutral" },
  maintenance: { label: "Maintenance", variant: "warning" },
  decommissioned: { label: "Decommissioned", variant: "secondary" },
};

export default async function BinAuthPage() {
  const supabase = await createClient();

  const { data: bins } = await supabase
    .from("bins")
    .select("id, device_id, location_name, status, api_key, credentials_updated_at, last_seen_at, customers(name)")
    .order("device_id");

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1>Bin Authentication</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage API keys and MQTT credentials for smart bin integration</p>
      </div>

      <div className="grid gap-4">
        {(bins ?? []).map((bin) => {
          const cfg = statusConfig[bin.status] ?? { label: bin.status, variant: "neutral" as const };
          const customerName = ((bin.customers as unknown) as { name: string } | null)?.name;
          return (
            <Card key={bin.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CardTitle className="font-mono text-sm">{bin.device_id}</CardTitle>
                    {bin.api_key ? (
                      <Badge variant="success" className="text-[10px]">
                        <ShieldCheck className="mr-1 h-3 w-3" />
                        Authenticated
                      </Badge>
                    ) : (
                      <Badge variant="neutral" className="text-[10px]">Not configured</Badge>
                    )}
                    <Badge variant={cfg.variant} className="text-[10px]">
                      {cfg.label}
                    </Badge>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/bins/${bin.id}`}>
                      <Eye className="mr-1.5 h-4 w-4" />
                      View
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Location</p>
                    <p className="text-sm font-medium">{bin.location_name ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Customer</p>
                    <p className="text-sm font-medium">{customerName ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Last telemetry</p>
                    <p className="text-sm font-medium">{bin.last_seen_at ? new Date(bin.last_seen_at).toLocaleDateString() : "Never"}</p>
                  </div>
                </div>
                {bin.api_key && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                    <Key className="h-3 w-3" />
                    <code className="font-mono text-[10px]">{bin.api_key.slice(0, 16)}...</code>
                    <span>· Created {new Date(bin.credentials_updated_at).toLocaleDateString()}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
        {(!bins || bins.length === 0) && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-sm text-muted-foreground">No bins found. Create a bin first.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
