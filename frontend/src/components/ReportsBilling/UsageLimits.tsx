import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

import { usageLimits as usageData } from "@/data/reports-billing";
export function UsageLimits() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Usage Limits</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {usageData.map((item) => {
          const percentage = (item.current / item.limit) * 100;
          return (
            <div key={item.label} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{item.label}</span>
                <span className="text-muted-foreground">
                  {item.current.toLocaleString()} / {item.limit.toLocaleString()} {item.unit}
                </span>
              </div>
              <Progress value={percentage} className="h-2" />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}