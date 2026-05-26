import { Card } from "@/components/ui/card";
import { Trash2, AlertTriangle, WifiOff, Activity, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

type KpiData = {
  totalBins: number;
  fullBins: number;
  activeAlerts: number;
  offlineBins: number;
  authenticatedBins: number;
};

const cardConfig = [
  {
    title: "Total Bins",
    key: "totalBins" as const,
    icon: Trash2,
    gradient: "from-sortyx/20 to-sortyx/5",
    iconBg: "bg-sortyx/10 text-sortyx",
    borderAccent: "border-l-sortyx",
  },
  {
    title: "Full Bins",
    key: "fullBins" as const,
    icon: Activity,
    gradient: "from-amber-500/20 to-amber-500/5",
    iconBg: "bg-amber-500/10 text-amber-600",
    borderAccent: "border-l-amber-500",
  },
  {
    title: "Active Alerts",
    key: "activeAlerts" as const,
    icon: AlertTriangle,
    gradient: "from-red-500/20 to-red-500/5",
    iconBg: "bg-red-500/10 text-red-600",
    borderAccent: "border-l-red-500",
  },
  {
    title: "Offline",
    key: "offlineBins" as const,
    icon: WifiOff,
    gradient: "from-gray-500/20 to-gray-500/5",
    iconBg: "bg-gray-500/10 text-gray-600",
    borderAccent: "border-l-gray-500",
  },
  {
    title: "Authenticated",
    key: "authenticatedBins" as const,
    icon: ShieldCheck,
    gradient: "from-green-500/20 to-green-500/5",
    iconBg: "bg-green-500/10 text-green-600",
    borderAccent: "border-l-green-500",
  },
];

export function KpiCards({ data }: { data: KpiData }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {cardConfig.map((c) => {
        const Icon = c.icon;
        return (
          <Card
            key={c.key}
            hover
            className={cn("border-l-4 overflow-hidden", c.borderAccent)}
          >
            <div className={cn("absolute inset-0 bg-gradient-to-br opacity-50 pointer-events-none", c.gradient)} />
            <div className="relative p-5">
              <div className="flex items-center justify-between">
                <div className={cn("rounded-full p-2.5", c.iconBg)}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold tracking-tight">
                  {data[c.key]}
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">{c.title}</p>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
