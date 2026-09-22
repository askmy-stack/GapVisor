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

export function ComplianceSettings() {
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
            <Select defaultValue="24">
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
            <Select defaultValue="pdf">
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">PDF (Board-Ready)</SelectItem>
                <SelectItem value="csv">CSV (Raw Data)</SelectItem>
                <SelectItem value="json">JSON (API Style)</SelectItem>
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

        <Button variant="outline" className="w-full">Request Data Export</Button>
      </CardContent>
    </Card>
  );
}