import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Search, HelpCircle, Plus, WifiOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import MobileNav from "@/components/layout/MobileNav";
import { AccountMenu } from "@/components/layout/AccountMenu";
import { NotificationsPopover } from "@/components/layout/NotificationsPopover";
import { navItems } from "@/components/layout/nav-items";
import { useAssistant } from "@/components/Assistant/assistant-context";
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
  const { openAssistant } = useAssistant();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  function jumpTo(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    const match = navItems.find((item) => item.label.toLowerCase().includes(q.toLowerCase()));
    if (match) {
      setQuery("");
      navigate(match.to);
    } else {
      toast(`No page matches "${q}"`);
    }
  }

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
          Demo mode: showing static sample data, not your live workspace
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

        <form role="search" onSubmit={jumpTo} className="hidden md:flex items-center relative w-64 lg:w-80">
          <Search className="absolute left-3 h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Jump to a page"
            aria-label="Jump to a page"
            list="gv-jump-pages"
            className="pl-9 h-9 bg-secondary/60 border-transparent focus-visible:bg-background"
          />
          <datalist id="gv-jump-pages">
            {navItems.map((item) => (
              <option key={item.to} value={item.label} />
            ))}
          </datalist>
        </form>

        <Button
          variant="ghost"
          size="icon"
          className="hidden sm:inline-flex text-muted-foreground"
          aria-label="Open help assistant"
          onClick={openAssistant}
        >
          <HelpCircle className="h-[18px] w-[18px]" />
        </Button>
        <NotificationsPopover />
        {actions ?? (
          <Button size="sm" className="hidden sm:inline-flex gap-1.5" onClick={() => navigate("/prompts?new=1")}>
            <Plus className="h-4 w-4" /> New prompt set
          </Button>
        )}
        <AccountMenu variant="topbar" className="lg:hidden" />
      </div>
    </header>
  );
}
