'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface Compartment {
  id: string;
  label: string;
  currentFillLevel: number;
  compartmentIndex: number;
}

interface BinCompartmentPieChartProps {
  compartments: Compartment[];
  binName: string;
}

export function BinCompartmentPieChart({
  compartments,
  binName,
}: BinCompartmentPieChartProps) {
  // Prepare data for pie chart - show fill % for each compartment
  const chartData = compartments.map((comp) => ({
    name: comp.label,
    value: Math.round(comp.currentFillLevel * 10) / 10, // Round to 1 decimal
    fill: getCompartmentColor(comp.compartmentIndex),
  }));

  const totalFill = chartData.reduce((sum, item) => sum + item.value, 0);
  const avgFill = Math.round((totalFill / compartments.length) * 10) / 10;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Fill Levels</CardTitle>
        <CardDescription>
          Average fill: <span className="font-semibold text-foreground">{avgFill}%</span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => [`${value}%`, 'Fill Level']}
                contentStyle={{
                  backgroundColor: 'rgba(0, 0, 0, 0.8)',
                  border: 'none',
                  borderRadius: '0.5rem',
                  color: '#fff',
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Compartment breakdown table */}
        <div className="mt-6 space-y-2">
          {compartments.map((comp) => (
            <div
              key={comp.id}
              className="flex items-center justify-between rounded-lg border p-3"
            >
              <div className="flex items-center gap-3">
                <div
                  className="h-4 w-4 rounded-full"
                  style={{
                    backgroundColor: getCompartmentColor(comp.compartmentIndex),
                  }}
                />
                <span className="font-medium">{comp.label}</span>
              </div>
              <span className="text-sm font-semibold">
                {Math.round(comp.currentFillLevel * 10) / 10}%
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Get color for compartment based on index
 * Maps to typical bin categories
 */
function getCompartmentColor(index: number): string {
  const colors = [
    '#3b82f6', // Blue - Recycle
    '#10b981', // Green - Organic
    '#f59e0b', // Amber - Mixed
    '#ef4444', // Red - General Waste
  ];
  return colors[index % colors.length];
}
