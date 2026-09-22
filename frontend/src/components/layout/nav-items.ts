import {
  LayoutDashboard,
  Library,
  Radar,
  MessagesSquare,
  Swords,
  FileStack,
  FlaskConical,
  Settings,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
}

/**
 * Navigation destinations, shared by the desktop sidebar and the mobile nav.
 *
 * Lives outside the components so both can import it without breaking React
 * Fast Refresh, which requires a module to export only components.
 *
 * Every route registered in src/App.tsx must appear here.
 */
export const navItems: NavItem[] = [
  { label: "Visibility Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { label: "Prompt Library", to: "/prompts", icon: Library },
  { label: "Model Monitoring", to: "/monitoring", icon: Radar },
  { label: "Answer Analysis", to: "/answers", icon: MessagesSquare },
  { label: "Competitor Intelligence", to: "/competitors", icon: Swords },
  { label: "Content Recommendations", to: "/recommendations", icon: FileStack },
  { label: "Experiments & Impact", to: "/experiments", icon: FlaskConical },
  { label: "Reports & Billing", to: "/billing", icon: Settings },
];
