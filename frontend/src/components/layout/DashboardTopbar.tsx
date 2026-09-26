import { Search, Bell, HelpCircle, Plus, WifiOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import MobileNav from "@/components/layout/MobileNav";
import { useAuth } from "@/auth/AuthProvider";
import { cn } from "@/lib/utils";

interface DashboardTopbarProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

export default function DashboardTopbar({ title, description, actions, className }: DashboardTopbarProps) {
  const { liveApi } = useAuth();

  return (
    <header
      className={cn(
        "sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border",
        className
      )}
    >
      {!liveApi && (
        <div className="flex items-center gap-1.5 h-7 px-4 sm:px-6 text-xs font-medium bg-amber-500/15 text-amber-600 dark:text-amber-400 border-b border-amber-500/30">
          <WifiOff className="h-3.5 w-3.5" />
          Demo mode — showing static sample data, not your live workspace
        </div>
      )}
      <div className="flex items-center gap-3 h-16 px-4 sm:px-6">
        <MobileNav />
        <div className="min-w-0 flex-1 flex items-center gap-2">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-semibold tracking-tight text-foreground truncate">{title}</h1>
            {description && (
              <p className="hidden sm:block text-xs text-muted-foreground truncate">{description}</p>
            )}
          </div>
          {!liveApi && (
            <Badge
              variant="outline"
              className="hidden sm:inline-flex shrink-0 border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400"
            >
              Demo
            </Badge>
          )}
        </div>

        <div className="hidden md:flex items-center relative w-64 lg:w-80">
          <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search prompts, competitors, pages..." className="pl-9 h-9 bg-secondary/60 border-transparent focus-visible:bg-background" />
        </div>

        <Button variant="ghost" size="icon" className="hidden sm:inline-flex text-muted-foreground">
          <HelpCircle className="h-[18px] w-[18px]" />
        </Button>
        <Button variant="ghost" size="icon" className="relative text-muted-foreground">
          <Bell className="h-[18px] w-[18px]" />
          <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-destructive" />
        </Button>
        {actions ?? (
          <Button size="sm" className="hidden sm:inline-flex gap-1.5">
            <Plus className="h-4 w-4" /> New Prompt Set
          </Button>
        )}
      </div>
    </header>
  );
}