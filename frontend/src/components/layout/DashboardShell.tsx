import type { ReactNode } from "react";
import DashboardSidebar from "@/components/layout/DashboardSidebar";

export default function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen w-full bg-background">
      <DashboardSidebar />
      <div className="flex-1 min-w-0 flex flex-col">{children}</div>
    </div>
  );
}