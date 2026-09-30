import { filterOptions, type AnswerRecord } from "@/data/answer-analysis";

export interface AnswerFilterState {
  search: string;
  model: string;
  category: string;
  outcome: string;
}

export const defaultAnswerFilters: AnswerFilterState = {
  search: "",
  model: "all-models",
  category: "all-categories",
  outcome: "all-outcomes",
};

const labelFor = (options: { value: string; label: string }[], value: string) =>
  options.find((o) => o.value === value)?.label;

export function applyAnswerFilters(records: AnswerRecord[], f: AnswerFilterState) {
  const q = f.search.trim().toLowerCase();
  const model = f.model === defaultAnswerFilters.model ? null : labelFor(filterOptions.models, f.model);
  const category =
    f.category === defaultAnswerFilters.category ? null : labelFor(filterOptions.categories, f.category);
  return records.filter(
    (r) =>
      (!q || r.prompt.toLowerCase().includes(q) || r.aiAnswer.toLowerCase().includes(q)) &&
      (!model || r.model === model) &&
      (!category || r.category === category) &&
      (f.outcome === defaultAnswerFilters.outcome || r.outcome === f.outcome),
  );
}
