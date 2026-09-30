import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { alertIcons, alertStyles } from "@/data/visibility-dashboard";
import { useAlertReadState } from "@/data/visibility-dashboard/alerts-store";
import { cn } from "@/lib/utils";

const INITIAL_VISIBLE = 4;

export function AlertsPanel() {
  const { alerts, isRead, unreadCount, markRead, markAllRead } = useAlertReadState();
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? alerts : alerts.slice(0, INITIAL_VISIBLE);

  return (
    <Card id="alerts">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold">
          Alerts & Major Changes
          {unreadCount > 0 && (
            <span className="ml-2 text-xs font-normal text-muted-foreground">{unreadCount} unread</span>
          )}
        </CardTitle>
        <Button variant="ghost" size="sm" className="text-xs" onClick={markAllRead} disabled={unreadCount === 0}>
          Mark all as read
        </Button>
      </CardHeader>
      <CardContent className="px-0">
        <div className="divide-y border-t">
          {visible.map((alert) => {
            const AlertIcon = alertIcons[alert.severity];
            const style = alertStyles[alert.id];
            const read = isRead(alert.id);
            return (
              <button
                type="button"
                key={alert.id}
                onClick={() => markRead(alert.id)}
                aria-label={read ? alert.title : `${alert.title}. Mark as read`}
                className="flex w-full items-start gap-4 p-4 text-left hover:bg-muted/50 transition-colors"
              >
                <div className={cn("p-2 rounded-full mt-0.5", style?.bg)}>
                  <AlertIcon className={cn("h-4 w-4", style?.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <Badge variant={alert.severity === 'critical' ? 'destructive' : alert.severity === 'warning' ? 'secondary' : 'outline'} className="capitalize text-[10px] h-4">
                      {alert.severity}
                    </Badge>
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap">
                      {!read && <span className="h-2 w-2 rounded-full bg-primary" aria-hidden="true" />}
                      {alert.timestamp}
                    </span>
                  </div>
                  <p className={cn("text-sm line-clamp-2", read ? "text-muted-foreground" : "font-medium text-foreground")}>
                    {alert.title}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
        {alerts.length > INITIAL_VISIBLE && (
          <div className="p-3 text-center border-t">
            <Button
              variant="link"
              size="sm"
              className="text-xs text-muted-foreground"
              onClick={() => setShowAll((v) => !v)}
              aria-expanded={showAll}
            >
              {showAll ? "Show recent alerts only" : `View all historical alerts (${alerts.length})`}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
