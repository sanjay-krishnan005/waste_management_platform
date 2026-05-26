import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, Key, Eye } from "lucide-react";

export default async function BinAuthPage() {
  const supabase = await createClient();

  const { data: bins } = await supabase
    .from("bins")
    .select("id, device_id, location_name, status, api_key, credentials_updated_at, last_seen_at, customers(name)")
    .order("device_id");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Bin Authentication</h1>
        <p className="text-muted-foreground">Manage API keys and MQTT credentials for smart bin integration</p>
      </div>

      <div className="grid gap-4">
        {(bins ?? []).map((bin) => (
          <Card key={bin.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-lg">{bin.device_id}</CardTitle>
                  {bin.api_key ? (
                    <Badge variant="outline" className="border-green-500 text-green-600">
                      <ShieldCheck className="mr-1 h-3 w-3" />
                      Authenticated
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Not configured</Badge>
                  )}
                  <Badge variant={bin.status === "active" ? "success" : bin.status === "offline" ? "destructive" : "secondary"}>
                    {bin.status === "unregistered" ? "not connected" : bin.status}
                  </Badge>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/bins/${bin.id}`}>
                    <Eye className="mr-2 h-4 w-4" />
                    View bin
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Location</p>
                  <p>{bin.location_name ?? "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Customer</p>
                  <p>{((bin.customers as unknown) as { name: string } | null)?.name ?? "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Last telemetry</p>
                  <p>{bin.last_seen_at ? new Date(bin.last_seen_at).toLocaleString() : "Never"}</p>
                </div>
              </div>
              {bin.api_key && (
                <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <Key className="h-3 w-3" />
                  <code className="font-mono">{bin.api_key.slice(0, 20)}...</code>
                  <span>· Created {new Date(bin.credentials_updated_at).toLocaleDateString()}</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {(!bins || bins.length === 0) && (
          <p className="text-muted-foreground">No bins found. Create a bin first.</p>
        )}
      </div>
    </div>
  );
}
