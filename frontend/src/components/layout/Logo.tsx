import { Radio } from "lucide-react";
import { cn } from "@/lib/utils";

interface LogoProps {
  /** "dark" for the black sidebar/nav surfaces, "light" for pages on --background. */
  variant?: "light" | "dark";
  size?: "sm" | "md";
  showWordmark?: boolean;
  className?: string;
}

const MARK_SIZE = { sm: "h-8 w-8", md: "h-9 w-9" };
const ICON_SIZE = { sm: "h-4 w-4", md: "h-4.5 w-4.5" };
const WORD_SIZE = { sm: "text-[15px]", md: "text-xl" };

/** The one GapVisor mark, reused everywhere the brand appears. */
export function Logo({ variant = "light", size = "md", showWordmark = true, className }: LogoProps) {
  const onDark = variant === "dark";
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div
        className={cn(
          "rounded-lg flex items-center justify-center shrink-0",
          MARK_SIZE[size],
          onDark ? "bg-sidebar-primary" : "bg-primary",
        )}
      >
        <Radio
          className={cn(ICON_SIZE[size], onDark ? "text-sidebar-primary-foreground" : "text-primary-foreground")}
          strokeWidth={2.5}
        />
      </div>
      {showWordmark && (
        <span
          className={cn(
            "font-display font-semibold tracking-tight",
            WORD_SIZE[size],
            onDark ? "text-sidebar-accent-foreground" : "text-foreground",
          )}
        >
          Gap<span className={onDark ? "text-sidebar-primary" : "text-primary"}>Visor</span>
        </span>
      )}
    </div>
  );
}
