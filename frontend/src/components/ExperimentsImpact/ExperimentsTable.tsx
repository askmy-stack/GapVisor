import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp } from "lucide-react";

import { experiments } from "@/data/experiments-impact";
export default function ExperimentsTable() {
  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Experiment Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Start Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Baseline</TableHead>
            <TableHead className="text-right">Current</TableHead>
            <TableHead className="text-right">Lift</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {experiments.map((exp) => (
            <TableRow key={exp.name}>
              <TableCell className="font-medium">{exp.name}</TableCell>
              <TableCell>
                <Badge variant="secondary" className="font-normal">
                  {exp.type}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">{exp.date}</TableCell>
              <TableCell>
                <Badge
                  variant={
                    exp.status === "Running"
                      ? "default"
                      : exp.status === "Completed"
                      ? "outline"
                      : "secondary"
                  }
                  className={
                    exp.status === "Running" ? "bg-accent/10 text-accent border-accent/20" : ""
                  }
                >
                  {exp.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right tabular-nums">{exp.baseline}</TableCell>
              <TableCell className="text-right tabular-nums font-semibold">
                {exp.current}
              </TableCell>
              <TableCell className="text-right tabular-nums text-accent font-bold">
                <span className="flex items-center justify-end">
                  <TrendingUp className="mr-1 h-3 w-3" />
                  {exp.lift}
                </span>
              </TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="sm">
                  View Impact
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}