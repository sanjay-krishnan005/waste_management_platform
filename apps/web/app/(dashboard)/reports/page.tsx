"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function ReportsPage() {
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly">("weekly");
  const [loading, setLoading] = useState(false);

  async function exportReport(format: "csv" | "pdf") {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/export?period=${period}&format=${format}`);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sortyx-report-${period}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert("Export failed. Ensure you are logged in and Supabase is configured.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Reports</h1>
        <p className="text-muted-foreground">Generate and export bin performance reports</p>
      </div>
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Export report</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Period</Label>
            <Select value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-3">
            <Button disabled={loading} onClick={() => exportReport("csv")}>
              Export CSV
            </Button>
            <Button variant="outline" disabled={loading} onClick={() => exportReport("pdf")}>
              Export PDF
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
