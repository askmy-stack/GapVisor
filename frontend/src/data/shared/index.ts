import type { AiModel, Competitor, Category } from "./types";
import competitorsJson from "./competitors.json";
import categoriesJson from "./categories.json";
import { aiModels as catalog } from "./models";

export const aiModels = catalog;
export const competitors = competitorsJson as Competitor[];
export const categories = categoriesJson as Category[];

/** Competitors excluding the tracked brand itself. */
export const rivalCompetitors = competitors.filter((c) => !c.isBrand);

/** Brand and competitor names, used for highlighting brand mentions in answers. */
export const brandNames = competitors.map((c) => c.name);

export type { AiModel, Competitor, Category, Option } from "./types";
export { modelChartColors, competitorChartColors } from "./types";
export { useAiModels, staticAiModels } from "./models";
