import { useNavigate } from "react-router-dom";
import { ChevronsUpDown, CreditCard, LogOut } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useAccount } from "@/components/layout/use-account";

interface AccountMenuProps {
  /** "sidebar" renders the full identity block, "topbar" an avatar button. */
  variant: "sidebar" | "topbar";
  collapsed?: boolean;
  className?: string;
}

export function AccountMenu({ variant, collapsed = false, className }: AccountMenuProps) {
  const navigate = useNavigate();
  const { name, email, workspace, initials, isDemo, signOut } = useAccount();

  const trigger =
    variant === "sidebar" ? (
      <button
        type="button"
        aria-label={`Account menu for ${name}`}
        title={collapsed ? name : undefined}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-sidebar-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
          collapsed && "justify-center px-0",
          className,
        )}
      >
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarFallback className="bg-sidebar-primary/20 text-sidebar-primary font-semibold">{initials}</AvatarFallback>
        </Avatar>
        {!collapsed && (
          <>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-sidebar-accent-foreground truncate">{name}</p>
              <p className="text-xs text-sidebar-foreground/60 truncate">{email}</p>
            </div>
            <ChevronsUpDown className="h-4 w-4 shrink-0 text-sidebar-foreground/60" />
          </>
        )}
      </button>
    ) : (
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Account menu for ${name}`}
        className={cn("rounded-full", className)}
      >
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-primary/20 text-foreground text-xs font-semibold">{initials}</AvatarFallback>
        </Avatar>
      </Button>
    );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent
        align={variant === "sidebar" ? "start" : "end"}
        side={variant === "sidebar" ? "top" : "bottom"}
        className="w-60"
      >
        <DropdownMenuLabel className="font-normal">
          <p className="text-sm font-medium text-foreground truncate">{name}</p>
          <p className="text-xs text-muted-foreground truncate">{email}</p>
          {(workspace || isDemo) && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {workspace ?? "Sample data, not a live workspace"}
            </p>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate("/billing")} className="gap-2">
          <CreditCard className="h-4 w-4" /> Reports and billing
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void signOut()} className="gap-2">
          <LogOut className="h-4 w-4" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
