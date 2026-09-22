/**
 * Shared AI model catalog — live API when available, static JSON fallback.
 */
import { useQuery } from "@tanstack/react-query";

import { fetchModels, probeApi } from "@/api/client";
import type { AiModel } from "./types";
import aiModelsJson from "./ai-models.json";

export const staticAiModels = aiModelsJson as AiModel[];

function mapApiModel(row: {
  id: string;
  name: string;
  long_name: string;
  badge: string;
  measurement_method: string;
}): AiModel {
  return {
    id: row.id,
    name: row.name,
    longName: row.long_name,
    badge: row.badge,
    measurementMethod: row.measurement_method as AiModel["measurementMethod"],
  };
}

export function useAiModels() {
  return useQuery({
    queryKey: ["reference", "models"],
    queryFn: async () => {
      const up = await probeApi();
      if (!up) return staticAiModels;
      const rows = await fetchModels();
      return rows.map(mapApiModel);
    },
    staleTime: 60_000,
  });
}

// Keep barrel exports for screens not yet migrated to hooks
export const aiModels = staticAiModels;
