import type { AnswerRecord, AnswerFilterOptions } from "./types";
import answersJson from "./answers.json";
import filterOptionsJson from "./filter-options.json";

export const answers = answersJson as AnswerRecord[];
export const filterOptions = filterOptionsJson as AnswerFilterOptions;

export type {
  AnswerRecord,
  AnswerOutcome,
  Sentiment,
  ReasoningStatus,
  ReasoningFactor,
  AnswerSource,
  Inaccuracy,
  Severity,
  AnswerFilterOptions,
} from "./types";
