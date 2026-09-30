import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus } from "lucide-react";

import DashboardShell from "@/components/layout/DashboardShell";
import DashboardTopbar from "@/components/layout/DashboardTopbar";
import StatsStrip from "@/components/PromptLibrary/StatsStrip";
import PromptFilters from "@/components/PromptLibrary/PromptFilters";
import PromptTable from "@/components/PromptLibrary/PromptTable";
import CreatePromptDialog, { type PromptDraft } from "@/components/PromptLibrary/CreatePromptDialog";
import {
  applyPromptFilters,
  defaultPromptFilters,
  type PromptFilterState,
} from "@/components/PromptLibrary/prompt-filters";
import type { PromptView } from "@/components/PromptLibrary/PromptFilters";
import { Button } from "@/components/ui/button";
import ScheduledRuns from "@/components/PromptLibrary/ScheduledRuns";
import PromptTemplates from "@/components/PromptLibrary/PromptTemplates";
import {
  createPrompt,
  getAccessToken,
  listPrompts,
  probeApi,
  runPrompt,
  type PromptOut,
} from "@/api/client";
import { useAuth } from "@/auth/AuthProvider";
import { prompts as staticPrompts, type Prompt, type PromptTemplate } from "@/data/prompt-library";

const DEMO_NOTE = "Demo mode: saved for this session only. Changes save to your workspace once the API is connected.";

/** Starter wording per template; brackets mark the parts to fill in. */
const templateStarters: Record<string, string> = {
  "Best-of category roundup": "What are the best [category] tools for a mid size company?",
  "Vendor vs vendor comparison": "Compare [Brand A] vs [Brand B] for [use case]",
  "Pricing and ROI question": "Is [Brand] worth the price for a [team size] team?",
  "Integration/compatibility question": "Does [Brand] integrate well with [your stack]?",
};

const bestPractices = [
  "Write prompts the way buyers ask them, including their constraints like team size, budget, or stack.",
  "Track the same prompt across every model so differences reflect the model, not the wording.",
  "Keep a mix of awareness, comparison, and decision intents so you see the whole buying journey.",
  "Change one word at a time when testing wording, and give each version a few runs before comparing.",
];

type DialogState =
  | { open: false }
  | { open: true; mode: "create" | "edit"; initial?: Partial<PromptDraft>; editingId?: string };

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
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [runningPromptId, setRunningPromptId] = useState<string | null>(null);
  const [filters, setFilters] = useState<PromptFilterState>(defaultPromptFilters);
  const [view, setView] = useState<PromptView>("list");
  const [dialog, setDialog] = useState<DialogState>({ open: false });
  const [showBestPractices, setShowBestPractices] = useState(false);
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

  const [rows, setRows] = useState<Prompt[]>(staticPrompts);

  useEffect(() => {
    const live = livePromptsQuery.data ?? [];
    if (live.length) setRows(mapLivePrompts(live));
  }, [livePromptsQuery.data]);

  const prompts = useMemo(() => applyPromptFilters(rows, filters), [rows, filters]);

  // The topbar "New prompt set" action links here with ?new=1.
  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setDialog({ open: true, mode: "create" });
      const next = new URLSearchParams(searchParams);
      next.delete("new");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const openCreate = (initial?: Partial<PromptDraft>) => setDialog({ open: true, mode: "create", initial });

  function handleUseTemplate(template: PromptTemplate) {
    openCreate({
      text: templateStarters[template.title] ?? "",
      intent: template.tag as PromptDraft["intent"],
    });
  }

  async function handleSave(draft: PromptDraft) {
    if (dialog.open && dialog.mode === "edit" && dialog.editingId) {
      const id = dialog.editingId;
      setRows((prev) =>
        prev.map((p) =>
          p.id === id
            ? { ...p, text: draft.text, category: draft.category, useCase: draft.useCase, intent: draft.intent, models: draft.models }
            : p,
        ),
      );
      toast.success("Prompt updated", { description: DEMO_NOTE });
      return;
    }
    if (canUseLivePrompts) {
      await createPrompt({ text: draft.text, status: "active" });
      await queryClient.invalidateQueries({ queryKey: ["prompts", workspaceId] });
      toast.success("Prompt created in your workspace");
      return;
    }
    const newPrompt: Prompt = {
      id: `local-${Date.now()}`,
      text: draft.text,
      category: draft.category,
      useCase: draft.useCase,
      intent: draft.intent,
      region: "Global",
      models: draft.models,
      lastRun: "Not run yet",
      brandMention: 0,
      status: "Active",
    };
    setRows((prev) => [newPrompt, ...prev]);
    setFilters(defaultPromptFilters);
    toast.success("Prompt added", { description: DEMO_NOTE });
  }

  function handleToggleStatus(prompt: Prompt) {
    const status = prompt.status === "Active" ? "Paused" : "Active";
    setRows((prev) => prev.map((p) => (p.id === prompt.id ? { ...p, status } : p)));
    toast(status === "Active" ? "Prompt activated" : "Prompt paused", { description: DEMO_NOTE });
  }

  function handleDuplicate(prompt: Prompt) {
    const copy: Prompt = { ...prompt, id: `local-${Date.now()}`, text: `${prompt.text} (copy)`, lastRun: "Not run yet" };
    setRows((prev) => {
      const i = prev.findIndex((p) => p.id === prompt.id);
      const next = [...prev];
      next.splice(i + 1, 0, copy);
      return next;
    });
    toast.success("Prompt duplicated", { description: DEMO_NOTE });
  }

  function handleDelete(prompt: Prompt) {
    const snapshot = rows;
    setRows((prev) => prev.filter((p) => p.id !== prompt.id));
    toast("Prompt deleted", {
      description: DEMO_NOTE,
      action: { label: "Undo", onClick: () => setRows(snapshot) },
    });
  }

  const handleRunPrompt = canUseLivePrompts && (livePromptsQuery.data?.length ?? 0) > 0
    ? async (prompt: Prompt) => {
        setRunningPromptId(prompt.id);
        try {
          const live = await probeApi();
          if (!live) {
            toast.message("Backend offline. Showing static prompt data.");
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
        actions={
          <Button size="sm" className="gap-1.5" onClick={() => openCreate()}>
            <Plus className="h-4 w-4" /> Create prompt
          </Button>
        }
      />
      <CreatePromptDialog
        open={dialog.open}
        onOpenChange={(open) => !open && setDialog({ open: false })}
        mode={dialog.open ? dialog.mode : "create"}
        initial={dialog.open ? dialog.initial : undefined}
        onSave={handleSave}
      />

      <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-8 bg-background/50">
        {/* Section 1: Summary Stats */}
        <StatsStrip />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8 space-y-6">
            {/* Section 2: Filters */}
            <div className="bg-card p-4 rounded-xl border shadow-sm">
              <PromptFilters
                prompts={rows}
                value={filters}
                onChange={setFilters}
                view={view}
                onViewChange={setView}
              />
            </div>

            {/* Section 3 & 4: Table and Pagination */}
            <div className="space-y-1">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Active Prompts
                </h2>
                <span className="text-xs text-muted-foreground">
                  {prompts.length} of {rows.length} shown
                </span>
              </div>
              <PromptTable
                prompts={prompts}
                view={view}
                onRunPrompt={handleRunPrompt}
                runningPromptId={runningPromptId}
                onToggleStatus={handleToggleStatus}
                onEdit={(p) =>
                  setDialog({
                    open: true,
                    mode: "edit",
                    editingId: p.id,
                    initial: { text: p.text, category: p.category, useCase: p.useCase, intent: p.intent, models: p.models },
                  })
                }
                onDuplicate={handleDuplicate}
                onDelete={handleDelete}
              />
            </div>
          </div>

          <div className="lg:col-span-4 space-y-6">
            {/* Section 6: Scheduled Runs */}
            <ScheduledRuns />

            {/* Section 7: Prompt Templates */}
            <PromptTemplates onUseTemplate={handleUseTemplate} />

            {/* Help Card - Optional but nice for UI completeness */}
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-6">
              <h3 className="text-sm font-bold text-primary mb-2">
                Improve your Visibility
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                Research shows that users often click on the first 3 links provided by AI. Use templates to test how your brand ranks in different buyer scenarios.
              </p>
              {showBestPractices && (
                <ul id="prompt-best-practices" className="mb-4 space-y-2 list-disc pl-4 text-xs text-muted-foreground leading-relaxed">
                  {bestPractices.map((tip) => (
                    <li key={tip}>{tip}</li>
                  ))}
                </ul>
              )}
              <button
                type="button"
                onClick={() => setShowBestPractices((v) => !v)}
                aria-expanded={showBestPractices}
                aria-controls="prompt-best-practices"
                className="text-xs font-bold text-primary hover:underline"
              >
                {showBestPractices ? "Hide best practices" : "Read best practices"}
              </button>
            </div>
          </div>
        </div>
      </main>
    </DashboardShell>
  );
}