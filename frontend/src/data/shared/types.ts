/**
 * Shared reference data shapes.
 *
 * Data values live in the sibling .json files. Presentation values (chart color
 * tokens) live here and are resolved by id — never serialized into JSON.
 */

export type MeasurementMethod =
  | "api"
  | "proxy"
  | "derived"
  | "unavailable"
  | "customer_key";

export interface AiModel {
  id: string;
  /** Short display name used on dashboards and filters. */
  name: string;
  /** Full model name used by the create-prompt dialog. */
  longName: string;
  /** Short letters shown on model status cards. */
  badge: string;
  /** How this surface is measured — never invent numbers for unavailable methods. */
  measurementMethod?: MeasurementMethod;
}

export interface Competitor {
  id: string;
  name: string;
  /** Single-letter badge text. */
  logo: string;
  /** True for the tracked brand itself. */
  isBrand: boolean;
}

export interface Category {
  value: string;
  label: string;
}

/** Generic select/dropdown option. */
export interface Option {
  value: string;
  label: string;
}

/** Chart color token per AI model. Presentation — kept out of JSON. */
export const modelChartColors: Record<string, string> = {
  chatgpt: "hsl(var(--chart-1))",
  claude: "hsl(var(--chart-2))",
  gemini: "hsl(var(--chart-3))",
  perplexity: "hsl(var(--chart-4))",
  "ai-api-key": "hsl(var(--chart-5))",
  "buyer-agents": "hsl(var(--primary))",
};

/** Chart color token per competitor. Presentation — kept out of JSON. */
export const competitorChartColors: Record<string, string> = {
  kong: "hsl(var(--chart-1))",
  postman: "hsl(var(--chart-2))",
  apigee: "hsl(var(--chart-3))",
  tyk: "hsl(var(--chart-4))",
  mulesoft: "hsl(var(--chart-5))",
  northstar: "hsl(var(--primary))",
};
