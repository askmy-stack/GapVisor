import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, X, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

import { recentRuns } from "@/data/model-monitoring";

export function RecentRuns() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Recent Monitoring Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Prompt</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Run Time</TableHead>
                <TableHead className="text-center">Brand Mentioned</TableHead>
                <TableHead className="text-center">Position</TableHead>
                <TableHead className="text-center">Citations</TableHead>
                <TableHead>Sentiment</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentRuns.map((run) => (
                <TableRow key={run.id}>
                  <TableCell className="max-w-[250px] truncate font-medium" title={run.prompt}>
                    {run.prompt}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-normal whitespace-nowrap">{run.model}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{run.time}</TableCell>
                  <TableCell className="text-center">
                    {run.mentioned ? (
                      <div className="flex justify-center"><Check className="w-4 h-4 text-emerald-500" /></div>
                    ) : (
                      <div className="flex justify-center"><X className="w-4 h-4 text-destructive" /></div>
                    )}
                  </TableCell>
                  <TableCell className="text-center font-medium">{run.position > 0 ? run.position : "—"}</TableCell>
                  <TableCell className="text-center">{run.citations}</TableCell>
                  <TableCell>
                    <Badge 
                      variant="secondary" 
                      className={`
                        ${run.sentiment === "Positive" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : ""}
                        ${run.sentiment === "Negative" ? "bg-destructive/10 text-destructive" : ""}
                        ${run.sentiment === "Neutral" ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" : ""}
                        ${run.sentiment === "N/A" ? "bg-muted text-muted-foreground" : ""}
                      `}
                    >
                      {run.sentiment}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="h-8 gap-1">
                      View <ExternalLink className="w-3 h-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}