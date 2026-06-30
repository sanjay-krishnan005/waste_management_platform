import { NotificationPreferences } from "@/components/settings/notification-preferences";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your notification preferences</p>
      </div>
      <NotificationPreferences />
    </div>
  );
}
