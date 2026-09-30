import { useState } from "react";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, Clock, ArrowRight } from "lucide-react";

import { scheduledRuns as initialRuns, type ScheduledRun } from "@/data/prompt-library";

const FREQUENCIES = ["Daily", "Weekly", "Biweekly", "Monthly", "Paused"];

export default function ScheduledRuns() {
  const [runs, setRuns] = useState<ScheduledRun[]>(initialRuns);
  const [editing, setEditing] = useState<ScheduledRun | null>(null);
  const [frequency, setFrequency] = useState("Daily");
  const activeCount = runs.filter((r) => r.frequency !== "Paused").length;

  function openManage(run: ScheduledRun) {
    setEditing(run);
    setFrequency(FREQUENCIES.includes(run.frequency) ? run.frequency : "Daily");
  }

  function save() {
    if (!editing) return;
    setRuns((prev) => prev.map((r) => (r.id === editing.id ? { ...r, frequency } : r)));
    toast.success(`${editing.name} set to ${frequency.toLowerCase()}`, {
      description: "Demo mode: saved for this session only. Schedules save to your workspace once the API is connected.",
    });
    setEditing(null);
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between py-4">
        <CardTitle className="text-base font-semibold">Scheduled Runs</CardTitle>
        <Badge variant="secondary" className="font-normal">
          {activeCount} active
        </Badge>
      </CardHeader>
      <CardContent className="px-0">
        <div className="divide-y divide-border">
          {runs.map((run) => (
            <div key={run.id} className="px-6 py-4 hover:bg-muted/30 transition-colors">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h4 className="text-sm font-medium min-w-0">{run.name}</h4>
                <Badge variant="outline" className="text-[10px] uppercase font-bold py-0 h-5 whitespace-nowrap">
                  {run.frequency}
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3 w-3" />
                  {run.frequency === "Paused" ? "Not scheduled" : run.nextRun}
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3 w-3" />
                  {run.models.length} Models
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div className="flex -space-x-1.5">
                  {run.models.slice(0, 3).map((m, i) => (
                    <div key={i} title={m} className="h-5 w-5 rounded-full bg-secondary border border-background flex items-center justify-center text-[8px] font-bold">
                      {m.charAt(0)}
                    </div>
                  ))}
                  {run.models.length > 3 && (
                    <div className="h-5 w-5 rounded-full bg-muted border border-background flex items-center justify-center text-[8px] font-bold">
                      +{run.models.length - 3}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => openManage(run)}
                  className="text-primary text-xs font-medium flex items-center gap-1 hover:underline"
                  aria-label={`Manage ${run.name}`}
                >
                  Manage <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Manage schedule</DialogTitle>
            <DialogDescription>
              {editing?.name}: runs on {editing?.models.join(", ")}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-2">
            <Label htmlFor="schedule-frequency">Frequency</Label>
            <Select value={frequency} onValueChange={setFrequency}>
              <SelectTrigger id="schedule-frequency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FREQUENCIES.map((f) => (
                  <SelectItem key={f} value={f}>{f}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="button" onClick={save}>Save schedule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
