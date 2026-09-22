import { useState } from "react";
import { toast } from "sonner";

import DashboardShell from "@/components/layout/DashboardShell";
import DashboardTopbar from "@/components/layout/DashboardTopbar";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";
import { getAccessToken, probeApi, runMonitoringScan } from "@/api/client";
import { useAuth } from "@/auth/AuthProvider";
import { ModelStatusCards } from "@/components/ModelMonitoring/ModelStatusCards";
import { MonitoringControls } from "@/components/ModelMonitoring/MonitoringControls";
import { PerformanceChart } from "@/components/ModelMonitoring/PerformanceChart";
import { MetricsTable } from "@/components/ModelMonitoring/MetricsTable";
import { RecentRuns } from "@/components/ModelMonitoring/RecentRuns";
import { InsightsCards } from "@/components/ModelMonitoring/InsightsCards";
import { MonitoringSchedule } from "@/components/ModelMonitoring/MonitoringSchedule";

export default function ModelMonitoring() {
  const { user, workspaceId } = useAuth();
  const [running, setRunning] = useState(false);

  const handleRunScan = async () => {
    setRunning(true);
    try {
      const live = await probeApi();
      if (!live) {
        toast.message("Backend offline — monitoring remains in demo mode.");
        return;
      }
      if (!user || !workspaceId || !getAccessToken()) {
        toast.message("Sign in to run a live monitoring scan.");
        return;
      }

      const answers = await runMonitoringScan({ workspace_id: workspaceId });
      toast.success(`Scan complete: ${answers.length} answer${answers.length === 1 ? "" : "s"} created.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to run monitoring scan";
      toast.error(message);
    } finally {
      setRunning(false);
    }
  };

  return (
    <DashboardShell>
      <DashboardTopbar 
        title="Model Monitoring" 
        description="Live and historical run performance by AI model"
        actions={
          <Button size="sm" className="gap-1.5 shadow-sm" onClick={handleRunScan} disabled={running}>
            <Play className="h-4 w-4" />
            {running ? "Running…" : "Run New Scan"}
          </Button>
        }
      />
      
      <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-6">
        {/* 1. Model status strip */}
        <section>
          <ModelStatusCards />
        </section>

        {/* 2. Controls row */}
        <section>
          <MonitoringControls />
        </section>

        {/* 3. Big comparison chart card */}
        <section>
          <PerformanceChart />
        </section>

        {/* 4. Metrics comparison table */}
        <section>
          <MetricsTable />
        </section>

        {/* 5. Recent Runs activity table */}
        <section>
          <RecentRuns />
        </section>

        {/* 6. Two-column row: Position Distribution & Citation Sources */}
        <section>
          <InsightsCards />
        </section>

        {/* 7. Monitoring Schedule & Coverage card */}
        <section>
          <MonitoringSchedule />
        </section>
      </main>
    </DashboardShell>
  );
}