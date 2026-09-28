import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HelpCircle } from "lucide-react";
import { useRecommendationStability } from "@/data/visibility-dashboard/useDisagreement";
import { useAiModels } from "@/data/shared/models";

const BAND_VARIANT: Record<string, "destructive" | "secondary" | "outline"> = {
  LOW: "destructive",
  MODERATE: "secondary",
  HIGH: "outline",
};

function formatScore(value: number | null): string {
  return value === null ? "—" : `${Math.round(value * 100)}%`;
}

/**
 * vNext Model Disagreement Index (plan section 9). Live-only: there's no
 * static-demo equivalent for real cross-model disagreement, so this card
 * renders nothing in demo mode rather than fabricating one.
 */
export function RecommendationStability() {
  const { data: disagreement, isLoading } = useRecommendationStability();
  const { data: aiModels } = useAiModels();

  if (isLoading || !disagreement) return null;

  const modelName = (modelId: string) =>
    aiModels?.find((m) => m.id === modelId)?.name ?? modelId;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base font-semibold">Recommendation Stability</CardTitle>
          <span title="How much the AI models monitored for this prompt agree with each other, not how visible the brand is.">
            <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
          </span>
        </div>
        {disagreement.stability_band && (
          <Badge variant={BAND_VARIANT[disagreement.stability_band]}>
            {disagreement.stability_band}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground line-clamp-2">
          {disagreement.prompt_text}
        </p>

        <div className="space-y-1.5">
          {disagreement.models.map((model) => (
            <div key={model.model_id} className="flex items-center justify-between text-sm">
              <span className="text-foreground">{modelName(model.model_id)}</span>
              <span className={model.brand_mentioned ? "font-medium" : "text-muted-foreground"}>
                {model.brand_mentioned
                  ? model.recommendation_rank
                    ? `#${model.recommendation_rank}`
                    : "Mentioned"
                  : "Not mentioned"}
              </span>
            </div>
          ))}
        </div>

        <div className="border-t pt-3 space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Presence agreement</span>
            <span className="font-medium font-mono">{formatScore(disagreement.presence_agreement)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Rank agreement</span>
            <span className="font-medium font-mono">{formatScore(disagreement.rank_agreement)}</span>
          </div>
          <div
            className="flex items-center justify-between"
            title={disagreement.citation_agreement_reason ?? undefined}
          >
            <span className="text-muted-foreground">Citation agreement</span>
            <span className="font-medium font-mono text-muted-foreground">Not available</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
