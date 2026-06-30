"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import type { Profile } from "@/lib/auth/rbac";
import { createClient } from "@/lib/supabase/client";

export function NotificationPreferences() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data } = await supabase
        .from("profiles")
        .select("id, email, full_name, role, organization_id, customer_id, fcm_token, notify_email, notify_telegram, telegram_chat_id")
        .eq("id", user.id)
        .single();
      setProfile(data as Profile);
      setLoading(false);
    }
    load();
  }, []);

  async function toggle(field: "notify_email" | "notify_telegram", value: boolean): Promise<void> {
    if (!profile) return;
    setSaving(field);
    setError(null);
    setProfile({ ...profile, [field]: value });
    const res = await fetch("/api/profile/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    if (!res.ok) {
      setError("Failed to save preference. Try again.");
      setProfile({ ...profile, [field]: !value });
    }
    setSaving(null);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card variant="glass">
      <CardHeader>
        <CardTitle>Notification Preferences</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="notify_email">Email Notifications</Label>
            <p className="text-sm text-muted-foreground">
              Receive alerts at {profile?.email ?? "your email"}
            </p>
          </div>
          <Switch
            id="notify_email"
            checked={profile?.notify_email ?? true}
            onCheckedChange={(v) => toggle("notify_email", v)}
            disabled={saving === "notify_email"}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="notify_telegram">Telegram Notifications</Label>
            <p className="text-sm text-muted-foreground">
              {profile?.telegram_chat_id
                ? "Linked — you'll receive alerts here"
                : "Not linked — message the Sortyx bot with /start your@email.com"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {profile?.telegram_chat_id ? (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            ) : (
              <XCircle className="h-4 w-4 text-muted-foreground" />
            )}
            <Switch
              id="notify_telegram"
              checked={profile?.notify_telegram ?? false}
              onCheckedChange={(v) => toggle("notify_telegram", v)}
              disabled={saving === "notify_telegram" || !profile?.telegram_chat_id}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
