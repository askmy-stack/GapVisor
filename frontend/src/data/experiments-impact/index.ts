import type {
  Experiment,
  ExperimentKpi,
  TimelineEntry,
  ImpactPoint,
  NextSuggestion,
  SecondaryMetric,
  SignalStage,
} from "./types";
import experimentsJson from "./experiments.json";
import summaryKpisJson from "./summary-kpis.json";
import timelineJson from "./timeline.json";
import impactJson from "./impact.json";
import recommendedNextJson from "./recommended-next.json";
import secondaryMetricsJson from "./secondary-metrics.json";
import signalStagesJson from "./signal-stages.json";

export const experiments = experimentsJson as Experiment[];
export const summaryKpis = summaryKpisJson as ExperimentKpi[];
export const timeline = timelineJson as TimelineEntry[];
export const impact = impactJson as ImpactPoint[];
export const recommendedNext = recommendedNextJson as NextSuggestion[];
export const secondaryMetrics = secondaryMetricsJson as SecondaryMetric[];
export const signalStages = signalStagesJson as SignalStage[];

export type {
  Experiment,
  ExperimentKpi,
  TimelineEntry,
  ImpactPoint,
  NextSuggestion,
  SecondaryMetric,
  SignalStage,
} from "./types";
export { kpiIcons, timelineIcons, timelineColors } from "./types";
