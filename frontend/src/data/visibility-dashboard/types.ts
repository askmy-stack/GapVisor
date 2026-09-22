import type { LucideIcon } from "lucide-react";
import { AlertCircle, AlertTriangle, Info } from "lucide-react";

/** Headline KPI card on the Visibility Dashboard. */
export interface VisibilityMetric {
  title: string;
  /** Pre-formatted display value, e.g. "42.8%" or "82/100". */
  value: string | number;
  unit?: string;
  change: number;
  trend: "up" | "down" | "neutral";
  sample_size?: number;
  /** Inputs to the sparkline generator, which stays in the page component. */
  sparklineBase: number;
  sparklineVariance: number;
}

/** One dated observation with a numeric key per tracked series. */
export type TimeSeriesPoint = Record<string, string | number>;

export interface InclusionPoint {
  name: string;
  value: number;
}

export interface SentimentPoint {
  category: string;
  positive: number;
  neutral: number;
  negative: number;
}

export interface CompetitorShare {
  name: string;
  share: number;
}

export interface CitationSource {
  domain: string;
  category: string;
  count: number;
  trend: "up" | "down" | "neutral";
}

export type AlertSeverity = "critical" | "warning" | "info";

export interface Alert {
  id: number;
  title: string;
  severity: AlertSeverity;
  timestamp: string;
}

/** Icon per severity. Presentation — kept out of JSON. */
export const alertIcons: Record<AlertSeverity, LucideIcon> = {
  critical: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

/**
 * Text and background classes per alert id.
 *
 * Keyed by id rather than severity because the two `info` alerts deliberately
 * render in different colors (blue and emerald) in the original design.
 */
export const alertStyles: Record<number, { color: string; bg: string }> = {
  1: { color: "text-red-500", bg: "bg-red-500/10" },
  2: { color: "text-amber-500", bg: "bg-amber-500/10" },
  3: { color: "text-blue-500", bg: "bg-blue-500/10" },
  4: { color: "text-emerald-500", bg: "bg-emerald-500/10" },
};
