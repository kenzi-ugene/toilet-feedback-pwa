import type { Rating } from "./types/rating";
import { isNegativePathRating } from "./types/rating";

export type Screen = "tier1" | "tier2" | "tier3";

/**
 * From Tier 1, Excellent/Good skip icon selection; Neutral/Poor go to Tier 2.
 */
export function nextScreenAfterRating(rating: Rating): "tier2" | "tier3" {
  return isNegativePathRating(rating) ? "tier2" : "tier3";
}
