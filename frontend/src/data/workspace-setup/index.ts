import type { SetupRegion, SetupFrequency, SetupDefaults } from "./types";
import suggestedCategoriesJson from "./suggested-categories.json";
import regionsJson from "./regions.json";
import frequenciesJson from "./frequencies.json";
import defaultsJson from "./defaults.json";

export const suggestedCategories = suggestedCategoriesJson as string[];
export const regions = regionsJson as SetupRegion[];
export const frequencies = frequenciesJson as SetupFrequency[];
export const defaults = defaultsJson as SetupDefaults;

export type { SetupRegion, SetupFrequency, SetupDefaults } from "./types";
