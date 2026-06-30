"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Layers } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";

interface Compartment {
  id: string;
  label: string;
  currentFillLevel: number;
  compartmentIndex: number;
  wasteCount?: number;
  weightKg?: number;
}

interface BinCompartmentPieChartProps {
  compartments: Compartment[];
  binName: string;
}

function getFillColor(fill: number) {
  if (fill >= 85) return "bg-red-500";
  if (fill >= 60) return "bg-amber-500";
  return "bg-primary";
}

function getFillHex(fill: number) {
  if (fill >= 85) return "#ef4444";
  if (fill >= 60) return "#f59e0b";
  return "#6C2BD9";
}

function DonutGauge({ value, label, color, size = 140 }: { value: number; label: string; color: string; size?: number }) {
  const padded = Math.min(value, 100);
  const empty = 100 - padded;
  const data = [
    { name: label, value: padded, fill: color },
    { name: "empty", value: empty, fill: "hsl(var(--border))" },
  ];

  return (
    <div className="flex flex-col items-center gap-2">
      <div style={{ width: size, height: size }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={size * 0.35}
              outerRadius={size * 0.48}
              startAngle={90}
              endAngle={-270}
              dataKey="value"
              strokeWidth={0}
              isAnimationActive={false}
            >
              <Cell fill={color} />
              <Cell fill="hsl(var(--border))" opacity={0.35} />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div
          className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
          style={{ width: size, height: size }}
        >
          <span className={cn("text-xl font-bold", value >= 60 ? "text-white" : "")}>
            {Math.round(value * 10) / 10}%
          </span>
          <span className="text-[10px] text-muted-foreground mt-0.5">fill</span>
        </div>
      </div>
      <p className="text-xs font-medium text-center leading-tight">{label}</p>
    </div>
  );
}

export function BinCompartmentPieChart({
  compartments,
}: BinCompartmentPieChartProps) {
  const hasData = compartments.length > 0;

  const chartData = compartments.map((comp) => ({
    name: comp.label,
    value: Math.round(comp.currentFillLevel * 10) / 10,
    fill: getFillHex(comp.currentFillLevel),
  }));

  const totalFill = chartData.reduce((sum, item) => sum + item.value, 0);
  const avgFill = compartments.length > 0 ? Math.round((totalFill / compartments.length) * 10) / 10 : 0;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card variant="glass">
        <CardHeader>
          <CardTitle>Fill Levels</CardTitle>
          {hasData ? (
            <CardDescription>
              Average fill: <span className="font-semibold text-foreground">{avgFill}%</span>
            </CardDescription>
          ) : (
            <CardDescription>No compartment data available</CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {hasData ? (
            <div className={cn(
              "flex flex-wrap items-center justify-center gap-6 py-4",
              compartments.length <= 2 ? "sm:gap-10" : "sm:gap-8"
            )}>
              {compartments.map((comp) => {
                const fill = comp.currentFillLevel;
                return (
                  <div key={comp.id} className="relative">
                    <DonutGauge
                      value={fill}
                      label={comp.label}
                      color={getFillHex(fill)}
                      size={140}
                    />
                    {comp.wasteCount != null && comp.wasteCount > 0 && (
                      <p className="text-[11px] text-muted-foreground text-center mt-1">
                        {comp.wasteCount} item{comp.wasteCount !== 1 ? "s" : ""}
                      </p>
                    )}
                    {comp.weightKg != null && comp.weightKg > 0 && (
                      <p className="text-[11px] text-muted-foreground text-center mt-1">
                        {comp.weightKg} kg
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center py-14 text-center">
              <div className="mb-3 rounded-xl bg-muted p-3 inline-block">
                <Layers className="h-6 w-6 text-muted-foreground/60" />
              </div>
              <p className="text-sm font-medium">No compartment data</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                Per-compartment fill data will appear once the bin reports individual compartment readings
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card variant="glass">
        <CardHeader>
          <CardTitle>Compartment Breakdown</CardTitle>
          <CardDescription>Each compartment shown as its own bin</CardDescription>
        </CardHeader>
        <CardContent>
          {hasData ? (
            <div className={cn("grid gap-6", compartments.length === 1 ? "grid-cols-1 max-w-[120px] mx-auto" : compartments.length === 2 ? "grid-cols-2" : compartments.length === 3 ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-4")}>
              {compartments.map((comp) => {
                const fill = comp.currentFillLevel;
                const color = getFillHex(fill);
                const colorClass = getFillColor(fill);
                return (
                  <div key={comp.id} className="flex flex-col items-center gap-3">
                    <div className="relative w-full max-w-[100px] h-52 rounded-lg border-2 border-border bg-muted/20 overflow-hidden">
                      <div
                        className="absolute bottom-0 left-0 right-0 transition-all duration-700 ease-out"
                        style={{
                          height: `${Math.min(fill, 100)}%`,
                          backgroundColor: color,
                          opacity: 0.7,
                        }}
                      >
                        <div className="absolute top-0 left-0 right-0 h-2" style={{ backgroundColor: color, opacity: 0.3 }} />
                      </div>
                      <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute top-1/4 left-0 right-0 border-t border-dashed border-border/30" />
                        <div className="absolute top-2/4 left-0 right-0 border-t border-dashed border-border/30" />
                        <div className="absolute top-3/4 left-0 right-0 border-t border-dashed border-border/30" />
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-lg font-bold drop-shadow-sm" style={{ color: fill >= 60 ? "#fff" : "hsl(var(--foreground))" }}>
                          {Math.round(fill * 10) / 10}%
                        </span>
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium">{comp.label}</p>
                      {comp.wasteCount && comp.wasteCount > 0 && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {comp.wasteCount} item{comp.wasteCount !== 1 ? "s" : ""}
                        </p>
                      )}
                      {comp.weightKg != null && comp.weightKg > 0 && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {comp.weightKg} kg
                        </p>
                      )}
                      <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden mx-auto max-w-[80px]">
                        <div
                          className={cn("h-full rounded-full transition-all duration-500", colorClass)}
                          style={{ width: `${Math.min(fill, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center py-14 text-center">
              <div className="mb-3 rounded-xl bg-muted p-3 inline-block">
                <Layers className="h-6 w-6 text-muted-foreground/60" />
              </div>
              <p className="text-sm font-medium">No compartment breakdown</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                Individual compartment readings will appear once the bin reports per-compartment data
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
