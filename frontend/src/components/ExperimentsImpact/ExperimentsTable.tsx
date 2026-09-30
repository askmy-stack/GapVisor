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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TrendingUp } from "lucide-react";
import { useState } from "react";

import type { Experiment } from "@/data/experiments-impact";

interface ExperimentsTableProps {
  experiments: Experiment[];
  /** Name of the experiment the deep dive charts on this page describe. */
  featuredName?: string;
  onOpenFeatured?: () => void;
}

export default function ExperimentsTable({ experiments, featuredName, onOpenFeatured }: ExperimentsTableProps) {
  const [selected, setSelected] = useState<Experiment | null>(null);
  const measured = (exp: Experiment) => exp.lift !== "" && exp.lift !== "—";

  return (
    <div className="rounded-md border bg-card overflow-x-auto">
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
                {measured(exp) ? (
                  <span className="flex items-center justify-end">
                    <TrendingUp className="mr-1 h-3 w-3" />
                    {exp.lift}
                  </span>
                ) : (
                  <span className="text-muted-foreground font-normal">Not measured yet</span>
                )}
              </TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="sm" onClick={() => setSelected(exp)}>
                  View impact
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={selected !== null} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>{selected?.name}</DialogTitle>
            <DialogDescription>
              {selected?.type} started {selected?.date}. Status: {selected?.status}.
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                { label: "Baseline", value: selected.baseline },
                { label: "Current", value: selected.current },
                { label: "Lift", value: measured(selected) ? selected.lift : "Not measured yet" },
              ].map((m) => (
                <div key={m.label} className="rounded-lg border p-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{m.label}</p>
                  <p className="text-lg font-bold tabular-nums mt-1">{m.value}</p>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground">Share of AI answers that recommend your brand, across monitored models.</p>
          {selected && selected.name === featuredName && onOpenFeatured && (
            <DialogFooter>
              <Button
                onClick={() => {
                  setSelected(null);
                  onOpenFeatured();
                }}
              >
                See the full deep dive
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}