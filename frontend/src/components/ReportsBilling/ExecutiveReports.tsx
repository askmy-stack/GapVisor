import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Download, Clock } from "lucide-react";

import { reportTypes, recentExports, reportTypeIcons } from "@/data/reports-billing";
export function ExecutiveReports() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Executive Reports</CardTitle>
        <CardDescription>Generate and download automated executive-level reports.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {reportTypes.map((report) => {
            const ReportIcon = reportTypeIcons[report.id];
            return (
            <div key={report.title} className="flex flex-col p-4 rounded-lg border bg-card text-card-foreground">
              <ReportIcon className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-semibold text-sm mb-1">{report.title}</h3>
              <p className="text-xs text-muted-foreground mb-4 flex-1">{report.description}</p>
              <Button size="sm" variant="outline" className="w-full">Generate Report</Button>
            </div>
            );
          })}
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Clock className="h-4 w-4" />
            <span>Recent Exports</span>
          </div>
          <div className="space-y-2">
            {recentExports.map((exportItem) => (
              <div key={exportItem.name} className="flex items-center justify-between p-3 rounded-md border bg-secondary/20">
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <div className="flex flex-col">
                    <span className="text-xs font-medium">{exportItem.name}</span>
                    <span className="text-[10px] text-muted-foreground">{exportItem.date} • {exportItem.size}</span>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}