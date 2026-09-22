import DashboardShell from "@/components/layout/DashboardShell";
import DashboardTopbar from "@/components/layout/DashboardTopbar";
import { FilterBar } from "@/components/VisibilityDashboard/FilterBar";
import { KPICard } from "@/components/VisibilityDashboard/KPICards";
import { ShareOverTimeChart } from "@/components/VisibilityDashboard/ShareOverTimeChart";
import { DetailCharts } from "@/components/VisibilityDashboard/DetailCharts";
import { CompetitorSOV } from "@/components/VisibilityDashboard/CompetitorSOV";
import { CitationCoverage } from "@/components/VisibilityDashboard/CitationCoverage";
import { AlertsPanel } from "@/components/VisibilityDashboard/AlertsPanel";
import { kpis } from "@/data/visibility-dashboard";
import { useDashboardOverview } from "@/data/visibility-dashboard/hooks";

// Sparkline points are generated at render time from each KPI's base and variance.
const generateSparkline = (base: number, variance: number) =>
  Array.from({ length: 10 }, () => ({ value: base + Math.random() * variance }));

export default function VisibilityDashboard() {
  const { data } = useDashboardOverview();
  const kpiCards = data?.kpis ?? kpis;

  return (
    <DashboardShell>
      <DashboardTopbar 
        title="Visibility Dashboard" 
        description="AI recommendation performance across all monitored models"
      />
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        <div className="max-w-[1600px] mx-auto space-y-6">
          {/* Section 1: Filters */}
          <FilterBar />

          {/* Section 2: KPI Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {kpiCards.map((kpi) => (
              <KPICard
                key={kpi.title}
                title={kpi.title}
                value={kpi.value}
                unit={kpi.unit}
                change={kpi.change}
                trend={kpi.trend}
                sampleSize={kpi.sample_size}
                data={generateSparkline(kpi.sparklineBase, kpi.sparklineVariance)}
              />
            ))}
          </div>

          {/* Section 3: Large Chart */}
          <ShareOverTimeChart />

          {/* Section 4: Two-column row - Inclusion & Sentiment */}
          <DetailCharts />

          {/* Section 5, 6, 7: Mixed Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-1">
              <CompetitorSOV />
            </div>
            <div className="xl:col-span-1">
              <CitationCoverage />
            </div>
            <div className="xl:col-span-1">
              <AlertsPanel />
            </div>
          </div>
        </div>
      </main>
    </DashboardShell>
  );
}