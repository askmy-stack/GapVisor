import { useCallback, useMemo, useRef, type ReactNode } from "react";
import DashboardSidebar from "@/components/layout/DashboardSidebar";
import { AssistantWidget, type AssistantWidgetHandle } from "@/components/Assistant/AssistantWidget";
import { AssistantContext } from "@/components/Assistant/assistant-context";

export default function DashboardShell({ children }: { children: ReactNode }) {
  const assistantRef = useRef<AssistantWidgetHandle>(null);
  const openAssistant = useCallback(() => assistantRef.current?.open(), []);
  const value = useMemo(() => ({ openAssistant }), [openAssistant]);

  return (
    <AssistantContext.Provider value={value}>
      <div className="flex min-h-screen w-full bg-background">
        <DashboardSidebar />
        <div className="flex-1 min-w-0 flex flex-col">{children}</div>
        <AssistantWidget ref={assistantRef} />
      </div>
    </AssistantContext.Provider>
  );
}
