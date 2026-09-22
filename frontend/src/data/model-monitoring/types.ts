import type { Option } from "@/data/shared";

export type ModelHealth = "Healthy" | "Degraded";
export type Trend = "up" | "down" | "stable";

/**
 * Per-model monitoring measurements. Model identity (name, badge) is shared
 * reference data and is joined in by id, so it is defined in one place.
 */
export interface ModelStatus {
  id: string;
  status: ModelHealth;
  lastScan: string;
  inclusion: string;
  trend: Trend;
}

export interface SparklinePoint {
  value: number;
}

/** One dated observation with a numeric key per model. */
export type PerformancePoint = Record<string, string | number>;

export interface MetricRow {
  model: string;
  inclusion: number;
  position: number;
  citation: number;
  sentiment: number;
  runs: number;
  lastRun: string;
  trend: Trend;
}

export interface MonitoringRun {
  id: number;
  prompt: string;
  model: string;
  time: string;
  mentioned: boolean;
  position: number;
  citations: number;
  sentiment: string;
}

export interface PositionSlice {
  id: string;
  name: string;
  value: number;
}

export interface TopSource {
  domain: string;
  count: number;
  growth: string;
}

export interface MonitoringFilterOptions {
  dateRanges: Option[];
  categories: Option[];
  regions: Option[];
}

/** Bar fill per position slice. Presentation — kept out of JSON. */
export const positionSliceColors: Record<string, string> = {
  "pos-1": "hsl(var(--chart-1))",
  "pos-2": "hsl(var(--chart-2))",
  "pos-3": "hsl(var(--chart-3))",
  other: "hsl(var(--chart-4))",
  none: "hsl(var(--muted))",
};
