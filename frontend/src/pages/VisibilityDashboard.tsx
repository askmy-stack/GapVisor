import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  SHARE_SERIES,
  defaultDashboardFilters,
  type DashboardFilterState,
} from "@/components/VisibilityDashboard/dashboard-filters";
import { exportShareOverTime } from "@/lib/reports";
import DashboardShell from "@/components/layout/DashboardShell";
import DashboardTopbar from "@/components/layout/DashboardTopbar";
import { FilterBar } from "@/components/VisibilityDashboard/FilterBar";
import { KPICard } from "@/components/VisibilityDashboard/KPICards";
import { ShareOverTimeChart } from "@/components/VisibilityDashboard/ShareOverTimeChart";
import { DetailCharts } from "@/components/VisibilityDashboard/DetailCharts";
import { CompetitorSOV } from "@/components/VisibilityDashboard/CompetitorSOV";
import { CitationCoverage } from "@/components/VisibilityDashboard/CitationCoverage";
import { AlertsPanel } from "@/components/VisibilityDashboard/AlertsPanel";
import { RecommendationStability } from "@/components/VisibilityDashboard/RecommendationStability";
import { kpis } from "@/data/visibility-dashboard";
import { useDashboardOverview } from "@/data/visibility-dashboard/hooks";

// A small seeded generator so each KPI's sparkline is stable across
// re-renders instead of reshuffling every time React repaints the page.
function seededSparkline(seed: number, base: number, variance: number) {
  let state = seed;
  return Array.from({ length: 10 }, () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    const rand = state / 0x7fffffff;
    return { value: base + rand * variance };
  });
}

export default function VisibilityDashboard() {
  const { data } = useDashboardOverview();
  const [filters, setFilters] = useState<DashboardFilterState>(defaultDashboardFilters);
  const [visibleSeries, setVisibleSeries] = useState<string[]>(SHARE_SERIES);

  const toggleSeries = (series: string) =>
    setVisibleSeries((prev) => (prev.includes(series) ? prev.filter((s) => s !== series) : [...prev, series]));

  function handleExport() {
    const { filename, rowCount } = exportShareOverTime(visibleSeries, filters.range);
    toast.success(`Exported ${filename}`, {
      description: `${rowCount} days of recommendation share for ${visibleSeries.join(", ")}.`,
    });
  }
  const kpiCards = data?.kpis ?? kpis;
  const sparklines = useMemo(
    () =>
      Object.fromEntries(
        kpiCards.map((kpi, i) => [kpi.title, seededSparkline(i + 1, kpi.sparklineBase, kpi.sparklineVariance)]),
      ),
    [kpiCards],
  );

  return (
    <DashboardShell>
      <DashboardTopbar 
        title="Visibility Dashboard" 
        description="AI recommendation performance across all monitored models"
      />
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        <div className="max-w-[1600px] mx-auto space-y-6">
          {/* Section 1: Filters */}
          <FilterBar value={filters} onChange={setFilters} onExport={handleExport} />

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
                data={sparklines[kpi.title]}
              />
            ))}
          </div>

          {/* vNext: Model Disagreement Index (live-only; renders nothing in demo mode) */}
          <RecommendationStability />

          {/* Section 3: Large Chart */}
          <ShareOverTimeChart rangeDays={filters.range} visibleSeries={visibleSeries} onToggleSeries={toggleSeries} />

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