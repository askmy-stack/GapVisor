/**
 * Model Disagreement Index (vNext G3) — live-only, no static-demo
 * equivalent. Disagreement is computed from real Observation data
 * (GET /api/v1/visibility/disagreement); there's nothing meaningful to
 * fabricate for offline/demo mode, so this returns null there and the
 * card that renders it simply doesn't show, same as any other
 * not-yet-implemented-in-demo feature.
 */
import { useQuery } from "@tanstack/react-query";

import {
  fetchDisagreement,
  getAccessToken,
  probeApi,
  type PromptDisagreementOut,
} from "@/api/client";
import { useAuth } from "@/auth/AuthProvider";

/** The prompt worth showing first: lowest stability (LOW before MODERATE
 * before HIGH), then lowest average of its real agreement scores — the
 * one most likely to need investigation, matching the plan's "top
 * anomalies" dashboard intent (section 18) rather than an arbitrary pick. */
function mostNoteworthy(prompts: PromptDisagreementOut[]): PromptDisagreementOut | null {
  if (prompts.length === 0) return null;
  const bandRank: Record<string, number> = { LOW: 0, MODERATE: 1, HIGH: 2 };
  const scoreOf = (p: PromptDisagreementOut) => {
    const scores = [p.presence_agreement, p.rank_agreement].filter(
      (v): v is number => v !== null,
    );
    return scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 1;
  };
  return [...prompts].sort((a, b) => {
    const bandDiff = (bandRank[a.stability_band ?? "HIGH"] ?? 2) - (bandRank[b.stability_band ?? "HIGH"] ?? 2);
    if (bandDiff !== 0) return bandDiff;
    return scoreOf(a) - scoreOf(b);
  })[0];
}

export function useRecommendationStability() {
  const { workspaceId } = useAuth();

  return useQuery({
    queryKey: ["visibility", "disagreement", workspaceId],
    queryFn: async () => {
      const hasLiveApi = await probeApi();
      const hasLiveSession = Boolean(hasLiveApi && getAccessToken() && workspaceId);
      if (!hasLiveSession) return null;

      try {
        const result = await fetchDisagreement();
        return mostNoteworthy(result.prompts);
      } catch {
        return null;
      }
    },
    staleTime: 30_000,
  });
}
