import { useState } from "react";
import { Link } from "react-router-dom";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { alertIcons, alertStyles } from "@/data/visibility-dashboard";
import { useAlertReadState } from "@/data/visibility-dashboard/alerts-store";
import { cn } from "@/lib/utils";

export function NotificationsPopover() {
  const [open, setOpen] = useState(false);
  const { alerts, isRead, unreadCount, markRead, markAllRead } = useAlertReadState();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-muted-foreground"
          aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
        >
          <Bell className="h-[18px] w-[18px]" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-destructive" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[calc(100vw-2rem)] max-w-sm p-0">
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b">
          <div>
            <p className="text-sm font-semibold text-foreground">Notifications</p>
            <p className="text-xs text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={markAllRead}
            disabled={unreadCount === 0}
          >
            Mark all as read
          </Button>
        </div>
        <ul className="max-h-80 overflow-y-auto divide-y">
          {alerts.map((alert) => {
            const Icon = alertIcons[alert.severity];
            const style = alertStyles[alert.id];
            const read = isRead(alert.id);
            return (
              <li key={alert.id}>
                <Link
                  to="/dashboard"
                  onClick={() => {
                    markRead(alert.id);
                    setOpen(false);
                  }}
                  className="flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
                >
                  <div className={cn("p-1.5 rounded-full mt-0.5 shrink-0", style?.bg)}>
                    <Icon className={cn("h-3.5 w-3.5", style?.color)} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "text-sm line-clamp-2",
                        read ? "text-muted-foreground" : "font-medium text-foreground",
                      )}
                    >
                      {alert.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{alert.timestamp}</p>
                  </div>
                  {!read && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />}
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="border-t p-2 text-center">
          <Button variant="link" size="sm" className="text-xs text-muted-foreground" asChild>
            <Link to="/dashboard" onClick={() => setOpen(false)}>
              Open alerts on the dashboard
            </Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
