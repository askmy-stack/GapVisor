import { useQuery } from "@tanstack/react-query";

import {
  fetchDashboardOverview,
  getAccessToken,
  probeApi,
  type MetricOut,
} from "@/api/client";
import { useAuth } from "@/auth/AuthProvider";
import { kpis as staticKpis } from "@/data/visibility-dashboard";
import type { VisibilityMetric } from "./types";

function round(value: number, decimals = 1) {
  const multiplier = 10 ** decimals;
  return Math.round(value * multiplier) / multiplier;
}

function aggregateMetric(rows: MetricOut[], metricKey: string) {
  const matches = rows.filter(
    (row) => row.metric_key === metricKey && !row.competitor_id,
  );
  const sampleSize = matches.reduce((sum, row) => sum + row.sample_size, 0);
  if (!sampleSize) return null;

  const weightedValue =
    matches.reduce((sum, row) => sum + row.value * row.sample_size, 0) /
    sampleSize;

  return { value: weightedValue, sample_size: sampleSize };
}

function metricTrend(change: number): VisibilityMetric["trend"] {
  if (change > 0) return "up";
  if (change < 0) return "down";
  return "neutral";
}

function applyLiveMetric(
  cards: VisibilityMetric[],
  title: string,
  metric: ReturnType<typeof aggregateMetric>,
) {
  if (!metric) return cards;

  return cards.map((card) => {
    if (card.title !== title) return card;

    const value = round(metric.value * 100);
    return {
      ...card,
      value,
      unit: "%",
      change: 0,
      trend: metricTrend(0),
      sample_size: metric.sample_size,
      sparklineBase: value,
      sparklineVariance: Math.max(value * 0.08, 1),
    };
  });
}

function mapOverviewToKpis(metrics: MetricOut[]) {
  let cards = [...staticKpis];
  cards = applyLiveMetric(
    cards,
    "AI Recommendation Share",
    aggregateMetric(metrics, "recommendation_share"),
  );
  cards = applyLiveMetric(
    cards,
    "Brand Inclusion Rate",
    aggregateMetric(metrics, "inclusion_rate"),
  );
  return cards;
}

export function useDashboardOverview() {
  const { workspaceId } = useAuth();

  return useQuery({
    queryKey: ["dashboard", "overview", workspaceId],
    queryFn: async () => {
      const hasLiveApi = await probeApi();
      const hasLiveSession = Boolean(hasLiveApi && getAccessToken() && workspaceId);

      if (!hasLiveSession) {
        return {
          mode: "static" as const,
          kpis: staticKpis,
          sample_size: 0,
        };
      }

      try {
        const overview = await fetchDashboardOverview();
        const liveKpis = overview.metrics.length
          ? mapOverviewToKpis(overview.metrics)
          : staticKpis;

        return {
          mode: "live" as const,
          kpis: liveKpis,
          sample_size: overview.metrics.reduce(
            (sum, metric) => sum + metric.sample_size,
            0,
          ),
        };
      } catch {
        return {
          mode: "static" as const,
          kpis: staticKpis,
          sample_size: 0,
        };
      }
    },
    staleTime: 30_000,
  });
}
