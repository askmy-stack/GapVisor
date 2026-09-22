import type { Option } from "@/data/shared";

export type AnswerOutcome = "recommended" | "not-recommended" | "negative";
export type Sentiment = "Positive" | "Neutral" | "Negative";
export type ReasoningStatus = "positive" | "negative" | "neutral";
export type Severity = "High" | "Medium" | "Low";

export interface ReasoningFactor {
  factor: string;
  status: ReasoningStatus;
}

export interface AnswerSource {
  title: string;
  url: string;
  authority: string;
  domain: string;
}

export interface Inaccuracy {
  claim: string;
  severity: Severity;
}

/**
 * One AI response to a tracked prompt.
 *
 * Declared once here and consumed by the page, the list, and the detail pane,
 * which previously each redeclared part of this shape.
 */
export interface AnswerRecord {
  id: string;
  promptSnippet: string;
  prompt: string;
  model: string;
  outcome: AnswerOutcome;
  timestamp: string;
  brandPosition: string;
  category: string;
  intent: string;
  region: string;
  runDate: string;
  sentiment: Sentiment;
  aiAnswer: string;
  reasoning: ReasoningFactor[];
  sources: AnswerSource[];
  inaccuracies: Inaccuracy[];
}

export interface AnswerFilterOptions {
  models: Option[];
  categories: Option[];
  outcomes: Option[];
}
