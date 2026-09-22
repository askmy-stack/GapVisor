import type {
  ModelStatus,
  SparklinePoint,
  PerformancePoint,
  MetricRow,
  MonitoringRun,
  PositionSlice,
  TopSource,
  MonitoringFilterOptions,
} from "./types";
import modelStatusJson from "./model-status.json";
import modelSparklineJson from "./model-sparkline.json";
import performanceJson from "./performance.json";
import metricsJson from "./metrics.json";
import recentRunsJson from "./recent-runs.json";
import positionDistributionJson from "./position-distribution.json";
import topSourcesJson from "./top-sources.json";
import filterOptionsJson from "./filter-options.json";
import { aiModels } from "@/data/shared";

const modelStatusRaw = modelStatusJson as ModelStatus[];

/** Monitoring measurements joined with shared model identity (name, badge). */
export const modelStatus = modelStatusRaw.map((s) => {
  const model = aiModels.find((m) => m.id === s.id);
  return { ...s, name: model?.name ?? s.id, badge: model?.badge ?? "" };
});
export const modelSparkline = modelSparklineJson as SparklinePoint[];
export const performance = performanceJson as PerformancePoint[];
export const metrics = metricsJson as MetricRow[];
export const recentRuns = recentRunsJson as MonitoringRun[];
export const positionDistribution = positionDistributionJson as PositionSlice[];
export const topSources = topSourcesJson as TopSource[];
export const filterOptions = filterOptionsJson as MonitoringFilterOptions;

export type {
  ModelStatus,
  ModelHealth,
  Trend,
  SparklinePoint,
  PerformancePoint,
  MetricRow,
  MonitoringRun,
  PositionSlice,
  TopSource,
  MonitoringFilterOptions,
} from "./types";
export { positionSliceColors } from "./types";
