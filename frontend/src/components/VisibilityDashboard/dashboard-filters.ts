import { aiModels, categories } from "@/data/shared";

export const DASHBOARD_MODELS = aiModels.filter((m) => m.id !== "buyer-agents").map((m) => m.name);
export const DASHBOARD_CATEGORIES = categories.map((c) => c.label);
export const RANGE_OPTIONS = [7, 30, 90] as const;
export type RangeDays = (typeof RANGE_OPTIONS)[number];
export const ALL_CATEGORIES = "all";

/** Brand series plotted on the share over time chart. */
export const SHARE_SERIES = ["Northstar", "Kong", "Postman", "Apigee", "Tyk"];

export interface DashboardFilterState {
  range: RangeDays;
  models: string[];
  category: string;
}

export const defaultDashboardFilters: DashboardFilterState = {
  range: 30,
  models: DASHBOARD_MODELS,
  category: ALL_CATEGORIES,
};
