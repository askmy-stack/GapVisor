import type {
  ContentRecommendation,
  RecommendationStat,
  GapMap,
  DocumentationGap,
  EvidenceOpportunity,
  ReviewPlatform,
} from "./types";
import recommendationsJson from "./recommendations.json";
import statsJson from "./stats.json";
import contentTypesJson from "./content-types.json";
import gapMapJson from "./gap-map.json";
import missingDocumentationJson from "./missing-documentation.json";
import customerEvidenceJson from "./customer-evidence.json";
import reviewPlatformsJson from "./review-platforms.json";

export const recommendations = recommendationsJson as ContentRecommendation[];
export const stats = statsJson as RecommendationStat[];
export const contentTypes = contentTypesJson as string[];
export const gapMap = gapMapJson as GapMap;
export const missingDocumentation = missingDocumentationJson as DocumentationGap[];
export const customerEvidence = customerEvidenceJson as EvidenceOpportunity[];
export const reviewPlatforms = reviewPlatformsJson as ReviewPlatform[];

export type {
  ContentRecommendation,
  Priority,
  Status,
  GapStatus,
  RecommendationStat,
  GapMap,
  DocumentationGap,
  EvidenceOpportunity,
  ReviewPlatform,
} from "./types";
export { statIcons } from "./types";
