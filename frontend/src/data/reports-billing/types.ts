import type { LucideIcon } from "lucide-react";
import { FileText, FileBarChart } from "lucide-react";

export interface PlanTier {
  name: string;
  price: string;
  description: string;
  features: string[];
  cta: string;
  current: boolean;
}

export interface UsageLimit {
  label: string;
  current: number;
  limit: number;
  unit: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: string;
  lastActive: string;
  status: string;
}

export interface Invoice {
  id: string;
  date: string;
  amount: string;
  status: string;
}

export interface ReportType {
  id: string;
  title: string;
  description: string;
}

export interface RecentExport {
  name: string;
  date: string;
  size: string;
}

/** Icon per report type. Presentation — kept out of JSON. */
export const reportTypeIcons: Record<string, LucideIcon> = {
  "monthly-summary": FileText,
  "competitor-benchmark": FileBarChart,
  "board-deck": FileText,
};
