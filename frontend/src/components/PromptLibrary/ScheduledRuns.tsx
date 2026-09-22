import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, ArrowRight } from "lucide-react";

import { scheduledRuns } from "@/data/prompt-library";

export default function ScheduledRuns() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between py-4">
        <CardTitle className="text-base font-semibold">Scheduled Runs</CardTitle>
        <Badge variant="secondary" className="font-normal">
          8 Active
        </Badge>
      </CardHeader>
      <CardContent className="px-0">
        <div className="divide-y divide-border">
          {scheduledRuns.map((run) => (
            <div key={run.id} className="px-6 py-4 hover:bg-muted/30 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <h4 className="text-sm font-medium">{run.name}</h4>
                <Badge variant="outline" className="text-[10px] uppercase font-bold py-0 h-5">
                  {run.frequency}
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3 w-3" />
                  {run.nextRun}
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3 w-3" />
                  {run.models.length} Models
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div className="flex -space-x-1.5">
                  {run.models.slice(0, 3).map((m, i) => (
                    <div key={i} className="h-5 w-5 rounded-full bg-secondary border border-background flex items-center justify-center text-[8px] font-bold">
                      {m.charAt(0)}
                    </div>
                  ))}
                  {run.models.length > 3 && (
                    <div className="h-5 w-5 rounded-full bg-muted border border-background flex items-center justify-center text-[8px] font-bold">
                      +{run.models.length - 3}
                    </div>
                  )}
                </div>
                <button className="text-primary text-xs font-medium flex items-center gap-1 hover:underline">
                  Manage <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}