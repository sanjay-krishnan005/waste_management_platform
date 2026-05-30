"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
}

interface BinCompartmentPieChartProps {
  compartments: Compartment[];
  binName: string;
}

const COLORS = ["#6C2BD9", "#10b981", "#f59e0b", "#ef4444"];

function PieLabel({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
  name,
}: {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  percent: number;
  name: string;
}) {
  const RADIAN = Math.PI / 180;
  const radius = outerRadius + 28;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  const textAnchor = x > cx ? "start" : "end";

  return (
    <g>
      <line
        x1={cx + (innerRadius + (outerRadius - innerRadius) / 2) * Math.cos(-midAngle * RADIAN)}
        y1={cy + (innerRadius + (outerRadius - innerRadius) / 2) * Math.sin(-midAngle * RADIAN)}
        x2={cx + (outerRadius + 10) * Math.cos(-midAngle * RADIAN)}
        y2={cy + (outerRadius + 10) * Math.sin(-midAngle * RADIAN)}
        stroke="#888"
        strokeWidth={1}
        strokeOpacity={0.4}
      />
      <line
        x1={cx + (outerRadius + 10) * Math.cos(-midAngle * RADIAN)}
        y1={cy + (outerRadius + 10) * Math.sin(-midAngle * RADIAN)}
        x2={cx + (outerRadius + 24) * Math.cos(-midAngle * RADIAN)}
        y2={cy + (outerRadius + 24) * Math.sin(-midAngle * RADIAN)}
        stroke="#888"
        strokeWidth={1}
        strokeOpacity={0.4}
      />
      <text
        x={x}
        y={y - 6}
        textAnchor={textAnchor}
        fill="hsl(var(--foreground))"
        fontSize={11}
        fontWeight={500}
      >
        {name}
      </text>
      <text
        x={x}
        y={y + 10}
        textAnchor={textAnchor}
        fill="hsl(var(--muted-foreground))"
        fontSize={10}
      >
        {`${(percent * 100).toFixed(1)}%`}
      </text>
    </g>
  );
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

export function BinCompartmentPieChart({
  compartments,
}: BinCompartmentPieChartProps) {
  const hasData = compartments.length > 0;

  const chartData = compartments.map((comp) => ({
    name: comp.label,
    value: Math.round(comp.currentFillLevel * 10) / 10,
    fill: COLORS[comp.compartmentIndex % COLORS.length],
  }));

  const totalFill = chartData.reduce((sum, item) => sum + item.value, 0);
  const avgFill = compartments.length > 0 ? Math.round((totalFill / compartments.length) * 10) / 10 : 0;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Pie Chart */}
      <Card>
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
            <>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                      strokeWidth={0}
                      label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }) => (
                        <PieLabel
                          cx={cx}
                          cy={cy}
                          midAngle={midAngle}
                          innerRadius={innerRadius}
                          outerRadius={outerRadius}
                          percent={percent}
                          name={name}
                        />
                      )}
                      labelLine={false}
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {/* Legend */}
              <div className="flex flex-wrap items-center justify-center gap-4 mt-2">
                {chartData.map((item, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.fill }} />
                    <span className="text-xs text-muted-foreground">{item.name}</span>
                    <span className="text-xs font-medium tabular-nums">{item.value}%</span>
                  </div>
                ))}
              </div>
            </>
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

      {/* Individual Vertical Bins */}
      <Card>
        <CardHeader>
          <CardTitle>Compartment Breakdown</CardTitle>
          <CardDescription>Each compartment shown as its own bin</CardDescription>
        </CardHeader>
        <CardContent>
          {hasData ? (
            <div className={cn("grid gap-6", compartments.length === 2 ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-4")}>
              {compartments.map((comp) => {
                const fill = comp.currentFillLevel;
                const color = getFillHex(fill);
                const colorClass = getFillColor(fill);
                return (
                  <div key={comp.id} className="flex flex-col items-center gap-3">
                    {/* Individual bin container */}
                    <div className="relative w-full max-w-[100px] h-52 rounded-lg border-2 border-border bg-muted/20 overflow-hidden">
                      {/* Fill level */}
                      <div
                        className="absolute bottom-0 left-0 right-0 transition-all duration-700 ease-out"
                        style={{
                          height: `${Math.min(fill, 100)}%`,
                          backgroundColor: color,
                          opacity: 0.7,
                        }}
                      >
                        {/* Ripple effect at top of fill */}
                        <div className="absolute top-0 left-0 right-0 h-2" style={{ backgroundColor: color, opacity: 0.3 }} />
                      </div>
                      {/* 25% marker lines */}
                      <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute top-1/4 left-0 right-0 border-t border-dashed border-border/30" />
                        <div className="absolute top-2/4 left-0 right-0 border-t border-dashed border-border/30" />
                        <div className="absolute top-3/4 left-0 right-0 border-t border-dashed border-border/30" />
                      </div>
                      {/* Center percentage */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-lg font-bold drop-shadow-sm" style={{ color: fill >= 60 ? "#fff" : "hsl(var(--foreground))" }}>
                          {Math.round(fill * 10) / 10}%
                        </span>
                      </div>
                    </div>
                    {/* Label */}
                    <div className="text-center">
                      <p className="text-sm font-medium">{comp.label}</p>
                      {comp.wasteCount && comp.wasteCount > 0 && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {comp.wasteCount} item{comp.wasteCount !== 1 ? "s" : ""}
                        </p>
                      )}
                      {/* Mini fill bar */}
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
