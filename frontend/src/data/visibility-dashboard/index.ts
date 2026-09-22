import type {
  VisibilityMetric,
  TimeSeriesPoint,
  InclusionPoint,
  SentimentPoint,
  CompetitorShare,
  CitationSource,
  Alert,
} from "./types";
import kpisJson from "./kpis.json";
import shareOverTimeJson from "./share-over-time.json";
import inclusionJson from "./inclusion.json";
import sentimentJson from "./sentiment.json";
import competitorSovJson from "./competitor-sov.json";
import citationSourcesJson from "./citation-sources.json";
import alertsJson from "./alerts.json";

export const kpis = kpisJson as VisibilityMetric[];
export const shareOverTime = shareOverTimeJson as TimeSeriesPoint[];
export const inclusion = inclusionJson as InclusionPoint[];
export const sentiment = sentimentJson as SentimentPoint[];
export const competitorSov = competitorSovJson as CompetitorShare[];
export const citationSources = citationSourcesJson as CitationSource[];
export const alerts = alertsJson as Alert[];

export type {
  VisibilityMetric,
  TimeSeriesPoint,
  InclusionPoint,
  SentimentPoint,
  CompetitorShare,
  CitationSource,
  Alert,
  AlertSeverity,
} from "./types";
export { alertIcons, alertStyles } from "./types";
