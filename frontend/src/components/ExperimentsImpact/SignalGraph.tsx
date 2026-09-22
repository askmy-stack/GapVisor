import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, ChevronDown } from "lucide-react";

import { signalStages as stages } from "@/data/experiments-impact";
export default function SignalGraph() {
  return (
    <Card className="w-full overflow-hidden">
      <CardHeader>
        <CardTitle className="text-base font-semibold">Longitudinal Signal Graph</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4 lg:gap-2">
          {stages.map((stage, i) => (
            <div key={stage.label} className="flex flex-col lg:flex-row items-center flex-1 w-full">
              <div className="flex flex-col items-center justify-center p-3 rounded-lg border bg-card w-full lg:w-32 text-center">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1">
                  {stage.label}
                </p>
                <p className="text-lg font-bold tabular-nums">{stage.metric}</p>
                <p className="text-[10px] text-muted-foreground">{stage.desc}</p>
              </div>
              {i < stages.length - 1 && (
                <div className="flex items-center justify-center lg:flex-1 py-2 lg:py-0">
                  <ArrowRight className="hidden lg:block h-4 w-4 text-muted-foreground/40" />
                  <ChevronDown className="lg:hidden h-4 w-4 text-muted-foreground/40" />
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}