import { Search, Bell, HelpCircle, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import MobileNav from "@/components/layout/MobileNav";
import { cn } from "@/lib/utils";

interface DashboardTopbarProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

export default function DashboardTopbar({ title, description, actions, className }: DashboardTopbarProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border",
        className
      )}
    >
      <div className="flex items-center gap-3 h-16 px-4 sm:px-6">
        <MobileNav />
        <div className="min-w-0 flex-1">
          <h1 className="text-lg sm:text-xl font-semibold tracking-tight text-foreground truncate">{title}</h1>
          {description && (
            <p className="hidden sm:block text-xs text-muted-foreground truncate">{description}</p>
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