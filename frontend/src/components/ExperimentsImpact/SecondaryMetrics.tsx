import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight } from "lucide-react";

import { secondaryMetrics as metrics } from "@/data/experiments-impact";
export default function SecondaryMetrics() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((m) => (
        <Card key={m.label} className="bg-muted/30">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground mb-2">{m.label}</p>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-lg font-bold tabular-nums">{m.after}</p>
                <p className="text-[10px] text-muted-foreground">from {m.before}</p>
              </div>
              <Badge variant="secondary" className="bg-accent/10 text-accent border-transparent text-[10px] h-5 px-1.5">
                <ArrowUpRight className="h-2.5 w-2.5 mr-0.5" />
                {m.delta}
              </Badge>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}