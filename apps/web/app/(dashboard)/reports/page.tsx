"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { FileText, Download, Loader2 } from "lucide-react";
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
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1>Reports</h1>
        <p className="mt-1 text-sm text-muted-foreground">Generate and export bin performance reports</p>
      </div>
      <div className="grid gap-6 md:grid-cols-2 max-w-3xl">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <CardTitle>Export Report</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Period</Label>
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
                {loading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Download className="mr-1.5 h-4 w-4" />}
                Export CSV
              </Button>
              <Button variant="outline" disabled={loading} onClick={() => exportReport("pdf")}>
                {loading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Download className="mr-1.5 h-4 w-4" />}
                Export PDF
              </Button>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Report Info</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>Reports include data for all bins in your organization.</p>
            <ul className="list-disc list-inside text-xs space-y-1">
              <li><strong>Daily</strong>: Last 24 hours</li>
              <li><strong>Weekly</strong>: Last 7 days</li>
              <li><strong>Monthly</strong>: Last 30 days</li>
            </ul>
            <p className="text-xs">CSV includes device ID, location, status, average fill %, and data points. PDF includes formatted tables with alert counts.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
