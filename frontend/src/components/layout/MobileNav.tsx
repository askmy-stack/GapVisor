import { Link, useLocation } from "react-router-dom";
import { LogOut, Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { navItems } from "@/components/layout/nav-items";
import { Logo } from "@/components/layout/Logo";
import { useState } from "react";
import { useAccount } from "@/components/layout/use-account";

export default function MobileNav() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const { name, email, signOut } = useAccount();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden shrink-0" aria-label="Open navigation">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[260px] p-0 flex flex-col bg-sidebar text-sidebar-foreground border-sidebar-border">
        <div className="flex items-center px-4 h-16 border-b border-sidebar-border">
          <Logo variant="dark" size="sm" />
        </div>
        <nav className="flex-1 overflow-y-auto p-2.5 space-y-1">
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
        <div className="border-t border-sidebar-border p-2.5">
          <div className="px-3 py-2 min-w-0">
            <p className="text-sm font-medium text-sidebar-accent-foreground truncate">{name}</p>
            <p className="text-xs text-sidebar-foreground/60 truncate">{email}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              void signOut();
            }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent/60"
          >
            <LogOut className="h-[18px] w-[18px] shrink-0" />
            Sign out
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}