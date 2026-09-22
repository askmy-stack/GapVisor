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

export default function ExperimentsImpact() {
  return (
    <DashboardShell>
      <DashboardTopbar
        title="Experiments & Impact"
        description="Track whether content changes move AI recommendation share and pipeline"
        actions={
          <Button size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" /> New Experiment
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
          <ExperimentsTable />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 3) Detailed "Experiment Impact" card */}
          <ImpactChart />

          <div className="space-y-6">
            {/* 6) "Experiment Timeline" card */}
            <ExperimentTimeline />
            
            {/* 7) "Recommended Next Experiments" card */}
            <RecommendedNext />
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
    </DashboardShell>
  );
}