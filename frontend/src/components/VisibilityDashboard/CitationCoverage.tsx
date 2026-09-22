import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TrendingUp, TrendingDown, ExternalLink } from "lucide-react";

import { citationSources as sources } from "@/data/visibility-dashboard";

export function CitationCoverage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Citation Coverage by Source</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-[200px]">Source Domain</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Citations</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sources.map((source) => (
                <TableRow key={source.domain}>
                  <TableCell className="font-medium py-3">
                    <div className="flex items-center gap-2">
                      <span className="truncate max-w-[120px] sm:max-w-none">{source.domain}</span>
                      <ExternalLink className="h-3 w-3 text-muted-foreground" />
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">{source.category}</TableCell>
                  <TableCell className="text-right font-medium">
                    <div className="flex items-center justify-end gap-2">
                      {source.count}
                      {source.trend === "up" && <TrendingUp className="h-3 w-3 text-emerald-500" />}
                      {source.trend === "down" && <TrendingDown className="h-3 w-3 text-red-500" />}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full ${source.trend === 'up' ? 'bg-emerald-500' : source.trend === 'down' ? 'bg-red-500' : 'bg-slate-400'}`}
                        style={{ width: `${(source.count / 1240) * 100}%` }}
                      />
                    </div>
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