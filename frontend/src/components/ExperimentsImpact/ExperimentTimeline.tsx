import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock } from "lucide-react";

import { timeline, timelineIcons, timelineColors } from "@/data/experiments-impact";
export default function ExperimentTimeline() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Experiment Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative space-y-6 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
          {timeline.map((item, i) => {
          const StepIcon = timelineIcons[item.id];
          return (
            <div key={i} className="relative flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="absolute left-0 flex h-10 w-10 items-center justify-center rounded-full border bg-card ring-8 ring-background">
                  <StepIcon className={`h-4 w-4 ${timelineColors[item.id]}`} />
                </div>
                <div className="ml-12">
                  <h4 className="text-sm font-semibold">{item.event}</h4>
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Clock className="mr-1 h-3 w-3" />
                    {item.date}
                  </div>
                </div>
              </div>
            </div>
          );
          })}
        </div>
      </CardContent>
    </Card>
  );
}