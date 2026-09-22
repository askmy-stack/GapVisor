import type { LucideIcon } from "lucide-react";
import { Layers, Calendar, FolderOpen, RefreshCcw } from "lucide-react";
import type { Option } from "@/data/shared";

export type PromptIntent = "Awareness" | "Comparison" | "Evaluation" | "Decision";
export type PromptStatus = "Active" | "Paused";

export interface Prompt {
  id: string;
  text: string;
  category: string;
  useCase: string;
  intent: PromptIntent;
  region: string;
  models: string[];
  lastRun: string;
  brandMention: number;
  status: PromptStatus;
}

export interface PromptTemplate {
  title: string;
  description: string;
  tag: string;
}

export interface ScheduledRun {
  id: string;
  name: string;
  nextRun: string;
  frequency: string;
  models: string[];
}

export interface PromptStat {
  id: string;
  label: string;
  value: string;
  trend: string;
}

export interface PromptFilterOptions {
  categories: Option[];
  useCases: Option[];
  intents: Option[];
  regions: Option[];
  models: Option[];
}

/** Icon per summary stat. Presentation — kept out of JSON. */
export const statIcons: Record<string, LucideIcon> = {
  "total-prompts": FolderOpen,
  "active-schedules": Calendar,
  categories: Layers,
  "avg-runs": RefreshCcw,
};
