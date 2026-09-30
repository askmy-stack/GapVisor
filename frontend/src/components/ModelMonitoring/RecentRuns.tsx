import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, X, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState } from "react";
import { Link } from "react-router-dom";

import { recentRuns } from "@/data/model-monitoring";

type Run = (typeof recentRuns)[number];

export function RecentRuns() {
  const [selected, setSelected] = useState<Run | null>(null);

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
                    <Button variant="ghost" size="sm" className="h-8 gap-1" onClick={() => setSelected(run)} aria-label={`View run: ${run.prompt}`}>
                      View <ExternalLink className="w-3 h-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <Dialog open={selected !== null} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Monitoring run</DialogTitle>
            <DialogDescription>{selected?.prompt}</DialogDescription>
          </DialogHeader>
          {selected && (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <dt className="text-muted-foreground">Model</dt>
              <dd className="font-medium">{selected.model}</dd>
              <dt className="text-muted-foreground">Run time</dt>
              <dd className="font-medium">{selected.time}</dd>
              <dt className="text-muted-foreground">Brand mentioned</dt>
              <dd className="font-medium">{selected.mentioned ? "Yes" : "No"}</dd>
              <dt className="text-muted-foreground">Position</dt>
              <dd className="font-medium">{selected.position > 0 ? `#${selected.position}` : "Not ranked"}</dd>
              <dt className="text-muted-foreground">Citations</dt>
              <dd className="font-medium">{selected.citations}</dd>
              <dt className="text-muted-foreground">Sentiment</dt>
              <dd className="font-medium">{selected.sentiment}</dd>
            </dl>
          )}
          <DialogFooter>
            <Button asChild>
              <Link to="/answers">Open answer analysis</Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}