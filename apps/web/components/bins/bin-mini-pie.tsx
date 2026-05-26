"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444"];

export function BinMiniPie({ compartments }: { compartments: { label: string; current_fill_level: number; compartment_index: number }[] }) {
  const data = compartments.map((c) => ({
    name: c.label,
    value: Math.max(c.current_fill_level, 1),
    color: COLORS[c.compartment_index % COLORS.length],
  }));

  if (data.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      <div className="h-8 w-8 flex-shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={8}
              outerRadius={14}
              dataKey="value"
              strokeWidth={0}
            >
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground">
        {data.map((d) => (
          <span key={d.name} className="flex items-center gap-1">
            <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: d.color }} />
            {d.name}
          </span>
        ))}
      </div>
    </div>
  );
}
