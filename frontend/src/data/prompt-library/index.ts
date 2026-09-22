import type {
  Prompt,
  PromptTemplate,
  ScheduledRun,
  PromptStat,
  PromptFilterOptions,
} from "./types";
import promptsJson from "./prompts.json";
import templatesJson from "./templates.json";
import scheduledRunsJson from "./scheduled-runs.json";
import statsJson from "./stats.json";
import filterOptionsJson from "./filter-options.json";

export const prompts = promptsJson as Prompt[];
export const templates = templatesJson as PromptTemplate[];
export const scheduledRuns = scheduledRunsJson as ScheduledRun[];
export const stats = statsJson as PromptStat[];
export const filterOptions = filterOptionsJson as PromptFilterOptions;

export type {
  Prompt,
  PromptIntent,
  PromptStatus,
  PromptTemplate,
  ScheduledRun,
  PromptStat,
  PromptFilterOptions,
} from "./types";
export { statIcons } from "./types";
