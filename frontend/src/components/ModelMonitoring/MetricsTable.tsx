import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

import { metrics } from "@/data/model-monitoring";

export function MetricsTable() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Model Performance Comparison</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[150px]">Model</TableHead>
                <TableHead className="text-right">Brand Inclusion %</TableHead>
                <TableHead className="text-right">Avg. Position</TableHead>
                <TableHead className="text-right">Citation Rate</TableHead>
                <TableHead className="text-right">Positive Sentiment %</TableHead>
                <TableHead className="text-right">Total Runs</TableHead>
                <TableHead className="text-right">Last Run</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {metrics.map((m) => (
                <TableRow key={m.model}>
                  <TableCell className="font-medium">{m.model}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {m.inclusion}%
                      {m.trend === "up" ? <TrendingUp className="w-3 h-3 text-emerald-500" /> : <TrendingDown className="w-3 h-3 text-destructive" />}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {m.position}
                      {m.position < 2 ? <TrendingUp className="w-3 h-3 text-emerald-500" /> : <Minus className="w-3 h-3 text-muted-foreground" />}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{m.citation}%</TableCell>
                  <TableCell className="text-right">{m.sentiment}%</TableCell>
                  <TableCell className="text-right">{m.runs.toLocaleString()}</TableCell>
                  <TableCell className="text-right text-muted-foreground text-xs">{m.lastRun}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}