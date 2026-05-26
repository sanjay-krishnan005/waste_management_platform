"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Key, Copy, Check, RefreshCw, Trash2, Eye, EyeOff } from "lucide-react";

export function BinCredentials({ binId }: { binId: string }) {
  const [creds, setCreds] = useState<{
    apiKey: string;
    mqttUsername: string;
    mqttPassword: string;
  } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/bins/${binId}/credentials`)
      .then((res) => res.json())
      .then((data) => {
        if (data.hasCredentials) setCreds(data);
      })
      .finally(() => setInitialLoading(false));
  }, [binId]);

  async function generate() {
    setLoading(true);
    try {
      const res = await fetch(`/api/bins/${binId}/credentials`, { method: "POST" });
      const data = await res.json();
      if (res.ok) setCreds(data);
    } finally {
      setLoading(false);
    }
  }

  async function revoke() {
    if (!confirm("Revoke credentials? The bin will no longer be able to authenticate.")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/bins/${binId}/credentials`, { method: "DELETE" });
      if (res.ok) setCreds(null);
    } finally {
      setLoading(false);
    }
  }

  async function copy(text: string, label: string) {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Key className="h-4 w-4" />
          Authentication
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {initialLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : !creds ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Generate credentials for this bin to authenticate with the platform via MQTT and REST API.
              The bin must include the API key in its telemetry payload.
            </p>
            <Button onClick={generate} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Generate credentials
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              <div className="rounded-lg border p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-muted-foreground">API Key</span>
                  <Button variant="ghost" size="sm" className="h-6 px-2" onClick={() => copy(creds.apiKey, "apiKey")}>
                    {copied === "apiKey" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  </Button>
                </div>
                <code className="text-xs break-all font-mono">{creds.apiKey}</code>
              </div>

              <div className="rounded-lg border p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-muted-foreground">MQTT Username</span>
                  <Button variant="ghost" size="sm" className="h-6 px-2" onClick={() => copy(creds.mqttUsername, "mqttUser")}>
                    {copied === "mqttUser" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  </Button>
                </div>
                <code className="text-xs font-mono">{creds.mqttUsername}</code>
              </div>

              <div className="rounded-lg border p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-muted-foreground">MQTT Password</span>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="h-6 px-2" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </Button>
                    <Button variant="ghost" size="sm" className="h-6 px-2" onClick={() => copy(creds.mqttPassword, "mqttPass")}>
                      {copied === "mqttPass" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                </div>
                <code className="text-xs font-mono">
                  {showPassword ? creds.mqttPassword : "••••••••••••••••"}
                </code>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t">
              <Badge variant="success">Active</Badge>
              <Button variant="outline" size="sm" onClick={revoke} disabled={loading}>
                <Trash2 className="mr-2 h-4 w-4" />
                Revoke
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
