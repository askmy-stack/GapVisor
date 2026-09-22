import type { LucideIcon } from "lucide-react";
import { BarChart3, CheckCircle, Clock, Layers } from "lucide-react";

export type Priority = "Critical" | "High" | "Medium" | "Low";
/** "Published" is accepted by the card but unused by the current sample data. */
export type Status = "Not Started" | "In Progress" | "In Review" | "Published";
export type GapStatus = "covered" | "partial" | "missing";

export interface ContentRecommendation {
  priority: Priority;
  title: string;
  contentType: string;
  rationale: string;
  impact: string;
  tags: string[];
  status: Status;
  assignee?: { name: string; avatar?: string };
}

export interface RecommendationStat {
  id: string;
  title: string;
  value: string | number;
  description: string;
  trend?: { value: string; isPositive: boolean };
}

export interface GapMap {
  categories: string[];
  contentTypes: string[];
  coverage: Record<string, Record<string, GapStatus>>;
}

export interface DocumentationGap {
  title: string;
  severity: string;
  impact: string;
}

export interface EvidenceOpportunity {
  title: string;
  tags: string[];
}

export interface ReviewPlatform {
  name: string;
  count: number;
  rating: number;
  competitor: number;
}

/** Icon per summary stat. Presentation — kept out of JSON. */
export const statIcons: Record<string, LucideIcon> = {
  "open-recommendations": Layers,
  "visibility-lift": BarChart3,
  "in-progress": Clock,
  "completed-quarter": CheckCircle,
};
