import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Target,
  MessageSquare,
  Briefcase,
  FileText,
  Share2,
  CheckCircle2,
} from "lucide-react";

export interface Experiment {
  name: string;
  type: string;
  date: string;
  status: string;
  baseline: string;
  current: string;
  lift: string;
}

export interface ExperimentKpi {
  id: string;
  title: string;
  value: string;
  change: string;
  trend: "up" | "down";
}

export interface TimelineEntry {
  id: string;
  event: string;
  date: string;
}

export interface ImpactPoint {
  date: string;
  brand: number;
  competitor: number;
}

export interface NextSuggestion {
  title: string;
  impact: string;
  estimate: string;
}

export interface SecondaryMetric {
  label: string;
  before: string;
  after: string;
  delta: string;
}

export interface SignalStage {
  label: string;
  metric: string;
  desc: string;
}

/** Icon per summary KPI. Presentation — kept out of JSON. */
export const kpiIcons: Record<string, LucideIcon> = {
  "active-experiments": Activity,
  "share-lift": Target,
  "citation-change": MessageSquare,
  "pipeline-influence": Briefcase,
};

/** Icon per timeline step. Presentation — kept out of JSON. */
export const timelineIcons: Record<string, LucideIcon> = {
  published: FileText,
  "first-citation": Target,
  "share-lift": Share2,
  completed: CheckCircle2,
};

/** Text color per timeline step. Presentation — kept out of JSON. */
export const timelineColors: Record<string, string> = {
  published: "text-blue-500",
  "first-citation": "text-accent",
  "share-lift": "text-primary",
  completed: "text-accent",
};
