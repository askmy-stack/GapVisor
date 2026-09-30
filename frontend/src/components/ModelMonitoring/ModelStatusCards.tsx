import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, PlugZap, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { LineChart, Line, ResponsiveContainer } from "recharts";

import {
  modelStatus as data,
  modelSparkline as mockSparkline,
} from "@/data/model-monitoring";
import { cn } from "@/lib/utils";

function StatusBadge({ status }: { status: string }) {
  const base = "h-5 shrink-0 gap-1 px-1.5 text-[10px] font-semibold whitespace-nowrap";
  if (status === "Healthy") {
    return (
      <Badge variant="secondary" className={base}>
        <CheckCircle2 className="w-3 h-3" />
        {status}
      </Badge>
    );
  }
  if (status === "Not connected") {
    // A setup state, not an error: keep it quiet.
    return (
      <Badge variant="outline" className={cn(base, "text-muted-foreground font-medium")}>
        <PlugZap className="w-3 h-3" />
        {status}
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className={cn(base, "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400")}
    >
      <AlertTriangle className="w-3 h-3" />
      {status}
    </Badge>
  );
}

export function ModelStatusCards() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {data.map((model) => {
        const notConnected = model.status === "Not connected";
        return (
          <Card key={model.name} className="overflow-hidden">
            <CardContent className="p-4 h-full flex flex-col">
              <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5 mb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 shrink-0 rounded-md bg-primary/10 flex items-center justify-center font-bold text-xs text-primary">
                    {model.badge}
                  </div>
                  <span className="font-medium text-sm truncate" title={model.name}>{model.name}</span>
                </div>
                <StatusBadge status={model.status} />
              </div>

              {notConnected ? (
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Brand Inclusion</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Connect your own AI API key to measure this model.
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Brand Inclusion</p>
                  <div className="flex items-end justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold">{model.inclusion}</span>
                      {model.trend === "up" && <TrendingUp className="w-4 h-4 text-emerald-500" />}
                      {model.trend === "down" && <TrendingDown className="w-4 h-4 text-destructive" />}
                      {model.trend === "stable" && <Minus className="w-4 h-4 text-muted-foreground" />}
                    </div>
                    <div className="w-16 h-8 shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={mockSparkline}>
                          <Line
                            type="monotone"
                            dataKey="value"
                            stroke={model.status === "Healthy" ? "hsl(var(--primary))" : "hsl(var(--destructive))"}
                            strokeWidth={2}
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2">Last scan: {model.lastScan}</p>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
