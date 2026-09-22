import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import { alerts, alertIcons, alertStyles } from "@/data/visibility-dashboard";

export function AlertsPanel() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold">Alerts & Major Changes</CardTitle>
        <Button variant="ghost" size="sm" className="text-xs">Mark all as read</Button>
      </CardHeader>
      <CardContent className="px-0">
        <div className="divide-y border-t">
          {alerts.map((alert) => {
            const AlertIcon = alertIcons[alert.severity];
            const style = alertStyles[alert.id];
            return (
            <div key={alert.id} className="flex items-start gap-4 p-4 hover:bg-muted/50 transition-colors cursor-pointer group">
              <div className={`p-2 rounded-full ${style.bg} mt-0.5`}>
                <AlertIcon className={`h-4 w-4 ${style.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <Badge variant={alert.severity === 'critical' ? 'destructive' : alert.severity === 'warning' ? 'secondary' : 'outline'} className="capitalize text-[10px] h-4">
                    {alert.severity}
                  </Badge>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{alert.timestamp}</span>
                </div>
                <p className="text-sm font-medium text-foreground line-clamp-2">{alert.title}</p>
                <div className="flex items-center gap-1 mt-2 text-xs text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  View details <ChevronRight className="h-3 w-3" />
                </div>
              </div>
            </div>
            );
          })}
        </div>
        <div className="p-3 text-center border-t">
          <Button variant="link" size="sm" className="text-xs text-muted-foreground">
            View all historical alerts
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}