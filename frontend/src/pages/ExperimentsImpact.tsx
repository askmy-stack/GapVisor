import DashboardShell from "@/components/layout/DashboardShell";
import DashboardTopbar from "@/components/layout/DashboardTopbar";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import SummaryKPIs from "@/components/ExperimentsImpact/SummaryKPIs";
import ExperimentsTable from "@/components/ExperimentsImpact/ExperimentsTable";
import ImpactChart from "@/components/ExperimentsImpact/ImpactChart";
import SecondaryMetrics from "@/components/ExperimentsImpact/SecondaryMetrics";
import SignalGraph from "@/components/ExperimentsImpact/SignalGraph";
import ExperimentTimeline from "@/components/ExperimentsImpact/ExperimentTimeline";
import RecommendedNext from "@/components/ExperimentsImpact/RecommendedNext";
import { NewExperimentDialog, type ExperimentDraft } from "@/components/ExperimentsImpact/NewExperimentDialog";
import { experiments as initialExperiments, type Experiment } from "@/data/experiments-impact";
import { useRef, useState } from "react";
import { toast } from "sonner";

export default function ExperimentsImpact() {
  const [rows, setRows] = useState<Experiment[]>(initialExperiments);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [initial, setInitial] = useState<Partial<ExperimentDraft> | undefined>();
  const deepDiveRef = useRef<HTMLDivElement>(null);

  function openNew(name?: string) {
    setInitial(name ? { name } : undefined);
    setDialogOpen(true);
  }

  function addExperiment(draft: ExperimentDraft) {
    setRows((prev) => [
      { name: draft.name, type: draft.type, date: draft.startDate, status: "Draft", baseline: "—", current: "—", lift: "—" },
      ...prev,
    ]);
    toast.success("Experiment saved as a draft", {
      description: "Demo mode: saved for this session only. Tracking starts once the API is connected.",
    });
  }

  return (
    <DashboardShell>
      <DashboardTopbar
        title="Experiments & Impact"
        description="Track whether content changes move AI recommendation share and pipeline"
        actions={
          <Button size="sm" className="gap-1.5" onClick={() => openNew()}>
            <Plus className="h-4 w-4" /> New experiment
          </Button>
        }
      />
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {/* 1) Summary KPI row */}
        <SummaryKPIs />

        {/* 2) Experiments table */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight">Active & Recent Experiments</h2>
          </div>
          <ExperimentsTable
            experiments={rows}
            featuredName={initialExperiments[0]?.name}
            onOpenFeatured={() => deepDiveRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
          />
        </div>

        <div ref={deepDiveRef} className="grid grid-cols-1 lg:grid-cols-3 gap-6 scroll-mt-24">
          {/* 3) Detailed "Experiment Impact" card */}
          <ImpactChart />

          <div className="space-y-6">
            {/* 6) "Experiment Timeline" card */}
            <ExperimentTimeline />
            
            {/* 7) "Recommended Next Experiments" card */}
            <RecommendedNext onLaunch={(title) => openNew(title)} />
          </div>
        </div>

        {/* 4) Secondary metrics row for that experiment */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Featured Experiment Deep-Dive: Kong Comparison Page
          </h3>
          <SecondaryMetrics />
        </div>

        {/* 5) "Longitudinal Signal Graph" card */}
        <SignalGraph />
      </main>
      <NewExperimentDialog open={dialogOpen} onOpenChange={setDialogOpen} initial={initial} onSubmit={addExperiment} />
    </DashboardShell>
  );
}