import { Card, CardContent } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { summaryKpis as kpis, kpiIcons } from "@/data/experiments-impact";

export default function SummaryKPIs() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi, index) => {
        const KpiIcon = kpiIcons[kpi.id];
        return (
        <Card key={index}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium text-muted-foreground">{kpi.title}</p>
              <KpiIcon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex items-baseline space-x-2">
              <h2 className="text-2xl font-bold">{kpi.value}</h2>
              <span
                className={cn(
                  "text-xs font-medium flex items-center",
                  kpi.trend === "up" ? "text-accent" : "text-destructive"
                )}
              >
                {kpi.trend === "up" ? (
                  <ArrowUpRight className="h-3 w-3 mr-1" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 mr-1" />
                )}
                {kpi.change}
              </span>
            </div>
          </CardContent>
        </Card>
        );
      })}
    </div>
  );
}