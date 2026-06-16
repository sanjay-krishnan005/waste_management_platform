import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Trash2, AlertTriangle, Bell, WifiOff, ShieldCheck, type LucideIcon } from "lucide-react";

type KpiData = {
  totalBins: number;
  fullBins: number;
  activeAlerts: number;
  offlineBins: number;
  authenticatedBins: number;
};

interface KpiCardConfig {
  title: string;
  key: keyof KpiData;
  icon: LucideIcon;
  valueColor: string;
}

const cards: KpiCardConfig[] = [
  { title: "Total Bins", key: "totalBins", icon: Trash2, valueColor: "text-foreground" },
  { title: "Full Bins", key: "fullBins", icon: AlertTriangle, valueColor: "text-amber-600 dark:text-amber-400" },
  { title: "Active Alerts", key: "activeAlerts", icon: Bell, valueColor: "text-red-600 dark:text-red-400" },
  { title: "Offline", key: "offlineBins", icon: WifiOff, valueColor: "text-muted-foreground" },
  { title: "Authenticated", key: "authenticatedBins", icon: ShieldCheck, valueColor: "text-emerald-600 dark:text-emerald-400" },
];

export function KpiCards({ data }: { data: KpiData }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {cards.map((c) => {
        const Icon = c.icon;
        const value = data[c.key];
        return (
          <Card key={c.key} variant="glass" className="relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
            <div className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">{c.title}</span>
                <Icon className="h-4 w-4 text-muted-foreground/30" />
              </div>
              <div className={cn("mt-2 text-2xl font-semibold tracking-tight", c.valueColor)}>
                {value}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
