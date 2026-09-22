import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import DashboardShell from "@/components/layout/DashboardShell";
import DashboardTopbar from "@/components/layout/DashboardTopbar";
import StatsStrip from "@/components/PromptLibrary/StatsStrip";
import PromptFilters from "@/components/PromptLibrary/PromptFilters";
import PromptTable from "@/components/PromptLibrary/PromptTable";
import CreatePromptDialog from "@/components/PromptLibrary/CreatePromptDialog";
import ScheduledRuns from "@/components/PromptLibrary/ScheduledRuns";
import PromptTemplates from "@/components/PromptLibrary/PromptTemplates";
import {
  getAccessToken,
  listPrompts,
  probeApi,
  runPrompt,
  type PromptOut,
} from "@/api/client";
import { useAuth } from "@/auth/AuthProvider";
import { prompts as staticPrompts, type Prompt } from "@/data/prompt-library";

function mapLivePrompts(rows: PromptOut[]): Prompt[] {
  return rows.map((row, index) => {
    const fallback = staticPrompts[index % staticPrompts.length];
    return {
      ...fallback,
      id: row.id,
      text: row.text,
      status: row.status === "active" ? "Active" : "Paused",
      lastRun: "Live API",
    };
  });
}

export default function PromptLibrary() {
  const { user, workspaceId } = useAuth();
  const [runningPromptId, setRunningPromptId] = useState<string | null>(null);
  const canUseLivePrompts = Boolean(user && workspaceId && getAccessToken());

  const livePromptsQuery = useQuery({
    queryKey: ["prompts", workspaceId],
    enabled: canUseLivePrompts,
    queryFn: async () => {
      const live = await probeApi();
      if (!live) return [];
      return listPrompts();
    },
    staleTime: 30_000,
  });

  const prompts = useMemo(() => {
    const rows = livePromptsQuery.data ?? [];
    return rows.length ? mapLivePrompts(rows) : staticPrompts;
  }, [livePromptsQuery.data]);

  const handleRunPrompt = canUseLivePrompts && (livePromptsQuery.data?.length ?? 0) > 0
    ? async (prompt: Prompt) => {
        setRunningPromptId(prompt.id);
        try {
          const live = await probeApi();
          if (!live) {
            toast.message("Backend offline — showing static prompt data.");
            return;
          }
          const answers = await runPrompt(prompt.id);
          toast.success(`Scan complete: ${answers.length} answer${answers.length === 1 ? "" : "s"} created.`);
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unable to run scan";
          toast.error(message);
        } finally {
          setRunningPromptId(null);
        }
      }
    : undefined;

  return (
    <DashboardShell>
      <DashboardTopbar
        title="Prompt Library"
        description="Realistic buyer prompts tracked across AI models"
        actions={<CreatePromptDialog />}
      />

      <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-8 bg-background/50">
        {/* Section 1: Summary Stats */}
        <StatsStrip />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8 space-y-6">
            {/* Section 2: Filters */}
            <div className="bg-card p-4 rounded-xl border shadow-sm">
              <PromptFilters />
            </div>

            {/* Section 3 & 4: Table and Pagination */}
            <div className="space-y-1">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Active Prompts
                </h2>
                <span className="text-xs text-muted-foreground">
                  Updated every 24 hours
                </span>
              </div>
              <PromptTable
                prompts={prompts}
                onRunPrompt={handleRunPrompt}
                runningPromptId={runningPromptId}
              />
            </div>
          </div>

          <div className="lg:col-span-4 space-y-6">
            {/* Section 6: Scheduled Runs */}
            <ScheduledRuns />

            {/* Section 7: Prompt Templates */}
            <PromptTemplates />

            {/* Help Card - Optional but nice for UI completeness */}
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-6">
              <h3 className="text-sm font-bold text-primary mb-2">
                Improve your Visibility
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                Research shows that users often click on the first 3 links provided by AI. Use templates to test how your brand ranks in different buyer scenarios.
              </p>
              <button className="text-xs font-bold text-primary hover:underline">
                Read Best Practices →
              </button>
            </div>
          </div>
        </div>
      </main>
    </DashboardShell>
  );
}