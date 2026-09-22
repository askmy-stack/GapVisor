import { Link, useLocation } from "react-router-dom";
import { Menu, Radio } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { navItems } from "@/components/layout/nav-items";
import { useState } from "react";

export default function MobileNav() {
  const location = useLocation();
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden shrink-0">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[260px] p-0 bg-sidebar text-sidebar-foreground border-sidebar-border">
        <div className="flex items-center gap-2 px-4 h-16 border-b border-sidebar-border">
          <div className="h-8 w-8 rounded-lg bg-sidebar-primary flex items-center justify-center shrink-0">
            <Radio className="h-4.5 w-4.5 text-sidebar-primary-foreground" strokeWidth={2.5} />
          </div>
          <span className="font-semibold tracking-tight text-sidebar-accent-foreground text-[15px]">
            Gap<span className="text-sidebar-primary">Visor</span>
          </span>
        </div>
        <nav className="p-2.5 space-y-1">
          {navItems.map((item) => {
            const active = location.pathname === item.to;
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/60"
                )}
              >
                <Icon className={cn("h-[18px] w-[18px] shrink-0", active && "text-sidebar-primary")} />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}