import type {
  CompetitorKpi,
  CategoryShare,
  TrendPoint,
  ComparisonRow,
  Strength,
  RootCause,
} from "./types";
import kpisJson from "./kpis.json";
import sovByCategoryJson from "./sov-by-category.json";
import sovTrendJson from "./sov-trend.json";
import comparisonJson from "./comparison.json";
import strengthsJson from "./strengths.json";
import rootCausesJson from "./root-causes.json";

export const kpis = kpisJson as CompetitorKpi[];
export const sovByCategory = sovByCategoryJson as CategoryShare[];
export const sovTrend = sovTrendJson as TrendPoint[];
export const comparison = comparisonJson as ComparisonRow[];
export const strengths = strengthsJson as Strength[];
export const rootCauses = rootCausesJson as RootCause[];

export type {
  CompetitorKpi,
  CategoryShare,
  TrendPoint,
  ComparisonRow,
  Strength,
  RootCause,
} from "./types";
export { rootCauseIcons } from "./types";
