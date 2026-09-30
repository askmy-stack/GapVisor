import type { Prompt } from "@/data/prompt-library";

export const ALL = "all";

export interface PromptFilterState {
  search: string;
  category: string;
  useCase: string;
  intent: string;
  region: string;
  model: string;
}

export const defaultPromptFilters: PromptFilterState = {
  search: "",
  category: ALL,
  useCase: ALL,
  intent: ALL,
  region: ALL,
  model: ALL,
};

/** Display names for the model ids stored on prompt rows. */
export const promptModelLabels: Record<string, string> = {
  gpt: "ChatGPT",
  claude: "Claude",
  gemini: "Gemini",
  perp: "Perplexity",
  "ai-api-key": "AI API Key",
};

export function isFiltered(f: PromptFilterState) {
  return (Object.keys(defaultPromptFilters) as (keyof PromptFilterState)[]).some(
    (k) => f[k] !== defaultPromptFilters[k],
  );
}

export function applyPromptFilters(rows: Prompt[], f: PromptFilterState): Prompt[] {
  const q = f.search.trim().toLowerCase();
  return rows.filter(
    (p) =>
      (!q || p.text.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)) &&
      (f.category === ALL || p.category === f.category) &&
      (f.useCase === ALL || p.useCase === f.useCase) &&
      (f.intent === ALL || p.intent === f.intent) &&
      (f.region === ALL || p.region === f.region) &&
      (f.model === ALL || p.models.includes(f.model)),
  );
}

export function filterOptionsFor(rows: Prompt[]) {
  const uniq = (values: string[]) => [...new Set(values)].sort();
  return {
    categories: uniq(rows.map((p) => p.category)),
    useCases: uniq(rows.map((p) => p.useCase)),
    intents: uniq(rows.map((p) => p.intent)),
    regions: uniq(rows.map((p) => p.region)),
    models: uniq(rows.flatMap((p) => p.models)),
  };
}
