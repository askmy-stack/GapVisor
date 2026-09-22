import type { LucideIcon } from "lucide-react";
import { ExternalLink, Users, BarChart3, Info } from "lucide-react";

export interface CompetitorKpi {
  title: string;
  value: string;
  delta: string;
  trend: "up" | "down";
  sub?: string;
}

/** A product category with each brand's share within it. */
export type CategoryShare = Record<string, string | number>;

/** One dated point with a numeric key per tracked brand. */
export type TrendPoint = Record<string, string | number>;

export interface ComparisonRow {
  name: string;
  sov: string;
  pos: string;
  sentiment: string;
  citations: string;
  lead: string;
  isBrand: boolean;
}

export interface Strength {
  id: string;
  comp: string;
  logo: string;
  text: string;
  stat: string;
}

export interface RootCause {
  id: string;
  text: string;
}

/** Icon per root cause. Presentation — kept out of JSON. */
export const rootCauseIcons: Record<string, LucideIcon> = {
  "comparison-articles": ExternalLink,
  "review-volume": Users,
  "blog-citations": BarChart3,
  "community-presence": Info,
};
