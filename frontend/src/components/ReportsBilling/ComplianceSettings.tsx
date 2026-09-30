import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ShieldCheck, Lock, Globe } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { downloadCsv, downloadJson } from "@/lib/download";
import { prompts } from "@/data/prompt-library";
import { answers } from "@/data/answer-analysis";
import { kpis, alerts, competitorSov } from "@/data/visibility-dashboard";
import { recommendations } from "@/data/content-recommendations";
import { teamMembers } from "@/data/reports-billing";

const DEMO_NOTE = "Demo mode: saved for this session only.";

export function ComplianceSettings() {
  const [retention, setRetention] = useState("24");
  const [format, setFormat] = useState("json");

  function exportData() {
    const stamp = new Date().toISOString().slice(0, 10);
    if (format === "csv") {
      downloadCsv(`gapvisor-prompts-${stamp}.csv`, prompts.map((p) => ({ ...p })));
      toast.success("Prompt data exported as CSV", {
        description: "Sample data from this browser. Full workspace exports arrive once the API is connected.",
      });
      return;
    }
    downloadJson(`gapvisor-data-export-${stamp}.json`, {
      exportedAt: new Date().toISOString(),
      note: "Sample data from GapVisor demo mode.",
      prompts,
      answers,
      kpis,
      alerts,
      competitorSov,
      recommendations,
      teamMembers,
    });
    toast.success("Data exported as JSON", {
      description:
        format === "pdf"
          ? "PDF exports need the API, so this export used JSON. It contains the sample data in this browser."
          : "It contains the sample data in this browser. Full workspace exports arrive once the API is connected.",
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Data Retention & Compliance</CardTitle>
        <CardDescription>Manage your data storage policies and compliance standards.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-3 border-b">
            <div className="space-y-0.5">
              <div className="text-sm font-medium">Data Retention Period</div>
              <div className="text-xs text-muted-foreground">How long your monitoring data is stored.</div>
            </div>
            <Select
              value={retention}
              onValueChange={(v) => {
                setRetention(v);
                toast(`Retention set to ${v} months`, { description: DEMO_NOTE });
              }}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="12">12 Months</SelectItem>
                <SelectItem value="24">24 Months</SelectItem>
                <SelectItem value="36">36 Months</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-3 border-b">
            <div className="space-y-0.5">
              <div className="text-sm font-medium">Export Format Defaults</div>
              <div className="text-xs text-muted-foreground">Default file format for all manual exports.</div>
            </div>
            <Select value={format} onValueChange={setFormat}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">PDF (board ready)</SelectItem>
                <SelectItem value="csv">CSV (Raw Data)</SelectItem>
                <SelectItem value="json">JSON (API style)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 py-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-secondary/50 border">
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-semibold">SOC 2 Type II (roadmap)</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-secondary/50 border">
            <Lock className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-semibold">US-hosted · privacy safeguards</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-secondary/50 border">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-semibold">No EU residency claim (v1)</span>
          </div>
        </div>

        <Button variant="outline" className="w-full" onClick={exportData}>Export data</Button>
      </CardContent>
    </Card>
  );
}